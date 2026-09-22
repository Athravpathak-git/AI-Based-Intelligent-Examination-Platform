// IntelliExamAI Progressive Web App Service Worker
// Version 1.0.1 - Auto-clearing development cache handler

const CACHE_NAME = "intelliexam-cache-v2";

// Development and Localhost Guard:
// If running on localhost or 127.0.0.1, immediately wipe all caches, unregister, and bypass all fetches.
// This prevents stale Next.js webpack development chunks from triggering TypeError: Cannot read properties of undefined (reading 'call').
const isLocalhost =
  typeof self !== "undefined" &&
  (self.location.hostname === "localhost" ||
   self.location.hostname === "127.0.0.1" ||
   self.location.port === "3000");

if (isLocalhost) {
  self.addEventListener("install", (event) => {
    self.skipWaiting();
  });

  self.addEventListener("activate", (event) => {
    event.waitUntil(
      caches.keys().then((keys) => {
        return Promise.all(keys.map((key) => caches.delete(key)));
      }).then(() => {
        return self.registration.unregister();
      }).then(() => {
        return self.clients.claim();
      })
    );
  });

  // Always pass through directly to network on development/localhost
  self.addEventListener("fetch", (event) => {
    event.respondWith(fetch(event.request));
  });
} else {
  // Production PWA caching
  const STATIC_ASSETS = [
    "/manifest.json",
    "/icon-192.png",
    "/icon-512.png",
    "/icon.svg"
  ];

  self.addEventListener("install", (event) => {
    event.waitUntil(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.addAll(STATIC_ASSETS);
      }).then(() => self.skipWaiting())
    );
  });

  self.addEventListener("activate", (event) => {
    event.waitUntil(
      caches.keys().then((keys) => {
        return Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              return caches.delete(key);
            }
          })
        );
      }).then(() => self.clients.claim())
    );
  });

  self.addEventListener("fetch", (event) => {
    const url = new URL(event.request.url);

    // 1. Bypass cache for all API routes, WebSockets, or non-GET requests
    if (
      event.request.method !== "GET" ||
      url.pathname.startsWith("/api") ||
      url.pathname.startsWith("/ws") ||
      url.pathname.includes("/sessions/") ||
      url.pathname.includes("/attempt") ||
      url.pathname.includes("/exams/") ||
      url.pathname.includes("/results") ||
      url.pathname.startsWith("/_next/") || // Never cache Next.js chunks in service worker
      url.port === "8000"
    ) {
      return;
    }

    // 2. Cache-first ONLY for static icons/manifest
    if (
      url.pathname.endsWith(".png") ||
      url.pathname.endsWith(".svg") ||
      url.pathname.endsWith(".ico") ||
      url.pathname.endsWith(".woff2")
    ) {
      event.respondWith(
        caches.match(event.request).then((cached) => {
          if (cached) return cached;
          return fetch(event.request).then((response) => {
            if (response && response.status === 200) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
            }
            return response;
          });
        })
      );
      return;
    }

    // 3. Network-first with cache fallback for standard navigation
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          return response;
        })
        .catch(() => {
          return caches.match(event.request);
        })
    );
  });
}
