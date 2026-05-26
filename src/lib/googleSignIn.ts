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

export async function signInWithGoogle(): Promise<void> {
  const accessToken = await requestGoogleIdToken();
  const credential = GoogleAuthProvider.credential(null, accessToken);
  await signInWithCredential(auth, credential);
}
