import type { Links } from '../../../data-schemas';
import createDatabase from '../../../utils/createDatabase';

export default async function(url: string) {
  const knex = await createDatabase();

  return knex('links').select<Pick<Links, 'id' | 'created_at'>[]>('id', 'created_at').where('url', url).first();
};
