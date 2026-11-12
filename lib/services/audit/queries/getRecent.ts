import { AuditLogSchema, UsersSchema } from '../../../data-schemas';
import createDatabase from '../../../utils/createDatabase';
import { parseRows } from '../../../utils/validateRows';

const schema = AuditLogSchema.pick({ id: true, user_id: true, action: true, target_id: true, request_id: true, created_at: true })
  .extend({ user_name: UsersSchema.shape.name });

/** The newest admin actions with the actor's name. Account events (`account.*`) are the users' own and are left out. */
async function getRecent(limit: number) {
  const knex = await createDatabase();

  const rows = await knex('audit_log')
    .leftJoin('users', 'users.id', 'audit_log.user_id')
    .select(
      'audit_log.id', 'audit_log.user_id', 'audit_log.action', 'audit_log.target_id', 'audit_log.request_id', 'audit_log.created_at',
      'users.name as user_name',
    )
    .whereNot('audit_log.action', 'like', 'account.%')
    .orderBy('audit_log.created_at', 'desc')
    .limit(limit);

  return parseRows(schema, rows);
}
export default getRecent;
