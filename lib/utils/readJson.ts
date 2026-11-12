import type { Readable } from 'stream';
import { text } from 'stream/consumers';

/**
 * Reads a request body as JSON. The shape is not validated, so callers must check the fields they use.
 */
async function readJson<T>(stream: Readable): Promise<Partial<T>> {
  return JSON.parse(await text(stream));
}

export default readJson;
