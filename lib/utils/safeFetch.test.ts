import { beforeEach, describe, expect, test, vi } from 'vitest';
import { lookup } from 'dns';
import { request } from 'https';
import { EventEmitter, Readable } from 'stream';
import safeFetch, { isPrivateAddress, validatingLookup } from './safeFetch';

vi.mock('dns');
vi.mock('https');

type LookupResult = { address: string; family: number }[];

const mockLookup = (...answers: LookupResult[]) => {
  const impl = vi.mocked(lookup) as unknown as ReturnType<typeof vi.fn>;
  answers.forEach((answer) => impl.mockImplementationOnce((_h: string, _o: unknown, cb: (e: null, a: LookupResult) => void) => cb(null, answer)));
};

const mockResponse = (body: string, statusCode = 200, headers: Record<string, string> = {}) => {
  const res = Object.assign(Readable.from([Buffer.from(body)]), { statusCode, headers });
  vi.mocked(request).mockImplementation(((_u: unknown, _o: unknown, cb: (r: unknown) => void) => {
    const req = Object.assign(new EventEmitter(), { end: () => cb(res) });
    return req;
  }) as never);
};

beforeEach(() => {
  vi.resetAllMocks();
});

test.each([
  ['127.0.0.1', true], ['10.1.2.3', true], ['169.254.169.254', true], ['172.16.0.1', true],
  ['192.168.1.1', true], ['::1', true], ['fd00::1', true], ['fe80::1', true], ['::ffff:127.0.0.1', true],
  ['93.184.216.34', false], ['2606:2800:220:1::1', false],
])('isPrivateAddress(%s) is %s', (address, expected) => {
  expect(isPrivateAddress(address)).toBe(expected);
});

describe('validatingLookup', () => {
  const resolve = (options: { all?: boolean } = {}) => new Promise<unknown[]>((done) => {
    validatingLookup('example.com', options, (...args) => done(args));
  });

  test('returns a single public address', async () => {
    mockLookup([{ address: '93.184.216.34', family: 4 }]);
    expect(await resolve()).toEqual([null, '93.184.216.34', 4]);
  });

  test('returns all addresses when requested', async () => {
    mockLookup([{ address: '93.184.216.34', family: 4 }]);
    expect(await resolve({ all: true })).toEqual([null, [{ address: '93.184.216.34', family: 4 }]]);
  });

  test('rejects private addresses', async () => {
    mockLookup([{ address: '169.254.169.254', family: 4 }]);
    expect((await resolve())[0]).toEqual(new Error('Link points to a disallowed address'));
  });
});

describe('safeFetch', () => {
  test('returns the response text', async () => {
    mockResponse('hello');
    expect((await safeFetch('https://example.com')).text).toBe('hello');
  });

  test('connects using the validating lookup', async () => {
    mockResponse('hello');
    await safeFetch('https://example.com');
    expect(vi.mocked(request).mock.calls[0][1]).toMatchObject({ lookup: validatingLookup });
  });

  test('a rebinding resolver cannot reach a private address on the connection lookup', async () => {
    mockLookup([{ address: '93.184.216.34', family: 4 }], [{ address: '127.0.0.1', family: 4 }]);
    const first = await new Promise<unknown[]>((done) => validatingLookup('rebind.example', {}, (...a) => done(a)));
    const second = await new Promise<unknown[]>((done) => validatingLookup('rebind.example', {}, (...a) => done(a)));
    expect(first[1]).toBe('93.184.216.34');
    expect(second[0]).toEqual(new Error('Link points to a disallowed address'));
  });

  test('rejects non-https urls', async () => {
    await expect(safeFetch('http://example.com')).rejects.toThrow('Only https');
    expect(request).not.toHaveBeenCalled();
  });

  test('rejects literal private ip hosts', async () => {
    await expect(safeFetch('https://169.254.169.254/')).rejects.toThrow('disallowed address');
    await expect(safeFetch('https://[::1]/')).rejects.toThrow('disallowed address');
    expect(request).not.toHaveBeenCalled();
  });

  test('follows redirects through the same guarded path', async () => {
    mockResponse('', 302, { location: 'https://internal.example/' });
    await expect(safeFetch('https://example.com')).rejects.toThrow('Too many redirects');
    expect(request).toHaveBeenCalledTimes(4);
  });

  test('rejects oversized responses', async () => {
    mockResponse('x'.repeat(2 * 1024 * 1024 + 1));
    await expect(safeFetch('https://example.com')).rejects.toThrow('too large');
  });
});
