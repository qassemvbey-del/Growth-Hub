const CACHE_NAME = 'growth-hub-v2'
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
  self.skipWaiting()
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  )
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
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

// Background Notification Support via postMessage
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, body, icon, badge, tag } = event.data
    self.registration.showNotification(title, {
      body: body || '',
      icon: icon || '/icons/icon-512.png',
      badge: badge || '/icons/icon-192.png',
      vibrate: [200, 100, 200],
      requireInteraction: true,
      tag: tag || 'pomodoro-timer',
      renotify: true,
    })
  }
})

// When user taps the notification, focus the app window
self.addEventListener('notificationclick', event => {
  event.notification.close()
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      if (clients.length > 0) {
        return clients[0].focus()
      }
      return self.clients.openWindow('/')
    })
  )
})
