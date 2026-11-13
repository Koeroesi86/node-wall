import { afterEach, expect, test, vi } from 'vitest';
import { buildSessionCookie } from './sessionCookie';

afterEach(() => vi.unstubAllEnvs());

test('session cookies are Secure by default', () => {
  vi.stubEnv('SITE_PROTOCOL', '');
  expect(buildSessionCookie('abc', 'now')).toBe('sessionId=abc; Expires=now GMT; Path=/; Secure; HttpOnly; SameSite=Lax');
});

test('session cookies are Secure when the site is https', () => {
  vi.stubEnv('SITE_PROTOCOL', 'https');
  expect(buildSessionCookie('abc', 'now')).toContain('; Secure;');
});

test('session cookies drop Secure only for a plain http site (local dev)', () => {
  vi.stubEnv('SITE_PROTOCOL', 'http');
  expect(buildSessionCookie('abc', 'now')).toBe('sessionId=abc; Expires=now GMT; Path=/; HttpOnly; SameSite=Lax');
});
