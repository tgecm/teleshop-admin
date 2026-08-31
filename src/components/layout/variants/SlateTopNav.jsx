import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../../store/authStore';
import { useThemeStore } from '../../../store/themeStore';
import {
  LogOut, Mail, X, Loader2, Trash2, Store, Sparkles, Bell,
  LayoutDashboard, Package, ShoppingBag, Users, MessageCircle,
  Radio, CreditCard, Settings, Sun, Moon, TrendingUp, Newspaper,
  Send, Bot, Utensils, QrCode, ClipboardList, Palette, HelpCircle,
  ShieldCheck, UserCog, Grid,
} from 'lucide-react';
import BotSwitcher from '../../shared/BotSwitcher';
import RefreshButton from '../../shared/RefreshButton';
import AiChatModal from '../../shared/AiChatModal';
import ConfirmDialog from '../../shared/ConfirmDialog';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useBotStore } from '../../../store/botStore';
import { normalizeText } from '../../../utils/normalizeText';
import {
  getAdminUnreadMessagesCount,
  getAdminMessages,
  markAdminMessagesRead,
  deleteAdminMessage,
} from '../../../api/superadmin';
import { getUnreadCount } from '../../../api/chats';
import { getPendingOrderCount, getQRMenuPendingCount } from '../../../api/orders';
import { linkifyText } from '../../../utils/linkify';

const primarySlateNav = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/orders', icon: Package, label: 'Orders', badgeKey: 'orders' },
  { to: '/products', icon: ShoppingBag, label: 'Products' },
  { to: '/customers', icon: Users, label: 'Customers' },
  { to: '/chats', icon: MessageCircle, label: 'Chats', badgeKey: 'chats' },
  { to: '/profit', icon: TrendingUp, label: 'Profit' },
  { to: '/payments', icon: CreditCard, label: 'Payments' },
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
      { to: '/commands', icon: Send, label: 'Telegram Commands' },
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
      { to: '/subscription', icon: ShieldCheck, label: 'Subscription Plan' },
      { to: '/staff-accounts', icon: UserCog, label: 'Staff Accounts' },
    ],
  },
];

