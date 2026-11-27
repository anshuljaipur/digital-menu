// sw.js — service worker: lets the app open offline and be installed.
// Strategy: same-origin files are network-first (always fresh when online,
// cached copy when offline); the pinned Firebase SDK files are cache-first.
// Firestore/Auth traffic is never touched here — Firestore has its own
// offline cache.
//
// When you deploy a new version, bump CACHE_VERSION so old caches are dropped.

const CACHE_VERSION = 'ipm-v1';

const APP_SHELL = [
  './', 'dashboard.html', 'policies.html', 'add-policy.html', 'edit-policy.html', 'policy-details.html',
  'payment-tracker.html', 'calendar.html', 'reports.html', 'companies.html', 'settings.html',
  'import-export.html', 'notifications.html', 'manifest.json',
  'config/constants.js', 'config/firebase-config.js',
  'assets/css/theme.css', 'assets/css/style.css', 'assets/css/cards.css', 'assets/css/forms.css',
  'assets/css/tables.css', 'assets/css/dashboard.css', 'assets/css/responsive.css',
  'assets/js/utilities.js', 'assets/js/firebase-store.js', 'assets/js/storage.js', 'assets/js/notification.js',
  'assets/js/validation.js', 'assets/js/search.js', 'assets/js/policy.js', 'assets/js/payment.js',
  'assets/js/payouts.js', 'assets/js/calendar.js', 'assets/js/reports.js', 'assets/js/charts.js',
  'assets/js/alerts.js', 'assets/js/export.js', 'assets/js/import.js', 'assets/js/app.js', 'assets/js/dashboard.js',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png', 'icons/icon-180.png',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_VERSION);
    // One missing file must not break installation.
    await Promise.allSettled(APP_SHELL.map((url) => cache.add(url)));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  const isSdk = url.hostname === 'www.gstatic.com' && url.pathname.includes('/firebasejs/');
  if (!sameOrigin && !isSdk) return;   // Firestore, Auth, everything else: hands off

  if (isSdk) {
    event.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      const copy = res.clone(); caches.open(CACHE_VERSION).then((c) => c.put(req, copy)); return res;
    })));
    return;
  }

  event.respondWith((async () => {
    try {
      const res = await fetch(req);
      if (res && res.ok) { const copy = res.clone(); caches.open(CACHE_VERSION).then((c) => c.put(req, copy)); }
      return res;
    } catch (err) {
      const hit = await caches.match(req, { ignoreSearch: true });   // ?id=… pages fall back to the cached page
      if (hit) return hit;
      if (req.mode === 'navigate') return (await caches.match('dashboard.html')) || Response.error();
      return Response.error();
    }
  })());
});
