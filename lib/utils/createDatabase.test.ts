import { beforeEach, expect, test, vi } from 'vitest';

const knexFactory = vi.hoisted(() => vi.fn());

vi.mock('knex', () => ({ default: knexFactory }));

const createInstance = () => ({ migrate: { latest: vi.fn().mockResolvedValue(undefined) } });

beforeEach(() => {
  vi.resetModules();
  knexFactory.mockReset();
  vi.stubEnv('DB_DRIVER', 'sqlite3');
  vi.stubEnv('DB_DATABASE', '/tmp/test.sqlite');
});

test('configures knex from the environment and migrates', async () => {
  const instance = createInstance();
  knexFactory.mockReturnValue(instance);
  const { default: createDatabase } = await import('./createDatabase');

  expect(await createDatabase()).toBe(instance);
  expect(knexFactory).toHaveBeenCalledWith({
    client: 'sqlite3',
    connection: { filename: '/tmp/test.sqlite' },
    useNullAsDefault: true,
    pool: { min: 0, max: 1 },
  });
  expect(instance.migrate.latest).toHaveBeenCalledOnce();
});

test('reuses the migrated instance', async () => {
  knexFactory.mockImplementation(createInstance);
  const { default: createDatabase } = await import('./createDatabase');

  expect(await createDatabase()).toBe(await createDatabase());
  expect(knexFactory).toHaveBeenCalledOnce();
});

test('does not cache the instance when migrating fails', async () => {
  const failing = { migrate: { latest: vi.fn().mockRejectedValue(new Error('migration failed')) } };
  knexFactory.mockReturnValueOnce(failing).mockReturnValueOnce(createInstance());
  const { default: createDatabase } = await import('./createDatabase');

  await expect(createDatabase()).rejects.toThrow('migration failed');
  await expect(createDatabase()).resolves.toBeDefined();
  expect(knexFactory).toHaveBeenCalledTimes(2);
});
