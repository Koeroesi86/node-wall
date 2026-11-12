import createDatabase from '../../../utils/createDatabase';

async function hasContent(id: string, type: string): Promise<boolean> {
  const knex = await createDatabase();
  const row = await knex('contents').where({ type, id }).first('id');

  return row !== undefined;
}
export default hasContent;
