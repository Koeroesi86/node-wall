import { test, expect } from 'vitest';
import getTranslation from './getTranslation';

test('returns the en-GB value', async () => {
  const result = await getTranslation('email.verify.title', 'en-GB');
  expect(typeof result.value).toBe('string');
  expect(result.value).not.toBe('');
});

test('falls back to en-GB for an unknown language', async () => {
  expect(await getTranslation('email.verify.title', 'xx-XX')).toEqual(await getTranslation('email.verify.title', 'en-GB'));
});

test('returns an empty value for an unknown alias', async () => {
  expect(await getTranslation('does.not.exist')).toEqual({ value: '' });
});

test('does not traverse outside the translations directory', async () => {
  expect(await getTranslation('package', '../..')).toEqual({ value: '' });
  expect(await getTranslation('../../package')).toEqual({ value: '' });
});
