import { UsersSchema } from '../../../data-schemas';
import createDatabase from '../../../utils/createDatabase';

const schema = UsersSchema.pick({ role: true });

async function setRole(id: string, role: string) {
  const knex = await createDatabase();

  await knex('users')
    .update(schema.parse({ role }))
    .where({ id });
}

export default setRole;
