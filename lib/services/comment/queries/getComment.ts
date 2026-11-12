import createDatabase from '../../../utils/createDatabase';

async function getComment(id: string) {
  const knex = await createDatabase();

  return knex('posts_comments')
    .where({
      id: id,
      status: 'public',
    })
    .select('*')
    .first();
}

export default getComment;
