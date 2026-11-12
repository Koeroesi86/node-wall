import { TagsSchema } from '../../../data-schemas';
import createDatabase from '../../../utils/createDatabase';
import { parseRows } from '../../../utils/validateRows';

async function getTags(postId: string) {
  const knex = await createDatabase();

  const rows = await knex('posts_tags')
    .leftJoin('tags', 'tags.id', 'posts_tags.tag_id')
    .where('posts_tags.post_id', postId)
    .select('tags.id', 'tags.name', 'tags.type');

  return parseRows(TagsSchema, rows);
}

export default getTags;
