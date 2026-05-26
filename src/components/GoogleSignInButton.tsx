import { signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { motion } from 'motion/react';
import { LogOut, Loader2 } from 'lucide-react';

const GOOGLE_LOGO = 'https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg';

export default function GoogleSignInButton() {
  const { user, loading } = useAuth();

  const handleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error('Google sign-in failed:', err);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Sign out failed:', err);
    }
  };

  if (loading) {
    return (
      <div className="w-8 h-8 flex items-center justify-center">
        <Loader2 className="w-4 h-4 animate-spin text-white/70" />
      </div>
    );
  }

  if (user) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex items-center gap-2"
      >
        <div className="hidden sm:flex items-center gap-2">
          {user.photoURL && (
            <img
              src={user.photoURL}
              alt=""
              className="w-6 h-6 rounded-full object-cover ring-2 ring-white/20"
            />
          )}
          <span className="text-white text-xs font-medium max-w-[80px] truncate">
            {user.displayName || user.email?.split('@')[0]}
          </span>
        </div>
        <button
          onClick={handleSignOut}
          className="text-white/70 hover:text-white p-1.5 hover:bg-white/10 rounded-xl transition-colors"
          title="Sign out"
        >
          <LogOut className="w-4 h-4" strokeWidth={2} />
        </button>
      </motion.div>
    );
  }

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      onClick={handleSignIn}
      className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white/10 hover:bg-white/20 rounded-xl transition-all text-white text-xs font-medium active:scale-95"
    >
      <img src={GOOGLE_LOGO} alt="" className="w-4 h-4" />
      <span className="hidden sm:inline">Sign in</span>
    </motion.button>
  );
}
