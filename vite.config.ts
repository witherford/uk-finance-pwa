import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? '/uk-finance-pwa/' : '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'icons/icon.svg',
        'icons/favicon-16.png',
        'icons/favicon-32.png',
        'icons/apple-touch-icon.png',
        'icons/apple-touch-icon-120.png',
        'icons/apple-touch-icon-152.png',
        'icons/apple-touch-icon-167.png'
      ],
      manifest: {
        name: 'UK Finance & Budget',
        short_name: 'UK Finance',
        description: 'Offline-first UK personal finance & budgeting app',
        theme_color: '#0ea5e9',
        background_color: '#0f172a',
        display: 'standalone',
        display_override: ['window-controls-overlay', 'standalone', 'minimal-ui'],
        orientation: 'any',
        start_url: '.',
        scope: '.',
        lang: 'en-GB',
        categories: ['finance', 'productivity', 'lifestyle'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: 'icons/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }
        ],
        shortcuts: [
          { name: 'Dashboard', url: './', icons: [{ src: 'icons/icon-192.png', sizes: '192x192' }] },
          { name: 'Add a bill', url: './bills', icons: [{ src: 'icons/icon-192.png', sizes: '192x192' }] },
          { name: 'Calendar', url: './calendar', icons: [{ src: 'icons/icon-192.png', sizes: '192x192' }] },
          { name: 'Calculator', url: './calculator', icons: [{ src: 'icons/icon-192.png', sizes: '192x192' }] }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/api\//],
        cleanupOutdatedCaches: true
      }
    })
  ],
  server: { port: 5173, host: true }
});
