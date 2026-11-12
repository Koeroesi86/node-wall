import storage from '../storage';
import getComment from './queries/getComment';

export default {
  get: async (id: string) => {
    const comment = await getComment(id);

    if (comment) {
      return {
        ...comment,
        body: await storage.read(id, 'comment'),
      }
    }

    throw new Error(`no comment with id ${id}`);
  },
};
