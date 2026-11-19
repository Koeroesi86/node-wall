import { CreatePostRequestSchema, PostResponseSchema } from '../../lib/api-schemas';

/** Settles when the request is done: resolves with the request on success, rejects with it otherwise. */
export const send = (method: string, url: string, body?: unknown) => new Promise<XMLHttpRequest>((resolve, reject) => {
  const request = new XMLHttpRequest();
  request.onreadystatechange = () => {
    if (request.readyState !== 4) return;
    if (request.status === 200) resolve(request);
    else reject(request);
  };
  request.open(method, url, true);
  if (body !== undefined) request.setRequestHeader('Content-Type', 'application/json');
  request.send(body === undefined ? undefined : JSON.stringify(body));
});

export const getPost = (id: string) => send('GET', `/api/posts/${id}`).then(request => PostResponseSchema.parse(JSON.parse(request.responseText)));

export const createPost = (content = '') => Promise.resolve()
  .then(() => CreatePostRequestSchema.parse({ content }))
  .then(body => send('POST', '/api/posts', body));
