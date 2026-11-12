import { test, expect } from 'vitest';
import detectLanguage from './detectLanguage';

test('defaults to en-GB without an accept-language header', async () => {
  expect(await detectLanguage({})).toBe('en-GB');
});

test('uses the first five characters of accept-language', async () => {
  expect(await detectLanguage({ 'accept-language': 'hu-HU,hu;q=0.9,en;q=0.8' })).toBe('hu-HU');
});
