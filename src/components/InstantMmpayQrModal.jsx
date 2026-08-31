import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, Clock, Loader2, ExternalLink, ShieldCheck, AlertCircle, Download, AlertTriangle } from 'lucide-react';
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
  onSuccess
}) {
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes
  const [status, setStatus] = useState('pending'); // 'pending' | 'success' | 'expired'
  const [showCloseWarning, setShowCloseWarning] = useState(false);
  const pollingRef = useRef(null);
  const qrRef = useRef(null);

  // Reset timer on open
  useEffect(() => {
    if (isOpen) {
      setTimeLeft(300);
      setStatus('pending');
      setShowCloseWarning(false);
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

  // Intercept window refresh / tab close & browser back button
  useEffect(() => {
    if (!isOpen || status !== 'pending') return;

    const handleBeforeUnload = (e) => {
      e.preventDefault();
      const warningText = 'If you close this QR code, do not transfer money using it. To proceed, please create a new order.';
      e.returnValue = warningText;
      return warningText;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    // Push dummy history entry for back button interception
    window.history.pushState({ modalOpen: true }, '');
    const handlePopState = () => {
      setShowCloseWarning(true);
    };
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
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
            setShowCloseWarning(false);
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

  const handleRequestClose = () => {
    if (status === 'pending') {
      setShowCloseWarning(true);
    } else {
      onClose();
    }
  };

  const handleConfirmClose = () => {
    setShowCloseWarning(false);
    setStatus('expired');
    if (orderId) {
      expireInstantMmpayOrder(orderId).catch(() => {});
    }
    onClose();
  };

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
              onClick={handleRequestClose}
              className="absolute right-4 top-4 p-2 text-white/60 hover:text-white rounded-full bg-white/10 hover:bg-white/20 transition-all"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Bigger MMQR Logo at Top */}
            <div className="w-20 h-20 bg-white rounded-2xl p-2.5 mx-auto mb-3 shadow-lg flex items-center justify-center">
              <img src="/mmqr-logo.png" alt="MMQR" className="w-full h-full object-contain" />
            </div>
            <h3 className="text-lg font-black tracking-tight text-white">MMQR Myan Myan Pay</h3>
            <p className="text-xs text-purple-200 mt-0.5">Automated QR Payment Verification</p>
          </div>

          <div className="p-6 space-y-4 text-center">
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

                {/* Dynamic QR Display Container */}
                <div ref={qrRef} className="relative bg-white p-4 rounded-3xl border-2 border-purple-200 shadow-md inline-block mx-auto">
                  {qrCodeUrl ? (
                    <img
                      src={qrCodeUrl}
                      alt="MMQR Payment Code"
                      className="w-56 h-56 object-contain rounded-2xl mx-auto"
                    />
                  ) : qrPayload ? (
                    <div className="p-2 bg-white rounded-2xl flex items-center justify-center">
                      <QRCodeSVG value={qrPayload} size={224} level="M" includeMargin={true} />
                    </div>
                  ) : (
                    <div className="w-56 h-56 flex flex-col items-center justify-center text-gray-400 bg-gray-50 rounded-2xl">
                      <Loader2 className="w-8 h-8 animate-spin text-purple-600 mb-2" />
                      <span className="text-xs font-medium">Generating MMQR Code...</span>
                    </div>
                  )}
                </div>

                {/* Under QR Code: Myan Myan Pay Logo & Powered by text */}
                <div className="flex items-center justify-center gap-1.5 text-xs italic text-gray-600 font-medium">
                  <img src="/mmpay_logo.png" alt="Myan Myan Pay" className="w-5 h-5 rounded-full object-contain shadow-xs" />
                  <span>Payment Powered by Myan Myan Pay MMQR</span>
                </div>

                {/* Download QR Code Button */}
                {(qrCodeUrl || qrPayload) && (
                  <button
                    onClick={handleDownloadQr}
                    className="flex items-center justify-center gap-2 w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-2xl font-bold text-xs transition-all border border-gray-200 active:scale-98"
                  >
                    <Download className="w-4 h-4 text-purple-700" />
                    Download QR Code
                  </button>
                )}

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

                {/* Bottom Note */}
                <p className="text-xs font-semibold text-purple-800 bg-purple-50 py-2 px-3 rounded-xl border border-purple-100">
                  Please proceed within 5 minutes.
                </p>

                <p className="text-[11px] text-gray-400 flex items-center justify-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Scan with KBZPay, WavePay, or any MMQR app
                </p>
              </>
            )}
          </div>
        </motion.div>

        {/* Warning Close Modal Overlay */}
        <AnimatePresence>
          {showCloseWarning && (
            <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-3xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl border border-rose-100"
              >
                <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
                  <AlertTriangle className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-lg font-black text-gray-900">Warning</h4>
                  <p className="text-xs font-semibold text-gray-600 leading-relaxed max-w-xs mx-auto">
                    If you close this QR code, do not transfer money using it.<br />
                    To proceed, please create a new order.
                  </p>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleConfirmClose}
                    className="flex-1 py-2.5 bg-gray-900 text-white font-bold rounded-2xl hover:bg-gray-800 transition-all text-xs shadow-md"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => setShowCloseWarning(false)}
                    className="flex-1 py-2.5 bg-purple-600 text-white font-bold rounded-2xl hover:bg-purple-700 transition-all text-xs shadow-md"
                  >
                    Keep Waiting
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </AnimatePresence>
  );
}
