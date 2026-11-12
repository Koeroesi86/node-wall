import { randomInt } from 'crypto';

export default (length = 6, characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789') => Array
  .from({ length }, () => characters.charAt(randomInt(characters.length)))
  .join('');
