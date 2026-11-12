import createDatabase from '../../../utils/createDatabase';

async function addTag(postId: string, tagId: string) {
  const knex = await createDatabase();

  await knex.insert({
    post_id: postId,
    tag_id: tagId,
  }).into('posts_tags');
}

export default addTag;
