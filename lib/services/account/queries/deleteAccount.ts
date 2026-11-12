import createDatabase from '../../../utils/createDatabase';

/**
 * Erases the user, their logins, sessions, tag preferences and pending confirmation. Posts and comments they
 * wrote are kept (guests can write too) but detached from the user by clearing `owner`.
 */
async function deleteAccount(userId: string) {
  const knex = await createDatabase();

  await knex.transaction(async trx => {
    const loginIds = trx('users_login').select('id').where({ user_id: userId });

    await trx('users_session').whereIn('users_login_id', loginIds).delete();
    await trx('users_login').where({ user_id: userId }).delete();
    await trx('users_tags').where({ user_id: userId }).delete();
    await trx('account_confirmations').where({ user_id: userId }).delete();
    await trx('posts').where({ owner: userId }).update({ owner: null });
    await trx('posts_comments').where({ owner: userId }).update({ owner: null });
    await trx('users').where({ id: userId }).delete();
  });
}
export default deleteAccount;
