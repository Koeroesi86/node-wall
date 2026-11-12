import hit from './queries/hit';
import removeExpired from './queries/removeExpired';

export default {
  hit: async (key: string, windowMs: number) => hit(key, windowMs),
  removeExpired: async () => removeExpired(),
};
