const getTranslation = require('lib/translations/getTranslation');

const keepAliveTimeout = 5 * 60 * 1000;
const keepAliveCallback = () => {
  console.log('Shutting down translations API due to inactivity.');
  process.exit(0);
};
let keepAliveTimer = setTimeout(keepAliveCallback, keepAliveTimeout);
const getResponseHeaders = (headers = {}) => ({
  'Content-Type': 'application/json; charset=utf-8',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  ...headers,
});

function detectLanguage(headers) {
  if (headers['accept-language']) {
    return Promise.resolve(headers['accept-language'].substr(0, 5));
  }
  return Promise.resolve('en-GB');
}

module.exports = async (event, callback) => {
  try {
    const httpMethod = (event.httpMethod || '').toUpperCase();
    const {
      pathFragments,
      headers,
    } = event;

    /** @route /api/translation/:alias */
    if (pathFragments.length === 3) {
      if (httpMethod === 'OPTIONS') {
        return callback({
          statusCode: 200,
          headers: getResponseHeaders(),
          body: '',
          isBase64Encoded: false,
        });
      }
      if (httpMethod === 'GET') {
        callback({
          statusCode: 200,
          headers: getResponseHeaders(),
          body: JSON.stringify(await getTranslation(pathFragments[2], await detectLanguage(headers)), null, 2),
          isBase64Encoded: false,
        });
      }
    }
  } catch (e) {
    console.error(e);
    callback({
      statusCode: 400,
      headers: getResponseHeaders(),
      body: JSON.stringify({ message: `Something isn't quite right.` }),
      isBase64Encoded: false,
    });
  }
};
