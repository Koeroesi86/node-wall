import createDatabase from '../../../utils/createDatabase';

async function removeConfirmation(userId: string) {
  const knex = await createDatabase();

  await knex('account_confirmations').where({ user_id: userId }).delete();
}
export default removeConfirmation;
