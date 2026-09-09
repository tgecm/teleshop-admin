import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { TelegramUserProfile } from '../types/telegram';
import { onFCMTokenReady, sendTokenToBackend } from '../lib/pushNotifications';

interface TelegramAuthContextType {
  telegramToken: string | null;
  telegramUser: TelegramUserProfile | null;
  tgLoggedIn: boolean;
  loginWithTelegramToken: (jwt: string, user: TelegramUserProfile) => void;
  logoutTelegram: () => void;
}

const TelegramAuthContext = createContext<TelegramAuthContextType>({
  telegramToken: null,
  telegramUser: null,
  tgLoggedIn: false,
  loginWithTelegramToken: () => {},
  logoutTelegram: () => {},
});

export function TelegramAuthProvider({ children }: { children: ReactNode }) {
  const [telegramToken, setTelegramToken] = useState<string | null>(() =>
    localStorage.getItem('telegram_token')
  );
  const [telegramUser, setTelegramUser] = useState<TelegramUserProfile | null>(() => {
    try {
      const u = localStorage.getItem('telegram_user');
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  });

  const loginWithTelegramToken = (jwt: string, user: TelegramUserProfile) => {
    localStorage.setItem('telegram_token', jwt);
    localStorage.setItem('telegram_user', JSON.stringify(user));
    setTelegramToken(jwt);
    setTelegramUser(user);
    // Send FCM token to backend — works whether token arrived before or after login
    onFCMTokenReady((token) => sendTokenToBackend(token));
  };

  const logoutTelegram = () => {
    localStorage.removeItem('telegram_token');
    localStorage.removeItem('telegram_user');
    localStorage.removeItem('google_token');
    localStorage.removeItem('google_user');
    setTelegramToken(null);
    setTelegramUser(null);
  };

  return (
    <TelegramAuthContext.Provider
      value={{
        telegramToken,
        telegramUser,
        tgLoggedIn: !!telegramToken,
        loginWithTelegramToken,
        logoutTelegram,
      }}
    >
      {children}
    </TelegramAuthContext.Provider>
  );
}

export function useTelegramAuth() {
  return useContext(TelegramAuthContext);
}
