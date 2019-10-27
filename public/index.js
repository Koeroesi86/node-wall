const moment = require('moment');
const cookie = require('cookie');
const createDatabase = require('lib/utils/createDatabase');
const getUserInfoFromSession = require('lib/utils/getUserInfoFromSession');
const welcomeTemplate = require('lib/templates/page/welcome');
const wallTemplate = require('lib/templates/page/wall');
const tagTemplate = require('lib/templates/page/tag');
const moderationTemplate = require('lib/templates/page/moderation');
const loginTemplate = require('lib/templates/page/login');

const keepAliveTimeout = 10000;
const keepAliveCallback = () => {
  console.log('shutting down due to inactivity.');
};
let keepAliveTimer = setTimeout(keepAliveCallback, keepAliveTimeout);

module.exports = async (event, callback) => {
  clearTimeout(keepAliveTimer);
  keepAliveTimer = setTimeout(keepAliveCallback, keepAliveTimeout);
  const {
    queryStringParameters,
    pathFragments,
    headers,
  } = event;
  const knex = await createDatabase();
  const cookiesRaw = headers.Cookie || headers.cookie || '';
  const cookies = cookie.parse(cookiesRaw);
  let userInfo = null;

  if (cookies.sessionId) {
    userInfo = await getUserInfoFromSession(cookies.sessionId);
  }

  try {
    /** @route / */
    if (pathFragments.length === 0) {
      return callback({
        statusCode: 200,
        headers: {
          'Content-Type': 'text/html',
          'Cache-Control': 'public, max-age=0',
        },
        body: welcomeTemplate({}),
        isBase64Encoded: false,
      });
    }

    /** @route /wall */
    if (pathFragments[0] === 'wall') {
      return callback({
        statusCode: 200,
        headers: {
          'Content-Type': 'text/html',
          'Cache-Control': 'public, max-age=0',
        },
        body: wallTemplate({}),
        isBase64Encoded: false,
      });
    }

    /** @route /tag/* */
    if (pathFragments[0] === 'tag' && /[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}/.test(pathFragments[1])) {
      const tag = await knex('tags')
        .select('id', 'name', 'type')
        .where({ id: pathFragments[1] })
        .first();

      if (tag) {
        return callback({
          statusCode: 200,
          headers: {
            'Content-Type': 'text/html',
            'Cache-Control': 'public, max-age=0',
          },
          body: tagTemplate({ tag }),
          isBase64Encoded: false,
        });
      }
    }

    /** @route /moderation */
    if (pathFragments[0] === 'moderation') {
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

      return callback({
        statusCode: 200,
        headers: {
          'Content-Type': 'text/html',
          'Cache-Control': 'public, max-age=0',
        },
        body: moderationTemplate({}),
        isBase64Encoded: false,
      });
    }

    /** @route /logout */
    if (pathFragments[0] === 'logout') {
      if (cookiesRaw) {
        const cookies = cookie.parse(cookiesRaw);
        await knex('users_session')
          .where({ id: cookies.sessionId })
          .delete();
      }

      const expires = moment().subtract(1, 'year');
      return callback({
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
    }

    /** @route /login */
    if (pathFragments[0] === 'login') {
      if ((!userInfo && cookies.sessionId) || (userInfo && userInfo.session.status === 'active')) {
        if (!userInfo && cookies.sessionId) console.log(`no session found ${cookies.sessionId}`);
        if (userInfo && userInfo.session.status === 'active') console.log('already logged in');
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

      if (pathFragments.length === 1) {
        return callback({
          statusCode: 200,
          headers: {
            'Content-Type': 'text/html',
            'Cache-Control': 'public, max-age=0',
          },
          body: loginTemplate({}),
          isBase64Encoded: false,
        });
      }

      if (pathFragments[1] === 'email') {
        if (queryStringParameters) {
          const { code, session } = queryStringParameters;

          if (code && session) {
            const currentSession = await knex('users_session').where('id', session).first();

            if (currentSession && currentSession.secret === code) {
              await knex('users_session')
                .where({ id: session })
                .update({ status: 'active', secret: '' });
            }

            const expires = moment().add(1, 'year');
            return callback({
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

        return callback({
          statusCode: 302,
          headers: {
            'Content-Type': 'text/html',
            'Cache-Control': 'public, max-age=0',
            'Location': `/login`,
          },
          body: '',
          isBase64Encoded: false,
        });
      }
    }

    callback({
      statusCode: 404,
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'public, max-age=0',
      },
      body: welcomeTemplate({}),
      isBase64Encoded: false,
    });
  } catch (e) {
    console.error(e);
    callback({
      statusCode: 500,
      headers: {
        'Content-Type': 'text/html;charset=utf-8',
        'Cache-Control': 'public, max-age=0',
      },
      body: 'Something went wrong.',
      isBase64Encoded: false,
    });
  }
};
