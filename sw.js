// ============================================
// 📱 Service Worker - شركة العبادي
// ============================================

const CACHE_NAME = 'alabady-cache-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/login.html',
    '/dashboard.html',
    '/products.html',
    '/sales.html',
    '/purchases.html',
    '/customers.html',
    '/suppliers.html',
    '/accounts.html',
    '/expenses.html',
    '/reports.html',
    '/users.html',
    '/settings.html',
    '/css/style.css',
    '/js/supabase.js',
    '/js/db.js',
    '/js/session.js',
    '/js/app.js'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(urlsToCache))
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => response || fetch(event.request))
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});