// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { createComment, getComment } from '../api/comments.ts';
import { getPost } from '../api/posts.ts';
import { installFakeXhr, type FakeRequest } from '../test-utils/xhr.ts';
import { boundsActions, boundsMiddleware, boundsReducer } from './bounds.ts';
import { commentsActions, commentsMiddleware, commentsReducer } from './comments.ts';
import { linksActions, linksMiddleware, linksReducer } from './links.ts';
import { postsActions, postsMiddleware, postsReducer } from './posts.ts';
import { postsListActions, postsListMiddleware, postsListReducer } from './posts-list.ts';
import { serviceWorkerMiddleware, serviceWorkerReducer } from './service-worker.ts';
import { tagsActions, tagsMiddleware, tagsReducer } from './tags.ts';
import { userActions, userMiddleware, userReducer } from './user.ts';

vi.mock('../api/posts.ts', () => ({ getPost: vi.fn(), createPost: vi.fn() }));
vi.mock('../api/comments.ts', () => ({ getComment: vi.fn(), createComment: vi.fn() }));

type Action = { type: string; payload?: Record<string, unknown> };
type Reducer = (state: object | undefined, action: Action) => Record<string, any>;
type Middleware = (store: { getState: () => object; dispatch: (action: Action) => void }) => (next: (action: Action) => void) => (action: Action) => void;

const flush = () => new Promise(resolve => setTimeout(resolve, 0));

const middlewareOf = (store: object) => ({
  next: vi.fn(),
  dispatch: vi.fn(),
  getState: () => store,
});

let requests: FakeRequest[];

const asReducer = (reducer: unknown) => reducer as Reducer;
const asMiddleware = (middleware: unknown) => middleware as Middleware;

/** Runs one action through a store's middleware and returns what it dispatched and passed on. */
const run = (middleware: unknown, state: object, action: Action) => {
  const store = middlewareOf(state);
  asMiddleware(middleware)(store)(store.next)(action);
  return store;
};

const sessionPage = (sessionId: string) => {
  document.head.innerHTML = `<meta name="x-session-id" content="${sessionId}">`;
};

beforeEach(() => {
  requests = installFakeXhr();
  sessionPage('');
  vi.spyOn(console, 'log').mockImplementation(() => undefined);
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  Reflect.deleteProperty(window.navigator, 'serviceWorker');
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.resetAllMocks();
});

describe('tags', () => {

  test('action creator', () => {
    expect(tagsActions.request("t1")).toEqual({ type: 'TAG_REQUEST', payload: { id: 't1' } });
  });

  test('reducer stores received tags and ignores other actions', () => {
    const reducer = asReducer(tagsReducer);
    const tag = { id: 't1', name: 'news' };

    expect(reducer({ a: 1 }, { type: 'TAG_RECEIVE', payload: { id: 't1', tag } })).toEqual({ a: 1, t1: tag });
    expect(reducer({ a: 1 }, { type: 'OTHER' })).toEqual({ a: 1 });
    expect(reducer(undefined, { type: 'OTHER' })).toEqual({});
  });

  test('requests an unknown tag and stores the response', () => {
    const store = run(tagsMiddleware, { tags: {} }, { type: 'TAG_REQUEST', payload: { id: 't1' } });

    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({ method: 'GET', url: '/api/tags/t1' });
    requests[0].respond(200, { id: 't1', name: 'news', type: 'text' });

    expect(store.dispatch).toHaveBeenCalledWith({ type: 'TAG_RECEIVE', payload: { id: 't1', tag: { id: 't1', name: 'news', type: 'text' } } });
    expect(store.next).toHaveBeenCalledOnce();
  });

  test('does not request a known tag', () => {
    const store = run(tagsMiddleware, { tags: { t1: {} } }, { type: 'TAG_REQUEST', payload: { id: 't1' } });
    expect(requests).toHaveLength(0);
    expect(store.next).toHaveBeenCalledOnce();
  });

  test('ignores failed responses', () => {
    const store = run(tagsMiddleware, { tags: {} }, { type: 'TAG_REQUEST', payload: { id: 't1' } });
    requests[0].respond(404, {});
    expect(store.dispatch).not.toHaveBeenCalled();
  });

  test('passes other actions on', () => {
    const store = run(tagsMiddleware, { tags: {} }, { type: 'OTHER' });
    expect(store.next).toHaveBeenCalledWith({ type: 'OTHER' });
    expect(requests).toHaveLength(0);
  });
});

