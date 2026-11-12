import { test, expect } from 'vitest';
import stripHtml from './stripHtml';

test('removes tags and keeps text', () => {
  expect(stripHtml('<b>hello</b> world')).toBe('hello world');
});

test('never leaves an opening bracket behind', () => {
  expect(stripHtml('<<b>script>alert(1)<</b>/script>')).not.toMatch(/</);
  expect(stripHtml('<scr<b>ipt>x</scr</b>ipt>')).not.toMatch(/</);
});

test('escapes a stray opening bracket', () => {
  expect(stripHtml('a < b')).toBe('a &lt; b');
});

test('leaves plain text untouched', () => {
  expect(stripHtml('plain text')).toBe('plain text');
});
