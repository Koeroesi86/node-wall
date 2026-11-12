import createDatabase from '../../../utils/createDatabase';

async function createComment(id: string, postId: string, parent: string | undefined, owner: string | null) {
  const knex = await createDatabase();

  await knex.insert({
    id: id,
    post: postId,
    parent: parent,
    owner: owner,
    status: 'public', // TODO: approval?
  }).into('posts_comments');
}

export default createComment;
