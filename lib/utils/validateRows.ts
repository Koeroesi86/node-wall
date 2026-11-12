import { z } from 'zod';

/** SQLite has no date type: column defaults (CURRENT_TIMESTAMP) are stored as text, while the app writes epoch milliseconds. */
export const TimestampSchema = z.union([z.string(), z.number()]).nullable();

export const parseRow = <Schema extends z.ZodType>(schema: Schema, row: unknown): z.output<Schema> | undefined => (
  row === undefined ? undefined : schema.parse(row)
);

export const parseRows = <Schema extends z.ZodType>(schema: Schema, rows: unknown): z.output<Schema>[] => schema.array().parse(rows);
