import hasContent from './queries/hasContent';
import readContent from './queries/readContent';
import writeContent from './queries/writeContent';

export const types = ['comment', 'link', 'post'];
const idPattern = /^[\w-]+$/;

const isValid = (id: string, type: string) => types.includes(type) && idPattern.test(id);

const assertValid = (id: string, type: string) => {
  if (!isValid(id, type)) {
    throw new Error('invalid storage key');
  }
};

/** Post, comment and link content, stored in the sqlite `contents` table. */
export default {
  has: async (id: string, type: string) => isValid(id, type) && hasContent(id, type),
  read: async (id: string, type: string) => {
    assertValid(id, type);
    const body = await readContent(id, type);

    if (body === undefined) {
      throw new Error('file not exists');
    }

    return body;
  },
  write: async (id: string, type: string, data = '') => {
    assertValid(id, type);
    await writeContent(id, type, data);
  },
};
