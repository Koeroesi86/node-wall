const axios = require('axios');
const { JSDOM } = require("jsdom");
// const createDatabase = require('lib/utils/createDatabase');
// const getData = require('lib/utils/getData');
// const setData = require('lib/utils/setData');

const keepAliveTimeout = 1000; //15 * 60 * 1000;
const keepAliveCallback = () => {
  // console.log('shutting down due to inactivity.');
  process.exit();
};
let keepAliveTimer = setTimeout(keepAliveCallback, keepAliveTimeout);
const getResponseHeaders = (headers = {}) => ({
  'Content-Type': 'application/json; charset=utf-8',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  ...headers,
});

process.on('message', async event => {
  clearTimeout(keepAliveTimer);
  keepAliveTimer = setTimeout(keepAliveCallback, keepAliveTimeout);

  try {
    const httpMethod = (event.httpMethod || '').toUpperCase();

    if (httpMethod === 'GET') {
      if (event.queryStringParameters) {
        const { uri } = event.queryStringParameters;
        if (!uri) throw new Error('No uri specified');

        const response = await axios({
          method: 'get',
          url: uri,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/77.0.3865.93 Safari/537.36 Vivaldi/2.8.1664.40',
          }
        });

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
          //?autoplay=0&fs=0&iv_load_policy=3&showinfo=0&rel=0&cc_load_policy=0&start=0&end=0&origin=https://youtubeembedcode.com
          embedCode = `<iframe src="https://www.youtube.com/embed/${videoId}"></iframe>`;
        }

        return process.send({
          statusCode: 200,
          headers: getResponseHeaders(),
          body: JSON.stringify({
            'content-type': response.headers['content-type'],
            title,
            description,
            image,
            url: uri,
            embedCode,
            // headers,
            // headers: response.headers,
          }, null, 2),
          isBase64Encoded: false,
        });
      }
    }

    throw new Error('Not supported request');
  } catch (e) {
    process.send({
      statusCode: 400,
      headers: getResponseHeaders(),
      body: JSON.stringify({ message: `${e}` }, null, 2),
      isBase64Encoded: false,
    });
  }
});
