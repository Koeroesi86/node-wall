import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { loadBrowser, type Browser } from '../../../lib/test-utils/browser';

type Action = { type: string; payload?: Record<string, unknown> };
type Reducer = (state: object | undefined, action: Action) => Record<string, unknown>;
type Middleware = (store: { getState: () => object; dispatch: (action: Action) => void }) => (next: (action: Action) => void) => (action: Action) => void;

const flush = () => new Promise(resolve => setTimeout(resolve, 0));

const middlewareOf = (store: object) => ({
  next: vi.fn(),
  dispatch: vi.fn(),
  getState: () => store,
});

let browser: Browser;

const load = async (name: string, html?: string) => {
  browser = await loadBrowser([`public/static/stores/${name}.ts`], html);
  return browser;
};

/** Runs one action through a store's middleware and returns what it dispatched and passed on. */
const run = (middleware: string, state: object, action: Action) => {
  const store = middlewareOf(state);
  browser.evaluate<Middleware>(middleware)(store)(store.next)(action);
  return store;
};

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => undefined);
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  browser?.close();
  vi.restoreAllMocks();
});

describe('tags', () => {
  beforeEach(() => load('tags'));

  test('action creator', () => {
    expect(browser.evaluate('tagsActions.request("t1")')).toEqual({ type: 'TAG_REQUEST', payload: { id: 't1' } });
  });

  test('reducer stores received tags and ignores other actions', () => {
    const reducer = browser.evaluate<Reducer>('tagsReducer');
    const tag = { id: 't1', name: 'news' };

    expect(reducer({ a: 1 }, { type: 'TAG_RECEIVE', payload: { id: 't1', tag } })).toEqual({ a: 1, t1: tag });
    expect(reducer({ a: 1 }, { type: 'OTHER' })).toEqual({ a: 1 });
    expect(reducer(undefined, { type: 'OTHER' })).toEqual({});
  });

  test('requests an unknown tag and stores the response', () => {
    const store = run('tagsMiddleware', { tags: {} }, { type: 'TAG_REQUEST', payload: { id: 't1' } });

    expect(browser.requests).toHaveLength(1);
    expect(browser.requests[0]).toMatchObject({ method: 'GET', url: '/api/tags/t1' });
    browser.requests[0].respond(200, { id: 't1', name: 'news', type: 'text' });

    expect(store.dispatch).toHaveBeenCalledWith({ type: 'TAG_RECEIVE', payload: { id: 't1', tag: { id: 't1', name: 'news', type: 'text' } } });
    expect(store.next).toHaveBeenCalledOnce();
  });

  test('does not request a known tag', () => {
    const store = run('tagsMiddleware', { tags: { t1: {} } }, { type: 'TAG_REQUEST', payload: { id: 't1' } });
    expect(browser.requests).toHaveLength(0);
    expect(store.next).toHaveBeenCalledOnce();
  });

  test('ignores failed responses', () => {
    const store = run('tagsMiddleware', { tags: {} }, { type: 'TAG_REQUEST', payload: { id: 't1' } });
    browser.requests[0].respond(404, {});
    expect(store.dispatch).not.toHaveBeenCalled();
  });

  test('passes other actions on', () => {
    const store = run('tagsMiddleware', { tags: {} }, { type: 'OTHER' });
    expect(store.next).toHaveBeenCalledWith({ type: 'OTHER' });
    expect(browser.requests).toHaveLength(0);
  });
});