describe('links', () => {
  const preview = { 'content-type': 'text/html', title: 't', description: '', image: '', url: 'https://example.com/page', embedCode: '' };

  const state = (links = {}) => ({ posts: { p1: { content: 'see example.com/page' } }, links });
  const request = { type: 'LINKS_REQUEST', payload: { href: 'https://example.com/page', postId: 'p1' } };

  test('action creator', () => {
    expect(linksActions.request("h", "p")).toEqual({ type: 'LINKS_REQUEST', payload: { href: 'h', postId: 'p' } });
  });

  test('reducer stores previews by url', () => {
    const reducer = asReducer(linksReducer);
    const preview = { url: 'https://example.com', title: 't' };
    expect(reducer({}, { type: 'LINKS_RECEIVE', payload: preview })).toEqual({ 'https://example.com': preview });
    expect(reducer({ a: 1 }, { type: 'OTHER' })).toEqual({ a: 1 });
  });

  test('fetches a preview for a link that is part of the post', () => {
    const store = run(linksMiddleware, state(), request);

    expect(requests[0]).toMatchObject({
      method: 'GET',
      url: '/api/link?post=p1&uri=https%3A%2F%2Fexample.com%2Fpage',
      headers: { 'Content-Type': 'application/json' },
    });
    requests[0].respond(200, preview);
    expect(store.dispatch).toHaveBeenCalledWith({ type: 'LINKS_RECEIVE', payload: preview });
  });

  test.each([
    ['the link is not in the post', { type: 'LINKS_REQUEST', payload: { href: 'https://other.com', postId: 'p1' } }, state()],
    ['the post is unknown', { type: 'LINKS_REQUEST', payload: { href: 'https://example.com/page', postId: 'p2' } }, state()],
    ['the preview is already known', request, state({ 'https://example.com/page': {} })],
    ['the href is missing', { type: 'LINKS_REQUEST', payload: { href: '', postId: 'p1' } }, state()],
  ])('does not fetch when %s', (_name, action, currentState) => {
    const store = run(linksMiddleware, currentState, action);
    expect(requests).toHaveLength(0);
    expect(store.next).toHaveBeenCalledOnce();
  });
});

describe('posts', () => {

  test('action creator and reducer', () => {
    expect(postsActions.request("p1")).toEqual({ type: 'POSTS_REQUEST', payload: { id: 'p1' } });
    const reducer = asReducer(postsReducer);
    expect(reducer({}, { type: 'POSTS_RECEIVE', payload: { id: 'p1', post: { content: 'x' } } })).toEqual({ p1: { content: 'x' } });
    expect(reducer(undefined, { type: 'OTHER' })).toEqual({});
  });

  test('stores a placeholder, then the fetched post', async () => {
    const post = { id: 'p1', content: 'hello' };
    vi.mocked(getPost).mockResolvedValue(post as never);

    const store = run(postsMiddleware, { posts: {} }, { type: 'POSTS_REQUEST', payload: { id: 'p1' } });
    await flush();

    expect(store.dispatch).toHaveBeenNthCalledWith(1, { type: 'POSTS_RECEIVE', payload: { id: 'p1', post: { content: '', tags: [], created_at: expect.any(Number) } } });
    expect(store.dispatch).toHaveBeenNthCalledWith(2, { type: 'POSTS_RECEIVE', payload: { id: 'p1', post } });
    expect(getPost).toHaveBeenCalledWith('p1');
  });

  test('keeps the placeholder and logs when fetching fails', async () => {
    vi.mocked(getPost).mockRejectedValue(new Error('nope'));

    const store = run(postsMiddleware, { posts: {} }, { type: 'POSTS_REQUEST', payload: { id: 'p1' } });
    await flush();

    expect(store.dispatch).toHaveBeenCalledOnce();
    expect(console.error).toHaveBeenCalled();
  });

  test('does nothing for a known post', async () => {
    vi.mocked(getPost);
    const store = run(postsMiddleware, { posts: { p1: {} } }, { type: 'POSTS_REQUEST', payload: { id: 'p1' } });
    await flush();
    expect(store.dispatch).not.toHaveBeenCalled();
    expect(getPost).not.toHaveBeenCalled();
    expect(store.next).toHaveBeenCalledOnce();
  });
});

