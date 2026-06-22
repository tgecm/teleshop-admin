import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { WifiOff } from 'lucide-react';
import { API_BASE } from '../api/config';

const LS_KEY = 'vpn_warning_dismiss';

function isDismissedToday() {
  try {
    return localStorage.getItem(LS_KEY) === new Date().toDateString();
  } catch { return false; }
}

function markDismissedToday() {
  try { localStorage.setItem(LS_KEY, new Date().toDateString()); } catch {}
}

export default function VpnWarningModal() {
  const [show, setShow] = useState(false);
  const failedRef = useRef(false);

  const close = () => {
    setShow(false);
    markDismissedToday();
  };

  useEffect(() => {
    // Backend health check — show warning after 5s of unreachability, once per day
    let failTimer = null;
    let mounted = true;
    const check = async () => {
      if (isDismissedToday()) return;
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 4000);
      try {
        await fetch(API_BASE, { method: 'HEAD', signal: controller.signal });
        clearTimeout(id);
        // Backend is reachable
        clearTimeout(failTimer);
        failTimer = null;
        failedRef.current = false;
        setShow(false);
      } catch {
        clearTimeout(id);
        // Backend unreachable — start 5s timer
        if (!failedRef.current) {
          failedRef.current = true;
          failTimer = setTimeout(() => {
            if (!isDismissedToday() && mounted) setShow(true);
          }, 5000);
        }
      }
    };
    check();
    const interval = setInterval(check, 4000);

    // Browser offline detection
    const handleOffline = () => {
      if (isDismissedToday()) return;
      const timer = setTimeout(() => {
        if (!isDismissedToday()) setShow(true);
      }, 3000);
      return () => clearTimeout(timer);
    };
    const handleOnline = () => setShow(false);

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      mounted = false;
      clearInterval(interval);
      clearTimeout(failTimer);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={close}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-5">
              <WifiOff className="w-8 h-8 text-amber-600" />
            </div>
            <p className="text-gray-900 text-lg font-semibold leading-relaxed">
              လိုင်းမကောင်းရင် VPN လေးချိတ်ပေးပါနော်
            </p>
            <p className="text-sm text-gray-500 mt-3 leading-relaxed">
              ကျေးဇူးပြုပြီး သင်၏ VPN ကိုဖွင့်ပြီး ပြန်လည်ချိတ်ဆက်ပါ။
            </p>
            <button
              onClick={close}
              className="mt-6 w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold rounded-2xl transition-colors"
            >
              OK
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
