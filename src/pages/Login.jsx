import React, { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import { login as loginApi, verifyLoginCode } from '../api/auth';
import { motion } from 'motion/react';
import { Mail, Lock, Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react';

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
  const navigate = useNavigate();
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    if (needsCode && codeRefs.current[0]) codeRefs.current[0].focus();
  }, [needsCode]);

  useEffect(() => {
    const token = useAuthStore.getState().token || localStorage.getItem('telegram_token');
    if (token) {
      navigate('/dashboard', { replace: true });
    } else {
      setCheckingAuth(false);
    }
  }, [navigate]);

  if (checkingAuth) return null;


  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (needsCode) {
        const codeStr = code.join('');
        const data = await verifyLoginCode(loginToken, codeStr);
        if (data.success) {
          setAuth(data.token, data);
          navigate('/dashboard');
        } else {
          setError('Verification failed. Try again.');
        }
      } else {
        const data = await loginApi(email, password);
        if (data.success) {
          setAuth(data.token, data);
          navigate('/dashboard');
        } else if (data.step === '2fa') {
          setLoginToken(data.login_token);
          setNeedsCode(true);
          setPassword('');
          setError('');
        } else {
          setError('Invalid credentials');
        }
      }
    } catch (err) {
      setError(err.response?.data?.detail || err.response?.data?.message || 'Login failed. Please try again.');
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
      const data = await verifyLoginCode(loginToken, codeStr);
      if (data.success) {
        setAuth(data.token, data);
        navigate('/dashboard');
      } else {
        setError('Verification failed. Try again.');
      }
    } catch (err) {
      setError(err.response?.data?.detail || err.response?.data?.message || 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
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
              {needsCode ? 'Enter the code sent to your Telegram' : 'Sign in to manage your Multi-Platform E-commerce'}
            </p>
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

          <form onSubmit={handleSubmit} className="space-y-6">
            {!needsCode ? (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 ml-1">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none text-base"
                      placeholder="name@example.com"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 ml-1">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
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
                <label className="text-sm font-semibold text-gray-700 ml-1">Verification Code</label>
                <div className="flex justify-center gap-2 sm:gap-3">
                  {code.map((digit, i) => (
                    <input
                      key={i}
                      ref={(el) => { codeRefs.current[i] = el; }}
                      type="text"
                      inputMode="numeric"
                      value={digit}
                      onChange={(e) => {
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
              </div>
            )}

            <button
              type="submit"
              disabled={loading || (needsCode && code.join('').length < 6)}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 sm:py-4 rounded-2xl shadow-lg shadow-indigo-200 transition-all active:scale-[0.97] disabled:opacity-70 disabled:active:scale-100 flex items-center justify-center gap-2 text-base"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (needsCode ? 'Verify & Sign In' : 'Sign In')}
            </button>
          </form>
        </div>

        <div className="bg-gray-50 p-6 text-center border-t border-gray-100">
          <p className="text-sm text-gray-500">
            Don't have an account? <a href="https://t.me/ecommercemyanmarbot" target="_blank" rel="noopener noreferrer" className="text-indigo-600 font-semibold hover:underline">Contact Support</a>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
