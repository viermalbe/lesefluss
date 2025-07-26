// Service Worker für Lesefluss PWA
// Minimale Version ohne Offline-Funktionalität

const CACHE_NAME = 'lesefluss-v1';

// Installationsereignis
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installiert');
  self.skipWaiting();
});

// Aktivierungsereignis
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Aktiviert');
  
  // Alte Caches löschen
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Lösche alten Cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  
  return self.clients.claim();
});

// Fetch-Ereignis - Minimale Implementierung ohne Offline-Support
self.addEventListener('fetch', (event) => {
  // Hier könnten später Offline-Funktionalitäten hinzugefügt werden
  // Aktuell wird nur der Standard-Fetch durchgeführt
});
