import { test, expect } from 'vitest';
import storage from './index';

test('rejects unknown types and unsafe ids', async () => {
  await expect(storage.read('abc', 'other')).rejects.toThrow(/invalid storage key/);
  await expect(storage.read('../secret', 'post')).rejects.toThrow(/invalid storage key/);
  await expect(storage.write('a/b', 'post', 'x')).rejects.toThrow(/invalid storage key/);
});

test('has is false for invalid keys and missing files', async () => {
  expect(await storage.has('../secret', 'post')).toBe(false);
  expect(await storage.has('does-not-exist-test', 'post')).toBe(false);
});

test('reading a missing file throws', async () => {
  await expect(storage.read('does-not-exist-test', 'post')).rejects.toThrow(/file not exists/);
});
