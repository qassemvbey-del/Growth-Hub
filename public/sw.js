const CACHE_NAME = 'growth-hub-v1'
const urlsToCache = [
  '/manifest.json',
  '/logo.svg',
  '/icon.svg',
  '/file.svg',
  '/globe.svg',
  '/next.svg',
  '/vercel.svg',
  '/window.svg',
]

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  )
})

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) return response
        return fetch(event.request)
      })
  )
})
