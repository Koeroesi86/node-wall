const uuid = require('uuid/v4');
const NodeMailer = require('nodemailer');
const moment = require('moment');
const cookie = require('cookie');
const createDatabase = require('lib/utils/createDatabase');
const getUserInfo = require('lib/utils/getUserInfoFromSession');
const generateCode = require('lib/utils/generateCode');
const verifyLoginTemplate = require('lib/templates/email/verifyLogin');
const createMailer = require('lib/utils/createMailer');

const keepAliveTimeout = 5000;
const keepAliveCallback = () => {
  process.exit();
};
let keepAliveTimer = setTimeout(keepAliveCallback, keepAliveTimeout);
const getResponseHeaders = (headers = {}) => ({
  'Content-Type': 'application/json; charset=utf-8',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  ...headers,
});

const transporter = createMailer();

process.on('message', async event => {
  clearTimeout(keepAliveTimer);
  keepAliveTimer = setTimeout(keepAliveCallback, keepAliveTimeout);

  try {
    const knex = await createDatabase();
    const httpMethod = (event.httpMethod || '').toUpperCase();

    if (httpMethod === 'OPTIONS') {
      process.send({
        statusCode: 200,
        headers: getResponseHeaders(),
        body: '',
        isBase64Encoded: false,
      });
    }

    if (httpMethod === 'GET') {
      if (event.pathFragments.length === 3 && /[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}/gi.test(event.pathFragments[2])) {
        const user = await knex('users').select('name').where('id', event.pathFragments[2]).first();

        if (!user) {
          return process.send({
            statusCode: 404,
            headers: getResponseHeaders(),
            body: JSON.stringify({}, null, 2),
            isBase64Encoded: false,
          });
        }

        return process.send({
          statusCode: 200,
          headers: getResponseHeaders(),
          body: JSON.stringify(user, null, 2),
          isBase64Encoded: false,
        });
      }

      const cookiesRaw = event.headers.Cookie || event.headers.cookie;
      if (cookiesRaw) {
        const cookies = cookie.parse(cookiesRaw);

        if (cookies.sessionId) {
          const userInfo = await getUserInfo(cookies.sessionId);

          if (!userInfo) {
            const expires = moment().subtract(1, 'year');
            return process.send({
              statusCode: 401,
              headers: {
                'Content-Type': 'text/html',
                'Cache-Control': 'public, max-age=0',
                'Set-Cookie': `sessionId=none; Expires=${expires.format('ddd, DD MMM YYYY HH:mm:ss')} GMT; Path=/`,
              },
              body: '',
              isBase64Encoded: false,
            });
          }

          return process.send({
            statusCode: 200,
            headers: getResponseHeaders(),
            body: JSON.stringify(userInfo, null, 2),
            isBase64Encoded: false,
          });
        }
      }

      return process.send({
        statusCode: 401,
        headers: {
          'Content-Type': 'text/html',
          'Cache-Control': 'public, max-age=0',
        },
        body: '',
        isBase64Encoded: false,
      });
    }

    if (httpMethod === 'POST') {
      const payload = JSON.parse(event.body);
      if (!payload.value) throw new Error('no value');
      if (!payload.type) throw new Error('no type');

      let login;

      try {
        const currentLogin = await knex.select('id', 'user_id').where({
          type: payload.type,
          value: payload.value,
        }).from('users_login').first();

        if (!currentLogin) {
          throw new Error('no login yet');
        }

        login = currentLogin
      } catch (e) {
        const user = {
          id: uuid(),
          name: payload.name || null,
          role: 'admin', //should be 'user'
        };
        await knex.insert(user).into('users');

        login = {
          id: uuid(),
          user_id: user.id,
          type: payload.type,
          value: payload.value,
        };
        await knex.insert(login).into('users_login');
      }

      const session = {
        id: uuid(),
        users_login_id: login.id,
        status: 'pending',
        secret: generateCode(),
      };
      await knex.insert(session).into('users_session');

      if (payload.type === 'email') {
        const verifyUrl = new URL(`${process.env.SITE_PROTOCOL}://${process.env.SITE_DOMAIN}/login/email`);
        verifyUrl.searchParams.set('code', session.secret);
        verifyUrl.searchParams.set('session', session.id);
        transporter.sendMail({
          from: process.env.NODEMAILER_USER || 'sender@example.com',
          to: payload.value,
          subject: 'Bejelentkezés',
          encoding: 'utf-8',
          html: verifyLoginTemplate({
            title: 'Bejelentkezés',
            code: session.secret,
            verifyUrl: verifyUrl.toString(),
          }),
        }, (err, info) => {
          if (info) {
            if (info.envelope) console.log('envelope', info.envelope);
            if (info.messageId) console.log('messageId', info.messageId);
            if (info.message) console.log('message', JSON.parse(info.message));
          }

          if (!info && err && err.responseCode > 500) {
            console.log('err', err);
            process.send({
              statusCode: 400,
              headers: getResponseHeaders({}),
              body: '',
              isBase64Encoded: false,
            });
          } else {
            console.log('mail sent to', payload.value);
            const expires = moment().add(1, 'year');
            process.send({
              statusCode: 200,
              headers: getResponseHeaders({
                'Set-Cookie': `sessionId=${session.id}; Expires=${expires.format('ddd, DD MMM YYYY HH:mm:ss')} GMT; Path=/`
              }),
              body: JSON.stringify({ sessionId: session.id }, null, 2),
              isBase64Encoded: false,
            });
          }
        });
      }
    }
  } catch (e) {
    console.log(e);
    process.send({
      statusCode: 400,
      headers: getResponseHeaders(),
      body: JSON.stringify({ message: `${e}` }, null, 2),
      isBase64Encoded: false,
    });
  }
});
