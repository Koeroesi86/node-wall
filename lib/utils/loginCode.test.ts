import { describe, expect, test } from 'vitest';
import { hashLoginCode, isLoginCodeExpired, isLoginCodeMatch, LOGIN_CODE_TTL_MS } from './loginCode';

describe('isLoginCodeMatch', () => {
  const hash = hashLoginCode('ABC123');

  test('accepts the right code', () => expect(isLoginCodeMatch('ABC123', hash)).toBe(true));
  test('rejects a wrong code', () => expect(isLoginCodeMatch('ABC124', hash)).toBe(false));
  test.each([undefined, null, ''])('rejects a missing stored hash (%s)', stored => {
    expect(isLoginCodeMatch('ABC123', stored)).toBe(false);
  });
});

describe('isLoginCodeExpired', () => {
  const now = Date.parse('2026-01-01T12:00:00Z');
  const sqlite = (ms: number) => new Date(ms).toISOString().slice(0, 19).replace('T', ' ');

  test('is valid within the TTL', () => expect(isLoginCodeExpired(sqlite(now - LOGIN_CODE_TTL_MS + 1000), now)).toBe(false));
  test('expires after the TTL', () => expect(isLoginCodeExpired(sqlite(now - LOGIN_CODE_TTL_MS - 1000), now)).toBe(true));
  test('accepts epoch millis', () => expect(isLoginCodeExpired(now - 1000, now)).toBe(false));
  test.each([undefined, null, 'garbage'])('treats %s as expired', value => expect(isLoginCodeExpired(value, now)).toBe(true));
});
