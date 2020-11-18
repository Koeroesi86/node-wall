const path = require('path');

module.exports = {
  serviceName: 'node-webserver',
  fileLogPath: false, //path.resolve(__dirname, './.log/'),
  logLevels: {
    system: true,
    info: true,
    success: false,
    error: true,
    warning: true,
  },
  ports: {
    http: 80,
    https: 443
  },
  portLookup: false, //{from: 3000, to: 3010, address: 'localhost'}
  statsDomain: 'stats.localhost',
  statsRefreshInterval: 1000,
  servers: [ path.resolve(__dirname, './config.js') ]
};
