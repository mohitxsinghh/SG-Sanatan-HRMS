// ===========================================
// SG SANATAN HRMS - Service Worker
// ===========================================
// Strategy, on purpose:
//
// - /api/* requests -> NEVER intercepted/cached. This app is
//   data-heavy and auth-gated; caching API responses risks showing
//   stale attendance/leave/payroll data as if it were live, and
//   risks stashing sensitive data in Cache Storage. If the network
//   is down, apiFetch() in api.js already surfaces "Can't reach the
//   server" - that's the correct behavior here, not a cached lie.
//
// - HTML pages -> network-first, falling back to cache, falling
//   back to offline.html. Pages carry the auth-guard <script> that
//   decides where you land, so we always prefer a fresh copy when
//   one's reachable.
//
// - CSS/JS/icons/fonts -> stale-while-revalidate. Instant load from
//   cache, silently refreshed in the background for next time.
// ===========================================

const CACHE_VERSION = "v8"; // bumped - punch card CSS fix, employee dashboard deduction+leave requests
const CACHE_NAME = `sg-sanatan-hrms-${CACHE_VERSION}`;

const APP_SHELL = [

    "/",
    "/login.html",
    "/dashboard.html",
    "/employees.html",
    "/attendance.html",
    "/departments.html",
    "/leave.html",
    "/reports.html",
    "/holidays.html",
    "/settings.html",
    "/payroll.html",
    "/employee-dashboard.html",
    "/my-attendance.html",
    "/my-leave.html",
    "/directory.html",
    "/my-account.html",
    "/offline.html",
    "/manifest.json",

    "/css/style.css",
    "/css/topbar.css",
    "/css/login.css",
    "/css/dashboard.css",
    "/css/employees.css",
    "/css/attendance.css",
    "/css/departments.css",
    "/css/leave.css",
    "/css/reports.css",
    "/css/holidays.css",
    "/css/settings.css",
    "/css/mobile.css",

    "/js/api.js",
    "/js/common.js",
    "/js/auth.js",
    "/js/sidebar.js",
    "/js/topbar.js",
    "/js/login.js",
    "/js/dashboard.js",
    "/js/employees.js",
    "/js/attendance.js",
    "/js/departments.js",
    "/js/leave.js",
    "/js/reports.js",
    "/js/holidays.js",
    "/js/settings.js",
    "/js/payroll.js",
    "/js/employee-dashboard.js",
    "/js/my-attendance.js",
    "/js/my-leave.js",
    "/js/directory.js",
    "/js/my-account.js",

    "/assets/logo.webp",
    "/assets/icons/icon-192.png",
    "/assets/icons/icon-512.png",
    "/assets/icons/icon-maskable-512.png",
    "/assets/icons/apple-touch-icon.png",
    "/assets/icons/favicon-32.png",
    "/assets/icons/favicon-16.png"

];

// ==========================================
// INSTALL - precache the app shell
// ==========================================

self.addEventListener("install", (event) => {

    event.waitUntil(

        caches.open(CACHE_NAME).then((cache) =>

            // addAll fails the whole install if ANY single file 404s -
            // precache what we can instead, so one missing/renamed
            // file doesn't break the install for everything else.

            Promise.allSettled(

                APP_SHELL.map((url) =>
                    cache.add(url).catch((err) =>
                        console.warn("[SW] Skipped precaching", url, err.message)
                    )
                )

            )

        ).then(() => self.skipWaiting())

    );

});

// ==========================================
// ACTIVATE - drop old cache versions
// ==========================================

self.addEventListener("activate", (event) => {

    event.waitUntil(

        caches.keys().then((keys) =>

            Promise.all(

                keys

                    .filter((key) => key.startsWith("sg-sanatan-hrms-") && key !== CACHE_NAME)

                    .map((key) => caches.delete(key))

            )

        ).then(() => self.clients.claim())

    );

});

// ==========================================
// FETCH
// ==========================================

self.addEventListener("fetch", (event) => {

    const { request } = event;

    if (request.method !== "GET") return; // never intercept POST/PUT/DELETE

    const url = new URL(request.url);

    // ---- API calls: always network, never cached ----

    if (url.pathname.startsWith("/api/")) {

        return; // let the browser handle it normally

    }

    // ---- Cross-origin static libs (Font Awesome, Chart.js CDN) ----
    // stale-while-revalidate, same as our own static assets.

    if (url.origin !== self.location.origin) {

        event.respondWith(staleWhileRevalidate(request));

        return;

    }

    // ---- HTML navigations: network-first ----

    if (request.mode === "navigate" || request.headers.get("accept")?.includes("text/html")) {

        event.respondWith(networkFirst(request));

        return;

    }

    // ---- Everything else same-origin (css/js/images): stale-while-revalidate ----

    event.respondWith(staleWhileRevalidate(request));

});

// ==========================================
// Strategies
// ==========================================

async function networkFirst(request) {

    const cache = await caches.open(CACHE_NAME);

    try {

        const fresh = await fetch(request);

        cache.put(request, fresh.clone());

        return fresh;

    } catch (error) {

        const cached = await cache.match(request);

        return cached || (await cache.match("/offline.html"));

    }

}

async function staleWhileRevalidate(request) {

    const cache = await caches.open(CACHE_NAME);

    const cached = await cache.match(request);

    const networkFetch = fetch(request)

        .then((response) => {

            // Cache real 200s, and opaque cross-origin responses
            // (type "opaque") since that's the only way to cache a
            // no-cors CDN request at all.

            if (response && (response.status === 200 || response.type === "opaque")) {

                cache.put(request, response.clone());

            }

            return response;

        })

        .catch(() => cached);

    return cached || networkFetch;

}