describe('links', () => {
  const preview = { 'content-type': 'text/html', title: 't', description: '', image: '', url: 'https://example.com/page', embedCode: '' };
  beforeEach(() => load('links'));

  const state = (links = {}) => ({ posts: { p1: { content: 'see example.com/page' } }, links });
  const request = { type: 'LINKS_REQUEST', payload: { href: 'https://example.com/page', postId: 'p1' } };

  test('action creator', () => {
    expect(browser.evaluate('linksActions.request("h", "p")')).toEqual({ type: 'LINKS_REQUEST', payload: { href: 'h', postId: 'p' } });
  });

  test('reducer stores previews by url', () => {
    const reducer = browser.evaluate<Reducer>('linksReducer');
    const preview = { url: 'https://example.com', title: 't' };
    expect(reducer({}, { type: 'LINKS_RECEIVE', payload: preview })).toEqual({ 'https://example.com': preview });
    expect(reducer({ a: 1 }, { type: 'OTHER' })).toEqual({ a: 1 });
  });

  test('fetches a preview for a link that is part of the post', () => {
    const store = run('linksMiddleware', state(), request);

    expect(browser.requests[0]).toMatchObject({
      method: 'GET',
      url: '/api/link?post=p1&uri=https%3A%2F%2Fexample.com%2Fpage',
      headers: { 'Content-Type': 'application/json' },
    });
    browser.requests[0].respond(200, preview);
    expect(store.dispatch).toHaveBeenCalledWith({ type: 'LINKS_RECEIVE', payload: preview });
  });

  test.each([
    ['the link is not in the post', { type: 'LINKS_REQUEST', payload: { href: 'https://other.com', postId: 'p1' } }, state()],
    ['the post is unknown', { type: 'LINKS_REQUEST', payload: { href: 'https://example.com/page', postId: 'p2' } }, state()],
    ['the preview is already known', request, state({ 'https://example.com/page': {} })],
    ['the href is missing', { type: 'LINKS_REQUEST', payload: { href: '', postId: 'p1' } }, state()],
  ])('does not fetch when %s', (_name, action, currentState) => {
    const store = run('linksMiddleware', currentState, action);
    expect(browser.requests).toHaveLength(0);
    expect(store.next).toHaveBeenCalledOnce();
  });
});

describe('translations', () => {
  beforeEach(() => load('translations'));

  test('action creators', () => {
    expect(browser.evaluate('translationsActions.request("a")')).toEqual({ type: 'TRANSLATIONS_REQUEST', payload: { alias: 'a' } });
    expect(browser.evaluate('translationsActions.receive("a", "x")')).toEqual({ type: 'TRANSLATIONS_RECEIVE', payload: { alias: 'a', translation: 'x' } });
  });

  test('reducer stores translations by alias', () => {
    const reducer = browser.evaluate<Reducer>('translationsReducer');
    expect(reducer({}, { type: 'TRANSLATIONS_RECEIVE', payload: { alias: 'a', translation: 'x' } })).toEqual({ a: 'x' });
    expect(reducer(undefined, { type: 'OTHER' })).toEqual({});
  });

  test('reserves the alias, fetches it and stores the value', () => {
    const store = run('translationsMiddleware', { translations: {} }, { type: 'TRANSLATIONS_REQUEST', payload: { alias: 'a' } });

    expect(store.dispatch).toHaveBeenCalledWith({ type: 'TRANSLATIONS_RECEIVE', payload: { alias: 'a', translation: '' } });
    expect(browser.requests[0]).toMatchObject({ method: 'GET', url: '/api/translation/a' });

    browser.requests[0].respond(200, { value: 'Hello' });
    expect(store.dispatch).toHaveBeenLastCalledWith({ type: 'TRANSLATIONS_RECEIVE', payload: { alias: 'a', translation: 'Hello' } });
  });

  test('warns when the translation cannot be fetched', () => {
    run('translationsMiddleware', { translations: {} }, { type: 'TRANSLATIONS_REQUEST', payload: { alias: 'a' } });
    browser.requests[0].respond(500);
    expect(console.warn).toHaveBeenCalledWith('failed to fetch translation for a');
  });

  test('does not fetch an alias that is already known, even when empty', () => {
    const store = run('translationsMiddleware', { translations: { a: '' } }, { type: 'TRANSLATIONS_REQUEST', payload: { alias: 'a' } });
    expect(browser.requests).toHaveLength(0);
    expect(store.dispatch).not.toHaveBeenCalled();
    expect(store.next).toHaveBeenCalledOnce();
  });
});

