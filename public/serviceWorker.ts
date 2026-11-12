const CACHE_NAME = 'node-wall-cache-v1';
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

async function putCache(stringUrl: string, responsePromise: Promise<Response>) {
  try {
    const cache = await caches.open(CACHE_NAME);
    // urlsToCache.push(stringUrl);
    await cache.put(stringUrl, await responsePromise.then(r => r.clone()));
  } catch (e) {
    //
  }
}

// on-demand cache, for ex. translations
scope.addEventListener('fetch', function (event) {
  if (shouldCache(event.request)) {
    event.respondWith(async function () {
      const stringUrl = event.request.url;
      const url = new URL(stringUrl);

      const match = await caches.match(stringUrl);
      if (match && urlsToCache.includes(url.pathname)) {
        return match;
      }

      if ('onLine' in self.navigator && !self.navigator.onLine) {
        return match ?? Response.error();
      }

      const fetchResponseP = fetch(event.request);

      // event.waitUntil(await putCache(stringUrl, fetchResponseP));
      putCache(stringUrl, fetchResponseP).catch(function () {});

      return fetchResponseP.catch(() => match ?? Response.error());
    }());
  } else {
    event.respondWith(fetch(event.request));
  }
});

scope.addEventListener('message', function(event){
  const data = event.data;

  // The unique ID of the tab
  // var clientId = event.source.id

  console.log('message', data);
});
