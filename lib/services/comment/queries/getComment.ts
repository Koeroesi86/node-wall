import type { PostsComments } from '../../../data-schemas';
import createDatabase from '../../../utils/createDatabase';

async function getComment(id: string) {
  const knex = await createDatabase();

  return knex('posts_comments')
    .where({
      id: id,
      status: 'public',
    })
    .select<Pick<PostsComments, 'id' | 'post' | 'parent' | 'owner' | 'status' | 'created_at'>[]>('*')
    .first();
}

export default getComment;
