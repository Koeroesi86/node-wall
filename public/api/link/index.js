const uuid = require('uuid/v4');
const axios = require('axios');
const { JSDOM } = require("jsdom");
const createDatabase = require('lib/utils/createDatabase');
const getData = require('lib/utils/getData');
const setData = require('lib/utils/setData');

const keepAliveTimeout = 30 * 1000;
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
    const httpMethod = (event.httpMethod || '').toUpperCase();
    const knex = await createDatabase();

    if (httpMethod === 'GET') {
      if (event.queryStringParameters) {
        const { uri, post } = event.queryStringParameters;
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

    throw new Error('Not supported request');
  } catch (e) {
    callback({
      statusCode: 400,
      headers: getResponseHeaders(),
      body: JSON.stringify({ message: `${e}` }, null, 2),
      isBase64Encoded: false,
    });
  }
};
