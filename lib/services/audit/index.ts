import { randomUUID as uuid } from 'crypto';
import getRecent from './queries/getRecent';
import log from './queries/log';
import removeExpired from './queries/removeExpired';
import { AUDIT_RETENTION_MS } from '../../utils/sessionLifetime';

/** Accountability trail for admin and account actions. */
export default {
  record: async (userId: string, action: string, targetId?: string, requestId?: string) => (
    log(uuid(), userId, action, targetId, requestId)
  ),
  getRecent: async (limit = 50) => getRecent(limit),
  cleanup: async (now = Date.now()) => removeExpired(now - AUDIT_RETENTION_MS),
};
