export const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
export const SESSION_IDLE_TIMEOUT_MS = 7 * 24 * 60 * 60 * 1000;
export const PENDING_RETENTION_MS = 24 * 60 * 60 * 1000;
export const DETAILS_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
export const DELETED_RETENTION_MS = 90 * 24 * 60 * 60 * 1000;

/** Formats epoch millis like sqlite's `CURRENT_TIMESTAMP` (UTC `YYYY-MM-DD HH:MM:SS`). */
export const toSqliteTimestamp = (millis: number) => new Date(millis).toISOString().slice(0, 19).replace('T', ' ');

const toMillis = (value: string | number | Date | null | undefined) => {
  if (typeof value === 'string' && !/[zZ]|[+-]\d{2}:?\d{2}$/.test(value)) return Date.parse(`${value.replace(' ', 'T')}Z`);
  return new Date(value ?? NaN).getTime();
};

/** A session is expired past its absolute lifetime or after sitting idle; unreadable timestamps count as expired. */
export const isSessionExpired = (
  session: { created_at: string | number | Date | null | undefined; last_active?: number | string | null },
  now = Date.now(),
) => {
  const created = toMillis(session.created_at);
  const lastActive = session.last_active ? toMillis(session.last_active) : created;
  return Number.isNaN(created) || Number.isNaN(lastActive)
    || now - created > SESSION_MAX_AGE_MS
    || now - lastActive > SESSION_IDLE_TIMEOUT_MS;
};
export const AUDIT_RETENTION_MS = 365 * 24 * 60 * 60 * 1000;
