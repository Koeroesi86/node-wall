import { describe, expect, test } from 'vitest';
import securityHeaders from './securityHeaders';

describe('securityHeaders', () => {
  test('only allows scripts from the same origin', () => {
    expect(securityHeaders['Content-Security-Policy']).toContain("script-src 'self';");
    expect(securityHeaders['Content-Security-Policy']).not.toContain('unsafe-inline');
  });
});
