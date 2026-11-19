// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { installFakeXhr, type FakeRequest } from '../test-utils/xhr.ts';
import { createComment, getComment } from './comments.ts';
import { createPost, getPost } from './posts.ts';

let requests: FakeRequest[];

const flush = () => new Promise(resolve => setTimeout(resolve, 0));

const postId = '11111111-2222-3333-4444-555555555555';
const parentId = '66666666-7777-8888-9999-000000000000';
const postData = { id: 'p1', type: 'post', content: 'hello', created_at: 1, comments: [], owner: null, tags: [] };
const commentData = { id: 'c1', post: 'p1', parent: null, created_at: 1, body: 'hi' };

beforeEach(() => {
  requests = installFakeXhr();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('posts', () => {
  test('getPost fetches a post', async () => {
    const result = getPost('p1');
    expect(requests[0]).toMatchObject({ method: 'GET', url: '/api/posts/p1' });
    requests[0].respond(200, postData);

    expect(await result).toEqual(postData);
  });

  test('getPost rejects a response that does not match the schema', async () => {
    const result = getPost('p1');
    requests[0].respond(200, { id: 'p1' });

    await expect(result).rejects.toThrow();
  });

  test('getPost rejects with the request on failure', async () => {
    const result = getPost('p1');
    requests[0].respond(404);

    await expect(result).rejects.toMatchObject({ readyState: 4, status: 404 });
  });

  test('createPost sends the content as JSON', async () => {
    const result = createPost('hello');
    await flush();
    expect(requests[0]).toMatchObject({
      method: 'POST',
      url: '/api/posts',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'hello' }),
    });
    requests[0].respond(200);

    await expect(result).resolves.toMatchObject({ readyState: 4, status: 200 });
  });

  test('createPost refuses empty content without sending it', async () => {
    await expect(createPost()).rejects.toThrow();
    expect(requests).toHaveLength(0);
  });

  test('createPost rejects on failure', async () => {
    const result = createPost('hello');
    await flush();
    requests[0].respond(401);

    await expect(result).rejects.toMatchObject({ readyState: 4, status: 401 });
  });
});

describe('comments', () => {
  test('getComment fetches a comment', async () => {
    const result = getComment('c1');
    expect(requests[0]).toMatchObject({ method: 'GET', url: '/api/comment/c1' });
    requests[0].respond(200, commentData);

    expect(await result).toEqual(commentData);
  });

  test('getComment rejects on failure', async () => {
    const result = getComment('c1');
    requests[0].respond(500);

    await expect(result).rejects.toMatchObject({ readyState: 4, status: 500 });
  });

  test('createComment sends body, parent and post', async () => {
    const result = createComment(postId, 'hi', parentId);
    await flush();
    expect(requests[0]).toMatchObject({
      method: 'POST',
      url: '/api/comment',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId, parent: parentId, body: 'hi' }),
    });
    requests[0].respond(200, {});

    await expect(result).resolves.toBeUndefined();
  });

  test('createComment refuses a body that is only whitespace without sending it', async () => {
    await expect(createComment(postId, '  ')).rejects.toThrow();
    expect(requests).toHaveLength(0);
  });

  test('createComment rejects on failure', async () => {
    const result = createComment(postId, 'hi');
    await flush();
    requests[0].respond(400);

    await expect(result).rejects.toMatchObject({ readyState: 4, status: 400 });
  });
});
