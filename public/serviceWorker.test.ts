import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

type Listener = (event: unknown) => void;

const listeners: Record<string, Listener> = {};
const cache = { addAll: vi.fn(), put: vi.fn() };
const caches = { delete: vi.fn(), open: vi.fn(), match: vi.fn(), keys: vi.fn() };
const fetchMock = vi.fn();
const scope = {
  registration: {},
  origin: 'https://wall.example',
  navigator: { onLine: true },
  addEventListener: (type: string, listener: Listener) => {
    listeners[type] = listener;
  },
};

// loaded by variable path: the worker's own types (WebWorker lib) differ from the ones of this test
const workerPath = './serviceWorker';

const load = async () => {
  vi.resetModules();
  await import(/* @vite-ignore */ workerPath);
};

const SESSION = '11111111-2222-3333-4444-555555555555';
const CLIENT = 'client-1';

const sessionMessage = (sessionId: string, clientId = CLIENT) => {
  const waitUntil = vi.fn();
  listeners.message({ data: { type: 'SW_SESSION', sessionId }, source: { id: clientId }, waitUntil });
  return Promise.all(waitUntil.mock.calls.map(([promise]) => promise));
};

const fetchEvent = (url: string, method = 'GET', clientId = CLIENT) => {
  const request = new Request(url, { method });
  const event = { request, clientId, respondWith: vi.fn() };
  listeners.fetch(event);
  return { request, event, response: () => event.respondWith.mock.calls[0]?.[0] as Promise<Response> };
};

