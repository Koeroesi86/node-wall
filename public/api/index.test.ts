import crypto, { createHash } from 'node:crypto';
import { Readable } from 'node:stream';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import type { LambdaEvent, LambdaResponse } from '../../lib/types';
import commentService from '../../lib/services/comment';
import linkService from '../../lib/services/link';
import postService from '../../lib/services/post';
import sessionService from '../../lib/services/session';
import storageService from '../../lib/services/storage';
import tagService from '../../lib/services/tag';
import userService from '../../lib/services/user';
import accountService from '../../lib/services/account';
import auditService from '../../lib/services/audit';
import getTranslation from '../../lib/translations/getTranslation';
import generateCode from '../../lib/utils/generateCode';
import getUserInfoFromSession from '../../lib/utils/getUserInfoFromSession';
import getUserSessions from '../../lib/utils/getUserSessions';

const transporter = vi.hoisted(() => ({ sendMail: vi.fn() }));

vi.mock('../../lib/services/audit');
vi.mock('../../lib/services/comment');
vi.mock('../../lib/services/link');
vi.mock('../../lib/services/post');
const rateLimitCounts = vi.hoisted(() => new Map<string, number>());
vi.mock('../../lib/services/rate-limit', () => ({
  default: {
    hit: async (key: string) => rateLimitCounts.set(key, (rateLimitCounts.get(key) ?? 0) + 1).get(key),
    removeExpired: async () => undefined,
  },
}));
vi.mock('../../lib/services/session');
vi.mock('../../lib/services/storage');
vi.mock('../../lib/services/tag');
vi.mock('../../lib/services/user');
vi.mock('../../lib/services/account');
vi.mock('../../lib/translations/getTranslation');
vi.mock('../../lib/utils/generateCode');
vi.mock('../../lib/utils/getUserInfoFromSession');
vi.mock('../../lib/utils/getUserSessions');
vi.mock('../../lib/utils/createMailer', () => ({ default: () => transporter }));
vi.mock('../../lib/templates/email/confirmDeletion', () => ({ default: async () => '<html>delete</html>' }));
vi.mock('../../lib/templates/email/verifyLogin', () => ({ default: async () => '<html>mail</html>' }));

const ID = '11111111-2222-3333-4444-555555555555';
const TAG_ID = '66666666-7777-8888-9999-000000000000';
const SESSION_ID = 'aaaaaaaa-0000-0000-0000-000000000000';
const PARENT_ID = 'bbbbbbbb-0000-0000-0000-000000000000';
const linkData = { 'content-type': 'text/html', title: 't', description: '', image: '', url: 'https://example.com/page', embedCode: '' };

interface Request {
  method?: string;
  path: string;
  query?: Record<string, string | undefined>;
  headers?: Record<string, string | undefined>;
  body?: unknown;
}

const jsonBody = (response: LambdaResponse) => JSON.parse(response.body ?? '');

const userInfo = (role: string) => ({
  session: { id: 's1', users_login_id: 'l1', status: 'active', created_at: 1, last_active: null },
  login: { id: 'l1', type: 'email', user_id: 'u1', value: 'a@b.c' },
  user: { id: 'u1', name: 'Ann', role, created_at: 1 },
});

const loggedInAs = (role: string) => {
  vi.mocked(getUserInfoFromSession).mockResolvedValue(userInfo(role));
};

const loadHandler = async () => (await import('./index')).default;

let handler: Awaited<ReturnType<typeof loadHandler>>;

const request = ({ method = 'GET', path, query, headers = {}, body }: Request) => new Promise<LambdaResponse>((resolve, reject) => {
  const event: LambdaEvent = {
    httpMethod: method,
    pathFragments: path.split('/').filter(Boolean),
    headers: { ...headers, ...(!('cookie' in headers) && { cookie: `sessionId=${SESSION_ID}` }) },
    queryStringParameters: query,
    remoteAddress: '127.0.0.1',
    bodyStream: Readable.from([body === undefined ? '' : JSON.stringify(body)]),
  };
  handler(event, resolve).catch(reject);
});

const anonymous = { cookie: '' };

