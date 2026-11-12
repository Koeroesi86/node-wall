import { test, expect } from 'vitest';
import generateCode from './generateCode';

test('generates a six character code by default', () => {
  expect(generateCode()).toMatch(/^[A-Z0-9]{6}$/);
});

test('respects length and characters', () => {
  expect(generateCode(10, 'a')).toBe('aaaaaaaaaa');
});

test('returns an empty string for length zero', () => {
  expect(generateCode(0)).toBe('');
});
