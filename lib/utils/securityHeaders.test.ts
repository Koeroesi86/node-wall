import { describe, expect, test } from 'vitest';
import securityHeaders from './securityHeaders';

const policy = securityHeaders['Content-Security-Policy'];

describe('securityHeaders', () => {
  test('only allows scripts and styles from trusted origins', () => {
    expect(policy).toContain("script-src 'self';");
    expect(policy).toContain("style-src 'self' https://fonts.googleapis.com 'sha256-rJJyMDPmHMZS0mPmL877gjjApxGMVa4522UDb4ctw7I=';");
    expect(policy).not.toContain('unsafe-inline');
  });

  test.each([
    "default-src 'self'",
    "connect-src 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
  ])('restricts %s', (directive) => {
    expect(policy.split('; ')).toContain(directive);
  });

  test('forbids framing, leaking referrers and powerful features', () => {
    expect(securityHeaders['X-Frame-Options']).toBe('DENY');
    expect(securityHeaders['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
    expect(securityHeaders['Permissions-Policy']).toContain('camera=()');
    expect(securityHeaders['X-Content-Type-Options']).toBe('nosniff');
  });

  test('enforces HTTPS', () => {
    expect(securityHeaders['Strict-Transport-Security']).toMatch(/max-age=\d+/);
  });
});
