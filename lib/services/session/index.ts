import setLastActive from './queries/setLastActive';
import create from './queries/create';
import remove from './queries/remove';

export default {
  create: async (id: string, loginId: string, secret: string, status = 'pending') => {
    await create(id, loginId, secret, status);

    return { id, status, secret, users_login_id: loginId };
  },
  setLastActive: async (sessionId: string, lastActive: number) => {
    await setLastActive(sessionId, lastActive);
  },
  remove: async (id: string) => remove(id),
};
