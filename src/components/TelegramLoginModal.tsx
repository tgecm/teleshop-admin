import { motion } from 'motion/react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import type { TelegramLoginStatus } from '../types/telegram';

const TELEGRAM_BLUE = '#2AABEE';

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function TelegramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  );
}

interface Props {
  status: TelegramLoginStatus;
  timeLeft: number;
  loginUrl: string | null;
  botUsername: string | null;
  onCancel: () => void;
  onTryAgain: () => void;
}

export default function TelegramLoginModal({
  status,
  timeLeft,
  loginUrl,
  botUsername,
  onCancel,
  onTryAgain,
}: Props) {
  if (status === 'idle') return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget && status !== 'waiting') onCancel();
      }}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-[32px] p-8 max-w-sm w-full text-center shadow-2xl relative overflow-hidden"
      >
        {status !== 'waiting' && status !== 'confirmed' && (
          <button
            onClick={onCancel}
            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 z-10"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {status === 'waiting' && (
          <>
            <div className="relative w-20 h-20 mx-auto mb-4">
              <motion.div
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                className="w-20 h-20 rounded-full flex items-center justify-center"
                style={{ backgroundColor: TELEGRAM_BLUE }}
              >
                <TelegramIcon className="w-10 h-10 text-white" />
              </motion.div>
              <motion.div
                animate={{ scale: [1, 1.3], opacity: [0.4, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
                className="absolute inset-0 rounded-full"
                style={{ border: `2px solid ${TELEGRAM_BLUE}` }}
              />
            </div>

            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Waiting for Telegram Confirmation
            </h2>
            <p className="text-sm text-gray-500 mb-6">
              We opened your Telegram bot. Please confirm the sign-in request there.
            </p>

            <div className="flex items-center justify-center gap-2 mb-6">
              <Clock className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-bold text-gray-700">
                Expires in {formatTime(timeLeft)}
              </span>
            </div>

            {loginUrl && (
              <div className="mb-6">
                <div className="bg-white rounded-2xl p-4 inline-block mx-auto shadow-md border border-gray-100">
                  <QRCodeSVG value={loginUrl} size={140} level="M" />
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  Or scan QR code to open on your phone
                </p>
              </div>
            )}

            {botUsername && (
              <p className="text-xs text-gray-400 mb-6">
                Open <span className="font-bold text-gray-600">@{botUsername}</span> in Telegram
              </p>
            )}

            <button
              onClick={onCancel}
              className="w-full py-3 bg-gray-100 text-gray-700 font-bold rounded-2xl hover:bg-gray-200 transition-all active:scale-[0.98] text-sm"
            >
              Cancel
            </button>
          </>
        )}

        {status === 'confirmed' && (
          <>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', damping: 15, stiffness: 200 }}
              className="w-20 h-20 bg-gradient-to-br from-emerald-100 to-emerald-200 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg"
            >
              <CheckCircle className="w-10 h-10 text-emerald-600" />
            </motion.div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Successfully signed in!
            </h2>
            <p className="text-sm text-gray-500">Redirecting...</p>
          </>
        )}

        {status === 'declined' && (
          <>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', damping: 15, stiffness: 200 }}
              className="w-20 h-20 bg-gradient-to-br from-red-50 to-red-100 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg"
            >
              <X className="w-10 h-10 text-red-400" />
            </motion.div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Sign in declined</h2>
            <p className="text-sm text-gray-500 mb-6">
              You declined the sign-in request in Telegram.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={onTryAgain}
                className="w-full py-3 rounded-2xl font-bold text-sm text-white transition-all active:scale-[0.98]"
                style={{ backgroundColor: TELEGRAM_BLUE }}
              >
                Try Again
              </button>
              <button
                onClick={onCancel}
                className="w-full py-3 bg-gray-100 text-gray-700 font-bold rounded-2xl hover:bg-gray-200 transition-all active:scale-[0.98] text-sm"
              >
                Cancel
              </button>
            </div>
          </>
        )}

        {status === 'expired' && (
          <>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', damping: 15, stiffness: 200 }}
              className="w-20 h-20 bg-gradient-to-br from-amber-50 to-amber-100 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg"
            >
              <Clock className="w-10 h-10 text-amber-400" />
            </motion.div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Link expired</h2>
            <p className="text-sm text-gray-500 mb-6">
              The sign-in link has expired. Please try again.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={onTryAgain}
                className="w-full py-3 rounded-2xl font-bold text-sm text-white transition-all active:scale-[0.98]"
                style={{ backgroundColor: TELEGRAM_BLUE }}
              >
                Try Again
              </button>
              <button
                onClick={onCancel}
                className="w-full py-3 bg-gray-100 text-gray-700 font-bold rounded-2xl hover:bg-gray-200 transition-all active:scale-[0.98] text-sm"
              >
                Cancel
              </button>
            </div>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-20 h-20 bg-gradient-to-br from-red-50 to-red-100 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
              <AlertTriangle className="w-10 h-10 text-red-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Something went wrong</h2>
            <p className="text-sm text-gray-500 mb-6">
              Could not initialize sign-in. Please try again.
            </p>
            <button
              onClick={onTryAgain}
              className="w-full py-3 rounded-2xl font-bold text-sm text-white transition-all active:scale-[0.98]"
              style={{ backgroundColor: TELEGRAM_BLUE }}
            >
              Try Again
            </button>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}
