import React from 'react';
import { useAuthStore } from '../../store/authStore';
import { LogOut, User, Menu } from 'lucide-react';
import BotSwitcher from '../shared/BotSwitcher';

export default function TopBar({ onMenuClick }) {
  const { user, logout } = useAuthStore();

  return (
    <header className="sticky top-0 z-40 w-full bg-indigo-600 shadow-md">
      <div className="flex items-center justify-between h-16 px-3 md:px-6 gap-2">
        <div className="flex items-center gap-2 sm:gap-4">
          <button 
            onClick={onMenuClick}
            className="md:hidden text-white p-2 hover:bg-white/10 rounded-xl transition-colors active:scale-95"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
              <span className="text-indigo-600 font-bold text-xl">T</span>
            </div>
            <span className="text-white font-bold text-lg hidden lg:block">TeleShop</span>
          </div>
        </div>

        <div className="flex-1 flex justify-center max-w-[200px] sm:max-w-none">
          <BotSwitcher />
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-white text-sm font-medium leading-none">{user?.email?.split('@')[0]}</span>
            <span className="text-indigo-100 text-[10px] mt-1 uppercase font-bold tracking-wider">{user?.is_superadmin ? 'Superadmin' : 'Owner'}</span>
          </div>
          <div className="relative group">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-indigo-500 border-2 border-white/20 flex items-center justify-center text-white cursor-pointer overflow-hidden shadow-sm">
              {user?.telegram_id ? (
                <img src={`https://t.me/i/userpic/320/${user.telegram_id}.jpg`} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <User className="w-5 h-5 sm:w-6 h-6" />
              )}
            </div>
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-gray-100 py-1 hidden group-hover:block animate-in fade-in slide-in-from-top-2">
              <div className="px-4 py-2 border-b border-gray-50 sm:hidden">
                <p className="text-sm font-bold text-gray-900 truncate">{user?.email}</p>
                <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">{user?.is_superadmin ? 'Superadmin' : 'Owner'}</p>
              </div>
              <button 
                onClick={logout}
                className="w-full flex items-center gap-2 px-4 py-3 text-sm font-bold text-rose-600 hover:bg-rose-50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
