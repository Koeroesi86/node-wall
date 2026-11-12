import { ContentsSchema } from '../../../data-schemas';
import createDatabase from '../../../utils/createDatabase';
import { parseRow } from '../../../utils/validateRows';

const schema = ContentsSchema.pick({ body: true });

async function readContent(id: string, type: string): Promise<string | undefined> {
  const knex = await createDatabase();
  const row = await knex('contents').where({ type, id }).first('body');

  return parseRow(schema, row)?.body;
}
export default readContent;
