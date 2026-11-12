import { UsersSessionSchema } from '../../../data-schemas';
import createDatabase from '../../../utils/createDatabase';

const schema = UsersSessionSchema.pick({ status: true, secret: true });

async function remove(id: string) {
  const knex = await createDatabase();

  await knex('users_session')
    .where({ id })
    .update(schema.parse({ status: 'deleted', secret: '' }));
}
export default remove;
