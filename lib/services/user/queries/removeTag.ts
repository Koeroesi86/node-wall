import createDatabase from '../../../utils/createDatabase';

async function removeTag(tagId: string, userId: string) {
  const knex = await createDatabase();

  await knex('users_tags')
    .delete()
    .where({
      tag_id: tagId,
      user_id: userId,
    });
}

export default removeTag;
