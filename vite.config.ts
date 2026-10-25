import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'KARTAVYA // Spatial Tactile Controller',
        short_name: 'KARTAVYA',
        description: 'Hardware-grade 3D Spatial Phone-to-Laptop Controller',
        theme_color: '#08080A',
        background_color: '#08080A',
        display: 'standalone',
        id: '/',
        start_url: '/',
        scope: '/',
        orientation: 'portrait-primary',
        display_override: ['window-controls-overlay', 'standalone'],
        categories: ['productivity', 'utilities', 'developer'],
        shortcuts: [
          { name: 'Trackpad', short_name: 'Trackpad', url: '/?tab=trackpad' },
          { name: 'Stage Director', short_name: 'Stage', url: '/?tab=stage' },
          { name: 'Panic Vault', short_name: 'Panic', url: '/?tab=ai' }
        ],
        icons: [
          { src: '/kartavya-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: '/kartavya-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
          { src: '/kartavya-mark.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }
        ]
      }
    })
  ],
  server: {
    host: true,
    port: 5173
  }
});
