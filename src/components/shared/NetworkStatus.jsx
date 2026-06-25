import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { WifiOff, Wifi, RefreshCw, Signal, SignalZero } from 'lucide-react';

export default function NetworkStatus() {
  const [offline, setOffline] = useState(!navigator.onLine);
  const [justReconnected, setJustReconnected] = useState(false);
  const wasOfflineRef = useRef(offline);
  const retryCountRef = useRef(0);

  const refreshPage = useCallback(() => {
    const queryClient = window.__reactQueryClient;
    if (queryClient) {
      queryClient.invalidateQueries();
    } else {
      window.location.reload();
    }
  }, []);

  const handleRefresh = useCallback(() => {
    retryCountRef.current += 1;
    if (navigator.onLine) {
      setOffline(false);
      setJustReconnected(true);
      setTimeout(() => setJustReconnected(false), 3000);
      refreshPage();
    }
  }, [refreshPage]);

  useEffect(() => {
    let capNetwork;
    let reconnectTimer;

    const handleOffline = () => { setOffline(true); wasOfflineRef.current = true; };
    const handleOnline = () => {
      if (!wasOfflineRef.current) return;
      wasOfflineRef.current = false;
      setOffline(false);
      setJustReconnected(true);
      clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(() => setJustReconnected(false), 3000);
      refreshPage();
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    if (window.Capacitor?.isNativePlatform()) {
      import('@capacitor/network').then(({ Network }) => {
        capNetwork = Network;
        Network.getStatus().then((status) => {
          const wasOffline = !status.connected;
          setOffline(wasOffline);
          wasOfflineRef.current = wasOffline;
        });
        Network.addListener('networkStatusChange', (status) => {
          if (status.connected) {
            handleOnline();
          } else {
            handleOffline();
          }
        });
      }).catch(() => {});
    }

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
      clearTimeout(reconnectTimer);
      if (capNetwork) {
        capNetwork.removeAllListeners();
      }
    };
  }, [refreshPage]);

  return (
    <AnimatePresence>
      {offline && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950"
        >
          {/* Animated background orbs */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <motion.div
              animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.2, 0.1] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-rose-500/10 blur-3xl"
            />
            <motion.div
              animate={{ scale: [1.2, 1, 1.2], opacity: [0.1, 0.15, 0.1] }}
              transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-amber-500/10 blur-3xl"
            />
            <motion.div
              animate={{ scale: [1, 1.1, 1], opacity: [0.05, 0.12, 0.05] }}
              transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-violet-500/10 blur-3xl"
            />
          </div>

          {/* Content */}
          <div className="relative z-10 flex flex-col items-center px-8 max-w-sm w-full">
            {/* Icon */}
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              className="mb-2"
            >
              <div className="w-24 h-24 rounded-full bg-rose-500/15 flex items-center justify-center ring-1 ring-rose-500/20">
                <div className="relative">
                  <WifiOff className="w-12 h-12 text-rose-400" />
                  <motion.div
                    animate={{ opacity: [0, 1, 0], scale: [0.5, 1, 0.5] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="absolute -top-2 -right-2 w-4 h-4 bg-rose-500 rounded-full"
                  />
                </div>
              </div>
            </motion.div>

            {/* Title */}
            <h2 className="text-2xl font-bold text-white mt-6 text-center">No Connection</h2>

            {/* Description */}
            <p className="text-sm text-gray-400 mt-3 text-center leading-relaxed">
              It looks like you're offline. Connect to the internet to manage your shop, view orders, and respond to customers.
            </p>

            {/* Signal bars indicator */}
            <div className="flex items-center gap-1.5 mt-6 mb-8">
              <SignalZero className="w-5 h-5 text-gray-600" />
              <motion.div
                animate={{ opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Signal className="w-5 h-5 text-gray-600 rotate-90" />
              </motion.div>
            </div>

            {/* Retry button */}
            <motion.button
              onClick={handleRefresh}
              whileTap={{ scale: 0.95 }}
              whileHover={{ scale: 1.03 }}
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-rose-600 to-rose-500 text-white font-semibold text-base shadow-lg shadow-rose-500/25 active:shadow-md flex items-center justify-center gap-3"
            >
              <RefreshCw className="w-5 h-5" />
              Tap to Retry
            </motion.button>

            {/* Hint */}
            <p className="text-xs text-gray-600 mt-4 text-center">
              {retryCountRef.current > 0
                ? `Retried ${retryCountRef.current} time${retryCountRef.current > 1 ? 's' : ''} — check your Wi-Fi or mobile data`
                : 'Your data will refresh automatically when reconnected'}
            </p>
          </div>
        </motion.div>
      )}

      {!offline && justReconnected && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="fixed top-4 left-4 right-4 z-[99999] max-w-sm mx-auto"
        >
          <div className="bg-emerald-600/95 backdrop-blur-xl rounded-2xl shadow-2xl px-4 py-3 flex items-center gap-3 border border-emerald-400/20">
            <div className="w-9 h-9 rounded-xl bg-emerald-400/20 flex items-center justify-center">
              <Wifi className="w-5 h-5 text-emerald-300" />
            </div>
            <p className="text-sm font-semibold text-white flex-1">Back online — refreshing data</p>
            <RefreshCw className="w-4 h-4 text-emerald-300 animate-spin" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