describe('posts', () => {
  beforeEach(() => load('posts'));

  test('action creator and reducer', () => {
    expect(browser.evaluate('postsActions.request("p1")')).toEqual({ type: 'POSTS_REQUEST', payload: { id: 'p1' } });
    const reducer = browser.evaluate<Reducer>('postsReducer');
    expect(reducer({}, { type: 'POSTS_RECEIVE', payload: { id: 'p1', post: { content: 'x' } } })).toEqual({ p1: { content: 'x' } });
    expect(reducer(undefined, { type: 'OTHER' })).toEqual({});
  });

  test('stores a placeholder, then the fetched post', async () => {
    const post = { id: 'p1', content: 'hello' };
    browser.window.getPost = vi.fn().mockResolvedValue(post);

    const store = run('postsMiddleware', { posts: {} }, { type: 'POSTS_REQUEST', payload: { id: 'p1' } });
    await flush();

    expect(store.dispatch).toHaveBeenNthCalledWith(1, { type: 'POSTS_RECEIVE', payload: { id: 'p1', post: { content: '', tags: [], created_at: expect.any(Number) } } });
    expect(store.dispatch).toHaveBeenNthCalledWith(2, { type: 'POSTS_RECEIVE', payload: { id: 'p1', post } });
    expect(browser.window.getPost).toHaveBeenCalledWith('p1');
  });

  test('keeps the placeholder and logs when fetching fails', async () => {
    browser.window.getPost = vi.fn().mockRejectedValue(new Error('nope'));

    const store = run('postsMiddleware', { posts: {} }, { type: 'POSTS_REQUEST', payload: { id: 'p1' } });
    await flush();

    expect(store.dispatch).toHaveBeenCalledOnce();
    expect(console.error).toHaveBeenCalled();
  });

  test('does nothing for a known post', async () => {
    browser.window.getPost = vi.fn();
    const store = run('postsMiddleware', { posts: { p1: {} } }, { type: 'POSTS_REQUEST', payload: { id: 'p1' } });
    await flush();
    expect(store.dispatch).not.toHaveBeenCalled();
    expect(browser.window.getPost).not.toHaveBeenCalled();
    expect(store.next).toHaveBeenCalledOnce();
  });
});

describe('bounds', () => {
  beforeEach(() => load('bounds'));

  test('action creator and reducer', () => {
    expect(browser.evaluate('boundsActions.get()')).toEqual({ type: 'BOUNDS_GET', payload: {} });
    const reducer = browser.evaluate<Reducer>('boundsReducer');
    expect(reducer(undefined, { type: 'OTHER' })).toEqual({ newest: null, oldest: null });
    expect(reducer(undefined, { type: 'BOUNDS_SET', payload: { newest: 2, oldest: 1 } })).toEqual({ newest: 2, oldest: 1 });
  });

  test('polls: requests once started, stores the result and schedules the next poll', () => {
    const store = run('boundsMiddleware', {}, { type: 'OTHER' });
    expect(browser.pendingTimers().map(timer => timer.delay)).toEqual([100]);

    browser.flushTimers();
    expect(store.dispatch).toHaveBeenCalledWith({ type: 'BOUNDS_GET', payload: {} });
  });

  test('fetches bounds on request and polls again every two seconds', () => {
    const store = run('boundsMiddleware', {}, { type: 'BOUNDS_GET', payload: {} });
    browser.flushTimers();
    store.dispatch.mockClear();

    expect(browser.requests[0]).toMatchObject({ method: 'GET', url: '/api/posts/bounds' });
    browser.requests[0].respond(200, { oldest: 1, newest: 2 });

    expect(store.dispatch).toHaveBeenCalledWith({ type: 'BOUNDS_SET', payload: { oldest: 1, newest: 2 } });
    expect(browser.pendingTimers().map(timer => timer.delay)).toEqual([2000]);
  });

  test('keeps polling after a failed response without storing anything', () => {
    const store = run('boundsMiddleware', {}, { type: 'BOUNDS_GET', payload: {} });
    browser.flushTimers();
    store.dispatch.mockClear();

    browser.requests[0].respond(500);

    expect(store.dispatch).not.toHaveBeenCalled();
    expect(browser.pendingTimers().map(timer => timer.delay)).toEqual([2000]);
  });
});

