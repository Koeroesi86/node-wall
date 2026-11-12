import createDatabase from '../../../utils/createDatabase';

async function removeTag(postId: string, tagId: string) {
  const knex = await createDatabase();

  await knex('posts_tags').where({ post_id: postId, tag_id: tagId }).delete();
}

export default removeTag;
