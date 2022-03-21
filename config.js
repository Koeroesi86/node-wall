const fs = require('fs');
const { resolve } = require('path');
const dotenv = require('dotenv');

const env = dotenv.parse(fs.readFileSync(resolve(__dirname, './.env')));

module.exports = {
  hostname: env.SITE_DOMAIN,
  protocol: env.SITE_PROTOCOL || 'http',
  // key: env.SITE_KEY || resolve(__dirname, './.certificates/localhost/privkey1.pem'),
  // cert: env.SITE_CERT || resolve(__dirname, './.certificates/localhost/cert1.pem'),
  type: 'worker',
  options: {
    root: resolve(__dirname, './public').replace('\\', '/'),
    env: {
      DB_DRIVER: env.DB_DRIVER || 'sqlite3',
      DB_DATABASE: env.DB_DATABASE || resolve(__dirname, './lib/data/wall.sqlite').replace('\\', '/'),
      NODEMAILER_HOST: env.NODEMAILER_HOST,
      NODEMAILER_PORT: env.NODEMAILER_PORT,
      NODEMAILER_USER: env.NODEMAILER_USER,
      NODEMAILER_PASS: env.NODEMAILER_PASS,
      SITE_PROTOCOL: env.SITE_PROTOCOL || 'http',
      SITE_DOMAIN: env.SITE_DOMAIN || 'localhost',
    },
    cwd: resolve(__dirname),
    limit: 0,
    limitPerPath: 1,
    index: [
      'index.js'
    ]
  },
};
