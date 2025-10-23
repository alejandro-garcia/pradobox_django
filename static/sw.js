const CACHE_NAME = 'cobranzas-app-v24';
const urlsToCache = [
    '/',
    '/static/js/app.js',
    '/static/js/pwa.js',
    '/static/manifest.json',
    'https://cdn.tailwindcss.com',
    'https://cdn.jsdelivr.net/npm/chart.js'
];

// Instalar → cachea y activa inmediatamente
self.addEventListener('install', (event) => {
    event.waitUntil(
        (async () => {
            const cache = await caches.open(CACHE_NAME);
            await cache.addAll(urlsToCache);
            self.skipWaiting();
        })()
    );
});

// Activar → limpia versiones anteriores y notifica
self.addEventListener('activate', (event) => {
    event.waitUntil(
        (async () => {
            const cacheNames = await caches.keys();
            for (const cacheName of cacheNames) {
                if (cacheName !== CACHE_NAME) {
                    await caches.delete(cacheName);
                }
            }
            await self.clients.claim();

            // 🔔 Notifica a todas las pestañas abiertas
            const clientsList = await self.clients.matchAll({ includeUncontrolled: true });
            for (const client of clientsList) {
                client.postMessage({ type: 'NEW_VERSION_AVAILABLE' });
            }
        })()
    );
});

// Fetch event → primero busca en caché, si no existe lo trae de la red 
self.addEventListener('fetch', (event) => 
    { event.respondWith(caches.match(event.request)
                        .then((response) => { 
                                return response || fetch(event.request); 
                            }) 
                        ); 
    });


self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        console.log('⏭️ Recibido mensaje SKIP_WAITING → activando nuevo SW...');
        self.skipWaiting();
    }
});