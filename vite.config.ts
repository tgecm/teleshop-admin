import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import {VitePWA} from 'vite-plugin-pwa';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    base: '/',
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        strategies: 'injectManifest',
        srcDir: 'src',
        filename: 'sw.ts',
        injectManifest: {
          minify: false,
        },
        manifest: {
          name: 'TeleShop Admin',
          short_name: 'TeleShop',
          description: 'Manage your Telegram e-commerce bot',
          theme_color: '#6366f1',
          background_color: '#f9fafb',
          display: 'standalone',
          display_override: ['window-controls-overlay', 'minimal-ui'],
          orientation: 'portrait',
          start_url: '/',
          scope: '/',
          icons: [
            {src: '/icon-192.svg', sizes: '192x192', type: 'image/svg+xml'},
            {src: '/icon-512.svg', sizes: '512x512', type: 'image/svg+xml'},
            {src: '/icon-512.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'maskable'},
          ],
        },
      }),
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.NODE_ENV': JSON.stringify(mode),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('/themes/themes')) return 'index';
          },
        },
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
