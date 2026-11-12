import { describe, expect, it } from 'vitest';
import assertSafeLoginLogging from './assertSafeLoginLogging';

describe('assertSafeLoginLogging', () => {
  it('throws when login codes are logged on https', () => {
    expect(() => assertSafeLoginLogging({ LOG_LOGIN_CODE: 'true', SITE_PROTOCOL: 'https' })).toThrow();
  });

  it('allows login code logging on http', () => {
    expect(() => assertSafeLoginLogging({ LOG_LOGIN_CODE: 'true', SITE_PROTOCOL: 'http' })).not.toThrow();
  });

  it('allows https without login code logging', () => {
    expect(() => assertSafeLoginLogging({ SITE_PROTOCOL: 'https' })).not.toThrow();
  });
});
