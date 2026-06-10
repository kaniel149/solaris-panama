import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs/promises';

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

function appHtmlFallback(): Plugin {
  const appRoutes = [
    '/dashboard',
    '/login',
    '/crm-leads',
    '/projects',
    '/clients',
    '/proposals',
    '/calendar',
    '/monitoring',
    '/leads',
    '/settings',
    '/tools',
    '/mapa-solar',
    '/lp',
    '/azuero',
    '/nosotros',
    '/servicios',
    '/proyectos',
  ];

  return {
    name: 'app-html-fallback',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url?.split('?')[0] || '/';
        const acceptsHtml = req.method === 'GET' && req.headers.accept?.includes('text/html');
        const isAppRoute = appRoutes.some((route) => url === route || url.startsWith(`${route}/`));
        if (!acceptsHtml || !isAppRoute) {
          next();
          return;
        }

        try {
          const html = await fs.readFile(path.resolve(__dirname, 'app.html'), 'utf-8');
          const transformed = await server.transformIndexHtml(url, html);
          res.statusCode = 200;
          res.setHeader('Content-Type', 'text/html');
          res.end(transformed);
        } catch (error) {
          next(error);
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [apiDevFallback(), appHtmlFallback(), react()],
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
      input: 'app.html',
      output: {
        manualChunks(id) {
          // Vite virtual helper modules (preload helper, modulepreload
          // polyfill) + the shared commonjs helpers. Without claiming them,
          // Rollup hoisted the preload helper into vendor-map — forcing the
          // entry chunk to statically import ~1 MB of maplibre on every page
          // (including the public landing page). NOTE: do NOT claim all '\0'
          // ids — commonjs-proxy modules must stay with their own library.
          if (id.startsWith('\0vite/') || id === '\0commonjsHelpers.js') {
            return 'vendor-react';
          }
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
