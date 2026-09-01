import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, Clock, Loader2, ExternalLink, ShieldCheck, AlertCircle, Download, Minimize2, Maximize2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { API_BASE } from '../api/config';
import { expireInstantMmpayOrder } from '../api/public';

export default function InstantMmpayQrModal({
  isOpen,
  onClose,
  qrCodeUrl,
  qrPayload,
  deepLink,
  orderId,
  totalAmount,
  currency = 'MMK',
  initialTimeLeft = 300,
  onSuccess
}) {
  const [timeLeft, setTimeLeft] = useState(initialTimeLeft || 300); // 5 minutes default
  const [status, setStatus] = useState('pending'); // 'pending' | 'success' | 'expired' | 'failed'
  const [isMinimized, setIsMinimized] = useState(false);
  const isDraggingRef = useRef(false);
  const pollingRef = useRef(null);
  const qrRef = useRef(null);

  const handlePillTap = () => {
    if (!isDraggingRef.current) {
      setIsMinimized(false);
    }
  };

  const displayAmount = (() => {
    if (totalAmount === undefined || totalAmount === null || totalAmount === '') return '0';
    if (typeof totalAmount === 'number') return isNaN(totalAmount) ? '0' : totalAmount.toLocaleString();
    const cleaned = String(totalAmount).replace(/[^0-9.]/g, '');
    const num = Number(cleaned);
    return isNaN(num) ? '0' : num.toLocaleString();
  })();

  // Reset timer & mode on open
  useEffect(() => {
    if (isOpen) {
      setTimeLeft(initialTimeLeft && initialTimeLeft > 0 ? initialTimeLeft : 300);
      setStatus('pending');
      setIsMinimized(false);
    }
  }, [isOpen, initialTimeLeft]);

  // Expand back to full mode if status is no longer pending
  useEffect(() => {
    if (status !== 'pending') {
      setIsMinimized(false);
    }
  }, [status]);

  // Countdown timer
  useEffect(() => {
    if (!isOpen || status !== 'pending') return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setStatus('expired');
          setIsMinimized(false);
          if (orderId) {
            expireInstantMmpayOrder(orderId).catch(() => {});
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen, status, orderId]);

  // Intercept window refresh / tab close
  useEffect(() => {
    if (!isOpen || status !== 'pending') return;

    const handleBeforeUnload = (e) => {
      e.preventDefault();
      const warningText = 'Active MMQR payment in progress. Please complete payment before closing.';
      e.returnValue = warningText;
      return warningText;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
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
            setIsMinimized(false);
            if (pollingRef.current) clearInterval(pollingRef.current);
            setTimeout(() => {
              if (onSuccess) onSuccess(data);
            }, 1200);
          } else if (data.status === 'payment_failed' || data.status === 'failed') {
            setStatus('failed');
            setIsMinimized(false);
            if (pollingRef.current) clearInterval(pollingRef.current);
          } else if (data.status === 'expired' || data.status === 'cancelled') {
            setStatus('expired');
            setIsMinimized(false);
            if (pollingRef.current) clearInterval(pollingRef.current);
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

  const handleDownloadQr = () => {
    if (!qrRef.current) return;
    try {
      const svgElement = qrRef.current.querySelector('svg');
      if (svgElement) {
        const svgData = new XMLSerializer().serializeToString(svgElement);
        const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const URL = window.URL || window.webkitURL || window;
        const blobURL = URL.createObjectURL(svgBlob);

        const image = new Image();
        image.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = 512;
          canvas.height = 512;
          const context = canvas.getContext('2d');
          context.fillStyle = '#FFFFFF';
          context.fillRect(0, 0, canvas.width, canvas.height);
          context.drawImage(image, 32, 32, 448, 448);

          const png = canvas.toDataURL('image/png');
          const downloadLink = document.createElement('a');
          downloadLink.href = png;
          downloadLink.download = `MMQR-${orderId || 'payment'}.png`;
          document.body.appendChild(downloadLink);
          downloadLink.click();
          document.body.removeChild(downloadLink);
        };
        image.src = blobURL;
      } else {
        const imgElement = qrRef.current.querySelector('img');
        if (imgElement && imgElement.src) {
          const downloadLink = document.createElement('a');
          downloadLink.href = imgElement.src;
          downloadLink.download = `MMQR-${orderId || 'payment'}.png`;
          document.body.appendChild(downloadLink);
          downloadLink.click();
          document.body.removeChild(downloadLink);
        }
      }
    } catch (e) {
      console.error('Failed to download QR code:', e);
    }
  };

  if (!isOpen) return null;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  // ----------------------------------------------------
  // Floating Mini Window Mode (Fully tapable anywhere to expand)
  // ----------------------------------------------------
  if (isMinimized && status === 'pending') {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ scale: 0.8, opacity: 0, y: -20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0, y: -20 }}
          drag
          dragMomentum={false}
          onDragStart={() => {
            isDraggingRef.current = true;
          }}
          onDragEnd={() => {
            setTimeout(() => {
              isDraggingRef.current = false;
            }, 150);
          }}
          onTap={handlePillTap}
          onPointerUp={handlePillTap}
          onClick={handlePillTap}
          className="fixed top-16 right-3 sm:top-20 sm:right-6 z-50 bg-gradient-to-r from-purple-950 via-indigo-950 to-purple-900 text-white p-2 px-3.5 rounded-full shadow-2xl border border-purple-400/50 flex items-center gap-2.5 cursor-pointer group hover:border-purple-300 transition-all select-none backdrop-blur-lg active:scale-95 touch-none"
        >
          {/* Pulsing MMQR Icon */}
          <div className="relative w-8 h-8 bg-white rounded-full p-1 flex items-center justify-center shrink-0 shadow-md pointer-events-none">
            <img src="/mmqr-logo.png" alt="MMQR" className="w-full h-full object-contain" />
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-purple-950 animate-ping" />
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-purple-950" />
          </div>

          {/* Mini Status & Countdown Timer */}
          <div className="flex flex-col text-left pr-1 pointer-events-none">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-black tracking-wide text-white">MMQR Active</span>
              <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-md bg-purple-500/30 text-purple-200 border border-purple-400/30">
                {displayAmount} {currency}
              </span>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-purple-200 font-mono font-bold mt-0.5">
              <Clock className="w-3 h-3 text-amber-400 animate-pulse" />
              <span>{formattedTime} left</span>
              <span className="text-[9px] text-purple-300 font-sans ml-1 opacity-80 group-hover:opacity-100 transition-opacity">
                (Tap to expand)
              </span>
            </div>
          </div>

          {/* Expand Icon */}
          <div className="flex items-center pointer-events-none">
            <div className="p-1.5 text-white/80 group-hover:text-white rounded-full bg-white/10 group-hover:bg-white/20 transition-all">
              <Maximize2 className="w-3.5 h-3.5" />
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  // ----------------------------------------------------
  // Full Screen Modal Mode (Sleek Compact Sizing)
  // ----------------------------------------------------
  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-3 sm:p-4">
        <motion.div
          initial={{ scale: 0.92, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.92, opacity: 0, y: 15 }}
          className="relative bg-white w-full max-w-[360px] rounded-3xl shadow-2xl overflow-hidden border border-purple-100 max-h-[94vh] flex flex-col"
        >
          {/* Compact Header Banner */}
          <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-purple-950 p-3.5 sm:p-4 text-white text-center relative shrink-0">
            <div className="absolute right-3 top-3 flex items-center gap-1">
              {status === 'pending' && (
                <button
                  onClick={() => setIsMinimized(true)}
                  className="p-1.5 text-white/70 hover:text-white rounded-full bg-white/10 hover:bg-white/20 transition-all"
                  title="Minimize to floating window"
                >
                  <Minimize2 className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => {
                  if (status === 'pending') {
                    setIsMinimized(true);
                  } else {
                    onClose();
                  }
                }}
                className="p-1.5 text-white/70 hover:text-white rounded-full bg-white/10 hover:bg-white/20 transition-all"
                title="Minimize window"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Compact Logo */}
            <div className="w-12 h-12 bg-white rounded-xl p-1.5 mx-auto mb-1.5 shadow-md flex items-center justify-center">
              <img src="/mmqr-logo.png" alt="MMQR" className="w-full h-full object-contain" />
            </div>
            <h3 className="text-base font-black tracking-tight text-white leading-tight">MMQR Myan Myan Pay</h3>
            <p className="text-[10px] text-purple-200 mt-0.5">Automated QR Payment Verification</p>
          </div>

          <div className="p-3.5 sm:p-4 space-y-2.5 text-center overflow-y-auto">
            {status === 'success' ? (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="py-6 space-y-3"
              >
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <div>
                  <h4 className="text-lg font-black text-gray-900">Payment Received!</h4>
                  <p className="text-xs text-gray-500 mt-1">Your order has been automatically confirmed.</p>
                </div>
              </motion.div>
            ) : status === 'failed' ? (
              <div className="py-6 space-y-3">
                <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
                  <AlertCircle className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-gray-900">Payment Failed</h4>
                  <p className="text-xs text-gray-500 max-w-xs mx-auto mt-1">The payment was not successful. Please try placing your order again.</p>
                </div>
                <button
                  onClick={onClose}
                  className="px-5 py-2 bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-gray-800 transition-all"
                >
                  Close & Retry
                </button>
              </div>
            ) : status === 'expired' ? (
              <div className="py-6 space-y-3">
                <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
                  <AlertCircle className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-gray-900">Payment Session Expired</h4>
                  <p className="text-xs text-gray-500 max-w-xs mx-auto mt-1">The 5-minute payment window elapsed. Please try placing your order again.</p>
                </div>
                <button
                  onClick={onClose}
                  className="px-5 py-2 bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-gray-800 transition-all"
                >
                  Close & Retry
                </button>
              </div>
            ) : (
              <>
                {/* Total Amount Badge */}
                <div className="bg-purple-50 rounded-xl p-2.5 border border-purple-100 text-center">
                  <p className="text-[10px] font-semibold text-purple-600 uppercase tracking-wider">Amount to Pay</p>
                  <p className="text-xl font-black text-purple-950 mt-0.5">
                    {displayAmount} <span className="text-xs font-bold text-purple-700">{currency}</span>
                  </p>
                </div>

                {/* Compact Dynamic QR Display Container */}
                <div ref={qrRef} className="relative bg-white p-2.5 rounded-2xl border-2 border-purple-200 shadow-sm inline-block mx-auto">
                  {qrCodeUrl ? (
                    <img
                      src={qrCodeUrl}
                      alt="MMQR Payment Code"
                      className="w-44 h-44 sm:w-48 sm:h-48 object-contain rounded-xl mx-auto"
                    />
                  ) : qrPayload ? (
                    <div className="p-1 bg-white rounded-xl flex items-center justify-center">
                      <QRCodeSVG value={qrPayload} size={176} level="M" includeMargin={true} />
                    </div>
                  ) : (
                    <div className="w-44 h-44 flex flex-col items-center justify-center text-gray-400 bg-gray-50 rounded-xl">
                      <Loader2 className="w-7 h-7 animate-spin text-purple-600 mb-2" />
                      <span className="text-[11px] font-medium">Generating MMQR Code...</span>
                    </div>
                  )}
                </div>

                {/* Under QR Code: Myan Myan Pay Logo & Powered by text */}
                <div className="flex items-center justify-center gap-1.5 text-[11px] italic text-gray-600 font-medium">
                  <img src="/mmpay_logo.png" alt="Myan Myan Pay" className="w-4 h-4 rounded-full object-contain shadow-xs" />
                  <span>Payment Powered by Myan Myan Pay MMQR</span>
                </div>

                {/* Download QR Code Button */}
                {(qrCodeUrl || qrPayload) && (
                  <button
                    onClick={handleDownloadQr}
                    className="flex items-center justify-center gap-2 w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl font-bold text-xs transition-all border border-gray-200 active:scale-98"
                  >
                    <Download className="w-3.5 h-3.5 text-purple-700" />
                    Download QR Code
                  </button>
                )}

                {/* Deep Link Button for Mobile */}
                {deepLink && (
                  <a
                    href={deepLink}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-2.5 bg-purple-600 text-white rounded-xl font-bold text-xs hover:bg-purple-700 transition-all shadow-md active:scale-98"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Open Mobile Banking App
                  </a>
                )}

                {/* Live Waiting Status & Timer */}
                <div className="flex items-center justify-between text-xs font-medium text-gray-500 px-2 bg-gray-50 p-2 rounded-xl border border-gray-100">
                  <span className="flex items-center gap-1.5 text-purple-700 font-bold text-[11px]">
                    <Loader2 className="w-3 h-3 animate-spin text-purple-600" />
                    Waiting for payment...
                  </span>
                  <span className="flex items-center gap-1 font-mono font-bold text-gray-700 bg-white px-2 py-0.5 rounded-lg text-xs shadow-xs border border-gray-200">
                    <Clock className="w-3 h-3 text-amber-500" />
                    {formattedTime}
                  </span>
                </div>

                {/* Bottom Note */}
                <div className="pt-0.5">
                  <p className="text-[11px] font-semibold text-purple-800 bg-purple-50 py-1.5 px-2.5 rounded-lg border border-purple-100">
                    Please proceed within 5 minutes.
                  </p>
                </div>

                <p className="text-[10px] text-gray-400 flex items-center justify-center gap-1 pt-0.5">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
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
