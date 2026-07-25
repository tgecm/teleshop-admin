import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutDashboard, Package, ShoppingBag, Users, MessageCircle, Radio,
  CreditCard, Settings, Palette, Crown, LogOut, TrendingUp, Grid, X, Mail,
  Newspaper, Send, HelpCircle, UserCog, Utensils, QrCode, ClipboardList, ShieldCheck, Bot,
} from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';
import { useBotStore } from '../../../store/botStore';
import { getUnreadCount } from '../../../api/chats';
import { getPendingOrderCount, getQRMenuPendingCount } from '../../../api/orders';
import ConfirmDialog from '../../shared/ConfirmDialog';

const spinePrimaryItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Overview' },
  { to: '/orders', icon: Package, label: 'Orders', badgeKey: 'orders' },
  { to: '/products', icon: ShoppingBag, label: 'Products' },
  { to: '/customers', icon: Users, label: 'Customers' },
  { to: '/chats', icon: MessageCircle, label: 'Chats', badgeKey: 'chats' },
  { to: '/broadcast', icon: Radio, label: 'Broadcast' },
  { to: '/payments', icon: CreditCard, label: 'Payments' },
  { to: '/profit', icon: TrendingUp, label: 'Profit' },
  { to: '/settings', icon: Settings, label: 'Settings' },
  { to: '/customization', icon: Palette, label: 'Customization' },
];

const allNavGroups = [
  {
    title: 'Core E-Commerce',
    items: [
      { to: '/dashboard', icon: LayoutDashboard, label: 'Overview' },
      { to: '/orders', icon: Package, label: 'Orders', badgeKey: 'orders' },
      { to: '/products', icon: ShoppingBag, label: 'Products' },
      { to: '/customers', icon: Users, label: 'Customers' },
      { to: '/chats', icon: MessageCircle, label: 'Chats', badgeKey: 'chats' },
      { to: '/profit', icon: TrendingUp, label: 'Profit Tracker' },
      { to: '/payments', icon: CreditCard, label: 'Payments' },
    ],
  },
  {
    title: 'Marketing & Telegram',
    items: [
      { to: '/broadcast', icon: Radio, label: 'Broadcast' },
      { to: '/commands', icon: Send, label: 'Telegram Commands' },
      { to: '/bot-customization', icon: Bot, label: 'Bot Settings' },
      { to: '/newsfeed', icon: Newspaper, label: 'Newsfeed Admin' },
      { to: '/send-message', icon: Mail, label: 'Send Message', superadminOnly: true },
      { to: '/subscribers', icon: Users, label: 'Subscribers', superadminOnly: true },
    ],
  },
  {
    title: 'QR Menu & Dining',
    items: [
      { to: '/qr-menu/dashboard', icon: LayoutDashboard, label: 'QR Dashboard' },
      { to: '/qr-menu', icon: Utensils, label: 'QR Menu' },
      { to: '/qr-menu/tables', icon: QrCode, label: 'QR Tables' },
      { to: '/qr-menu/orders', icon: ClipboardList, label: 'QR Orders', badgeKey: 'qrOrders' },
    ],
  },
  {
    title: 'System & Admin',
    items: [
      { to: '/settings', icon: Settings, label: 'Settings' },
      { to: '/customization', icon: Palette, label: 'Customization' },
      { to: '/faqs', icon: HelpCircle, label: 'FAQs' },
      { to: '/subscription', icon: ShieldCheck, label: 'Subscription Plan' },
      { to: '/staff-accounts', icon: UserCog, label: 'Staff Accounts' },
    ],
  },
];

