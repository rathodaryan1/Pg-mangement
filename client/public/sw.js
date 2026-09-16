const CACHE_NAME = 'urbannest-v2';

self.addEventListener('install', (event) => {
  // Activate immediately without waiting for old clients to close
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Purge all stale caches (including urbannest-cache-v1) and claim clients immediately
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Only process GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // 1. Never cache backend API requests or cross-origin requests
  if (url.pathname.startsWith('/api') || url.origin !== self.location.origin) {
    return;
  }

  // 2. Navigation / HTML Document requests: ALWAYS Network-First
  // Prevents serving stale index.html referencing deleted/old hashed JS bundles
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match('/index.html') || fetch(event.request);
      })
    );
    return;
  }

  // 3. Static Assets: Network-First with cache fallback
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});