export default function SlateTopNav({ onToggleSidebar }) {
  const { user, logout, isStaff } = useAuthStore();
  const { bots, selectedBotId } = useBotStore();
  const { theme, setTheme } = useThemeStore();
  const isDark = theme === 'slate-dark';
  const queryClient = useQueryClient();

  const selectedBot = (bots || []).find(b => b.id.toString() === selectedBotId?.toString());
  const botName = selectedBot
    ? normalizeText(selectedBot.bot_full_name || selectedBot.bot_username || 'E-commerce Myanmar')
    : (user?.email?.split('@')[0] || 'E-commerce Myanmar');

  const location = useLocation();
  const navigate = useNavigate();

  const [logoFailed, setLogoFailed] = useState(false);
  const logoUrl = selectedBot?.profile_picture || user?.profile_picture;
  useEffect(() => { setLogoFailed(false); }, [logoUrl]);

  const [menuOpen, setMenuOpen] = useState(false);
  const [showAiChat, setShowAiChat] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showMessages, setShowMessages] = useState(false);
  const [showAllApps, setShowAllApps] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deletingMsg, setDeletingMsg] = useState(false);

  const { data: unreadAdminMsgs } = useQuery({
    queryKey: ['adminUnreadMessages'],
    queryFn: getAdminUnreadMessagesCount,
    refetchInterval: 3000,
  });

  const { data: adminMessages } = useQuery({
    queryKey: ['adminMessages'],
    queryFn: getAdminMessages,
    enabled: showMessages,
  });

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

  useEffect(() => {
    if (showMessages && unreadAdminMsgs?.count > 0) {
      markAdminMessagesRead().then(() => {
        queryClient.invalidateQueries({ queryKey: ['adminUnreadMessages'] });
      }).catch(() => {});
    }
  }, [showMessages]);

  const unreadCount = unreadAdminMsgs?.count || 0;

  const NavPill = ({ to, icon: Icon, label, badgeKey }) => {
    const badge = getBadge(badgeKey);

    return (
      <NavLink to={to} data-haptic className="flex-shrink-0">
        {({ isActive }) => (
          <span
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold transition-all whitespace-nowrap relative"
            style={{
              background: isActive ? 'var(--accent-light)' : 'transparent',
              color: isActive ? 'var(--accent-text)' : 'var(--text-secondary)',
              cursor: 'pointer',
            }}
            onMouseEnter={e => {
              if (!isActive) e.currentTarget.style.background = 'var(--bg-hover)';
            }}
            onMouseLeave={e => {
              if (!isActive) e.currentTarget.style.background = 'transparent';
            }}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            <span>{label}</span>
            {badge > 0 && (
              <span className="px-1.5 py-0.2 text-[9px] font-bold rounded-full bg-rose-500 text-white ml-0.5">
                {badge > 99 ? '99+' : badge}
              </span>
            )}
          </span>
        )}
      </NavLink>
    );
  };

  const AvatarButton = () => (
    <button
      onClick={() => setMenuOpen(prev => !prev)}
      className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden transition-all active:scale-95 flex-shrink-0"
      style={{
        background: 'var(--accent)',
        border: '2px solid var(--border)',
      }}
    >
      {logoUrl && !logoFailed ? (
        <img src={logoUrl} alt="" onError={() => setLogoFailed(true)} className="w-full h-full object-cover" />
      ) : (
        <Store className="w-4 h-4" style={{ color: '#ffffff' }} />
      )}
    </button>
  );

  const ActionButtons = () => (
    <div className="flex items-center gap-1 flex-shrink-0">
      <button
        onClick={() => setTheme(isDark ? 'slate' : 'slate-dark')}
        className="p-2 rounded-full transition-all active:scale-90"
        style={{ color: 'var(--topbar-subtext)' }}
        onMouseEnter={e => (e.currentTarget.style.background = 'var(--topbar-btn-hover)')}
        onMouseLeave={e => (e.currentTarget.style.background = '')}
        title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      >
        {isDark ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
      </button>

      <button
        onClick={() => setShowAiChat(true)}
        className="p-2 rounded-full transition-all active:scale-90"
        style={{ color: 'var(--topbar-subtext)' }}
        onMouseEnter={e => (e.currentTarget.style.background = 'var(--topbar-btn-hover)')}
        onMouseLeave={e => (e.currentTarget.style.background = '')}
        title="AI Assistant"
      >
        <Sparkles className="w-[18px] h-[18px]" />
      </button>
      <RefreshButton />
      <button
        onClick={() => setShowMessages(true)}
        className="relative p-2 rounded-full transition-all active:scale-90"
        style={{ color: 'var(--topbar-subtext)' }}
        onMouseEnter={e => (e.currentTarget.style.background = 'var(--topbar-btn-hover)')}
        onMouseLeave={e => (e.currentTarget.style.background = '')}
        title="Admin Messages"
      >
        <Bell className="w-[18px] h-[18px]" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500" />
        )}
      </button>
      <AvatarButton />
    </div>
  );

  return (
    <header
      className="topbar-panel sticky top-0 z-40 w-full"
      style={{
        background: 'var(--topbar-bg)',
        borderBottom: '1px solid var(--border)',
        height: 'auto',
      }}
    >
      {/* Desktop layout */}
      <div className="hidden md:flex items-center justify-between h-[var(--topbar-height,60px)] px-4 lg:px-6 gap-4">
        {/* LEFT: logo + bot name */}
        <div className="flex items-center gap-2.5 flex-shrink-0 min-w-0">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0"
            style={{ background: 'var(--accent-light)' }}
          >
            {logoUrl && !logoFailed ? (
              <img src={logoUrl} alt="" className="w-full h-full object-cover" onError={() => setLogoFailed(true)} />
            ) : (
              <span className="text-xs font-black" style={{ color: 'var(--accent-text)' }}>
                {botName.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <span
            className="text-sm font-bold truncate max-w-[120px] lg:max-w-[160px]"
            style={{ color: 'var(--topbar-text)' }}
          >
            {botName}
          </span>
          {user?.is_superadmin && (
            <div className="ml-1">
              <BotSwitcher />
            </div>
          )}
        </div>

        {/* CENTER: horizontal nav pills + All Apps button */}
        <nav className="flex items-center gap-1 overflow-x-auto scrollbar-hide flex-1 justify-center px-4">
          {primarySlateNav.map(({ to, icon, label, badgeKey }) => (
            <NavPill key={to} to={to} icon={icon} label={label} badgeKey={badgeKey} />
          ))}
          <button
            onClick={() => setShowAllApps(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold transition-all text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/20 shrink-0"
            title="All Navigation Pages"
          >
            <Grid className="w-4 h-4" />
            <span>More</span>
          </button>
        </nav>

        {/* RIGHT: actions */}
        <ActionButtons />
      </div>

      {/* Mobile layout */}
      <div className="md:hidden">
        {/* Row 1 */}
        <div className="flex items-center justify-between h-12 px-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0"
              style={{ background: 'var(--accent-light)' }}
            >
              {logoUrl && !logoFailed ? (
                <img src={logoUrl} alt="" className="w-full h-full object-cover" onError={() => setLogoFailed(true)} />
              ) : (
                <span className="text-[10px] font-black" style={{ color: 'var(--accent-text)' }}>
                  {botName.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <span className="text-sm font-bold truncate max-w-[120px]" style={{ color: 'var(--topbar-text)' }}>
              {botName}
            </span>
          </div>
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => setTheme(isDark ? 'slate' : 'slate-dark')}
              className="p-1.5 rounded-full"
              style={{ color: 'var(--topbar-subtext)' }}
            >
              {isDark ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
            </button>
            <button onClick={() => setShowAiChat(true)} className="p-1.5 rounded-full" style={{ color: 'var(--topbar-subtext)' }}>
              <Sparkles className="w-[18px] h-[18px]" />
            </button>
            <RefreshButton />
            <button onClick={() => setShowMessages(true)} className="relative p-1.5 rounded-full" style={{ color: 'var(--topbar-subtext)' }}>
              <Bell className="w-[18px] h-[18px]" />
              {unreadCount > 0 && <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500" />}
            </button>
            <button
              onClick={() => setShowAllApps(true)}
              className="p-1.5 rounded-full text-sky-600"
              title="All Navigation Pages"
            >
              <Grid className="w-[18px] h-[18px]" />
            </button>
            <AvatarButton />
          </div>
        </div>

        {/* Row 2: horizontal scrollable nav pills */}
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide px-2 pb-2">
          {primarySlateNav.map(({ to, icon, label, badgeKey }) => (
            <NavPill key={to} to={to} icon={icon} label={label} badgeKey={badgeKey} />
          ))}
        </div>
      </div>

      {/* All Apps Grid Modal */}
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
                    Slate Pro All Navigation Pages
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
                    <p className="text-xs font-black uppercase tracking-wider px-1 text-sky-600">
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
                            <item.icon className="w-4 h-4 shrink-0 text-sky-600" />
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

      {/* Admin Messages modal */}
      <AnimatePresence>
        {showMessages && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowMessages(false)} />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative rounded-3xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
            >
              <div className="flex items-center justify-between px-6 py-4 border-b shrink-0" style={{ borderColor: 'var(--border)' }}>
                <h3 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  <Mail className="w-5 h-5 text-amber-500" />
                  Messages
                </h3>
                <button
                  onClick={() => setShowMessages(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center active:scale-90 transition-transform"
                  style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6">
                {!adminMessages ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--text-muted)' }} />
                  </div>
                ) : adminMessages.length === 0 ? (
                  <div className="text-center py-12">
                    <Mail className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
                    <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>No messages</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {adminMessages.map(msg => (
                      <div
                        key={msg.id}
                        className="rounded-2xl p-4 relative"
                        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}
                      >
                        <button
                          onClick={() => setDeleteConfirm(msg.id)}
                          className="absolute top-3 right-3 p-1.5 rounded-lg transition-all"
                          style={{ color: '#f43f5e' }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap pr-8" style={{ color: 'var(--text-primary)' }}>
                          {linkifyText(msg.message_text.split(' ').slice(0, 15).join(' ') + (msg.message_text.split(' ').length > 15 ? '...' : ''))}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                            {msg.created_at ? new Date(msg.created_at).toLocaleString() : ''}
                          </span>
                          {!msg.is_read && (
                            <span className="text-[9px] font-bold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded-md">New</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Avatar menu dropdown */}
      <AnimatePresence>
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="absolute right-4 md:right-6 top-full mt-2 w-56 rounded-2xl shadow-xl py-1.5 z-50"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
            >
              <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                <p className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>{user?.email}</p>
                <p className="text-[10px] uppercase font-bold tracking-wider mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {user?.is_superadmin ? 'Superadmin' : 'Owner'}
                </p>
              </div>
              <button
                onClick={() => { setMenuOpen(false); setShowLogoutConfirm(true); }}
                className="w-full flex items-center gap-2.5 px-4 py-3 text-sm font-bold rounded-lg mx-1.5 transition-colors"
                style={{ color: '#f43f5e' }}
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={() => { setShowLogoutConfirm(false); logout(); }}
        title="Logout"
        message="Are you sure you want to logout?"
        confirmText="Logout"
        variant="danger"
      />
      <AiChatModal open={showAiChat} onClose={() => setShowAiChat(false)} />
    </header>
  );
}
