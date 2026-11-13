import type { LambdaCallback, LambdaEvent } from '../lib/types';
import moment from 'moment';
import { parseCookies, buildSessionCookie, isSessionId } from '../lib/utils/sessionCookie';
import { isLoginCodeExpired, isLoginCodeMatch, LOGIN_CODE_MAX_ATTEMPTS } from '../lib/utils/loginCode';
import crypto from 'crypto';
import readJson from '../lib/utils/readJson';
import { ActivateSessionRequestSchema } from '../lib/api-schemas';
import sessionService from '../lib/services/session';
import { SESSION_MAX_AGE_MS } from '../lib/utils/sessionLifetime';
import securityHeaders from '../lib/utils/securityHeaders';
import detectLanguage from '../lib/utils/detectLanguage';
import createDatabase from '../lib/utils/createDatabase';
import getUserInfoFromSession from '../lib/utils/getUserInfoFromSession';
import welcomeTemplate from '../lib/templates/page/welcome';
import wallTemplate from '../lib/templates/page/wall';
import tagTemplate from '../lib/templates/page/tag';
import moderationTemplate from '../lib/templates/page/moderation';
import loginTemplate from '../lib/templates/page/login';
import profileTemplate from '../lib/templates/page/profile';
import postTemplate from '../lib/templates/page/post';

// The session id travels in the login page's query string, so keep it out of the Referer header.
const noReferrerHeaders = { 'Referrer-Policy': 'no-referrer' };

const keepAliveTimeout = 60 * 60 * 1000;
const keepAliveCallback = () => {
  console.log('Shutting down page rendering due to inactivity.');
  process.exit(0);
};
let keepAliveTimer = setTimeout(keepAliveCallback, keepAliveTimeout);

export = async (event: LambdaEvent, respond: LambdaCallback) => {
  const loginPageHeaders = event.pathFragments[0] === 'login' ? noReferrerHeaders : {};
  const callback: LambdaCallback = (response) => respond({
    ...response,
    headers: { ...securityHeaders, ...loginPageHeaders, ...response.headers },
  });
  clearTimeout(keepAliveTimer);
  keepAliveTimer = setTimeout(keepAliveCallback, keepAliveTimeout);
  const {
    queryStringParameters,
    pathFragments,
    headers,
  } = event;
  const isPost = (event.httpMethod || '').toUpperCase() === 'POST';
  const knex = await createDatabase();
  const cookiesRaw = headers.Cookie || headers.cookie || '';
  const cookies = parseCookies(cookiesRaw);
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
          'Cache-Control': 'private, no-store',
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
          'Cache-Control': 'private, no-store',
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
            'Cache-Control': 'private, no-store',
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
            'Cache-Control': 'private, no-store',
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
            'Cache-Control': 'private, no-store',
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
          'Cache-Control': 'private, no-store',
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
            'Cache-Control': 'private, no-store',
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
          'Cache-Control': 'private, no-store',
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
      // Only a POST logs out, so a link or an embedded request from another site cannot trigger it.
      if (!isPost) {
        return callback({
          statusCode: 302,
          headers: {
            'Content-Type': 'text/html',
            'Cache-Control': 'private, no-store',
            'Location': `/`,
          },
          body: '',
          isBase64Encoded: false,
        });
      }

      if (cookies.sessionId) {
        await knex('users_session')
          .where({ id: cookies.sessionId })
          .update({ status: 'deleted', secret: '' });
      }

      const expires = moment().subtract(1, 'year');
      return callback({
        statusCode: 302,
        headers: {
          'Content-Type': 'text/html',
          'Cache-Control': 'private, no-store',
          'Set-Cookie': buildSessionCookie('none', expires.format('ddd, DD MMM YYYY HH:mm:ss')),
          'Location': `/login`,
        },
        body: '',
        isBase64Encoded: false,
      });
    }

    /** @route /login */
    if (pathFragments[0] === 'login') {
      if (userInfo) {
        console.log('already logged in');
        return callback({
          statusCode: 302,
          headers: {
            'Content-Type': 'text/html',
            'Cache-Control': 'private, no-store',
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
            'Cache-Control': 'private, no-store',
          },
          body: loginTemplate({
            language,
            sessionId: cookies.sessionId,
          }),
          isBase64Encoded: false,
        });
      }

      if (pathFragments[1] === 'email') {
        const { session } = queryStringParameters ?? {};
        const redirectTo = (location: string, headers: Record<string, string> = {}) => callback({
          statusCode: 302,
          headers: {
            'Content-Type': 'text/html',
            'Cache-Control': 'private, no-store',
            ...headers,
            'Location': location,
          },
          body: '',
          isBase64Encoded: false,
        });

        const respondActivation = (statusCode: number, headers: Record<string, string> = {}) => callback({
          statusCode,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'private, no-store',
            ...headers,
          },
          body: '{}',
          isBase64Encoded: false,
        });

        // Opening the emailed link (or having it prefetched by a scanner) never changes state:
        // it only leads to the page where the code is submitted.
        if (!isPost) {
          return redirectTo(isSessionId(session) ? `/login?session=${encodeURIComponent(session)}` : '/login');
        }

        const { session: pendingSessionId, code } = await readJson(event.bodyStream, ActivateSessionRequestSchema);

        // The pending session cookie was set in the browser that asked for the login,
        // so a link carrying somebody else's session cannot sign this browser in as them.
        if (cookies.sessionId !== pendingSessionId) {
          return respondActivation(403);
        }

        const currentSession = await knex('users_session').where('id', pendingSessionId).first();
        const isPending = currentSession?.status === 'pending';
        const isUsable = isPending
          && !isLoginCodeExpired(currentSession.created_at)
          && (currentSession.attempts ?? 0) < LOGIN_CODE_MAX_ATTEMPTS;

        if (isPending && !isUsable) {
          await knex('users_session')
            .where({ id: pendingSessionId })
            .update({ status: 'deleted', secret: '' });
        }

        if (isUsable) {
          await knex('users_session').where({ id: pendingSessionId }).increment('attempts', 1);
        }

        const verified = isUsable && isLoginCodeMatch(code, currentSession.secret);

        const activeSessionId = crypto.randomUUID();
        const activated = verified && await sessionService.activate(pendingSessionId, activeSessionId) > 0;

        const expires = moment().add(SESSION_MAX_AGE_MS, 'ms');
        return respondActivation(
          activated ? 200 : 403,
          activated ? { 'Set-Cookie': buildSessionCookie(activeSessionId, expires.format('ddd, DD MMM YYYY HH:mm:ss')) } : {},
        );
      }
    }

    callback({
      statusCode: 404,
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'private, no-store',
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
        'Cache-Control': 'private, no-store',
      },
      body: 'Something went wrong.',
      isBase64Encoded: false,
    });
  }
};
