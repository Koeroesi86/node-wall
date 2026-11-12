import createDatabase from '../../../utils/createDatabase';

async function readContent(id: string, type: string): Promise<string | undefined> {
  const knex = await createDatabase();
  const row = await knex('contents').where({ type, id }).first('body');

  return row?.body;
}
export default readContent;
