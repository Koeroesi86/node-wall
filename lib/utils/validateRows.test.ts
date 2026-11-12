import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { parseRow, parseRows, TimestampSchema } from './validateRows';

const schema = z.object({ id: z.string() });

describe('parseRow', () => {
  it('passes through a missing row', () => {
    expect(parseRow(schema, undefined)).toBeUndefined();
  });

  it('returns a valid row', () => {
    expect(parseRow(schema, { id: 'a' })).toEqual({ id: 'a' });
  });

  it('throws on an invalid row', () => {
    expect(() => parseRow(schema, { id: 1 })).toThrow();
  });
});

describe('parseRows', () => {
  it('validates every row', () => {
    expect(parseRows(schema, [{ id: 'a' }])).toEqual([{ id: 'a' }]);
    expect(() => parseRows(schema, [{ id: 'a' }, {}])).toThrow();
  });
});

describe('TimestampSchema', () => {
  it.each(['2026-01-01 10:00:00', 1700000000000, null])('accepts %s', (value) => {
    expect(TimestampSchema.parse(value)).toBe(value);
  });
});
