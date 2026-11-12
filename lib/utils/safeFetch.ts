import { lookup } from 'dns/promises';
import { isIP } from 'net';

const MAX_REDIRECTS = 3;
const TIMEOUT_MS = 10_000;
export const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;

const isPrivateIPv4 = (ip: string) => {
  const [a, b] = ip.split('.').map(Number);
  return a === 0
    || a === 10
    || a === 127
    || (a === 100 && b >= 64 && b <= 127)
    || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 168)
    || (a === 192 && b === 0)
    || (a === 198 && (b === 18 || b === 19))
    || a >= 224;
};

export const isPrivateAddress = (address: string): boolean => {
  const ip = address.toLowerCase();
  const mapped = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)?.[1];
  if (mapped) return isPrivateIPv4(mapped);
  if (isIP(ip) === 4) return isPrivateIPv4(ip);
  return ip === '::'
    || ip === '::1'
    || /^f[cd]/.test(ip)
    || /^fe[89ab]/.test(ip)
    || ip.startsWith('::ffff:');
};

const assertPublicUrl = async (url: URL) => {
  if (url.protocol !== 'https:') throw new Error('Only https links are allowed');
  const hostname = url.hostname.replace(/^\[|\]$/g, '');
  const addresses = await lookup(hostname, { all: true });
  if (addresses.length === 0 || addresses.some(({ address }) => isPrivateAddress(address))) {
    throw new Error('Link points to a disallowed address');
  }
};

const readLimited = async (response: Response): Promise<string> => {
  const declared = Number(response.headers.get('content-length') ?? 0);
  if (declared > MAX_RESPONSE_BYTES) throw new Error('Response too large');
  const reader = response.body?.getReader();
  if (!reader) return '';
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_RESPONSE_BYTES) {
      await reader.cancel();
      throw new Error('Response too large');
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString('utf8');
};

/**
 * Fetches a public https URL as text. Validates the resolved address of every hop,
 * follows a limited number of redirects manually, and enforces timeout and size caps.
 */
export default async function safeFetch(
  url: string,
  headers: Record<string, string> = {},
): Promise<{ response: Response; text: string }> {
  const signal = AbortSignal.timeout(TIMEOUT_MS);
  let current = new URL(url);

  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    await assertPublicUrl(current);
    const response = await fetch(current, { headers, redirect: 'manual', signal });
    const location = response.headers.get('location');

    if (response.status >= 300 && response.status < 400 && location) {
      await response.body?.cancel();
      current = new URL(location, current);
      continue;
    }

    return { response, text: response.ok ? await readLimited(response) : '' };
  }

  throw new Error('Too many redirects');
}
