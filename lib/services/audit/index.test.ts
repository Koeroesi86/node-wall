import { beforeEach, expect, test, vi } from 'vitest';
import getRecent from './queries/getRecent';
import log from './queries/log';
import removeExpired from './queries/removeExpired';
import { AUDIT_RETENTION_MS } from '../../utils/sessionLifetime';
import auditService from './index';

vi.mock('crypto', () => ({ randomUUID: () => 'audit-id' }));
vi.mock('./queries/getRecent');
vi.mock('./queries/log');
vi.mock('./queries/removeExpired');

beforeEach(() => vi.resetAllMocks());

test('record stores the actor, action, target and request', async () => {
  await auditService.record('u1', 'tag.created', 't1', 'r1');
  expect(log).toHaveBeenCalledWith('audit-id', 'u1', 'tag.created', 't1', 'r1');
});

test('getRecent defaults to 50 entries', async () => {
  vi.mocked(getRecent).mockResolvedValue([]);
  expect(await auditService.getRecent()).toEqual([]);
  expect(getRecent).toHaveBeenCalledWith(50);
});

test('cleanup removes entries older than the retention period', async () => {
  await auditService.cleanup(AUDIT_RETENTION_MS + 10);
  expect(removeExpired).toHaveBeenCalledWith(10);
});
