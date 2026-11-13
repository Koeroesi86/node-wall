import { expect, test, vi } from 'vitest';
import accountService from '../services/account';
import auditService from '../services/audit';
import rateLimitService from '../services/rate-limit';
import sessionService from '../services/session';
import { purgeExpiredData } from './purge';

vi.mock('../services/account', () => ({ default: { cleanup: vi.fn() } }));
vi.mock('../services/audit', () => ({ default: { cleanup: vi.fn() } }));
vi.mock('../services/rate-limit', () => ({ default: { removeExpired: vi.fn() } }));
vi.mock('../services/session', () => ({ default: { cleanup: vi.fn() } }));

test('runs every purge and keeps going when one fails', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  vi.mocked(sessionService.cleanup).mockRejectedValue(new Error('locked'));

  await purgeExpiredData();

  expect(rateLimitService.removeExpired).toHaveBeenCalled();
  expect(auditService.cleanup).toHaveBeenCalled();
  expect(accountService.cleanup).toHaveBeenCalled();
  expect(console.error).toHaveBeenCalledWith('purge failed for sessions', 'locked');
});