describe('comments', () => {
  beforeEach(() => load('comments'));

  test('action creators and reducer', () => {
    expect(browser.evaluate('commentsActions.request("c1")')).toEqual({ type: 'COMMENTS_REQUEST', payload: { id: 'c1' } });
    expect(browser.evaluate('commentsActions.create("p1", "b", "c0")')).toEqual({ type: 'COMMENTS_CREATE', payload: { id: 'p1', parent: 'c0', body: 'b' } });
    const reducer = browser.evaluate<Reducer>('commentsReducer');
    expect(reducer({}, { type: 'COMMENTS_RECEIVE', payload: { id: 'c1', body: 'x' } })).toEqual({ c1: { id: 'c1', body: 'x' } });
    expect(reducer(undefined, { type: 'OTHER' })).toEqual({});
  });

  test('loads a comment', async () => {
    browser.window.getComment = vi.fn().mockResolvedValue({ id: 'c1', body: 'x' });

    const store = run('commentsMiddleware', {}, { type: 'COMMENTS_REQUEST', payload: { id: 'c1' } });
    await flush();

    expect(browser.window.getComment).toHaveBeenCalledWith('c1');
    expect(store.dispatch).toHaveBeenCalledWith({ type: 'COMMENTS_RECEIVE', payload: { id: 'c1', body: 'x' } });
  });

  test('turns the editor markup into plain lines before creating a comment', () => {
    browser.window.createComment = vi.fn().mockReturnValue(new Promise(() => undefined));

    const store = run('commentsMiddleware', {}, {
      type: 'COMMENTS_CREATE',
      payload: { id: 'p1', parent: 'c0', body: '<div>first</div><div><br></div><div>second</div>' },
    });

    expect(browser.window.createComment).toHaveBeenCalledWith('p1', '\nfirst\n\n\nsecond', 'c0');
    expect(store.next).toHaveBeenCalledOnce();
  });
});

