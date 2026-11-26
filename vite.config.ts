import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// BASE_PATH lets the same build run at a domain root (Cloudflare) or a
// sub-path such as GitHub Pages (/Chess-Teacher/).
const base = process.env.BASE_PATH || '/';

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png', 'engine/stockfish-18-lite-single.js', 'engine/stockfish-18-lite-single.wasm'],
      manifest: {
        name: 'Outpost Chess Coach',
        short_name: 'Outpost',
        description: 'Offline chess coach: openings, drills, game reviews and lesson plans.',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        orientation: 'any',
        background_color: '#11152b',
        theme_color: '#11152b',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,wasm,json,webmanifest}'],
        maximumFileSizeToCacheInBytes: 12 * 1024 * 1024,
        navigateFallback: `${base}index.html`,
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 1200,
  },
});
