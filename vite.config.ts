import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

/**
 * Intercept /api/ requests in dev mode and return a proper JSON 503 response.
 * Without this, Vite tries to process api/roof-scan.ts through esbuild,
 * which crashes when query params contain decimals (e.g., lng=-79.5199
 * is parsed as file extension ".5199").
 */
function apiDevFallback(): Plugin {
  return {
    name: 'api-dev-fallback',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.startsWith('/api/')) {
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.statusCode = 503;
          res.end(JSON.stringify({
            error: 'API not available in dev mode. Deploy to Vercel or run `vercel dev`.',
            code: 'DEV_MODE',
          }));
          return;
        }
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [apiDevFallback(), react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: true,
    watch: {
      // Don't watch Vercel serverless functions
      ignored: ['**/api/**'],
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Core React libraries
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
            return 'vendor-react';
          }
          if (id.includes('node_modules/react-router-dom/')) {
            return 'vendor-router';
          }
          // UI libraries
          if (id.includes('node_modules/framer-motion/')) {
            return 'vendor-ui';
          }
          if (id.includes('node_modules/lucide-react/') || id.includes('node_modules/cmdk/')) {
            return 'vendor-icons';
          }
          // Map libraries (the biggest chunk)
          if (
            id.includes('node_modules/maplibre-gl/') ||
            id.includes('node_modules/react-map-gl/') ||
            id.includes('node_modules/@vis.gl/')
          ) {
            return 'vendor-map';
          }
          // Charts
          if (id.includes('node_modules/recharts/')) {
            return 'vendor-charts';
          }
          // Utils
          if (
            id.includes('node_modules/date-fns/') ||
            id.includes('node_modules/i18next/') ||
            id.includes('node_modules/react-i18next/') ||
            id.includes('node_modules/dompurify/')
          ) {
            return 'vendor-utils';
          }
          // Supabase
          if (id.includes('node_modules/@supabase/')) {
            return 'vendor-supabase';
          }
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
});
