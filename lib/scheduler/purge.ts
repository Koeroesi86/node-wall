import accountService from '../services/account';
import auditService from '../services/audit';
import rateLimitService from '../services/rate-limit';
import sessionService from '../services/session';

const tasks = [
  { name: 'rate limits', run: () => rateLimitService.removeExpired() },
  { name: 'sessions', run: () => sessionService.cleanup() },
  { name: 'audit log', run: () => auditService.cleanup() },
  { name: 'account confirmations', run: () => accountService.cleanup() },
];

/** Runs every retention purge; a failing task is logged and does not stop the others. */
export async function purgeExpiredData() {
  await Promise.all(tasks.map(async ({ name, run }) => {
    try {
      await run();
    } catch (error) {
      console.error(`purge failed for ${name}`, error instanceof Error ? error.message : error);
    }
  }));
}
