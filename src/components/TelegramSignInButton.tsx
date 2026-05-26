import { useState } from 'react';
import { motion } from 'motion/react';
import { useTelegramLogin } from '../hooks/useTelegramLogin';
import { useTelegramAuth } from '../context/TelegramAuthContext';
import TelegramLoginModal from './TelegramLoginModal';

const TELEGRAM_BLUE = '#2AABEE';

function TelegramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  );
}

interface Props {
  shopSlug: string;
}

export default function TelegramSignInButton({ shopSlug }: Props) {
  const { status, timeLeft, loginUrl, botUsername, initLogin, reset } = useTelegramLogin();
  const { tgLoggedIn, telegramUser, logoutTelegram } = useTelegramAuth();
  const [showMenu, setShowMenu] = useState(false);

  if (tgLoggedIn && telegramUser) {
    return (
      <div className="relative">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-white border-2 border-gray-200 hover:bg-gray-50 transition-all text-sm font-medium"
        >
          {telegramUser.photo_url ? (
            <img
              src={telegramUser.photo_url}
              alt={telegramUser.name}
              className="w-6 h-6 rounded-full"
            />
          ) : (
            <TelegramIcon className="w-5 h-5 text-[#2AABEE]" />
          )}
          <span className="text-gray-700">{telegramUser.name}</span>
        </button>
        {showMenu && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
            <div className="absolute right-0 top-full mt-2 z-50 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 min-w-[160px]">
              <button
                onClick={() => { setShowMenu(false); logoutTelegram(); }}
                className="w-full px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors text-left"
              >
                Sign out
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <motion.button
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        onClick={() => initLogin(shopSlug)}
        className="flex items-center justify-center gap-3 px-6 py-3.5 rounded-2xl font-bold text-white transition-all active:scale-[0.98] border-none"
        style={{ backgroundColor: TELEGRAM_BLUE }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#2594D4')}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = TELEGRAM_BLUE)}
      >
        <TelegramIcon className="w-5 h-5" />
        <span>Sign in with Telegram</span>
      </motion.button>

      <TelegramLoginModal
        status={status}
        timeLeft={timeLeft}
        loginUrl={loginUrl}
        botUsername={botUsername}
        onCancel={reset}
        onTryAgain={() => initLogin(shopSlug)}
      />
    </div>
  );
}
