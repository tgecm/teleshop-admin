import { useState, useCallback } from 'react';
import { motion } from 'motion/react';
import { Loader2, AlertCircle } from 'lucide-react';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { requestGoogleIdToken, exchangeGoogleToken } from '../lib/googleSignIn';
import { restoreProxyParamsFromQ, getProxyParamsFromHash } from '../utils/authProxy';

function isValidRedirectUri(uri: string): boolean {
  if (!uri.startsWith('https://')) return false;
  try {
    const url = new URL(uri);
    const hostname = url.hostname;
    const allowed = ['telegramecommerce.shop', 'www.telegramecommerce.shop',
                     'crossmart.shop', 'www.crossmart.shop'];
    if (allowed.includes(hostname)) return true;
    const currentOrigin = window.location.origin;
    if (uri.startsWith(currentOrigin)) return true;
    return false;
  } catch {
    return false;
  }
}

interface AuthResult {
  token: string;
  user: { id: string; name: string; email: string; photo_url: string };
}

/** Get shop_slug and redirect_uri from hash, URL params, or 404.html redirect fallback. */
function getProxyParams(): { shopSlug: string; redirectUri: string } | null {
  const hashParams = getProxyParamsFromHash();
  if (hashParams) return hashParams;

  const params = new URLSearchParams(window.location.search);
  const shopSlug = params.get('shop_slug');
  const redirectUri = params.get('redirect_uri');
  if (shopSlug && redirectUri) return { shopSlug, redirectUri };

  const restored = restoreProxyParamsFromQ();
  if (restored?.shop_slug && restored?.redirect_uri) {
    return { shopSlug: restored.shop_slug, redirectUri: restored.redirect_uri };
  }

  return null;
}

export default function GoogleAuthProxy() {
  const [error, setError] = useState('');
  const [signingIn, setSigningIn] = useState(false);

  const proxyParams = getProxyParams();
  const paramError = !proxyParams
    ? 'Missing required parameters: shop_slug and redirect_uri'
    : !isValidRedirectUri(proxyParams.redirectUri)
      ? 'Invalid redirect URI'
      : '';

  const handleSignIn = useCallback(async () => {
    if (!proxyParams) return;
    const { shopSlug, redirectUri } = proxyParams;
    const qs = redirectUri.includes('?') ? '&' : '?';
    setSigningIn(true);

    let accessToken: string;
    try {
      accessToken = await requestGoogleIdToken();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Authentication cancelled';
      window.location.href = `${redirectUri}${qs}auth_status=failed&auth_error=${encodeURIComponent(msg)}`;
      return;
    }

    // Sign into Firebase so the Firebase UID is used as the customer identifier,
    // matching what the main-domain flow uses. This ensures customer profiles and
    // orders are shared between custom domain and default domain for the same Google account.
    let firebaseUid: string | undefined;
    try {
      const credential = GoogleAuthProvider.credential(null, accessToken);
      const userCred = await signInWithCredential(auth, credential);
      firebaseUid = userCred.user.uid;
    } catch {
      // If Firebase sign-in fails, proceed without — the backend will fall back to google_uid
    }

    let result: AuthResult;
    try {
      result = await exchangeGoogleToken(accessToken, shopSlug, firebaseUid);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Authentication failed';
      window.location.href = `${redirectUri}${qs}auth_status=failed&auth_error=${encodeURIComponent(msg)}`;
      return;
    }

    const userEncoded = encodeURIComponent(JSON.stringify(result.user));
    window.location.href = `${redirectUri}${qs}auth_token=${result.token}&auth_status=success&auth_user=${userEncoded}`;
  }, [proxyParams]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl shadow-xl p-8 max-w-sm w-full text-center"
      >
        {paramError || error ? (
          <>
            <div className="w-16 h-16 bg-gradient-to-br from-red-50 to-red-100 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
              <AlertCircle className="w-8 h-8 text-red-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Authentication Error</h2>
            <p className="text-sm text-gray-500 mb-6">{paramError || error}</p>
            <button
              onClick={() => window.history.back()}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 font-bold rounded-2xl hover:bg-gray-200 transition-all"
            >
              Go Back
            </button>
          </>
        ) : signingIn ? (
          <>
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Signing in with Google</h2>
            <p className="text-sm text-gray-500">Please complete the Google sign-in popup...</p>
          </>
        ) : (
          <>
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="" className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Sign in to Continue</h2>
            <p className="text-sm text-gray-500 mb-6">
              Sign in with your Google account to access this shop.
            </p>
            <button
              onClick={handleSignIn}
              className="w-full flex items-center justify-center gap-3 px-6 py-3.5 bg-white border-2 border-gray-200 rounded-2xl font-bold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all active:scale-[0.98]"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="" className="w-5 h-5" />
              Sign in with Google
            </button>
          </>
        )}
      </motion.div>
    </div>
  );
}
