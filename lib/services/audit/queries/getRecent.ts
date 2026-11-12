import { AuditLogSchema } from '../../../data-schemas';
import createDatabase from '../../../utils/createDatabase';
import { parseRows } from '../../../utils/validateRows';

const schema = AuditLogSchema.pick({ id: true, user_id: true, action: true, target_id: true, request_id: true, created_at: true });

async function getRecent(limit: number) {
  const knex = await createDatabase();

  const rows = await knex('audit_log')
    .select('id', 'user_id', 'action', 'target_id', 'request_id', 'created_at')
    .orderBy('created_at', 'desc')
    .limit(limit);

  return parseRows(schema, rows);
}
export default getRecent;
