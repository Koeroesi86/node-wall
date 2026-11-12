import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { loadBrowser, type Browser } from '../../../lib/test-utils/browser';

let browser: Browser;

beforeEach(async () => {
  browser = await loadBrowser(['public/static/utils/post.ts', 'public/static/utils/comments.ts']);
});

afterEach(() => browser.close());

const parsePostContent = (content: string, postId = 'p1') => browser.evaluate<(c: string, p: string) => string>('window.parsePostContent')(content, postId);
const parseCommentContent = (content: string) => browser.evaluate<(c: string) => string>('window.parseCommentContent')(content);

describe('parsePostContent', () => {
  test('wraps every line', () => {
    expect(parsePostContent('one\ntwo')).toBe('<div class="contentLine">one</div>\n<div class="contentLine">two</div>');
  });

  test('trims the content and collapses runs of blank lines', () => {
    expect(parsePostContent('  one\n\n\n\n\ntwo  ')).toBe('<div class="contentLine">one</div>\n<div class="contentLine">&nbsp;</div>\n<div class="contentLine">two</div>');
  });

  test('turns urls into link previews', () => {
    expect(parsePostContent('see https://example.com/a?b=1 now'))
      .toBe('<div class="contentLine">see <a is="link-preview" href="https://example.com/a?b=1" post-id="p1"></a> now</div>');
  });

  test('turns www addresses into https link previews', () => {
    expect(parsePostContent('go to www.example.com'))
      .toBe('<div class="contentLine">go to <a is="link-preview" href="https://www.example.com" post-id="p1"></a></div>');
  });

  test('turns tag references into tag elements', () => {
    const id = '11111111-2222-3333-4444-555555555555';
    expect(parsePostContent(`about #!${id}`)).toBe(`<div class="contentLine">about <tag-inline tag-id="${id}"></tag-inline></div>`);
  });

  test('escapes markup in the content', () => {
    expect(parsePostContent('<b>bold</b><script>alert(1)</script>')).toBe('<div class="contentLine">&lt;b&gt;bold&lt;/b&gt;&lt;script&gt;alert(1)&lt;/script&gt;</div>');
  });

  test('does not turn entity-encoded markup into elements', () => {
    expect(parsePostContent('&lt;img src=x onerror=alert(1)&gt;')).toBe('<div class="contentLine">&lt;img src=x onerror=alert(1)&amp;gt;</div>');
    expect(parsePostContent('&amp;lt;b&amp;gt;')).not.toMatch(/<b>/);
  });

  test('handles content that is not a string', () => {
    expect(parsePostContent(undefined as never)).toBe('<div class="contentLine">undefined</div>');
  });
});

describe('parseCommentContent', () => {
  test('wraps every line', () => {
    expect(parseCommentContent('one\ntwo')).toBe('<div class="line">one</div>\n<div class="line">two</div>');
  });

  test('keeps blank lines visible and collapses long runs', () => {
    expect(parseCommentContent('one\n\n\n\n\ntwo')).toBe('<div class="line">one</div>\n<div class="line">&nbsp;</div>\n<div class="line">two</div>');
  });

  test('escapes markup', () => {
    expect(parseCommentContent('<img src=x onerror=alert(1)>')).toBe('<div class="line">&lt;img src=x onerror=alert(1)&gt;</div>');
  });

  test('trims the content', () => {
    expect(parseCommentContent('  hi  ')).toBe('<div class="line">hi</div>');
  });
});

describe('requests', () => {
  type Api = {
    getPost: (id: string) => Promise<unknown>;
    createPost: (content?: string) => Promise<unknown>;
    getComment: (id: string) => Promise<unknown>;
    createComment: (postId: string, body: string, parent?: string) => Promise<unknown>;
  };
  const api = () => browser.window as unknown as Api;
  const flush = () => new Promise(resolve => setTimeout(resolve, 0));

  test('getPost fetches a post', async () => {
    const result = api().getPost('p1');
    expect(browser.requests[0]).toMatchObject({ method: 'GET', url: '/api/posts/p1' });
    browser.requests[0].respond(200, { id: 'p1' });
    expect(await result).toEqual({ id: 'p1' });
  });

  test('getPost rejects with the request on failure', async () => {
    const result = api().getPost('p1');
    browser.requests[0].respond(404);
    await expect(result).rejects.toMatchObject({ readyState: 4, status: 404 });
  });

  test('createPost sends the content as JSON', async () => {
    const result = api().createPost('hello');
    expect(browser.requests[0]).toMatchObject({
      method: 'POST',
      url: '/api/posts',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'hello' }),
    });
    browser.requests[0].respond(200);
    await expect(result).resolves.toMatchObject({ readyState: 4, status: 200 });
  });

  test('createPost defaults to empty content and rejects on failure', async () => {
    const result = api().createPost();
    expect(browser.requests[0].body).toBe(JSON.stringify({ content: '' }));
    browser.requests[0].respond(401);
    await expect(result).rejects.toMatchObject({ readyState: 4, status: 401 });
  });

  test('getComment fetches a comment', async () => {
    const result = api().getComment('c1');
    expect(browser.requests[0]).toMatchObject({ method: 'GET', url: '/api/comment/c1' });
    browser.requests[0].respond(200, { id: 'c1' });
    expect(await result).toEqual({ id: 'c1' });
  });

  test('getComment rejects on failure', async () => {
    const result = api().getComment('c1');
    browser.requests[0].respond(500);
    await expect(result).rejects.toMatchObject({ readyState: 4, status: 500 });
  });

  test('createComment sends body, parent and post', async () => {
    const result = api().createComment('p1', 'hi', 'c0');
    expect(browser.requests[0]).toMatchObject({
      method: 'POST',
      url: '/api/comment',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: 'hi', parent: 'c0', postId: 'p1' }),
    });
    browser.requests[0].respond(200, { id: 'c9' });
    expect(await result).toEqual({ id: 'c9' });
  });

  test('createComment rejects on failure', async () => {
    const result = api().createComment('p1', 'hi');
    browser.requests[0].respond(400);
    await expect(result).rejects.toMatchObject({ readyState: 4, status: 400 });
    await flush();
  });
});