export default function RoseSpine({ mobileOpen, onMobileClose }) {
  const { user, logout } = useAuthStore();
  const { selectedBotId } = useBotStore();
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showAllApps, setShowAllApps] = useState(false);

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

  const { data: qrPendingOrders } = useQuery({
    queryKey: ['qr-pending-orders-count', selectedBotId],
    queryFn: () => getQRMenuPendingCount(selectedBotId),
    enabled: !!selectedBotId,
    refetchInterval: 30000,
  });

  const getBadge = (key) => {
    if (key === 'chats') return unread?.total;
    if (key === 'orders') return pendingOrders?.pending;
    if (key === 'qrOrders') return qrPendingOrders?.pending;
    return null;
  };

  return (
    <>
      {/* Mobile Slide-out Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
              onClick={onMobileClose}
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="relative w-72 h-full my-auto ml-2 my-2 rounded-3xl overflow-hidden shadow-2xl z-10 flex flex-col p-4"
              style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-3 mb-3 border-b" style={{ borderColor: 'var(--border)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold shadow" style={{ background: 'linear-gradient(135deg, #f43f5e, #fb923c)' }}>
                    <Crown className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black" style={{ color: 'var(--text-primary)' }}>Executive Navigation</h3>
                    <p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>Rose Gold Edition</p>
                  </div>
                </div>
                <button onClick={onMobileClose} className="p-1.5 rounded-full hover:bg-rose-500/10 text-rose-500">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Links list */}
              <div className="flex-1 overflow-y-auto scrollbar-hide space-y-1 py-1">
                {allNavGroups.flatMap(g => g.items).map(item => {
                  if (item.superadminOnly && !user?.is_superadmin) return null;
                  const badge = getBadge(item.badgeKey);

                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={onMobileClose}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                          isActive ? 'text-white shadow-sm' : ''
                        }`
                      }
                      style={({ isActive }) => ({
                        background: isActive ? 'linear-gradient(135deg, #f43f5e, #fb923c)' : 'transparent',
                        color: isActive ? '#ffffff' : 'var(--text-primary)',
                      })}
                    >
                      <item.icon className="w-4 h-4 shrink-0" style={{ color: 'inherit' }} />
                      <span className="truncate flex-1">{item.label}</span>
                      {badge > 0 && (
                        <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-amber-400 text-rose-950 shrink-0">
                          {badge > 99 ? '99+' : badge}
                        </span>
                      )}
                    </NavLink>
                  );
                })}
              </div>

              {/* Footer Sign Out */}
              <div className="pt-3 border-t mt-auto" style={{ borderColor: 'var(--border)' }}>
                <button
                  onClick={() => { onMobileClose(); setShowLogoutConfirm(true); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-2xl text-xs font-bold text-rose-500 hover:bg-rose-500/10 transition-all"
                >
                  <LogOut className="w-4 h-4 shrink-0" />
                  <span>Sign Out</span>
                </button>
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      <aside className="hidden md:flex flex-col items-center py-4 px-2 h-[calc(100vh-24px)] my-auto ml-3 my-3 rounded-3xl shadow-xl shrink-0 z-40 relative" style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', width: '64px' }}>
        {/* Crown Brand Logo */}
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-white mb-4 shadow-md shrink-0" style={{ background: 'linear-gradient(135deg, #f43f5e, #fb923c)' }}>
          <Crown className="w-5 h-5" />
        </div>

        {/* Vertical Icon Rail */}
        <div className="flex-1 flex flex-col gap-2 overflow-y-auto scrollbar-hide py-1">
          {spinePrimaryItems.map((item, idx) => {
            const badge = getBadge(item.badgeKey);
            const isHovered = hoveredIdx === idx;

            return (
              <NavLink
                key={item.to}
                to={item.to}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                className={({ isActive }) =>
                  `relative p-3 rounded-2xl transition-all flex items-center justify-center ${
                    isActive ? 'shadow-md scale-105' : 'hover:scale-105'
                  }`
                }
                style={({ isActive }) => ({
                  background: isActive ? 'linear-gradient(135deg, #f43f5e, #fb923c)' : 'transparent',
                  color: isActive ? '#ffffff' : 'var(--text-secondary)',
                })}
              >
                {({ isActive }) => (
                  <>
                    <item.icon className="w-5 h-5" />
                    {badge > 0 && (
                      <span className="absolute -top-1 -right-1 bg-amber-400 text-rose-950 font-black text-[8px] min-w-[14px] h-[14px] flex items-center justify-center rounded-full px-0.5">
                        {badge > 99 ? '99+' : badge}
                      </span>
                    )}
                    {isHovered && (
                      <div
                        className="absolute left-16 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap z-50 pointer-events-none shadow-lg"
                        style={{ background: 'var(--accent)', color: '#ffffff' }}
                      >
                        {item.label}
                      </div>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}

          {/* All Apps button */}
          <button
            onClick={() => setShowAllApps(true)}
            className="p-3 rounded-2xl text-rose-500 hover:bg-rose-500/10 transition-all flex items-center justify-center relative"
            title="All Navigation Apps"
          >
            <Grid className="w-5 h-5" />
          </button>
        </div>

        {/* Logout */}
        <button
          onClick={() => setShowLogoutConfirm(true)}
          className="p-3 rounded-2xl text-rose-500 hover:bg-rose-500/10 transition-all mt-auto shrink-0"
          title="Sign Out"
        >
          <LogOut className="w-5 h-5" />
        </button>

        <ConfirmDialog
          isOpen={showLogoutConfirm}
          title="Sign Out"
          message="Are you sure you want to sign out?"
          confirmText="Sign Out"
          confirmVariant="danger"
          onConfirm={() => { setShowLogoutConfirm(false); logout(); }}
          onCancel={() => setShowLogoutConfirm(false)}
        />
      </aside>

      {/* All Apps Drawer Modal */}
      <AnimatePresence>
        {showAllApps && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-md"
            onClick={() => setShowAllApps(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-4xl max-h-[85vh] overflow-y-auto rounded-3xl p-5 sm:p-7 shadow-2xl border scrollbar-hide"
              style={{ background: 'var(--card-bg)', borderColor: 'var(--border)' }}
            >
              <div className="flex items-center justify-between pb-4 mb-5 border-b" style={{ borderColor: 'var(--border)' }}>
                <div>
                  <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>
                    Executive Menu Console
                  </h2>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    All store management apps & tools
                  </p>
                </div>
                <button
                  onClick={() => setShowAllApps(false)}
                  className="p-2 rounded-full hover:bg-rose-500/10 text-rose-500 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {allNavGroups.map((group, gIdx) => (
                  <div key={gIdx} className="space-y-2">
                    <p className="text-xs font-black uppercase tracking-wider px-1 text-rose-500">
                      {group.title}
                    </p>
                    <div className="space-y-1">
                      {group.items.map(item => {
                        if (item.superadminOnly && !user?.is_superadmin) return null;
                        const badge = getBadge(item.badgeKey);

                        return (
                          <NavLink
                            key={item.to}
                            to={item.to}
                            onClick={() => setShowAllApps(false)}
                            className="flex items-center gap-3 p-2.5 rounded-2xl transition-all text-xs font-semibold hover:scale-[1.02]"
                            style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
                          >
                            <item.icon className="w-4 h-4 shrink-0 text-rose-500" />
                            <span className="truncate flex-1">{item.label}</span>
                            {badge > 0 && (
                              <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-rose-500 text-white shrink-0">
                                {badge > 99 ? '99+' : badge}
                              </span>
                            )}
                          </NavLink>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
