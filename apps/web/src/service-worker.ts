/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

import { build, files, version } from '$service-worker';

declare let self: ServiceWorkerGlobalScope;

const CACHE_NAME = `spritebox-cache-${version}`;

// Assets to cache immediately on install
const STATIC_ASSETS = [
	...build, // the app itself (JS/CSS bundles)
	...files  // static files from /static
];

// Install: Cache static assets
self.addEventListener('install', (event) => {
	event.waitUntil(
		caches
			.open(CACHE_NAME)
			.then((cache) => cache.addAll(STATIC_ASSETS))
			.then(() => self.skipWaiting())
	);
});

// Activate: Clean up old caches
self.addEventListener('activate', (event) => {
	event.waitUntil(
		caches.keys().then((keys) => {
			return Promise.all(
				keys
					.filter((key) => key !== CACHE_NAME && key.startsWith('spritebox-cache-'))
					.map((key) => caches.delete(key))
			);
		}).then(() => self.clients.claim())
	);
});

// Fetch: Network-first for API/socket, cache-first for static assets
self.addEventListener('fetch', (event) => {
	const url = new URL(event.request.url);

	// Skip non-GET requests
	if (event.request.method !== 'GET') return;

	// Skip WebSocket and API requests (let them go through normally)
	if (url.pathname.startsWith('/socket.io')) return;
	if (url.pathname.startsWith('/api')) return;

	// For same-origin requests, use cache-first strategy
	if (url.origin === self.location.origin) {
		event.respondWith(
			caches.match(event.request).then((cached) => {
				if (cached) {
					return cached;
				}

				return fetch(event.request).then((response) => {
					// Don't cache non-successful responses
					if (!response || response.status !== 200 || response.type !== 'basic') {
						return response;
					}

					// Clone the response before caching
					const responseToCache = response.clone();
					caches.open(CACHE_NAME).then((cache) => {
						cache.put(event.request, responseToCache);
					});

					return response;
				});
			})
		);
	}
});
