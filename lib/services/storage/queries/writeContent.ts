import { ContentsSchema } from '../../../data-schemas';
import createDatabase from '../../../utils/createDatabase';



async function writeContent(id: string, type: string, body: string): Promise<void> {
  const knex = await createDatabase();

  await knex('contents').insert(ContentsSchema.parse({ type, id, body })).onConflict(['type', 'id']).merge();
}
export default writeContent;