describe('service worker', () => {
  beforeEach(() => load('serviceWorker'));

  test('reducer leaves the state alone and logs known actions', () => {
    const reducer = browser.evaluate<Reducer>('serviceWorkerReducer');
    const state = { a: 1 };

    expect(reducer(state, { type: 'SW_UPDATE_FOUND' })).toBe(state);
    expect(reducer(state, { type: 'SW_MESSAGE_RECEIVED', payload: { event: { data: 'x' } } })).toBe(state);
    expect(reducer(state, { type: 'OTHER' })).toBe(state);
    expect(console.log).toHaveBeenCalledTimes(2);
  });

  test('unregisters existing service workers when supported', async () => {
    const unregister = vi.fn().mockResolvedValue(true);
    Object.defineProperty(browser.window.navigator, 'serviceWorker', {
      configurable: true,
      value: { getRegistrations: vi.fn().mockResolvedValue([{ unregister }, { unregister }]), addEventListener: vi.fn() },
    });

    run('serviceWorkerMiddleware', {}, { type: 'OTHER' });
    await flush();

    expect(unregister).toHaveBeenCalledTimes(2);
  });

  test('forwards cache refreshes to the controlling worker', () => {
    const postMessage = vi.fn();
    Object.defineProperty(browser.window.navigator, 'serviceWorker', {
      configurable: true,
      value: { getRegistrations: vi.fn().mockResolvedValue([]), addEventListener: vi.fn(), controller: { postMessage } },
    });
    const action = { type: 'SW_REFRESH_CACHE' };

    const store = run('serviceWorkerMiddleware', {}, action);

    expect(postMessage).toHaveBeenCalledWith(action);
    expect(store.next).toHaveBeenCalledWith(action);
  });

  test('reports the page session to the controlling worker', () => {
    const postMessage = vi.fn();
    const addEventListener = vi.fn();
    browser.window.document.head.innerHTML = '<meta name="x-session-id" content="s1">';
    Object.defineProperty(browser.window.navigator, 'serviceWorker', {
      configurable: true,
      value: { getRegistrations: vi.fn().mockResolvedValue([]), addEventListener, controller: { postMessage } },
    });

    run('serviceWorkerMiddleware', {}, { type: 'OTHER' });

    expect(postMessage).toHaveBeenCalledWith({ type: 'SW_SESSION', sessionId: 's1' });
    expect(addEventListener).toHaveBeenCalledWith('controllerchange', expect.any(Function));
  });

  test('works in browsers without service workers', () => {
    const store = run('serviceWorkerMiddleware', {}, { type: 'SW_REFRESH_CACHE' });
    expect(store.next).toHaveBeenCalledOnce();
  });
});

describe('user', () => {
  const page = (sessionId: string) => `<html><head><meta name="x-session-id" content="${sessionId}"></head><body></body></html>`;
  const userInfo = {
    user: { id: 'u1', name: 'Ann', role: 'user', created_at: 1 },
    session: { id: 's1', users_login_id: 'l1', status: 'active', created_at: 1, last_active: null },
    login: { id: 'l1', type: 'email', user_id: 'u1', value: 'a@b.c' },
  };
  const guest = { type: 'USER_RECEIVE', payload: { user: { role: 'guest', name: '' }, session: false } };

  test('action creators and reducer', async () => {
    await load('user', page(''));
    expect(browser.evaluate('userActions.request()')).toEqual({ type: 'USER_REQUEST', payload: {} });
    expect(browser.evaluate('userActions.requestTags()')).toEqual({ type: 'USER_REQUEST_TAGS', payload: {} });

    const reducer = browser.evaluate<Reducer>('userReducer');
    expect(reducer(undefined, { type: 'OTHER' })).toEqual({ session: null, received: false, tags: null });
    expect(reducer(undefined, { type: 'USER_RECEIVE', payload: { user: { name: 'Ann', role: 'admin' }, session: { id: 's' } } }))
      .toEqual({ session: { id: 's' }, received: true, tags: null, name: 'Ann', role: 'admin' });
    expect(reducer({ received: true }, { type: 'USER_RECEIVE_TAGS', payload: { tags: [1] } })).toEqual({ received: true, tags: [1] });
  });

  test('is a guest without a session id', async () => {
    await load('user', page(''));
    const store = run('userMiddleware', {}, { type: 'USER_REQUEST' });
    expect(store.dispatch).toHaveBeenCalledWith(guest);
    expect(browser.requests).toHaveLength(0);
  });

  test('loads the user of a session', async () => {
    await load('user', page('s1'));
    const store = run('userMiddleware', {}, { type: 'USER_REQUEST' });

    expect(browser.requests[0]).toMatchObject({ method: 'GET', url: '/api/user' });
    browser.requests[0].respond(200, userInfo);

    expect(store.dispatch).toHaveBeenCalledWith({ type: 'USER_RECEIVE', payload: userInfo });
  });

  test('is a guest when the session is rejected, and ignores other failures', async () => {
    await load('user', page('s1'));
    const store = run('userMiddleware', {}, { type: 'USER_REQUEST' });

    browser.requests[0].respond(500);
    expect(store.dispatch).not.toHaveBeenCalled();

    const second = run('userMiddleware', {}, { type: 'USER_REQUEST' });
    browser.requests[1].respond(401);
    expect(second.dispatch).toHaveBeenCalledWith(guest);
  });

  test('has no tags without a session id', async () => {
    await load('user', page(''));
    const store = run('userMiddleware', {}, { type: 'USER_REQUEST_TAGS' });
    expect(store.dispatch).toHaveBeenCalledWith({ type: 'USER_RECEIVE_TAGS', payload: { tags: [] } });
  });

  test('loads the tags of a session, falling back to none', async () => {
    await load('user', page('s1'));
    const store = run('userMiddleware', {}, { type: 'USER_REQUEST_TAGS' });

    expect(browser.requests[0]).toMatchObject({ method: 'GET', url: '/api/user/tags' });
    browser.requests[0].respond(200, [{ tag_id: 't1', type: 'liked' }]);
    expect(store.dispatch).toHaveBeenLastCalledWith({ type: 'USER_RECEIVE_TAGS', payload: { tags: [{ tag_id: 't1', type: 'liked' }] } });

    const failing = run('userMiddleware', {}, { type: 'USER_REQUEST_TAGS' });
    browser.requests[1].respond(401);
    expect(failing.dispatch).toHaveBeenLastCalledWith({ type: 'USER_RECEIVE_TAGS', payload: { tags: [] } });
  });
});

