import fs from 'fs';
import path from 'path';

export default {
  has: async (id: string, type: string) => {
    const fileName = path.resolve(__dirname, '../../data/', type, id);
    return fs.existsSync(fileName);
  },
  read: async (id: string, type: string) => {
    const fileName = path.resolve(__dirname, '../../data/', type, id);

    if (!fs.existsSync(fileName)) {
      throw new Error('file not exists');
    }

    return fs.promises.readFile(fileName, 'utf8');
  },
  write: async (id: string, type: string, data = '', encoding: BufferEncoding = 'utf8') => {
    const fileName = path.resolve(__dirname, '../../data/', type, id);
    await fs.promises.writeFile(fileName, data, encoding);
  }
}
