import { expect, test } from 'vitest';
import getTranslation from './getTranslation';
import getTranslations from './getTranslations';

test('contains the translations of the language', async () => {
  expect(getTranslations('hu-HU')['post-list.loading']).toBe((await getTranslation('post-list.loading', 'hu-HU')).value);
});

test('falls back to the default language for an unknown language and for missing aliases', () => {
  expect(getTranslations('xx-XX')).toEqual(getTranslations('en-GB'));
  expect(Object.keys(getTranslations('hu-HU'))).toEqual(expect.arrayContaining(Object.keys(getTranslations('en-GB'))));
});

test('leaves the email texts out', () => {
  expect(Object.keys(getTranslations()).filter(alias => alias.startsWith('email.'))).toEqual([]);
});
