import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutDashboard, Package, ShoppingBag, Users, MessageCircle, Radio,
  CreditCard, Settings, Palette, LogOut, Bot, TrendingUp, X, Sparkles, Crown,
} from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';
import { useBotStore } from '../../../store/botStore';
import { getUnreadCount } from '../../../api/chats';
import { getPendingOrderCount } from '../../../api/orders';
import ConfirmDialog from '../../shared/ConfirmDialog';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Overview' },
  { to: '/orders', icon: Package, label: 'Orders', badgeKey: 'orders' },
  { to: '/products', icon: ShoppingBag, label: 'Products' },
  { to: '/customers', icon: Users, label: 'Customers' },
  { to: '/chats', icon: MessageCircle, label: 'Inbox', badgeKey: 'chats' },
  { to: '/broadcast', icon: Radio, label: 'Broadcast' },
  { to: '/payments', icon: CreditCard, label: 'Payments' },
  { to: '/profit', icon: TrendingUp, label: 'Analytics' },
  { to: '/settings', icon: Settings, label: 'Settings' },
  { to: '/customization', icon: Palette, label: 'Web Store' },
];

export default function RoseSidebar({ mobileOpen, onMobileClose, collapsed, onToggle }) {
  const { user, logout } = useAuthStore();
  const { selectedBotId, bots } = useBotStore();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const selectedBot = (bots || []).find(b => b.id.toString() === selectedBotId?.toString());
  const botName = selectedBot?.bot_full_name || selectedBot?.bot_username || 'Rose Store';

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

  const getBadge = (key) => {
    if (key === 'chats') return unread?.total;
    if (key === 'orders') return pendingOrders?.pending;
    return null;
  };

  const navContent = (isMobile = false) => (
    <div className="flex flex-col h-full p-3">
      {/* Luxury Brand Header */}
      <div className="flex items-center gap-3 p-3 mb-4 rounded-2xl relative overflow-hidden" style={{ background: 'var(--accent-light)', border: '1px solid var(--border)' }}>
        <div className="w-9 h-9 rounded-2xl flex items-center justify-center text-white shrink-0 font-bold shadow-lg" style={{ background: 'linear-gradient(135deg, #f43f5e, #fb923c)' }}>
          <Crown className="w-5 h-5" />
        </div>
        {(!collapsed || isMobile) && (
          <div className="min-w-0">
            <p className="text-xs font-black tracking-wide truncate" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>
              {botName}
            </p>
            <p className="text-[9px] font-bold uppercase tracking-widest text-rose-500">Executive Luxury</p>
          </div>
        )}
      </div>

      {/* Nav List */}
      <div className="flex-1 overflow-y-auto scrollbar-hide space-y-1.5 px-1">
        {navItems.map(item => {
          const badge = getBadge(item.badgeKey);
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={isMobile ? onMobileClose : undefined}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all relative ${
                  isActive ? 'shadow-md scale-[1.02]' : 'hover:scale-[1.01]'
                }`
              }
              style={({ isActive }) => ({
                background: isActive ? 'linear-gradient(135deg, #f43f5e, #fb923c)' : 'transparent',
                color: isActive ? '#ffffff' : 'var(--text-secondary)',
              })}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {(!collapsed || isMobile) && (
                <span className="truncate flex-1">{item.label}</span>
              )}
              {badge > 0 && (
                <span className="px-2 py-0.5 text-[9px] font-bold rounded-full bg-amber-400 text-rose-950 shrink-0">
                  {badge > 99 ? '99+' : badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </div>

      {/* Logout */}
      <div className="pt-3 border-t mt-auto" style={{ borderColor: 'var(--border)' }}>
        <button
          onClick={() => setShowLogoutConfirm(true)}
          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold text-rose-500 hover:bg-rose-500/10 transition-all"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {(!collapsed || isMobile) && <span>Sign Out</span>}
        </button>
      </div>

      <ConfirmDialog
        isOpen={showLogoutConfirm}
        title="Sign Out"
        message="Are you sure you want to sign out?"
        confirmText="Sign Out"
        confirmVariant="danger"
        onConfirm={() => { setShowLogoutConfirm(false); logout(); }}
        onCancel={() => setShowLogoutConfirm(false)}
      />
    </div>
  );

  return (
    <>
      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div className="fixed inset-0 z-50 md:hidden flex">
            <motion.div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onMobileClose} />
            <motion.aside
              initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
              className="relative w-72 h-full my-auto ml-2 rounded-3xl overflow-hidden shadow-2xl z-10"
              style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}
            >
              {navContent(true)}
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar Rail */}
      <aside
        className="hidden md:flex flex-col h-[calc(100vh-32px)] my-auto ml-4 my-4 rounded-[28px] overflow-hidden shadow-2xl shrink-0 transition-all duration-300"
        style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--border)',
          width: collapsed ? '74px' : '260px',
        }}
      >
        {navContent(false)}
      </aside>
    </>
  );
}
