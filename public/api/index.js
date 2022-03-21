const { v4: uuid } = require('uuid');
const cookie = require('cookie');
const crypto = require('crypto');
const moment = require('moment');
const matchAll = require('match-all');
const storageService = require('lib/services/storage');
const postService = require('lib/services/post');
const commentService = require('lib/services/comment');
const sessionService = require('lib/services/session');
const linkService = require('lib/services/link');
const tagService = require('lib/services/tag');
const userService = require('lib/services/user');
const getUserInfoFromSession = require('lib/utils/getUserInfoFromSession');
const getUserSessions = require('lib/utils/getUserSessions');
const generateCode = require('lib/utils/generateCode');
const verifyLoginTemplate = require('lib/templates/email/verifyLogin');
const createMailer = require('lib/utils/createMailer');
const getTranslation = require('lib/translations/getTranslation');
const detectLanguage = require('lib/utils/detectLanguage');

const keepAliveTimeout = 30 * 1000;
const keepAliveCallback = () => {
  console.log('Shutting down API due to inactivity.');
  process.exit(0);
};
let keepAliveTimer = setTimeout(keepAliveCallback, keepAliveTimeout);
const getResponseHeaders = (headers = {}) => ({
  'Content-Type': 'application/json; charset=utf-8',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, PUT, GET, DELETE, OPTIONS',
  ...headers,
});
const transporter = createMailer();

