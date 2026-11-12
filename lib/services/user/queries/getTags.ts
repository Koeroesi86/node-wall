import createDatabase from '../../../utils/createDatabase';

async function getTags(id: string) {
  const knex = await createDatabase();

  return knex('users_tags')
    .select('tag_id', 'type')
    .where({ user_id: id });
}
export default getTags;
