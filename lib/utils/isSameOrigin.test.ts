import { describe, expect, test } from 'vitest';
import isSameOrigin from './isSameOrigin';

describe('over https', () => {
  const check = (origin?: string) => isSameOrigin(origin, 'https', 'wall.example');

  test('accepts the site and requests without an origin', () => {
    expect(check('https://wall.example')).toBe(true);
    expect(check(undefined)).toBe(true);
  });

  test.each([
    'https://evil.example',
    'http://wall.example',
    'https://wall.example:8443',
    'https://wall.example.evil.example',
    'null',
    '',
  ])('rejects %j', (origin) => {
    expect(check(origin)).toBe(false);
  });
});

describe('over http (development)', () => {
  const check = (origin?: string) => isSameOrigin(origin, 'http', 'uzeno.localhost');

  test.each(['http://uzeno.localhost', 'http://uzeno.localhost:3000'])('accepts %s', (origin) => {
    expect(check(origin)).toBe(true);
  });

  test.each([
    'https://uzeno.localhost:3000',
    'http://evil.localhost:3000',
    'http://uzeno.localhost.evil.example:3000',
    'http://evil.example/http://uzeno.localhost',
    'null',
  ])('rejects %s', (origin) => {
    expect(check(origin)).toBe(false);
  });
});
