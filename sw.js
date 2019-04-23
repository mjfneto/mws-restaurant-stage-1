const CACHE_NAME = 'rReviews-static-v1';

/**
   * On every serviceWoker install event resources are added
   * to the static cache.
   */
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll([
                '/',
                `/restaurant.html`,
                'css/styles.css',
                'data/restaurants.json',
                'js/dbhelper.js',
                'js/main.js',
                'js/restaurant_info.js',
                'img/1.jpg',
                'img/2.jpg',
                'img/3.jpg',
                'img/4.jpg',
                'img/5.jpg',
                'img/6.jpg',
                'img/7.jpg',
                'img/8.jpg',
                'img/9.jpg',
                'img/10.jpg',
                'https://unpkg.com/leaflet@1.3.1/dist/leaflet.css',
                'https://unpkg.com/leaflet@1.3.1/dist/leaflet.js'
            ]);
        })
    );
});

/**
   * serviceWorker activation is listened to provide a basis for
   * replacing older cache versions for newer ones.
   */
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.filter(cacheName => {
                    return cacheName.startsWith('rReviews-') && cacheName !== CACHE_NAME;
                }).map(cacheName => {
                    return caches.delete(cacheName);
                })
            )
        })
    )
});

/**
   * To every fetch done by a page
   * caches are verified to get stored resources.
   * In case a request is not contained in one of the caches,
   * a fetch is done to get the resource.
   */
self.addEventListener('fetch', event => {
    const regex = new RegExp('\\?id=\\d*');
    if (regex.test(event.request.url)) {
        event.respondWith(caches.match('/restaurant.html'))
        return;
    };

    event.respondWith(
        caches.match(event.request).then(response => {
            if (response) return response;

            const fetchRequest = event.request.clone();

            return fetch(fetchRequest).then(response => {
                if (!response || response.status !== 200 || response.type !== 'basic') {
                    return response;
                }

                const responseToCache = response.clone();

                caches.open(CACHE_NAME).then(cache => {
                    cache.put(event.request, responseToCache);
                })

                return response;
            });
        })
    );
});