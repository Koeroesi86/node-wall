import { AccountConfirmationsSchema } from '../../../data-schemas';
import createDatabase from '../../../utils/createDatabase';
import { parseRow } from '../../../utils/validateRows';

async function getConfirmation(userId: string) {
  const knex = await createDatabase();

  return parseRow(AccountConfirmationsSchema, await knex('account_confirmations').where({ user_id: userId }).first());
}
export default getConfirmation;
