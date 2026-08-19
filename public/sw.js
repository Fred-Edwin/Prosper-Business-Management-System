// Installability-only service worker (ADR-7). No offline caching/data
// sync — connectivity is assumed available at all locations (PRD NFRs).
// This file's only job is to exist, so the browser considers the app
// installable; it intentionally does not intercept fetches.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});
