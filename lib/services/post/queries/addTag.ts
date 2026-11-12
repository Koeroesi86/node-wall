import { PostsTagsSchema } from '../../../data-schemas';
import createDatabase from '../../../utils/createDatabase';

const schema = PostsTagsSchema.pick({ post_id: true, tag_id: true });

async function addTag(postId: string, tagId: string) {
  const knex = await createDatabase();

  await knex.insert(schema.parse({
    post_id: postId,
    tag_id: tagId,
  })).into('posts_tags');
}

export default addTag;
