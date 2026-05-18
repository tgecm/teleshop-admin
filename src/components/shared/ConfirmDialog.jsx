import { AlertTriangle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = 'Confirm',
  message = 'Are you sure?',
  confirmText = 'Confirm',
  variant = 'danger',
  loading = false,
}) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ type: 'spring', duration: 0.4, bounce: 0.3 }}
            className="relative bg-white rounded-3xl shadow-2xl p-6 max-w-sm w-full mx-auto"
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1.5 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex flex-col items-center text-center pt-2">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${
                variant === 'danger' ? 'bg-rose-50 text-rose-500' :
                variant === 'warning' ? 'bg-amber-50 text-amber-500' :
                'bg-indigo-50 text-indigo-500'
              }`}>
                <AlertTriangle className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1.5">{title}</h3>
              <p className="text-sm text-gray-500 mb-6 leading-relaxed">{message}</p>
              <div className="flex gap-3 w-full">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-3 bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold rounded-2xl transition-all active:scale-[0.97] text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={onConfirm}
                  disabled={loading}
                  className={`flex-1 px-4 py-3 text-white font-bold rounded-2xl transition-all active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed text-sm ${
                    variant === 'danger' ? 'bg-rose-600 hover:bg-rose-700 shadow-lg shadow-rose-100' :
                    variant === 'warning' ? 'bg-amber-600 hover:bg-amber-700 shadow-lg shadow-amber-100' :
                    'bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-100'
                  }`}
                >
                  {confirmText}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
