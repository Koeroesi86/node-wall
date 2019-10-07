const uuid = require('uuid');
const createDatabase = require('lib/utils/createDatabase');
// const getData = require('lib/utils/getData');
// const setData = require('lib/utils/setData');

const keepAliveTimeout = 1000; //15 * 60 * 1000;
const keepAliveCallback = () => {
  // console.log('shutting down due to inactivity.');
};
let keepAliveTimer = setTimeout(keepAliveCallback, keepAliveTimeout);
const getResponseHeaders = (headers = {}) => ({
  'Content-Type': 'application/json; charset=utf-8',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  ...headers,
});

module.exports = async (event, callback) => {
  clearTimeout(keepAliveTimer);
  keepAliveTimer = setTimeout(keepAliveCallback, keepAliveTimeout);

  try {
    const knex = await createDatabase();
    const httpMethod = (event.httpMethod || '').toUpperCase();

    if (httpMethod === 'OPTIONS') {
      callback({
        statusCode: 200,
        headers: getResponseHeaders(),
        body: '',
        isBase64Encoded: false,
      });
    }

    if (httpMethod === 'GET') {
      if (event.pathFragments.length === 3 && /[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}/gi.test(event.pathFragments[2])) {
        const tag = await knex('tags').select('id', 'name', 'type').where('id', event.pathFragments[2]).first();

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

      const tagsPromise = knex('tags').select('id', 'name', 'type');
      //.where('type', 'text')
      if (event.queryStringParameters) {
        if (event.queryStringParameters.s) {
          tagsPromise.where('name', 'like', `%${event.queryStringParameters.s}%`)
        }
      }
      const tags = await tagsPromise;

      callback({
        statusCode: 200,
        headers: getResponseHeaders(),
        body: JSON.stringify(tags, null, 2),
        isBase64Encoded: false,
      });
    }

    if (httpMethod === 'POST') {
      const payload = JSON.parse(event.body);
      if (!payload.name) throw new Error('no name');
      if (!payload.type) throw new Error('no type');
      const tag = {
        id: uuid(),
        name: payload.name,
        type: payload.type,
      };
      await knex.insert(tag).into('tags');
      callback({
        statusCode: 200,
        headers: getResponseHeaders(),
        body: JSON.stringify(tag, null, 2),
        isBase64Encoded: false,
      });
    }
  } catch (e) {
    callback({
      statusCode: 400,
      headers: getResponseHeaders(),
      body: JSON.stringify({ message: `${e}` }, null, 2),
      isBase64Encoded: false,
    });
  }
};
