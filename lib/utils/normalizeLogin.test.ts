import { expect, test } from 'vitest';
import normalizeLogin from './normalizeLogin';

test('email logins are trimmed and lowercased', () => {
  expect(normalizeLogin('email', '  A@Example.COM ')).toBe('a@example.com');
});

test('email logins are Unicode normalised', () => {
  expect(normalizeLogin('email', 'ａ@example.com')).toBe('a@example.com');
});

test('other login types are left untouched', () => {
  expect(normalizeLogin('google', ' AbC ')).toBe(' AbC ');
});
