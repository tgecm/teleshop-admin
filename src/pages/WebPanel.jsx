import { useState, useEffect, useRef } from 'react';

const API_BASE = 'https://api.telegramecommerce.shop/api/webpanel';

const views = { SIGNUP: 'signup', CHANGEPW: 'changepw', FORGOT: 'forgot', SUCCESS: 'success' };
const steps = { BOT: 0, BOT_CODE: 1, EMAIL: 2, EMAIL_CODE: 3, PASSWORD: 4 };

export default function WebPanel() {
  const [view, setView] = useState(null);
  const [email, setEmail] = useState('');

  // Sign up form
  const [suStep, setSuStep] = useState(steps.BOT);
  const [suBotUsername, setSuBotUsername] = useState('');
  const [suBotCode, setSuBotCode] = useState('');
  const [suEmail, setSuEmail] = useState('');
  const [suCode, setSuCode] = useState('');
  const [suPw1, setSuPw1] = useState('');
  const [suPw2, setSuPw2] = useState('');

  // Forgot pw form
  const [fpStep, setFpStep] = useState(steps.BOT);
  const [fpEmail, setFpEmail] = useState('');
  const [fpCode, setFpCode] = useState('');
  const [fpPw1, setFpPw1] = useState('');
  const [fpPw2, setFpPw2] = useState('');

  // Change pw form
  const [cpEmail, setCpEmail] = useState('');
  const [cpOld, setCpOld] = useState('');
  const [cpNew1, setCpNew1] = useState('');
  const [cpNew2, setCpNew2] = useState('');

  // Alerts per view
  const [alerts, setAlerts] = useState({});
  const [loading, setLoading] = useState({});

  // Timer
  const [timer, setTimer] = useState({ remaining: 0, show: false });
  const timerRef = useRef(null);

  // Success view
  const [successData, setSuccessData] = useState({ icon: '✅', title: 'Done!', msg: '' });
  const successCbRef = useRef(null);

  const showAlert = (viewId, msg, type) => {
    setAlerts(prev => ({ ...prev, [viewId]: { msg, type } }));
  };
  const clearAlert = (viewId) => {
    setAlerts(prev => ({ ...prev, [viewId]: null }));
  };
  const setLoading_ = (key, val) => {
    setLoading(prev => ({ ...prev, [key]: val }));
  };

  // Timer helper
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
  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  // API helper
  const apiPost = async (path, body) => {
    const res = await fetch(API_BASE + path, {
      method: 'POST',
      mode: 'cors',
      credentials: 'omit',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) {
      const err = new Error(data.message || data.detail || 'Request failed');
      err.data = data;
      throw err;
    }
    return data;
  };

  // Init: show signup view
  useEffect(() => {
    setView(views.SIGNUP);
  }, []);

  // ─── Utility: clean bot username ──────────────────────────
  const cleanBotUsername = (raw) => {
    let u = raw.trim();
    u = u.replace(/^https?:\/\/(www\.)?t\.me\//, '');
    u = u.replace(/^t\.me\//, '');
    u = u.replace(/^@/, '');
    u = u.split('/')[0].split('?')[0];
    return u;
  };

  // ─── Sign Up ──────────────────────────────────────────────
  const isValidEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const suSendBotCode = async () => {
    const cleaned = cleanBotUsername(suBotUsername);
    if (!cleaned) return showAlert('signup', 'Please enter a valid bot username.', 'error');
    setLoading_('suBotSend', true);
    clearAlert('signup');
    try {
      await apiPost('/send-bot-code', { bot_username: cleaned });
      setSuBotUsername(cleaned);
      setSuStep(steps.BOT_CODE);
      startTimer(60);
    } catch (e) {
      showAlert('signup', e.message || 'Failed to send code to bot owner.', 'error');
    }
    setLoading_('suBotSend', false);
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
    setLoading_('suSend', true);
    clearAlert('signup3');
    try {
      await apiPost('/send-code', { email: suEmail, flow: 'signup', bot_username: suBotUsername });
      setSuStep(steps.EMAIL_CODE);
      startTimer(60);
    } catch (e) {
      showAlert('signup3', e.message || 'Failed to send code. Try again.', 'error');
    }
    setLoading_('suSend', false);
  };

  const suResendEmailCode = async () => {
    clearAlert('signup4');
    try {
      await apiPost('/send-code', { email: suEmail, flow: 'signup', bot_username: suBotUsername });
      startTimer(60);
    } catch (e) {
      showAlert('signup4', 'Failed to resend. Try again.', 'error');
    }
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
    if (suPw1.length < 6) return showAlert('signup5', 'Password must be at least 6 characters.', 'error');
    if (suPw1 !== suPw2) return showAlert('signup5', 'Passwords do not match.', 'error');
    try {
      const res = await apiPost('/signup', { email: suEmail, password: suPw1, bot_username: suBotUsername });
      if (res.ok) {
        showSuccessView('🎉', 'Account Created!', `Your web panel is ready. Log in with ${suEmail}.`, () => { resetSignup(); setView(views.SIGNUP); });
      } else {
        showAlert('signup5', res.message || 'Failed to create account.', 'error');
      }
    } catch (e) {
      showAlert('signup5', e.message || 'Network error.', 'error');
    }
  };

  const resetSignup = () => {
    setSuStep(steps.BOT);
    setSuBotUsername('');
    setSuBotCode('');
    setSuEmail('');
    setSuCode('');
    setSuPw1('');
    setSuPw2('');
    clearAlert('signup');
    clearAlert('signup2');
    clearAlert('signup3');
    clearAlert('signup4');
    clearAlert('signup5');
  };

  // ─── Change Password ──────────────────────────────────────
  const doChangePw = async () => {
    clearAlert('changepw');
    if (!cpEmail) return showAlert('changepw', 'Enter your email address.', 'error');
    if (!cpOld) return showAlert('changepw', 'Enter your current password.', 'error');
    if (cpNew1.length < 6) return showAlert('changepw', 'New password must be at least 6 characters.', 'error');
    if (cpNew1 !== cpNew2) return showAlert('changepw', 'New passwords do not match.', 'error');
    try {
      await apiPost('/change-password', { email: cpEmail, old_password: cpOld, new_password: cpNew1 });
      showSuccessView('🔑', 'Password Changed', 'Your password has been updated successfully.', () => setView(views.SIGNUP));
    } catch (e) {
      showAlert('changepw', e.message || 'Current password is incorrect.', 'error');
    }
  };

  // ─── Forgot Password ──────────────────────────────────────
  const fpSendCode = async () => {
    const e = document.getElementById('fp-email')?.value || fpEmail;
    if (!isValidEmail(e)) return showAlert('forgot', 'Enter a valid email address.', 'error');
    clearAlert('forgot');
    setFpEmail(e);
    try {
      await apiPost('/send-code', { email: e, flow: 'forgot' });
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
    } catch (e) { /* ignore */ }
  };

  const fpResetPw = async () => {
    clearAlert('forgot2');
    if (fpCode.length !== 6) return showAlert('forgot2', 'Enter the 6-digit code.', 'error');
    if (fpPw1.length < 6) return showAlert('forgot2', 'Password must be at least 6 characters.', 'error');
    if (fpPw1 !== fpPw2) return showAlert('forgot2', 'Passwords do not match.', 'error');
    try {
      await apiPost('/reset-password', { email: fpEmail, code: fpCode, new_password: fpPw1 });
      showSuccessView('✅', 'Password Reset', 'Your password has been reset. You can now log in.', () => setView(views.SIGNUP));
    } catch (e) {
      showAlert('forgot2', e.message || 'Reset failed. Check the code.', 'error');
    }
  };

  const showSuccessView = (icon, title, msg, cb) => {
    setSuccessData({ icon, title, msg });
    successCbRef.current = cb;
    setView(views.SUCCESS);
  };

  const successBack = () => {
    if (successCbRef.current) successCbRef.current();
    else setView(views.SIGNUP);
  };

  // Password strength
  const pwScore = (val) => {
    let s = 0;
    if (val.length >= 6) s++;
    if (val.length >= 10) s++;
    if (/[A-Z]/.test(val) && /[0-9]/.test(val)) s++;
    if (/[^A-Za-z0-9]/.test(val)) s++;
    return s;
  };
  const pwColors = ['#f87171', '#fb923c', '#facc15', '#4ade80'];
  const pwHints = ['Too short', 'Weak', 'Fair', 'Strong', 'Very strong'];

  const alertEl = (id) => {
    const a = alerts[id];
    if (!a) return null;
    return <div className={`alert ${a.type}`}>{a.msg}</div>;
  };

  const dot = (active, done) => {
    if (done) return 'step-dot done';
    if (active) return 'step-dot active';
    return 'step-dot';
  };

  const eyeBtn = (id) => (
    <button
      type="button"
      className="eye-btn"
      tabIndex={-1}
      onClick={() => {
        const el = document.getElementById(id);
        if (el) el.type = el.type === 'password' ? 'text' : 'password';
      }}
    >
      👁
    </button>
  );

  if (view === null) return null;

  return (
    <div className="wp-wrapper">
      <style>{`
        :root {
          --wp-bg: #f8f9fc;
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
          --wp-shadow: 0 4px 24px rgba(0,0,0,0.06);
          --wp-shadow-lg: 0 12px 48px rgba(0,0,0,0.08);
        }
        .wp-wrapper {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          background: var(--wp-bg);
          color: var(--wp-text);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          position: relative;
        }
        .wp-wrapper::before {
          content: '';
          position: fixed;
          inset: 0;
          background:
            radial-gradient(ellipse 50% 40% at 15% 20%, rgba(79,110,247,0.06) 0%, transparent 60%),
            radial-gradient(ellipse 40% 50% at 85% 80%, rgba(130,94,228,0.05) 0%, transparent 60%);
          pointer-events: none;
        }
        .wp-container { position: relative; z-index: 1; width: 100%; max-width: 420px; }
        .wp-brand { text-align: center; margin-bottom: 36px; }
        .wp-brand-icon {
          width: 52px; height: 52px;
          background: linear-gradient(135deg, var(--wp-accent), var(--wp-accent2));
          border-radius: 14px;
          display: inline-flex; align-items: center; justify-content: center;
          font-size: 24px; margin-bottom: 14px;
          box-shadow: 0 8px 24px rgba(79,110,247,0.25);
          transition: transform 0.3s ease;
        }
        .wp-brand-icon:hover { transform: scale(1.05) rotate(-2deg); }
        .wp-brand h1 {
          font-size: 23px; font-weight: 700; letter-spacing: -0.4px;
          color: var(--wp-text); margin: 0;
        }
        .wp-brand p { font-size: 14px; color: var(--wp-muted); margin-top: 5px; }
        .wp-card {
          background: var(--wp-card);
          border: 1px solid var(--wp-border);
          border-radius: 20px;
          padding: 32px 28px;
          box-shadow: var(--wp-shadow-lg);
          animation: wpFadeUp 0.4s cubic-bezier(0.16,1,0.3,1);
        }
        @keyframes wpFadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .wp-card-title { font-size: 19px; font-weight: 700; margin-bottom: 4px; color: var(--wp-text); }
        .wp-card-sub { font-size: 13.5px; color: var(--wp-muted); margin-bottom: 24px; line-height: 1.6; }
        .wp-field { margin-bottom: 18px; }
        .wp-field label {
          display: block; font-size: 12.5px; font-weight: 600;
          color: var(--wp-text); margin-bottom: 7px; letter-spacing: 0.2px;
        }
        .wp-input-wrap { position: relative; }
        .wp-input-wrap input {
          width: 100%; background: var(--wp-surface);
          border: 1.5px solid var(--wp-border);
          border-radius: 12px; padding: 12px 44px 12px 16px;
          color: var(--wp-text); font-size: 14px;
          outline: none; transition: all 0.2s ease;
          box-sizing: border-box;
        }
        .wp-input-wrap input:focus {
          border-color: var(--wp-accent);
          box-shadow: 0 0 0 4px var(--wp-accent-light);
        }
        .wp-input-wrap input::placeholder { color: #b0b6c4; }
        .wp-input-wrap .eye-btn {
          position: absolute; right: 13px; top: 50%; transform: translateY(-50%);
          background: none; border: none; cursor: pointer;
          color: var(--wp-muted); font-size: 17px; padding: 4px; line-height: 1;
          border-radius: 6px; transition: all 0.15s;
        }
        .wp-input-wrap .eye-btn:hover { background: var(--wp-accent-light); color: var(--wp-accent); }
        .wp-pw-hint { font-size: 11.5px; color: var(--wp-muted); margin-top: 6px; }
        .wp-strength-bar { display: flex; gap: 5px; margin-top: 10px; }
        .wp-strength-seg { height: 4px; flex: 1; border-radius: 4px; background: #eef0f4; transition: background 0.3s; }
        .wp-code-row { display: flex; gap: 10px; align-items: stretch; }
        .wp-code-row input {
          flex: 1; letter-spacing: 4px; text-align: center;
          font-size: 22px; font-weight: 700; padding: 12px 8px;
          font-variant-numeric: tabular-nums;
        }
        .wp-send-code-btn {
          padding: 12px 16px; border: none; border-radius: 12px;
          background: var(--wp-accent-light); color: var(--wp-accent);
          font-size: 12px; font-weight: 600; cursor: pointer;
          white-space: nowrap; min-width: 92px;
          transition: all 0.2s ease; border: 1px solid transparent;
        }
        .wp-send-code-btn:hover:not(:disabled) { background: rgba(79,110,247,0.15); }
        .wp-send-code-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .wp-btn-primary {
          width: 100%; padding: 14px;
          background: linear-gradient(135deg, var(--wp-accent), var(--wp-accent2));
          border: none; border-radius: 12px; color: #fff;
          font-size: 15px; font-weight: 600; cursor: pointer;
          margin-top: 10px; letter-spacing: 0.2px;
          transition: all 0.2s ease;
          box-shadow: 0 4px 16px rgba(79,110,247,0.3);
        }
        .wp-btn-primary:hover { transform: translateY(-2px); box-shadow: 0 6px 24px rgba(79,110,247,0.4); }
        .wp-btn-primary:active { transform: translateY(0); box-shadow: 0 2px 8px rgba(79,110,247,0.3); }
        .wp-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; transform: none; box-shadow: none; }
        .wp-btn-primary .spinner {
          display: inline-block; width: 16px; height: 16px;
          border: 2px solid rgba(255,255,255,0.35); border-top-color: #fff;
          border-radius: 50%; animation: wpSpin 0.6s linear infinite;
          vertical-align: middle; margin-right: 8px;
        }
        @keyframes wpSpin { to { transform: rotate(360deg); } }
        .alert {
          border-radius: 12px; padding: 12px 16px;
          font-size: 13px; margin-bottom: 18px;
          line-height: 1.5; display: flex; align-items: center; gap: 8px;
          animation: wpFadeUp 0.25s ease;
        }
        .alert.success { background: #ecfdf5; border: 1px solid #bbf7d0; color: #15803d; }
        .alert.error { background: #fef2f2; border: 1px solid #fecaca; color: #dc2626; }
        .alert.info { background: #eef2ff; border: 1px solid #c7d2fe; color: #4338ca; }
        .wp-link-btn { background: none; border: none; color: var(--wp-accent); font-size: 13px; cursor: pointer; font-weight: 500; padding: 4px 0; transition: all 0.15s; }
        .wp-link-btn:hover { color: var(--wp-accent2); opacity: 0.8; }
        .wp-steps { display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 28px; }
        .step-dot {
          width: 8px; height: 8px; border-radius: 50%;
          background: #dce0e8; transition: all 0.3s cubic-bezier(0.34,1.56,0.64,1);
        }
        .step-dot.done { background: var(--wp-success); transform: scale(1.1); }
        .step-dot.active { background: var(--wp-accent); width: 28px; border-radius: 4px; }
        .wp-timer { font-size: 12px; color: var(--wp-warn); margin-top: 8px; font-weight: 500; }
        .wp-success-icon { text-align: center; font-size: 52px; margin-bottom: 14px; animation: wpPop 0.45s cubic-bezier(0.34,1.56,0.64,1); }
        @keyframes wpPop { from { transform: scale(0.3) rotate(-8deg); opacity: 0; } to { transform: scale(1) rotate(0); opacity: 1; } }
        .wp-divider { margin: 22px 0; display: flex; align-items: center; gap: 14px; color: var(--wp-muted); font-size: 12px; }
        .wp-divider-line { flex: 1; height: 1px; background: var(--wp-border); }
        .wp-footer { text-align: center; margin-top: 22px; font-size: 13px; color: var(--wp-muted); }
      `}</style>

      <div className="wp-container">
        <div className="wp-brand">
          <div className="wp-brand-icon">🛍</div>
          <h1>Telegram E-commerce</h1>
          <p>Web Panel Access</p>
        </div>

        {/* Sign Up */}
        {view === views.SIGNUP && (
          <div className="wp-card">
            <div className="wp-steps">
              <div className={dot(suStep === steps.BOT, false)} />
              <div className={dot(suStep === steps.BOT_CODE, suStep > steps.BOT)} />
              <div className={dot(suStep === steps.EMAIL, suStep > steps.BOT_CODE)} />
              <div className={dot(suStep === steps.EMAIL_CODE, suStep > steps.EMAIL)} />
              <div className={dot(suStep === steps.PASSWORD, suStep > steps.EMAIL_CODE)} />
            </div>

            {suStep === steps.BOT && (
              <>
                <div className="wp-card-title">Enter Bot Username</div>
                <div className="wp-card-sub">Enter your Telegram bot's username. A verification code will be sent to the bot owner.</div>
                {alertEl('signup')}
                <div className="wp-field">
                  <label>Bot Username</label>
                  <div className="wp-input-wrap">
                    <input
                      type="text"
                      value={suBotUsername}
                      onChange={e => setSuBotUsername(cleanBotUsername(e.target.value))}
                      placeholder="@yourbot or t.me/yourbot"
                      autoComplete="off"
                    />
                  </div>
                </div>
                <button className="wp-btn-primary" onClick={suSendBotCode} disabled={loading['suBotSend']}>
                  {loading['suBotSend'] ? <><span className="spinner" />Sending…</> : 'Send Code to Bot Owner'}
                </button>
                <div className="wp-divider">
                  <span className="wp-divider-line" />
                  <span>or</span>
                  <span className="wp-divider-line" />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="wp-link-btn" onClick={() => { setView(views.FORGOT); setFpEmail(''); setFpStep(steps.BOT); clearAlert('forgot'); }} style={{ flex: 1, textAlign: 'center' }}>
                    Forgot Password?
                  </button>
                  <button className="wp-link-btn" onClick={() => { setView(views.CHANGEPW); setCpEmail(''); clearAlert('changepw'); }} style={{ flex: 1, textAlign: 'center' }}>
                    Change Password
                  </button>
                </div>
              </>
            )}

            {suStep === steps.BOT_CODE && (
              <>
                <div className="wp-card-title">Check Telegram</div>
                <div className="wp-card-sub">A verification code was sent to the owner of <strong>@{suBotUsername}</strong>. Enter it below.</div>
                {alertEl('signup2')}
                <div className="wp-field">
                  <label>Confirmation Code</label>
                  <div className="wp-code-row">
                    <div className="wp-input-wrap" style={{ flex: 1 }}>
                      <input type="text" value={suBotCode} onChange={e => setSuBotCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" maxLength={6} inputMode="numeric" />
                    </div>
                  </div>
                </div>
                <button className="wp-btn-primary" onClick={suVerifyBotCode}>Verify Bot</button>
                <div style={{ textAlign: 'center', marginTop: 14 }}>
                  <button className="wp-link-btn" onClick={() => { setSuStep(steps.BOT); clearAlert('signup'); }}>← Use different bot</button>
                </div>
              </>
            )}

            {suStep === steps.EMAIL && (
              <>
                <div className="wp-card-title">Your Email</div>
                <div className="wp-card-sub">Enter your email to receive a confirmation code for login.</div>
                {alertEl('signup3')}
                <div className="wp-field">
                  <label>Email Address</label>
                  <div className="wp-input-wrap">
                    <input type="email" value={suEmail} onChange={e => setSuEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />
                  </div>
                </div>
                <button className="wp-btn-primary" onClick={suSendEmailCode} disabled={loading['suSend']}>
                  {loading['suSend'] ? <><span className="spinner" />Sending…</> : 'Send Confirmation Code'}
                </button>
              </>
            )}

            {suStep === steps.EMAIL_CODE && (
              <>
                <div className="wp-card-title">Check Your Inbox</div>
                <div className="wp-card-sub">Enter the 6-digit code sent to <strong>{suEmail}</strong></div>
                {alertEl('signup4')}
                <div className="wp-field">
                  <label>Confirmation Code</label>
                  <div className="wp-code-row">
                    <div className="wp-input-wrap" style={{ flex: 1 }}>
                      <input type="text" value={suCode} onChange={e => setSuCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" maxLength={6} inputMode="numeric" />
                    </div>
                    <button className="wp-send-code-btn" onClick={suResendEmailCode} disabled={timer.remaining > 0}>
                      {timer.remaining > 0 ? `${timer.remaining}s` : 'Resend'}
                    </button>
                  </div>
                  {timer.show && <div className="wp-timer">Resend in {timer.remaining}s</div>}
                </div>
                <button className="wp-btn-primary" onClick={suVerifyEmailCode}>Verify Code</button>
                <div style={{ textAlign: 'center', marginTop: 14 }}>
                  <button className="wp-link-btn" onClick={() => { setSuStep(steps.EMAIL); clearAlert('signup3'); }}>← Use different email</button>
                </div>
              </>
            )}

            {suStep === steps.PASSWORD && (
              <>
                <div className="wp-card-title">Set Your Password</div>
                <div className="wp-card-sub">Choose a secure password for your web panel.</div>
                {alertEl('signup5')}
                <div className="wp-field">
                  <label>Password</label>
                  <div className="wp-input-wrap">
                    <input id="su-pw1" type="password" value={suPw1} onChange={e => setSuPw1(e.target.value)} placeholder="At least 6 characters" />
                    {eyeBtn('su-pw1')}
                  </div>
                  <div className="wp-strength-bar">
                    {[0, 1, 2, 3].map(i => (
                      <div key={i} className="wp-strength-seg" style={suPw1.length > 0 && i < pwScore(suPw1) ? { background: pwColors[Math.min(pwScore(suPw1) - 1, 3)] } : {}} />
                    ))}
                  </div>
                  <div className="wp-pw-hint">{suPw1.length === 0 ? 'Minimum 6 characters' : pwHints[pwScore(suPw1)]}</div>
                </div>
                <div className="wp-field">
                  <label>Confirm Password</label>
                  <div className="wp-input-wrap">
                    <input id="su-pw2" type="password" value={suPw2} onChange={e => setSuPw2(e.target.value)} placeholder="Repeat password" />
                    {eyeBtn('su-pw2')}
                  </div>
                </div>
                <button className="wp-btn-primary" onClick={suSetPassword}>Create Account</button>
              </>
            )}
          </div>
        )}

        {/* Change Password */}
        {view === views.CHANGEPW && (
          <div className="wp-card">
            <div className="wp-card-title">Change Password</div>
            <div className="wp-card-sub">Enter your email and current password, then choose a new one.</div>
            {alertEl('changepw')}
            <div className="wp-field">
              <label>Email</label>
              <div className="wp-input-wrap">
                <input type="email" value={cpEmail} onChange={e => setCpEmail(e.target.value)} placeholder="Your email address" autoComplete="email" />
              </div>
            </div>
            <div className="wp-field">
              <label>Current Password</label>
              <div className="wp-input-wrap">
                <input id="cp-old" type="password" value={cpOld} onChange={e => setCpOld(e.target.value)} placeholder="Current password" />
                {eyeBtn('cp-old')}
              </div>
            </div>
            <div className="wp-field">
              <label>New Password</label>
              <div className="wp-input-wrap">
                <input id="cp-new1" type="password" value={cpNew1} onChange={e => setCpNew1(e.target.value)} placeholder="At least 6 characters" />
                {eyeBtn('cp-new1')}
              </div>
            </div>
            <div className="wp-field">
              <label>Confirm New Password</label>
              <div className="wp-input-wrap">
                <input id="cp-new2" type="password" value={cpNew2} onChange={e => setCpNew2(e.target.value)} placeholder="Repeat new password" />
                {eyeBtn('cp-new2')}
              </div>
            </div>
            <button className="wp-btn-primary" onClick={doChangePw}>Update Password</button>
            <div style={{ textAlign: 'center', marginTop: 14 }}>
              <button className="wp-link-btn" onClick={() => { setView(views.SIGNUP); resetSignup(); }}>← Back</button>
            </div>
          </div>
        )}

        {/* Forgot Password */}
        {view === views.FORGOT && (
          <div className="wp-card">
            <div className="wp-steps">
              <div className={dot(fpStep === steps.BOT, false)} />
              <div className={dot(fpStep === steps.BOT_CODE, fpStep > steps.BOT)} />
            </div>

            {fpStep === steps.BOT && (
              <>
                <div className="wp-card-title">Reset Password</div>
                <div className="wp-card-sub">We'll send a confirmation code to your registered email.</div>
                {alertEl('forgot')}
                <div className="wp-field">
                  <label>Registered Email</label>
                  <div className="wp-input-wrap">
                    <input id="fp-email" type="email" defaultValue={email} placeholder="Your registered email" />
                  </div>
                </div>
                <button className="wp-btn-primary" onClick={fpSendCode}>Send Reset Code</button>
                <div style={{ textAlign: 'center', marginTop: 14 }}>
                  <button className="wp-link-btn" onClick={() => { setView(views.SIGNUP); resetSignup(); }}>← Back</button>
                </div>
              </>
            )}

            {fpStep === steps.BOT_CODE && (
              <>
                <div className="wp-card-title">Enter Code & New Password</div>
                <div className="wp-card-sub">Code sent to <strong>{fpEmail}</strong></div>
                {alertEl('forgot2')}
                <div className="wp-field">
                  <label>Confirmation Code</label>
                  <div className="wp-code-row">
                    <div className="wp-input-wrap" style={{ flex: 1 }}>
                      <input type="text" value={fpCode} onChange={e => setFpCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" maxLength={6} inputMode="numeric" />
                    </div>
                    <button className="wp-send-code-btn" onClick={fpResend} disabled={timer.remaining > 0}>
                      {timer.remaining > 0 ? `${timer.remaining}s` : 'Resend'}
                    </button>
                  </div>
                  {timer.show && <div className="wp-timer">Resend in {timer.remaining}s</div>}
                </div>
                <div className="wp-field">
                  <label>New Password</label>
                  <div className="wp-input-wrap">
                    <input id="fp-pw1" type="password" value={fpPw1} onChange={e => setFpPw1(e.target.value)} placeholder="At least 6 characters" />
                    {eyeBtn('fp-pw1')}
                  </div>
                </div>
                <div className="wp-field">
                  <label>Confirm New Password</label>
                  <div className="wp-input-wrap">
                    <input id="fp-pw2" type="password" value={fpPw2} onChange={e => setFpPw2(e.target.value)} placeholder="Repeat password" />
                    {eyeBtn('fp-pw2')}
                  </div>
                </div>
                <button className="wp-btn-primary" onClick={fpResetPw}>Reset Password</button>
              </>
            )}
          </div>
        )}

        {/* Success */}
        {view === views.SUCCESS && (
          <div className="wp-card">
            <div className="wp-success-icon">{successData.icon}</div>
            <div className="wp-card-title" style={{ textAlign: 'center' }}>{successData.title}</div>
            <div className="wp-card-sub" style={{ textAlign: 'center', marginBottom: 24 }}>{successData.msg}</div>
            <button className="wp-btn-primary" onClick={successBack}>Got it</button>
          </div>
        )}

        <div className="wp-footer">TeleShop Web Panel</div>
      </div>
    </div>
  );
}
