const moment = require('moment');
const cookie = require('cookie');
const crypto = require('crypto');
const createDatabase = require('lib/utils/createDatabase');
const getUserInfoFromSession = require('lib/utils/getUserInfoFromSession');
const welcomeTemplate = require('lib/templates/page/welcome');
const wallTemplate = require('lib/templates/page/wall');
const tagTemplate = require('lib/templates/page/tag');
const moderationTemplate = require('lib/templates/page/moderation');
const loginTemplate = require('lib/templates/page/login');
const profileTemplate = require('lib/templates/page/profile');
const postTemplate = require('lib/templates/page/post');

const keepAliveTimeout = 60 * 60 * 1000;
const keepAliveCallback = () => {
  console.log('Shutting down page rendering due to inactivity.');
  process.exit(0);
};
let keepAliveTimer = setTimeout(keepAliveCallback, keepAliveTimeout);

function detectLanguage(headers) {
  if (headers['accept-language']) {
    return Promise.resolve(headers['accept-language'].substr(0, 5));
  }
  return Promise.resolve('en-GB');
}

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
  const language = await detectLanguage(headers);

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
        body: welcomeTemplate({
          language,
          sessionId: cookies.sessionId,
        }),
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
        body: wallTemplate({
          language,
          sessionId: cookies.sessionId,
        }),
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
          body: tagTemplate({ language, tag, sessionId: cookies.sessionId }),
          isBase64Encoded: false,
        });
      }
    }

    /** @route /post/* */
    if (pathFragments[0] === 'post' && /[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}/.test(pathFragments[1])) {
      const post = await knex('posts')
        .select('id', 'type', 'created_at', 'status')
        .where({
          id: pathFragments[1],
          type: 'post',
          status: 'public'
        })
        .first();

      if (post) {
        return callback({
          statusCode: 200,
          headers: {
            'Content-Type': 'text/html',
            'Cache-Control': 'public, max-age=0',
          },
          body: postTemplate({
            language,
            sessionId: cookies.sessionId,
            postId: post.id,
          }),
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
        body: moderationTemplate({
          language,
          sessionId: cookies.sessionId,
        }),
        isBase64Encoded: false,
      });
    }

    /** @route /profile */
    if (pathFragments[0] === 'profile') {
      if (!userInfo) {
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

      return callback({
        statusCode: 200,
        headers: {
          'Content-Type': 'text/html',
          'Cache-Control': 'public, max-age=0',
        },
        body: profileTemplate({
          language,
          sessionId: cookies.sessionId,
        }),
        isBase64Encoded: false,
      });
    }

    /** @route /logout */
    if (pathFragments[0] === 'logout') {
      if (cookiesRaw) {
        const cookies = cookie.parse(cookiesRaw);
        if (cookies.sessionId) {
          await knex('users_session')
            .where({ id: cookies.sessionId })
            .update({ status: 'deleted', secret: '' });
        }
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
          body: loginTemplate({
            language,
            sessionId: cookies.sessionId,
          }),
          isBase64Encoded: false,
        });
      }

      if (pathFragments[1] === 'email') {
        if (queryStringParameters) {
          const { code, session } = queryStringParameters;

          if (code && session) {
            const hash = crypto
              .createHash("sha256")
              .update(code)
              .digest("hex");
            const currentSession = await knex('users_session').where('id', session).first();

            if (currentSession && currentSession.secret === hash) {
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
      body: welcomeTemplate({
        language,
        sessionId: cookies.sessionId,
      }),
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
