import createDatabase from '../../../utils/createDatabase';

async function create(id: string, owner: string | null, status = 'pending', type = 'post') {
  const knex = await createDatabase();

  await knex.insert({
    id,
    type,
    status,
    owner,
    created_at: Date.now(),
  }).into('posts');
}

export default create;
