const cookie = require('cookie');
const createDatabase = require('lib/utils/createDatabase');
const getUserInfo = require('lib/utils/getUserInfoFromSession');

const keepAliveTimeout = 5000;
const keepAliveCallback = () => {
};
let keepAliveTimer = setTimeout(keepAliveCallback, keepAliveTimeout);
const getResponseHeaders = (headers = {}) => ({
  'Content-Type': 'application/json; charset=utf-8',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'PUT, GET, OPTIONS',
  ...headers,
});

module.exports = async (event, callback) => {
  clearTimeout(keepAliveTimer);
  keepAliveTimer = setTimeout(keepAliveCallback, keepAliveTimeout);

  try {
    const knex = await createDatabase();
    const httpMethod = (event.httpMethod || '').toUpperCase();
    const cookiesRaw = event.headers.Cookie || event.headers.cookie;
    if (!cookiesRaw) throw new Error('no cookies set');

    const cookies = cookie.parse(cookiesRaw);
    if (!cookies.sessionId) throw new Error('no sessionId');

    const userInfo = await getUserInfo(cookies.sessionId);
    if (!userInfo) throw new Error('user not found for session');

    if (httpMethod === 'OPTIONS') {
      return callback({
        statusCode: 200,
        headers: getResponseHeaders(),
        body: '',
        isBase64Encoded: false,
      });
    }

    if (httpMethod === 'GET') {
      return callback({
        statusCode: 200,
        headers: getResponseHeaders(),
        body: JSON.stringify({ name: userInfo.user.name }, null, 2),
        isBase64Encoded: false,
      });
    }

    if (httpMethod === 'PUT') {
      const payload = JSON.parse(event.body);
      if (!payload.name) throw new Error('no name');

      await knex('users')
        .update({ name: payload.name })
        .where({ id: userInfo.user.id });

      return callback({
        statusCode: 200,
        headers: getResponseHeaders(),
        body: '',
        isBase64Encoded: false,
      });
    }

    callback({
      statusCode: 400,
      headers: getResponseHeaders(),
      body: '',
      isBase64Encoded: false,
    });
  } catch (e) {
    console.log(e);
    callback({
      statusCode: 401,
      headers: getResponseHeaders(),
      body: '',
      isBase64Encoded: false,
    });
  }
};
