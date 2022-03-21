const path = require('path');

module.exports = {
  protocol: 'http',
  // portHttp: 3000,
  // portHttps: 4000,
  logLevels: {
    system: true,
    info: true,
    success: false,
    error: true,
    warning: true,
  },
  portLookup: false, //{from: 3000, to: 3010, address: 'localhost'}
  statsDomain: 'stats.localhost',
  statsRefreshInterval: 1000,
  servers: [ path.resolve(__dirname, './config.js') ]
};
