import { test, expect } from 'vitest';
import { Readable } from 'node:stream';
import readJson from './readJson';

test('parses a JSON body', async () => {
  expect(await readJson(Readable.from(['{"a":', '1}']))).toEqual({ a: 1 });
});

test('rejects invalid JSON', async () => {
  await expect(readJson(Readable.from(['not json']))).rejects.toThrow(SyntaxError);
});
