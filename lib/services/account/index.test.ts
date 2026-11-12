import { beforeEach, expect, test, vi } from 'vitest';
import bumpConfirmationAttempts from './queries/bumpConfirmationAttempts';
import deleteAccount from './queries/deleteAccount';
import exportData from './queries/exportData';
import getConfirmation from './queries/getConfirmation';
import logAudit from '../audit/queries/log';
import removeConfirmation from './queries/removeConfirmation';
import saveConfirmation from './queries/saveConfirmation';
import { hashLoginCode, LOGIN_CODE_MAX_ATTEMPTS } from '../../utils/loginCode';
import accountService from './index';

vi.mock('crypto', async importOriginal => ({ ...await importOriginal<typeof import('crypto')>(), randomUUID: () => 'audit-id' }));
vi.mock('./queries/bumpConfirmationAttempts');
vi.mock('./queries/deleteAccount');
vi.mock('./queries/exportData');
vi.mock('./queries/getConfirmation');
vi.mock('../audit/queries/log');
vi.mock('./queries/removeConfirmation');
vi.mock('./queries/saveConfirmation');

beforeEach(() => vi.resetAllMocks());

const confirmation = (overrides = {}) => ({ user_id: 'u1', secret: hashLoginCode('ABC123'), attempts: 0, created_at: Date.now(), ...overrides });

test('requestDeletion stores only the hash of the returned code and audits', async () => {
  const code = await accountService.requestDeletion('u1');

  expect(code).toMatch(/^[A-Z0-9]{6}$/);
  expect(saveConfirmation).toHaveBeenCalledWith('u1', hashLoginCode(code));
  expect(logAudit).toHaveBeenCalledWith('audit-id', 'u1', 'account.deletion-requested');
});

test('confirmDeletion deletes with the right code and audits', async () => {
  vi.mocked(getConfirmation).mockResolvedValue(confirmation());

  expect(await accountService.confirmDeletion('u1', 'ABC123')).toBe(true);
  expect(logAudit).toHaveBeenCalledWith('audit-id', 'u1', 'account.deleted');
  expect(deleteAccount).toHaveBeenCalledWith('u1');
});

test('confirmDeletion refuses a wrong code and counts the attempt', async () => {
  vi.mocked(getConfirmation).mockResolvedValue(confirmation());

  expect(await accountService.confirmDeletion('u1', 'WRONG1')).toBe(false);
  expect(bumpConfirmationAttempts).toHaveBeenCalledWith('u1');
  expect(deleteAccount).not.toHaveBeenCalled();
});

test('confirmDeletion refuses without a request', async () => {
  expect(await accountService.confirmDeletion('u1', 'ABC123')).toBe(false);
  expect(deleteAccount).not.toHaveBeenCalled();
});

test.each([
  ['expired', { created_at: Date.now() - 60 * 60 * 1000 }],
  ['used up', { attempts: LOGIN_CODE_MAX_ATTEMPTS }],
])('confirmDeletion drops a %s code even if it matches', async (_name, overrides) => {
  vi.mocked(getConfirmation).mockResolvedValue(confirmation(overrides));

  expect(await accountService.confirmDeletion('u1', 'ABC123')).toBe(false);
  expect(removeConfirmation).toHaveBeenCalledWith('u1');
  expect(deleteAccount).not.toHaveBeenCalled();
});

test('export audits and returns the data', async () => {
  const data = { profile: undefined, logins: [], sessions: [], tags: [], posts: [], comments: [] };
  vi.mocked(exportData).mockResolvedValue(data);

  expect(await accountService.export('u1')).toBe(data);
  expect(logAudit).toHaveBeenCalledWith('audit-id', 'u1', 'account.exported');
});
