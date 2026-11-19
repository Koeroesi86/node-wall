import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { loadBrowser, type Browser } from '../../../lib/test-utils/browser';

let browser: Browser;

beforeEach(async () => {
  browser = await loadBrowser(['public/static/utils/post.ts', 'public/static/utils/comments.ts']);
});

afterEach(() => browser.close());

describe('requests', () => {
  type Api = {
    getPost: (id: string) => Promise<unknown>;
    createPost: (content?: string) => Promise<unknown>;
    getComment: (id: string) => Promise<unknown>;
    createComment: (postId: string, body: string, parent?: string) => Promise<unknown>;
  };
  const api = () => browser.window as unknown as Api;
  const flush = () => new Promise(resolve => setTimeout(resolve, 0));

  const postId = '11111111-2222-3333-4444-555555555555';
  const parentId = '66666666-7777-8888-9999-000000000000';
  const postData = { id: 'p1', type: 'post', content: 'hello', created_at: 1, comments: [], owner: null, tags: [] };
  const commentData = { id: 'c1', post: 'p1', parent: null, created_at: 1, body: 'hi' };

  test('getPost fetches a post', async () => {
    const result = api().getPost('p1');
    expect(browser.requests[0]).toMatchObject({ method: 'GET', url: '/api/posts/p1' });
    browser.requests[0].respond(200, postData);
    expect(await result).toEqual(postData);
  });

  test('getPost rejects a response that does not match the schema', async () => {
    const result = api().getPost('p1');
    expect(() => browser.requests[0].respond(200, { id: 'p1' })).toThrow();
    result.catch(() => undefined);
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

  test('createPost refuses empty content without sending it', async () => {
    await expect(api().createPost()).rejects.toThrow();
    expect(browser.requests).toHaveLength(0);
  });

  test('createPost rejects on failure', async () => {
    const result = api().createPost('hello');
    browser.requests[0].respond(401);
    await expect(result).rejects.toMatchObject({ readyState: 4, status: 401 });
  });

  test('getComment fetches a comment', async () => {
    const result = api().getComment('c1');
    expect(browser.requests[0]).toMatchObject({ method: 'GET', url: '/api/comment/c1' });
    browser.requests[0].respond(200, commentData);
    expect(await result).toEqual(commentData);
  });

  test('getComment rejects on failure', async () => {
    const result = api().getComment('c1');
    browser.requests[0].respond(500);
    await expect(result).rejects.toMatchObject({ readyState: 4, status: 500 });
  });

  test('createComment sends body, parent and post', async () => {
    const result = api().createComment(postId, 'hi', parentId);
    expect(browser.requests[0]).toMatchObject({
      method: 'POST',
      url: '/api/comment',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId, parent: parentId, body: 'hi' }),
    });
    browser.requests[0].respond(200, {});
    await expect(result).resolves.toBeUndefined();
  });

  test('createComment refuses a body that is only whitespace without sending it', async () => {
    await expect(api().createComment(postId, '  ')).rejects.toThrow();
    expect(browser.requests).toHaveLength(0);
  });

  test('createComment rejects on failure', async () => {
    const result = api().createComment(postId, 'hi');
    browser.requests[0].respond(400);
    await expect(result).rejects.toMatchObject({ readyState: 4, status: 400 });
    await flush();
  });
});

