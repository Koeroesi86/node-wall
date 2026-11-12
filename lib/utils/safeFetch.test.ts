import { beforeEach, describe, expect, test, vi } from 'vitest';
import { lookup } from 'dns/promises';
import safeFetch, { isPrivateAddress } from './safeFetch';

vi.mock('dns/promises');

const fetchMock = vi.fn();

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal('fetch', fetchMock);
  vi.mocked(lookup).mockResolvedValue([{ address: '93.184.216.34', family: 4 }] as never);
});

test.each([
  ['127.0.0.1', true], ['10.1.2.3', true], ['169.254.169.254', true], ['172.16.0.1', true],
  ['192.168.1.1', true], ['::1', true], ['fd00::1', true], ['fe80::1', true], ['::ffff:127.0.0.1', true],
  ['93.184.216.34', false], ['2606:2800:220:1::1', false],
])('isPrivateAddress(%s) is %s', (address, expected) => {
  expect(isPrivateAddress(address)).toBe(expected);
});

describe('safeFetch', () => {
  test('returns the response text', async () => {
    fetchMock.mockResolvedValue(new Response('hello'));
    expect((await safeFetch('https://example.com')).text).toBe('hello');
  });

  test('rejects non-https urls', async () => {
    await expect(safeFetch('http://example.com')).rejects.toThrow('Only https');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('rejects hosts resolving to private addresses', async () => {
    vi.mocked(lookup).mockResolvedValue([{ address: '169.254.169.254', family: 4 }] as never);
    await expect(safeFetch('https://evil.example')).rejects.toThrow('disallowed address');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('re-validates redirect targets', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 302, headers: { location: 'https://internal.example/' } }));
    vi.mocked(lookup)
      .mockResolvedValueOnce([{ address: '93.184.216.34', family: 4 }] as never)
      .mockResolvedValueOnce([{ address: '10.0.0.1', family: 4 }] as never);
    await expect(safeFetch('https://example.com')).rejects.toThrow('disallowed address');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test('limits redirects', async () => {
    fetchMock.mockImplementation(async () => new Response(null, { status: 302, headers: { location: 'https://example.com/next' } }));
    await expect(safeFetch('https://example.com')).rejects.toThrow('Too many redirects');
  });

  test('rejects oversized responses', async () => {
    fetchMock.mockResolvedValue(new Response('x'.repeat(2 * 1024 * 1024 + 1)));
    await expect(safeFetch('https://example.com')).rejects.toThrow('too large');
  });
});
