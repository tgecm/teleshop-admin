import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuthStore } from '../../store/authStore';
import { LogOut, User, MessageCircle, Package } from 'lucide-react';
import BotSwitcher from '../shared/BotSwitcher';
import RefreshButton from '../shared/RefreshButton';
import ConfirmDialog from '../shared/ConfirmDialog';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useBotStore } from '../../store/botStore';
import { normalizeText } from '../../utils/normalizeText';
import { getUnreadCount } from '../../api/chats';
import { getPendingOrderCount } from '../../api/orders';

export default function TopBar() {
  const { user, logout } = useAuthStore();
  const { bots, selectedBotId } = useBotStore();
  const selectedBot = bots.find(b => b.id.toString() === selectedBotId?.toString());
  const botName = selectedBot ? normalizeText(selectedBot.bot_full_name || selectedBot.bot_username || 'Admin') : 'Admin';
  const [menuOpen, setMenuOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();

  const { data: unread } = useQuery({
    queryKey: ['unreadCount', selectedBotId],
    queryFn: () => getUnreadCount(Number(selectedBotId)),
    enabled: !!selectedBotId,
    refetchInterval: 15000,
  });

  const { data: pendingOrders } = useQuery({
    queryKey: ['pendingOrderCount', selectedBotId],
    queryFn: () => getPendingOrderCount(Number(selectedBotId)),
    enabled: !!selectedBotId,
    refetchInterval: 15000,
  });

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
    <header className="sticky top-0 z-40 w-full bg-indigo-600 shadow-[0_2px_16px_rgba(99,102,241,0.3)]">
      <div className="flex items-center justify-between h-10 md:h-16 px-2 md:px-6 lg:px-8 gap-1 md:gap-4">
        <div className="flex items-center gap-2.5">
          <span className="text-white text-base md:text-xl lg:text-2xl font-black tracking-widest uppercase truncate max-w-[130px] sm:max-w-[220px] md:max-w-[300px] lg:max-w-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]">{botName}</span>
        </div>

        {user?.is_superadmin && (
          <div className="flex-1 flex justify-center max-w-[140px] sm:max-w-[200px] md:max-w-none">
            <BotSwitcher />
          </div>
        )}

        <div className="flex items-center gap-1 md:gap-3 flex-shrink-0">
          <button
            onClick={() => navigate('/chats')}
            className="relative text-white p-1.5 md:p-2.5 hover:bg-white/10 active:bg-white/15 rounded-xl transition-colors"
          >
            <MessageCircle className="w-[20px] h-[20px] md:w-[22px] md:h-[22px]" strokeWidth={1.8} />
            {unread?.total > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[8px] font-bold min-w-[15px] h-[15px] flex items-center justify-center rounded-full px-0.5 leading-none shadow-sm">
                {unread.total > 99 ? '99+' : unread.total}
              </span>
            )}
          </button>
          <button
            onClick={() => navigate('/orders')}
            className="relative text-white p-1.5 md:p-2.5 hover:bg-white/10 active:bg-white/15 rounded-xl transition-colors"
          >
            <Package className="w-[20px] h-[20px] md:w-[22px] md:h-[22px]" strokeWidth={1.8} />
            {pendingOrders?.pending > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-amber-400 text-white text-[8px] font-bold min-w-[15px] h-[15px] flex items-center justify-center rounded-full px-0.5 leading-none shadow-sm">
                {pendingOrders.pending > 99 ? '99+' : pendingOrders.pending}
              </span>
            )}
          </button>
          <RefreshButton />
          <div className="hidden md:flex flex-col items-end">
            <span className="text-white text-sm font-medium leading-none">{user?.email?.split('@')[0]}</span>
            <span className="text-indigo-200 text-[10px] mt-1 uppercase font-bold tracking-wider">{user?.is_superadmin ? 'Superadmin' : 'Owner'}</span>
          </div>

          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(prev => !prev)}
              className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-indigo-500 border-2 border-white/20 flex items-center justify-center text-white overflow-hidden shadow-sm active:scale-95 transition-transform"
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
                  className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 py-1.5 z-50"
                >
                  <div className="px-4 py-3 border-b border-gray-50 md:hidden">
                    <p className="text-sm font-bold text-gray-900 truncate">{user?.email}</p>
                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mt-0.5">{user?.is_superadmin ? 'Superadmin' : 'Owner'}</p>
                  </div>
                  <div className="hidden md:block px-4 py-3 border-b border-gray-50">
                    <p className="text-sm font-bold text-gray-900 truncate">{user?.email}</p>
                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mt-0.5">{user?.is_superadmin ? 'Superadmin' : 'Owner'}</p>
                  </div>
                  <button
                    onClick={() => { setMenuOpen(false); setShowLogoutConfirm(true); }}
                    className="w-full flex items-center gap-2.5 px-4 py-3 text-sm font-bold text-rose-600 hover:bg-rose-50 active:bg-rose-100 transition-colors rounded-lg mx-1.5"
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

      <ConfirmDialog
        open={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={() => { setShowLogoutConfirm(false); logout(); }}
        title="Logout"
        message="Are you sure you want to logout?"
        confirmText="Logout"
        variant="danger"
      />
    </header>
  );
}

