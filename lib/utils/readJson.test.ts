import { test, expect } from 'vitest';
import { Readable } from 'node:stream';
import { z } from 'zod';
import readJson from './readJson';

const schema = z.object({ a: z.number() });

test('parses a JSON body', async () => {
  expect(await readJson(Readable.from(['{"a":', '1}']), schema)).toEqual({ a: 1 });
});

test('rejects invalid JSON', async () => {
  await expect(readJson(Readable.from(['not json']), schema)).rejects.toThrow(SyntaxError);
});

test('rejects a body that does not match the schema', async () => {
  await expect(readJson(Readable.from(['{"a":"1"}']), schema)).rejects.toThrow(z.ZodError);
});

test('applies the transforms of the schema', async () => {
  expect(await readJson(Readable.from(['{"a":" x "}']), z.object({ a: z.string().trim() }))).toEqual({ a: 'x' });
});
