const { resolve } = require('path');
const dotenv = require('dotenv');

dotenv.config({
  path: resolve(__dirname, './.env')
});

module.exports = {
  serverOptions: {
    hostname: process.env.SITE_DOMAIN,
    protocol: process.env.SITE_PROTOCOL || 'http',
    // key: resolve(__dirname, './.certificates/localhost/privkey1.pem'),
    // cert: resolve(__dirname, './.certificates/localhost/cert1.pem'),
  },
  workerOptions: {
    root: resolve(__dirname, './public').replace('\\', '/'),
    env: {
      DB_DRIVER: process.env.DB_DRIVER || 'sqlite3',
      DB_DATABASE: process.env.DB_DATABASE || resolve(__dirname, './lib/data/wall.sqlite').replace('\\', '/'),
      NODEMAILER_HOST: process.env.NODEMAILER_HOST,
      NODEMAILER_PORT: process.env.NODEMAILER_PORT,
      NODEMAILER_USER: process.env.NODEMAILER_USER,
      NODEMAILER_PASS: process.env.NODEMAILER_PASS,
      SITE_PROTOCOL: process.env.SITE_PROTOCOL || 'http',
      SITE_DOMAIN: process.env.SITE_DOMAIN || 'localhost',
    },
    cwd: resolve(__dirname),
    limit: 0,
    limitPerPath: 1,
    index: [
      'index.js'
    ]
  },
};
