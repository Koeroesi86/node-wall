import { lookup } from 'dns';
import { request } from 'https';
import { isIP, LookupFunction } from 'net';
import { Readable } from 'stream';

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

/**
 * Resolves and validates in one step, so the address that is checked is the address that is
 * connected to (no second resolution an attacker could answer differently).
 */
export const validatingLookup: LookupFunction = (hostname, options, callback) => {
  lookup(hostname, { all: true }, (error, addresses) => {
    if (error) return callback(error, []);
    if (addresses.length === 0 || addresses.some(({ address }) => isPrivateAddress(address))) {
      return callback(new Error('Link points to a disallowed address'), []);
    }
    if (options.all) return callback(null, addresses);
    return callback(null, addresses[0].address, addresses[0].family);
  });
};

const assertPublicUrl = (url: URL) => {
  if (url.protocol !== 'https:') throw new Error('Only https links are allowed');
  const hostname = url.hostname.replace(/^\[|\]$/g, '');
  // Node does not call the lookup hook for literal IPs
  if (isIP(hostname) !== 0 && isPrivateAddress(hostname)) throw new Error('Link points to a disallowed address');
};

const httpsGet = (url: URL, headers: Record<string, string>, signal: AbortSignal): Promise<Response> =>
  new Promise((resolve, reject) => {
    const req = request(url, { method: 'GET', headers, signal, lookup: validatingLookup }, (res) => {
      const responseHeaders = Object.entries(res.headers).flatMap(([name, value]) =>
        (Array.isArray(value) ? value : [value ?? '']).map((v): [string, string] => [name, v]));
      const status = res.statusCode ?? 502;
      const body = [204, 205, 304].includes(status) || (status >= 300 && status < 400)
        ? undefined
        : Readable.toWeb(res);
      if (!body) res.resume();
      resolve(new Response(body as ReadableStream | undefined, { status, headers: responseHeaders }));
    });
    req.on('error', reject);
    req.end();
  });

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
 * Fetches a public https URL as text. Validates the address actually connected to (via a lookup hook) on every hop,
 * follows a limited number of redirects manually, and enforces timeout and size caps.
 */
export default async function safeFetch(
  url: string,
  headers: Record<string, string> = {},
): Promise<{ response: Response; text: string }> {
  const signal = AbortSignal.timeout(TIMEOUT_MS);
  let current = new URL(url);

  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    assertPublicUrl(current);
    const response = await httpsGet(current, headers, signal);
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
