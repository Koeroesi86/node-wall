import { expect, test } from 'vitest';
import isSingleEmail from './isSingleEmail';

test.each(['a@b.co', 'first.last+tag@sub.example.com'])('accepts %s', value => {
  expect(isSingleEmail(value)).toBe(true);
});

test.each([
  'a@x.com, b@y.com',
  'a@x.com,b@y.com',
  'a@x.com;b@y.com',
  'a@x.com b@y.com',
  'Name <a@x.com>',
  '"a,b"@x.com',
  'a@x.com\r\nBcc: b@y.com',
  'a@b',
  'plain',
  '',
])('rejects %j', value => {
  expect(isSingleEmail(value)).toBe(false);
});

test('rejects non-strings', () => {
  expect(isSingleEmail(undefined)).toBe(false);
  expect(isSingleEmail(['a@b.co'])).toBe(false);
});
