const uuid = require('uuid/v4');
const cookie = require('cookie');
const matchAll = require('match-all');
const createDatabase = require('lib/utils/createDatabase');
const getData = require('lib/utils/getData');
const setData = require('lib/utils/setData');
const getUserInfoFromSession = require('lib/utils/getUserInfoFromSession');

const keepAliveTimeout = 1000; //15 * 60 * 1000;
const keepAliveCallback = () => {
  // console.log('shutting down due to inactivity.');
  process.exit();
};
let keepAliveTimer = setTimeout(keepAliveCallback, keepAliveTimeout);
const getResponseHeaders = (headers = {}) => ({
  'Content-Type': 'application/json; charset=utf-8',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, PUT, GET, OPTIONS',
  ...headers,
});

process.on('message', async event => {
  clearTimeout(keepAliveTimer);
  keepAliveTimer = setTimeout(keepAliveCallback, keepAliveTimeout);

  try {
    const knex = await createDatabase();
    const httpMethod = (event.httpMethod || '').toUpperCase();
    const cookiesRaw = event.headers.Cookie || event.headers.cookie || '';
    const cookies = cookie.parse(cookiesRaw);
    let userInfo = null;

    if (cookies.sessionId) {
      userInfo = await getUserInfoFromSession(cookies.sessionId);
    }

    if (httpMethod === 'OPTIONS') {
      process.send({
        statusCode: 200,
        headers: getResponseHeaders(),
        body: '',
        isBase64Encoded: false,
      });
    }

    if (httpMethod === 'PUT') {
      const { id } = (event.queryStringParameters || {});
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
          await Promise.all(
            newTags.map(tag => knex.insert(tag).into('tags'))
          );
          newTags.forEach(tag => {
            content = content.replace(`#${tag.name}`, `#!${tag.id}`);
          });

          const matches = matchAll(content, /#!([a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12})/gi).toArray();
          for (let i = 0; i < matches.length; i++) {
            const existing = await knex('posts_tags').select('*').where({ post_id: id, tag_id: matches[i] }).first();

            if (!existing) {
              await knex.insert({
                post_id: id,
                tag_id: matches[i],
              }).into('posts_tags');
            }
          }

          await setData(id, 'post', content);
        }

        await knex('posts').where({ id: id }).update({ status: payload.status })
      }

      process.send({
        statusCode: 201,
        headers: getResponseHeaders(),
        body: '',
        isBase64Encoded: false,
      });
    }

    if (httpMethod === 'GET') {
      if (event.pathFragments.length === 3 && /[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}/gi.test(event.pathFragments[2])) {
        const post = await knex('posts').select('id', 'owner', 'type', 'status', 'created_at').where('id', event.pathFragments[2]).first();

        if (!post) {
          return process.send({
            statusCode: 404,
            headers: getResponseHeaders(),
            body: JSON.stringify({}, null, 2),
            isBase64Encoded: false,
          });
        }

        if (post.status !== 'public' && (!userInfo || (userInfo && !['admin'].includes(userInfo.user.role)))) {
          return process.send({
            statusCode: 401,
            headers: getResponseHeaders(),
            body: JSON.stringify({}, null, 2),
            isBase64Encoded: false,
          });
        }

        return process.send({
          statusCode: 200,
          headers: getResponseHeaders(),
          body: JSON.stringify({
            id: post.id,
            type: post.type,
            content: await getData(post.id, post.type),
            created_at: post.created_at,
            owner: post.owner || null,
          }, null, 2),
          isBase64Encoded: false,
        });
      }

      let status = 'public';
      if (
        userInfo
        && ['admin'].includes(userInfo.user.role)
        && event.queryStringParameters
        && ['public', 'pending', 'moderated', 'deleted'].includes(event.queryStringParameters.status)
      ) {
        status = event.queryStringParameters.status;
      }

      if (event.path.indexOf('/api/posts') === 0) {
        // TODO: add infinite scrolling
        const posts = await knex
          .select('id', 'owner', 'type', 'created_at')
          .from('posts')
          .orderBy('created_at', 'desc')
          .where('status', status)
          .limit(10).offset(0);
        const postsToRender = await Promise.all(posts.map(async post => ({
          id: post.id,
          type: post.type,
          content: await getData(post.id, post.type),
          created_at: post.created_at,
          owner: post.owner || null,
        })));

        process.send({
          statusCode: 200,
          headers: getResponseHeaders(),
          body: JSON.stringify(postsToRender, null, 2),
          isBase64Encoded: false,
        });
      }
    }

    if (httpMethod === 'POST') {
      if (event.path.indexOf('/api/posts') === 0) {
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
        content = content.replace(/&nbsp;/gi, ' ');
        content = content.replace(/<[^>]*>/g, ''); //strip html
        await setData(post.id, post.type, content);
        await knex.insert(post).into('posts');
        process.send({
          statusCode: 200,
          headers: getResponseHeaders(),
          body: JSON.stringify(post, null, 2),
          isBase64Encoded: false,
        });
      }
    }
  } catch (e) {
    console.log(e);
    process.send({
      statusCode: 400,
      headers: getResponseHeaders(),
      body: JSON.stringify({ message: `Something isn't quite right.` }),
      isBase64Encoded: false,
    });
  }
});
