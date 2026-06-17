import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {AuthProvider} from './context/AuthContext';
import {TelegramAuthProvider} from './context/TelegramAuthContext';
import App from './App.tsx';
import './index.css';

if (!import.meta.env.DEV) {
  import('virtual:pwa-register').then(({registerSW}) => {
    const updateSW = registerSW({
      onOfflineReady: () => {},
      onNeedRefresh() {
        updateSW(true);
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
