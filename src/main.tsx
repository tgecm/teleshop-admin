import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {AuthProvider} from './context/AuthContext';
import {TelegramAuthProvider} from './context/TelegramAuthContext';
import App from './App.tsx';
import './index.css';

const updateSW = () => {
  import.meta.env.DEV
    ? undefined
    : import('virtual:pwa-register').then((m) =>
        m.registerSW({onOfflineReady: () => {}}),
      );
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
