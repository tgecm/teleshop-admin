import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Users,
  MessageCircle,
  MoreHorizontal,
  Radio,
  Send,
  CreditCard,
  Settings,
  ShieldCheck,
  Palette,
  LogOut,
  X,
  ChevronDown,
  Bot,
  Newspaper,
  Mail,
  HelpCircle,
  UserCog
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useBotStore } from '../../store/botStore';
import { getUnreadCount } from '../../api/chats';
import { getPendingOrderCount } from '../../api/orders';
import { motion, AnimatePresence } from 'motion/react';

export default function BottomNav() {
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [telegramMoreExpanded, setTelegramMoreExpanded] = useState(false);
  const { logout } = useAuthStore();
  const { selectedBotId } = useBotStore();
  const location = useLocation();

  const { data: unread } = useQuery({
    queryKey: ['unreadCount', selectedBotId],
    queryFn: () => getUnreadCount(Number(selectedBotId)),
    enabled: !!selectedBotId,
    refetchInterval: 3000,
  });

  const { data: pendingOrders } = useQuery({
    queryKey: ['pendingOrderCount', selectedBotId],
    queryFn: () => getPendingOrderCount(Number(selectedBotId)),
    enabled: !!selectedBotId,
    refetchInterval: 3000,
  });

  const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Home' },
    { to: '/orders', icon: Package, label: 'Orders' },
    { to: '/products', icon: ShoppingBag, label: 'Products' },
    { to: '/customers', icon: Users, label: 'Users' },
    { to: '/chats', icon: MessageCircle, label: 'Chats' },
  ];

  const { user, isStaff } = useAuthStore();

  const moreItems = [
    ...(user?.is_superadmin ? [{ to: '/send-message', icon: Mail, label: 'Send Message' }] : []),
    { to: '/newsfeed', icon: Newspaper, label: 'Newsfeed' },
    { to: '/payments', icon: CreditCard, label: 'Payments' },
    ...(isStaff ? [] : [{ to: '/subscription', icon: ShieldCheck, label: 'Subscription' }]),
    { to: '/customization', icon: Palette, label: 'Customize' },
    ...(isStaff ? [] : [{ to: '/staff-accounts', icon: UserCog, label: 'Staff Accounts' }]),
    ...(isStaff ? [] : [{ to: '/faqs', icon: HelpCircle, label: 'FAQs' }]),
    { to: '/settings', icon: Settings, label: 'Settings' },
  ];

  const telegramMoreItems = [
    { to: '/broadcast', icon: Radio, label: 'Broadcast' },
    { to: '/commands', icon: Send, label: 'Telegram Command' },
    { to: '/bot-customization', icon: Bot, label: 'Bot Customization' },
  ];

  const isTelegramMoreActive = telegramMoreItems.some(item => location.pathname.startsWith(item.to));

  const isMoreActive = moreItems.some(item => location.pathname.startsWith(item.to));

  return (
    <>
      <nav className="bottomnav-panel md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-gray-100 z-50 shadow-[0_-4px_24px_rgba(0,0,0,0.06)] pb-safe">
        <div className="flex justify-around items-center h-[68px] px-1">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              data-haptic
              className={({ isActive }) => `
                flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all active:scale-95
                ${isActive ? 'text-indigo-600' : 'text-gray-400'}
              `}
            >
              {({ isActive }) => (
                <>
                  <div className={`relative p-1.5 rounded-xl transition-all ${isActive ? 'bg-indigo-50' : ''}`}>
                    <Icon className="w-[22px] h-[22px]" strokeWidth={isActive ? 2.5 : 1.8} />
                    {(to === '/chats' && unread?.total > 0) || (to === '/orders' && pendingOrders?.pending > 0) ? (
                      <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[8px] font-bold min-w-[14px] h-[14px] flex items-center justify-center rounded-full px-0.5 leading-none shadow-sm">
                        {to === '/chats'
                          ? (unread.total > 99 ? '99+' : unread.total)
                          : (pendingOrders.pending > 99 ? '99+' : pendingOrders.pending)}
                      </span>
                    ) : null}
                    {isActive && (
                      <motion.div
                        layoutId="bottomNavIndicator"
                        className="absolute -bottom-[3px] left-1/2 -translate-x-1/2 w-[6px] h-[6px] rounded-full bg-indigo-600"
                      />
                    )}
                  </div>
                  <span className={`text-[10px] font-semibold tracking-tight ${isActive ? 'text-indigo-600' : 'text-gray-400'}`}>{label}</span>
                </>
              )}
            </NavLink>
          ))}
          <button
            onClick={() => setIsMoreOpen(true)}
            data-haptic
            className={`flex flex-col items-center justify-center flex-1 h-full gap-1 active:scale-95 transition-transform ${isMoreActive ? 'text-indigo-600' : 'text-gray-400'}`}
          >
            <div className={`p-1.5 rounded-xl ${isMoreActive ? 'bg-indigo-50' : ''}`}>
              <MoreHorizontal className="w-[22px] h-[22px]" strokeWidth={isMoreActive ? 2.5 : 1.8} />
            </div>
            <span className="text-[10px] font-semibold tracking-tight">More</span>
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {isMoreOpen && (
          <div className="fixed inset-0 z-[60] md:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setIsMoreOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300, mass: 1 }}
              className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[28px] shadow-2xl max-h-[85dvh] overflow-y-auto"
            >
              <div className="px-5 pt-5 pb-sheet">
                
                <div className="flex justify-center mb-5">
                  <div className="w-9 h-[3px] bg-gray-200 rounded-full" />
                </div>

                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-gray-900">More</h3>
                  <button
                    onClick={() => setIsMoreOpen(false)}
                    className="w-8 h-8 bg-gray-100 rounded-full active:scale-90 transition-transform flex items-center justify-center"
                  >
                    <X className="w-4 h-4 text-gray-500" />
                  </button>
                </div>

                <div className="space-y-[10px]">
                  {/* Telegram E-commerce group */}
                  <div>
                    <button
                      onClick={() => setTelegramMoreExpanded(!telegramMoreExpanded)}
                      className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border transition-all active:scale-[0.98] ${
                        isTelegramMoreActive
                          ? 'bg-indigo-50 border-indigo-100 text-indigo-600'
                          : 'bg-gray-50 border-transparent text-gray-600'
                      }`}
                    >
                      <ShoppingBag className="w-5 h-5" />
                      <span className="font-bold text-[15px] flex-1 text-left">Telegram</span>
                      <ChevronDown className={`w-4 h-4 transition-transform ${telegramMoreExpanded ? 'rotate-0' : '-rotate-90'}`} />
                    </button>
                    <AnimatePresence>
                      {telegramMoreExpanded && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="fixed inset-0 z-[70] flex items-center justify-center p-6"
                          onClick={() => setTelegramMoreExpanded(false)}
                        >
                          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
                          <motion.div
                            initial={{ scale: 0.85, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.85, opacity: 0 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            onClick={e => e.stopPropagation()}
                            className="relative bg-white rounded-3xl shadow-2xl p-5 w-full max-w-[300px]"
                          >
                            <div className="flex items-center justify-between mb-4">
                              <h3 className="text-base font-bold text-gray-900">Telegram E-commerce</h3>
                              <button
                                onClick={() => setTelegramMoreExpanded(false)}
                                className="w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center active:scale-90 transition-transform"
                              >
                                <X className="w-3.5 h-3.5 text-gray-500" />
                              </button>
                            </div>
                            <div className="space-y-2">
                              {telegramMoreItems.map(({ to, icon: Icon, label }) => {
                                const isActive = location.pathname.startsWith(to);
                                return (
                                  <NavLink
                                    key={to}
                                    to={to}
                                    onClick={() => { setIsMoreOpen(false); setTelegramMoreExpanded(false); }}
                                    data-haptic
                                    className={`flex items-center gap-3.5 p-3.5 rounded-2xl border transition-all active:scale-[0.98] ${
                                      isActive
                                        ? 'bg-indigo-50 border-indigo-100 text-indigo-600 shadow-sm'
                                        : 'bg-gray-50 border-transparent text-gray-700 hover:bg-gray-100'
                                    }`}
                                  >
                                    <Icon className="w-[22px] h-[22px]" />
                                    <span className="font-semibold text-[15px]">{label}</span>
                                  </NavLink>
                                );
                              })}
                            </div>
                          </motion.div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {moreItems.map(({ to, icon: Icon, label }) => {
                    const isActive = location.pathname.startsWith(to);
                    return (
                      <NavLink
                        key={to}
                        to={to}
                        onClick={() => setIsMoreOpen(false)}
                        data-haptic
                        className={`flex items-center gap-4 p-3.5 rounded-2xl border transition-all active:scale-[0.98] ${
                          isActive
                            ? 'bg-indigo-50 border-indigo-100 text-indigo-600'
                            : 'bg-gray-50 border-transparent text-gray-600 active:bg-gray-100'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm ${
                          isActive ? 'bg-white text-indigo-600' : 'bg-white text-gray-500'
                        }`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <span className="font-bold text-[15px]">{label}</span>
                      </NavLink>
                    );
                  })}
                </div>

                <button
                  onClick={() => {
                    setIsMoreOpen(false);
                    logout();
                  }}
                  className="w-full flex items-center justify-center gap-3 p-3.5 rounded-2xl border border-rose-100 bg-rose-50 text-rose-600 font-bold mt-4 card-press"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="text-[15px]">Logout</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
