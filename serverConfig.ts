import fs from 'fs';
import { resolve } from 'path';
import dotenv from 'dotenv';
import getEnvPath from './lib/utils/getEnvPath';

const env = dotenv.parse(fs.readFileSync(getEnvPath()));
// On the server APP_ROOT is the stable `build` symlink of the deploy, so new releases are picked up without a reload.
const appRoot = env.APP_ROOT || __dirname;

export = {
  hostname: env.SITE_DOMAIN,
  protocol: env.SERVER_PROTOCOL || 'http', // SITE_PROTOCOL is the public one (links in emails), TLS ends at Apache
  // key: env.SITE_KEY || resolve(__dirname, './.certificates/localhost/privkey1.pem'),
  // cert: env.SITE_CERT || resolve(__dirname, './.certificates/localhost/cert1.pem'),
  type: 'worker',
  options: {
    root: resolve(appRoot, './public').replace(/\\/g, '/'),
    env: {
      DB_DRIVER: env.DB_DRIVER || 'sqlite3',
      DB_DATABASE: env.DB_DATABASE || resolve(appRoot, './lib/data/wall.sqlite').replace(/\\/g, '/'),
      NODEMAILER_HOST: env.NODEMAILER_HOST,
      NODEMAILER_PORT: env.NODEMAILER_PORT,
      NODEMAILER_USER: env.NODEMAILER_USER,
      NODEMAILER_PASS: env.NODEMAILER_PASS,
      ZOHO_DOMAIN: env.ZOHO_DOMAIN,
      ZOHO_CLIENT_ID: env.ZOHO_CLIENT_ID,
      ZOHO_CLIENT_SECRET: env.ZOHO_CLIENT_SECRET,
      ZOHO_REFRESH_TOKEN: env.ZOHO_REFRESH_TOKEN,
      ZOHO_ACCOUNT_ID: env.ZOHO_ACCOUNT_ID,
      SITE_PROTOCOL: env.SITE_PROTOCOL || 'http',
      SITE_DOMAIN: env.SITE_DOMAIN || 'localhost',
    },
    cwd: resolve(appRoot),
    limitRequestBody: 64 * 1024,
    limit: 0,
    limitPerPath: 1,
    index: [
      'index.js'
    ]
  },
};
