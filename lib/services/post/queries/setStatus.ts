import { PostsSchema } from '../../../data-schemas';
import createDatabase from '../../../utils/createDatabase';

const schema = PostsSchema.pick({ status: true });

async function setStatus(id: string, status: string) {
  const knex = await createDatabase();

  await knex('posts').where({ id }).update(schema.parse({ status }));
}

export default setStatus;
