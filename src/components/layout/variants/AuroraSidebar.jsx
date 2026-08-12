import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutDashboard, Package, ShoppingBag, Users, MessageCircle, Radio, Send,
  CreditCard, Settings, ShieldCheck, Palette, LogOut, Bot, Newspaper, Mail,
  HelpCircle, UserCog, Utensils, ClipboardList, QrCode, TrendingUp, X,
  ChevronLeft, ChevronRight, Sparkles, Command,
} from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';
import { useBotStore } from '../../../store/botStore';
import { getUnreadCount } from '../../../api/chats';
import { getPendingOrderCount } from '../../../api/orders';
import BotSwitcher from '../../shared/BotSwitcher';
import ConfirmDialog from '../../shared/ConfirmDialog';

const navGroups = [
  {
    title: 'Main',
    items: [
      { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/orders', icon: Package, label: 'Orders', badgeKey: 'orders' },
      { to: '/products', icon: ShoppingBag, label: 'Products' },
      { to: '/customers', icon: Users, label: 'Customers' },
      { to: '/chats', icon: MessageCircle, label: 'Chats', badgeKey: 'chats' },
    ],
  },
  {
    title: 'Marketing & Sales',
    items: [
      { to: '/broadcast', icon: Radio, label: 'Broadcast' },
      { to: '/payments', icon: CreditCard, label: 'Payments' },
      { to: '/profit', icon: TrendingUp, label: 'Profit Tracker' },
    ],
  },
  {
    title: 'System',
    items: [
      { to: '/settings', icon: Settings, label: 'Settings' },
      { to: '/customization', icon: Palette, label: 'Web Customization' },
      { to: '/ai-agent', icon: Bot, label: 'AI Agent' },
      { to: '/bot-customization', icon: Bot, label: 'Bot Settings' },
    ],
  },
];

export default function AuroraSidebar({ mobileOpen, onMobileClose, collapsed, onToggle }) {
  const { user, logout, isStaff } = useAuthStore();
  const { bots, selectedBotId } = useBotStore();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const selectedBot = (bots || []).find(b => b.id.toString() === selectedBotId?.toString());
  const botName = selectedBot?.bot_full_name || selectedBot?.bot_username || user?.email?.split('@')[0] || 'Shop';

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
    <div className="flex flex-col h-full p-2">
      {/* Floating Header Badge */}
      <div className="p-3 mb-2 rounded-2xl flex items-center justify-between" style={{ background: 'var(--accent-light)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white shrink-0 font-black shadow-md" style={{ background: 'var(--accent-gradient)' }}>
            {botName.charAt(0).toUpperCase()}
          </div>
          {(!collapsed || isMobile) && (
            <div className="min-w-0">
              <p className="text-xs font-bold truncate" style={{ color: 'var(--text-primary)' }}>{botName}</p>
              <p className="text-[10px] truncate" style={{ color: 'var(--accent-text)' }}>Bento Island UI</p>
            </div>
          )}
        </div>
      </div>

      {/* Nav groups */}
      <div className="flex-1 overflow-y-auto scrollbar-sidebar space-y-4 px-1">
        {navGroups.map((group, idx) => (
          <div key={idx} className="space-y-1">
            {(!collapsed || isMobile) && (
              <p className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-1" style={{ color: 'var(--text-muted)' }}>
                {group.title}
              </p>
            )}
            {group.items.map(item => {
              const badge = getBadge(item.badgeKey);
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={isMobile ? onMobileClose : undefined}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-2xl text-xs font-semibold transition-all relative ${
                      isActive ? 'shadow-sm font-bold' : ''
                    }`
                  }
                  style={({ isActive }) => ({
                    background: isActive ? 'var(--accent-gradient)' : 'transparent',
                    color: isActive ? '#ffffff' : 'var(--text-secondary)',
                  })}
                >
                  <item.icon className="w-4 h-4 shrink-0" />
                  {(!collapsed || isMobile) && (
                    <span className="truncate flex-1">{item.label}</span>
                  )}
                  {badge > 0 && (
                    <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-rose-500 text-white shrink-0">
                      {badge > 99 ? '99+' : badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="pt-2 mt-auto border-t" style={{ borderColor: 'var(--border)' }}>
        <button
          onClick={() => setShowLogoutConfirm(true)}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-2xl text-xs font-semibold text-rose-500 hover:bg-rose-500/10 transition-all"
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

      {/* Desktop Floating Bento Sidebar Dock */}
      <aside
        className="hidden md:flex flex-col h-[calc(100vh-80px)] my-auto ml-4 my-4 rounded-3xl overflow-hidden shadow-xl shrink-0 transition-all duration-300"
        style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--border)',
          width: collapsed ? '72px' : '250px',
        }}
      >
        {navContent(false)}
      </aside>
    </>
  );
}
