import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { WifiOff, Wifi, X } from 'lucide-react';

export default function NetworkStatus() {
  const [offline, setOffline] = useState(!navigator.onLine);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const goOffline = () => { setOffline(true); setDismissed(false); };
    const goOnline = () => setOffline(false);
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  return (
    <AnimatePresence>
      {offline && !dismissed && (
        <motion.div
          initial={{ opacity: 0, y: -80, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -80, scale: 0.95 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="fixed top-4 left-4 right-4 z-[99999] max-w-sm mx-auto"
        >
          <div className="bg-gray-900/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/10 overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-amber-500 to-rose-500" />

            <div className="p-5">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/20 flex items-center justify-center flex-shrink-0">
                  <div className="relative">
                    <WifiOff className="w-6 h-6 text-rose-400" />
                    <motion.div
                      animate={{ opacity: [0, 1, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full"
                    />
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-bold text-white">No Internet Connection</h3>
                  <p className="text-sm text-gray-400 mt-1 leading-relaxed">
                    You're offline. Some features may not work until your connection is restored.
                  </p>

                  <div className="flex items-center gap-2 mt-3">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                    >
                      <Wifi className="w-3.5 h-3.5 text-amber-400/60" />
                    </motion.div>
                    <span className="text-xs text-gray-500">Waiting for connection...</span>
                  </div>
                </div>

                <button
                  onClick={() => setDismissed(true)}
                  className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center flex-shrink-0 hover:bg-white/10 transition-colors"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {!offline && dismissed && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.3 }}
          className="fixed bottom-24 left-4 right-4 z-[99999] max-w-sm mx-auto"
        >
          <div className="bg-emerald-600/95 backdrop-blur-xl rounded-2xl shadow-2xl px-4 py-3 flex items-center gap-3">
            <Wifi className="w-5 h-5 text-white" />
            <p className="text-sm font-bold text-white">Back online</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
