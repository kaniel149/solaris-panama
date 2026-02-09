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
});
