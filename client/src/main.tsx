// Tebex.js calls customElements.define('tebex-checkout') at module evaluation time.
// Vite HMR re-evaluates modules on file changes, causing a NotSupportedError on the
// second define call. This patch makes the registry idempotent for already-defined elements.
const _ceDefine = customElements.define.bind(customElements);
customElements.define = function (name, constructor, options) {
  if (!customElements.get(name)) _ceDefine(name, constructor, options);
};

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import { TebexProvider } from './context/TebexContext.tsx';
import { AuthProvider } from './context/AuthContext.tsx';
import { PackageTagsProvider } from './context/PackageTagsContext.tsx';
import { CurrencyProvider } from './context/CurrencyContext.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <TebexProvider>
          <CurrencyProvider>
            <PackageTagsProvider>
              <App />
            </PackageTagsProvider>
          </CurrencyProvider>
        </TebexProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);

// Fade out the pre-React boot loader once the bundle has parsed and React
// has committed its first paint. Held for a minimum of ~700ms so any
// dev-mode StrictMode double-mount or initial fetch flash happens behind
// the spinner instead of in front of the user. Guarded by a global flag
// so re-execution of this module (e.g. Vite HMR) doesn't try to fade an
// already-removed loader.
declare global {
  interface Window {
    __oxlynLoaderFaded?: boolean;
    __oxlynVisListener?: boolean;
  }
}
if (!window.__oxlynLoaderFaded) {
  window.__oxlynLoaderFaded = true;
  const MIN_DISPLAY_MS = 700;
  const startedAt = performance.now();
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const el = document.getElementById('initial-loader');
      if (!el) return;
      const elapsed = performance.now() - startedAt;
      const wait = Math.max(0, MIN_DISPLAY_MS - elapsed);
      setTimeout(() => {
        el.classList.add('is-hidden');
        setTimeout(() => el.remove(), 300);
      }, wait);
    });
  });
}

// Pause every CSS animation on the page when the tab loses focus. Browsers
// throttle background tabs but not aggressively enough for always-running
// CSS marquees on weaker GPUs — they keep being composed. Toggling one
// class on <html> lets us pause every marquee + hero parcels + watermarks
// in a single paint instead of N separate IntersectionObservers.
// Guarded so Vite HMR doesn't double-bind the listener.
if (!window.__oxlynVisListener) {
  window.__oxlynVisListener = true;
  const applyVisibility = () => {
    document.documentElement.classList.toggle('is-doc-hidden', document.hidden);
  };
  document.addEventListener('visibilitychange', applyVisibility);
  applyVisibility();
}
