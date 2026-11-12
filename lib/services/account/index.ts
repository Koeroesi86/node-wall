import { randomUUID as uuid } from 'crypto';
import deleteAccount from './queries/deleteAccount';
import exportData from './queries/exportData';
import bumpConfirmationAttempts from './queries/bumpConfirmationAttempts';
import getConfirmation from './queries/getConfirmation';
import logAudit from '../audit/queries/log';
import removeConfirmation from './queries/removeConfirmation';
import saveConfirmation from './queries/saveConfirmation';
import generateCode from '../../utils/generateCode';
import { hashLoginCode, isLoginCodeExpired, isLoginCodeMatch, LOGIN_CODE_MAX_ATTEMPTS } from '../../utils/loginCode';

/** Account erasure and export (GDPR). Every request is recorded in the audit log. */
export default {
  /** Creates a fresh code to be emailed to the user; it confirms the deletion once. */
  requestDeletion: async (userId: string) => {
    const code = generateCode();
    await saveConfirmation(userId, hashLoginCode(code));
    await logAudit(uuid(), userId, 'account.deletion-requested');
    return code;
  },
  /** Deletes the account when the code matches. The code is single use and limited in attempts and age. */
  confirmDeletion: async (userId: string, code: string) => {
    const confirmation = await getConfirmation(userId);

    if (!confirmation) return false;

    if (isLoginCodeExpired(confirmation.created_at) || confirmation.attempts >= LOGIN_CODE_MAX_ATTEMPTS) {
      await removeConfirmation(userId);
      return false;
    }

    await bumpConfirmationAttempts(userId);

    if (!isLoginCodeMatch(code, confirmation.secret)) return false;

    await logAudit(uuid(), userId, 'account.deleted');
    await deleteAccount(userId);
    return true;
  },
  export: async (userId: string) => {
    await logAudit(uuid(), userId, 'account.exported');
    return exportData(userId);
  },
};