describe('bounds', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });


  test('action creator and reducer', () => {
    expect(boundsActions.get()).toEqual({ type: 'BOUNDS_GET', payload: {} });
    const reducer = asReducer(boundsReducer);
    expect(reducer(undefined, { type: 'OTHER' })).toEqual({ newest: null, oldest: null });
    expect(reducer(undefined, { type: 'BOUNDS_SET', payload: { newest: 2, oldest: 1 } })).toEqual({ newest: 2, oldest: 1 });
  });

  test('polls: requests once started, stores the result and schedules the next poll', () => {
    const store = run(boundsMiddleware, {}, { type: 'OTHER' });
    expect(vi.getTimerCount()).toBe(1);

    vi.advanceTimersByTime(100);
    expect(store.dispatch).toHaveBeenCalledWith({ type: 'BOUNDS_GET', payload: {} });
  });

  test('fetches bounds on request and polls again every two seconds', () => {
    const store = run(boundsMiddleware, {}, { type: 'BOUNDS_GET', payload: {} });
    vi.advanceTimersByTime(100);
    store.dispatch.mockClear();

    expect(requests[0]).toMatchObject({ method: 'GET', url: '/api/posts/bounds' });
    requests[0].respond(200, { oldest: 1, newest: 2 });

    expect(store.dispatch).toHaveBeenCalledWith({ type: 'BOUNDS_SET', payload: { oldest: 1, newest: 2 } });
    expect(vi.getTimerCount()).toBe(1);
  });

  test('keeps polling after a failed response without storing anything', () => {
    const store = run(boundsMiddleware, {}, { type: 'BOUNDS_GET', payload: {} });
    vi.advanceTimersByTime(100);
    store.dispatch.mockClear();

    requests[0].respond(500);

    expect(store.dispatch).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(1);
  });
});

describe('comments', () => {

  test('action creators and reducer', () => {
    expect(commentsActions.request("c1")).toEqual({ type: 'COMMENTS_REQUEST', payload: { id: 'c1' } });
    expect(commentsActions.create("p1", "b", "c0")).toEqual({ type: 'COMMENTS_CREATE', payload: { id: 'p1', parent: 'c0', body: 'b' } });
    const reducer = asReducer(commentsReducer);
    expect(reducer({}, { type: 'COMMENTS_RECEIVE', payload: { id: 'c1', body: 'x' } })).toEqual({ c1: { id: 'c1', body: 'x' } });
    expect(reducer(undefined, { type: 'OTHER' })).toEqual({});
  });

  test('loads a comment', async () => {
    vi.mocked(getComment).mockResolvedValue({ id: 'c1', body: 'x' } as never);

    const store = run(commentsMiddleware, {}, { type: 'COMMENTS_REQUEST', payload: { id: 'c1' } });
    await flush();

    expect(getComment).toHaveBeenCalledWith('c1');
    expect(store.dispatch).toHaveBeenCalledWith({ type: 'COMMENTS_RECEIVE', payload: { id: 'c1', body: 'x' } });
  });

  test('turns the editor markup into plain lines before creating a comment', () => {
    vi.mocked(createComment).mockReturnValue(new Promise(() => undefined));

    const store = run(commentsMiddleware, {}, {
      type: 'COMMENTS_CREATE',
      payload: { id: 'p1', parent: 'c0', body: '<div>first</div><div><br></div><div>second</div>' },
    });

    expect(createComment).toHaveBeenCalledWith('p1', '\nfirst\n\n\nsecond', 'c0');
    expect(store.next).toHaveBeenCalledOnce();
  });
});

