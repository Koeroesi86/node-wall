import { PostsSchema } from '../../../data-schemas';
import { TimestampSchema } from '../../../utils/validateRows';
import createDatabase from '../../../utils/createDatabase';

const schema = PostsSchema.pick({ id: true, type: true, status: true, owner: true }).extend({ created_at: TimestampSchema });

async function create(id: string, owner: string | null, status = 'pending', type = 'post') {
  const knex = await createDatabase();

  await knex.insert(schema.parse({
    id,
    type,
    status,
    owner,
    created_at: Date.now(),
  })).into('posts');
}

export default create;
