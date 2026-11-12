import { AccountConfirmationsSchema } from '../../../data-schemas';
import createDatabase from '../../../utils/createDatabase';

/** Stores the (hashed) code for a user, replacing any earlier one and resetting its attempts. */
async function saveConfirmation(userId: string, secret: string, now = Date.now()) {
  const knex = await createDatabase();

  await knex('account_confirmations')
    .insert(AccountConfirmationsSchema.parse({ user_id: userId, secret, attempts: 0, created_at: now }))
    .onConflict('user_id')
    .merge();
}
export default saveConfirmation;
