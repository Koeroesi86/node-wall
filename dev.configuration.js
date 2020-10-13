const path = require('path');

module.exports = {
  SERVICE_NAME: 'node-webserver',
  ENABLE_FILE_LOGS: false,
  FILE_LOG_PATH: path.resolve(__dirname, './.log/'),
  LOG_LEVELS: {
    system: true,
    info: true,
    success: false,
    error: true,
    warning: true,
  },
  PORTS: {
    http: 80,
    https: 443
  },
  PORT_LOOKUP: {
    from: 3000,
    to: 3010,
    address: 'localhost'
  },
  STATS_DOMAIN: 'stats.localhost',
  STATS_REFRESH_INTERVAL: 1000,
  SERVERS: [ path.resolve(__dirname, './config') ]
};
