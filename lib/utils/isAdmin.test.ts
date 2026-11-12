import { expect, test } from 'vitest';
import isAdmin from './isAdmin';

test('is true only for the admin role', () => {
  expect(isAdmin({ user: { role: 'admin' } })).toBe(true);
  expect(isAdmin({ user: { role: 'user' } })).toBe(false);
});

test('is false without a user', () => {
  expect(isAdmin(null)).toBe(false);
  expect(isAdmin(undefined)).toBe(false);
});
