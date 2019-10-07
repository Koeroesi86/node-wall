const cookie = require('cookie');
const moderationTemplate = require('lib/templates/page/moderation');
const getUserInfoFromSession = require('lib/utils/getUserInfoFromSession');

const keepAliveTimeout = 10000;
const keepAliveCallback = () => {
  // console.log('shutting down due to inactivity.');
};
let keepAliveTimer = setTimeout(keepAliveCallback, keepAliveTimeout);

module.exports = async (event, callback) => {
  clearTimeout(keepAliveTimer);
  keepAliveTimer = setTimeout(keepAliveCallback, keepAliveTimeout);
  const cookiesRaw = event.headers.Cookie || event.headers.cookie || '';

  try {
    if (cookiesRaw) {
      const cookies = cookie.parse(cookiesRaw);
      if (cookies.sessionId) {
        const userInfo = await getUserInfoFromSession(cookies.sessionId);

        if (!userInfo || !['admin'].includes(userInfo.user.role)) {
          return callback({
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
    }

    callback({
      statusCode: 200,
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'public, max-age=0',
      },
      body: moderationTemplate({}),
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
