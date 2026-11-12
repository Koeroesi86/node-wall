import type { PostsComments } from '../../../data-schemas';
import createDatabase from '../../../utils/createDatabase';

async function getComments(postId: string, status = 'public') {
  const knex = await createDatabase();

  return knex('posts_comments')
    .where({
      post: postId,
      status: status,
    })
    .select<Pick<PostsComments, 'id' | 'parent' | 'owner' | 'created_at'>[]>('id', 'parent', 'owner', 'created_at');
}

export default getComments;
