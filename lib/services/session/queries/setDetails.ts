import createDatabase from '../../../utils/createDatabase';

/** Stores the device details once; a session that already has a user agent keeps it. */
async function setDetails(sessionId: string, userAgent: string | undefined, remoteAddress: string | undefined) {
  const knex = await createDatabase();

  await knex('users_session')
    .where({ id: sessionId })
    .whereNull('user_agent')
    .update({ user_agent: userAgent ?? null, remote_address: remoteAddress ?? null });
}
export default setDetails;
