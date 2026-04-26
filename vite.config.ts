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
        globPatterns: ['**/*.{js,css,html,ico,svg}'],
        globIgnores: ['mascot/**', '**/*.png'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024, // 3 MiB safety net
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/nxhkpqngnxshgotvuujb\.supabase\.co\/rest\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-rest-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 },
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
