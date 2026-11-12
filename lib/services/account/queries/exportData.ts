import createDatabase from '../../../utils/createDatabase';

/** Everything held about a user. Session ids and secrets are left out, as they grant access. */
async function exportData(userId: string) {
  const knex = await createDatabase();
  const loginIds = knex('users_login').select('id').where({ user_id: userId });

  const [profile, logins, sessions, tags, posts, comments] = await Promise.all([
    knex('users').select('id', 'name', 'role', 'created_at').where({ id: userId }).first(),
    knex('users_login').select('type', 'value').where({ user_id: userId }),
    knex('users_session')
      .select('status', 'created_at', 'last_active', 'user_agent', 'remote_address')
      .whereIn('users_login_id', loginIds),
    knex('users_tags').select('tag_id', 'type').where({ user_id: userId }),
    knex('posts')
      .leftJoin('contents', function () {
        this.on('contents.id', 'posts.id').andOn('contents.type', knex.raw('?', ['post']));
      })
      .select('posts.id', 'posts.status', 'posts.created_at', 'contents.body as content')
      .where('posts.owner', userId),
    knex('posts_comments')
      .leftJoin('contents', function () {
        this.on('contents.id', 'posts_comments.id').andOn('contents.type', knex.raw('?', ['comment']));
      })
      .select('posts_comments.id', 'posts_comments.post', 'posts_comments.parent', 'posts_comments.status', 'posts_comments.created_at', 'contents.body as content')
      .where('posts_comments.owner', userId),
  ]);

  return { profile, logins, sessions, tags, posts, comments };
}
export default exportData;
