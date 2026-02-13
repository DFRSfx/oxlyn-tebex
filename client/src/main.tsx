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
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <TebexProvider>
          <App />
        </TebexProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
