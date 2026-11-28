import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/archivo/wdth.css';
import './styles/app.css';
import './styles/screens.css';
import './styles/learn.css';
import { App } from './App';
import { registerSW } from 'virtual:pwa-register';

registerSW({ immediate: true });

// The service worker adds cross-origin isolation headers (needed for the
// multi-threaded engine). On the very first visit the page isn't controlled
// yet, so reload once when the worker takes over.
if ('serviceWorker' in navigator && !window.crossOriginIsolated) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    try {
      if (sessionStorage.getItem('outpost-coi-reload')) return;
      sessionStorage.setItem('outpost-coi-reload', '1');
    } catch {
      return;
    }
    window.location.reload();
  });
}

// Ask the browser to keep our IndexedDB data (iOS evicts unpersisted storage).
if (navigator.storage?.persist) void navigator.storage.persist().catch(() => undefined);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
