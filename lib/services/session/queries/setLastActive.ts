import createDatabase from '../../../utils/createDatabase';

export default async function(sessionId: string, lastActive = Date.now()) {
  const knex = await createDatabase();

  await knex('users_session')
    .where({ id: sessionId })
    .update({ last_active: Date.now() })
};
