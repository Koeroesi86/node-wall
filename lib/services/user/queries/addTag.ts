import { UsersTagsSchema } from '../../../data-schemas';
import createDatabase from '../../../utils/createDatabase';
import { parseRow } from '../../../utils/validateRows';

const schema = UsersTagsSchema.pick({ tag_id: true, type: true });
const writeSchema = UsersTagsSchema.pick({ tag_id: true, user_id: true, type: true });

async function addTag(tagId: string, userId: string, type: string) {
  const knex = await createDatabase();

  const condition = {
    tag_id: tagId,
    user_id: userId,
  };

  const existing = parseRow(schema, await knex('users_tags')
    .select('tag_id', 'type')
    .where(condition)
    .first());

  if (existing) {
    await knex('users_tags')
      .update(writeSchema.pick({ type: true }).parse({ type }))
      .where(condition);
  } else {
    await knex('users_tags').insert(writeSchema.parse({ ...condition, type }));
  }
}

export default addTag;
