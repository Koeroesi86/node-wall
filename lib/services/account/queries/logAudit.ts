import { AuditLogSchema } from '../../../data-schemas';
import createDatabase from '../../../utils/createDatabase';

/** Appends to the audit log. Only the action and the user id are kept, never personal data. */
async function logAudit(id: string, userId: string, action: string, now = Date.now()) {
  const knex = await createDatabase();

  await knex('audit_log').insert(AuditLogSchema.parse({ id, user_id: userId, action, created_at: now }));
}
export default logAudit;