describe('service worker', () => {

  test('reducer leaves the state alone and logs known actions', () => {
    const reducer = asReducer(serviceWorkerReducer);
    const state = { a: 1 };

    expect(reducer(state, { type: 'SW_UPDATE_FOUND' })).toBe(state);
    expect(reducer(state, { type: 'SW_MESSAGE_RECEIVED', payload: { event: { data: 'x' } } })).toBe(state);
    expect(reducer(state, { type: 'OTHER' })).toBe(state);
    expect(console.log).toHaveBeenCalledTimes(2);
  });

  test('unregisters existing service workers when supported', async () => {
    const unregister = vi.fn().mockResolvedValue(true);
    Object.defineProperty(window.navigator, 'serviceWorker', {
      configurable: true,
      value: { getRegistrations: vi.fn().mockResolvedValue([{ unregister }, { unregister }]), addEventListener: vi.fn() },
    });

    run(serviceWorkerMiddleware, {}, { type: 'OTHER' });
    await flush();

    expect(unregister).toHaveBeenCalledTimes(2);
  });

  test('forwards cache refreshes to the controlling worker', () => {
    const postMessage = vi.fn();
    Object.defineProperty(window.navigator, 'serviceWorker', {
      configurable: true,
      value: { getRegistrations: vi.fn().mockResolvedValue([]), addEventListener: vi.fn(), controller: { postMessage } },
    });
    const action = { type: 'SW_REFRESH_CACHE' };

    const store = run(serviceWorkerMiddleware, {}, action);

    expect(postMessage).toHaveBeenCalledWith(action);
    expect(store.next).toHaveBeenCalledWith(action);
  });

  test('reports the page session to the controlling worker', () => {
    const postMessage = vi.fn();
    const addEventListener = vi.fn();
    sessionPage('s1');
    Object.defineProperty(window.navigator, 'serviceWorker', {
      configurable: true,
      value: { getRegistrations: vi.fn().mockResolvedValue([]), addEventListener, controller: { postMessage } },
    });

    run(serviceWorkerMiddleware, {}, { type: 'OTHER' });

    expect(postMessage).toHaveBeenCalledWith({ type: 'SW_SESSION', sessionId: 's1' });
    expect(addEventListener).toHaveBeenCalledWith('controllerchange', expect.any(Function));
  });

  test('works in browsers without service workers', () => {
    const store = run(serviceWorkerMiddleware, {}, { type: 'SW_REFRESH_CACHE' });
    expect(store.next).toHaveBeenCalledOnce();
  });
});

