const { resolve } = require('path');
const dotenv = require('dotenv');

dotenv.config({
  path: resolve(__dirname, './.env')
});

module.exports = {
  serverOptions: {
    hostname: 'uzeno.localhost',
    protocol: 'http',
    // key: resolve(__dirname, './.certificates/localhost/privkey1.pem'),
    // cert: resolve(__dirname, './.certificates/localhost/cert1.pem'),
  },
  workerOptions: {
    root: 'D:\\Chris\\Documents\\Developement\\uzenofal\\public',
    options: {
      env: {
        DB_DRIVER: process.env.DB_DRIVER || 'sqlite3',
        DB_DATABASE: process.env.DB_DATABASE || 'D:/Chris/Documents/Developement/uzenofal/lib/data/wall.sqlite',
      },
      cwd: 'D:\\Chris\\Documents\\Developement\\uzenofal',
    },
    limit: 0,
    limitPerPath: 1,
    index: [
      'index.js'
    ]
  },
};
