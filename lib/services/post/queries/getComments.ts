import { PostsCommentsSchema } from '../../../data-schemas';
import createDatabase from '../../../utils/createDatabase';
import { parseRows, TimestampSchema } from '../../../utils/validateRows';

const schema = PostsCommentsSchema.pick({ id: true, parent: true, owner: true }).extend({ created_at: TimestampSchema });

async function getComments(postId: string, status = 'public') {
  const knex = await createDatabase();

  const rows = await knex('posts_comments')
    .where({
      post: postId,
      status: status,
    })
    .select('id', 'parent', 'owner', 'created_at');

  return parseRows(schema, rows);
}

export default getComments;
