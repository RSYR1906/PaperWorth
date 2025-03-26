importScripts('https://storage.googleapis.com/workbox-cdn/releases/4.3.1/workbox-sw.js');

const CACHE_VERSION = 'v2'; // Increment this when you want to force an update

if (workbox) {
    const { routing, strategies, expiration } = workbox;

    routing.registerRoute(
        /\.(?:css|js|jsx|json)$/,  // Fixed regex
        new strategies.StaleWhileRevalidate({
            cacheName: 'assets',
            plugins: [
                new expiration.Plugin({
                    maxEntries: 1000,
                    maxAgeSeconds: 31536000
                })
            ]
        })
    );

    routing.registerRoute(
        /\.(?:png|jpg|jpeg|gif|woff2)$/,  // Fixed regex
        new strategies.CacheFirst({
            cacheName: 'images',
            plugins: [
                new expiration.Plugin({
                    maxEntries: 1000,
                    maxAgeSeconds: 31536000
                })
            ]
        })
    );

    routing.registerRoute(
        /\/$/,  // Fixed regex for root URL
        new strategies.StaleWhileRevalidate({
            cacheName: 'startPage',
            plugins: [
                new expiration.Plugin({
                    maxEntries: 1000,
                    maxAgeSeconds: 31536000
                })
            ]
        })
    );

    routing.registerRoute(
        /\/favicon.ico$/,  // Matches the favicon.ico file
        new strategies.CacheFirst({
            cacheName: 'favicon',
            plugins: [
                new expiration.Plugin({
                    maxEntries: 1,  // Cache only 1 favicon
                    maxAgeSeconds: 31536000  // Cache for 1 year
                })
            ]
        })
    );

    routing.registerRoute(
        /\/manifest.webmanifest$/,  // Matches the manifest.webmanifest file
        new strategies.CacheFirst({
            cacheName: 'manifest',
            plugins: [
                new expiration.Plugin({
                    maxEntries: 1,  // Cache only 1 manifest file
                    maxAgeSeconds: 31536000  // Cache for 1 year
                })
            ]
        })
    );


} else {
    console.log('Workbox failed to load');
}