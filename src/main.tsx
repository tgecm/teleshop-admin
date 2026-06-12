import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {AuthProvider} from './context/AuthContext';
import {TelegramAuthProvider} from './context/TelegramAuthContext';
import App from './App.tsx';
import './index.css';

if (!import.meta.env.DEV) {
  import('virtual:pwa-register').then(({registerSW}) => {
    registerSW({
      onOfflineReady: () => {},
      onNeedRefresh() {
        const t = document.createElement('div');
        t.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#6366f1;color:#fff;padding:12px 24px;border-radius:12px;font-size:14px;font-weight:600;z-index:9999';
        t.textContent = 'Updating...';
        document.body.appendChild(t);
        setTimeout(() => window.location.reload(), 500);
      },
    });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TelegramAuthProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </TelegramAuthProvider>
  </StrictMode>,
);
