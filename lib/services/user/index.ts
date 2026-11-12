import { v4 as uuid } from 'uuid';
import create from './queries/create';
import getById from './queries/getById';
import addLogin from './queries/addLogin';
import getLogin from './queries/getLogin';
import setName from './queries/setName';
import getTags from './queries/getTags';
import addTag from './queries/addTag';
import removeTag from './queries/removeTag';

export default {
  get: async (id: string) => getById(id),
  create: async (name?: string) => {
    const id = uuid();
    const role = 'admin'; //should be 'user'

    await create(id, name || null, role);

    return { id, name, role };
  },
  addLogin: async (userId: string, value: string, type = 'email') => {
    const id = uuid();

    await addLogin(id, userId, value, type);

    return { id, userId, value, type };
  },
  getLogin: async (type: string, value: string) => getLogin(type, value),
  setName: async (id: string, name: string) => setName(id, name),
  getTags: async (id: string) => getTags(id),
  addTag: async (tagId: string, userId: string, type: string) => addTag(tagId, userId, type),
  removeTag: async (tagId: string, userId: string) => removeTag(tagId, userId),
};
