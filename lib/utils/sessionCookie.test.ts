import { afterEach, expect, test, vi } from 'vitest';
import { buildSessionCookie } from './sessionCookie';

afterEach(() => vi.unstubAllEnvs());

test('session cookies are Secure by default', () => {
  vi.stubEnv('SITE_PROTOCOL', '');
  expect(buildSessionCookie('abc', new Date(0))).toBe('sessionId=abc; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/; Secure; HttpOnly; SameSite=Lax');
});

test('session cookies are Secure when the site is https', () => {
  vi.stubEnv('SITE_PROTOCOL', 'https');
  expect(buildSessionCookie('abc', new Date(0))).toContain('; Secure;');
});

test('session cookies drop Secure only for a plain http site (local dev)', () => {
  vi.stubEnv('SITE_PROTOCOL', 'http');
  expect(buildSessionCookie('abc', new Date(0))).toBe('sessionId=abc; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/; HttpOnly; SameSite=Lax');
});
