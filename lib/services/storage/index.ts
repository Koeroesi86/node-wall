import fs from 'fs';
import path from 'path';

const dataDirectory = path.resolve(__dirname, '../../data');
const types = ['comment', 'link', 'post', 'session'];
const idPattern = /^[\w-]+$/;

const isValid = (id: string, type: string) => types.includes(type) && idPattern.test(id);

const getFileName = (id: string, type: string) => {
  if (!isValid(id, type)) {
    throw new Error('invalid storage key');
  }

  return path.resolve(dataDirectory, type, id);
};

export default {
  has: async (id: string, type: string) => isValid(id, type) && fs.existsSync(getFileName(id, type)),
  read: async (id: string, type: string) => {
    const fileName = getFileName(id, type);

    if (!fs.existsSync(fileName)) {
      throw new Error('file not exists');
    }

    return fs.promises.readFile(fileName, 'utf8');
  },
  write: async (id: string, type: string, data = '', encoding: BufferEncoding = 'utf8') => {
    await fs.promises.writeFile(getFileName(id, type), data, encoding);
  }
}
