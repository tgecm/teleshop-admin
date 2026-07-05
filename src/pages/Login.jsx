import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import { login as loginApi, verifyLoginCode, pollLoginApproval } from '../api/auth';
import client from '../api/client';
import { useBotStore } from '../store/botStore';
import { motion } from 'motion/react';
import { Mail, Lock, Loader2, AlertCircle, Eye, EyeOff, User, ShieldCheck, Clipboard, CheckCircle2 } from 'lucide-react';
import { sendStoredFCMToken } from '../lib/pushNotifications';
import { API_BASE } from '../api/config';

export default function Login() {
  const [email, setEmail] = useState(() => localStorage.getItem('saved_email') || '');
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
  const [username, setUsername] = useState(() => localStorage.getItem('saved_username') || '');
  const [menuPos, setMenuPos] = useState({ show: false, x: 0, y: 0, hasSel: false });
  const menuTargetRef = useRef(null);
  const verifyingRef = useRef(false);
  const [waitingApproval, setWaitingApproval] = useState(false);

  // View state ('login' | 'signup' | 'forgot' | 'changepw')
  const [view, setView] = useState('login');

  // Signup flow state
  const stepsEnum = { BOT: 0, BOT_CODE: 1, EMAIL: 2, EMAIL_CODE: 3, PASSWORD: 4 };
  const [suStep, setSuStep] = useState(stepsEnum.BOT);
  const [suBotUsername, setSuBotUsername] = useState('');
  const [suBotCode, setSuBotCode] = useState('');
  const [suEmail, setSuEmail] = useState('');
  const [suCode, setSuCode] = useState('');
  const [suPw1, setSuPw1] = useState('');
  const [suPw2, setSuPw2] = useState('');

  // Forgot password flow state
  const [fpStep, setFpStep] = useState(stepsEnum.BOT);
  const [fpEmail, setFpEmail] = useState('');
  const [fpCode, setFpCode] = useState('');
  const [fpPw1, setFpPw1] = useState('');
  const [fpPw2, setFpPw2] = useState('');

  // Change password state
  const [cpStep, setCpStep] = useState(0); // 0=email, 1=code+pw
  const [cpEmail, setCpEmail] = useState('');
  const [cpCode, setCpCode] = useState('');
  const [cpNew1, setCpNew1] = useState('');
  const [cpNew2, setCpNew2] = useState('');

  // Modal alerts
  const [modalAlerts, setModalAlerts] = useState({});
  const [modalLoading, setModalLoading] = useState({});

  // Timer for resend codes
  const [timer, setTimer] = useState({ remaining: 0, show: false });
  const [cooldowns, setCooldowns] = useState({ bot: 0, email: 0 });
  const timerRef = useRef(null);
  const cdRefs = useRef({});
  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); Object.values(cdRefs.current).forEach(clearInterval); }, []);

  const startCooldown = (key, seconds) => {
    if (cdRefs.current[key]) clearInterval(cdRefs.current[key]);
    setCooldowns(prev => ({ ...prev, [key]: seconds }));
    cdRefs.current[key] = setInterval(() => {
      setCooldowns(prev => {
        const next = prev[key] - 1;
        if (next <= 0) {
          clearInterval(cdRefs.current[key]);
          delete cdRefs.current[key];
          return { ...prev, [key]: 0 };
        }
        return { ...prev, [key]: next };
      });
    }, 1000);
  };

  const showAlert = (viewId, msg, type) => {
    setModalAlerts(prev => ({ ...prev, [viewId]: { msg, type } }));
  };
  const clearAlert = (viewId) => {
    setModalAlerts(prev => ({ ...prev, [viewId]: null }));
  };
  const setLoadingModal = (key, val) => {
    setModalLoading(prev => ({ ...prev, [key]: val }));
  };

  const startTimer = (seconds) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimer({ remaining: seconds, show: true });
    timerRef.current = setInterval(() => {
      setTimer(prev => {
        if (prev.remaining <= 1) {
          clearInterval(timerRef.current);
          timerRef.current = null;
          return { remaining: 0, show: false };
        }
        return { ...prev, remaining: prev.remaining - 1 };
      });
    }, 1000);
  };

  const steps = stepsEnum;

  const cleanBotUsername = (raw) => {
    let u = (raw || '').trim();
    u = u.replace(/^https?:\/\/(www\.)?t\.me\//, '');
    u = u.replace(/^t\.me\//, '');
    u = u.replace(/^@/, '');
    u = u.split('/')[0].split('?')[0];
    return u;
  };

  const isValidEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const apiPost = async (path, body) => {
    const res = await fetch(API_BASE + '/api/webpanel' + path, {
      method: 'POST', mode: 'cors', credentials: 'omit',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) { const err = new Error(data.message || data.detail || 'Request failed'); err.data = data; throw err; }
    return data;
  };

  const pwScore = (val) => { let s = 0; if (val.length >= 8) s++; if (val.length >= 12) s++; if (/[A-Z]/.test(val) && /[0-9]/.test(val)) s++; if (/[^A-Za-z0-9]/.test(val)) s++; return s; };
  const pwColors = ['#f87171', '#fb923c', '#facc15', '#4ade80'];
  const pwHints = ['Too short', 'Weak', 'Fair', 'Strong', 'Very strong'];

  /* =========== SIGNUP FUNCTIONS =========== */

  const suSendBotCode = async () => {
    const cleaned = cleanBotUsername(suBotUsername);
    if (!cleaned) return showAlert('signup', 'Please enter a valid bot username.', 'error');
    setLoadingModal('suBotSend', true);
    clearAlert('signup');
    try {
      await apiPost('/send-bot-code', { bot_username: cleaned });
      setSuBotUsername(cleaned);
      setSuStep(steps.BOT_CODE);
      startCooldown('bot', 30);
      startTimer(60);
    } catch (e) {
      showAlert('signup', e.message || 'Failed to send code to bot owner.', 'error');
    }
    setLoadingModal('suBotSend', false);
  };

  const suVerifyBotCode = async () => {
    if (suBotCode.length !== 6) return showAlert('signup2', 'Enter the 6-digit code from Telegram.', 'error');
    clearAlert('signup2');
    try {
      await apiPost('/verify-bot-code', { bot_username: suBotUsername, code: suBotCode });
      setSuStep(steps.EMAIL);
    } catch (e) {
      showAlert('signup2', e.message || 'Incorrect code.', 'error');
    }
  };

  const suSendEmailCode = async () => {
    if (!isValidEmail(suEmail)) return showAlert('signup3', 'Please enter a valid email address.', 'error');
    setLoadingModal('suSend', true);
    clearAlert('signup3');
    try {
      await apiPost('/send-code', { email: suEmail, flow: 'signup', bot_username: suBotUsername });
      setSuStep(steps.EMAIL_CODE);
      startCooldown('email', 30);
      startTimer(60);
    } catch (e) {
      showAlert('signup3', e.message || 'Failed to send code. Try again.', 'error');
    }
    setLoadingModal('suSend', false);
  };

  const suResendEmailCode = async () => {
    clearAlert('signup4');
    try {
      await apiPost('/send-code', { email: suEmail, flow: 'signup', bot_username: suBotUsername });
      startTimer(60);
    } catch (e) { showAlert('signup4', 'Failed to resend. Try again.', 'error'); }
  };

  const suVerifyEmailCode = async () => {
    if (suCode.length !== 6) return showAlert('signup4', 'Enter the 6-digit code.', 'error');
    clearAlert('signup4');
    try {
      await apiPost('/verify-code', { email: suEmail, code: suCode, flow: 'signup' });
      setSuStep(steps.PASSWORD);
    } catch (e) {
      showAlert('signup4', e.message || 'Incorrect code.', 'error');
    }
  };

  const suSetPassword = async () => {
    clearAlert('signup5');
    if (suPw1.length < 8) return showAlert('signup5', 'Password must be at least 8 characters.', 'error');
    if (!/[A-Z]/.test(suPw1)) return showAlert('signup5', 'Password must contain at least one uppercase letter.', 'error');
    if (!/[0-9]/.test(suPw1)) return showAlert('signup5', 'Password must contain at least one number.', 'error');
    if (suPw1 !== suPw2) return showAlert('signup5', 'Passwords do not match.', 'error');
    try {
      const res = await apiPost('/signup', { email: suEmail, password: suPw1, bot_username: suBotUsername });
      if (res.ok) {
        showAlert('signup5', 'Account created! You can now sign in.', 'success');
        setTimeout(() => setView('login'), 1500);
      } else {
        showAlert('signup5', res.message || 'Failed to create account.', 'error');
      }
    } catch (e) {
      showAlert('signup5', e.message || 'Network error.', 'error');
    }
  };

  const resetSignup = () => {
    setSuStep(steps.BOT); setSuBotUsername(''); setSuBotCode(''); setSuEmail(''); setSuCode(''); setSuPw1(''); setSuPw2('');
    clearAlert('signup'); clearAlert('signup2'); clearAlert('signup3'); clearAlert('signup4'); clearAlert('signup5');
  };

  /* =========== CHANGE PASSWORD FUNCTIONS =========== */

  const cpSendCode = async () => {
    if (!isValidEmail(cpEmail)) return showAlert('changepw', 'Enter a valid email address.', 'error');
    setLoadingModal('cpSend', true);
    clearAlert('changepw');
    try {
      await apiPost('/send-code', { email: cpEmail, flow: 'changepw' });
      setCpStep(1);
      startCooldown('cpSend', 30);
    } catch (e) {
      showAlert('changepw', e.message || 'mail not found', 'error');
    }
    setLoadingModal('cpSend', false);
  };

  const doChangePw = async () => {
    clearAlert('changepw2');
    if (cpCode.length !== 6) return showAlert('changepw2', 'Enter the 6-digit code.', 'error');
    if (cpNew1.length < 8) return showAlert('changepw2', 'New password must be at least 8 characters.', 'error');
    if (!/[A-Z]/.test(cpNew1)) return showAlert('changepw2', 'New password must contain at least one uppercase letter.', 'error');
    if (!/[0-9]/.test(cpNew1)) return showAlert('changepw2', 'New password must contain at least one number.', 'error');
    if (cpNew1 !== cpNew2) return showAlert('changepw2', 'New passwords do not match.', 'error');
    setLoadingModal('cpSave', true);
    try {
      await apiPost('/change-password', { email: cpEmail, code: cpCode, new_password: cpNew1 });
      showAlert('changepw2', 'Password changed successfully!', 'success');
      setTimeout(() => setView('login'), 1500);
    } catch (e) {
      showAlert('changepw2', e.message || 'Failed to change password.', 'error');
    }
    setLoadingModal('cpSave', false);
  };

  /* =========== FORGOT PASSWORD FUNCTIONS =========== */

  const fpSendCode = async () => {
    if (!isValidEmail(fpEmail)) return showAlert('forgot', 'Enter a valid email address.', 'error');
    clearAlert('forgot');
    try {
      await apiPost('/send-code', { email: fpEmail, flow: 'forgot' });
      setFpStep(steps.BOT_CODE);
      startTimer(60);
    } catch (err) {
      showAlert('forgot', err.message || 'Could not send reset code.', 'error');
    }
  };

  const fpResend = async () => {
    clearAlert('forgot2');
    try {
      await apiPost('/send-code', { email: fpEmail, flow: 'forgot' });
      startTimer(60);
    } catch (e) { }
  };

  const fpResetPw = async () => {
    clearAlert('forgot2');
    if (fpCode.length !== 6) return showAlert('forgot2', 'Enter the 6-digit code.', 'error');
    if (fpPw1.length < 8) return showAlert('forgot2', 'Password must be at least 8 characters.', 'error');
    if (!/[A-Z]/.test(fpPw1)) return showAlert('forgot2', 'Password must contain at least one uppercase letter.', 'error');
    if (!/[0-9]/.test(fpPw1)) return showAlert('forgot2', 'Password must contain at least one number.', 'error');
    if (fpPw1 !== fpPw2) return showAlert('forgot2', 'Passwords do not match.', 'error');
    try {
      await apiPost('/reset-password', { email: fpEmail, code: fpCode, new_password: fpPw1 });
      showAlert('forgot2', 'Password reset successfully! You can now sign in.', 'success');
      setTimeout(() => setView('login'), 1500);
    } catch (e) {
      showAlert('forgot2', e.message || 'Reset failed. Check the code.', 'error');
    }
  };

  /* =========== MODAL ALERT HELPER =========== */

  const modalAlertEl = (id) => {
    const a = modalAlerts[id];
    if (!a) return null;
    return <div className={`alert ${a.type}`}>{a.msg}</div>;
  };

  const stepDot = (active, done) => {
    if (done) return 'step-dot done';
    if (active) return 'step-dot active';
    return 'step-dot';
  };

  const eyeBtn = (id) => (
    <button type="button" className="eye-btn" tabIndex={-1}
      onClick={() => { const el = document.getElementById(id); if (el) el.type = el.type === 'password' ? 'text' : 'password'; }}>
      👁
    </button>
  );

  const openSignup = () => { resetSignup(); setView('signup'); };
  const openForgotPw = () => { setFpStep(steps.BOT); setFpEmail(''); clearAlert('forgot'); setView('forgot'); };
  const openChangePw = () => { setCpStep(0); setCpEmail(''); setCpCode(''); setCpNew1(''); setCpNew2(''); clearAlert('changepw'); clearAlert('changepw2'); setView('changepw'); };

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

  const saveCredentials = () => {
    try {
      if (staffMode) {
        localStorage.setItem('saved_username', username);
      } else {
        localStorage.setItem('saved_email', email);
      }
    } catch {}
  };


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
            saveCredentials();
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
            saveCredentials();
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
          saveCredentials();
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
          saveCredentials();
          navigate('/dashboard');
        } else {
          setError('Invalid credentials');
        }
      }
    } catch (err) {
      setError(err.response?.data?.detail || err.response?.data?.message || 'Login failed. Please try connecting VPN.');
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
      .wp-modals {
        --wp-surface: #fff;
        --wp-card: #fff;
        --wp-border: #e8ecf1;
        --wp-accent: #4f6ef7;
        --wp-accent-light: rgba(79,110,247,0.08);
        --wp-accent2: #825ee4;
        --wp-text: #1a1d26;
        --wp-muted: #888e9e;
        --wp-success: #22c55e;
        --wp-error: #ef4444;
        --wp-warn: #f59e0b;
        --wp-shadow-lg: 0 12px 48px rgba(0,0,0,0.08);
      }
      .wp-modals .wp-card-title { font-size: 19px; font-weight: 700; margin-bottom: 4px; color: var(--wp-text); }
      .wp-modals .wp-card-sub { font-size: 13.5px; color: var(--wp-muted); margin-bottom: 24px; line-height: 1.6; }
      .wp-modals .wp-field { margin-bottom: 18px; }
      .wp-modals .wp-field label { display: block; font-size: 12.5px; font-weight: 600; color: var(--wp-text); margin-bottom: 7px; letter-spacing: 0.2px; }
      .wp-modals .wp-input-wrap { position: relative; }
      .wp-modals .wp-input-wrap input { width: 100%; background: var(--wp-surface); border: 1.5px solid var(--wp-border); border-radius: 12px; padding: 12px 44px 12px 16px; color: var(--wp-text); font-size: 14px; outline: none; transition: all 0.2s ease; box-sizing: border-box; }
      .wp-modals .wp-input-wrap input:focus { border-color: var(--wp-accent); box-shadow: 0 0 0 4px var(--wp-accent-light); }
      .wp-modals .wp-input-wrap input::placeholder { color: #b0b6c4; }
      .wp-modals .eye-btn { position: absolute; right: 13px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: var(--wp-muted); font-size: 17px; padding: 4px; line-height: 1; border-radius: 6px; transition: all 0.15s; }
      .wp-modals .eye-btn:hover { background: var(--wp-accent-light); color: var(--wp-accent); }
      .wp-modals .wp-pw-hint { font-size: 11.5px; color: var(--wp-muted); margin-top: 6px; }
      .wp-modals .wp-strength-bar { display: flex; gap: 5px; margin-top: 10px; }
      .wp-modals .wp-strength-seg { height: 4px; flex: 1; border-radius: 4px; background: #eef0f4; transition: background 0.3s; }
      .wp-modals .wp-code-row { display: flex; gap: 10px; align-items: stretch; }
      .wp-modals .wp-code-row input { flex: 1; letter-spacing: 4px; text-align: center; font-size: 22px; font-weight: 700; padding: 12px 8px; font-variant-numeric: tabular-nums; }
      .wp-modals .wp-send-code-btn { padding: 12px 16px; border: none; border-radius: 12px; background: var(--wp-accent-light); color: var(--wp-accent); font-size: 12px; font-weight: 600; cursor: pointer; white-space: nowrap; min-width: 92px; transition: all 0.2s ease; border: 1px solid transparent; }
      .wp-modals .wp-send-code-btn:hover:not(:disabled) { background: rgba(79,110,247,0.15); }
      .wp-modals .wp-send-code-btn:disabled { opacity: 0.5; cursor: not-allowed; }
      .wp-modals .wp-btn-primary { width: 100%; padding: 14px; background: linear-gradient(135deg, var(--wp-accent), var(--wp-accent2)); border: none; border-radius: 12px; color: #fff; font-size: 15px; font-weight: 600; cursor: pointer; margin-top: 10px; letter-spacing: 0.2px; transition: all 0.2s ease; box-shadow: 0 4px 16px rgba(79,110,247,0.3); }
      .wp-modals .wp-btn-primary:hover { transform: translateY(-2px); box-shadow: 0 6px 24px rgba(79,110,247,0.4); }
      .wp-modals .wp-btn-primary:active { transform: translateY(0); box-shadow: 0 2px 8px rgba(79,110,247,0.3); }
      .wp-modals .wp-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; transform: none; box-shadow: none; }
      .wp-modals .wp-btn-primary .spinner { display: inline-block; width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.35); border-top-color: #fff; border-radius: 50%; animation: wpSpin 0.6s linear infinite; vertical-align: middle; margin-right: 8px; }
      @keyframes wpSpin { to { transform: rotate(360deg); } }
      .wp-modals .alert { border-radius: 12px; padding: 12px 16px; font-size: 13px; margin-bottom: 18px; line-height: 1.5; display: flex; align-items: center; gap: 8px; }
      .wp-modals .alert.success { background: #ecfdf5; border: 1px solid #bbf7d0; color: #15803d; }
      .wp-modals .alert.error { background: #fef2f2; border: 1px solid #fecaca; color: #dc2626; }
      .wp-modals .wp-link-btn { background: none; border: none; color: var(--wp-accent); font-size: 13px; cursor: pointer; font-weight: 500; padding: 4px 0; transition: all 0.15s; }
      .wp-modals .wp-link-btn:hover { color: var(--wp-accent2); opacity: 0.8; }
      .wp-modals .wp-steps { display: flex; align-items: center; justify-content: center; gap: 8px; margin: 20px 0 0; }
      .wp-modals .step-dot { width: 8px; height: 8px; border-radius: 50%; background: #dce0e8; transition: all 0.3s cubic-bezier(0.34,1.56,0.64,1); }
      .wp-modals .step-dot.done { background: var(--wp-success); transform: scale(1.1); }
      .wp-modals .step-dot.active { background: var(--wp-accent); width: 28px; border-radius: 4px; }
      .wp-modals .wp-timer { font-size: 12px; color: var(--wp-warn); margin-top: 8px; font-weight: 500; }
      .wp-modals .wp-divider { margin: 22px 0; display: flex; align-items: center; gap: 14px; color: var(--wp-muted); font-size: 12px; }
      .wp-modals .wp-divider-line { flex: 1; height: 1px; background: var(--wp-border); }
      @keyframes wpFadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
    `}</style>
    <div className="min-h-[100dvh] bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-800 flex items-center justify-center p-4 pt-safe pb-safe">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
      >
        <div className="p-5 sm:p-6 md:p-8">
          <div className="flex justify-center mb-4 sm:mb-5">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center overflow-hidden">
              <img src="/logo.png" alt="Logo" className="w-full h-full object-cover" />
            </div>
          </div>

          {view === 'login' && (
            <>
          <div className="text-center mb-6 sm:mb-7">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Welcome Back</h1>
            <p className="text-gray-500 mt-1 text-sm sm:text-base">
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

          <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6 login-form-container">
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
                      className="w-full pl-12 pr-4 py-3 sm:py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none text-sm sm:text-base"
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
                      className="w-full pl-12 pr-12 py-3 sm:py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none text-sm sm:text-base"
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

            <div className="flex gap-2">
              {!needsCode && !staffMode && (
              <button type="button" onClick={openSignup}
                className="flex-1 py-2.5 bg-white text-indigo-600 font-semibold rounded-xl border border-indigo-200 hover:bg-indigo-50 transition-all active:scale-[0.97] text-sm">
                Sign Up
              </button>
              )}
              <button
                type="submit"
                disabled={loading || (needsCode && code.join('').length < 6)}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-xl shadow-sm transition-all active:scale-[0.97] disabled:opacity-70 disabled:active:scale-100 flex items-center justify-center gap-2 text-sm"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (needsCode ? 'Verify & Sign In' : (staffMode ? 'Staff Sign In' : 'Sign In'))}
              </button>
            </div>
          </form>
            </>
          )}

          {view !== 'login' && (
            <div className="wp-modals">
              <button onClick={() => setView('login')} className="wp-link-btn">&larr; Back to Sign In</button>

              {view === 'signup' && (
                <div>
                  {suStep === steps.BOT && (
                    <div>
                      <div className="wp-card-title">Create Account</div>
                      <div className="wp-card-sub">Enter your bot username to get started</div>
                      <div className="wp-field">
                        <label>Bot Username</label>
                        <div className="wp-input-wrap">
                          <input value={suBotUsername} onChange={e => setSuBotUsername(e.target.value)} placeholder="@your_bot" />
                        </div>
                      </div>
                      {modalAlertEl('signup')}
                      <button className="wp-btn-primary" onClick={suSendBotCode} disabled={modalLoading['suBotSend'] || cooldowns.bot > 0}>
                        {modalLoading['suBotSend'] && <span className="spinner" />}{cooldowns.bot > 0 ? `Resend in ${cooldowns.bot}s` : 'Send Code'}
                      </button>
                    </div>
                  )}
                  {suStep === steps.BOT_CODE && (
                    <div>
                      <div className="wp-card-title">Check Telegram</div>
                      <div className="wp-card-sub">A 6-digit code was sent to the bot owner via Telegram</div>
                      <div className="wp-field">
                        <label>6-Digit Code</label>
                        <div className="wp-code-row">
                          <input value={suBotCode} onChange={e => setSuBotCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" />
                        </div>
                      </div>
                      {modalAlertEl('signup2')}
                      <button className="wp-btn-primary" onClick={suVerifyBotCode}>Verify Code</button>
                    </div>
                  )}
                  {suStep === steps.EMAIL && (
                    <div>
                      <div className="wp-card-title">Email Address</div>
                      <div className="wp-card-sub">Enter your email for verification</div>
                      <div className="wp-field">
                        <label>Email</label>
                        <div className="wp-input-wrap">
                          <input type="email" value={suEmail} onChange={e => setSuEmail(e.target.value)} placeholder="example@gmail.com" />
                        </div>
                      </div>
                      {modalAlertEl('signup3')}
                      <button className="wp-btn-primary" onClick={suSendEmailCode} disabled={modalLoading['suSend'] || cooldowns.email > 0}>
                        {modalLoading['suSend'] && <span className="spinner" />}{cooldowns.email > 0 ? `Resend in ${cooldowns.email}s` : 'Send Code'}
                      </button>
                    </div>
                  )}
                  {suStep === steps.EMAIL_CODE && (
                    <div>
                      <div className="wp-card-title">Check Email</div>
                      <div className="wp-card-sub">A 6-digit code was sent to {suEmail}</div>
                      <div className="wp-field">
                        <label>6-Digit Code</label>
                        <div className="wp-code-row">
                          <input value={suCode} onChange={e => setSuCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" />
                        </div>
                      </div>
                      {timer.show && <div className="wp-timer">Resend in {timer.remaining}s</div>}
                      {!timer.show && <button className="wp-link-btn" onClick={suResendEmailCode}>Resend code</button>}
                      {modalAlertEl('signup4')}
                      <button className="wp-btn-primary" onClick={suVerifyEmailCode}>Verify Code</button>
                    </div>
                  )}
                  {suStep === steps.PASSWORD && (
                    <div>
                      <div className="wp-card-title">Set Password</div>
                      <div className="wp-card-sub">Choose a strong password for your account</div>
                      <div className="wp-field">
                        <label>Password</label>
                        <div className="wp-input-wrap">
                          <input type="password" id="suPw1" value={suPw1} onChange={e => setSuPw1(e.target.value)} placeholder="At least 8 characters" />
                          {eyeBtn('suPw1')}
                        </div>
                        {suPw1.length > 0 && (
                          <>
                            <div className="wp-strength-bar">
                              {[0,1,2,3].map(i => <div key={i} className="wp-strength-seg" style={{background: i < pwScore(suPw1) ? pwColors[pwScore(suPw1)-1] : '#eef0f4'}} />)}
                            </div>
                            <div className="wp-pw-hint">{pwHints[pwScore(suPw1)]}</div>
                          </>
                        )}
                      </div>
                      <div className="wp-field">
                        <label>Confirm Password</label>
                        <div className="wp-input-wrap">
                          <input type="password" id="suPw2" value={suPw2} onChange={e => setSuPw2(e.target.value)} placeholder="Re-enter password" />
                          {eyeBtn('suPw2')}
                        </div>
                      </div>
                      {modalAlertEl('signup5')}
                      <button className="wp-btn-primary" onClick={suSetPassword}>Create Account</button>
                    </div>
                  )}
                  <div className="wp-steps">
                    {[0,1,2,3,4].map(i => <div key={i} className={stepDot(suStep === i, suStep > i)} />)}
                  </div>
                </div>
              )}

              {view === 'forgot' && (
                <div>
                  {fpStep === steps.BOT && (
                    <div>
                      <div className="wp-card-title">Reset Password</div>
                      <div className="wp-card-sub">Enter your email to receive a reset code</div>
                      <div className="wp-field">
                        <label>Email</label>
                        <div className="wp-input-wrap">
                          <input type="email" value={fpEmail} onChange={e => setFpEmail(e.target.value)} placeholder="example@gmail.com" />
                        </div>
                      </div>
                      {modalAlertEl('forgot')}
                      <button className="wp-btn-primary" onClick={fpSendCode}>Send Reset Code</button>
                    </div>
                  )}
                  {fpStep === steps.BOT_CODE && (
                    <div>
                      <div className="wp-card-title">Check Email</div>
                      <div className="wp-card-sub">Enter the code sent to {fpEmail} and set a new password</div>
                      <div className="wp-field">
                        <label>6-Digit Code</label>
                        <div className="wp-code-row">
                          <input value={fpCode} onChange={e => setFpCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" />
                        </div>
                      </div>
                      {timer.show && <div className="wp-timer">Resend in {timer.remaining}s</div>}
                      {!timer.show && <button className="wp-link-btn" onClick={fpResend}>Resend code</button>}
                      <div className="wp-field">
                        <label>New Password</label>
                        <div className="wp-input-wrap">
                          <input type="password" id="fpPw1" value={fpPw1} onChange={e => setFpPw1(e.target.value)} placeholder="At least 8 characters" />
                          {eyeBtn('fpPw1')}
                        </div>
                        {fpPw1.length > 0 && (
                          <>
                            <div className="wp-strength-bar">
                              {[0,1,2,3].map(i => <div key={i} className="wp-strength-seg" style={{background: i < pwScore(fpPw1) ? pwColors[pwScore(fpPw1)-1] : '#eef0f4'}} />)}
                            </div>
                            <div className="wp-pw-hint">{pwHints[pwScore(fpPw1)]}</div>
                          </>
                        )}
                      </div>
                      <div className="wp-field">
                        <label>Confirm New Password</label>
                        <div className="wp-input-wrap">
                          <input type="password" id="fpPw2" value={fpPw2} onChange={e => setFpPw2(e.target.value)} placeholder="Re-enter password" />
                          {eyeBtn('fpPw2')}
                        </div>
                      </div>
                      {modalAlertEl('forgot2')}
                      <button className="wp-btn-primary" onClick={fpResetPw}>Reset Password</button>
                    </div>
                  )}
                </div>
              )}

              {view === 'changepw' && (
                <div>
                  {cpStep === 0 && (
                    <div>
                      <div className="wp-card-title">Change Password</div>
                      <div className="wp-card-sub">Enter your email to receive a verification code</div>
                      <div className="wp-field">
                        <label>Email</label>
                        <div className="wp-input-wrap">
                          <input type="email" value={cpEmail} onChange={e => setCpEmail(e.target.value)} placeholder="example@gmail.com" />
                        </div>
                      </div>
                      {modalAlertEl('changepw')}
                      <button className="wp-btn-primary" onClick={cpSendCode} disabled={modalLoading['cpSend'] || cooldowns.cpSend > 0}>
                        {modalLoading['cpSend'] && <span className="spinner" />}{cooldowns.cpSend > 0 ? `Resend in ${cooldowns.cpSend}s` : 'Send Code'}
                      </button>
                    </div>
                  )}
                  {cpStep === 1 && (
                    <div>
                      <div className="wp-card-title">Check Email</div>
                      <div className="wp-card-sub">Enter the code sent to {cpEmail} and set a new password</div>
                      <div className="wp-field">
                        <label>6-Digit Code</label>
                        <div className="wp-code-row">
                          <input value={cpCode} onChange={e => setCpCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" />
                        </div>
                      </div>
                      <div className="wp-field">
                        <label>New Password</label>
                        <div className="wp-input-wrap">
                          <input type="password" id="cpNew1" value={cpNew1} onChange={e => setCpNew1(e.target.value)} placeholder="At least 8 characters" />
                          {eyeBtn('cpNew1')}
                        </div>
                        {cpNew1.length > 0 && (
                          <>
                            <div className="wp-strength-bar">
                              {[0,1,2,3].map(i => <div key={i} className="wp-strength-seg" style={{background: i < pwScore(cpNew1) ? pwColors[pwScore(cpNew1)-1] : '#eef0f4'}} />)}
                            </div>
                            <div className="wp-pw-hint">{pwHints[pwScore(cpNew1)]}</div>
                          </>
                        )}
                      </div>
                      <div className="wp-field">
                        <label>Confirm New Password</label>
                        <div className="wp-input-wrap">
                          <input type="password" id="cpNew2" value={cpNew2} onChange={e => setCpNew2(e.target.value)} placeholder="Re-enter new password" />
                          {eyeBtn('cpNew2')}
                        </div>
                      </div>
                      {modalAlertEl('changepw2')}
                      <button className="wp-btn-primary" onClick={doChangePw} disabled={modalLoading['cpSave']}>
                        {modalLoading['cpSave'] && <span className="spinner" />}Change Password
                      </button>
                      <button className="wp-link-btn" onClick={() => setCpStep(0)} style={{marginTop: 8}}>&larr; Back to email</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

        </div>

        <div className="bg-gray-50 p-5 text-center border-t border-gray-100 space-y-3">
          {view === 'login' && staffMode && (
            <button onClick={() => { setStaffMode(false); setError(''); }}
              className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-all active:scale-[0.97] text-sm">
              &larr; Back to Owner Login
            </button>
          )}
          {view === 'login' && !needsCode && !staffMode && (
            <div className="flex items-center justify-center gap-4 text-xs">
              <button onClick={openForgotPw} className="text-indigo-600 font-semibold hover:underline">Forgot Password?</button>
            </div>
          )}
          {view === 'signup' && suStep === steps.BOT && (
          <p className="text-sm text-gray-500">
            Don't have an account? <a href="https://t.me/tg_ecommerce_official_bot?start=newbot" target="_blank" rel="noopener noreferrer" className="text-indigo-600 font-semibold hover:underline">Get Here</a>
          </p>
          )}
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
