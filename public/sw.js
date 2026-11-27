// Network-only service worker: enables PWA installation without offline caching.
self.addEventListener('install', event => {
  event.waitUntil(self.skipWaiting())
})

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', event => {
  const requestUrl = new URL(event.request.url)

  // Let cross-origin requests use the browser's normal network handling.
  if (requestUrl.origin !== self.location.origin) return

  // Deliberately forward same-origin requests to the network; no Cache API is used.
  event.respondWith(fetch(event.request))
})
