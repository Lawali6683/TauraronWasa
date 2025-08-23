self.addEventListener('install', function(event) {
    self.skipWaiting();
});

self.addEventListener('activate', function(event) {
    event.waitUntil(self.clients.claim());
});

// Caching na app shell (optional)
const CACHE_NAME = "tauraronwasa-v1";
const urlsToCache = [
    "/",
    "/index.html",
     "/comment.html",
      "/viewComent.html",
       "/wanniComent.html",
    "/manifest.json",
    "/sw.js",
    "https://i.imgur.com/CgvdgMA.png"
];

self.addEventListener('fetch', function(event) {
    event.respondWith(
        caches.match(event.request)
            .then(function(response) {
                return response || fetch(event.request);
            })
    );
});

// Listen for push events
self.addEventListener('push', function(event) {
    let data;
    try {
        data = event.data ? event.data.json() : {};
    } catch (e) {
        data = {
            title: 'TauraronWasa Sabon Sako!',
            body: 'An samu sabon sako daga TauraronWasa.',
            icon: 'https://i.imgur.com/CgvdgMA.png',
            url: '/'
        };
    }

    const title = data.title || 'TauraronWasa Sabon Sako!';
    const body = data.body || '';
    const icon = data.icon || 'https://i.imgur.com/CgvdgMA.png';
    const badge = data.badge || 'https://i.imgur.com/CgvdgMA.png';
    const url = data.url || '/';

    const options = {
        body,
        icon,
        badge,
        data: { url },
        // Kuna iya ƙara wasu zaɓuɓɓuka anan, misali:
        // tag: 'sakon-tag-na-musamman',
        // renotify: true,
        // vibrate: [200, 100, 200]
    };

    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

// For notification click
self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: "window" }).then(function(clientList) {
            const urlToOpen = event.notification.data.url || '/';
            for (const client of clientList) {
                if (client.url.includes(urlToOpen) && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});