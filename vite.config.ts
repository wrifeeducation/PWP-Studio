import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['mascot/mascot_std_1.png'],
      manifest: {
        name: 'WriFe — Progressive Writing Practice',
        short_name: 'WriFe PWP',
        description: 'Gamified grammar and writing practice for UK schools',
        theme_color: '#6C5CE7',
        background_color: '#FDF8EE',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          { src: '/mascot/mascot_std_1.png', sizes: '192x192', type: 'image/png' },
          { src: '/mascot/mascot_std_1.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        // Force new SW to activate immediately and take control of all tabs
        // without waiting for the user to close old tabs.
        clientsClaim: true,
        skipWaiting: true,
        globPatterns: ['**/*.{js,css,html,ico,svg}'],
        globIgnores: ['mascot/**', '**/*.png'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024, // 3 MiB safety net
        runtimeCaching: [
          // ── Supabase Edge Functions — NEVER cache; always hit the network ──
          // Missing this rule caused the SW to intercept /functions/ calls and
          // return stale/no-response errors that looked like network failures.
          {
            urlPattern: /^https:\/\/gzmgjkbtsvezfclmreru\.supabase\.co\/functions\/.*/i,
            handler: 'NetworkOnly',
          },
          // ── Supabase Auth — NEVER cache; tokens and sessions must be fresh ──
          {
            urlPattern: /^https:\/\/gzmgjkbtsvezfclmreru\.supabase\.co\/auth\/.*/i,
            handler: 'NetworkOnly',
          },
          {
            urlPattern: /^https:\/\/gzmgjkbtsvezfclmreru\.supabase\.co\/rest\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-rest-cache',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
})
