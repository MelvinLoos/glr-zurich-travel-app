const CACHE_NAME = 'glr-zurich-v4-fixes'; // Version bumped
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  'https://cdn.tailwindcss.com',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // We try to add all, but if one fails (like a CORS restricted CDN), we log it and continue.
      // Ideally, external CDNs should be cached with {mode: 'no-cors'} if needed, 
      // but for this simple setup, we'll try standard addAll.
      return cache.addAll(ASSETS).catch(err => console.warn("Some assets failed to cache:", err));
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
  // Only cache GET requests
  if (e.request.method !== 'GET') return;

  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Return cached response immediately
        return cachedResponse;
      }

      // If not in cache, fetch from network
      return fetch(e.request).then((networkResponse) => {
        // Valid response?
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          // If it's an opaque response (type === 'opaque', typical for CDNs without CORS), 
          // we can still cache it, but we can't inspect it.
          // However, for safety in this specific debugging case, let's just return it without caching if it's tricky.
          // BUT: for offline support, we WANT to cache opaque responses if possible.
          
          // Let's try to cache everything that is a GET request to allow offline usage.
        }

        // Clone response because it can only be consumed once
        const responseToCache = networkResponse.clone();

        caches.open(CACHE_NAME).then((cache) => {
          cache.put(e.request, responseToCache);
        });

        return networkResponse;
      }).catch((err) => {
        // Network failed (offline), and nothing in cache?
        // You could return a fallback offline page here if you had one.
        console.warn("Fetch failed:", err);
      });
    })
  );
});