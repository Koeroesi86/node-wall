// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { installFakeXhr, type FakeRequest } from '../test-utils/xhr.ts';
import { createAppStore, getStore, setStore } from './index.ts';
import { tagsActions } from './tags.ts';
import { userActions } from './user.ts';

let requests: FakeRequest[];

beforeEach(() => {
  vi.useFakeTimers();
  requests = installFakeXhr();
  document.head.innerHTML = '<meta name="x-session-id" content="">';
});

afterEach(() => {
  setStore(undefined);
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('the store', () => {
  test('has the state of every slice', () => {
    expect(Object.keys(createAppStore().getState()).sort()).toEqual(
      ['bounds', 'comments', 'links', 'posts', 'postsList', 'serviceWorker', 'tags', 'user'],
    );
  });

  test('starts empty, with a user that is not known yet', () => {
    expect(createAppStore().getState()).toMatchObject({
      tags: {},
      posts: {},
      bounds: { newest: null, oldest: null },
      user: { received: false, tags: null, session: null },
    });
  });

  test('runs the actions through the middleware and into the reducers', () => {
    const store = createAppStore();

    store.dispatch(tagsActions.request('11111111-2222-3333-4444-555555555555'));
    expect(requests[0]).toMatchObject({ method: 'GET', url: '/api/tags/11111111-2222-3333-4444-555555555555' });
    requests[0].respond(200, { id: '11111111-2222-3333-4444-555555555555', name: 'news', type: 'text' });

    expect(store.getState().tags['11111111-2222-3333-4444-555555555555']).toMatchObject({ name: 'news' });
  });

  test('makes a visitor without a session a guest without asking the server', () => {
    const store = createAppStore();

    store.dispatch(userActions.request());

    expect(store.getState().user).toMatchObject({ received: true, role: 'guest', session: false });
    expect(requests.filter(request => request.url === '/api/user')).toHaveLength(0);
  });

  test('polls the bounds shortly after it starts', () => {
    createAppStore();

    vi.advanceTimersByTime(100);

    expect(requests.map(request => request.url)).toContain('/api/posts/bounds');
  });

  test('is created once and can be replaced', () => {
    const store = getStore();
    expect(getStore()).toBe(store);

    const replacement = { getState: vi.fn(), dispatch: vi.fn(), subscribe: vi.fn() };
    setStore(replacement);
    expect(getStore()).toBe(replacement);
  });
});
