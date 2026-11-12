import fs from 'fs';
import { beforeEach, expect, test, vi } from 'vitest';
import storage from './index';
import hasContent from './queries/hasContent';
import readContent from './queries/readContent';
import writeContent from './queries/writeContent';
import insertContentIfMissing from './queries/insertContentIfMissing';

vi.mock('./queries/hasContent', () => ({ default: vi.fn() }));
vi.mock('./queries/readContent', () => ({ default: vi.fn() }));
vi.mock('./queries/writeContent', () => ({ default: vi.fn() }));
vi.mock('./queries/insertContentIfMissing', () => ({ default: vi.fn() }));
vi.mock('fs', () => {
  const fsMock = {
    existsSync: vi.fn(),
    promises: { readFile: vi.fn(), writeFile: vi.fn() },
  };
  return { default: fsMock, ...fsMock };
});

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(hasContent).mockResolvedValue(false);
  vi.mocked(fs.existsSync).mockReturnValue(false);
});

test('rejects unknown types and unsafe ids', async () => {
  await expect(storage.read('abc', 'other')).rejects.toThrow(/invalid storage key/);
  await expect(storage.read('../secret', 'post')).rejects.toThrow(/invalid storage key/);
  await expect(storage.write('a/b', 'post', 'x')).rejects.toThrow(/invalid storage key/);
  expect(writeContent).not.toHaveBeenCalled();
});

test('has is false for invalid keys and when neither store has the record', async () => {
  expect(await storage.has('../secret', 'post')).toBe(false);
  expect(await storage.has('missing', 'post')).toBe(false);
});

test('has is true from the database or from the legacy file', async () => {
  vi.mocked(hasContent).mockResolvedValueOnce(true);
  expect(await storage.has('a', 'post')).toBe(true);

  vi.mocked(hasContent).mockResolvedValueOnce(false);
  vi.mocked(fs.existsSync).mockReturnValueOnce(true);
  expect(await storage.has('b', 'post')).toBe(true);
});

test('read prefers the database over the file', async () => {
  vi.mocked(readContent).mockResolvedValue('from db');

  expect(await storage.read('a', 'post')).toBe('from db');
  expect(fs.promises.readFile).not.toHaveBeenCalled();
});

test('read falls back to the file when the database has no row', async () => {
  vi.mocked(fs.existsSync).mockReturnValue(true);
  vi.mocked(fs.promises.readFile).mockResolvedValue('from file');

  expect(await storage.read('a', 'post')).toBe('from file');
});

test('reading a record missing everywhere throws', async () => {
  await expect(storage.read('missing', 'post')).rejects.toThrow(/file not exists/);
});

test('write stores in the database and the file', async () => {
  await storage.write('a', 'post', 'body');

  expect(writeContent).toHaveBeenCalledWith('a', 'post', 'body');
  expect(fs.promises.writeFile).toHaveBeenCalledWith(expect.stringMatching(/post[\\/]a$/), 'body', 'utf8');
});

test('backfill copies the file without overwriting', async () => {
  vi.mocked(fs.promises.readFile).mockResolvedValue('legacy');

  await storage.backfill('a', 'session');

  expect(insertContentIfMissing).toHaveBeenCalledWith('a', 'session', 'legacy');
});
