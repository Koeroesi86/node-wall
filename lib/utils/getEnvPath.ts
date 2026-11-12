import { existsSync } from 'fs';
import { resolve } from 'path';

// A release carries its .env next to the compiled code (dist). Locally the .env sits in the project root, above dist.
const candidates = [resolve(__dirname, '../../.env'), resolve(__dirname, '../../../.env')];

export default () => candidates.find(existsSync) ?? candidates[0];
