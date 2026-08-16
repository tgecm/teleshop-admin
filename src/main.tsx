import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {AuthProvider} from './context/AuthContext';
import {TelegramAuthProvider} from './context/TelegramAuthContext';
import App from './App.tsx';
import {initPushNotifications} from './lib/pushNotifications';
import {initTheme} from './store/themeStore.js';
import './index.css';

// Apply saved theme before first render to avoid FOUC
initTheme();
initPushNotifications();


if (!import.meta.env.DEV) {
  import('virtual:pwa-register').then(({registerSW}) => {
    const updateSW = registerSW({
      onOfflineReady: () => {},
      onNeedRefresh() {
        // Update SW in background without forcing immediate full-page reload
        updateSW(false);
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
