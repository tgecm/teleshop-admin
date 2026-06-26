import { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Ticket, Loader2, AlertCircle } from 'lucide-react';
import { useTelegramLogin } from '../../hooks/useTelegramLogin';
import { useTelegramAuth } from '../../context/TelegramAuthContext';
import TelegramLoginModal from '../TelegramLoginModal';
import { qrSignInWithGoogle, storeQRLogin, qrExchangeTelegramToken } from '../../lib/qrAuth';

const TELEGRAM_BLUE = '#2AABEE';

function TelegramIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  );
}

function isMainDomain() {
  if (typeof window === 'undefined') return true;
  return window.location.hostname === 'www.telegramecommerce.shop' || window.location.hostname === 'telegramecommerce.shop';
}

export default function QRSignInModal({ slug, onClose, onSuccess, botUsername: propBotUsername }) {
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState('');
  const { status, timeLeft, loginUrl, botUsername, initLogin, reset } = useTelegramLogin();
  const { telegramToken } = useTelegramAuth();
  const telegramLoginInitiated = useRef(false);
  const exchangingRef = useRef(false);

  // When Telegram login confirms, exchange the ecommerce JWT for a QR JWT
  useEffect(() => {
    if (status === 'confirmed' && telegramLoginInitiated.current && !exchangingRef.current) {
      exchangingRef.current = true;
      setSigningIn(true);
      const tToken = localStorage.getItem('telegram_token');
      if (tToken && slug) {
        qrExchangeTelegramToken(slug, tToken)
          .then((result) => {
            storeQRLogin(result.token, result.customer_id, result.user);
            onSuccess?.();
          })
          .catch((err) => {
            setError(err.message || 'Telegram sign-in failed');
            setSigningIn(false);
            telegramLoginInitiated.current = false;
            exchangingRef.current = false;
          });
      } else {
        setError('Missing auth data');
        setSigningIn(false);
        telegramLoginInitiated.current = false;
        exchangingRef.current = false;
      }
    }
  }, [status, slug, onSuccess]);

  const handleGoogleSignIn = async () => {
    if (!isMainDomain()) {
      const dashboardUri = window.location.origin + '/?p=/' + encodeURIComponent(slug) + '-qr-dashboard';
      const params = new URLSearchParams({ shop_slug: slug, redirect_uri: dashboardUri, mode: 'qr' });
      window.location.href = `https://www.telegramecommerce.shop/#/auth/google/proxy?${params}`;
      return;
    }
    setSigningIn(true);
    setError('');
    try {
      const result = await qrSignInWithGoogle(slug);
      storeQRLogin(result.token, result.customer_id, result.user);
      onSuccess?.();
    } catch (err) {
      setError(err.message || 'Google sign-in failed');
      setSigningIn(false);
    }
  };

  const handleTelegramLogin = () => {
    telegramLoginInitiated.current = true;
    initLogin(propBotUsername);
  };

  const handleCancel = () => {
    reset();
    telegramLoginInitiated.current = false;
    exchangingRef.current = false;
    onClose?.();
  };

  const handleTryAgain = () => {
    telegramLoginInitiated.current = true;
    initLogin(propBotUsername);
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={(e) => { if (e.target === e.currentTarget) handleCancel(); }}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-[32px] p-8 max-w-sm w-full text-center shadow-2xl"
        >
          <div className="w-16 h-16 bg-gradient-to-br from-amber-100 to-amber-200 rounded-[20px] flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Ticket className="w-8 h-8 text-amber-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Sign in to Get a Token</h2>
          <p className="text-sm text-gray-500 mb-6">
            Sign in to get your queue token and track your orders.
          </p>
          <div className="space-y-3">
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-2xl">
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                <p className="text-xs font-medium text-red-700 text-left">{error}</p>
              </div>
            )}
            <button
              onClick={handleGoogleSignIn}
              disabled={signingIn}
              className="w-full flex items-center justify-center gap-3 px-6 py-3.5 bg-white border-2 border-gray-200 rounded-2xl font-bold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all active:scale-[0.98] disabled:opacity-60"
            >
              {signingIn ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="" className="w-5 h-5" />
              )}
              {signingIn ? 'Signing in...' : 'Continue with Google'}
            </button>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400 font-medium">or</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            <button
              onClick={handleTelegramLogin}
              disabled={signingIn}
              className="w-full flex items-center justify-center gap-3 px-6 py-3.5 rounded-2xl font-bold text-white transition-all active:scale-[0.98] border-none disabled:opacity-60"
              style={{ backgroundColor: TELEGRAM_BLUE }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#2594D4')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = TELEGRAM_BLUE)}
            >
              <TelegramIcon className="w-5 h-5" />
              <span>Continue with Telegram</span>
            </button>
          </div>
          <button onClick={handleCancel} className="mt-4 text-sm text-gray-400 hover:text-gray-600 transition-colors">
            Cancel
          </button>
        </motion.div>
      </motion.div>

      <TelegramLoginModal
        status={status}
        timeLeft={timeLeft}
        loginUrl={loginUrl}
        botUsername={botUsername}
        onCancel={handleCancel}
        onTryAgain={handleTryAgain}
      />
    </>
  );
}
