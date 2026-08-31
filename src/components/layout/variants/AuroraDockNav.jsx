import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutDashboard, Package, ShoppingBag, Users, MessageCircle, Radio,
  CreditCard, Settings, TrendingUp, Palette, Bot, Grid, X, Mail, Newspaper,
  Send, HelpCircle, UserCog, Utensils, QrCode, ClipboardList, ShieldCheck,
} from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';
import { useBotStore } from '../../../store/botStore';
import { getUnreadCount } from '../../../api/chats';
import { getPendingOrderCount, getQRMenuPendingCount } from '../../../api/orders';

const primaryDockItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/orders', icon: Package, label: 'Orders', badgeKey: 'orders' },
  { to: '/products', icon: ShoppingBag, label: 'Products' },
  { to: '/customers', icon: Users, label: 'Customers' },
  { to: '/chats', icon: MessageCircle, label: 'Chats', badgeKey: 'chats' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

const allNavGroups = [
  {
    title: 'Core E-Commerce',
    items: [
      { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
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
      { to: '/commands', icon: Send, label: 'Commands' },
      { to: '/bot-customization', icon: Bot, label: 'Bot Settings' },
      { to: '/newsfeed', icon: Newspaper, label: 'Newsfeed' },
      { to: '/send-message', icon: Mail, label: 'Send Message', superadminOnly: true },
      { to: '/mmpay-admin', icon: CreditCard, label: 'MyanMyanPay', superadminOnly: true },
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
      { to: '/customization', icon: Palette, label: 'Web Customization' },
      { to: '/faqs', icon: HelpCircle, label: 'FAQs' },
      { to: '/subscription', icon: ShieldCheck, label: 'Subscription' },
      { to: '/staff-accounts', icon: UserCog, label: 'Staff Accounts' },
    ],
  },
];

export default function AuroraDockNav() {
  const { user } = useAuthStore();
  const { selectedBotId } = useBotStore();
  const [hoveredIdx, setHoveredIdx] = useState(null);
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
      {/* Floating Bottom Glass Dock */}
      <div className="fixed bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 z-50 max-w-[95vw]">
        <motion.nav
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex items-center gap-1 sm:gap-2 px-3 py-2 rounded-3xl shadow-2xl backdrop-blur-2xl border transition-all"
          style={{
            background: 'var(--card-bg)',
            borderColor: 'var(--border)',
            boxShadow: 'var(--card-shadow-hover)',
          }}
        >
          {primaryDockItems.map(({ to, icon: Icon, label, badgeKey }, idx) => {
            const badge = getBadge(badgeKey);
            const isHovered = hoveredIdx === idx;

            return (
              <NavLink
                key={to}
                to={to}
                data-haptic
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                className="relative group flex flex-col items-center justify-center p-2 sm:p-2.5 rounded-2xl transition-all"
              >
                {({ isActive }) => (
                  <>
                    {/* Tooltip */}
                    <div
                      className={`absolute -top-9 px-2.5 py-1 rounded-xl text-[10px] font-bold whitespace-nowrap pointer-events-none transition-all duration-200 ${
                        isHovered ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
                      }`}
                      style={{ background: 'var(--accent)', color: '#ffffff' }}
                    >
                      {label}
                    </div>

                    <motion.div
                      animate={{ scale: isHovered ? 1.25 : isActive ? 1.1 : 1 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                      className="relative flex items-center justify-center"
                    >
                      <Icon
                        className="w-5 h-5 sm:w-6 sm:h-6 transition-colors"
                        style={{ color: isActive ? 'var(--accent)' : 'var(--text-secondary)' }}
                      />
                      {badge > 0 && (
                        <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[8px] font-bold min-w-[14px] h-[14px] flex items-center justify-center rounded-full px-0.5 leading-none shadow-sm">
                          {badge > 99 ? '99+' : badge}
                        </span>
                      )}
                    </motion.div>

                    {isActive && (
                      <motion.div
                        layoutId="aurora-dock-dot"
                        className="w-1.5 h-1.5 rounded-full mt-1"
                        style={{ background: 'var(--accent)' }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      />
                    )}
                  </>
                )}
              </NavLink>
            );
          })}

          {/* All Apps Grid Button */}
          <button
            onClick={() => setShowAllApps(true)}
            className="p-2 sm:p-2.5 rounded-2xl transition-all flex flex-col items-center justify-center relative hover:scale-110 active:scale-95"
            style={{ color: 'var(--accent)' }}
            title="All Navigation Pages"
          >
            <Grid className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </motion.nav>
      </div>

      {/* All Apps Full Sheet Modal */}
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
                    All Navigation Apps
                  </h2>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    Access every admin page and tool
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
                    <p className="text-xs font-black uppercase tracking-wider px-1" style={{ color: 'var(--accent)' }}>
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
                            <item.icon className="w-4 h-4 shrink-0" style={{ color: 'var(--accent)' }} />
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
