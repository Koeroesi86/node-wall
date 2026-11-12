import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const nodemailer = vi.hoisted(() => ({ createTransport: vi.fn(() => ({ kind: 'nodemailer' })) }));

vi.mock('nodemailer', () => ({ default: nodemailer }));

const fetchMock = vi.fn();

const jsonResponse = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

const load = async () => (await import('./createMailer')).default();

const mail = { from: 'from@x.y', to: 'to@x.y', subject: 'Hi', html: '<p>Hi</p>' };

beforeEach(() => {
  vi.resetModules();
  nodemailer.createTransport.mockClear();
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  ['ZOHO_REFRESH_TOKEN', 'NODEMAILER_HOST', 'ZOHO_DOMAIN'].forEach(name => vi.stubEnv(name, ''));
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('transport selection', () => {
  test('falls back to the JSON transport', async () => {
    await load();
    expect(nodemailer.createTransport).toHaveBeenCalledWith({ jsonTransport: true });
  });

  test('uses SMTP when a host is configured', async () => {
    vi.stubEnv('NODEMAILER_HOST', 'smtp.x.y');
    vi.stubEnv('NODEMAILER_PORT', '465');
    vi.stubEnv('NODEMAILER_USER', 'user');
    vi.stubEnv('NODEMAILER_PASS', 'pass');
    await load();
    expect(nodemailer.createTransport).toHaveBeenCalledWith({
      host: 'smtp.x.y',
      port: 465,
      secure: true,
      pool: true,
      maxConnections: 1,
      auth: { user: 'user', pass: 'pass' },
    });
  });

  test('prefers Zoho over SMTP and never builds a nodemailer transport', async () => {
    vi.stubEnv('ZOHO_REFRESH_TOKEN', 'refresh');
    vi.stubEnv('NODEMAILER_HOST', 'smtp.x.y');
    await load();
    expect(nodemailer.createTransport).not.toHaveBeenCalled();
  });
});

describe('Zoho transport', () => {
  beforeEach(() => {
    vi.stubEnv('ZOHO_REFRESH_TOKEN', 'refresh');
    vi.stubEnv('ZOHO_CLIENT_ID', 'client');
    vi.stubEnv('ZOHO_CLIENT_SECRET', 'secret');
    vi.stubEnv('ZOHO_ACCOUNT_ID', '42');
  });

  test('refreshes a token and sends the message', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ access_token: 'tok', expires_in: 3600 }))
      .mockResolvedValueOnce(jsonResponse({ data: { messageId: 'm1' } }));
    const mailer = await load();

    const info = await new Promise((resolve, reject) => {
      mailer.sendMail(mail, (error, result) => (error ? reject(error) : resolve(result)));
    });

    expect(info).toEqual({ envelope: { from: 'from@x.y', to: ['to@x.y'] }, messageId: 'm1' });
    const [tokenUrl, tokenInit] = fetchMock.mock.calls[0];
    expect(tokenUrl).toBe('https://accounts.zoho.com/oauth/v2/token');
    expect(String(tokenInit.body)).toContain('refresh_token=refresh');
    const [sendUrl, sendInit] = fetchMock.mock.calls[1];
    expect(sendUrl).toBe('https://mail.zoho.com/api/accounts/42/messages');
    expect(sendInit.headers.Authorization).toBe('Zoho-oauthtoken tok');
    expect(JSON.parse(sendInit.body)).toMatchObject({ fromAddress: 'from@x.y', toAddress: 'to@x.y', subject: 'Hi', content: '<p>Hi</p>' });
  });

  test('reuses a cached token', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ access_token: 'tok', expires_in: 3600 }))
      .mockResolvedValue(jsonResponse({ data: { messageId: 'm1' } }));
    const mailer = await load();

    await mailer.sendMail(mail);
    await mailer.sendMail(mail);

    expect(fetchMock.mock.calls.filter(([url]) => String(url).includes('oauth'))).toHaveLength(1);
  });

  test('passes failures to the callback', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: 'invalid_code' }, 400));
    const mailer = await load();

    const error = await new Promise<Error | null | undefined>(resolve => {
      mailer.sendMail(mail, resolve);
    });

    expect(error?.message).toContain('Zoho request failed (400)');
  });

  test('rejects when the token response has no access token', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: 'nope' }));
    const mailer = await load();

    await expect(mailer.sendMail(mail)).rejects.toThrow('Zoho token refresh failed');
  });

  test('honours ZOHO_DOMAIN', async () => {
    vi.stubEnv('ZOHO_DOMAIN', 'eu');
    fetchMock.mockResolvedValue(jsonResponse({ access_token: 'tok', expires_in: 3600 }));
    const mailer = await load();

    await mailer.sendMail(mail);

    expect(fetchMock.mock.calls[0][0]).toBe('https://accounts.zoho.eu/oauth/v2/token');
  });
});
