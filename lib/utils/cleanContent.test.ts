import { test, expect } from 'vitest';
import cleanContent from './cleanContent';

test('trims, collapses blank lines, converts nbsp and strips tags', () => {
  expect(cleanContent('  <b>Hi</b>&nbsp;there\n\n\n\nbye  ')).toBe('Hi there\n\nbye');
});

test('rejects content that is empty once markup is stripped', () => {
  expect(() => cleanContent('  <b></b> &nbsp; ')).toThrow('empty content');
});
