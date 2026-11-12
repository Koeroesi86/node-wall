import type { UsersTags } from '../../../data-schemas';
import createDatabase from '../../../utils/createDatabase';

async function addTag(tagId: string, userId: string, type: string) {
  const knex = await createDatabase();

  const condition = {
    tag_id: tagId,
    user_id: userId,
  };

  const existing = await knex('users_tags')
    .select<Pick<UsersTags, 'tag_id' | 'type'>[]>('tag_id', 'type')
    .where(condition)
    .first();

  if (existing) {
    await knex('users_tags')
      .update({ type })
      .where(condition);
  } else {
    await knex('users_tags').insert({ ...condition, type });
  }
}

export default addTag;
