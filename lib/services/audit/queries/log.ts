import { AuditLogSchema } from '../../../data-schemas';
import createDatabase from '../../../utils/createDatabase';

/** Appends to the audit log. Only ids and the action are kept, never personal data. */
async function log(id: string, userId: string, action: string, targetId?: string, requestId?: string, now = Date.now()) {
  const knex = await createDatabase();

  await knex('audit_log').insert(AuditLogSchema.parse({
    id, user_id: userId, action, target_id: targetId ?? null, request_id: requestId ?? null, created_at: now,
  }));
}
export default log;
