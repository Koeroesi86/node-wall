import { randomUUID as uuid } from 'crypto';
import create from './queries/create';
import getById from './queries/getById';
import getByName from './queries/getByName';
import getList from './queries/getList';

export default {
  create: async (name: string, type: string) => {
    const id: string = uuid();

    await create(id, name, type);

    return { id, name, type };
  },
  get: async (id: string) => getById(id),
  getByName: async (name: string) => getByName(name),
  getList: async (search = '', exact = false) => getList(search, exact),
};