describe('user', () => {
  const userInfo = {
    user: { id: 'u1', name: 'Ann', role: 'user', created_at: 1 },
    session: { id: 's1', users_login_id: 'l1', status: 'active', created_at: 1, last_active: null },
    login: { id: 'l1', type: 'email', user_id: 'u1', value: 'a@b.c' },
  };
  const guest = { type: 'USER_RECEIVE', payload: { user: { role: 'guest', name: '' }, session: false } };

  test('action creators and reducer', async () => {
    sessionPage('');
    expect(userActions.request()).toEqual({ type: 'USER_REQUEST', payload: {} });
    expect(userActions.requestTags()).toEqual({ type: 'USER_REQUEST_TAGS', payload: {} });

    const reducer = asReducer(userReducer);
    expect(reducer(undefined, { type: 'OTHER' })).toEqual({ session: null, received: false, tags: null });
    expect(reducer(undefined, { type: 'USER_RECEIVE', payload: { user: { name: 'Ann', role: 'admin' }, session: { id: 's' } } }))
      .toEqual({ session: { id: 's' }, received: true, tags: null, name: 'Ann', role: 'admin' });
    expect(reducer({ received: true }, { type: 'USER_RECEIVE_TAGS', payload: { tags: [1] } })).toEqual({ received: true, tags: [1] });
  });

  test('is a guest without a session id', async () => {
    sessionPage('');
    const store = run(userMiddleware, {}, { type: 'USER_REQUEST' });
    expect(store.dispatch).toHaveBeenCalledWith(guest);
    expect(requests).toHaveLength(0);
  });

  test('loads the user of a session', async () => {
    sessionPage('s1');
    const store = run(userMiddleware, {}, { type: 'USER_REQUEST' });

    expect(requests[0]).toMatchObject({ method: 'GET', url: '/api/user' });
    requests[0].respond(200, userInfo);

    expect(store.dispatch).toHaveBeenCalledWith({ type: 'USER_RECEIVE', payload: userInfo });
  });

  test('is a guest when the session is rejected, and ignores other failures', async () => {
    sessionPage('s1');
    const store = run(userMiddleware, {}, { type: 'USER_REQUEST' });

    requests[0].respond(500);
    expect(store.dispatch).not.toHaveBeenCalled();

    const second = run(userMiddleware, {}, { type: 'USER_REQUEST' });
    requests[1].respond(401);
    expect(second.dispatch).toHaveBeenCalledWith(guest);
  });

  test('has no tags without a session id', async () => {
    sessionPage('');
    const store = run(userMiddleware, {}, { type: 'USER_REQUEST_TAGS' });
    expect(store.dispatch).toHaveBeenCalledWith({ type: 'USER_RECEIVE_TAGS', payload: { tags: [] } });
  });

  test('loads the tags of a session, falling back to none', async () => {
    sessionPage('s1');
    const store = run(userMiddleware, {}, { type: 'USER_REQUEST_TAGS' });

    expect(requests[0]).toMatchObject({ method: 'GET', url: '/api/user/tags' });
    requests[0].respond(200, [{ tag_id: 't1', type: 'liked' }]);
    expect(store.dispatch).toHaveBeenLastCalledWith({ type: 'USER_RECEIVE_TAGS', payload: { tags: [{ tag_id: 't1', type: 'liked' }] } });

    const failing = run(userMiddleware, {}, { type: 'USER_REQUEST_TAGS' });
    requests[1].respond(401);
    expect(failing.dispatch).toHaveBeenLastCalledWith({ type: 'USER_RECEIVE_TAGS', payload: { tags: [] } });
  });
});

