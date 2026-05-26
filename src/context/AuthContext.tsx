import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { type User, onAuthStateChanged, getRedirectResult, signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';

const SESSION_KEY = 'admin_session_start';
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

interface AuthContextType {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRedirectResult(auth).catch(() => {});
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        const stored = localStorage.getItem(SESSION_KEY);
        const now = Date.now();
        if (stored) {
          const elapsed = now - parseInt(stored, 10);
          if (elapsed >= SESSION_DURATION_MS) {
            localStorage.removeItem(SESSION_KEY);
            signOut(auth);
            setUser(null);
            setLoading(false);
            return;
          }
        } else {
          localStorage.setItem(SESSION_KEY, String(now));
        }
      } else {
        localStorage.removeItem(SESSION_KEY);
      }
      setUser(firebaseUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
