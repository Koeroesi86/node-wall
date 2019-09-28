const config = require('./config');

module.exports = {
  SERVICE_NAME: 'node-webserver',
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
  SERVERS: [ config ]
};
