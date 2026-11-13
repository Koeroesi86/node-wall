import { PostsCommentsSchema } from '../../../data-schemas';
import createDatabase from '../../../utils/createDatabase';
import { parseRow, TimestampSchema } from '../../../utils/validateRows';

const schema = PostsCommentsSchema.pick({ id: true, post: true, parent: true }).extend({ created_at: TimestampSchema });

async function getComment(id: string) {
  const knex = await createDatabase();

  const row = await knex('posts_comments')
    .join('posts', 'posts.id', 'posts_comments.post')
    .where('posts_comments.id', id)
    .where('posts_comments.status', 'public')
    .where('posts.status', 'public')
    .select('posts_comments.id', 'posts_comments.post', 'posts_comments.parent', 'posts_comments.created_at')
    .first();

  return parseRow(schema, row);
}

export default getComment;
