/// <reference lib="webworker" />
/**
 * Service worker: precaches the app for offline use and adds cross-origin
 * isolation headers (COOP/COEP) to everything it serves, so the browser
 * allows SharedArrayBuffer and the multi-threaded engine can run.
 */
import { addPlugins, cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { clientsClaim } from 'workbox-core';
function isolate(response) {
    if (!response || response.status === 0 || response.type === 'opaque' || response.type === 'opaqueredirect')
        return response;
    const headers = new Headers(response.headers);
    headers.set('Cross-Origin-Opener-Policy', 'same-origin');
    headers.set('Cross-Origin-Embedder-Policy', 'require-corp');
    headers.set('Cross-Origin-Resource-Policy', 'same-origin');
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
addPlugins([{ handlerWillRespond: async ({ response }) => isolate(response) }]);
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')));
self.skipWaiting();
clientsClaim();
