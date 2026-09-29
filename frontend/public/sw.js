// IntelliExamAI Progressive Web App Service Worker
// Version 2.0.0 - Production-grade PWA Service Worker

const CACHE_NAME = "intelliexam-pwa-v2";

const STATIC_ASSETS = [
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
  "/icon.svg"
];

// Installation: Cache core PWA app shell assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activation: Clean up old caches and claim clients immediately
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

// Fetch handling: Safe routing strategy
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // 1. Strictly bypass cache for all API calls, WebSockets, proctoring, exams, and Next.js chunks
  if (
    event.request.method !== "GET" ||
    url.pathname.startsWith("/api") ||
    url.pathname.startsWith("/ws") ||
    url.pathname.includes("/sessions/") ||
    url.pathname.includes("/attempt") ||
    url.pathname.includes("/exams/") ||
    url.pathname.includes("/results") ||
    url.pathname.startsWith("/_next/") || // Always network for Next.js internal bundles & HMR
    url.port === "8000"
  ) {
    return;
  }

  // 2. Cache-first strategy for static icons and images
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

  // 3. Network-first strategy for page navigation
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => response)
        .catch(() => caches.match(event.request))
    );
    return;
  }
});
