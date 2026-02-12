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
