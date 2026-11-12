import type { Users } from '../../../data-schemas';
import createDatabase from '../../../utils/createDatabase';

async function getList() {
  const knex = await createDatabase();

  return knex('users')
    .select<Pick<Users, 'id' | 'name' | 'role' | 'created_at'>[]>('id', 'name', 'role', 'created_at')
    .orderBy('created_at', 'desc');
}

export default getList;
