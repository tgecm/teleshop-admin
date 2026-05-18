import { useState, useEffect, useRef } from 'react';

const API_BASE = 'https://api.telegramecommerce.shop/api/webpanel';

const views = { SIGNUP: 'signup', CHANGEPW: 'changepw', FORGOT: 'forgot', SUCCESS: 'success' };
const steps = { STEP1: 0, STEP2: 1, STEP3: 2 };

export default function WebPanel() {
  // Read bot context from URL params (sent by Telegram bot)
  const urlParams = new URLSearchParams(window.location.search);
  const botChatId = urlParams.get('chat_id') || null;
  const botUsername = urlParams.get('username') || null;

  const [view, setView] = useState(null);
  const [email, setEmail] = useState('');

  // Sign up form
  const [suStep, setSuStep] = useState(steps.STEP1);
  const [suEmail, setSuEmail] = useState('');
  const [suCode, setSuCode] = useState('');
  const [suPw1, setSuPw1] = useState('');
  const [suPw2, setSuPw2] = useState('');

  // Forgot pw form
  const [fpStep, setFpStep] = useState(steps.STEP1);
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

  // ─── Sign Up ──────────────────────────────────────────────
  const isValidEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const suSendCode = async () => {
    if (!isValidEmail(suEmail)) return showAlert('signup', 'Please enter a valid email address.', 'error');
    setLoading_('suSend', true);
    clearAlert('signup');
    try {
      await apiPost('/send-code', { email: suEmail, flow: 'signup', chat_id: botChatId, bot_username: botUsername });
      setSuStep(steps.STEP2);
      startTimer(60);
    } catch (e) {
      showAlert('signup', e.message || 'Failed to send code. Try again.', 'error');
    }
    setLoading_('suSend', false);
  };

  const suResend = async () => {
    clearAlert('signup2');
    try {
      await apiPost('/send-code', { email: suEmail, flow: 'signup', chat_id: botChatId, bot_username: botUsername });
      startTimer(60);
    } catch (e) {
      showAlert('signup2', 'Failed to resend. Try again.', 'error');
    }
  };

  const suVerifyCode = async () => {
    if (suCode.length !== 6) return showAlert('signup2', 'Enter the 6-digit code.', 'error');
    clearAlert('signup2');
    try {
      await apiPost('/verify-code', { email: suEmail, code: suCode, flow: 'signup' });
      setSuStep(steps.STEP3);
    } catch (e) {
      showAlert('signup2', e.message || 'Incorrect code.', 'error');
    }
  };

  const suSetPassword = async () => {
    clearAlert('signup3');
    if (suPw1.length < 6) return showAlert('signup3', 'Password must be at least 6 characters.', 'error');
    if (suPw1 !== suPw2) return showAlert('signup3', 'Passwords do not match.', 'error');
    try {
      const res = await apiPost('/signup', { email: suEmail, password: suPw1 });
      if (res.ok) {
        showSuccessView('🎉', 'Account Created!', `Your web panel is ready. Log in with ${suEmail}.`, () => { resetSignup(); setView(views.SIGNUP); });
      } else {
        showAlert('signup3', res.message || 'Failed to create account.', 'error');
      }
    } catch (e) {
      showAlert('signup3', e.message || 'Network error.', 'error');
    }
  };

  const resetSignup = () => {
    setSuStep(steps.STEP1);
    setSuEmail('');
    setSuCode('');
    setSuPw1('');
    setSuPw2('');
    clearAlert('signup');
    clearAlert('signup2');
    clearAlert('signup3');
  };

  const suBack = () => {
    setSuStep(steps.STEP1);
    clearAlert('signup');
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
      setFpStep(steps.STEP2);
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
          --wp-bg: #0d0f14;
          --wp-surface: #161920;
          --wp-card: #1e2230;
          --wp-border: rgba(255,255,255,0.07);
          --wp-accent: #5b9cf6;
          --wp-accent-glow: rgba(91,156,246,0.18);
          --wp-accent2: #9d6fff;
          --wp-text: #e8eaf0;
          --wp-muted: #6b7080;
          --wp-success: #4ade80;
          --wp-error: #f87171;
          --wp-warn: #facc15;
        }
        .wp-wrapper {
          font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif;
          background: var(--wp-bg);
          color: var(--wp-text);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          position: relative;
          overflow-x: hidden;
        }
        .wp-wrapper::before {
          content: '';
          position: fixed;
          inset: 0;
          background:
            radial-gradient(ellipse 60% 50% at 20% 20%, rgba(91,156,246,0.07) 0%, transparent 60%),
            radial-gradient(ellipse 50% 60% at 80% 80%, rgba(157,111,255,0.06) 0%, transparent 60%);
          pointer-events: none;
          z-index: 0;
        }
        .wp-container { position: relative; z-index: 1; width: 100%; max-width: 420px; }
        .wp-brand { text-align: center; margin-bottom: 32px; }
        .wp-brand-icon {
          width: 56px; height: 56px;
          background: linear-gradient(135deg, var(--wp-accent), var(--wp-accent2));
          border-radius: 16px; display: inline-flex; align-items: center; justify-content: center;
          font-size: 26px; margin-bottom: 12px; box-shadow: 0 0 30px var(--wp-accent-glow);
        }
        .wp-brand h1 { font-family: 'DM Serif Display', serif; font-size: 26px; letter-spacing: -0.5px; }
        .wp-brand p { font-size: 13px; color: var(--wp-muted); margin-top: 4px; }
        .wp-card {
          background: var(--wp-card); border: 1px solid var(--wp-border);
          border-radius: 20px; padding: 32px 28px; box-shadow: 0 20px 60px rgba(0,0,0,0.5);
          animation: slideIn 0.3s ease;
        }
        @keyframes slideIn { from { opacity: 0; transform: translateX(18px); } to { opacity: 1; transform: translateX(0); } }
        .wp-card-title { font-family: 'DM Serif Display', serif; font-size: 20px; margin-bottom: 6px; }
        .wp-card-sub { font-size: 13px; color: var(--wp-muted); margin-bottom: 24px; line-height: 1.5; }
        .wp-field { margin-bottom: 16px; }
        .wp-field label { display: block; font-size: 12px; font-weight: 600; color: var(--wp-muted); text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 7px; }
        .wp-input-wrap { position: relative; }
        .wp-input-wrap input {
          width: 100%; background: var(--wp-surface); border: 1px solid var(--wp-border);
          border-radius: 10px; padding: 12px 44px 12px 14px; color: var(--wp-text);
          font-size: 14px; outline: none; transition: border-color 0.2s, box-shadow 0.2s;
        }
        .wp-input-wrap input:focus { border-color: var(--wp-accent); box-shadow: 0 0 0 3px var(--wp-accent-glow); }
        .wp-input-wrap input::placeholder { color: var(--wp-muted); }
        .wp-input-wrap .eye-btn {
          position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
          background: none; border: none; cursor: pointer; color: var(--wp-muted);
          font-size: 16px; padding: 2px; line-height: 1;
        }
        .wp-input-wrap .eye-btn:hover { color: var(--wp-text); }
        .wp-pw-hint { font-size: 11px; color: var(--wp-muted); margin-top: 5px; }
        .wp-strength-bar { display: flex; gap: 4px; margin-top: 8px; }
        .wp-strength-seg { height: 3px; flex: 1; border-radius: 2px; background: var(--wp-border); transition: background 0.3s; }
        .wp-code-row { display: flex; gap: 8px; align-items: stretch; }
        .wp-code-row input { flex: 1; letter-spacing: 3px; text-align: center; font-size: 20px; font-weight: 600; padding: 12px 10px; }
        .wp-send-code-btn {
          padding: 12px 14px; border: none; border-radius: 10px; background: var(--wp-surface);
          border: 1px solid var(--wp-border); color: var(--wp-accent); font-size: 12px;
          font-weight: 600; cursor: pointer; white-space: nowrap; min-width: 90px;
          transition: all 0.2s;
        }
        .wp-send-code-btn:hover:not(:disabled) { background: var(--wp-accent-glow); border-color: var(--wp-accent); }
        .wp-send-code-btn:disabled { color: var(--wp-muted); cursor: not-allowed; }
        .wp-btn-primary {
          width: 100%; padding: 14px;
          background: linear-gradient(135deg, var(--wp-accent), var(--wp-accent2));
          border: none; border-radius: 12px; color: #fff; font-size: 15px; font-weight: 600;
          cursor: pointer; margin-top: 8px; letter-spacing: 0.2px;
          transition: opacity 0.2s, transform 0.15s, box-shadow 0.2s;
          box-shadow: 0 4px 20px rgba(91,156,246,0.3);
        }
        .wp-btn-primary:hover { opacity: 0.9; transform: translateY(-1px); }
        .wp-btn-primary:active { transform: translateY(0); }
        .wp-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
        .wp-btn-primary .spinner {
          display: inline-block; width: 16px; height: 16px;
          border: 2px solid rgba(255,255,255,0.4); border-top-color: #fff;
          border-radius: 50%; animation: wp-spin 0.7s linear infinite;
          vertical-align: middle; margin-right: 8px;
        }
        @keyframes wp-spin { to { transform: rotate(360deg); } }
        .alert { border-radius: 10px; padding: 11px 14px; font-size: 13px; margin-bottom: 16px; line-height: 1.5; border: 1px solid transparent; }
        .alert.success { background: rgba(74,222,128,0.1); border-color: rgba(74,222,128,0.25); color: var(--wp-success); }
        .alert.error { background: rgba(248,113,113,0.1); border-color: rgba(248,113,113,0.25); color: var(--wp-error); }
        .alert.info { background: rgba(91,156,246,0.1); border-color: rgba(91,156,246,0.25); color: var(--wp-accent); }
        .wp-link-btn { background: none; border: none; color: var(--wp-accent); font-size: 13px; cursor: pointer; text-decoration: underline; text-underline-offset: 2px; padding: 0; }
        .wp-link-btn:hover { color: var(--wp-accent2); }
        .wp-steps { display: flex; align-items: center; gap: 6px; margin-bottom: 24px; }
        .step-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--wp-border); transition: all 0.3s; }
        .step-dot.done { background: var(--wp-success); }
        .step-dot.active { background: var(--wp-accent); width: 24px; border-radius: 4px; }
        .wp-timer { font-size: 12px; color: var(--wp-warn); margin-top: 6px; }
        .wp-success-icon { text-align: center; font-size: 48px; margin-bottom: 12px; animation: wp-pop 0.4s cubic-bezier(0.34,1.56,0.64,1); }
        @keyframes wp-pop { from { transform: scale(0.5); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        .wp-footer { text-align: center; margin-top: 20px; font-size: 12px; color: var(--wp-muted); }
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
              <div className={dot(suStep === steps.STEP1, false)} />
              <div className={dot(suStep === steps.STEP2, suStep > steps.STEP1)} />
              <div className={dot(suStep === steps.STEP3, suStep > steps.STEP2)} />
            </div>

            {suStep === steps.STEP1 && (
              <>
                <div className="wp-card-title">Create Account</div>
                <div className="wp-card-sub">Enter your email to get a confirmation code.</div>
                {alertEl('signup')}
                <div className="wp-field">
                  <label>Email Address</label>
                  <div className="wp-input-wrap">
                    <input type="email" value={suEmail} onChange={e => setSuEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />
                  </div>
                </div>
                <button className="wp-btn-primary" onClick={suSendCode} disabled={loading['suSend']}>
                  {loading['suSend'] ? <><span className="spinner" />Sending…</> : 'Send Confirmation Code'}
                </button>
                <div className="wp-divider" style={{ margin: '20px 0', display: 'flex', alignItems: 'center', gap: 12, color: 'var(--wp-muted)', fontSize: 12 }}>
                  <span style={{ flex: 1, height: 1, background: 'var(--wp-border)' }} />
                  <span>or</span>
                  <span style={{ flex: 1, height: 1, background: 'var(--wp-border)' }} />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="wp-link-btn" onClick={() => { setView(views.FORGOT); setFpEmail(''); setFpStep(steps.STEP1); clearAlert('forgot'); }} style={{ flex: 1, textAlign: 'center' }}>
                    Forgot Password?
                  </button>
                  <button className="wp-link-btn" onClick={() => { setView(views.CHANGEPW); setCpEmail(''); clearAlert('changepw'); }} style={{ flex: 1, textAlign: 'center' }}>
                    Change Password
                  </button>
                </div>
              </>
            )}

            {suStep === steps.STEP2 && (
              <>
                <div className="wp-card-title">Check Your Inbox</div>
                <div className="wp-card-sub">Enter the 6-digit code sent to <strong>{suEmail}</strong></div>
                {alertEl('signup2')}
                <div className="wp-field">
                  <label>Confirmation Code</label>
                  <div className="wp-code-row">
                    <div className="wp-input-wrap" style={{ flex: 1 }}>
                      <input type="text" value={suCode} onChange={e => setSuCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" maxLength={6} inputMode="numeric" />
                    </div>
                    <button className="wp-send-code-btn" onClick={suResend} disabled={timer.remaining > 0}>
                      {timer.remaining > 0 ? `${timer.remaining}s` : 'Resend'}
                    </button>
                  </div>
                  {timer.show && <div className="wp-timer">Resend in {timer.remaining}s</div>}
                </div>
                <button className="wp-btn-primary" onClick={suVerifyCode}>Verify Code</button>
                <div style={{ textAlign: 'center', marginTop: 14 }}>
                  <button className="wp-link-btn" onClick={suBack}>← Use different email</button>
                </div>
              </>
            )}

            {suStep === steps.STEP3 && (
              <>
                <div className="wp-card-title">Set Your Password</div>
                <div className="wp-card-sub">Choose a secure password for your web panel.</div>
                {alertEl('signup3')}
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
              <div className={dot(fpStep === steps.STEP1, false)} />
              <div className={dot(fpStep === steps.STEP2, fpStep > steps.STEP1)} />
            </div>

            {fpStep === steps.STEP1 && (
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

            {fpStep === steps.STEP2 && (
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
