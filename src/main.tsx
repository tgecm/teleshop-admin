import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {AuthProvider} from './context/AuthContext';
import {TelegramAuthProvider} from './context/TelegramAuthContext';
import App from './App.tsx';
import './index.css';

const updateSW = () => {
  if (import.meta.env.DEV) return;
  import('virtual:pwa-register').then(({registerSW}) => {
    const needUpdate = registerSW({
      onOfflineReady: () => {},
      onNeedRefresh: () => needUpdate(),
    });
  });
};
updateSW();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TelegramAuthProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </TelegramAuthProvider>
  </StrictMode>,
);
