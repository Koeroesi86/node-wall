const uuid = require('uuid/v4');
const axios = require('axios');
const create = require('./queries/create');
const getByUrl = require('./queries/getByUrl');
const storageService = require("../storage");
const { JSDOM } = require("jsdom");

module.exports = {
  /**
   * @param {string} url
   * @returns {Promise<*>}
   */
  create: async (url) => {
    const id = uuid();

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


    await create(id, url);
    await storageService.write(id, 'link', JSON.stringify(newLinkData, null, 2));

    return newLinkData;
  },
  /**
   * @param {string} url
   * @returns {Promise<*>}
   */
  getByUrl: async (url) => getByUrl(url),
  /**
   * @param {string} id
   * @returns {Promise<string>}
   */
  getData: async (id) => storageService.read(id, 'link'),
};
