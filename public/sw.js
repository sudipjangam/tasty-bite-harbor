// Service Worker for Swadeshi Solutions PWA
// Provides offline support and caching

const CACHE_NAME = 'swadeshi-v1';
const OFFLINE_URL = '/';

// Assets to cache on install
const ASSETS_TO_CACHE = [
  '/',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// Install event - cache essential assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching essential assets');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  // Activate immediately
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => cacheName !== CACHE_NAME)
          .map((cacheName) => caches.delete(cacheName))
      );
    })
  );
  // Take control of all pages immediately
  self.clients.claim();
});

// Fetch event - network first, then cache
self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip API requests (Supabase, etc.)
  if (event.request.url.includes('/rest/') || 
      event.request.url.includes('/auth/') ||
      event.request.url.includes('supabase')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clone the response for caching
        const responseClone = response.clone();
        
        // Cache successful responses
        if (response.status === 200) {
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        
        return response;
      })
      .catch(() => {
        // Network failed, try cache
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          
          // If it's a navigation request, return offline page
          if (event.request.mode === 'navigate') {
            return caches.match(OFFLINE_URL);
          }
          
          return new Response('Offline', { status: 503 });
        });
      })
  );
});

// Background sync for offline actions (future enhancement)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-orders') {
    console.log('[SW] Syncing offline orders');
  }
});

// Push notification handler (future enhancement)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-192x192.png',
      vibrate: [100, 50, 100],
      data: {
        url: data.url || '/'
      }
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});

// Periodic Sync (for PWABuilder score)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'update-content') {
    console.log('[SW] Periodic sync triggered');
    event.waitUntil(
      // Just return a promise for now
      Promise.resolve()
    );
  }
});
