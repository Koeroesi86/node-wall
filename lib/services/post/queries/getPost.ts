import createDatabase from '../../../utils/createDatabase';

async function getPost(postId: string) {
  const knex = await createDatabase();

  return knex('posts')
    .select('id', 'owner', 'created_at', 'status', 'type')
    .where('id', postId)
    .first();
}

export default getPost;
