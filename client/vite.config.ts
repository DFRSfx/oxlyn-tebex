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
    include: ['@tebexio/tebex.js'],
  },
  build: {
    // Evergreen target — the site already relies on customElements,
    // IntersectionObserver, dynamic import, optional chaining, etc. Transpiling
    // down to Vite's conservative default only adds helper bloat for browsers
    // we don't support.
    target: 'es2020',
    // All supported browsers handle <link rel=modulepreload> natively, so drop
    // the inlined polyfill from the entry chunk.
    modulePreload: { polyfill: false },
    // Vendor split — versão CONSERVADORA. Tentei antes separar react +
    // react-dom + react-router em chunks distintos e isso partiu em runtime
    // (Children undefined), porque a ordem de avaliação dos chunks não
    // garante que o chunk de React executa antes dos consumidores. Aqui só
    // partimos as libs que são CLARAMENTE independentes do bundle principal:
    //   - recharts: só carrega quando o admin é montado (lazy route)
    //   - tebex.js: só carrega no checkout
    //   - supabase: standalone
    //   - lucide-react: ícones, sem deps cruzadas com o resto
    // O resto (react, react-dom, react-router, axios, ...) fica num único
    // chunk `vendor` para garantir ordem de inicialização correta.
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('recharts') || id.includes('d3-')) return 'vendor-charts';
          if (id.includes('@tebexio')) return 'vendor-tebex';
          if (id.includes('lucide-react')) return 'vendor-icons';
          return 'vendor';
        },
      },
    },
    // Drop console + debugger statements in production builds. Keeps the
    // bundle tighter and prevents accidental leaks of internal state into
    // the browser devtools of end users.
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        passes: 2,
      },
    },
    // Avisar acima de 500KB para apanharmos regressões cedo
    chunkSizeWarningLimit: 500,
    // Larger inline-asset limit (8KB → 4KB default) means more SVGs ship
    // as data URLs and dodge an extra round-trip on first paint. Anything
    // larger still ships as a real asset.
    assetsInlineLimit: 4096,
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
