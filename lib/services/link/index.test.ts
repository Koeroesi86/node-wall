import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import storage from '../storage';
import create from './queries/create';
import getByUrl from './queries/getByUrl';
import linkService from './index';

vi.mock('uuid', () => ({ v4: () => 'new-id' }));
vi.mock('../storage');
vi.mock('./queries/create');
vi.mock('./queries/getByUrl');

const fetchMock = vi.fn();

const htmlResponse = (html: string, init: ResponseInit = { headers: { 'content-type': 'text/html; charset=utf-8' } }) => new Response(html, init);

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => vi.unstubAllGlobals());

describe('create', () => {
  test('extracts title, description and image and stores the result', async () => {
    fetchMock.mockResolvedValue(htmlResponse(`
      <html><head>
        <title>Page title</title>
        <meta property="og:description" content="fb description" />
        <meta property="og:image" content="//cdn.example.com/a.png" />
      </head></html>`));

    const data = await linkService.create('https://example.com/page');

    expect(data).toEqual({
      'content-type': 'text/html; charset=utf-8',
      title: 'Page title',
      description: 'fb description',
      image: 'https://cdn.example.com/a.png',
      url: 'https://example.com/page',
      embedCode: '',
    });
    expect(create).toHaveBeenCalledWith('new-id', 'https://example.com/page');
    expect(storage.write).toHaveBeenCalledWith('new-id', 'link', JSON.stringify(data, null, 2));
  });

  test('prefers twitter metadata over open graph', async () => {
    fetchMock.mockResolvedValue(htmlResponse(`
      <head><title>t</title>
        <meta property="og:image" content="fb.png" /><meta property="twitter:image" content="tw.png" />
        <meta property="og:description" content="fb" /><meta property="twitter:description" content="tw" />
      </head>`));

    const data = await linkService.create('https://example.com');

    expect(data).toMatchObject({ image: 'tw.png', description: 'tw' });
  });

  test('builds an embed code for YouTube links', async () => {
    fetchMock.mockResolvedValue(htmlResponse('<head><title>v</title></head>'));

    const data = await linkService.create('https://www.youtube.com/watch?v=abc123');

    expect(data.embedCode).toBe('<iframe src="https://www.youtube.com/embed/abc123"></iframe>');
  });

  test('defaults to empty values when the page has no metadata', async () => {
    fetchMock.mockResolvedValue(htmlResponse('<html></html>'));

    expect(await linkService.create('https://example.com')).toMatchObject({ title: '', description: '', image: '' });
  });

  test('fails on a non-2xx response without storing anything', async () => {
    fetchMock.mockResolvedValue(new Response('', { status: 404 }));

    await expect(linkService.create('https://example.com')).rejects.toThrow('Request failed (404)');
    expect(create).not.toHaveBeenCalled();
    expect(storage.write).not.toHaveBeenCalled();
  });

  test('fails on non-HTML content', async () => {
    fetchMock.mockResolvedValue(new Response('{}', { headers: { 'content-type': 'application/json' } }));

    await expect(linkService.create('https://example.com')).rejects.toThrow('Not yet supported type');
    expect(storage.write).not.toHaveBeenCalled();
  });
});

test('getByUrl delegates to the query', async () => {
  vi.mocked(getByUrl).mockResolvedValue({ id: 'l1' });
  expect(await linkService.getByUrl('https://example.com')).toEqual({ id: 'l1' });
});

test('getData reads the stored link', async () => {
  vi.mocked(storage.read).mockResolvedValue('{}');
  expect(await linkService.getData('l1')).toBe('{}');
  expect(storage.read).toHaveBeenCalledWith('l1', 'link');
});
