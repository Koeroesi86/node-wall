import { UsersSessionSchema } from '../../../data-schemas';
import createDatabase from '../../../utils/createDatabase';

const schema = UsersSessionSchema.pick({ last_active: true });

export default async function(sessionId: string, lastActive = Date.now()) {
  const knex = await createDatabase();

  await knex('users_session')
    .where({ id: sessionId })
    .update(schema.parse({ last_active: Date.now() }))
};
