import { resolve } from 'node:path';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const files = vi.hoisted(() => ({ content: '' }));

vi.mock('fs', () => ({ default: { readFileSync: () => files.content } }));
vi.mock('./lib/utils/getEnvPath', () => ({ default: () => '/app/.env' }));

const load = async (env: string) => {
  files.content = env;
  vi.resetModules();
  return (await import('./serverConfig')).default;
};

describe('serverConfig', () => {
  beforeEach(() => vi.resetModules());

  test('uses sensible defaults for a minimal .env', async () => {
    const config = await load('SITE_DOMAIN=example.com\n');

    expect(config).toMatchObject({ hostname: 'example.com', protocol: 'http', type: 'worker' });
    expect(config.options.cwd).toBe(__dirname);
    expect(config.options.root).toBe(resolve(__dirname, 'public'));
    expect(config.options.env).toMatchObject({
      DB_DRIVER: 'sqlite3',
      DB_DATABASE: resolve(__dirname, 'lib/data/wall.sqlite'),
      SITE_PROTOCOL: 'http',
      SITE_DOMAIN: 'example.com',
    });
  });

  test('falls back to localhost without SITE_DOMAIN', async () => {
    expect((await load('')).options.env.SITE_DOMAIN).toBe('localhost');
  });

  test('takes everything from the .env when configured', async () => {
    const config = await load([
      'SITE_DOMAIN=wall.example',
      'SITE_PROTOCOL=https',
      'SERVER_PROTOCOL=https',
      'APP_ROOT=/var/www/build',
      'DB_DRIVER=pg',
      'DB_DATABASE=/data/wall.sqlite',
      'NODEMAILER_HOST=smtp.x.y',
      'ZOHO_REFRESH_TOKEN=refresh',
    ].join('\n'));

    expect(config.protocol).toBe('https');
    expect(config.options.cwd).toBe('/var/www/build');
    expect(config.options.root).toBe('/var/www/build/public');
    expect(config.options.env).toMatchObject({
      DB_DRIVER: 'pg',
      DB_DATABASE: '/data/wall.sqlite',
      SITE_PROTOCOL: 'https',
      NODEMAILER_HOST: 'smtp.x.y',
      ZOHO_REFRESH_TOKEN: 'refresh',
    });
  });

  test('limits request bodies to 64 KiB', async () => {
    expect((await load('')).options.limitRequestBody).toBe(64 * 1024);
  });
});
