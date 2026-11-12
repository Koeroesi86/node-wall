import type { Tags } from '../../../data-schemas';
import createDatabase from '../../../utils/createDatabase';

export default async function(name: string) {
  const knex = await createDatabase();

  return knex('tags').select<Pick<Tags, 'id' | 'type'>[]>('id', 'type').where('name', name).first();
};
