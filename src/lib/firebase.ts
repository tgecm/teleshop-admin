import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: 'AIzaSyAfjsoS9zWDKTafrPtl94YjVGt9dRkQvXY',
  authDomain: 'e-commerce-myanmar-82eaf.firebaseapp.com',
  projectId: 'e-commerce-myanmar-82eaf',
  storageBucket: 'e-commerce-myanmar-82eaf.firebasestorage.app',
  messagingSenderId: '281946571209',
  appId: '1:281946571209:web:1a7e00435d1441e8916818',
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence).catch(() => {});
export const googleProvider = new GoogleAuthProvider();

let _messaging: ReturnType<typeof getMessaging> | null = null;
try {
  _messaging = getMessaging(app);
} catch {
  _messaging = null;
}

export const messaging = _messaging;
export {getToken, onMessage};
