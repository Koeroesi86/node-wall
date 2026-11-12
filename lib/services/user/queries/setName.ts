import { UsersSchema } from '../../../data-schemas';
import createDatabase from '../../../utils/createDatabase';

const schema = UsersSchema.pick({ name: true });

async function setName(id: string, name: string) {
  const knex = await createDatabase();

  await knex('users')
    .update(schema.parse({ name }))
    .where({ id });
}

export default setName;
