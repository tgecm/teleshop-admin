import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Users,
  MessageCircle,
  Radio,
  Send,
  CreditCard,
  Settings,
  ShieldCheck,
  Palette,
  LogOut,
  Bot,
  Newspaper,
  Mail,
  HelpCircle,
  UserCog,
  Utensils,
  ClipboardList,
  QrCode,
  TrendingUp,
  X
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useBotStore } from '../../store/botStore';
import { getUnreadCount } from '../../api/chats';
import { getPendingOrderCount } from '../../api/orders';
import { getQRMenuPendingCount } from '../../api/orders';
import BotSwitcher from '../shared/BotSwitcher';
import ConfirmDialog from '../shared/ConfirmDialog';

const pageModules = {
  '/dashboard': () => import('../../pages/Dashboard'),
  '/orders': () => import('../../pages/Orders'),
  '/products': () => import('../../pages/Products'),
  '/customers': () => import('../../pages/Customers'),
  '/chats': () => import('../../pages/Chats'),
  '/broadcast': () => import('../../pages/Broadcast'),
  '/commands': () => import('../../pages/Commands'),
  '/payments': () => import('../../pages/Payments'),
  '/profit': () => import('../../pages/Profit'),
  '/settings': () => import('../../pages/Settings'),
  '/customization': () => import('../../pages/Customization'),
  '/ai-agent': () => import('../../pages/AiAgent'),
  '/bot-customization': () => import('../../pages/BotCustomization'),
  '/newsfeed': () => import('../../pages/NewsfeedAdmin'),
  '/faqs': () => import('../../pages/FAQs'),
  '/subscription': () => import('../../pages/Subscription'),
  '/staff-accounts': () => import('../../pages/StaffAccounts'),
  '/send-message': () => import('../../pages/SendMessage'),
  '/subscribers': () => import('../../pages/Subscribers'),
  '/qr-menu': () => import('../../pages/QRMenuAdmin'),
  '/qr-menu/tables': () => import('../../pages/QRMenuTables'),
  '/qr-menu/orders': () => import('../../pages/QRMenuOrders'),
  '/qr-menu/dashboard': () => import('../../pages/QRMenuDashboard'),
};

function prefetchPage(path) {
  if (pageModules[path]) pageModules[path]().catch(() => {});
}

