import createDatabase from '../../../utils/createDatabase';

async function getBounds() {
  const knex = await createDatabase();

  return knex('posts')
    .where('status', 'public')
    .min('created_at as oldest')
    .max('created_at as newest')
    .first();
}

export default getBounds;