beforeEach(() => {
  Object.keys(listeners).forEach(key => delete listeners[key]);
  vi.resetAllMocks();
  caches.open.mockResolvedValue(cache);
  caches.delete.mockResolvedValue(true);
  caches.match.mockResolvedValue(undefined);
  caches.keys.mockResolvedValue([]);
  scope.navigator.onLine = true;
  vi.stubGlobal('self', scope);
  vi.stubGlobal('caches', caches);
  vi.stubGlobal('fetch', fetchMock);
  vi.spyOn(console, 'log').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('loading', () => {
  test('refuses to run outside a service worker', async () => {
    vi.stubGlobal('self', { addEventListener: vi.fn() });
    await expect(load()).rejects.toThrow('serviceWorker.js must run in a service worker');
  });

  test('listens to install, fetch and message events', async () => {
    await load();
    expect(Object.keys(listeners).sort()).toEqual(['activate', 'fetch', 'install', 'message']);
  });
});

describe('install', () => {
  test('replaces the cache with the app shell', async () => {
    await load();
    const waitUntil = vi.fn();

    listeners.install({ waitUntil });
    await Promise.all(waitUntil.mock.calls.map(([promise]) => promise));

    expect(caches.delete).toHaveBeenCalledWith('node-wall-cache-v3');
    expect(caches.open).toHaveBeenCalledWith('node-wall-cache-v3');
    expect(cache.addAll).toHaveBeenCalledWith(expect.arrayContaining(['/', '/wall', '/static/components/_component.js', '/static/stores/redux.js']));
  });
});

describe('fetch', () => {
  beforeEach(async () => {
    await load();
    await sessionMessage(SESSION);
    fetchMock.mockResolvedValue(new Response('network'));
  });

  test.each([
    ['https://wall.example/api/posts', true],
    ['https://wall.example/api/posts/p1', true],
    ['https://wall.example/api/tags/t1', true],
    ['https://wall.example/api/link?uri=x', true],
    ['https://wall.example/api/user/tags', true],
    ['https://wall.example/api/translation/a', true],
    ['https://wall.example/static/components/x.js', true],
    ['https://wall.example/api/user', false],
    ['https://wall.example/api/comment/c1', false],
    ['https://other.example/static/x.js', false],
  ])('caching %s: %s', async (url, cached) => {
    const { request, response } = fetchEvent(url);
    await response();

    expect(caches.match.mock.calls.length > 0).toBe(cached);
    expect(fetchMock).toHaveBeenCalledWith(request);
  });

  test('never caches non-GET requests', async () => {
    const { response } = fetchEvent('https://wall.example/api/posts', 'POST');
    await response();
    expect(caches.match).not.toHaveBeenCalled();
    expect(cache.put).not.toHaveBeenCalled();
  });

  test('serves app shell files from the cache', async () => {
    const cached = new Response('cached');
    caches.match.mockResolvedValue(cached);

    const { response } = fetchEvent('https://wall.example/static/components/_component.js');

    expect(await response()).toBe(cached);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('fetches other cacheable requests and stores the response', async () => {
    caches.match.mockResolvedValue(new Response('stale'));

    const { response } = fetchEvent('https://wall.example/api/posts/p1');
    const result = await response();
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(await result.text()).toBe('network');
    expect(caches.open).toHaveBeenCalledWith(`node-wall-session-${SESSION}`);
    expect(cache.put).toHaveBeenCalledWith('https://wall.example/api/posts/p1', expect.any(Response));
  });

  test('keeps per-user responses out of the shared cache', async () => {
    const { response } = fetchEvent('https://wall.example/api/user/tags');
    await response();

    expect(caches.match).toHaveBeenCalledWith('https://wall.example/api/user/tags', { cacheName: `node-wall-session-${SESSION}` });
  });

  test('uses the shared cache for public responses', async () => {
    const { response } = fetchEvent('https://wall.example/api/translation/a');
    await response();

    expect(caches.match).toHaveBeenCalledWith('https://wall.example/api/translation/a', { cacheName: 'node-wall-cache-v3' });
  });

  test('does not cache per-user responses for pages that reported no session', async () => {
    const { response } = fetchEvent('https://wall.example/api/posts?status=pending', 'GET', 'unknown');
    await response();

    expect(caches.match).not.toHaveBeenCalled();
    expect(cache.put).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalled();
  });

  test('does not cache per-user responses after the page logged out', async () => {
    await sessionMessage('');
    const { response } = fetchEvent('https://wall.example/api/posts');
    await response();

    expect(cache.put).not.toHaveBeenCalled();
  });

  test('falls back to the cached response when the network fails', async () => {
    const stale = new Response('stale');
    caches.match.mockResolvedValue(stale);
    fetchMock.mockRejectedValue(new Error('offline'));

    const { response } = fetchEvent('https://wall.example/api/posts/p1');

    expect(await response()).toBe(stale);
  });

  test('fails with a network error when offline and nothing is cached', async () => {
    fetchMock.mockRejectedValue(new Error('offline'));

    const { response } = fetchEvent('https://wall.example/api/posts/p1');
    const result = await response();

    expect(result.type).toBe('error');
  });

  test('does not hit the network when the browser is offline', async () => {
    scope.navigator.onLine = false;
    const stale = new Response('stale');
    caches.match.mockResolvedValue(stale);

    const { response } = fetchEvent('https://wall.example/api/posts/p1');

    expect(await response()).toBe(stale);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('passes uncached requests straight to the network', async () => {
    const { event } = fetchEvent('https://wall.example/api/user');
    expect(event.respondWith).toHaveBeenCalledWith(expect.any(Promise));
    expect(caches.match).not.toHaveBeenCalled();
  });
});

describe('cleanup', () => {
  beforeEach(() => load());

  const other = 'aaaaaaaa-2222-3333-4444-555555555555';

  test('activation drops old versions and every unclaimed session cache', async () => {
    caches.keys.mockResolvedValue(['node-wall-cache-v1', 'node-wall-cache-v2', 'node-wall-cache-v3', `node-wall-session-${SESSION}`]);
    const waitUntil = vi.fn();

    listeners.activate({ waitUntil });
    await Promise.all(waitUntil.mock.calls.map(([promise]) => promise));

    expect(caches.delete.mock.calls.map(([name]) => name).sort()).toEqual(['node-wall-cache-v1', `node-wall-session-${SESSION}`]);
  });

  test('a new session removes the caches of other sessions', async () => {
    caches.keys.mockResolvedValue(['node-wall-cache-v3', `node-wall-session-${other}`, `node-wall-session-${SESSION}`]);

    await sessionMessage(SESSION);

    expect(caches.delete.mock.calls.map(([name]) => name)).toEqual([`node-wall-session-${other}`]);
  });

  test('logging out removes the session cache', async () => {
    await sessionMessage(SESSION);
    caches.keys.mockResolvedValue(['node-wall-cache-v3', `node-wall-session-${SESSION}`]);

    await sessionMessage('');

    expect(caches.delete).toHaveBeenCalledWith(`node-wall-session-${SESSION}`);
  });

  test('keeps caches of sessions other pages still use', async () => {
    await sessionMessage(SESSION, 'client-1');
    await sessionMessage(other, 'client-2');
    caches.keys.mockResolvedValue(['node-wall-cache-v3', `node-wall-session-${SESSION}`, `node-wall-session-${other}`]);
    caches.delete.mockClear();

    await sessionMessage('', 'client-1');

    expect(caches.delete.mock.calls.map(([name]) => name)).toEqual([`node-wall-session-${SESSION}`]);
  });
});

test('logs messages from pages', async () => {
  await load();
  listeners.message({ data: 'hi' });
  expect(console.log).toHaveBeenCalledWith('message', 'hi');
});
