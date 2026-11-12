import { createHash, timingSafeEqual } from 'crypto';

export const LOGIN_CODE_TTL_MS = 10 * 60 * 1000;
export const LOGIN_CODE_MAX_ATTEMPTS = 5;

export const hashLoginCode = (code: string) => createHash('sha256').update(code).digest('hex');

export const isLoginCodeMatch = (code: string, storedHash: string | null | undefined) => {
  const actual = Buffer.from(hashLoginCode(code));
  const expected = Buffer.from(storedHash ?? '');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
};

/** `created_at` is stored by sqlite as a UTC `YYYY-MM-DD HH:MM:SS` string (or as epoch millis). */
export const isLoginCodeExpired = (createdAt: string | number | Date | null | undefined, now = Date.now()) => {
  const created = typeof createdAt === 'string' && !/[zZ]|[+-]\d{2}:?\d{2}$/.test(createdAt)
    ? Date.parse(`${createdAt.replace(' ', 'T')}Z`)
    : new Date(createdAt ?? NaN).getTime();
  return Number.isNaN(created) || now - created > LOGIN_CODE_TTL_MS;
};
