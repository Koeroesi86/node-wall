import { resolve } from 'node:path';
import { expect, test } from 'vitest';
import config from './dev.configuration';

test('serves the compiled server config over http', () => {
  expect(config.protocol).toBe('http');
  expect(config.servers).toEqual([resolve(__dirname, 'serverConfig.js')]);
});
