import { beforeEach, expect, test, vi } from 'vitest';
import dotenv from 'dotenv';

vi.mock('dotenv', () => ({ default: { config: vi.fn() } }));
vi.mock('./lib/utils/getEnvPath', () => ({ default: () => '/app/.env' }));

beforeEach(() => {
  vi.resetModules();
  vi.mocked(dotenv.config).mockClear();
});

test('loads the .env and configures the development database from it', async () => {
  vi.stubEnv('DB_DRIVER', 'sqlite3');
  vi.stubEnv('DB_DATABASE', '/data/wall.sqlite');

  const config = (await import('./knexfile')).default;

  expect(dotenv.config).toHaveBeenCalledWith({ path: '/app/.env' });
  expect(config.development).toEqual({
    client: 'sqlite3',
    connection: { filename: '/data/wall.sqlite' },
    migrations: { tableName: 'knex_migrations' },
  });
});
