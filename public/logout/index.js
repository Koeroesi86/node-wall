const moment = require('moment');
const cookie = require('cookie');
const createDatabase = require('lib/utils/createDatabase');

const keepAliveTimeout = 5000;
const keepAliveCallback = () => {
  // console.log('shutting down due to inactivity.');
};
let keepAliveTimer = setTimeout(keepAliveCallback, keepAliveTimeout);

module.exports = async (event, callback) => {
  clearTimeout(keepAliveTimer);
  keepAliveTimer = setTimeout(keepAliveCallback, keepAliveTimeout);
  const knex = await createDatabase();

  const cookiesRaw = event.headers.Cookie || event.headers.cookie;
  if (cookiesRaw) {
    const cookies = cookie.parse(cookiesRaw);
    await knex('users_session')
      .where({ id: cookies.sessionId })
      .delete();
  }

  const expires = moment().subtract(1, 'year');
  callback({
    statusCode: 302,
    headers: {
      'Content-Type': 'text/html',
      'Cache-Control': 'public, max-age=0',
      'Set-Cookie': `sessionId=none; Expires=${expires.format('ddd, DD MMM YYYY HH:mm:ss')} GMT; Path=/`,
      'Location': `/login`,
    },
    body: '',
    isBase64Encoded: false,
  });
};
