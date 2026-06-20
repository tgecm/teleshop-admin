import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Capacitor } from '@capacitor/core';

export default function AppSplashScreen() {
  const [visible, setVisible] = useState(true);
  const logo = localStorage.getItem('splash_logo') || '';
  const bgColor = localStorage.getItem('splash_bg_color') || '#4f46e5';
  const tagline = localStorage.getItem('splash_tagline') || '';

  const shouldShow = Capacitor.isNativePlatform() && (logo || tagline);

  useEffect(() => {
    if (!shouldShow) {
      setVisible(false);
      return;
    }
    const timer = setTimeout(() => setVisible(false), 3000);
    return () => clearTimeout(timer);
  }, [shouldShow]);

  return (
    <AnimatePresence>
      {visible && shouldShow && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-[999999] flex flex-col items-center justify-center"
          style={{ backgroundColor: bgColor }}
        >
          {logo ? (
            <img src={logo} alt="Logo" className="w-24 h-24 rounded-3xl object-cover shadow-2xl mb-4" />
          ) : (
            <div className="w-24 h-24 rounded-3xl bg-white/20 flex items-center justify-center mb-4">
              <span className="text-4xl font-bold text-white">EC</span>
            </div>
          )}
          {tagline && (
            <p className="text-white/80 text-sm font-medium mt-2 max-w-xs text-center">{tagline}</p>
          )}
          <motion.div
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="mt-8"
          >
            <div className="w-6 h-6 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
