import createDatabase from '../../../utils/createDatabase';
import { LOGIN_CODE_TTL_MS } from '../../../utils/loginCode';

async function removeExpiredConfirmations(now = Date.now()) {
  const knex = await createDatabase();

  await knex('account_confirmations').where('created_at', '<', now - LOGIN_CODE_TTL_MS).delete();
}
export default removeExpiredConfirmations;
