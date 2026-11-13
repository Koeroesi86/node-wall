import { expect, test } from 'vitest';
import parseTagIds, { MAX_TAG_FILTER_IDS } from './parseTagIds';

const id = (n: number) => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`;

test('returns an empty list without a value', () => {
  expect(parseTagIds(undefined)).toEqual([]);
  expect(parseTagIds('')).toEqual([]);
});

test('drops entries that are not UUIDs', () => {
  expect(parseTagIds(`${id(1)},nope,${id(2)}`)).toEqual([id(1), id(2)]);
});

test('caps the number of ids', () => {
  const many = Array.from({ length: MAX_TAG_FILTER_IDS + 10 }, (_, n) => id(n)).join(',');
  expect(parseTagIds(many)).toHaveLength(MAX_TAG_FILTER_IDS);
});
