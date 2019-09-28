const moment = require('moment');
const cookie = require('cookie');
const createDatabase = require('lib/utils/createDatabase');

const keepAliveTimeout = 5000;
const keepAliveCallback = () => {
  // console.log('shutting down due to inactivity.');
  process.exit();
};
let keepAliveTimer = setTimeout(keepAliveCallback, keepAliveTimeout);

process.on('message', async event => {
  clearTimeout(keepAliveTimer);
  keepAliveTimer = setTimeout(keepAliveCallback, keepAliveTimeout);

  try {
    const knex = await createDatabase();
    const cookiesRaw = event.headers.Cookie || event.headers.cookie;

    if (cookiesRaw) {
      const cookies = cookie.parse(cookiesRaw);
      const session = await knex.select('users_login_id', 'status', 'created_at').where({
        id: cookies.sessionId,
      }).from('users_session').first();

      if (cookies.sessionId && session.status === 'active') {
        return process.send({
          statusCode: 302,
          headers: {
            'Content-Type': 'text/html',
            'Cache-Control': 'public, max-age=0',
            'Location': `/`,
          },
          body: '',
          isBase64Encoded: false,
        });
      }
    }

    if (event.queryStringParameters) {
      const { code, session } = event.queryStringParameters;

      if (code && session) {
        const currentSession = await knex('users_session').where('id', session).first();

        if (currentSession && currentSession.secret === code) {
          await knex('users_session')
            .where({ id: session })
            .update({ status: 'active', secret: '' });
        }

        const expires = moment().add(1, 'year');
        return process.send({
          statusCode: 302,
          headers: {
            'Content-Type': 'text/html',
            'Cache-Control': 'public, max-age=0',
            'Set-Cookie': `sessionId=${session}; Expires=${expires.format('ddd, DD MMM YYYY HH:mm:ss')} GMT; Path=/`,
            'Location': `/login`,
          },
          body: '',
          isBase64Encoded: false,
        });
      }
    }

    process.send({
      statusCode: 302,
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'public, max-age=0',
        'Location': `/login`,
      },
      body: '',
      isBase64Encoded: false,
    });
  } catch (e) {
    process.send({
      statusCode: 400,
      headers: {
        'Content-Type': 'text/html;charset=utf-8',
        'Cache-Control': 'public, max-age=0',
      },
      body: `${e}`,
      isBase64Encoded: false,
    });
  }
});
