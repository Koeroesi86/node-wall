import type { Knex } from 'knex';
import { PostsSchema } from '../../../data-schemas';
import createDatabase from '../../../utils/createDatabase';
import { parseRows, TimestampSchema } from '../../../utils/validateRows';

export const POSTS_PAGE_SIZE = 50;

const schema = PostsSchema.pick({ id: true, owner: true, type: true }).extend({ created_at: TimestampSchema });

async function getList(status: string, before: string | undefined, since: string | undefined, likedTags: string[], dislikedTags: string[]) {
  const knex = await createDatabase();

  const postsPromise = knex('posts')
    .select('id', 'owner', 'type', 'created_at')
    .orderBy('created_at', 'desc')
    .groupBy('posts.id')
    .where('status', status)
    .limit(POSTS_PAGE_SIZE);

    if (before) {
      postsPromise.where('created_at', '<', before);
    }

    if (since) {
      postsPromise.where('created_at', '>=', since);
    }

    if (likedTags && likedTags.length > 0) {
      postsPromise.havingExists(function (this: Knex.QueryBuilder) {
        this.select('*').from('posts_tags')
          .whereRaw('posts.id = posts_tags.post_id')
          .whereIn('tag_id', likedTags);
      });
    }

    if (dislikedTags && dislikedTags.length > 0) {
      postsPromise.havingNotExists(function (this: Knex.QueryBuilder) {
        this.select('*').from('posts_tags')
          .whereRaw('posts.id = posts_tags.post_id')
          .whereIn('tag_id', dislikedTags);
      });
    }

  return parseRows(schema, await postsPromise);
}

export default getList;
