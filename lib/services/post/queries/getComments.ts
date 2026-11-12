import createDatabase from '../../../utils/createDatabase';

async function getComments(postId: string, status = 'public') {
  const knex = await createDatabase();

  return knex('posts_comments')
    .where({
      post: postId,
      status: status,
    })
    .select('id', 'parent', 'owner', 'created_at');
}

export default getComments;
