import { resolve } from 'node:path';
import { expect, test } from 'vitest';
import config from './dev.configuration';

test('serves the compiled server config on an unprivileged port', () => {
  expect(config).not.toHaveProperty('protocol');
  expect(config).not.toHaveProperty('portLookup');
  expect(config.portHttp).toBe(3000);
  expect(config.portHttps).toBe(4000);
  expect(config.servers).toEqual([resolve(__dirname, 'serverConfig.js')]);
});