describe('postsList', () => {
  beforeEach(async () => {
    await load('postsList');
    await browser.evaluate('0');
    // postsList.ts refers to the action constants of the posts store
    browser.evaluate('const POSTS_ACTIONS = { RECEIVE: "POSTS_RECEIVE" }; const postsActions = { request: id => ({ type: "POSTS_REQUEST", payload: { id } }) };');
  });

  const reducer = () => browser.evaluate<Reducer>('postsListReducer');
  const withInstance = (extra = {}) => ({ i1: { posts: ['a'], ...extra } });

  describe('actions', () => {
    test('create the expected payloads', () => {
      expect(browser.evaluate('postsListActions.loadMore("i1")')).toEqual({ type: 'POSTS_LIST_LOAD_MORE', payload: { instance: 'i1' } });
      expect(browser.evaluate('postsListActions.loadNew("i1")')).toEqual({ type: 'POSTS_LIST_LOAD_NEW', payload: { instance: 'i1' } });
      expect(browser.evaluate('postsListActions.createFilter("i1")')).toEqual({ type: 'POSTS_LIST_CREATE_FILTER', payload: { instance: 'i1', likedTags: [], dislikedTags: [] } });
      expect(browser.evaluate('postsListActions.setFilterTags("i1", ["a"], ["b"])')).toEqual({ type: 'POSTS_LIST_SET_FILTER_TAGS', payload: { instance: 'i1', likedTags: ['a'], dislikedTags: ['b'] } });
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
      const store = run('postsListMiddleware', listState(), loadMore);

      expect(store.dispatch).toHaveBeenCalledWith({ type: 'POSTS_LIST_SET_IS_LOADING', payload: { instance: 'i1', isLoading: true } });
      return flush().then(() => {
        const url = new URL(browser.requests[0].url);
        expect(url.pathname).toBe('/api/posts');
        expect(Object.fromEntries(url.searchParams)).toEqual({ since: '900', before: '1001', likedTags: 'a', dislikedTags: 'b' });
      });
    });

    test('stores the page: paging info, post details and ids', async () => {
      browser.window.getPost = vi.fn(async (id: string) => ({ id, content: id }));
      const store = run('postsListMiddleware', listState(), loadMore);
      await flush();

      browser.requests[0].respond(200, [post('p1', 990), post('p2', 950)], { 'x-next-page-before': '900' });
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
      browser.window.getPost = vi.fn(async (id: string) => ({ id }));
      const store = run('postsListMiddleware', listState(), loadMore);
      await flush();

      browser.requests[0].respond(200, [post('p1', 990)]);
      await flush();

      expect(store.dispatch).toHaveBeenCalledWith({ type: 'POSTS_LIST_SET_NEXT_PAGE', payload: { nextPageBefore: -1, instance: 'i1' } });
    });

    test('does not move "before" when the list already has posts', async () => {
      browser.window.getPost = vi.fn(async (id: string) => ({ id }));
      const store = run('postsListMiddleware', listState({ posts: ['x'] }), loadMore);
      await flush();

      browser.requests[0].respond(200, [post('p1', 990)]);
      await flush();

      expect(store.dispatch.mock.calls.map(([action]) => action.type)).not.toContain('POSTS_LIST_SET_BEFORE');
    });

    test('keeps looking when an empty page still has a next page', async () => {
      const store = run('postsListMiddleware', listState(), loadMore);
      await flush();

      browser.requests[0].respond(200, [], { 'x-next-page-before': '500' });
      await flush();

      expect(store.dispatch).toHaveBeenCalledWith({ type: 'POSTS_LIST_LOAD_MORE', payload: { instance: 'i1' } });
    });

    test('stops loading on an empty last page', async () => {
      const store = run('postsListMiddleware', listState(), loadMore);
      await flush();

      browser.requests[0].respond(200, []);
      await flush();

      expect(store.dispatch).toHaveBeenLastCalledWith({ type: 'POSTS_LIST_SET_IS_LOADING', payload: { instance: 'i1', isLoading: false } });
    });

    test('stops loading when the request fails', async () => {
      const store = run('postsListMiddleware', listState(), loadMore);
      await flush();

      browser.requests[0].respond(500);
      await flush();

      expect(store.dispatch).toHaveBeenLastCalledWith({ type: 'POSTS_LIST_SET_IS_LOADING', payload: { instance: 'i1', isLoading: false } });
    });

    test.each([
      ['already loading', listState({ isLoading: true })],
      ['at the end of the list', listState({ nextPageBefore: -1 })],
    ])('does nothing when %s', async (_name, state) => {
      const store = run('postsListMiddleware', state, loadMore);
      await flush();
      expect(browser.requests).toHaveLength(0);
      expect(store.dispatch).not.toHaveBeenCalled();
      expect(store.next).toHaveBeenCalledOnce();
    });
  });

  describe('LOAD_NEW', () => {
    const state = { postsList: { i1: { likedTags: [], dislikedTags: [], before: 100 } }, bounds: { newest: 200 } };

    test('prepends newer posts and requests their details', async () => {
      const store = run('postsListMiddleware', state, { type: 'POSTS_LIST_LOAD_NEW', payload: { instance: 'i1' } });
      await flush();

      const url = new URL(browser.requests[0].url);
      expect(Object.fromEntries(url.searchParams)).toEqual({ since: '100', before: '200' });

      browser.requests[0].respond(200, [{ id: 'p9', type: 'post', created_at: 190 }, { id: 'p8', type: 'post', created_at: 150 }]);
      await flush();

      expect(store.dispatch).toHaveBeenCalledWith({ type: 'POSTS_LIST_SET_BEFORE', payload: { before: 190, instance: 'i1' } });
      expect(store.dispatch).toHaveBeenCalledWith({ type: 'POSTS_LIST_PREPEND', payload: { posts: ['p9', 'p8'] } });
      expect(store.dispatch).toHaveBeenCalledWith({ type: 'POSTS_REQUEST', payload: { id: 'p9' } });
    });

    test('does nothing when there are no newer posts', async () => {
      const store = run('postsListMiddleware', state, { type: 'POSTS_LIST_LOAD_NEW', payload: { instance: 'i1' } });
      await flush();
      browser.requests[0].respond(200, []);
      await flush();
      expect(store.dispatch).not.toHaveBeenCalled();
    });
  });
});
