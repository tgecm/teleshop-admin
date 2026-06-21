import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { checkForUpdate } from '../lib/versionCheck';
import { motion, AnimatePresence } from 'motion/react';

export default function UpdateBanner() {
  const [state, setState] = useState<'loading' | 'uptodate' | 'update'>('loading');
  const [latestVersion, setLatestVersion] = useState('');
  const [currentVersion, setCurrentVersion] = useState('');
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let timer: ReturnType<typeof setTimeout>;
    checkForUpdate().then((result) => {
      if (result.hasUpdate) {
        setState('update');
        setLatestVersion(result.latestVersion);
        setCurrentVersion(result.currentVersion);
      } else {
        setState('uptodate');
        setLatestVersion(result.latestVersion);
        setCurrentVersion(result.currentVersion);
        timer = setTimeout(() => setDismissed(true), 5000);
      }
    });
    return () => clearTimeout(timer);
  }, []);

  if (dismissed || state === 'loading') return null;

  return (
    <AnimatePresence>
      {!dismissed && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className={`overflow-hidden ${state === 'update' ? 'bg-orange-50 border-b border-orange-200' : 'bg-green-50 border-b border-green-200'}`}
        >
          <div className="max-w-[1600px] mx-auto px-3 sm:px-4 md:px-8 lg:px-10 py-2 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              {state === 'update' ? (
                <span className="text-sm">🆕 <span className="font-semibold text-orange-700">New Update Available!</span></span>
              ) : (
                <span className="text-sm">✅ <span className="font-semibold text-green-700">No Updates Available</span></span>
              )}
              <span className="text-xs text-gray-500">
                {latestVersion ? `${latestVersion}` : `v${currentVersion}`}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {state === 'update' && (
                <a
                  href="http://dl.telegramecommerce.shop/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-lg transition-colors whitespace-nowrap"
                >
                  Download Update
                </a>
              )}
              <button
                onClick={() => setDismissed(true)}
                className="text-gray-400 hover:text-gray-600 text-lg leading-none px-1"
              >
                ×
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
