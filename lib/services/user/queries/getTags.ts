import { UsersTagsSchema } from '../../../data-schemas';
import createDatabase from '../../../utils/createDatabase';
import { parseRows } from '../../../utils/validateRows';

const schema = UsersTagsSchema.pick({ tag_id: true, type: true });

async function getTags(id: string) {
  const knex = await createDatabase();

  const rows = await knex('users_tags')
    .select('tag_id', 'type')
    .where({ user_id: id });

  return parseRows(schema, rows);
}
export default getTags;
