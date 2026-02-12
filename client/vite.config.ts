import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  css: {
    modules: {
      generateScopedName: '[hash:base64:8]',
      localsConvention: 'camelCase'
    }
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    hmr: {
      overlay: true
    },
    proxy: {
      '/api/cfx-session': {
        target: 'https://forum.cfx.re',
        changeOrigin: true,
        rewrite: () => '/session/current.json',
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            // Forward cookies from the original request
            if (req.headers.cookie) {
              proxyReq.setHeader('Cookie', req.headers.cookie);
            }
          });
        },
      },
      '/api/cfx-user': {
        target: 'https://policy-live.fivem.net',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/api\/cfx-user/, '/api/getUserInfo'),
      },
    },
  },
});
