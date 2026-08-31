import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, Clock, Loader2, ExternalLink, ShieldCheck, AlertCircle } from 'lucide-react';
import { API_BASE } from '../api/config';

export default function InstantMmpayQrModal({
  isOpen,
  onClose,
  qrCodeUrl,
  qrPayload,
  deepLink,
  orderId,
  totalAmount,
  currency = 'MMK',
  onSuccess
}) {
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes
  const [status, setStatus] = useState('pending'); // 'pending' | 'success' | 'expired'
  const pollingRef = useRef(null);

  // Reset timer on open
  useEffect(() => {
    if (isOpen) {
      setTimeLeft(300);
      setStatus('pending');
    }
  }, [isOpen]);

  // Countdown timer
  useEffect(() => {
    if (!isOpen || status !== 'pending') return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setStatus('expired');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen, status]);

  // Real-time payment status polling
  useEffect(() => {
    if (!isOpen || !orderId || status !== 'pending') return;

    const checkPaymentStatus = async () => {
      try {
        const res = await fetch(`${API_BASE}/public/order-status/${encodeURIComponent(orderId)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.status === 'confirmed' || data.status === 'paid' || data.paid) {
            setStatus('success');
            if (pollingRef.current) clearInterval(pollingRef.current);
            setTimeout(() => {
              if (onSuccess) onSuccess(data);
            }, 1200);
          }
        }
      } catch (err) {
        console.error('MMPay polling error:', err);
      }
    };

    pollingRef.current = setInterval(checkPaymentStatus, 1800);
    checkPaymentStatus();

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [isOpen, orderId, status, onSuccess]);

  if (!isOpen) return null;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="relative bg-white w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden border border-purple-100"
        >
          {/* Top Header Banner */}
          <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-purple-950 p-6 text-white text-center relative overflow-hidden">
            <button
              onClick={onClose}
              className="absolute right-4 top-4 p-2 text-white/60 hover:text-white rounded-full bg-white/10 hover:bg-white/20 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="w-12 h-12 bg-white rounded-2xl p-2 mx-auto mb-3 shadow-md flex items-center justify-center">
              <img src="/share-icons/mmqr.png" alt="MMQR" className="w-full h-full object-contain" />
            </div>
            <h3 className="text-lg font-black tracking-tight text-white">MMQR Myan Myan Pay</h3>
            <p className="text-xs text-purple-200 mt-0.5">Automated QR Payment Verification</p>
          </div>

          <div className="p-6 space-y-5 text-center">
            {status === 'success' ? (
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="py-8 space-y-4"
              >
                <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                  <CheckCircle2 className="w-12 h-12" />
                </div>
                <div>
                  <h4 className="text-xl font-black text-gray-900">Payment Received!</h4>
                  <p className="text-sm text-gray-500 mt-1">Your order has been automatically confirmed.</p>
                </div>
              </motion.div>
            ) : status === 'expired' ? (
              <div className="py-8 space-y-4">
                <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
                  <AlertCircle className="w-10 h-10" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-gray-900">Payment Session Expired</h4>
                  <p className="text-xs text-gray-500 max-w-xs mx-auto mt-1">The 5-minute payment window elapsed. Please try placing your order again.</p>
                </div>
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 bg-gray-900 text-white rounded-2xl text-sm font-bold hover:bg-gray-800 transition-all"
                >
                  Close & Retry
                </button>
              </div>
            ) : (
              <>
                {/* Total Amount Badge */}
                <div className="bg-purple-50 rounded-2xl p-4 border border-purple-100 text-center">
                  <p className="text-xs font-semibold text-purple-600 uppercase tracking-wider">Amount to Pay</p>
                  <p className="text-2xl font-black text-purple-950 mt-0.5">
                    {Number(totalAmount).toLocaleString()} <span className="text-sm font-bold text-purple-700">{currency}</span>
                  </p>
                </div>

                {/* Dynamic QR Display */}
                <div className="relative bg-white p-4 rounded-3xl border-2 border-purple-200 shadow-md inline-block mx-auto">
                  {qrCodeUrl ? (
                    <img
                      src={qrCodeUrl}
                      alt="MMQR Payment Code"
                      className="w-56 h-56 object-contain rounded-2xl mx-auto"
                    />
                  ) : (
                    <div className="w-56 h-56 flex flex-col items-center justify-center text-gray-400 bg-gray-50 rounded-2xl">
                      <Loader2 className="w-8 h-8 animate-spin text-purple-600 mb-2" />
                      <span className="text-xs font-medium">Generating MMQR Code...</span>
                    </div>
                  )}
                </div>

                {/* Deep Link Button for Mobile */}
                {deepLink && (
                  <a
                    href={deepLink}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-3 bg-purple-600 text-white rounded-2xl font-bold text-sm hover:bg-purple-700 transition-all shadow-md active:scale-98"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Open Mobile Banking App
                  </a>
                )}

                {/* Live Waiting Status & Timer */}
                <div className="flex items-center justify-between text-xs font-medium text-gray-500 px-2 bg-gray-50 p-3 rounded-2xl border border-gray-100">
                  <span className="flex items-center gap-2 text-purple-700 font-bold">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-600" />
                    Waiting for payment...
                  </span>
                  <span className="flex items-center gap-1 font-mono font-bold text-gray-700 bg-white px-2.5 py-1 rounded-xl shadow-xs border border-gray-200">
                    <Clock className="w-3.5 h-3.5 text-amber-500" />
                    {formattedTime}
                  </span>
                </div>

                <p className="text-[11px] text-gray-400 flex items-center justify-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Scan with KBZPay, WavePay, or any MMQR app
                </p>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
