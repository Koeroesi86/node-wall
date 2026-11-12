import path from 'path';

export = {
  portHttp: 3000,
  portHttps: 4000,
  logLevels: {
    system: true,
    info: true,
    success: false,
    error: true,
    warning: true,
  },
  statsDomain: 'stats.localhost',
  statsRefreshInterval: 1000,
  servers: [ path.resolve(__dirname, './serverConfig.js') ]
};
