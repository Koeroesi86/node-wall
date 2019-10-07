const wallTemplate = require('lib/templates/page/wall');

const keepAliveTimeout = 10000;
const keepAliveCallback = () => {
  console.log('shutting down due to inactivity.');
};
let keepAliveTimer = setTimeout(keepAliveCallback, keepAliveTimeout);

module.exports = async (event, callback) => {
  clearTimeout(keepAliveTimer);
  keepAliveTimer = setTimeout(keepAliveCallback, keepAliveTimeout);

  try {
    callback({
      statusCode: 200,
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'public, max-age=0',
      },
      body: wallTemplate({}),
      isBase64Encoded: false,
    });
  } catch (e) {
    callback({
      statusCode: 500,
      headers: {
        'Content-Type': 'text/html;charset=utf-8',
        'Cache-Control': 'public, max-age=0',
      },
      body: `${e}`,
      isBase64Encoded: false,
    });
  }
};
