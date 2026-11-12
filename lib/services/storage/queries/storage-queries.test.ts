import { beforeEach, expect, test, vi } from 'vitest';
import { fakeDb } from '../../../test-utils/fakeDb';
import hasContent from './hasContent';
import readContent from './readContent';
import writeContent from './writeContent';

vi.mock('../../../utils/createDatabase', async () => ({
  default: async () => (await import('../../../test-utils/fakeDb')).fakeDb.knex,
}));

beforeEach(() => fakeDb.reset());

test('hasContent checks for a row', async () => {
  fakeDb.resolves({ id: 'a' });

  expect(await hasContent('a', 'post')).toBe(true);
  expect(fakeDb.calls).toEqual([['knex', 'contents'], ['where', { type: 'post', id: 'a' }], ['first', 'id']]);

  fakeDb.resolves(undefined);
  expect(await hasContent('b', 'post')).toBe(false);
});

test('readContent returns the body or undefined', async () => {
  fakeDb.resolves({ body: 'x' });
  expect(await readContent('a', 'post')).toBe('x');
  expect(fakeDb.calls).toEqual([['knex', 'contents'], ['where', { type: 'post', id: 'a' }], ['first', 'body']]);

  fakeDb.resolves(undefined);
  expect(await readContent('b', 'post')).toBeUndefined();
});

test('writeContent upserts', async () => {
  await writeContent('a', 'post', 'x');

  expect(fakeDb.calls).toEqual([
    ['knex', 'contents'],
    ['insert', { type: 'post', id: 'a', body: 'x' }],
    ['onConflict', ['type', 'id']],
    ['merge'],
  ]);
});
