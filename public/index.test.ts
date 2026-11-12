import { createHash } from 'node:crypto';
import { afterEach, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';
import type { LambdaEvent, LambdaResponse } from '../lib/types';
import { fakeDb } from '../lib/test-utils/fakeDb';
import getUserInfoFromSession from '../lib/utils/getUserInfoFromSession';

vi.mock('../lib/utils/createDatabase', async () => ({
  default: async () => (await import('../lib/test-utils/fakeDb')).fakeDb.knex,
}));
vi.mock('../lib/utils/getUserInfoFromSession');

const ID = '11111111-2222-3333-4444-555555555555';
const SESSION_ID = 'aaaaaaaa-0000-0000-0000-000000000000';

interface Request {
  path?: string;
  query?: Record<string, string | undefined>;
  headers?: Record<string, string | undefined>;
}

const loadHandler = async () => (await import('./index')).default;

let handler: Awaited<ReturnType<typeof loadHandler>>;

const request = ({ path = '', query, headers = { cookie: `sessionId=${SESSION_ID}` } }: Request = {}) => new Promise<LambdaResponse>((resolve, reject) => {
  const event: LambdaEvent = {
    httpMethod: 'GET',
    pathFragments: path.split('/').filter(Boolean),
    headers,
    queryStringParameters: query,
    bodyStream: undefined as never,
  };
  handler(event, resolve).catch(reject);
});

const userInfo = (role: string, status = 'pending') => ({
  session: { id: SESSION_ID, users_login_id: 'l1', status, created_at: 1 },
  login: { id: 'l1', type: 'email', user_id: 'u1', value: 'a@b.c' },
  user: { id: 'u1', name: 'Ann', role, created_at: 1 },
});

const anonymous = { cookie: '' };

beforeAll(async () => {
  vi.useFakeTimers();
  handler = await loadHandler();
});

beforeEach(() => {
  vi.resetAllMocks();
  fakeDb.reset();
  vi.useFakeTimers();
  vi.spyOn(console, 'log').mockImplementation(() => undefined);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  vi.mocked(getUserInfoFromSession).mockResolvedValue(null);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('pages', () => {
  test('/ renders the welcome page in the detected language', async () => {
    const response = await request({ headers: { cookie: `sessionId=${SESSION_ID}`, 'accept-language': 'hu-HU,hu' } });

    expect(response.statusCode).toBe(200);
    expect(response.headers).toMatchObject({ 'Content-Type': 'text/html' });
    expect(response.body).toContain('<welcome-page>');
    expect(response.body).toContain('<html lang="hu">');
    expect(response.body).toContain(`<meta name="x-session-id" content="${SESSION_ID}" />`);
  });

  test('/wall renders the wall', async () => {
    expect((await request({ path: 'wall' })).body).toContain('<post-wall');
  });

  test('unknown paths render the welcome page with 404', async () => {
    const response = await request({ path: 'nope' });
    expect(response.statusCode).toBe(404);
    expect(response.body).toContain('<welcome-page>');
  });

  test('/tag/:id renders an existing tag', async () => {
    fakeDb.resolves({ id: ID, name: 'news', type: 'text' });

    const response = await request({ path: `tag/${ID}` });

    expect(response.body).toContain(`<tag-page tag-id="${ID}" tag-name="news" tag-type="text">`);
    expect(fakeDb.calls).toContainEqual(['where', { id: ID }]);
  });

  test('/tag/:id falls through to 404 for an unknown tag or a malformed id', async () => {
    fakeDb.resolves(undefined);
    expect((await request({ path: `tag/${ID}` })).statusCode).toBe(404);
    expect((await request({ path: 'tag/nope' })).statusCode).toBe(404);
  });

  test('/post/:id renders only public posts', async () => {
    fakeDb.resolves({ id: ID });

    const response = await request({ path: `post/${ID}` });

    expect(response.body).toContain(`<post-page post-id="${ID}">`);
    expect(fakeDb.calls).toContainEqual(['where', { id: ID, type: 'post', status: 'public' }]);
  });

  test('/post/:id falls through to 404 for a missing post', async () => {
    fakeDb.resolves(undefined);
    expect((await request({ path: `post/${ID}` })).statusCode).toBe(404);
  });
});

describe('/moderation', () => {
  test.each([
    ['anonymous users', null],
    ['non-admins', userInfo('user')],
  ])('redirects %s to /', async (_name, info) => {
    vi.mocked(getUserInfoFromSession).mockResolvedValue(info);
    const response = await request({ path: 'moderation' });
    expect(response).toMatchObject({ statusCode: 302, headers: { Location: '/' } });
  });

  test('renders for admins', async () => {
    vi.mocked(getUserInfoFromSession).mockResolvedValue(userInfo('admin'));
    expect((await request({ path: 'moderation' })).body).toContain('<moderation-page>');
  });
});

describe('/profile', () => {
  test('redirects anonymous users to /login', async () => {
    expect(await request({ path: 'profile' })).toMatchObject({ statusCode: 302, headers: { Location: '/login' } });
  });

  test('renders for logged in users', async () => {
    vi.mocked(getUserInfoFromSession).mockResolvedValue(userInfo('user'));
    expect((await request({ path: 'profile' })).body).toContain(`<profile-page session-id="${SESSION_ID}">`);
  });
});

describe('/logout', () => {
  test('deletes the session, clears the cookie and redirects', async () => {
    const response = await request({ path: 'logout' });

    expect(response.statusCode).toBe(302);
    expect(response.headers).toMatchObject({ Location: '/login' });
    expect(response.headers?.['Set-Cookie']).toMatch(/^sessionId=none; Expires=.* GMT; Path=\/; Secure; HttpOnly; SameSite=Lax$/);
    expect(fakeDb.calls).toEqual([
      ['knex', 'users_session'],
      ['where', { id: SESSION_ID }],
      ['update', { status: 'deleted', secret: '' }],
    ]);
  });

  test('works without a session', async () => {
    const response = await request({ path: 'logout', headers: anonymous });
    expect(response.statusCode).toBe(302);
    expect(fakeDb.calls).toEqual([]);
  });
});

describe('/login', () => {
  test('renders the login page for new visitors', async () => {
    const response = await request({ path: 'login', headers: anonymous });
    expect(response.body).toContain('<login-page>');
  });

  test('renders the login page for a pending session', async () => {
    vi.mocked(getUserInfoFromSession).mockResolvedValue(null);
    expect((await request({ path: 'login' })).body).toContain('<login-page>');
  });

  test('redirects to / when already logged in', async () => {
    vi.mocked(getUserInfoFromSession).mockResolvedValue(userInfo('user', 'active'));
    expect(await request({ path: 'login' })).toMatchObject({ statusCode: 302, headers: { Location: '/' } });
  });

  test('renders the login page when the cookie refers to an unknown session', async () => {
    expect((await request({ path: 'login' })).body).toContain('<login-page>');
  });

  describe('/login/email', () => {
    const verify = (query?: Request['query']) => request({ path: 'login/email', query, headers: anonymous });
    const code = 'SECRET';
    const hash = createHash('sha256').update(code).digest('hex');
    const freshlyCreated = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const staleCreated = new Date(Date.now() - 11 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');

    test('activates the session when the code matches', async () => {
      fakeDb.resolvesInOrder({ id: SESSION_ID, status: 'pending', secret: hash, created_at: freshlyCreated, attempts: 0 });

      const response = await verify({ code, session: SESSION_ID });

      expect(response).toMatchObject({ statusCode: 302, headers: { Location: '/' } });
      expect(response.headers?.['Set-Cookie']).toMatch(new RegExp(`^sessionId=${SESSION_ID}; Expires=.* GMT; Path=/; Secure; HttpOnly; SameSite=Lax$`));
      expect(fakeDb.calls).toContainEqual(['update', { status: 'active', secret: '' }]);
    });

    test('leaves the session pending and sets no cookie when the code is wrong', async () => {
      fakeDb.resolvesInOrder({ id: SESSION_ID, status: 'pending', secret: hash, created_at: freshlyCreated, attempts: 0 });

      const response = await verify({ code: 'WRONG', session: SESSION_ID });

      expect(response.statusCode).toBe(302);
      expect(response.headers?.['Set-Cookie']).toBeUndefined();
      expect(fakeDb.calls.map(call => call[0])).not.toContain('update');
    });

    test('counts a wrong attempt', async () => {
      fakeDb.resolvesInOrder({ id: SESSION_ID, status: 'pending', secret: hash, created_at: freshlyCreated, attempts: 1 });
      await verify({ code: 'WRONG', session: SESSION_ID });
      expect(fakeDb.calls).toContainEqual(['increment', 'attempts', 1]);
    });

    test('rejects and invalidates an expired code', async () => {
      fakeDb.resolvesInOrder({ id: SESSION_ID, status: 'pending', secret: hash, created_at: staleCreated, attempts: 0 });
      const response = await verify({ code, session: SESSION_ID });
      expect(response.headers?.['Set-Cookie']).toBeUndefined();
      expect(fakeDb.calls).toContainEqual(['update', { status: 'deleted', secret: '' }]);
    });

    test('rejects and invalidates after too many attempts, even with the right code', async () => {
      fakeDb.resolvesInOrder({ id: SESSION_ID, status: 'pending', secret: hash, created_at: freshlyCreated, attempts: 5 });
      const response = await verify({ code, session: SESSION_ID });
      expect(response.headers?.['Set-Cookie']).toBeUndefined();
      expect(fakeDb.calls).toContainEqual(['update', { status: 'deleted', secret: '' }]);
    });

    test('does not reactivate a deleted session', async () => {
      fakeDb.resolvesInOrder({ id: SESSION_ID, status: 'deleted', secret: hash });

      const response = await verify({ code, session: SESSION_ID });

      expect(response.headers?.['Set-Cookie']).toBeUndefined();
      expect(fakeDb.calls.map(call => call[0])).not.toContain('update');
    });

    test('leaves everything alone when the session does not exist', async () => {
      fakeDb.resolvesInOrder(undefined);
      const response = await verify({ code, session: SESSION_ID });
      expect(response.headers?.['Set-Cookie']).toBeUndefined();
      expect(fakeDb.calls.map(call => call[0])).not.toContain('update');
    });

    test.each([
      ['no query', undefined],
      ['no code', { session: SESSION_ID }],
      ['no session', { code }],
    ])('redirects to /login with %s', async (_name, query) => {
      expect(await verify(query)).toMatchObject({ statusCode: 302, headers: { Location: '/login' } });
      expect(fakeDb.calls).toEqual([]);
    });
  });
});

test('answers 500 when something fails', async () => {
  fakeDb.rejects(new Error('db'));
  const response = await request({ path: `tag/${ID}` });
  expect(response).toMatchObject({ statusCode: 500, body: 'Something went wrong.' });
});

test('shuts down after an hour of inactivity and resets the timer on requests', async () => {
  const exit = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

  await vi.advanceTimersByTimeAsync(40 * 60 * 1000);
  await request();
  await vi.advanceTimersByTimeAsync(40 * 60 * 1000);
  expect(exit).not.toHaveBeenCalled();

  await vi.advanceTimersByTimeAsync(20 * 60 * 1000);
  expect(exit).toHaveBeenCalledWith(0);
});
