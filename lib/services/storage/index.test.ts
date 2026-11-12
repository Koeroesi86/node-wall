import { beforeEach, expect, test, vi } from 'vitest';
import storage from './index';
import hasContent from './queries/hasContent';
import readContent from './queries/readContent';
import writeContent from './queries/writeContent';

vi.mock('./queries/hasContent', () => ({ default: vi.fn() }));
vi.mock('./queries/readContent', () => ({ default: vi.fn() }));
vi.mock('./queries/writeContent', () => ({ default: vi.fn() }));

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(hasContent).mockResolvedValue(false);
});

test('rejects unknown types and unsafe ids', async () => {
  await expect(storage.read('abc', 'other')).rejects.toThrow(/invalid storage key/);
  await expect(storage.read('../secret', 'post')).rejects.toThrow(/invalid storage key/);
  await expect(storage.write('a/b', 'post', 'x')).rejects.toThrow(/invalid storage key/);
  expect(readContent).not.toHaveBeenCalled();
  expect(writeContent).not.toHaveBeenCalled();
});

test('has is false for invalid keys and missing records', async () => {
  expect(await storage.has('../secret', 'post')).toBe(false);
  expect(await storage.has('missing', 'post')).toBe(false);
  expect(hasContent).toHaveBeenCalledTimes(1);
});

test('has is true when the database has the record', async () => {
  vi.mocked(hasContent).mockResolvedValue(true);

  expect(await storage.has('a', 'post')).toBe(true);
});

test('read returns the stored body', async () => {
  vi.mocked(readContent).mockResolvedValue('from db');

  expect(await storage.read('a', 'post')).toBe('from db');
});

test('reading a missing record throws', async () => {
  await expect(storage.read('missing', 'post')).rejects.toThrow(/file not exists/);
});

test('write stores the body in the database', async () => {
  await storage.write('a', 'post', 'body');

  expect(writeContent).toHaveBeenCalledWith('a', 'post', 'body');
});
