import setLastActive from './queries/setLastActive';
import create from './queries/create';
import remove from './queries/remove';
import activate from './queries/activate';
import expireStale from './queries/expireStale';
import purgeUnverified from './queries/purgeUnverified';

export default {
  create: async (id: string, loginId: string, secret: string, status = 'pending') => {
    await create(id, loginId, secret, status);

    return { id, status, secret, users_login_id: loginId };
  },
  setLastActive: async (sessionId: string, lastActive: number) => {
    await setLastActive(sessionId, lastActive);
  },
  remove: async (id: string) => remove(id),
  activate: async (id: string, newId: string) => activate(id, newId),
  cleanup: async () => {
    await expireStale();
    await purgeUnverified();
  },
};
