import type { Tags } from '../../../data-schemas';
import createDatabase from '../../../utils/createDatabase';

async function getById(id: string) {
  const knex = await createDatabase();

  return knex('tags').select<Pick<Tags, 'id' | 'name' | 'type'>[]>('id', 'name', 'type').where('id', id).first();
}

export default getById;
