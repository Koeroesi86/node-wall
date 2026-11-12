import { z } from 'zod';
import createDatabase from '../../../utils/createDatabase';
import { parseRow, TimestampSchema } from '../../../utils/validateRows';

const schema = z.object({ oldest: TimestampSchema, newest: TimestampSchema });

async function getBounds() {
  const knex = await createDatabase();

  const row = await knex('posts')
    .where('status', 'public')
    .min('created_at as oldest')
    .max('created_at as newest')
    .first();

  return parseRow(schema, row);
}

export default getBounds;
