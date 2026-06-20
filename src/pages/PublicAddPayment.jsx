import { API_BASE } from '../api/config';
import React, { useState, useRef } from 'react';

function compressImage(file, maxDimension = 720) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width <= maxDimension && height <= maxDimension) {
        resolve(file);
        return;
      }
      if (width > height) {
        height = Math.round(height * (maxDimension / width));
        width = maxDimension;
      } else {
        width = Math.round(width * (maxDimension / height));
        height = maxDimension;
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => {
        resolve(new File([blob], file.name, { type: 'image/jpeg' }));
      }, 'image/jpeg', 0.8);
    };
    img.src = URL.createObjectURL(file);
  });
}

export default function PublicAddPayment({ username, code, secret1 = '', secret2 = '' }) {
  const [state, setState] = useState('loading');
  const [botInfo, setBotInfo] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    account_name: '',
    payment_number: '',
    notes: '',
  });
  const [qrImage, setQrImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef(null);

  React.useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE}/public/bot-resolve/${encodeURIComponent(username)}/${encodeURIComponent(code)}?secret1=${encodeURIComponent(secret1)}&secret2=${encodeURIComponent(secret2)}`)
      .then(res => {
        if (!res.ok) throw new Error('Invalid link');
        return res.json();
      })
      .then(data => {
        if (cancelled) return;
        setBotInfo(data);
        if (data.limits && data.counts && data.limits.payment_methods !== null && data.counts.payment_methods >= data.limits.payment_methods) {
          setState('limit_reached');
        } else {
          setState('form');
        }
      })
      .catch(() => {
        if (cancelled) return;
        setState('error');
      });
    return () => { cancelled = true; };
  }, [username, code]);

  const handleQrUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const compressed = await compressImage(file);
      const formData = new FormData();
      formData.append('file', compressed);
      formData.append('bot_id', botInfo.bot_id);
      const res = await fetch(`${API_BASE}/public/upload/photo`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      setQrImage({ file_id: data.file_id });
    } catch {
      // ignore silently
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeQr = () => {
    setQrImage(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.payment_number.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/public/create-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          code,
          secret1,
          secret2,
          name: formData.name.trim(),
          account_name: formData.account_name.trim() || null,
          payment_number: formData.payment_number.trim(),
          notes: formData.notes.trim() || null,
          qr_code_url: qrImage?.file_id || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.detail || 'Failed to create payment');
        setSubmitting(false);
        return;
      }
      setResult(data);
      setState('success');
    } catch (err) {
      setErrorMsg(err?.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (state === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-[3px] border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-400 font-medium">Loading, If slow, use VPN</p>
        </div>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full text-center"
        >
          <div className="w-20 h-20 bg-gradient-to-br from-red-50 to-red-100 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <AlertCircle className="w-10 h-10 text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Invalid Link</h2>
          <p className="text-gray-500 text-sm mb-6">
            Please add payment using your mobile phone
          </p>
          <a
            href="https://t.me/tg_ecommerce_official_bot"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 font-bold rounded-2xl hover:bg-gray-200 transition-all"
          >
            Contact Support
            <ChevronRight className="w-4 h-4" />
          </a>
        </motion.div>
      </div>
    );
  }

  if (state === 'limit_reached') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full text-center"
        >
          <div className="w-20 h-20 bg-gradient-to-br from-amber-50 to-amber-100 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <AlertCircle className="w-10 h-10 text-amber-400" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Limit Reached</h2>
          <p className="text-gray-500 text-sm mb-6">
            You have reach your limit of adding new payment method, to add more, please upgrade!
          </p>
          <a
            href="https://t.me/tg_ecommerce_official_bot"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-2xl hover:from-indigo-700 hover:to-purple-700 transition-all"
          >
            Contact Support to Upgrade
            <ChevronRight className="w-4 h-4" />
          </a>
        </motion.div>
      </div>
    );
  }

  if (state === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full text-center"
        >
          <div className="w-20 h-20 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <CheckCircle2 className="w-10 h-10 text-emerald-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Payment Method Submitted!</h2>
          <p className="text-gray-500 text-sm mb-2">
            Your payment method has been submitted successfully.
          </p>
          {result && (
            <div className="bg-gray-50 rounded-2xl p-4 mb-6 text-left border border-gray-100">
              <p className="text-sm font-bold text-gray-900">{result.name}</p>
              <p className="text-sm text-gray-500 mt-1">{result.payment_number}</p>
            </div>
          )}
          <p className="text-xs text-gray-400">
            The shop owner will review your payment method shortly.
          </p>
        </motion.div>
      </div>
    );
  }

  const isValid = formData.name.trim() && formData.payment_number.trim();
  const shopName = botInfo?.bot_full_name || 'Shop';

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="max-w-lg mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl shadow-lg overflow-hidden"
        >
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-center">
            <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg border border-white/20">
              <CreditCard className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-xl font-bold text-white">Add Payment Method</h1>
            <p className="text-indigo-200 text-sm mt-1">{shopName}</p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {errorMsg && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-2xl">
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                <p className="text-sm font-medium text-red-700">{errorMsg}</p>
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 ml-1">Payment Name *</label>
              <input
                required
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. KBZPay, WavePay"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-sm"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 ml-1">Account Number *</label>
              <input
                required
                type="text"
                value={formData.payment_number}
                onChange={(e) => setFormData({ ...formData, payment_number: e.target.value.replace(/\D/g, '') })}
                placeholder="e.g. 09123456789"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-sm"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 ml-1">Account Name</label>
              <input
                type="text"
                value={formData.account_name}
                onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
                placeholder="e.g. U Aung"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-sm"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 ml-1">Notes</label>
              <textarea
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="e.g. Include your Order ID in the transfer note"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-sm resize-none"
              />
            </div>

            <div className="space-y-3">
              <label className="text-sm font-bold text-gray-700 ml-1">
                QR Code <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={handleQrUpload}
                className="hidden"
              />
              {qrImage && (
                <div className="flex justify-center">
                  <div className="relative w-36 h-36">
                    <img
                      src={`${API_BASE}/telegram/file/${encodeURIComponent(qrImage.file_id)}?bot_id=${botInfo.bot_id}`}
                      alt="QR Code"
                      className="w-full h-full object-cover rounded-2xl border border-gray-200"
                    />
                    <button
                      type="button"
                      onClick={removeQr}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-rose-600 transition-all"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
              {!qrImage && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="w-full py-10 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center gap-2 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all"
                >
                  {uploading ? (
                    <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                  ) : (
                    <>
                      <ImageUp className="w-7 h-7 text-gray-300" />
                      <span className="font-bold text-sm text-gray-500">Upload QR Code</span>
                    </>
                  )}
                </button>
              )}
            </div>

            <div className="pt-4 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setFormData({ name: '', account_name: '', payment_number: '', notes: '' });
                  setQrImage(null);
                }}
                className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 font-bold rounded-2xl hover:bg-gray-200 transition-all text-sm"
              >
                Reset
              </button>
              <button
                disabled={!isValid || submitting}
                type="submit"
                className="flex-[2] px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-2xl shadow-lg shadow-indigo-100 hover:shadow-xl hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2 text-sm active:scale-[0.98]"
              >
                {submitting && <Loader2 className="w-5 h-5 animate-spin" />}
                {submitting ? 'Submitting...' : 'Submit Payment'}
              </button>
            </div>
          </form>
        </motion.div>

        <div className="text-center mt-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-5 h-5 rounded-md flex items-center justify-center bg-indigo-600">
              <ShoppingBag className="w-3 h-3 text-white" />
            </div>
            <span className="text-xs font-bold text-gray-500">Telegram E-Commerce</span>
          </div>
          <p className="text-[10px] text-gray-400">Powered by Telegram E-Commerce Platform</p>
        </div>
      </div>
    </div>
  );
}
