import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, Timer, Loader2 } from 'lucide-react';

export default function PreCheckoutMmpayConfirmModal({
  isOpen,
  onCancel,
  onContinue,
  loading = false,
  cooldownSeconds = 0,
  errorMessage = ''
}) {
  const [timeLeft, setTimeLeft] = useState(cooldownSeconds);

  useEffect(() => {
    setTimeLeft(cooldownSeconds);
  }, [cooldownSeconds]);

  useEffect(() => {
    if (!timeLeft || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  if (!isOpen) return null;

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  const isCooldownActive = timeLeft > 0;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="bg-white rounded-[28px] p-6 max-w-sm w-full text-center space-y-4 shadow-2xl border border-purple-100 relative overflow-hidden"
        >
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto shadow-inner transition-colors ${
            isCooldownActive ? 'bg-amber-100 text-amber-600' : 'bg-purple-100 text-purple-700'
          }`}>
            {isCooldownActive ? (
              <Timer className="w-9 h-9 animate-pulse" />
            ) : (
              <ShieldAlert className="w-9 h-9" />
            )}
          </div>

          <div className="space-y-2 py-1">
            <p className="text-sm font-bold text-gray-800 leading-relaxed">
              ကျေးဇူးပြုပြီး ငွေပေးချေရန် အဆင်သင့်ဖြစ်မှသာ <br/> <strong>Place Order</strong> ကို နှိပ်ပေးပါ။
            </p>

            {isCooldownActive ? (
              <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-3 text-amber-800 text-xs font-medium space-y-1">
                <p className="font-bold flex items-center justify-center gap-1.5 text-amber-900">
                  <Timer className="w-3.5 h-3.5 text-amber-600" />
                  Cooldown Active
                </p>
                <p>
                  Please wait <span className="font-black text-amber-900">{formatTime(timeLeft)}</span> before generating another QR code.
                </p>
              </div>
            ) : errorMessage ? (
              <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3 text-rose-700 text-xs font-medium">
                {errorMessage}
              </div>
            ) : null}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={onCancel}
              disabled={loading}
              className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-2xl transition-all text-xs border border-gray-200 active:scale-98 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={onContinue}
              disabled={loading || isCooldownActive}
              className="flex-1 py-3 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-700 hover:to-indigo-700 text-white font-bold rounded-2xl transition-all shadow-md text-xs active:scale-98 disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Generating...</span>
                </>
              ) : isCooldownActive ? (
                `Wait (${formatTime(timeLeft)})`
              ) : (
                'Place Order'
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
