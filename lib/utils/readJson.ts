import type { Readable } from 'stream';
import { text } from 'stream/consumers';
import type { z } from 'zod';

/**
 * Reads a request body as JSON and validates it with the schema; rejects when the body is not valid JSON or does not match.
 */
async function readJson<Schema extends z.ZodType>(stream: Readable, schema: Schema): Promise<z.output<Schema>> {
  return schema.parse(JSON.parse(await text(stream)));
}

export default readJson;
