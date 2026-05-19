import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuthStore } from '../../store/authStore';
import { LogOut, User, Menu } from 'lucide-react';
import BotSwitcher from '../shared/BotSwitcher';
import RefreshButton from '../shared/RefreshButton';

export default function TopBar({ onMenuClick }) {
  const { user, logout } = useAuthStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handle = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('pointerdown', handle);
    return () => document.removeEventListener('pointerdown', handle);
  }, [menuOpen]);

  return (
    <header className="sticky top-0 z-40 w-full bg-indigo-600 shadow-md pt-safe">
      <div className="flex items-center justify-between h-9 md:h-14 px-1 md:px-6 gap-0.5 md:gap-2">
        <div className="flex items-center gap-0.5 md:gap-4">
          <button
            onClick={onMenuClick}
            className="md:hidden text-white p-1 hover:bg-white/10 active:bg-white/15 rounded-lg transition-colors active:scale-95 tap-expand"
          >
            <Menu className="w-[18px] h-[18px]" />
          </button>
          <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
            <div className="w-5 h-5 md:w-8 md:h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
              <span className="text-indigo-600 font-bold text-[11px] md:text-lg">T</span>
            </div>
            <span className="text-white font-bold text-lg hidden lg:block">TeleShop</span>
          </div>
        </div>

        <div className="flex-1 flex justify-center max-w-[100px] sm:max-w-[200px] md:max-w-none">
          <BotSwitcher />
        </div>

        <div className="flex items-center gap-0.5 md:gap-3 flex-shrink-0">
          <RefreshButton />
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-white text-sm font-medium leading-none">{user?.email?.split('@')[0]}</span>
            <span className="text-indigo-200 text-[10px] mt-1 uppercase font-bold tracking-wider">{user?.is_superadmin ? 'Superadmin' : 'Owner'}</span>
          </div>


          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(prev => !prev)}
              className="w-6 h-6 md:w-10 md:h-10 rounded-full bg-indigo-500 border border-white/20 md:border-2 flex items-center justify-center text-white overflow-hidden shadow-sm active:scale-95 transition-transform"
            >
              {user?.profile_picture ? (
                <img src={user.profile_picture} alt="Avatar" className="w-full h-full object-cover" />
              ) : user?.telegram_id ? (
                <img src={`https://t.me/i/userpic/320/${user.telegram_id}.jpg`} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <User className="w-[18px] h-[18px] md:w-6 md:h-6" />
              )}
            </button>
            
            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.95 }}
                  transition={{ duration: 0.15, ease: 'easeOut' }}
                  className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-xl border border-gray-100 py-1 z-50"
                >
                  <div className="px-4 py-3 border-b border-gray-50 sm:hidden">
                    <p className="text-sm font-bold text-gray-900 truncate">{user?.email}</p>
                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mt-0.5">{user?.is_superadmin ? 'Superadmin' : 'Owner'}</p>
                  </div>
                  <div className="hidden sm:block px-4 py-3 border-b border-gray-50">
                    <p className="text-sm font-bold text-gray-900 truncate">{user?.email}</p>
                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mt-0.5">{user?.is_superadmin ? 'Superadmin' : 'Owner'}</p>
                  </div>
                  <button 
                    onClick={() => { setMenuOpen(false); logout(); }}
                    className="w-full flex items-center gap-2.5 px-4 py-3 text-sm font-bold text-rose-600 hover:bg-rose-50 active:bg-rose-100 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
}

