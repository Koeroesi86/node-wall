import fs from 'fs';
import path from 'path';
import hasContent from './queries/hasContent';
import readContent from './queries/readContent';
import writeContent from './queries/writeContent';
import insertContentIfMissing from './queries/insertContentIfMissing';

export const dataDirectory = path.resolve(__dirname, '../../data');
export const types = ['comment', 'link', 'post'];
const idPattern = /^[\w-]+$/;

const isValid = (id: string, type: string) => types.includes(type) && idPattern.test(id);

const getFileName = (id: string, type: string) => {
  if (!isValid(id, type)) {
    throw new Error('invalid storage key');
  }

  return path.resolve(dataDirectory, type, id);
};

/**
 * Content lives in sqlite. During the migration phase writes go to the database and the legacy file,
 * and reads fall back to the file for records the backfill has not copied yet.
 */
export default {
  has: async (id: string, type: string) => isValid(id, type)
    && (await hasContent(id, type) || fs.existsSync(getFileName(id, type))),
  read: async (id: string, type: string) => {
    const fileName = getFileName(id, type);
    const body = await readContent(id, type);

    if (body !== undefined) {
      return body;
    }
    if (!fs.existsSync(fileName)) {
      throw new Error('file not exists');
    }

    return fs.promises.readFile(fileName, 'utf8');
  },
  write: async (id: string, type: string, data = '', encoding: BufferEncoding = 'utf8') => {
    const fileName = getFileName(id, type);

    await writeContent(id, type, data);
    await fs.promises.writeFile(fileName, data, encoding);
  },
  /** Copies a legacy file into the database without overwriting an existing row. */
  backfill: async (id: string, type: string) => {
    const body = await fs.promises.readFile(getFileName(id, type), 'utf8');

    await insertContentIfMissing(id, type, body);
  },
};
