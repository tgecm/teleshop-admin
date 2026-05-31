import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth } from './firebase';

const GOOGLE_CLIENT_ID = '281946571209-hgjol3oltp70u1ve0negp1ptu29mftdv.apps.googleusercontent.com';

let scriptLoaded = false;
let scriptLoading: Promise<void> | null = null;

function loadGsiScript(): Promise<void> {
  if (scriptLoaded) return Promise.resolve();
  if (scriptLoading) return scriptLoading;
  scriptLoading = new Promise((resolve, reject) => {
    if (typeof google !== 'undefined' && google.accounts) {
      scriptLoaded = true;
      resolve();
      return;
    }
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.defer = true;
    s.onload = () => { scriptLoaded = true; resolve(); };
    s.onerror = () => { scriptLoading = null; reject(new Error('Failed to load Google Identity Services')); };
    document.head.appendChild(s);
  });
  return scriptLoading;
}

export function requestGoogleIdToken(): Promise<string> {
  return new Promise((resolve, reject) => {
    loadGsiScript()
      .then(() => {
        const client = google.accounts.oauth2.initTokenClient({
          client_id: GOOGLE_CLIENT_ID,
          scope: 'openid email profile',
          callback: (response) => {
            if (response.error) {
              reject(new Error(response.error));
            } else if (response.access_token) {
              resolve(response.access_token);
            } else {
              reject(new Error('No token received'));
            }
          },
        });
        client.requestAccessToken();
      })
      .catch(reject);
  });
}

export async function signInWithGoogle(
  shopSlug?: string
): Promise<{ token: string; user: { id: string; name: string; email: string; photo_url: string } } | void> {
  const accessToken = await requestGoogleIdToken();
  const credential = GoogleAuthProvider.credential(null, accessToken);
  const userCred = await signInWithCredential(auth, credential);
  // Exchange the Google access token for a backend JWT so subsequent
  // API calls carry an Authorization header (needed on main domain too).
  if (shopSlug) {
    const result = await exchangeGoogleToken(accessToken, shopSlug, userCred.user.uid);
    localStorage.setItem('telegram_token', result.token);
    localStorage.setItem('telegram_user', JSON.stringify(result.user));
    return result;
  }
}

export async function exchangeGoogleToken(
  accessToken: string,
  shopSlug: string,
  firebaseUid?: string
): Promise<{ token: string; user: { id: string; name: string; email: string; photo_url: string } }> {
  const body: Record<string, string> = { access_token: accessToken, shop_slug: shopSlug };
  if (firebaseUid) body.firebase_uid = firebaseUid;
  const resp = await fetch('https://api.telegramecommerce.shop/auth/google', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ detail: 'Google authentication failed' }));
    throw new Error(err.detail || 'Google authentication failed');
  }
  return resp.json();
}
