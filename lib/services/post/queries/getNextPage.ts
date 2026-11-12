import type { Knex } from 'knex';
import createDatabase from '../../../utils/createDatabase';

async function getNextPage(status: string, before: string | undefined, since: string | undefined, likedTags: string[], dislikedTags: string[]) {
  const knex = await createDatabase();

  const nextPageBeforePromise = knex('posts').max('created_at', { as: 'nextPageBefore' }).groupBy('posts.id');
  nextPageBeforePromise.where('status', status);

  if (since) {
    nextPageBeforePromise.where('created_at', '<', since);
  }

  if (likedTags.length > 0) {
    nextPageBeforePromise.havingExists(function (this: Knex.QueryBuilder) {
      this.select('*').from('posts_tags')
        .whereRaw('posts.id = posts_tags.post_id')
        .whereIn('tag_id', likedTags);
    });
  }

  if (dislikedTags.length > 0) {
    nextPageBeforePromise.havingNotExists(function (this: Knex.QueryBuilder) {
      this.select('*').from('posts_tags')
        .whereRaw('posts.id = posts_tags.post_id')
        .whereIn('tag_id', dislikedTags);
    });
  }

  return nextPageBeforePromise.first();
}

export default getNextPage;
