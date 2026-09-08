import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';
import client from '../../api/client';
import {
  ShieldAlert,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { motion } from 'motion/react';

export default function TempAccountModal({ title, onSkip }) {
  const { user } = useAuthStore();
  const { addToast } = useToastStore();
  const queryClient = useQueryClient();

  const [tempForm, setTempForm] = useState({
    newEmail: '',
    newPassword: '',
    confirmPassword: '',
    code: '',
  });

  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  const [sendingTempCode, setSendingTempCode] = useState(false);
  const [tempCodeCountdown, setTempCodeCountdown] = useState(0);
  const [submittingTemp, setSubmittingTemp] = useState(false);

  const [tempEmailError, setTempEmailError] = useState('');
  const [tempPwError, setTempPwError] = useState('');
  const [tempConfirmError, setTempConfirmError] = useState('');

  useEffect(() => {
    let timer;
    if (tempCodeCountdown > 0) {
      timer = setInterval(() => setTempCodeCountdown((prev) => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [tempCodeCountdown]);

  const handleGetTempCode = async () => {
    setTempEmailError('');
    setTempPwError('');
    setTempConfirmError('');

    if (!tempForm.newEmail || !tempForm.newEmail.includes('@')) {
      const msg = 'Please enter a valid new email address';
      setTempEmailError(msg);
      addToast(msg, 'error');
      return;
    }

    if (!tempForm.newPassword || tempForm.newPassword.length < 6) {
      const msg = 'Password must be at least 6 characters';
      setTempPwError(msg);
      addToast(msg, 'error');
      return;
    }

    if (tempForm.newPassword !== tempForm.confirmPassword) {
      const msg = 'New password and confirm password do not match';
      setTempConfirmError(msg);
      addToast(msg, 'error');
      return;
    }

    setSendingTempCode(true);
    try {
      await client.post('/api/webpanel/send-code', {
        email: tempForm.newEmail.trim().toLowerCase(),
        flow: 'change_temp',
      });
      addToast(`Verification code sent to ${tempForm.newEmail}`, 'success');
      setTempCodeCountdown(60);
    } catch (err) {
      const errMsg = err.response?.data?.detail || err.response?.data?.message || 'Failed to send verification code';
      setTempEmailError(errMsg);
      addToast(errMsg, 'error');
    } finally {
      setSendingTempCode(false);
    }
  };

  const handleConfirmTempChange = async (e) => {
    e.preventDefault();
    setTempEmailError('');
    setTempPwError('');
    setTempConfirmError('');

    if (!tempForm.newEmail || !tempForm.newEmail.includes('@')) {
      const msg = 'Please enter a valid email address';
      setTempEmailError(msg);
      addToast(msg, 'error');
      return;
    }
    if (!tempForm.newPassword || tempForm.newPassword.length < 6) {
      const msg = 'Password must be at least 6 characters';
      setTempPwError(msg);
      addToast(msg, 'error');
      return;
    }
    if (tempForm.newPassword !== tempForm.confirmPassword) {
      const msg = 'New password and confirm password do not match';
      setTempConfirmError(msg);
      addToast(msg, 'error');
      return;
    }
    if (!tempForm.code || tempForm.code.trim().length === 0) {
      addToast('Please enter the verification code', 'error');
      return;
    }

    setSubmittingTemp(true);
    try {
      const res = await client.post('/api/webpanel/update-temp-account', {
        new_email: tempForm.newEmail.trim().toLowerCase(),
        new_password: tempForm.newPassword.trim(),
        code: tempForm.code.trim(),
      });

      addToast(res.data?.message || 'Email and password updated successfully!', 'success');
      useAuthStore.getState().setUser({ ...user, email: tempForm.newEmail.trim().toLowerCase(), is_temp_account: false });
      if (onSkip) onSkip();
      queryClient.invalidateQueries(['me']);
    } catch (err) {
      addToast(err.response?.data?.detail || 'Failed to update credentials', 'error');
    } finally {
      setSubmittingTemp(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 relative overflow-hidden"
      >
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shadow-inner">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white leading-snug">
            {title || 'Change temporary mail and password to unlock setting features'}
          </h2>
          <p className="text-xs text-gray-500 dark:text-slate-400">
            Current login: <span className="text-amber-600 dark:text-amber-400 font-mono font-medium">{user?.email}</span>
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleConfirmTempChange} className="space-y-4">
          {/* New Mail */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
              New Mail
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-slate-400" />
              <input
                type="email"
                required
                placeholder="New Mail"
                value={tempForm.newEmail}
                onChange={(e) => {
                  setTempForm({ ...tempForm, newEmail: e.target.value });
                  if (tempEmailError) setTempEmailError('');
                }}
                className={`w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-slate-800/80 border ${
                  tempEmailError
                    ? 'border-red-500 ring-1 ring-red-500'
                    : 'border-gray-200 dark:border-slate-700'
                } rounded-xl text-gray-900 dark:text-white text-sm placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all`}
              />
            </div>
            {tempEmailError && (
              <p className="mt-1.5 text-xs font-medium text-red-500 dark:text-red-400 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                {tempEmailError}
              </p>
            )}
          </div>

          {/* New Password */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
              New Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-slate-400" />
              <input
                type={showNewPw ? 'text' : 'password'}
                required
                placeholder="New Password"
                value={tempForm.newPassword}
                onChange={(e) => {
                  setTempForm({ ...tempForm, newPassword: e.target.value });
                  if (tempPwError) setTempPwError('');
                  if (tempConfirmError && e.target.value === tempForm.confirmPassword) {
                    setTempConfirmError('');
                  }
                }}
                className={`w-full pl-10 pr-10 py-2.5 bg-gray-50 dark:bg-slate-800/80 border ${
                  tempPwError
                    ? 'border-red-500 ring-1 ring-red-500'
                    : 'border-gray-200 dark:border-slate-700'
                } rounded-xl text-gray-900 dark:text-white text-sm placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all`}
              />
              <button
                type="button"
                onClick={() => setShowNewPw(!showNewPw)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-slate-400 dark:hover:text-slate-200 transition-colors p-1"
                tabIndex={-1}
              >
                {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {tempPwError && (
              <p className="mt-1.5 text-xs font-medium text-red-500 dark:text-red-400 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                {tempPwError}
              </p>
            )}
          </div>

          {/* Confirm New Password */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
              Confirm New Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-slate-400" />
              <input
                type={showConfirmPw ? 'text' : 'password'}
                required
                placeholder="Confirm New Password"
                value={tempForm.confirmPassword}
                onChange={(e) => {
                  setTempForm({ ...tempForm, confirmPassword: e.target.value });
                  if (tempConfirmError) setTempConfirmError('');
                }}
                className={`w-full pl-10 pr-10 py-2.5 bg-gray-50 dark:bg-slate-800/80 border ${
                  tempConfirmError
                    ? 'border-red-500 ring-1 ring-red-500'
                    : 'border-gray-200 dark:border-slate-700'
                } rounded-xl text-gray-900 dark:text-white text-sm placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPw(!showConfirmPw)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-slate-400 dark:hover:text-slate-200 transition-colors p-1"
                tabIndex={-1}
              >
                {showConfirmPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {tempConfirmError && (
              <p className="mt-1.5 text-xs font-medium text-red-500 dark:text-red-400 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                {tempConfirmError}
              </p>
            )}
          </div>

          {/* Verification Code + Get Code */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
              Verification Code
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                required
                placeholder="******"
                value={tempForm.code}
                onChange={(e) => setTempForm({ ...tempForm, code: e.target.value })}
                className="flex-1 px-4 py-2.5 bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white text-sm placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 tracking-widest text-center font-mono transition-all"
              />
              <button
                type="button"
                onClick={handleGetTempCode}
                disabled={sendingTempCode || tempCodeCountdown > 0}
                className="px-4 py-2.5 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-600 dark:text-amber-300 text-xs font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all whitespace-nowrap flex items-center justify-center min-w-[95px]"
              >
                {sendingTempCode ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : tempCodeCountdown > 0 ? (
                  `${tempCodeCountdown}s`
                ) : (
                  'Get Code'
                )}
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between gap-3 pt-4 border-t border-gray-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onSkip}
              className="px-4 py-2.5 text-xs font-bold text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-all"
            >
              Not now
            </button>
            <button
              type="submit"
              disabled={submittingTemp}
              className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl shadow-lg shadow-amber-500/20 disabled:opacity-50 transition-all flex items-center gap-2"
            >
              {submittingTemp && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Confirm
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
