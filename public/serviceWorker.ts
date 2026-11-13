const CACHE_NAME = 'node-wall-cache-v2';
const SESSION_CACHE_PREFIX = 'node-wall-session-';
const SESSION_MESSAGE = 'SW_SESSION';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// responses depending on the session cookie, cached per session only
const SESSION_SCOPED_PATHS = [/\/api\/tags\//, /\/api\/posts/, /\/api\/user\/tags/];
// the worker cannot read the HttpOnly cookie, so pages report their session id; lost on worker restart
const clientSessions = new Map<string, string>();
const urlsToCache = [
  '/',
  '/wall',
  '/static/components/_component.js',
  '/static/components/compose-post.js',
  '/static/components/compose-post.css',
  '/static/components/content-wrapper.js',
  '/static/components/content-wrapper.css',
  '/static/components/link-preview.js',
  '/static/components/link-preview.css',
  '/static/components/login-page.js',
  '/static/components/login-page.css',
  '/static/components/main-wrapper.js',
  '/static/components/main-wrapper.css',
  '/static/components/moderation-page.js',
  '/static/components/moderation-page.css',
  '/static/components/navigation-wrapper.js',
  '/static/components/navigation-wrapper.css',
  '/static/components/post-editor.js',
  '/static/components/post-editor.css',
  '/static/components/post-list.js',
  '/static/components/post-list.css',
  '/static/components/post-preview.js',
  '/static/components/post-preview.css',
  '/static/components/post-tags-input.js',
  '/static/components/post-tags-input.css',
  '/static/components/post-wall.js',
  '/static/components/post-wall.css',
  '/static/components/privacy-page.js',
  '/static/components/privacy-page.css',
  '/static/components/profile-page.js',
  '/static/components/profile-page.css',
  '/static/components/tag-inline.js',
  '/static/components/tag-inline.css',
  '/static/components/tag-page.js',
  '/static/components/tag-page.css',
  '/static/components/translate-text.js',
  '/static/components/translate-text.css',
  '/static/components/welcome-page.js',
  '/static/components/welcome-page.css',
  '/static/media/notification.mp3',
  '/static/stores/redux.js',
];

function isServiceWorkerScope(scope: WorkerGlobalScope): scope is ServiceWorkerGlobalScope {
  return 'registration' in scope;
}

if (!isServiceWorkerScope(self)) {
  throw new Error('serviceWorker.js must run in a service worker');
}

const scope: ServiceWorkerGlobalScope = self;

const getSessionCacheName = (sessionId: string) => `${SESSION_CACHE_PREFIX}${sessionId}`;

const isSessionScoped = (request: Request) => SESSION_SCOPED_PATHS.some(pattern => pattern.test(new URL(request.url).pathname));

/** Drops every cache that is neither the shared one nor the cache of a session a page still reports. */
async function cleanupCaches() {
  const active = new Set([CACHE_NAME, ...Array.from(clientSessions.values(), getSessionCacheName)]);
  const names = await caches.keys();
  await Promise.all(names.filter(name => !active.has(name)).map(name => caches.delete(name)));
}

scope.addEventListener('install', function (event) {
  // Perform install steps
  event.waitUntil(caches.delete(CACHE_NAME));
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function (cache) {
        return cache.addAll(urlsToCache);
      })
  );
});

scope.addEventListener('activate', function (event) {
  // sessions are unknown after a (re)start, so leftovers of old workers and sessions go
  event.waitUntil(cleanupCaches());
});

function shouldCache(request: Request) {
  const url = new URL(request.url);

  if (self.origin !== url.origin) {
    return false;
  }

  if (request.method.toUpperCase() !== 'GET') {
    return false;
  }

  if (/\/api\/tags\//.test(url.pathname)) {
    return true;
  }

  if (/\/api\/posts/.test(url.pathname)) {
    return true;
  }

  if (/\/api\/link/.test(url.pathname)) {
    return true;
  }

  if (/\/api\/user\/tags/.test(url.pathname)) {
    return true;
  }

  if (/\/api\/translation/.test(url.pathname)) {
    return true;
  }

  if (/\/api\//.test(url.pathname)) {
    return false;
  }

  return true;
}

async function putCache(cacheName: string, stringUrl: string, responsePromise: Promise<Response>) {
  try {
    const cache = await caches.open(cacheName);
    // urlsToCache.push(stringUrl);
    await cache.put(stringUrl, await responsePromise.then(r => r.clone()));
  } catch (e) {
    //
  }
}

// on-demand cache, for ex. translations
scope.addEventListener('fetch', function (event) {
  const sessionId = clientSessions.get(event.clientId);
  const sessionScoped = isSessionScoped(event.request);
  // per-user responses are never cached without a known session
  const cacheable = shouldCache(event.request) && (!sessionScoped || sessionId !== undefined);

  if (cacheable) {
    event.respondWith(async function () {
      const stringUrl = event.request.url;
      const url = new URL(stringUrl);
      const cacheName = sessionScoped && sessionId ? getSessionCacheName(sessionId) : CACHE_NAME;

      const match = await caches.match(stringUrl, { cacheName });
      if (match && urlsToCache.includes(url.pathname)) {
        return match;
      }

      if ('onLine' in self.navigator && !self.navigator.onLine) {
        return match ?? Response.error();
      }

      const fetchResponseP = fetch(event.request);

      // event.waitUntil(await putCache(cacheName, stringUrl, fetchResponseP));
      putCache(cacheName, stringUrl, fetchResponseP).catch(function () {});

      return fetchResponseP.catch(() => match ?? Response.error());
    }());
  } else {
    event.respondWith(fetch(event.request));
  }
});

scope.addEventListener('message', function (event) {
  const data = event.data;
  const clientId = event.source && 'id' in event.source ? event.source.id : undefined;

  if (data?.type === SESSION_MESSAGE && clientId) {
    // an empty or invalid id means logged out
    if (UUID_PATTERN.test(data.sessionId)) {
      clientSessions.set(clientId, data.sessionId);
    } else {
      clientSessions.delete(clientId);
    }
    event.waitUntil(cleanupCaches());
    return;
  }

  console.log('message', data);
});
