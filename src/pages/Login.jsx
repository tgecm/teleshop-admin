import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import { login as loginApi, verifyLoginCode, pollLoginApproval } from '../api/auth';
import client from '../api/client';
import { useBotStore } from '../store/botStore';
import { motion } from 'motion/react';
import { Mail, Lock, Loader2, AlertCircle, Eye, EyeOff, User, ShieldCheck, Clipboard } from 'lucide-react';
import { sendStoredFCMToken } from '../lib/pushNotifications';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loginToken, setLoginToken] = useState('');
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [needsCode, setNeedsCode] = useState(false);
  const codeRefs = useRef([]);
  const setAuth = useAuthStore(state => state.login);
  const setSelectedBot = useBotStore(state => state.setSelectedBot);
  const navigate = useNavigate();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [staffMode, setStaffMode] = useState(false);
  const [username, setUsername] = useState('');
  const [menuPos, setMenuPos] = useState({ show: false, x: 0, y: 0, hasSel: false });
  const menuTargetRef = useRef(null);
  const verifyingRef = useRef(false);
  const [waitingApproval, setWaitingApproval] = useState(false);

  const showInputMenu = useCallback((e, inputEl) => {
    e.preventDefault();
    e.stopPropagation();
    menuTargetRef.current = inputEl;
    const hasSel = inputEl.selectionStart !== inputEl.selectionEnd;
    setMenuPos({ show: true, x: e.clientX, y: e.clientY, hasSel });
  }, []);

  const hideInputMenu = useCallback(() => {
    menuTargetRef.current = null;
    setMenuPos({ show: false, x: 0, y: 0, hasSel: false });
  }, []);

  const execCopy = useCallback(() => {
    const el = menuTargetRef.current;
    if (!el) return;
    el.focus();
    if (el.selectionStart !== el.selectionEnd) {
      document.execCommand('copy');
    }
    hideInputMenu();
  }, []);

  const execCut = useCallback(() => {
    const el = menuTargetRef.current;
    if (!el) return;
    el.focus();
    if (el.selectionStart !== el.selectionEnd) {
      document.execCommand('cut');
    }
    hideInputMenu();
  }, []);

  const execPaste = useCallback(async () => {
    const el = menuTargetRef.current;
    menuTargetRef.current = null;
    setMenuPos({ show: false, x: 0, y: 0, hasSel: false });
    if (!el) return;
    let text = '';
    try {
      text = await navigator.clipboard.readText();
    } catch {
      try {
        text = await new Promise((resolve) => {
          const ta = document.createElement('textarea');
          ta.style.cssText = 'position:fixed;left:-9999px;top:0;width:1px;height:1px;opacity:0';
          document.body.appendChild(ta);
          ta.focus();
          const handler = (ev) => { resolve(ev.clipboardData?.getData('text') || ''); };
          ta.addEventListener('paste', handler, { once: true });
          document.execCommand('paste');
          setTimeout(() => { document.body.removeChild(ta); resolve(''); }, 100);
        });
      } catch { text = ''; }
    }
    if (text && el) {
      const start = el.selectionStart ?? el.value.length;
      const end = el.selectionEnd ?? el.value.length;
      const newVal = el.value.slice(0, start) + text + el.value.slice(end);
      const field = el.dataset?.field;
      const nativeSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
      if (nativeSetter) {
        nativeSetter.call(el, newVal);
      } else {
        el.value = newVal;
      }
      const ev = new Event('input', { bubbles: true });
      el.dispatchEvent(ev);
      el.selectionStart = el.selectionEnd = start + text.length;
      el.focus();
      if (field === 'password') setPassword(newVal);
      else if (field === 'email') {
        if (staffMode) setUsername(newVal);
        else setEmail(newVal);
      } else if (field === 'code') {
        const digits = text.replace(/\D/g, '').split('').slice(0, 6);
        const next = [...code];
        const idx = codeRefs.current.indexOf(el);
        if (idx >= 0) {
          digits.forEach((d, i) => { if (idx + i < 6) next[idx + i] = d; });
        }
        setCode(next);
      }
    }
  }, [staffMode, code]);

  useEffect(() => {
    if (needsCode && codeRefs.current[0]) codeRefs.current[0].focus();
  }, [needsCode]);

  // Poll for Telegram approve button approval
  useEffect(() => {
    if (!needsCode || !loginToken) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const data = await pollLoginApproval(loginToken);
        if (cancelled) return;
        if (verifyingRef.current) return;
        if (data.status === 'approved') {
          if (data.staff) {
            setAuth(data.token, { ...data.staff, email: data.staff.username }, true);
            if (data.staff.bot_id) setSelectedBot(data.staff.bot_id);
          } else {
            setAuth(data.token, data);
          }
          navigate('/dashboard');
        } else if (data.status === 'expired') {
          if (!cancelled) setError('Login code expired. Please login again.');
        } else if (data.status === 'pending') {
          if (!cancelled) setWaitingApproval(true);
        }
      } catch {
        // poll error, retry
      }
    };
    poll();
    const interval = setInterval(poll, 1000);
    const onFocus = () => { if (!cancelled) poll(); };
    window.addEventListener('visibilitychange', onFocus);
    return () => { cancelled = true; clearInterval(interval); window.removeEventListener('visibilitychange', onFocus); setWaitingApproval(false); };
  }, [needsCode, loginToken]);

  useEffect(() => {
    const token = useAuthStore.getState().token || localStorage.getItem('token');
    if (token) {
      navigate('/dashboard', { replace: true });
    } else {
      setCheckingAuth(false);
    }
  }, [navigate]);

  useEffect(() => {
    if (useAuthStore.getState().token) {
      sendStoredFCMToken();
    }
  }, []);

  if (checkingAuth) return null;


  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (needsCode) {
        const codeStr = code.join('');
        verifyingRef.current = true;
        if (staffMode) {
          const data = await client.post('/auth/staff-login/verify', { login_token: loginToken, code: codeStr }).then(r => r.data);
          if (data.success) {
            setAuth(data.token, { ...data.staff, email: data.staff.username }, true);
            sendStoredFCMToken();
            if (data.staff?.bot_id) setSelectedBot(data.staff.bot_id);
            navigate('/dashboard');
          } else {
            setError('Verification failed. Try again.');
          }
        } else {
          const data = await verifyLoginCode(loginToken, codeStr);
          if (data.success) {
            setAuth(data.token, data);
            sendStoredFCMToken();
            navigate('/dashboard');
          } else {
            setError('Verification failed. Try again.');
          }
        }
      } else if (staffMode) {
        const data = await client.post('/auth/staff-login', { username, password }).then(r => r.data);
        if (data.step === '2fa') {
          setLoginToken(data.login_token);
          setNeedsCode(true);
          setPassword('');
          setError('');
        } else if (data.success) {
          setAuth(data.token, { ...data.staff, email: data.staff.username }, true);
          sendStoredFCMToken();
          if (data.staff?.bot_id) setSelectedBot(data.staff.bot_id);
          navigate('/dashboard');
        } else {
          setError('Login failed. Check your credentials.');
        }
      } else {
        const data = await loginApi(email, password);
        if (data.step === '2fa') {
          setLoginToken(data.login_token);
          setNeedsCode(true);
          setPassword('');
          setError('');
        } else if (data.success) {
          setAuth(data.token, data);
          sendStoredFCMToken();
          navigate('/dashboard');
        } else {
          setError('Invalid credentials');
        }
      }
    } catch (err) {
      setError(err.response?.data?.detail || err.response?.data?.message || 'Login failed. Please try again.');
      verifyingRef.current = false;
    } finally {
      setLoading(false);
    }
  };

  const tryAutoSubmit = async (codeArr) => {
    if (!needsCode || loading) return;
    setLoading(true);
    setError('');
    try {
      const codeStr = codeArr.join('');
      verifyingRef.current = true;
      const data = staffMode
        ? await client.post('/auth/staff-login/verify', { login_token: loginToken, code: codeStr }).then(r => r.data)
        : await verifyLoginCode(loginToken, codeStr);
      if (data.success) {
        setAuth(data.token, { ...data.staff, email: data.staff?.username || '' }, staffMode);
        sendStoredFCMToken();
        if (data.staff?.bot_id) setSelectedBot(data.staff.bot_id);
        navigate('/dashboard');
      } else {
        setError('Verification failed. Try again.');
      }
    } catch (err) {
      setError(err.response?.data?.detail || err.response?.data?.message || 'Verification failed. Please try again.');
      verifyingRef.current = false;
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    <style>{`
      .login-form-container,
      .login-form-container * {
        -webkit-user-select: text !important;
        user-select: text !important;
      }
    `}</style>
    <div className="min-h-[100dvh] bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-800 flex items-center justify-center p-4 pt-safe pb-safe">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
      >
        <div className="p-6 sm:p-8 md:p-10">
          <div className="flex justify-center mb-6 sm:mb-8">
            <div className="w-16 h-16 rounded-full flex items-center justify-center overflow-hidden">
              <img src="/logo.png" alt="Logo" className="w-full h-full object-cover" />
            </div>
          </div>

          <div className="text-center mb-8 sm:mb-10">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Welcome Back</h1>
            <p className="text-gray-500 mt-1 sm:mt-2 text-sm sm:text-base">
              {needsCode ? (staffMode ? 'Ask your admin to check in Telegram for 2FA codes' : 'Enter the code sent to your Telegram') : (staffMode ? 'Sign in with your staff account' : "Myanmar's First Multi-Platform E-commerce")}
            </p>
            {!needsCode && (
              <button onClick={() => { setStaffMode(!staffMode); setError(''); }}
                className="mt-3 text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center justify-center gap-1 mx-auto">
                {staffMode ? <><Mail className="w-3.5 h-3.5" /> Owner Login</> : <><User className="w-3.5 h-3.5" /> Staff Login</>}
              </button>
            )}
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="mb-6 p-4 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl flex items-center gap-3 text-sm"
            >
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6 login-form-container">
            {!needsCode ? (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 ml-1">{staffMode ? 'Username' : 'Email Address'}</label>
                  <div className="relative">
                    {staffMode ? <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" /> : <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />}
                    <input
                      data-field="email"
                      type={staffMode ? 'text' : 'email'}
                      value={staffMode ? username : email}
                      onChange={(e) => staffMode ? setUsername(e.target.value) : setEmail(e.target.value)}
                      onContextMenu={(e) => showInputMenu(e, e.currentTarget)}
                      required
                      className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none text-base"
                      placeholder={staffMode ? 'staff_username' : 'example@gmail.com'}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 ml-1">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      data-field="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onContextMenu={(e) => showInputMenu(e, e.currentTarget)}
                      required
                      className="w-full pl-12 pr-12 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none text-base"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-gray-700 ml-1">Verification Code</label>
                  <button type="button" onClick={() => { setNeedsCode(false); setCode(['', '', '', '', '', '']); setLoginToken(''); setError(''); }}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-colors">
                    ← Back
                  </button>
                </div>
                <div className="flex justify-center gap-2 sm:gap-3">
                  {code.map((digit, i) => (
                    <input
                      key={i}
                      data-field="code"
                      ref={(el) => { codeRefs.current[i] = el; }}
                      className="w-12 h-14 text-center text-xl font-bold bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      type="text"
                      inputMode="numeric"
                      value={digit}
                      onContextMenu={(e) => showInputMenu(e, e.currentTarget)}
                      onChange={(e) =>{
                        const raw = e.target.value.replace(/\D/g, '');
                        if (raw.length > 1) {
                          const next = [...code];
                          for (let j = 0; j < raw.length && j < 6; j++) next[j] = raw[j];
                          setCode(next);
                          const targetIdx = Math.min(raw.length - 1, 5);
                          codeRefs.current[targetIdx]?.focus();
                          if (next.every(d => d !== '')) tryAutoSubmit(next);
                        } else {
                          const next = [...code];
                          next[i] = raw;
                          setCode(next);
                          if (raw && i < 5) codeRefs.current[i + 1]?.focus();
                          if (raw && i === 5) tryAutoSubmit(next);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Backspace' && !code[i] && i > 0) {
                          codeRefs.current[i - 1]?.focus();
                        }
                      }}
                      onFocus={(e) => e.target.select()}
                      className="w-11 h-14 sm:w-14 sm:h-16 text-center text-xl sm:text-2xl font-bold bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                    />
                  ))}
                </div>
                {waitingApproval && code.every(d => !d) && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center justify-center gap-2 text-sm text-gray-500 mt-2"
                  >
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                    <span>{staffMode ? 'Waiting for admin approval in Telegram...' : 'Waiting for Telegram approval...'}</span>
                  </motion.div>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || (needsCode && code.join('').length < 6)}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 sm:py-4 rounded-2xl shadow-lg shadow-indigo-200 transition-all active:scale-[0.97] disabled:opacity-70 disabled:active:scale-100 flex items-center justify-center gap-2 text-base"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (needsCode ? 'Verify & Sign In' : (staffMode ? 'Staff Sign In' : 'Sign In'))}
            </button>
          </form>
        </div>

        <div className="bg-gray-50 p-6 text-center border-t border-gray-100">
          <p className="text-sm text-gray-500">
            Don't have an account? <a href="https://t.me/tg_ecommerce_official_bot?start=newbot" target="_blank" rel="noopener noreferrer" className="text-indigo-600 font-semibold hover:underline">Create Your Shop</a>
          </p>
        </div>
      </motion.div>
    </div>

    {/* Custom Input Context Menu: Cut / Copy / Paste */}
    {menuPos.show && (
      <>
        <div className="fixed inset-0 z-50" onClick={hideInputMenu} />
        <div
          className="fixed z-50 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden"
          style={{ left: Math.min(menuPos.x, window.innerWidth - 160), top: Math.min(menuPos.y, window.innerHeight - (menuPos.hasSel ? 140 : 56)) }}
        >
          {menuPos.hasSel && (
            <>
              <button onClick={execCut}
                className="flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors w-full text-left border-b border-gray-100">
                <span className="w-5 h-5 flex items-center justify-center text-xs font-bold border border-gray-300 rounded px-1">✂</span>
                Cut
              </button>
              <button onClick={execCopy}
                className="flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors w-full text-left border-b border-gray-100">
                <span className="w-5 h-5 flex items-center justify-center text-xs font-bold border border-gray-300 rounded px-0.5">📄</span>
                Copy
              </button>
            </>
          )}
          <button onClick={execPaste}
            className="flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors w-full text-left">
            <Clipboard className="w-4 h-4 text-indigo-600" />
            Paste
          </button>
        </div>
      </>
    )}
    </>
  );
}
