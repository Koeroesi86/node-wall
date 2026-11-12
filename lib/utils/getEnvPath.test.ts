import { beforeEach, expect, test, vi } from 'vitest';
import { resolve } from 'node:path';

vi.mock('fs', () => ({ existsSync: vi.fn() }));

const load = async () => (await import('./getEnvPath')).default;

const dist = resolve(__dirname, '../../.env');
const root = resolve(__dirname, '../../../.env');

beforeEach(() => {
  vi.resetModules();
});

test('prefers the .env next to the compiled code', async () => {
  vi.mocked((await import('fs')).existsSync).mockImplementation(path => path === dist || path === root);
  expect((await load())()).toBe(dist);
});

test('falls back to the project root', async () => {
  vi.mocked((await import('fs')).existsSync).mockImplementation(path => path === root);
  expect((await load())()).toBe(root);
});

test('defaults to the first candidate when none exists', async () => {
  vi.mocked((await import('fs')).existsSync).mockReturnValue(false);
  expect((await load())()).toBe(dist);
});