beforeEach(async () => {
  vi.resetAllMocks();
  vi.resetModules();
  rateLimitCounts.clear();
  vi.useFakeTimers();
  vi.spyOn(console, 'log').mockImplementation(() => undefined);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  vi.spyOn(crypto, 'randomUUID').mockReturnValue(SESSION_ID);
  vi.stubEnv('SITE_PROTOCOL', 'https');
  vi.stubEnv('SITE_DOMAIN', 'example.com');
  vi.stubEnv('NODEMAILER_USER', '');
  vi.mocked(getUserInfoFromSession).mockResolvedValue(null);
  vi.mocked(storageService.has).mockResolvedValue(true);
  handler = await loadHandler();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('session handling', () => {
  test('records the last activity of a valid session cookie', async () => {
    vi.mocked(getUserInfoFromSession).mockResolvedValue({ session: {}, login: {}, user: { id: ID, role: 'user' } } as never);
    await request({ path: 'api/unknown' });
    expect(getUserInfoFromSession).toHaveBeenCalledWith(SESSION_ID);
    expect(sessionService.setLastActive).toHaveBeenCalledWith(SESSION_ID, expect.any(Number));
  });

  test('does not refresh the activity of an invalid or expired session', async () => {
    vi.mocked(getUserInfoFromSession).mockResolvedValue(null);
    await request({ path: 'api/unknown' });
    expect(sessionService.setLastActive).not.toHaveBeenCalled();
  });

  test('stores device details the first time a session is seen', async () => {
    loggedInAs('user');

    await request({ path: 'api/unknown', headers: { cookie: `sessionId=${SESSION_ID}`, 'user-agent': 'UA' } });

    expect(sessionService.setDetails).toHaveBeenCalledWith(SESSION_ID, 'UA', '127.0.0.1');
  });

  test('does nothing without a session cookie', async () => {
    await request({ path: 'api/unknown', headers: anonymous });
    expect(getUserInfoFromSession).not.toHaveBeenCalled();
    expect(sessionService.setLastActive).not.toHaveBeenCalled();
  });
});

describe('routing', () => {
  test('answers 404 for unknown routes', async () => {
    expect((await request({ path: 'api/unknown' })).statusCode).toBe(404);
  });

  test('marks API responses as private and not storable', async () => {
    expect((await request({ path: 'api/unknown' })).headers?.['Cache-Control']).toBe('private, no-store');
  });

  test('answers 400 and logs when a handler throws', async () => {
    vi.mocked(tagService.getList).mockRejectedValue(new Error('boom'));

    const response = await request({ path: 'api/tags' });

    expect(response.statusCode).toBe(400);
    expect(jsonBody(response)).toEqual({ message: `Something isn't quite right.` });
    expect(console.error).toHaveBeenCalled();
  });

  test('shuts down after 30 seconds of inactivity and resets the timer on requests', async () => {
    const exit = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    await vi.advanceTimersByTimeAsync(20_000);
    await request({ path: 'api/unknown' });
    await vi.advanceTimersByTimeAsync(20_000);
    expect(exit).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(10_000);
    expect(exit).toHaveBeenCalledWith(0);
  });
});

describe('/api/link', () => {
  const post = `${ID}`;
  const query = { uri: 'https://example.com/page', post };

  beforeEach(() => {
    vi.mocked(storageService.read).mockResolvedValue('look at https://example.com/page now');
  });

  test.each([
    ['no query', undefined],
    ['no uri', { post }],
    ['no post', { uri: 'https://example.com' }],
    ['an invalid post id', { uri: 'https://example.com', post: 'nope' }],
    ['a uri missing from the post', { uri: 'https://other.com', post }],
    ['a uri that is only a substring of a post link', { uri: 'https://example.com', post }],
  ])('rejects %s', async (_name, rejectedQuery) => {
    expect((await request({ path: 'api/link', query: rejectedQuery })).statusCode).toBe(400);
  });

  test('returns stored link data', async () => {
    vi.mocked(linkService.getByUrl, { partial: true }).mockResolvedValue({ id: 'l1' });
    vi.mocked(linkService.getData).mockResolvedValue(JSON.stringify(linkData));

    const response = await request({ path: 'api/link', query });

    expect(response.statusCode).toBe(200);
    expect(jsonBody(response)).toEqual(linkData);
    expect(linkService.create).not.toHaveBeenCalled();
  });

  test('upgrades http links to https before lookup', async () => {
    vi.mocked(linkService.getByUrl).mockResolvedValue(undefined);
    vi.mocked(postService.get, { partial: true }).mockResolvedValue({ status: 'public' });
    vi.mocked(linkService.create).mockResolvedValue(linkData);

    await request({ path: 'api/link', query: { uri: 'http://example.com/page', post } });

    expect(linkService.getByUrl).toHaveBeenCalledWith('https://example.com/page');
    expect(linkService.create).toHaveBeenCalledWith('https://example.com/page');
  });

  test('creates a link for a public post', async () => {
    vi.mocked(linkService.getByUrl).mockResolvedValue(undefined);
    vi.mocked(postService.get, { partial: true }).mockResolvedValue({ status: 'public' });
    vi.mocked(linkService.create).mockResolvedValue(linkData);

    const response = await request({ path: 'api/link', query });

    expect(response.statusCode).toBe(200);
    expect(jsonBody(response)).toEqual(linkData);
  });

  test('refuses to fetch links for non-public posts', async () => {
    vi.mocked(linkService.getByUrl).mockResolvedValue(undefined);
    vi.mocked(postService.get, { partial: true }).mockResolvedValue({ status: 'pending' });

    expect((await request({ path: 'api/link', query })).statusCode).toBe(400);
    expect(linkService.create).not.toHaveBeenCalled();
  });
});

describe('/api/comment', () => {
  const commentRow = { id: ID, post: ID, parent: null, owner: null, status: 'public', created_at: 1 };

  beforeEach(() => {
    vi.mocked(postService.get, { partial: true }).mockResolvedValue({ id: ID, status: 'public' });
    vi.mocked(commentService.get, { partial: true }).mockResolvedValue({ ...commentRow, id: PARENT_ID, body: 'parent' });
  });

  test('creates a comment as the logged in user', async () => {
    loggedInAs('user');

    const response = await request({ method: 'POST', path: 'api/comment', body: { postId: ID, parent: PARENT_ID, body: 'hi' } });

    expect(response.statusCode).toBe(200);
    expect(postService.createComment).toHaveBeenCalledWith(ID, PARENT_ID, 'u1', 'hi');
  });

  test('creates anonymous comments', async () => {
    await request({ method: 'POST', path: 'api/comment', headers: anonymous, body: { postId: ID, body: 'hi' } });
    expect(postService.createComment).toHaveBeenCalledWith(ID, undefined, null, 'hi');
  });

  test('rate limits anonymous comments per ip', async () => {
    const send = () => request({ method: 'POST', path: 'api/comment', headers: anonymous, body: { postId: ID, body: 'hi' } });

    expect([(await send()).statusCode, (await send()).statusCode, (await send()).statusCode]).toEqual([200, 200, 200]);
    expect((await send()).statusCode).toBe(429);
    expect(postService.createComment).toHaveBeenCalledTimes(3);
  });

  test.each([
    ['postId', { body: 'hi' }],
    ['body', { postId: ID }],
    ['a body that is only whitespace', { postId: ID, body: '  ' }],
    ['a body that is too long', { postId: ID, body: 'a'.repeat(2001) }],
    ['a body that is not a string', { postId: ID, body: 5 }],
    ['a postId that is not an id', { postId: 'nope', body: 'hi' }],
    ['a parent that is not an id', { postId: ID, parent: 'c0', body: 'hi' }],
  ])('rejects a comment with %s', async (_name, body) => {
    expect((await request({ method: 'POST', path: 'api/comment', body })).statusCode).toBe(400);
    expect(postService.createComment).not.toHaveBeenCalled();
  });

  test.each([
    ['unknown', undefined],
    ['not public', { id: ID, status: 'pending' }],
  ])('rejects a comment on a post that is %s', async (_name, post) => {
    vi.mocked(postService.get, { partial: true }).mockResolvedValue(post);

    expect((await request({ method: 'POST', path: 'api/comment', body: { postId: ID, body: 'hi' } })).statusCode).toBe(400);
    expect(postService.createComment).not.toHaveBeenCalled();
  });

  test('rejects a reply to a comment of another post', async () => {
    vi.mocked(commentService.get, { partial: true }).mockResolvedValue({ ...commentRow, id: PARENT_ID, post: TAG_ID });

    expect((await request({ method: 'POST', path: 'api/comment', body: { postId: ID, parent: PARENT_ID, body: 'hi' } })).statusCode).toBe(400);
    expect(postService.createComment).not.toHaveBeenCalled();
  });

  test('rejects a reply to a comment that does not exist', async () => {
    vi.mocked(commentService.get).mockRejectedValue(new Error('no comment'));

    expect((await request({ method: 'POST', path: 'api/comment', body: { postId: ID, parent: PARENT_ID, body: 'hi' } })).statusCode).toBe(400);
    expect(postService.createComment).not.toHaveBeenCalled();
  });

  test('returns a comment by id', async () => {
    vi.mocked(commentService.get, { partial: true }).mockResolvedValue({ ...commentRow, body: 'hi' });

    const response = await request({ path: `api/comment/${ID}` });

    expect(jsonBody(response)).toEqual({ ...commentRow, body: 'hi' });
  });

  test('ignores comment ids that are not uuids', async () => {
    expect((await request({ path: 'api/comment/nope' })).statusCode).toBe(404);
  });
});

describe('/api/posts', () => {
  const post = { id: ID, type: 'post', status: 'public', created_at: 1, owner: 'u1' };

  test('answers OPTIONS', async () => {
    expect((await request({ method: 'OPTIONS', path: 'api/posts' })).statusCode).toBe(200);
  });

  describe('PUT /:id', () => {
    test('rejects non-admins', async () => {
      loggedInAs('user');
      expect((await request({ method: 'PUT', path: `api/posts/${ID}`, body: { status: 'public' } })).statusCode).toBe(401);
      expect(postService.setStatus).not.toHaveBeenCalled();
    });

    test('rejects anonymous users', async () => {
      expect((await request({ method: 'PUT', path: `api/posts/${ID}`, body: { status: 'public' } })).statusCode).toBe(401);
    });

    test.each([
      ['missing', {}],
      ['unknown', { status: 'bogus' }],
    ])('rejects a %s status', async (_name, body) => {
      loggedInAs('admin');
      expect((await request({ method: 'PUT', path: `api/posts/${ID}`, body })).statusCode).toBe(400);
    });

    test('changes the status without touching the content', async () => {
      loggedInAs('admin');

      const response = await request({ method: 'PUT', path: `api/posts/${ID}`, body: { status: 'moderated' } });

      expect(response.statusCode).toBe(201);
      expect(postService.setStatus).toHaveBeenCalledWith(ID, 'moderated');
      expect(storageService.write).not.toHaveBeenCalledWith(ID, 'post', expect.anything());
    });

    test('turns hashtags into tag references when publishing', async () => {
      loggedInAs('admin');
      vi.mocked(storageService.read).mockResolvedValue('#news and #fresh');
      vi.mocked(tagService.getByName).mockImplementation(async name => (name === 'news' ? { id: 't1', type: 'text' } : undefined));
      vi.mocked(tagService.create).mockResolvedValue({ id: 't2', name: 'fresh', type: 'text' });

      const response = await request({ method: 'PUT', path: `api/posts/${ID}`, body: { status: 'public' } });

      expect(response.statusCode).toBe(201);
      expect(tagService.create).toHaveBeenCalledWith('fresh', 'text');
      expect(storageService.write).toHaveBeenCalledWith(ID, 'post', '#!t1 and #!t2');
      expect(postService.setStatus).toHaveBeenCalledWith(ID, 'public');
    });
  });

  describe('GET /:id', () => {
    test('answers 404 for an unknown post', async () => {
      vi.mocked(postService.get).mockResolvedValue(undefined);
      expect((await request({ path: `api/posts/${ID}` })).statusCode).toBe(404);
    });

    test('hides non-public posts from non-admins', async () => {
      vi.mocked(postService.get).mockResolvedValue({ ...post, status: 'pending' });
      expect((await request({ path: `api/posts/${ID}` })).statusCode).toBe(401);
      loggedInAs('user');
      expect((await request({ path: `api/posts/${ID}` })).statusCode).toBe(401);
    });

    test('shows non-public posts to admins', async () => {
      loggedInAs('admin');
      vi.mocked(postService.get).mockResolvedValue({ ...post, status: 'pending' });
      vi.mocked(postService.getTags).mockResolvedValue([]);
      vi.mocked(postService.getComments).mockResolvedValue([]);
      vi.mocked(postService.getContent).mockResolvedValue('hello');
      expect((await request({ path: `api/posts/${ID}` })).statusCode).toBe(200);
    });

    test('returns the post with content, comments, owner and tags', async () => {
      vi.mocked(postService.get).mockResolvedValue(post);
      vi.mocked(postService.getTags, { partial: true }).mockResolvedValue([{ id: 't1', name: 'tag', type: null }]);
      vi.mocked(postService.getContent).mockResolvedValue('hello');
      vi.mocked(postService.getComments, { partial: true }).mockResolvedValue([{ id: 'c1', parent: null, owner: null, created_at: null }, { id: 'c2', parent: null, owner: null, created_at: null }]);
      vi.mocked(userService.get, { partial: true }).mockResolvedValue({ id: 'u1', name: 'Ann' });

      const response = await request({ path: `api/posts/${ID}` });

      expect(response.statusCode).toBe(200);
      expect(jsonBody(response)).toEqual({
        id: ID,
        type: 'post',
        content: 'hello',
        created_at: 1,
        comments: ['c1', 'c2'],
        owner: { id: 'u1', name: 'Ann' },
        tags: [expect.objectContaining({ id: 't1' })],
      });
      expect(postService.getContent).toHaveBeenCalledWith(ID, 'post');
    });

    test('returns a null owner for anonymous posts', async () => {
      vi.mocked(postService.get).mockResolvedValue({ ...post, owner: null });
      vi.mocked(postService.getTags).mockResolvedValue([]);
      vi.mocked(postService.getComments).mockResolvedValue([]);
      vi.mocked(postService.getContent).mockResolvedValue('hello');

      expect(jsonBody(await request({ path: `api/posts/${ID}` })).owner).toBeNull();
      expect(userService.get).not.toHaveBeenCalled();
    });

    test('returns the tags of a post', async () => {
      vi.mocked(postService.get).mockResolvedValue(post);
      vi.mocked(postService.getTags, { partial: true }).mockResolvedValue([{ id: 't1', name: 'tag', type: null }]);

      expect(jsonBody(await request({ path: `api/posts/${ID}/tags` }))).toEqual([expect.objectContaining({ id: 't1' })]);
    });
  });

  test('GET /bounds returns the bounds', async () => {
    vi.mocked(postService.getBounds).mockResolvedValue({ oldest: 1, newest: 2 });
    expect(jsonBody(await request({ path: 'api/posts/bounds' }))).toEqual({ oldest: 1, newest: 2 });
  });

  describe('GET list', () => {
    beforeEach(() => {
      vi.mocked(postService.getList).mockResolvedValue([{ id: 'p1', type: 'post', created_at: 1, owner: 'u1' }]);
    });

    test('lists public posts as id, type and creation time', async () => {
      const response = await request({ path: 'api/posts' });

      expect(jsonBody(response)).toEqual([{ id: 'p1', type: 'post', created_at: 1 }]);
      expect(postService.getList).toHaveBeenCalledWith('public', undefined, undefined, [], []);
      expect(postService.getNextPage).not.toHaveBeenCalled();
    });

    test('passes paging and tag filters, and exposes the next page', async () => {
      vi.mocked(postService.getNextPage).mockResolvedValue({ nextPageBefore: 99 });

      const response = await request({ path: 'api/posts', query: { before: '20', since: '10', likedTags: 'a,b', dislikedTags: 'c' } });

      expect(postService.getList).toHaveBeenCalledWith('public', '20', '10', ['a', 'b'], ['c']);
      expect(response.headers?.['x-next-page-before']).toBe(99);
    });

    test('omits the next page header when there is none', async () => {
      vi.mocked(postService.getNextPage).mockResolvedValue(undefined);
      const response = await request({ path: 'api/posts', query: {} });
      expect(response.headers).not.toHaveProperty('x-next-page-before');
    });

    test('lets admins pick a status', async () => {
      loggedInAs('admin');
      await request({ path: 'api/posts', query: { status: 'pending' } });
      expect(postService.getList).toHaveBeenCalledWith('pending', undefined, undefined, [], []);
    });

    test('ignores the status of non-admins and invalid statuses', async () => {
      loggedInAs('user');
      await request({ path: 'api/posts', query: { status: 'pending' } });
      expect(postService.getList).toHaveBeenLastCalledWith('public', undefined, undefined, [], []);

      loggedInAs('admin');
      await request({ path: 'api/posts', query: { status: 'bogus' } });
      expect(postService.getList).toHaveBeenLastCalledWith('public', undefined, undefined, [], []);
    });
  });

  describe('POST', () => {
    test('creates a post as the logged in user', async () => {
      loggedInAs('user');
      const response = await request({ method: 'POST', path: 'api/posts', body: { content: 'hi' } });
      expect(response.statusCode).toBe(200);
      expect(postService.create).toHaveBeenCalledWith('hi', 'u1');
    });

    test('creates anonymous posts', async () => {
      await request({ method: 'POST', path: 'api/posts', headers: anonymous, body: { content: 'hi' } });
      expect(postService.create).toHaveBeenCalledWith('hi', null);
    });

    test('rate limits anonymous posts per ip', async () => {
      const send = () => request({ method: 'POST', path: 'api/posts', headers: anonymous, body: { content: 'hi' } });

      await send();
      await send();
      await send();

      expect((await send()).statusCode).toBe(429);
      expect(postService.create).toHaveBeenCalledTimes(3);
    });

    test.each([
      ['content that is only whitespace', { content: '   ' }],
      ['content that is too long', { content: 'a'.repeat(5001) }],
      ['content that is not a string', { content: 5 }],
    ])('rejects %s', async (_name, body) => {
      expect((await request({ method: 'POST', path: 'api/posts', body })).statusCode).toBe(400);
      expect(postService.create).not.toHaveBeenCalled();
    });

    test('rejects empty posts', async () => {
      expect((await request({ method: 'POST', path: 'api/posts', body: {} })).statusCode).toBe(400);
      expect(postService.create).not.toHaveBeenCalled();
    });

    describe('/:id/tags', () => {
      const addTagRequest = (body: unknown = { id: TAG_ID }) => request({ method: 'POST', path: `api/posts/${ID}/tags`, body });

      test('rejects non-admins', async () => {
        loggedInAs('user');
        expect((await addTagRequest()).statusCode).toBe(401);
        expect(postService.addTag).not.toHaveBeenCalled();
      });

      test('rejects anonymous users', async () => {
        vi.mocked(postService.getTags).mockResolvedValue([]);
        expect((await addTagRequest()).statusCode).toBe(401);
        expect(postService.addTag).not.toHaveBeenCalled();
      });

      test('adds a tag', async () => {
        loggedInAs('admin');
        vi.mocked(postService.getTags).mockResolvedValue([]);
        vi.mocked(postService.get, { partial: true }).mockResolvedValue({ id: ID });
        vi.mocked(tagService.get, { partial: true }).mockResolvedValue({ id: TAG_ID });
        expect((await addTagRequest()).statusCode).toBe(200);
        expect(postService.addTag).toHaveBeenCalledWith(ID, TAG_ID);
      });

      test('rejects a tag that is already assigned', async () => {
        loggedInAs('admin');
        vi.mocked(postService.getTags, { partial: true }).mockResolvedValue([{ id: TAG_ID, name: 'tag', type: null }]);
        expect((await addTagRequest()).statusCode).toBe(400);
        expect(postService.addTag).not.toHaveBeenCalled();
      });

      test('rejects a tag that does not exist', async () => {
        loggedInAs('admin');
        vi.mocked(postService.getTags).mockResolvedValue([]);
        vi.mocked(postService.get, { partial: true }).mockResolvedValue({ id: ID });
        vi.mocked(tagService.get).mockResolvedValue(undefined);
        expect((await addTagRequest()).statusCode).toBe(400);
        expect(postService.addTag).not.toHaveBeenCalled();
      });

      test('rejects a post that does not exist', async () => {
        loggedInAs('admin');
        vi.mocked(postService.getTags).mockResolvedValue([]);
        vi.mocked(postService.get).mockResolvedValue(undefined);
        expect((await addTagRequest()).statusCode).toBe(400);
        expect(postService.addTag).not.toHaveBeenCalled();
      });

      test('rejects a missing tag id', async () => {
        loggedInAs('admin');
        vi.mocked(postService.getTags).mockResolvedValue([]);
        expect((await addTagRequest({})).statusCode).toBe(400);
      });
    });
  });

  describe('DELETE /:id/tags/:tagId', () => {
    const removeTagRequest = () => request({ method: 'DELETE', path: `api/posts/${ID}/tags/${TAG_ID}` });

    test('rejects non-admins and anonymous users', async () => {
      vi.mocked(postService.getTags, { partial: true }).mockResolvedValue([{ id: TAG_ID, name: 'tag', type: null }]);
      expect((await removeTagRequest()).statusCode).toBe(401);
      loggedInAs('user');
      expect((await removeTagRequest()).statusCode).toBe(401);
      expect(postService.removeTag).not.toHaveBeenCalled();
    });

    test('removes an assigned tag', async () => {
      loggedInAs('admin');
      vi.mocked(postService.getTags, { partial: true }).mockResolvedValue([{ id: TAG_ID, name: 'tag', type: null }]);
      expect((await removeTagRequest()).statusCode).toBe(200);
      expect(postService.removeTag).toHaveBeenCalledWith(ID, TAG_ID);
    });

    test('rejects a tag that is not assigned', async () => {
      loggedInAs('admin');
      vi.mocked(postService.getTags).mockResolvedValue([]);
      expect((await removeTagRequest()).statusCode).toBe(400);
      expect(postService.removeTag).not.toHaveBeenCalled();
    });
  });
});

describe('/api/tags', () => {
  test('answers OPTIONS', async () => {
    expect((await request({ method: 'OPTIONS', path: 'api/tags' })).statusCode).toBe(200);
  });

  test('returns a tag by id, or 404', async () => {
    vi.mocked(tagService.get).mockResolvedValueOnce({ id: TAG_ID, name: 'news', type: 'text' });
    expect(jsonBody(await request({ path: `api/tags/${TAG_ID}` }))).toEqual({ id: TAG_ID, name: 'news', type: 'text' });

    vi.mocked(tagService.get).mockResolvedValueOnce(undefined);
    expect((await request({ path: `api/tags/${TAG_ID}` })).statusCode).toBe(404);
  });

  test('lists tags with a search term', async () => {
    vi.mocked(tagService.getList, { partial: true }).mockResolvedValue([{ id: 't1', name: 'tag', type: null }]);

    const response = await request({ path: 'api/tags', query: { s: 'ne', exact: '1' } });

    expect(jsonBody(response)).toEqual([expect.objectContaining({ id: 't1' })]);
    expect(tagService.getList).toHaveBeenCalledWith('ne', true);
  });

  test('lists all tags without a query', async () => {
    vi.mocked(tagService.getList).mockResolvedValue([]);
    await request({ path: 'api/tags' });
    expect(tagService.getList).toHaveBeenCalledWith('', false);
  });

  describe('POST', () => {
    const createTag = (body: unknown = { name: 'news', type: 'text' }) => request({ method: 'POST', path: 'api/tags', body });

    test('creates a tag as an admin', async () => {
      loggedInAs('admin');
      vi.mocked(tagService.create).mockResolvedValue({ id: 't1', name: 'news', type: 'text' });

      const response = await createTag();

      expect(jsonBody(response)).toEqual({ id: 't1', name: 'news', type: 'text' });
      expect(tagService.create).toHaveBeenCalledWith('news', 'text');
    });

    test('rejects anonymous users and non-admins', async () => {
      expect((await createTag()).statusCode).toBe(400);
      loggedInAs('user');
      expect((await createTag()).statusCode).toBe(400);
      expect(tagService.create).not.toHaveBeenCalled();
    });

    test.each([
      ['name', { type: 'text' }],
      ['type', { name: 'news' }],
    ])('rejects a tag without %s', async (_name, body) => {
      loggedInAs('admin');
      expect((await createTag(body)).statusCode).toBe(400);
    });
  });
});

describe('/api/user', () => {
  describe('GET', () => {
    test('answers 401 and clears the cookie when logged out', async () => {
      const response = await request({ path: 'api/user' });
      expect(response.statusCode).toBe(401);
      expect(response.headers?.['Set-Cookie']).toMatch(/^sessionId=none; Expires=/);
    });

    test('returns the user info when logged in', async () => {
      loggedInAs('user');
      expect(jsonBody(await request({ path: 'api/user' }))).toEqual(userInfo('user'));
    });
  });

  describe('POST (login)', () => {
    const login = (body: unknown = { value: 'a@b.c', type: 'email', name: 'Ann' }) => request({
      method: 'POST',
      path: 'api/user',
      headers: { ...anonymous, 'accept-language': 'hu-HU' },
      body,
    });

    beforeEach(() => {
      vi.mocked(generateCode).mockReturnValue('SECRET');
      vi.mocked(userService.getLogin).mockResolvedValue({ id: 'l1', user_id: 'u1' });
      vi.mocked(getTranslation).mockResolvedValue({ value: 'Title' });
      transporter.sendMail.mockImplementation((_options, callback) => callback(undefined, { messageId: 'm1' }));
    });

    test.each([
      ['value', { type: 'email' }],
      ['type', { value: 'a@b.c' }],
    ])('rejects a login without %s', async (_name, body) => {
      expect((await login(body)).statusCode).toBe(400);
    });

    test('creates a hashed pending session for an existing login and mails the code', async () => {
      const response = await login();

      expect(response.statusCode).toBe(200);
      expect(jsonBody(response)).toEqual({ sessionId: SESSION_ID });
      expect(response.headers?.['Set-Cookie']).toBeUndefined();
      expect(userService.create).not.toHaveBeenCalled();
      expect(sessionService.create).toHaveBeenCalledWith(
        SESSION_ID,
        'l1',
        createHash('sha256').update('SECRET').digest('hex'),
        'pending',
      );
      expect(transporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({ from: 'sender@example.com', to: 'a@b.c', subject: 'Title', html: '<html>mail</html>' }),
        expect.any(Function),
      );
    });

    test('logs the login url instead of mailing it when LOG_LOGIN_CODE is enabled', async () => {
      const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);

      await login();
      expect(log).not.toHaveBeenCalledWith('login url (dev only)', expect.any(String));
      expect(transporter.sendMail).toHaveBeenCalledTimes(1);

      vi.stubEnv('LOG_LOGIN_CODE', 'true');
      const response = await login();
      expect(response.statusCode).toBe(200);
      expect(jsonBody(response)).toEqual({ sessionId: SESSION_ID });
      expect(log).toHaveBeenCalledWith('login url (dev only)', `https://example.com/login/email?code=SECRET&session=${SESSION_ID}`);
      expect(transporter.sendMail).toHaveBeenCalledTimes(1);

      vi.unstubAllEnvs();
      log.mockRestore();
    });

    test.each([
      ['markup', '<img src=x onerror=alert(1)>'],
      ['more than 50 characters', 'a'.repeat(51)],
      ['a non-string', 5],
    ])('rejects a name with %s at signup', async (_name, name) => {
      vi.mocked(userService.getLogin).mockResolvedValue(undefined);

      expect((await login({ value: 'a@b.c', type: 'email', name })).statusCode).toBe(400);
      expect(userService.create).not.toHaveBeenCalled();
    });

    test.each([
      ['a number', { type: 'email', value: 5 }],
      ['an object', { type: 'email', value: { toLowerCase: 'x' } }],
      ['an address list', { type: 'email', value: 'a@b.c, d@e.f' }],
    ])('rejects a value that is %s', async (_name, body) => {
      expect((await login(body)).statusCode).toBe(400);
      expect(transporter.sendMail).not.toHaveBeenCalled();
    });

    test('creates a user and login when none exist', async () => {
      vi.mocked(userService.getLogin).mockResolvedValue(undefined);
      vi.mocked(userService.create).mockResolvedValue({ id: 'u2', name: 'Ann', role: 'admin' });
      vi.mocked(userService.addLogin).mockResolvedValue({ id: 'l2', userId: 'u2', value: 'a@b.c', type: 'email' });

      await login();

      expect(userService.create).toHaveBeenCalledWith('Ann');
      expect(userService.addLogin).toHaveBeenCalledWith('u2', 'a@b.c', 'email');
      expect(sessionService.create).toHaveBeenCalledWith(SESSION_ID, 'l2', expect.any(String), 'pending');
    });

    test.each(['a@x.com, b@y.com', 'a@x.com;b@y.com', 'not-an-email'])('rejects the invalid or multi-recipient email %j', async value => {
      expect((await login({ value, type: 'email' })).statusCode).toBe(400);
      expect(transporter.sendMail).not.toHaveBeenCalled();
      expect(sessionService.create).not.toHaveBeenCalled();
    });

    test('caps emails per address, case insensitively, without refusing the login', async () => {
      await login({ value: 'a@b.c', type: 'email' });
      await login({ value: 'A@b.c', type: 'email' });
      const capped = await login({ value: 'a@B.c', type: 'email' });

      expect(capped.statusCode).toBe(200);
      expect(jsonBody(capped)).toEqual({ sessionId: SESSION_ID });
      expect(transporter.sendMail).toHaveBeenCalledTimes(2);
      expect(sessionService.create).toHaveBeenCalledTimes(2);
    });

    test('keys the ip limit on the forwarded client address behind the proxy', async () => {
      const forwarded = (ip: string, value: string) => request({
        method: 'POST',
        path: 'api/user',
        headers: { ...anonymous, 'x-forwarded-for': ip },
        body: { value, type: 'email' },
      });

      await forwarded('203.0.113.1', 'a@b.c');
      await forwarded('203.0.113.1', 'b@b.c');
      await forwarded('203.0.113.1', 'c@b.c');

      expect((await forwarded('203.0.113.1', 'd@b.c')).statusCode).toBe(429);
      expect((await forwarded('203.0.113.2', 'e@b.c')).statusCode).toBe(200);
    });

    test('rate limits per ip across addresses', async () => {
      await login({ value: 'a@b.c', type: 'email' });
      await login({ value: 'b@b.c', type: 'email' });
      await login({ value: 'c@b.c', type: 'email' });

      expect((await login({ value: 'd@b.c', type: 'email' })).statusCode).toBe(429);
      expect(transporter.sendMail).toHaveBeenCalledTimes(3);
    });

    test('answers 400 when the mail fails', async () => {
      transporter.sendMail.mockImplementation((_options, callback) => callback(new Error('smtp down'), {}));
      expect((await login()).statusCode).toBe(400);
    });

    test('rejects login types other than email', async () => {
      expect((await login({ value: '123', type: 'phone' })).statusCode).toBe(400);
      expect(transporter.sendMail).not.toHaveBeenCalled();
    });
  });

  describe('/sessions', () => {
    const sessions = [
      { userId: 'u1', loginType: 'email', lastActive: null, sessionId: 's1', sessionStatus: 'active', sessionCreatedAt: '2024-01-01T00:00:00Z', userAgent: 'UA', remoteAddress: '1.2.3.4' },
      { userId: 'u1', loginType: 'email', lastActive: null, sessionId: 's2', sessionStatus: 'deleted', sessionCreatedAt: '2024-01-02T00:00:00Z', userAgent: null, remoteAddress: null },
    ];

    test('lists live sessions with their stored details', async () => {
      loggedInAs('user');
      vi.mocked(getUserSessions).mockResolvedValue(sessions);

      const body = jsonBody(await request({ path: 'api/user/sessions' }));

      expect(body).toEqual([{
        userId: 'u1',
        loginType: 'email',
        lastActive: null,
        sessionId: 's1',
        sessionStatus: 'active',
        sessionCreatedAt: Date.parse('2024-01-01T00:00:00Z'),
        details: { userAgent: 'UA', remoteAddress: '1.2.3.4' },
      }]);
    });

    test('uses null details when none are stored', async () => {
      loggedInAs('user');
      vi.mocked(getUserSessions).mockResolvedValue([{ userId: 'u1', loginType: 'email', lastActive: null, sessionId: 's1', sessionStatus: 'active', sessionCreatedAt: '2024-01-01T00:00:00Z', userAgent: null, remoteAddress: null }]);

      expect(jsonBody(await request({ path: 'api/user/sessions' }))[0].details).toBeNull();
    });

    test('fails when sessions cannot be loaded', async () => {
      loggedInAs('user');
      vi.mocked(getUserSessions).mockResolvedValue(null);
      expect((await request({ path: 'api/user/sessions' })).statusCode).toBe(400);
    });

    test('revokes one of the user\'s own sessions', async () => {
      loggedInAs('user');
      vi.mocked(getUserSessions).mockResolvedValue([{ ...sessions[0], sessionId: ID }]);

      const response = await request({ method: 'DELETE', path: `api/user/sessions/${ID}` });

      expect(response.statusCode).toBe(200);
      expect(sessionService.remove).toHaveBeenCalledWith(ID);
    });

    test('does not revoke sessions of other users', async () => {
      loggedInAs('user');
      vi.mocked(getUserSessions).mockResolvedValue([sessions[0]]);

      const response = await request({ method: 'DELETE', path: `api/user/sessions/${ID}` });

      expect(response.statusCode).toBe(404);
      expect(sessionService.remove).not.toHaveBeenCalled();
    });

    test('is unavailable when logged out', async () => {
      expect((await request({ path: 'api/user/sessions' })).statusCode).toBe(404);
      expect(getUserSessions).not.toHaveBeenCalled();
    });
  });

  describe('/name', () => {
    test('returns the name', async () => {
      loggedInAs('user');
      expect(jsonBody(await request({ path: 'api/user/name' }))).toEqual({ name: 'Ann' });
    });

    test('updates the name', async () => {
      loggedInAs('user');
      const response = await request({ method: 'PUT', path: 'api/user/name', body: { name: 'Bob' } });
      expect(response.statusCode).toBe(200);
      expect(userService.setName).toHaveBeenCalledWith('u1', 'Bob');
    });

    test('rejects names with markup or that are too long', async () => {
      loggedInAs('user');
      expect((await request({ method: 'PUT', path: 'api/user/name', body: { name: '<img src=x onerror=alert(1)>' } })).statusCode).toBe(400);
      expect((await request({ method: 'PUT', path: 'api/user/name', body: { name: 'a'.repeat(51) } })).statusCode).toBe(400);
      expect(userService.setName).not.toHaveBeenCalled();
    });

    test('requires a login and a name', async () => {
      expect((await request({ path: 'api/user/name' })).statusCode).toBe(400);
      expect((await request({ method: 'PUT', path: 'api/user/name', body: { name: 'Bob' } })).statusCode).toBe(400);
      loggedInAs('user');
      expect((await request({ method: 'PUT', path: 'api/user/name', body: {} })).statusCode).toBe(400);
      expect(userService.setName).not.toHaveBeenCalled();
    });
  });

  describe('account deletion and export', () => {
    test('emails a confirmation code to the login address', async () => {
      loggedInAs('user');
      vi.mocked(accountService.requestDeletion).mockResolvedValue('ABC123');
      vi.mocked(getTranslation).mockResolvedValue({ value: 'Confirm' });

      const response = await request({ method: 'POST', path: 'api/user/deletion' });

      expect(response.statusCode).toBe(200);
      expect(accountService.requestDeletion).toHaveBeenCalledWith('u1');
      expect(transporter.sendMail).toHaveBeenCalledWith(expect.objectContaining({ to: 'a@b.c', subject: 'Confirm', html: '<html>delete</html>' }));
    });

    test('limits the deletion requests per user', async () => {
      loggedInAs('user');
      vi.mocked(getTranslation).mockResolvedValue({ value: 'Confirm' });

      const statuses = [];
      for (let i = 0; i < 4; i++) statuses.push((await request({ method: 'POST', path: 'api/user/deletion' })).statusCode);

      expect(statuses).toEqual([200, 200, 200, 429]);
    });

    test('requires a login to request the deletion', async () => {
      expect((await request({ method: 'POST', path: 'api/user/deletion' })).statusCode).toBe(400);
      expect(accountService.requestDeletion).not.toHaveBeenCalled();
    });

    test('deletes the account with a valid code and ends the session cookie', async () => {
      loggedInAs('user');
      vi.mocked(accountService.confirmDeletion).mockResolvedValue(true);

      const response = await request({ method: 'DELETE', path: 'api/user', body: { code: 'ABC123' } });

      expect(response.statusCode).toBe(200);
      expect(accountService.confirmDeletion).toHaveBeenCalledWith('u1', 'ABC123');
      expect(response.headers?.['Set-Cookie']).toContain('sessionId=none');
    });

    test('keeps the account when the code is wrong or missing', async () => {
      loggedInAs('user');
      vi.mocked(accountService.confirmDeletion).mockResolvedValue(false);

      expect((await request({ method: 'DELETE', path: 'api/user', body: { code: 'ABC123' } })).statusCode).toBe(400);
      expect((await request({ method: 'DELETE', path: 'api/user', body: {} })).statusCode).toBe(400);
      expect(accountService.confirmDeletion).toHaveBeenCalledTimes(1);
    });

    test('requires a login to delete', async () => {
      expect((await request({ method: 'DELETE', path: 'api/user', body: { code: 'ABC123' } })).statusCode).toBe(400);
      expect(accountService.confirmDeletion).not.toHaveBeenCalled();
    });

    test('exports the data as a download', async () => {
      loggedInAs('user');
      vi.mocked(accountService.export).mockResolvedValue({ profile: undefined, logins: [], sessions: [], tags: [], posts: [], comments: [] });

      const response = await request({ path: 'api/user/export' });

      expect(response.statusCode).toBe(200);
      expect(response.headers?.['Content-Disposition']).toContain('attachment');
      expect(jsonBody(response)).toMatchObject({ logins: [], posts: [] });
      expect(accountService.export).toHaveBeenCalledWith('u1');
    });

    test('requires a login to export', async () => {
      expect((await request({ path: 'api/user/export' })).statusCode).toBe(400);
      expect(accountService.export).not.toHaveBeenCalled();
    });
  });

  describe('/users', () => {
    test('lists users for admins', async () => {
      loggedInAs('admin');
      vi.mocked(userService.getList).mockResolvedValue([{ id: 'u2', name: 'Bob', role: 'user', created_at: 1 }]);
      expect(jsonBody(await request({ path: 'api/users' }))).toEqual([{ id: 'u2', name: 'Bob', role: 'user', created_at: 1 }]);
    });

    test('rejects non-admins and anonymous visitors', async () => {
      expect((await request({ path: 'api/users' })).statusCode).toBe(400);
      loggedInAs('user');
      expect((await request({ path: 'api/users' })).statusCode).toBe(400);
      expect((await request({ method: 'PUT', path: 'api/users/u2', body: { role: 'admin' } })).statusCode).toBe(400);
      expect(userService.setRole).not.toHaveBeenCalled();
    });

    test('promotes and demotes other users', async () => {
      loggedInAs('admin');
      expect((await request({ method: 'PUT', path: 'api/users/u2', body: { role: 'admin' } })).statusCode).toBe(200);
      expect(userService.setRole).toHaveBeenCalledWith('u2', 'admin');
      await request({ method: 'PUT', path: 'api/users/u2', body: { role: 'user' } });
      expect(userService.setRole).toHaveBeenCalledWith('u2', 'user');
    });

    test('records role changes in the audit log', async () => {
      loggedInAs('admin');
      await request({ method: 'PUT', path: 'api/users/u2', body: { role: 'admin' } });
      expect(auditService.record).toHaveBeenCalledWith('u1', 'user.role.admin', 'u2', expect.any(String));
    });

    test('lists the audit log for admins only', async () => {
      const entry = { user_id: 'u1', action: 'tag.created', target_id: 't1', request_id: 'r1', created_at: 5 };
      vi.mocked(auditService.getRecent).mockResolvedValue([{ id: 'a1', ...entry }]);
      expect((await request({ path: 'api/users/audit' })).statusCode).toBe(400);
      loggedInAs('user');
      expect((await request({ path: 'api/users/audit' })).statusCode).toBe(400);
      loggedInAs('admin');
      expect(jsonBody(await request({ path: 'api/users/audit' }))).toEqual([entry]);
    });

    test('rejects invalid roles and changing own role', async () => {
      loggedInAs('admin');
      expect((await request({ method: 'PUT', path: 'api/users/u2', body: { role: 'root' } })).statusCode).toBe(400);
      expect((await request({ method: 'PUT', path: 'api/users/u1', body: { role: 'user' } })).statusCode).toBe(400);
      expect(userService.setRole).not.toHaveBeenCalled();
    });
  });

  describe('/tags', () => {
    test('lists the tags of the user', async () => {
      loggedInAs('user');
      vi.mocked(userService.getTags).mockResolvedValue([{ tag_id: 't1', type: 'liked' }]);
      expect(jsonBody(await request({ path: 'api/user/tags' }))).toEqual([{ tag_id: 't1', type: 'liked' }]);
    });

    test('answers 401 with an empty list when logged out', async () => {
      const response = await request({ path: 'api/user/tags' });
      expect(response.statusCode).toBe(401);
      expect(jsonBody(response)).toEqual([]);
    });

    test('saves a tag preference', async () => {
      loggedInAs('user');
      vi.mocked(tagService.get, { partial: true }).mockResolvedValue({ id: TAG_ID });
      const response = await request({ method: 'PUT', path: 'api/user/tags', body: { id: TAG_ID, type: 'liked' } });
      expect(response.statusCode).toBe(200);
      expect(userService.addTag).toHaveBeenCalledWith(TAG_ID, 'u1', 'liked');
    });

    test('rejects a preference for a tag that does not exist', async () => {
      loggedInAs('user');
      vi.mocked(tagService.get).mockResolvedValue(undefined);
      expect((await request({ method: 'PUT', path: 'api/user/tags', body: { id: TAG_ID, type: 'liked' } })).statusCode).toBe(400);
      expect(userService.addTag).not.toHaveBeenCalled();
    });

    test('rejects a preference type other than liked or disliked', async () => {
      loggedInAs('user');
      expect((await request({ method: 'PUT', path: 'api/user/tags', body: { id: TAG_ID, type: 'loved' } })).statusCode).toBe(400);
      expect(userService.addTag).not.toHaveBeenCalled();
    });

    test('removes a tag preference', async () => {
      loggedInAs('user');
      const response = await request({ method: 'DELETE', path: 'api/user/tags', body: { id: TAG_ID } });
      expect(response.statusCode).toBe(200);
      expect(userService.removeTag).toHaveBeenCalledWith(TAG_ID, 'u1');
    });

    test.each([
      ['PUT', { id: 't1' }],
      ['PUT', { type: 'liked' }],
      ['DELETE', {}],
    ])('rejects an incomplete %s', async (method, body) => {
      loggedInAs('user');
      expect((await request({ method, path: 'api/user/tags', body })).statusCode).toBe(400);
    });

    test.each(['PUT', 'DELETE'])('rejects %s when logged out', async method => {
      expect((await request({ method, path: 'api/user/tags', body: { id: 't1', type: 'liked' } })).statusCode).toBe(400);
      expect(userService.addTag).not.toHaveBeenCalled();
      expect(userService.removeTag).not.toHaveBeenCalled();
    });
  });
});
