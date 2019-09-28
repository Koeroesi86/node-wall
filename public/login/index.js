const cookie = require('cookie');
const loginTemplate = require('lib/templates/page/login');
const getUserInfoFromSession = require('lib/utils/getUserInfoFromSession');

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
    const cookiesRaw = event.headers.Cookie || event.headers.cookie;

    if (cookiesRaw) {
      const cookies = cookie.parse(cookiesRaw);

      if (cookies.sessionId) {
        const userInfo = await getUserInfoFromSession(cookies.sessionId);

        if (!userInfo) throw new Error('not session found');
        if (userInfo.session.status === 'active') throw new Error('already logged in');
      }
    }

    process.send({
      statusCode: 200,
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'public, max-age=0',
      },
      body: loginTemplate({}),
      isBase64Encoded: false,
    });
  } catch (e) {
    console.log(e);
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
});
