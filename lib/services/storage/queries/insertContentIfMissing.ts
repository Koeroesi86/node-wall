import createDatabase from '../../../utils/createDatabase';

/** Inserts the body unless a row exists, so a backfill never overwrites newer database content. */
async function insertContentIfMissing(id: string, type: string, body: string): Promise<void> {
  const knex = await createDatabase();

  await knex('contents').insert({ type, id, body }).onConflict(['type', 'id']).ignore();
}
export default insertContentIfMissing;
