import React from 'react';
import { useToastStore } from '../../store/toastStore';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle, AlertCircle, Sparkles } from 'lucide-react';

export default function ToastContainer() {
  const toasts = useToastStore((state) => state.toasts);

  return (
    <div className="fixed top-16 left-3 right-3 z-[9999] flex flex-col items-center gap-2 pointer-events-none sm:top-5 sm:right-5 sm:left-auto sm:max-w-md sm:items-end">
      <AnimatePresence>
        {toasts.map((toast) => {
          const isSuccess = toast.type === 'success';

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className="pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl border backdrop-blur-xl w-full sm:w-auto font-sans"
              style={{
                background: isSuccess
                  ? 'linear-gradient(135deg, #059669, #10b981)'
                  : 'linear-gradient(135deg, #e11d48, #f43f5e)',
                borderColor: isSuccess ? '#34d399' : '#fda4af',
                color: '#ffffff',
                boxShadow: isSuccess
                  ? '0 10px 25px -5px rgba(16, 185, 129, 0.4)'
                  : '0 10px 25px -5px rgba(244, 63, 94, 0.4)',
              }}
            >
              {isSuccess ? (
                <CheckCircle className="w-5 h-5 text-white shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-white shrink-0 animate-pulse" />
              )}

              <p className="text-xs sm:text-sm font-bold text-white leading-tight flex-1">
                {toast.message}
              </p>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
