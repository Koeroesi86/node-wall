import type { Posts } from '../../../data-schemas';
import createDatabase from '../../../utils/createDatabase';

async function getPost(postId: string) {
  const knex = await createDatabase();

  return knex('posts')
    .select<Pick<Posts, 'id' | 'owner' | 'created_at' | 'status' | 'type'>[]>('id', 'owner', 'created_at', 'status', 'type')
    .where('id', postId)
    .first();
}

export default getPost;