module.exports = async (event, callback) => {
  clearTimeout(keepAliveTimer);
  keepAliveTimer = setTimeout(keepAliveCallback, keepAliveTimeout);

  try {
    const httpMethod = (event.httpMethod || '').toUpperCase();
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
      if (!await storageService.has(cookies.sessionId, 'session')) {
        await storageService.write(cookies.sessionId, 'session', JSON.stringify({
          userAgent: headers['user-agent'],
          remoteAddress: event.remoteAddress,
        }, null, 2));
      }

      await sessionService.setLastActive(cookies.sessionId, Date.now());
    }

    /** @route /api/link */
    if (pathFragments[1] === 'link') {
      if (httpMethod === 'GET') {
        if (!queryStringParameters) throw new Error('no queryStringParameters');
        const { uri, post } = queryStringParameters;
        if (!uri) throw new Error('No uri specified');
        if (!post) throw new Error('No post specified');
        if (!/[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}/gi.test(post)) throw new Error('Invalid post id');

        const postContent = await storageService.read(post, 'post');
        if (!(postContent || '').includes(uri.replace(/^https?:\/\//, ''))) throw new Error('Uri not present in post.');

        let url = uri;

        if (/^http:/.test(url)) {
          url = url.replace(/^http:/, 'https:');
        }

        const existingLink = await linkService.getByUrl(url);

        if (existingLink) {
          const linkData = await linkService.getData(existingLink.id);

          if (linkData) {
            return callback({
              statusCode: 200,
              headers: getResponseHeaders(),
              body: linkData,
              isBase64Encoded: false,
            });
          }
        }

        const postRecord = await postService.get(post);
        if (postRecord && postRecord.status === 'public') {
          const data = await linkService.create(url);

          return callback({
            statusCode: 200,
            headers: getResponseHeaders(),
            body: JSON.stringify(data, null, 2),
            isBase64Encoded: false,
          });
        }

        return callback({
          statusCode: 400,
          headers: getResponseHeaders(),
          body: JSON.stringify({}, null, 2),
          isBase64Encoded: false,
        });
      }
    }

    /** @route /api/comment */
    if (pathFragments[1] === 'comment') {
      if (httpMethod === 'POST' && pathFragments.length === 2) {
        const payload = JSON.parse(event.body);
        const owner = userInfo ? userInfo.user.id : null;

        if (!payload.postId) {
          throw new Error('no postId defined');
        }

        await postService.createComment(payload.postId, payload.parent, owner, payload.body);

        return callback({
          statusCode: 200,
          headers: getResponseHeaders(),
          body: JSON.stringify({}, null, 2),
          isBase64Encoded: false,
        });
      }

      if (httpMethod === 'GET' && pathFragments[2] && /[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}/gi.test(pathFragments[2])) {
        const id = pathFragments[2];
        const comment = await commentService.get(id);

        return callback({
          statusCode: 200,
          headers: getResponseHeaders(),
          body: JSON.stringify(comment, null, 2),
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

      if (httpMethod === 'PUT' && pathFragments[2] && /[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}/gi.test(pathFragments[2])) {
        const id = pathFragments[2];
        if (userInfo && ['admin'].includes(userInfo.user.role)) {
          const payload = JSON.parse(event.body);

          if (!payload.status) throw new Error('no status');
          if (!['public', 'pending', 'moderated', 'deleted'].includes(payload.status)) throw new Error('invalid status');

          if (payload.status === 'public') {
            let content = await storageService.read(id, 'post');
            const tagMatches = matchAll(content, /#([a-z\u00C0-\u017F0-9]+)/gi).toArray();
            for (let i = 0; i < tagMatches.length; i++) {
              const tagRaw = tagMatches[i];
              const existingTag = await tagService.getByName(tagRaw);
              if (existingTag) {
                tagMatches.splice(i, 1);
                content = content.replace(`#${tagRaw}`, `#!${existingTag.id}`);
              }
            }
            const newTags = await Promise.all(
              tagMatches.map(text => tagService.create(text, 'text'))
            );

            newTags.forEach(tag => {
              content = content.replace(`#${tag.name}`, `#!${tag.id}`);
            });

            await storageService.write(id, 'post', content);
          }

          await postService.setStatus(id, payload.status);

          return callback({
            statusCode: 201,
            headers: getResponseHeaders(),
            body: '',
            isBase64Encoded: false,
          });
        }

        return callback({
          statusCode: 401,
          headers: getResponseHeaders(),
          body: '',
          isBase64Encoded: false,
        });
      }

      if (httpMethod === 'GET') {
        if (/[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}/gi.test(pathFragments[2])) {
          const postId = pathFragments[2];
          const post = await postService.get(postId);

          if (!post) {
            console.log('postId', postId)
            console.log('post', post)
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

          const postTags = await postService.getTags(postId);

          if (pathFragments.length === 3) {
            return callback({
              statusCode: 200,
              headers: getResponseHeaders(),
              body: JSON.stringify({
                id: post.id,
                type: post.type,
                content: await postService.getContent(post.id, post.type),
                created_at: post.created_at,
                comments: (await postService.getComments(postId)).map(c => c.id),
                owner: post.owner ? await userService.get(post.owner) : null,
                tags: postTags
              }, null, 2),
              isBase64Encoded: false,
            });
          }

          if (pathFragments.length === 4) {
            if (pathFragments[3] === 'tags') {
              return callback({
                statusCode: 200,
                headers: getResponseHeaders(),
                body: JSON.stringify(postTags, null, 2),
                isBase64Encoded: false,
              });
            }
          }
        }

        if (pathFragments[2] === 'bounds') {
          const bounds = await postService.getBounds();

          return callback({
            statusCode: 200,
            headers: getResponseHeaders(),
            body: JSON.stringify(bounds, null, 2),
            isBase64Encoded: false,
          });
        }

        if (pathFragments.length === 2) {
          let status = 'public';
          let nextPageBefore = null;
          if (
            userInfo
            && ['admin'].includes(userInfo.user.role)
            && queryStringParameters
            && ['public', 'pending', 'moderated', 'deleted'].includes(queryStringParameters.status)
          ) {
            status = queryStringParameters.status;
          }

          let before = null;
          let since = null;
          let likedTags = [];
          let dislikedTags = [];

          if (event.queryStringParameters) {
            if (event.queryStringParameters.before) {
              before = event.queryStringParameters.before;
            }

            if (event.queryStringParameters.since) {
              since = event.queryStringParameters.since;
            }

            if (event.queryStringParameters.likedTags) {
              likedTags = event.queryStringParameters.likedTags.split(',');
            }

            if (event.queryStringParameters.dislikedTags) {
              dislikedTags = event.queryStringParameters.dislikedTags.split(',');
            }

            const nextPageBeforeResult = await postService.getNextPage(status, before, since, likedTags, dislikedTags);
            if (nextPageBeforeResult)  {
              nextPageBefore = nextPageBeforeResult.nextPageBefore;
            }
          }

          const posts = await postService.getList(status, before, since, likedTags, dislikedTags);

          const postsToRender = await Promise.all(posts.map(async post => ({
            id: post.id,
            type: post.type,
            created_at: post.created_at,
          })));

          return callback({
            statusCode: 200,
            headers: getResponseHeaders({
              ...(nextPageBefore && { 'x-next-page-before': nextPageBefore })
            }),
            body: JSON.stringify(postsToRender, null, 2),
            isBase64Encoded: false,
          });
        }
      }

      if (httpMethod === 'POST') {
        if (pathFragments.length === 2) {
          const payload = JSON.parse(event.body);
          if (!payload.content) throw new Error('no content');

          await postService.create(payload.content, userInfo ? userInfo.user.id : null)

          return callback({
            statusCode: 200,
            headers: getResponseHeaders(),
            body: JSON.stringify(post, null, 2),
            isBase64Encoded: false,
          });
        }

        if (/[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}/gi.test(pathFragments[2])) {
          if (pathFragments.length === 3 && !userInfo || (userInfo && !['admin'].includes(userInfo.user.role))) {
            return callback({
              statusCode: 401,
              headers: getResponseHeaders(),
              body: '',
              isBase64Encoded: false,
            })
          }
          const postId = pathFragments[2];
          const postTags = await postService.getTags(postId);

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

            await postService.addTag(postId, tagId);

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
          const postTags = await postService.getTags(postId);

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

              await postService.removeTag(postId, tagId);

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
          const tag = await tagService.get(pathFragments[2]);

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
          let search = '';
          let exact = false;

          if (queryStringParameters) {
            search = queryStringParameters.s || '';
            exact = !!queryStringParameters.exact;
          }

          const tags = await tagService.getList(search, exact);

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

          const tag = await tagService.create(payload.name, payload.type);

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
            const currentLogin = await userService.getLogin(payload.type, payload.value);

            if (!currentLogin) {
              throw new Error('no login yet');
            }

            login = currentLogin
          } catch (e) {
            const user = await userService.create(payload.name || null);
            login = await userService.addLogin(user.id, payload.value, payload.type);
          }

          const session = {
            id: uuid(),
            users_login_id: login.id,
            status: 'pending',
            secret: generateCode(),
          };
          const hash = crypto
            .createHash("sha256")
            .update(session.secret)
            .digest("hex");
          await sessionService.create(session.id, login.id, hash, 'pending');

          if (payload.type === 'email') {
            const verifyUrl = new URL(`${process.env.SITE_PROTOCOL}://${process.env.SITE_DOMAIN}/login/email`);
            verifyUrl.searchParams.set('code', session.secret);
            verifyUrl.searchParams.set('session', session.id);
            const activateUrl = new URL(`${process.env.SITE_PROTOCOL}://${process.env.SITE_DOMAIN}/login`);
            activateUrl.searchParams.set('session', session.id);
            transporter.sendMail({
              from: process.env.NODEMAILER_USER || 'sender@example.com',
              to: payload.value,
              subject: await getTranslation('email.verify.title', await detectLanguage(headers)),
              encoding: 'utf-8',
              html: await verifyLoginTemplate({
                language: await detectLanguage(headers),
                title: await getTranslation('email.verify.title', await detectLanguage(headers)),
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
          /** @route /api/user/<id> */
          if (pathFragments.length === 3 && /[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}/gi.test(pathFragments[2])) {
            const user = await userService.get(pathFragments[2]);

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

          /** @route /api/user */
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

      /** @route /api/user/sessions */
      if (pathFragments[2] === 'sessions' && userInfo) {
        if (pathFragments.length === 3 && httpMethod === 'GET') {
          const sessions = await Promise.all(
            (userInfo && userInfo.user ? await getUserSessions(userInfo.user.id) : [])
            .filter(session => session.sessionStatus !== 'deleted')
            .map(async session => ({
              ...session,
              sessionCreatedAt: new Date(session.sessionCreatedAt).valueOf(),
              details: await storageService.has(session.sessionId, 'session')
                ? JSON.parse(await storageService.read(session.sessionId, 'session'))
                : null,
            }))
        );
          return callback({
            statusCode: 200,
            headers: getResponseHeaders(),
            body: JSON.stringify(sessions, null, 2),
            isBase64Encoded: false,
          });
        }

        if (/[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}/gi.test(pathFragments[3]) && httpMethod === 'DELETE') {
          const sessions = await getUserSessions(userInfo.user.id);
          if (sessions.find(session => session.sessionId === pathFragments[3])) {
            await sessionService.remove(pathFragments[3]);

            return callback({
              statusCode: 200,
              headers: getResponseHeaders(),
              body: '',
              isBase64Encoded: false,
            });
          }
        }
      }

      /** @route /api/user/name */
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

          await userService.setName(userInfo.user.id, payload.name);

          return callback({
            statusCode: 200,
            headers: getResponseHeaders(),
            body: '',
            isBase64Encoded: false,
          });
        }
      }

      /** @route /api/user/tags */
      if (pathFragments[2] === 'tags') {
        if (httpMethod === 'GET') {
          if (!userInfo) {
            return callback({
              statusCode: 401,
              headers: getResponseHeaders(),
              body: JSON.stringify([], null, 2),
              isBase64Encoded: false,
            });
          }

          const tags = await userService.getTags(userInfo.user.id);

          return callback({
            statusCode: 200,
            headers: getResponseHeaders(),
            body: JSON.stringify(tags, null, 2),
            isBase64Encoded: false,
          });
        }

        if (httpMethod === 'PUT') {
          const payload = JSON.parse(event.body);
          if (!userInfo) throw new Error('not logged in');
          if (!payload.id) throw new Error('no id');
          if (!payload.type) throw new Error('no type');

          await userService.addTag(payload.id, userInfo.user.id, payload.type);

          return callback({
            statusCode: 200,
            headers: getResponseHeaders(),
            body: '',
            isBase64Encoded: false,
          });
        }

        if (httpMethod === 'DELETE') {
          const payload = JSON.parse(event.body);
          if (!userInfo) throw new Error('not logged in');
          if (!payload.id) throw new Error('no id');

          await userService.removeTag(payload.id, userInfo.user.id);

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
