import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert } from 'lucide-react';

export default function PreCheckoutMmpayConfirmModal({
  isOpen,
  onCancel,
  onContinue
}) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="bg-white rounded-[28px] p-6 max-w-sm w-full text-center space-y-4 shadow-2xl border border-purple-100 relative overflow-hidden"
        >
          <div className="w-16 h-16 bg-purple-100 text-purple-700 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
            <ShieldAlert className="w-9 h-9 text-purple-700" />
          </div>

          <div className="space-y-1 py-1">
            <p className="text-base font-black text-gray-900 leading-snug">
              ကျေးဇူးပြုပြီး ငွေပေးချေရန်<br />
              အဆင်သင့်ဖြစ်မှသာ Continue ကို နှိပ်ပါ
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={onCancel}
              className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-2xl transition-all text-xs border border-gray-200 active:scale-98"
            >
              Cancel
            </button>
            <button
              onClick={onContinue}
              className="flex-1 py-3 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-700 hover:to-indigo-700 text-white font-bold rounded-2xl transition-all shadow-md text-xs active:scale-98"
            >
              Continue
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
