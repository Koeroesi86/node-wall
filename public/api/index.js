const uuid = require('uuid/v4');
const cookie = require('cookie');
const axios = require('axios');
const { JSDOM } = require('jsdom');
const moment = require('moment');
const matchAll = require('match-all');
const createDatabase = require('lib/utils/createDatabase');
const getData = require('lib/utils/getData');
const setData = require('lib/utils/setData');
const getUserInfoFromSession = require('lib/utils/getUserInfoFromSession');
const generateCode = require('lib/utils/generateCode');
const verifyLoginTemplate = require('lib/templates/email/verifyLogin');
const createMailer = require('lib/utils/createMailer');

const keepAliveTimeout = 30 * 1000;
const keepAliveCallback = () => {
  // console.log('shutting down due to inactivity.');
};
let keepAliveTimer = setTimeout(keepAliveCallback, keepAliveTimeout);
const getResponseHeaders = (headers = {}) => ({
  'Content-Type': 'application/json; charset=utf-8',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, PUT, GET, DELETE, OPTIONS',
  ...headers,
});
const transporter = createMailer();

async function getPostTags(postId) {
  const knex = await createDatabase();
  return knex('posts_tags')
    .leftJoin('tags', 'tags.id', 'posts_tags.tag_id')
    .where('posts_tags.post_id', postId)
    .select('tags.id', 'tags.name', 'tags.type');
}

