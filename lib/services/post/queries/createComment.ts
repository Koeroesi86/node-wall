import { PostsCommentsSchema } from '../../../data-schemas';
import createDatabase from '../../../utils/createDatabase';

const schema = PostsCommentsSchema.pick({ id: true, post: true, parent: true, owner: true, status: true });

async function createComment(id: string, postId: string, parent: string | undefined, owner: string | null) {
  const knex = await createDatabase();

  await knex.insert(schema.parse({
    id: id,
    post: postId,
    parent: parent ?? null,
    owner: owner,
    status: 'public', // TODO: approval?
  })).into('posts_comments');
}

export default createComment;