describe('postsList', () => {
  beforeEach(async () => {
  });

  const reducer = () => asReducer(postsListReducer);
  const withInstance = (extra = {}) => ({ i1: { posts: ['a'], ...extra } });

  describe('actions', () => {
    test('create the expected payloads', () => {
      expect(postsListActions.loadMore("i1")).toEqual({ type: 'POSTS_LIST_LOAD_MORE', payload: { instance: 'i1' } });
      expect(postsListActions.loadNew("i1")).toEqual({ type: 'POSTS_LIST_LOAD_NEW', payload: { instance: 'i1' } });
      expect(postsListActions.createFilter("i1")).toEqual({ type: 'POSTS_LIST_CREATE_FILTER', payload: { instance: 'i1', likedTags: [], dislikedTags: [] } });
      expect(postsListActions.setFilterTags("i1", ["a"], ["b"])).toEqual({ type: 'POSTS_LIST_SET_FILTER_TAGS', payload: { instance: 'i1', likedTags: ['a'], dislikedTags: ['b'] } });
    });
  });

  describe('reducer', () => {
    test('creates a filtered, empty list', () => {
      const state = reducer()({}, { type: 'POSTS_LIST_CREATE_FILTER', payload: { instance: 'i1', likedTags: ['a'], dislikedTags: ['b'] } });
      expect(state.i1).toMatchObject({ likedTags: ['a'], dislikedTags: ['b'], since: null, posts: [], isLoading: false });
    });

    test('changing the filter tags empties the list', () => {
      const state = reducer()(withInstance(), { type: 'POSTS_LIST_SET_FILTER_TAGS', payload: { instance: 'i1', likedTags: ['a'], dislikedTags: [] } });
      expect(state.i1).toEqual({ likedTags: ['a'], dislikedTags: [], posts: [] });
    });

    test.each([
      ['POSTS_LIST_SET_NEXT_PAGE', { nextPageBefore: 5 }],
      ['POSTS_LIST_SET_SINCE', { since: 5 }],
      ['POSTS_LIST_SET_BEFORE', { before: 5 }],
      ['POSTS_LIST_SET_LOADING_STARTED', { loadingStarted: true }],
      ['POSTS_LIST_SET_IS_LOADING', { isLoading: true }],
    ])('%s updates one field of the instance', (type, change) => {
      const state = reducer()(withInstance({ other: 1 }), { type, payload: { instance: 'i1', ...change } });
      expect(state.i1).toEqual({ posts: ['a'], other: 1, ...change });
    });

    test('appends and prepends posts', () => {
      expect(reducer()(withInstance(), { type: 'POSTS_LIST_APPEND', payload: { instance: 'i1', posts: ['b'] } }).i1).toEqual({ posts: ['a', 'b'] });
      expect(reducer()(withInstance(), { type: 'POSTS_LIST_PREPEND', payload: { instance: 'i1', posts: ['b'] } }).i1).toEqual({ posts: ['b', 'a'] });
    });

    test('shows a post once, even when a page comes back with posts the list has', () => {
      expect(reducer()(withInstance(), { type: 'POSTS_LIST_APPEND', payload: { instance: 'i1', posts: ['a', 'b', 'b'] } }).i1).toEqual({ posts: ['a', 'b'] });
      expect(reducer()(withInstance(), { type: 'POSTS_LIST_PREPEND', payload: { instance: 'i1', posts: ['a', 'c'] } }).i1).toEqual({ posts: ['c', 'a'] });
    });

    test('ignores other actions', () => {
      expect(reducer()(undefined, { type: 'OTHER' })).toEqual({});
    });
  });

  describe('LOAD_MORE', () => {
    const listState = (extra = {}) => ({
      postsList: { i1: { likedTags: ['a'], dislikedTags: ['b'], nextPageBefore: 1000, posts: [], isLoading: false, ...extra } },
    });
    const loadMore = { type: 'POSTS_LIST_LOAD_MORE', payload: { instance: 'i1' } };
    const post = (id: string, created_at: number) => ({ id, type: 'post', created_at });

    test('requests the page before nextPageBefore with the tag filters', () => {
      const store = run(postsListMiddleware, listState(), loadMore);

      expect(store.dispatch).toHaveBeenCalledWith({ type: 'POSTS_LIST_SET_IS_LOADING', payload: { instance: 'i1', isLoading: true } });
      return flush().then(() => {
        const url = new URL(requests[0].url);
        expect(url.pathname).toBe('/api/posts');
        expect(Object.fromEntries(url.searchParams)).toEqual({ since: '900', before: '1001', likedTags: 'a', dislikedTags: 'b' });
      });
    });

    test('stores the page: paging info, post details and ids', async () => {
      vi.mocked(getPost).mockImplementation(async id => ({ id, content: id }) as never);
      const store = run(postsListMiddleware, listState(), loadMore);
      await flush();

      requests[0].respond(200, [post('p1', 990), post('p2', 950)], { 'x-next-page-before': '900' });
      await flush();

      const dispatched = store.dispatch.mock.calls.map(([action]) => action);
      expect(dispatched).toEqual(expect.arrayContaining([
        { type: 'POSTS_LIST_SET_NEXT_PAGE', payload: { nextPageBefore: 900, instance: 'i1' } },
        { type: 'POSTS_LIST_SET_SINCE', payload: { since: 950, instance: 'i1' } },
        { type: 'POSTS_LIST_SET_BEFORE', payload: { before: 990, instance: 'i1' } },
        { type: 'POSTS_RECEIVE', payload: { id: 'p1', post: { id: 'p1', content: 'p1' } } },
        { type: 'POSTS_LIST_SET_IS_LOADING', payload: { instance: 'i1', isLoading: false } },
        { type: 'POSTS_LIST_APPEND', payload: { posts: ['p1', 'p2'], instance: 'i1' } },
      ]));
    });

    test('marks the end of the list when the server sends no next page', async () => {
      vi.mocked(getPost).mockImplementation(async id => ({ id }) as never);
      const store = run(postsListMiddleware, listState(), loadMore);
      await flush();

      requests[0].respond(200, [post('p1', 990)]);
      await flush();

      expect(store.dispatch).toHaveBeenCalledWith({ type: 'POSTS_LIST_SET_NEXT_PAGE', payload: { nextPageBefore: -1, instance: 'i1' } });
    });

    test('does not move "before" when the list already has posts', async () => {
      vi.mocked(getPost).mockImplementation(async id => ({ id }) as never);
      const store = run(postsListMiddleware, listState({ posts: ['x'] }), loadMore);
      await flush();

      requests[0].respond(200, [post('p1', 990)]);
      await flush();

      expect(store.dispatch.mock.calls.map(([action]) => action.type)).not.toContain('POSTS_LIST_SET_BEFORE');
    });

    test('keeps looking when an empty page still has a next page', async () => {
      const store = run(postsListMiddleware, listState(), loadMore);
      await flush();

      requests[0].respond(200, [], { 'x-next-page-before': '500' });
      await flush();

      expect(store.dispatch).toHaveBeenCalledWith({ type: 'POSTS_LIST_LOAD_MORE', payload: { instance: 'i1' } });
    });

    test('stops loading on an empty last page', async () => {
      const store = run(postsListMiddleware, listState(), loadMore);
      await flush();

      requests[0].respond(200, []);
      await flush();

      expect(store.dispatch).toHaveBeenLastCalledWith({ type: 'POSTS_LIST_SET_IS_LOADING', payload: { instance: 'i1', isLoading: false } });
    });

    test('stops loading when the request fails', async () => {
      const store = run(postsListMiddleware, listState(), loadMore);
      await flush();

      requests[0].respond(500);
      await flush();

      expect(store.dispatch).toHaveBeenLastCalledWith({ type: 'POSTS_LIST_SET_IS_LOADING', payload: { instance: 'i1', isLoading: false } });
    });

    test.each([
      ['already loading', listState({ isLoading: true })],
      ['at the end of the list', listState({ nextPageBefore: -1 })],
    ])('does nothing when %s', async (_name, state) => {
      const store = run(postsListMiddleware, state, loadMore);
      await flush();
      expect(requests).toHaveLength(0);
      expect(store.dispatch).not.toHaveBeenCalled();
      expect(store.next).toHaveBeenCalledOnce();
    });
  });

  describe('LOAD_NEW', () => {
    const state = { postsList: { i1: { likedTags: [], dislikedTags: [], before: 100 } }, bounds: { newest: 200 } };

    test('prepends newer posts and requests their details', async () => {
      const store = run(postsListMiddleware, state, { type: 'POSTS_LIST_LOAD_NEW', payload: { instance: 'i1' } });
      await flush();

      const url = new URL(requests[0].url);
      expect(Object.fromEntries(url.searchParams)).toEqual({ since: '100', before: '200' });

      requests[0].respond(200, [{ id: 'p9', type: 'post', created_at: 190 }, { id: 'p8', type: 'post', created_at: 150 }]);
      await flush();

      expect(store.dispatch).toHaveBeenCalledWith({ type: 'POSTS_LIST_SET_BEFORE', payload: { before: 190, instance: 'i1' } });
      expect(store.dispatch).toHaveBeenCalledWith({ type: 'POSTS_LIST_PREPEND', payload: { posts: ['p9', 'p8'], instance: 'i1' } });
      expect(store.dispatch).toHaveBeenCalledWith({ type: 'POSTS_REQUEST', payload: { id: 'p9' } });
    });

    test('does nothing when there are no newer posts', async () => {
      const store = run(postsListMiddleware, state, { type: 'POSTS_LIST_LOAD_NEW', payload: { instance: 'i1' } });
      await flush();
      requests[0].respond(200, []);
      await flush();
      expect(store.dispatch).not.toHaveBeenCalled();
    });
  });
});
