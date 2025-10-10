const CACHE_NAME = 'cobranzas-app-v14'; // 🔄 cambia la versión en cada despliegue
const urlsToCache = [
    '/',
    '/static/js/app.js',
    '/static/js/pwa.js',
    '/static/manifest.json',
    'https://cdn.tailwindcss.com',
    'https://cdn.jsdelivr.net/npm/chart.js'
];

// Install event → cachea recursos y activa de inmediato el nuevo SW
self.addEventListener('install', (event) => {
    self.skipWaiting(); // fuerza la activación inmediata
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                return cache.addAll(urlsToCache);
            })
    );
});

// Fetch event → primero busca en caché, si no existe lo trae de la red
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                return response || fetch(event.request);
            })
    );
});

// Activate event → limpia caches antiguas y toma control de los clientes
self.addEventListener('activate', (event) => {
    event.waitUntil(
        (async () => {
            const cacheNames = await caches.keys();
            await Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
            await self.clients.claim(); // controla todas las pestañas sin esperar reload manual
        })()
    );
});
