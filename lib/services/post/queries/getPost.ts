import { PostsSchema } from '../../../data-schemas';
import createDatabase from '../../../utils/createDatabase';
import { parseRow, TimestampSchema } from '../../../utils/validateRows';

const schema = PostsSchema.pick({ id: true, owner: true, status: true, type: true }).extend({ created_at: TimestampSchema });

async function getPost(postId: string) {
  const knex = await createDatabase();

  const row = await knex('posts')
    .select('id', 'owner', 'created_at', 'status', 'type')
    .where('id', postId)
    .first();

  return parseRow(schema, row);
}

export default getPost;
