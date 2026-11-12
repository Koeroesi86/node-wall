import { PostsCommentsSchema } from '../../../data-schemas';
import createDatabase from '../../../utils/createDatabase';
import { parseRow, TimestampSchema } from '../../../utils/validateRows';

const schema = PostsCommentsSchema.extend({ created_at: TimestampSchema });

async function getComment(id: string) {
  const knex = await createDatabase();

  const row = await knex('posts_comments')
    .where({
      id: id,
      status: 'public',
    })
    .select('*')
    .first();

  return parseRow(schema, row);
}

export default getComment;
