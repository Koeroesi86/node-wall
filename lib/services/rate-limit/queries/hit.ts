import createDatabase from '../../../utils/createDatabase';

/** Counts one hit for `key` in a fixed window stored in sqlite and returns the hits in the current window. */
async function hit(key: string, windowMs: number, now = Date.now()): Promise<number> {
  const knex = await createDatabase();

  await knex.raw(
    `INSERT INTO rate_limits (key, count, reset_at) VALUES (?, 1, ?)
     ON CONFLICT(key) DO UPDATE SET
       count = CASE WHEN rate_limits.reset_at <= ? THEN 1 ELSE rate_limits.count + 1 END,
       reset_at = CASE WHEN rate_limits.reset_at <= ? THEN ? ELSE rate_limits.reset_at END`,
    [key, now + windowMs, now, now, now + windowMs],
  );
  const row = await knex('rate_limits').where({ key }).first('count');

  return row.count;
}
export default hit;