export default function Sidebar({ mobileOpen, onMobileClose }) {
  const { user, logout, isStaff } = useAuthStore();
  const { bots, selectedBotId } = useBotStore();
  const selectedBot = (bots || []).find(b => b.id.toString() === selectedBotId?.toString());

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const location = useLocation();

  const { data: unread } = useQuery({
    queryKey: ['unreadCount', selectedBotId],
    queryFn: () => getUnreadCount(Number(selectedBotId)),
    enabled: !!selectedBotId,
    refetchInterval: 15000,
    refetchIntervalInBackground: true,
    staleTime: 0,
  });

  const { data: pendingOrders } = useQuery({
    queryKey: ['pendingOrderCount', selectedBotId],
    queryFn: () => getPendingOrderCount(Number(selectedBotId)),
    enabled: !!selectedBotId,
    refetchInterval: 15000,
    refetchIntervalInBackground: true,
    staleTime: 0,
  });

  const { data: qrPendingOrders } = useQuery({
    queryKey: ['qr-pending-orders-count', selectedBotId],
    queryFn: () => getQRMenuPendingCount(selectedBotId),
    enabled: !!selectedBotId,
    refetchInterval: 30000,
    refetchIntervalInBackground: true,
    staleTime: 0,
  });

  const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/profit', icon: TrendingUp, label: 'Profit' },
    ...(user?.is_superadmin ? [{ to: '/send-message', icon: Mail, label: 'Send Message' }] : []),
    ...(user?.is_superadmin ? [{ to: '/mmpay-admin', icon: CreditCard, label: 'MyanMyanPay' }] : []),
    ...(user?.is_superadmin ? [{ to: '/subscribers', icon: Users, label: 'Subscribers' }] : []),
    { to: '/orders', icon: Package, label: 'Orders' },
    { to: '/products', icon: ShoppingBag, label: 'Products' },
    { to: '/customers', icon: Users, label: 'Customers' },
    { to: '/chats', icon: MessageCircle, label: 'Chats' },
    { to: '/newsfeed', icon: Newspaper, label: 'Newsfeed' },
    { to: '/payments', icon: CreditCard, label: 'Payments' },
    { to: '/customization', icon: Palette, label: 'Customize' },
    { to: '/ai-agent', icon: Bot, label: 'AI Agent' },
    ...(isStaff ? [] : [{ to: '/staff-accounts', icon: UserCog, label: 'Staff Accounts' }]),
  ];

  const qrMenuItems = [
    { to: '/qr-menu/dashboard', icon: LayoutDashboard, label: 'QR Dashboard' },
    { to: '/qr-menu', icon: Utensils, label: 'QR Menu' },
    { to: '/qr-menu/tables', icon: QrCode, label: 'QR Tables' },
    { to: '/qr-menu/orders', icon: ClipboardList, label: 'QR Orders' },
  ];

  const telegramItems = [
    { to: '/broadcast', icon: Radio, label: 'Broadcast' },
    { to: '/commands', icon: Send, label: 'Telegram Command' },
    { to: '/bot-customization', icon: Bot, label: 'Bot Customization' },
  ];

  const bottomNavRoutes = ['/dashboard', '/orders', '/products', '/customers', '/chats', '/settings'];
  const mobileNavItems = navItems.filter(item => !bottomNavRoutes.includes(item.to));

  const navContent = (isMobile) => (
    <>
      <div className="flex-1 py-2 px-2 space-y-0.5 overflow-y-auto scrollbar-sidebar">
        {(isMobile ? mobileNavItems : navItems).map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            data-haptic
            onClick={onMobileClose}
            onMouseEnter={() => prefetchPage(to)}
            className={({ isActive }) => `
              flex items-center gap-2 px-2.5 py-1.5 lg:py-3 rounded-xl text-xs lg:text-sm font-medium transition-all
              ${isActive
                ? 'font-semibold'
                : 'border border-transparent hover:bg-[var(--sidebar-hover-bg)] hover:text-[var(--sidebar-text-hover)]'}`}
            style={({ isActive }) => isActive ? {
              background: 'var(--sidebar-active-bg)',
              color: 'var(--sidebar-text-active)',
              border: '1px solid var(--sidebar-active-border)',
            } : {
              color: 'var(--sidebar-text)',
            }}
          >
            <Icon className="w-4 h-4 lg:w-5 lg:h-5 flex-shrink-0" />
            <span>{label}</span>
            {(to === '/chats' && unread?.total > 0) || (to === '/orders' && pendingOrders?.pending > 0) ? (
              <span className="ml-auto bg-red-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] flex items-center justify-center rounded-full px-1">
                {to === '/chats'
                  ? (unread.total > 99 ? '99+' : unread.total)
                  : (pendingOrders.pending > 99 ? '99+' : pendingOrders.pending)}
              </span>
            ) : null}
          </NavLink>
        ))}

        {/* QR Menu Section — available to all users (Pro & Business plans only) */}
        <div className="pt-3">
            <p className="px-2.5 pb-1.5 text-[10px] font-bold text-indigo-500 uppercase tracking-wider flex items-center gap-1">
              <Utensils className="w-3 h-3" /> QR Menu
            </p>
            <div className="bg-indigo-50/40 border border-indigo-100 rounded-xl p-1 space-y-0.5">
              {qrMenuItems.map(({ to, icon: Icon, label }) => (
                <NavLink key={to} to={to} end={to === '/qr-menu'} data-haptic onClick={onMobileClose}
                  onMouseEnter={() => prefetchPage(to)}
                  className={({ isActive }) => `
                    flex items-center gap-2 px-2.5 py-1.5 lg:py-3 rounded-lg text-xs lg:text-sm font-medium transition-all
                    ${isActive ? 'bg-indigo-100 text-indigo-700 shadow-sm border border-indigo-300 font-semibold' : 'text-gray-600 hover:bg-white/70 hover:text-gray-900 border border-transparent'}
                  `}
                >
                  <Icon className="w-4 h-4 lg:w-5 lg:h-5 flex-shrink-0" />
                  <span>{label}</span>
                  {to === '/qr-menu/orders' && qrPendingOrders?.pending > 0 && (
                    <span className="ml-auto bg-red-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] flex items-center justify-center rounded-full px-1">
                      {qrPendingOrders.pending > 99 ? '99+' : qrPendingOrders.pending}
                    </span>
                  )}
                </NavLink>
              ))}
            </div>
          </div>

        {/* Telegram E-commerce Section */}
          <div className="pt-3">
            <p className="px-2.5 pb-1.5 text-[10px] font-bold text-indigo-500 uppercase tracking-wider flex items-center gap-1">
              <Send className="w-3 h-3" /> Telegram
            </p>
            <div className="bg-indigo-50/40 border border-indigo-100 rounded-xl p-1 space-y-0.5">
              {telegramItems.map(({ to, icon: Icon, label }) => (
                <NavLink key={to} to={to} data-haptic onClick={onMobileClose}
                  onMouseEnter={() => prefetchPage(to)}
                  className={({ isActive }) => `
                    flex items-center gap-2 px-2.5 py-1.5 lg:py-3 rounded-lg text-xs lg:text-sm font-medium transition-all
                    ${isActive ? 'bg-indigo-100 text-indigo-700 shadow-sm border border-indigo-300 font-semibold' : 'text-gray-600 hover:bg-white/70 hover:text-gray-900 border border-transparent'}
                  `}
                >
                  <Icon className="w-4 h-4 lg:w-5 lg:h-5 flex-shrink-0" />
                  <span>{label}</span>
                </NavLink>
              ))}
            </div>
          </div>

        {/* FAQs & Subscription */}
          {!isStaff && (
            <>
              <NavLink to="/faqs" data-haptic onClick={onMobileClose}
                onMouseEnter={() => prefetchPage('/faqs')}
                className={({ isActive }) => `
                  flex items-center gap-2 px-2.5 py-1.5 lg:py-3 rounded-xl text-xs lg:text-sm font-medium transition-all
                  ${isActive ? 'bg-indigo-50 text-indigo-600 shadow-sm border border-indigo-100' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900 border border-transparent'}
                `}
              >
                <HelpCircle className="w-4 h-4 lg:w-5 lg:h-5 flex-shrink-0" />
                <span>FAQs</span>
              </NavLink>
              <NavLink to="/subscription" data-haptic onClick={onMobileClose}
                onMouseEnter={() => prefetchPage('/subscription')}
                className={({ isActive }) => `
                  flex items-center gap-2 px-2.5 py-1.5 lg:py-3 rounded-xl text-xs lg:text-sm font-medium transition-all
                  ${isActive ? 'bg-indigo-50 text-indigo-600 shadow-sm border border-indigo-100' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900 border border-transparent'}
                `}
              >
                <ShieldCheck className="w-4 h-4 lg:w-5 lg:h-5 flex-shrink-0" />
                <span>Subscription</span>
              </NavLink>
            </>
          )}

        {/* Settings */}
          <NavLink to="/settings" data-haptic onClick={onMobileClose}
            onMouseEnter={() => prefetchPage('/settings')}
            className={({ isActive }) => `
              flex items-center gap-2 px-2.5 py-1.5 lg:py-3 rounded-xl text-xs lg:text-sm font-medium transition-all
              ${isActive ? 'bg-indigo-50 text-indigo-600 shadow-sm border border-indigo-100' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900 border border-transparent'}
            `}
          >
            <Settings className="w-4 h-4 lg:w-5 lg:h-5 flex-shrink-0" />
            <span>Settings</span>
          </NavLink>

        {/* Logout */}
          <button
            onClick={() => setShowLogoutConfirm(true)}
            data-haptic
            className="flex items-center gap-2 w-full px-2.5 py-1.5 lg:py-3 rounded-xl text-xs lg:text-sm font-medium text-rose-600 hover:bg-rose-50 transition-all border border-transparent hover:border-rose-100"
          >
            <LogOut className="w-4 h-4 lg:w-5 lg:h-5" />
            <span>Logout</span>
          </button>
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
    </>
  );

  return (
    <>
      {/* Mobile sidebar drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] md:hidden"
          >
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onMobileClose} />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      className="absolute left-0 top-0 bottom-0 w-56 shadow-2xl flex flex-col overflow-y-auto"
              style={{ background: 'var(--sidebar-bg)' }}
            >
              <div className="flex items-center justify-between px-2.5 py-2 border-b border-indigo-100 shrink-0">
                <span className="text-sm font-black text-indigo-600">Menu</span>
                <button onClick={onMobileClose} className="w-7 h-7 rounded-full bg-rose-100 flex items-center justify-center active:scale-90 transition-transform hover:bg-rose-200">
                  <X className="w-4 h-4 text-rose-500" />
                </button>
              </div>
              {user?.is_superadmin && (
                <div className="px-4 py-3 border-b border-indigo-100 shrink-0">
                  <BotSwitcher light />
                </div>
              )}
              {navContent(true)}
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <aside
        className="sidebar-panel hidden md:flex flex-col w-64 lg:w-72 h-full overflow-y-auto scrollbar-sidebar"
        style={{ background: 'var(--sidebar-bg)', borderRight: '1px solid var(--sidebar-border)' }}
      >
        {navContent(false)}
      </aside>
    </>
  );
}
