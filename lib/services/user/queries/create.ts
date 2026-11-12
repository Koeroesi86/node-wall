import { UsersSchema } from '../../../data-schemas';
import createDatabase from '../../../utils/createDatabase';

const schema = UsersSchema.pick({ id: true, name: true, role: true });

async function create(id: string, name: string | null, role = 'user') {
  const knex = await createDatabase();

  const user = schema.parse({ id, name, role });

  await knex.insert(user).into('users');
}

export default create;
