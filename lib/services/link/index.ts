import { v4 as uuid } from 'uuid';
import axios from 'axios';
import create from './queries/create';
import getByUrl from './queries/getByUrl';
import storageService from '../storage';
import { JSDOM } from 'jsdom';

export default {
  create: async (url: string) => {
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

    const title = dom.window.document.querySelector('head title')?.textContent ?? '';
    const headers = [...dom.window.document.querySelectorAll("head meta")].map(meta => ({
      name: meta.getAttribute('name') ?? '',
      property: meta.getAttribute('property') ?? '',
      'http-equiv': meta.getAttribute('http-equiv') ?? '',
      content: meta.getAttribute('content') ?? '',
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

    const videoId = url.match(/^https:\/\/www.youtube.com\/watch\?v=(.+)/)?.[1];
    const embedCode = videoId ? `<iframe src="https://www.youtube.com/embed/${videoId}"></iframe>` : '';

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
  getByUrl: async (url: string) => getByUrl(url),
  getData: async (id: string) => storageService.read(id, 'link'),
};