module.exports = async (event, callback) => {
  clearTimeout(keepAliveTimer);
  keepAliveTimer = setTimeout(keepAliveCallback, keepAliveTimeout);

  try {
    const httpMethod = (event.httpMethod || '').toUpperCase();
    const knex = await createDatabase();
    const {
      queryStringParameters,
      pathFragments,
      headers,
    } = event;
    const cookiesRaw = headers.Cookie || headers.cookie || '';
    const cookies = cookie.parse(cookiesRaw);
    let userInfo = null;

    if (cookies.sessionId) {
      userInfo = await getUserInfoFromSession(cookies.sessionId);
    }

    /** @route /api/link */
    if (pathFragments[1] === 'link') {
      if (httpMethod === 'GET') {
        if (!queryStringParameters) throw new Error('no queryStringParameters');
        const { uri, post } = queryStringParameters;
        if (!uri) throw new Error('No uri specified');
        if (!post) throw new Error('No post specified');
        if (!/[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}/gi.test(post)) throw new Error('Invalid post id');

        const postContent = await getData(post, 'post');
        if (!(postContent || '').includes(uri.replace(/^https?:\/\//, ''))) throw new Error('Uri not present in post.');

        let url = uri;

        if (/^http:/.test(url)) {
          url = url.replace(/^http:/, 'https:');
        }

        const existingLink = await knex('links').select('id', 'created_at').where('url', url).first();

        if (existingLink) {
          const linkData = await getData(existingLink.id, 'link');

          if (linkData) {
            return callback({
              statusCode: 200,
              headers: getResponseHeaders(),
              body: linkData,
              isBase64Encoded: false,
            });
          }
        }

        const response = await axios({
          method: 'get',
          url: url,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/77.0.3865.93 Safari/537.36 Vivaldi/2.8.1664.40',
          }
        });

        if (!response.headers['content-type'].includes('text/html')) throw new Error('Not yet supported type');

        const dom = new JSDOM(`${response.data}`);

        let title = dom.window.document.querySelector('head title').textContent;
        const headers = [...dom.window.document.querySelectorAll("head meta")].map(meta => ({
          name: meta.getAttribute('name'),
          property: meta.getAttribute('property'),
          'http-equiv': meta.getAttribute('http-equiv'),
          content: meta.getAttribute('content'),
        }));

        let image = '';
        const twitterImage = headers.find(meta => meta.property === 'twitter:image');
        const fbImage = headers.find(meta => meta.property === 'og:image');
        if (twitterImage) {
          image = twitterImage.content;
        } else if (fbImage) {
          image = fbImage.content;
        }

        if (/^\/\//.test(image)) {
          image = `https:${image}`;
        }

        let description = '';
        const twitterDescription = headers.find(meta => meta.property === 'twitter:description');
        const fbDescription = headers.find(meta => meta.property === 'og:description');
        if (twitterDescription) {
          description = twitterDescription.content;
        } else if (fbDescription) {
          description = fbDescription.content;
        }

        let embedCode = '';
        if (/^https:\/\/www.youtube.com\/watch\?v=/.test(uri)) {
          const videoId = uri.match(/^https:\/\/www.youtube.com\/watch\?v=(.+)/)[1];
          embedCode = `<iframe src="https://www.youtube.com/embed/${videoId}"></iframe>`;
        }

        const newLinkData = {
          'content-type': response.headers['content-type'],
          title,
          description,
          image,
          url,
          embedCode,
          // headers,
          // headers: response.headers,
        };

        const postRecord = await knex('posts').select('status', 'type').where('id', post).first();
        if (postRecord && postRecord.status === 'public') {
          const newLinkId = uuid();
          await knex.insert({
            id: newLinkId,
            url: url,
          }).into('links');
          await setData(newLinkId, 'link', JSON.stringify(newLinkData, null, 2));
        }

        return callback({
          statusCode: 200,
          headers: getResponseHeaders(),
          body: JSON.stringify(newLinkData, null, 2),
          isBase64Encoded: false,
        });
      }
    }

    /** @route /api/posts */
    if (pathFragments[1] === 'posts') {
      if (httpMethod === 'OPTIONS') {
        return callback({
          statusCode: 200,
          headers: getResponseHeaders(),
          body: '',
          isBase64Encoded: false,
        });
      }

      if (httpMethod === 'GET') {
        if (/[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}/gi.test(pathFragments[2])) {
          const postId = pathFragments[2];
          const post = await knex('posts').select('id', 'owner', 'type', 'status', 'created_at').where('id', postId).first();

          if (!post) {
            return callback({
              statusCode: 404,
              headers: getResponseHeaders(),
              body: JSON.stringify({}, null, 2),
              isBase64Encoded: false,
            });
          }

          if (post.status !== 'public' && (!userInfo || (userInfo && !['admin'].includes(userInfo.user.role)))) {
            return callback({
              statusCode: 401,
              headers: getResponseHeaders(),
              body: JSON.stringify({}, null, 2),
              isBase64Encoded: false,
            });
          }

          const postTags = await getPostTags(postId);

          if (pathFragments.length === 3) {
            return callback({
              statusCode: 200,
              headers: getResponseHeaders(),
              body: JSON.stringify({
                id: post.id,
                type: post.type,
                content: await getData(post.id, post.type),
                created_at: post.created_at,
                owner: post.owner ? await knex('users').select('name', 'id').where('id', post.owner).first() : null,
                tags: postTags
              }, null, 2),
              isBase64Encoded: false,
            });
          }

          if (pathFragments.length === 4 && pathFragments[3] === 'tags') {
            return callback({
              statusCode: 200,
              headers: getResponseHeaders(),
              body: JSON.stringify(postTags, null, 2),
              isBase64Encoded: false,
            });
          }
        }

        if (pathFragments[2] === 'bounds') {
          const bounds = (await knex('posts')
            .where('status', 'public')
            .min('created_at as oldest')
            .max('created_at as newest')
            .first()) || { oldest: null, newest: null };
          return callback({
            statusCode: 200,
            headers: getResponseHeaders(),
            body: JSON.stringify(bounds, null, 2),
            isBase64Encoded: false,
          });
        }

        if (pathFragments.length === 2) {
          let status = 'public';
          if (
            userInfo
            && ['admin'].includes(userInfo.user.role)
            && queryStringParameters
            && ['public', 'pending', 'moderated', 'deleted'].includes(queryStringParameters.status)
          ) {
            status = queryStringParameters.status;
          }

          const postsPromise = knex
            .select('id', 'owner', 'type', 'created_at')
            .from('posts')
            .orderBy('created_at', 'desc')
            .where('status', status);

          if (event.queryStringParameters) {
            const { before, since } = event.queryStringParameters;

            if (before) {
              postsPromise.where('created_at', '<', before);
            }

            if (since) {
              postsPromise.where('created_at', '>=', since);
            }
          }

          const posts = await postsPromise;
          const postsToRender = await Promise.all(posts.map(async post => ({
            id: post.id,
            type: post.type,
            content: await getData(post.id, post.type),
            created_at: post.created_at,
            owner: post.owner ? await knex('users').select('name', 'id').where('id', post.owner).first() : null,
            tags: await getPostTags(post.id),
          })));

          return callback({
            statusCode: 200,
            headers: getResponseHeaders(),
            body: JSON.stringify(postsToRender, null, 2),
            isBase64Encoded: false,
          });
        }
      }

      if (httpMethod === 'PUT') {
        const { id } = (queryStringParameters || {});
        if (id && userInfo && ['admin'].includes(userInfo.user.role)) {
          const payload = JSON.parse(event.body);

          if (!payload.status) throw new Error('no status');
          if (!['public', 'pending', 'moderated', 'deleted'].includes(payload.status)) throw new Error('invalid status');

          if (payload.status === 'public') {
            let content = await getData(id, 'post');
            const tagMatches = matchAll(content, /#([a-z\u00C0-\u017F0-9]+)/gi).toArray();
            for (let i = 0; i < tagMatches.length; i++) {
              const tagRaw = tagMatches[i];
              const existingTag = await knex('tags').select('id', 'type').where('name', tagRaw).first();
              if (existingTag) {
                tagMatches.splice(i, 1);
                content = content.replace(`#${tagRaw}`, `#!${existingTag.id}`);
              }
            }
            const newTags = tagMatches.map(text => ({
              id: uuid(),
              name: text,
              type: 'text',
            }));

            for (let i = 0; i < newTags.length; i++) {
              await knex.insert(newTags[i]).into('tags')
            }

            newTags.forEach(tag => {
              content = content.replace(`#${tag.name}`, `#!${tag.id}`);
            });

            await setData(id, 'post', content);
          }

          await knex('posts').where({ id: id }).update({ status: payload.status })
        }

        return callback({
          statusCode: 201,
          headers: getResponseHeaders(),
          body: '',
          isBase64Encoded: false,
        });
      }

      if (httpMethod === 'POST') {
        if (pathFragments.length === 2) {
          const payload = JSON.parse(event.body);
          if (!payload.content) throw new Error('no content');
          const post = {
            id: uuid(),
            type: 'post',
            status: 'pending',
            created_at: Date.now(),
            owner: userInfo ? userInfo.user.id : null,
          };
          let content = payload.content;
          content = content.trim();
          content = content.replace(/\n{3,}/gi, '\n\n');
          content = content.replace(/&nbsp;/gi, ' ');
          content = content.replace(/<[^>]*>/g, ''); //strip html
          await setData(post.id, post.type, content);
          await knex.insert(post).into('posts');
          return callback({
            statusCode: 200,
            headers: getResponseHeaders(),
            body: JSON.stringify(post, null, 2),
            isBase64Encoded: false,
          });
        }

        if (/[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}/gi.test(pathFragments[2])) {
          if (!userInfo || (userInfo && !['admin'].includes(userInfo.user.role))) {
            return callback({
              statusCode: 401,
              headers: getResponseHeaders(),
              body: '',
              isBase64Encoded: false,
            })
          }
          const postId = pathFragments[2];
          const postTags = await knex('posts_tags')
            .leftJoin('tags', 'tags.id', 'posts_tags.tag_id')
            .where('posts_tags.post_id', postId)
            .select('tags.id', 'tags.name', 'tags.type');
          if (pathFragments[3] === 'tags') {
            const payload = JSON.parse(event.body);
            if (!payload.id) throw new Error('no tag id specified');

            const tagId = payload.id;
            if (postTags.find(tag => tag.id === tagId)) {
              return callback({
                statusCode: 400,
                headers: getResponseHeaders(),
                body: '',
                isBase64Encoded: false,
              });
            }

            await knex.insert({
              post_id: postId,
              tag_id: tagId,
            }).into('posts_tags');

            return callback({
              statusCode: 200,
              headers: getResponseHeaders(),
              body: '',
              isBase64Encoded: false,
            });
          }
        }
      }

      if (httpMethod === 'DELETE') {
        if (/[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}/gi.test(pathFragments[2])) {
          const postId = pathFragments[2];
          const postTags = await knex('posts_tags')
            .leftJoin('tags', 'tags.id', 'posts_tags.tag_id')
            .where('posts_tags.post_id', postId)
            .select('tags.id', 'tags.name', 'tags.type');
          if (pathFragments[3] === 'tags') {
            if (!userInfo || (userInfo && !['admin'].includes(userInfo.user.role))) {
              return callback({
                statusCode: 401,
                headers: getResponseHeaders(),
                body: '',
                isBase64Encoded: false,
              })
            }
            if (/[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}/gi.test(pathFragments[4])) {
              const tagId = pathFragments[4];
              if (!postTags.find(tag => tag.id === tagId)) throw new Error('tag not assigned to post');

              await knex('posts_tags')
                .where({
                  post_id: postId,
                  tag_id: tagId,
                })
                .delete();

              return callback({
                statusCode: 200,
                headers: getResponseHeaders(),
                body: '',
                isBase64Encoded: false,
              });
            }
          }
        }
      }
    }

    /** @route /api/tags */
    if (pathFragments[1] === 'tags') {
      if (httpMethod === 'OPTIONS') {
        return callback({
          statusCode: 200,
          headers: getResponseHeaders(),
          body: '',
          isBase64Encoded: false,
        });
      }

      if (httpMethod === 'GET') {
        if (pathFragments.length === 3 && /[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}/gi.test(pathFragments[2])) {
          const tag = await knex('tags').select('id', 'name', 'type').where('id', pathFragments[2]).first();

          if (!tag) {
            return callback({
              statusCode: 404,
              headers: getResponseHeaders(),
              body: JSON.stringify({}, null, 2),
              isBase64Encoded: false,
            });
          }

          return callback({
            statusCode: 200,
            headers: getResponseHeaders(),
            body: JSON.stringify(tag, null, 2),
            isBase64Encoded: false,
          });
        }

        if (pathFragments.length === 2) {
          const tagsPromise = knex('tags').select('id', 'name', 'type');

          if (queryStringParameters) {
            if (queryStringParameters.s && !queryStringParameters.exact) {
              tagsPromise.where('name', 'like', `%${queryStringParameters.s}%`)
            }

            if (queryStringParameters.s && queryStringParameters.exact) {
              tagsPromise.where('name', queryStringParameters.s)
            }
          }
          const tags = await tagsPromise;

          return callback({
            statusCode: 200,
            headers: getResponseHeaders(),
            body: JSON.stringify(tags, null, 2),
            isBase64Encoded: false,
          });
        }
      }

      if (httpMethod === 'POST') {
        if (pathFragments.length === 2) {
          const payload = JSON.parse(event.body);

          if (!payload.name) throw new Error('no name');
          if (!payload.type) throw new Error('no type');
          if (!userInfo) throw new Error('Not logged in');
          if (!['admin'].includes(userInfo.user.role)) throw new Error('Not authorized');

          const tag = {
            id: uuid(),
            name: payload.name,
            type: payload.type,
          };

          await knex.insert(tag).into('tags');

          return callback({
            statusCode: 200,
            headers: getResponseHeaders(),
            body: JSON.stringify(tag, null, 2),
            isBase64Encoded: false,
          });
        }
      }
    }

    /** @route /api/user */
    if (pathFragments[1] === 'user') {
      if (pathFragments.length === 2) {
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
            const activateUrl = new URL(`${process.env.SITE_PROTOCOL}://${process.env.SITE_DOMAIN}/login`);
            activateUrl.searchParams.set('session', session.id);
            transporter.sendMail({
              from: process.env.NODEMAILER_USER || 'sender@example.com',
              to: payload.value,
              subject: 'Bejelentkezés',
              encoding: 'utf-8',
              html: verifyLoginTemplate({
                title: 'Bejelentkezés',
                code: session.secret,
                activateUrl: activateUrl.toString(),
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
                return callback({
                  statusCode: 400,
                  headers: getResponseHeaders({}),
                  body: '',
                  isBase64Encoded: false,
                });
              } else {
                console.log('mail sent to', payload.value);
                const expires = moment().add(1, 'year');
                return callback({
                  statusCode: 200,
                  headers: getResponseHeaders({
                    'Set-Cookie': `sessionId=${session.id}; Expires=${expires.format('ddd, DD MMM YYYY HH:mm:ss')} GMT; Path=/`
                  }),
                  body: JSON.stringify({ sessionId: session.id }, null, 2),
                  isBase64Encoded: false,
                });
              }
            });
            return;
          }
        }

        if (httpMethod === 'GET') {
          if (pathFragments.length === 3 && /[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}/gi.test(pathFragments[2])) {
            const user = await knex('users').select('name').where('id', event.pathFragments[2]).first();

            if (!user) {
              return callback({
                statusCode: 404,
                headers: getResponseHeaders(),
                body: JSON.stringify({}, null, 2),
                isBase64Encoded: false,
              });
            }

            return callback({
              statusCode: 200,
              headers: getResponseHeaders(),
              body: JSON.stringify(user, null, 2),
              isBase64Encoded: false,
            });
          }

          if (pathFragments.length === 2) {
            if (!userInfo) {
              const expires = moment().subtract(1, 'year');
              return callback({
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

            return callback({
              statusCode: 200,
              headers: getResponseHeaders(),
              body: JSON.stringify(userInfo, null, 2),
              isBase64Encoded: false,
            });
          }
        }
      }

      if (pathFragments[2] === 'name') {
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
      }
    }

    callback({
      statusCode: 404,
      headers: getResponseHeaders(),
      body: '',
      isBase64Encoded: false,
    });
  } catch (e) {
    console.log(e);
    callback({
      statusCode: 400,
      headers: getResponseHeaders(),
      body: JSON.stringify({ message: `Something isn't quite right.` }),
      isBase64Encoded: false,
    });
  }
};