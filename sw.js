const CACHE_NAME = 'glr-zurich-v5-cors-fix';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
];

// External assets that might cause CORS issues
const EXTERNAL_ASSETS = [
  'https://cdn.tailwindcss.com',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // 1. Cache local assets (critical)
      await cache.addAll(ASSETS);
      
      // 2. Try to cache external assets, but don't fail installation if one fails
      // We use {mode: 'no-cors'} for external opaque resources if needed, 
      // but 'addAll' is atomic (all or nothing). So we loop manually.
      const externalPromises = EXTERNAL_ASSETS.map(async (url) => {
        try {
          const req = new Request(url, { mode: 'no-cors' }); // Request as opaque
          const res = await fetch(req);
          await cache.put(req, res);
        } catch (err) {
          console.warn(`Failed to cache external asset: ${url}`, err);
        }
      });
      
      await Promise.all(externalPromises);
    })
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== CACHE_NAME) {
          return caches.delete(key);
        }
      }));
    })
  );
  return self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  // Only handle GET requests
  if (e.request.method !== 'GET') return;

  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      // Return cache if found
      if (cachedResponse) {
        return cachedResponse;
      }

      // Network fallback
      return fetch(e.request).then((networkResponse) => {
        // Check if we received a valid response
        if (!networkResponse || (networkResponse.status !== 200 && networkResponse.type !== 'opaque')) {
          return networkResponse;
        }

        // Clone response because it can only be consumed once
        const responseToCache = networkResponse.clone();

        caches.open(CACHE_NAME).then((cache) => {
          try {
             cache.put(e.request, responseToCache);
          } catch (err) {
             console.warn("Cache put failed for:", e.request.url);
          }
        });

        return networkResponse;
      }).catch(() => {
        // Offline fallback logic could go here
      });
    })
  );
});