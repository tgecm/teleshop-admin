import { useState, useEffect, useRef, useCallback } from 'react';
import { useTelegramAuth } from '../context/TelegramAuthContext';
import api from '../lib/api';
import type { TelegramLoginStatus, TelegramPollResponse } from '../types/telegram';

const POLL_INTERVAL = 2500;
const TIMEOUT_SECONDS = 300;

export function useTelegramLogin() {
  const { loginWithTelegramToken, tgLoggedIn } = useTelegramAuth();
  const [status, setStatus] = useState<TelegramLoginStatus>(tgLoggedIn ? 'confirmed' : 'idle');
  const [botUsername, setBotUsername] = useState<string | null>(null);
  const [loginUrl, setLoginUrl] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(TIMEOUT_SECONDS);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tokenRef = useRef<string | null>(null);

  const cleanup = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    cleanup();
    setStatus(tgLoggedIn ? 'confirmed' : 'idle');
    setBotUsername(null);
    setLoginUrl(null);
    setTimeLeft(TIMEOUT_SECONDS);
    tokenRef.current = null;
  }, [cleanup, tgLoggedIn]);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  const initLogin = useCallback(
    async (botUsername: string) => {
      // If already logged in, don't start a new flow
      if (tgLoggedIn) return;

      cleanup();
      setStatus('waiting');
      setTimeLeft(TIMEOUT_SECONDS);
      setBotUsername(botUsername);

      const token = crypto.randomUUID();
      tokenRef.current = token;

      const telegramUrl = `https://t.me/${botUsername}?start=login-${token}`;
      setLoginUrl(telegramUrl);
      window.open(telegramUrl, '_blank', 'noopener');

      countdownRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setStatus('expired');
            cleanup();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      pollingRef.current = setInterval(async () => {
        if (!tokenRef.current) return;
        try {
          const pollRes = await api.get<TelegramPollResponse>('/auth/telegram/poll', {
            params: { token: tokenRef.current },
          });
          const pollData = pollRes.data;

          if (pollData.status === 'confirmed' && pollData.token && pollData.user) {
            loginWithTelegramToken(pollData.token, pollData.user);
            setStatus('confirmed');
            cleanup();
            setTimeout(reset, 1500);
          } else if (pollData.status === 'declined') {
            setStatus('declined');
            cleanup();
          } else if (pollData.status === 'expired') {
            setStatus('expired');
            cleanup();
          }
        } catch {
          // ignore polling errors, just retry on next interval
        }
      }, POLL_INTERVAL);
    },
    [cleanup, loginWithTelegramToken, tgLoggedIn, reset],
  );

  return { status, timeLeft, loginUrl, botUsername, initLogin, reset };
}
