import React, { useState, useEffect } from 'react';
import { signInWithGoogle } from '../lib/googleSignIn';
import { useAuth } from '../context/AuthContext';
import { motion } from 'motion/react';
import { ShoppingBag, Loader2, AlertCircle, ChevronRight } from 'lucide-react';
import { useTelegramLogin } from '../hooks/useTelegramLogin';
import { useTelegramAuth } from '../context/TelegramAuthContext';
import TelegramLoginModal from '../components/TelegramLoginModal';

const API_BASE = 'https://api.telegramecommerce.shop';

const TELEGRAM_BLUE = '#2AABEE';

function TelegramIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  );
}

function makeCircularFavicon(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const size = Math.min(img.width, img.height);
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext('2d');
      ctx.beginPath();
      ctx.arc(32, 32, 32, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(img, (img.width - size) / 2, (img.height - size) / 2, size, size, 0, 0, 64, 64);
      resolve(canvas.toDataURL());
    };
    img.onerror = () => resolve(url);
    img.src = url;
  });
}

function setPageMeta(title, pictureUrl) {
  document.title = title;
  const icon = document.querySelector('link[rel="icon"]');
  if (icon && pictureUrl) {
    makeCircularFavicon(pictureUrl).then((dataUrl) => {
      icon.setAttribute('href', dataUrl);
    });
  } else if (icon) {
    icon.setAttribute('href', '/vite.svg');
  }
}

export default function CustomerLogin({ shopSlug }) {
  const { user: firebaseUser, loading: authLoading } = useAuth();
  const { tgLoggedIn: telegramLoggedIn } = useTelegramAuth();
  const { status, timeLeft, loginUrl, botUsername, initLogin, reset } = useTelegramLogin();
  const [shopData, setShopData] = useState(null);
  const [shopLoading, setShopLoading] = useState(true);
  const [shopError, setShopError] = useState('');
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`${API_BASE}/public/shop/${encodeURIComponent(shopSlug)}`)
      .then(res => {
        if (!res.ok) throw new Error('Shop not found');
        return res.json();
      })
      .then(data => {
        setShopData(data);
        const s = data?.shop;
        if (s?.bot_full_name) {
          setPageMeta(s.bot_full_name, s.profile_picture);
        }
      })
      .catch(() => setShopError('Shop not found. Please check your link.'))
      .finally(() => setShopLoading(false));
  }, [shopSlug]);

  useEffect(() => {
    if (!authLoading && firebaseUser) {
      window.location.href = `/?p=/${encodeURIComponent(shopSlug)}-user-dashboard`;
    }
  }, [authLoading, firebaseUser, shopSlug]);

  useEffect(() => {
    if (telegramLoggedIn) {
      window.location.href = `/?p=/${encodeURIComponent(shopSlug)}-user-dashboard`;
    }
  }, [telegramLoggedIn, shopSlug]);

  const handleGoogleSignIn = async () => {
    setSigningIn(true);
    setError('');
    try {
      await signInWithGoogle();
    } catch (err) {
      setError('Sign in failed. Please try again.');
      console.error('Google sign-in error:', err);
      setSigningIn(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-[3px] border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-400 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (shopError && !shopLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full text-center"
        >
          <div className="w-20 h-20 bg-gradient-to-br from-red-50 to-red-100 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <AlertCircle className="w-10 h-10 text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Shop Not Found</h2>
          <p className="text-gray-500 text-sm mb-6">{shopError}</p>
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 font-bold rounded-2xl hover:bg-gray-200 transition-all"
          >
            <ChevronRight className="w-4 h-4" />
            Go Back
          </button>
        </motion.div>
      </div>
    );
  }

  const shop = shopData?.shop;
  const shopName = shop?.bot_full_name || shopSlug;
  const profilePic = shop?.profile_picture || null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="max-w-lg mx-auto px-4 py-8 min-h-screen flex flex-col justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl shadow-lg overflow-hidden"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-center">
            <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg border border-white/20">
              {shopLoading ? (
                <Loader2 className="w-6 h-6 animate-spin text-white/70" />
              ) : profilePic ? (
                <img
                  src={profilePic}
                  alt={shopName}
                  className="w-full h-full object-cover rounded-2xl"
                />
              ) : (
                <ShoppingBag className="w-8 h-8 text-white" />
              )}
            </div>
            <h1 className="text-xl font-bold text-white">
              {shopLoading ? 'Loading...' : `Welcome to ${shopName}`}
            </h1>
            <p className="text-indigo-200 text-sm mt-1">Sign in to manage your orders</p>
          </div>

          {/* Body */}
          <div className="p-6 space-y-6">
            {error && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-2xl"
              >
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                <p className="text-sm font-medium text-red-700">{error}</p>
              </motion.div>
            )}

            <div className="text-center space-y-2">
              <h2 className="text-lg font-bold text-gray-900">Customer Dashboard</h2>
              <p className="text-sm text-gray-500">
                Sign in with your account to view your orders, manage your cart, and update your profile.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <button
                onClick={handleGoogleSignIn}
                disabled={signingIn || shopLoading}
                className="w-full flex items-center justify-center gap-3 px-6 py-3.5 bg-white border-2 border-gray-200 rounded-2xl hover:bg-gray-50 hover:border-gray-300 transition-all font-medium text-sm active:scale-[0.98] disabled:opacity-60"
              >
                {signingIn ? (
                  <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                ) : (
                  <img
                    src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                    alt="Google"
                    className="w-5 h-5"
                  />
                )}
                <span className="text-gray-700">
                  {signingIn ? 'Signing in...' : 'Sign in with Google'}
                </span>
              </button>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400 font-medium">or</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              <button
                onClick={() => initLogin(shop?.bot_username || shopSlug)}
                disabled={shopLoading}
                className="w-full flex items-center justify-center gap-3 px-6 py-3.5 rounded-2xl font-bold text-white transition-all active:scale-[0.98] disabled:opacity-60 border-none"
                style={{ backgroundColor: TELEGRAM_BLUE }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#2594D4')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = TELEGRAM_BLUE)}
              >
                <TelegramIcon className="w-5 h-5" />
                <span>Sign in with Telegram</span>
              </button>
            </div>

            <div className="text-center">
              <p className="text-xs text-gray-400">
                By signing in, you agree to share your profile information with {shopName}.
              </p>
            </div>
          </div>
        </motion.div>

        <TelegramLoginModal
          status={status}
          timeLeft={timeLeft}
          loginUrl={loginUrl}
          botUsername={botUsername}
          onCancel={reset}
          onTryAgain={() => initLogin(shop?.bot_username || shopSlug)}
        />

        {/* Footer */}
        <div className="text-center mt-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-5 h-5 rounded-md flex items-center justify-center bg-indigo-600">
              <ShoppingBag className="w-3 h-3 text-white" />
            </div>
            <span className="text-xs font-bold text-gray-500">Telegram E-Commerce</span>
          </div>
          <p className="text-[10px] text-gray-400">Powered by Telegram E-Commerce Platform</p>
        </div>
      </div>
    </div>
  );
}
