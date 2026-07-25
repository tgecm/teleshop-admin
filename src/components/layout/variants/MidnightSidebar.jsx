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
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';
import { useBotStore } from '../../../store/botStore';
import { getUnreadCount } from '../../../api/chats';
import { getPendingOrderCount, getQRMenuPendingCount } from '../../../api/orders';
import BotSwitcher from '../../shared/BotSwitcher';
import ConfirmDialog from '../../shared/ConfirmDialog';

const pageModules = {
  '/dashboard': () => import('../../../pages/Dashboard'),
  '/orders': () => import('../../../pages/Orders'),
  '/products': () => import('../../../pages/Products'),
  '/customers': () => import('../../../pages/Customers'),
  '/chats': () => import('../../../pages/Chats'),
  '/broadcast': () => import('../../../pages/Broadcast'),
  '/commands': () => import('../../../pages/Commands'),
  '/payments': () => import('../../../pages/Payments'),
  '/profit': () => import('../../../pages/Profit'),
  '/settings': () => import('../../../pages/Settings'),
  '/customization': () => import('../../../pages/Customization'),
  '/bot-customization': () => import('../../../pages/BotCustomization'),
  '/newsfeed': () => import('../../../pages/NewsfeedAdmin'),
  '/faqs': () => import('../../../pages/FAQs'),
  '/subscription': () => import('../../../pages/Subscription'),
  '/staff-accounts': () => import('../../../pages/StaffAccounts'),
  '/send-message': () => import('../../../pages/SendMessage'),
  '/subscribers': () => import('../../../pages/Subscribers'),
  '/qr-menu': () => import('../../../pages/QRMenuAdmin'),
  '/qr-menu/tables': () => import('../../../pages/QRMenuTables'),
  '/qr-menu/orders': () => import('../../../pages/QRMenuOrders'),
  '/qr-menu/dashboard': () => import('../../../pages/QRMenuDashboard'),
};

function prefetchPage(path) {
  if (pageModules[path]) pageModules[path]().catch(() => {});
}

/** Tooltip wrapper for collapsed sidebar icons */
function NavTooltip({ label, children, collapsed }) {
  const [visible, setVisible] = useState(false);
  if (!collapsed) return children;
  return (
    <div
      className="relative"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -4 }}
            transition={{ duration: 0.12 }}
            className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-2 z-[200]"
          >
            <div
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shadow-xl"
              style={{
                background: 'var(--bg-elevated)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border)',
              }}
            >
              {label}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function MidnightSidebar({ mobileOpen, onMobileClose, collapsed, onToggle }) {
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
    ...(user?.is_superadmin ? [{ to: '/subscribers', icon: Users, label: 'Subscribers' }] : []),
    { to: '/orders', icon: Package, label: 'Orders' },
    { to: '/products', icon: ShoppingBag, label: 'Products' },
    { to: '/customers', icon: Users, label: 'Customers' },
    { to: '/chats', icon: MessageCircle, label: 'Chats' },
    { to: '/newsfeed', icon: Newspaper, label: 'Newsfeed' },
    { to: '/payments', icon: CreditCard, label: 'Payments' },
    { to: '/customization', icon: Palette, label: 'Customize' },
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

  /** Renders a single nav link, adapts to collapsed/expanded desktop state */
  function NavItem({ to, icon: Icon, label, end = false, badge = null }) {
    return (
      <NavTooltip label={label} collapsed={collapsed}>
        <NavLink
          to={to}
          end={end}
          data-haptic
          onMouseEnter={() => prefetchPage(to)}
          className={({ isActive }) =>
            `theme-nav-item${isActive ? ' active' : ''} flex items-center gap-2.5 rounded-xl font-medium transition-all ${
              collapsed ? 'px-2 py-2.5 justify-center' : 'px-2.5 py-2'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <Icon
                className="w-[18px] h-[18px] flex-shrink-0"
                style={{ color: isActive ? 'var(--sidebar-text-active)' : 'var(--sidebar-text)' }}
              />
              {!collapsed && (
                <span
                  className="text-sm truncate"
                  style={{ color: isActive ? 'var(--sidebar-text-active)' : 'var(--sidebar-text)' }}
                >
                  {label}
                </span>
              )}
              {!collapsed && badge !== null && badge > 0 && (
                <span className="ml-auto bg-red-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] flex items-center justify-center rounded-full px-1">
                  {badge > 99 ? '99+' : badge}
                </span>
              )}
              {collapsed && badge !== null && badge > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500" />
              )}
            </>
          )}
        </NavLink>
      </NavTooltip>
    );
  }

  /** Section header for grouped nav — hidden in collapsed mode */
  function SectionHeader({ icon: Icon, label }) {
    if (collapsed) return null;
    return (
      <p
        className="px-2.5 pb-1.5 pt-3 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1"
        style={{ color: 'var(--sidebar-section-text)' }}
      >
        <Icon className="w-3 h-3" /> {label}
      </p>
    );
  }

  /** Full nav content block shared by mobile drawer and desktop sidebar */
  const navContent = (isMobile) => (
    <div className="flex-1 py-2 px-2 space-y-0.5 overflow-y-auto scrollbar-hide">
      {/* Main nav items */}
      {(isMobile ? mobileNavItems : navItems).map(({ to, icon: Icon, label }) => {
        const badge =
          to === '/chats' ? unread?.total :
          to === '/orders' ? pendingOrders?.pending :
          null;
        return (
          <div key={to} className="relative">
            <NavItem to={to} icon={Icon} label={label} badge={badge} />
          </div>
        );
      })}

      {/* QR Menu Section */}
      <div className={collapsed ? 'pt-2' : 'pt-1'}>
        <SectionHeader icon={Utensils} label="QR Menu" />
        <div
          className={`rounded-xl p-1 space-y-0.5 ${collapsed ? '' : ''}`}
          style={!collapsed ? { background: 'var(--sidebar-section-bg)', border: '1px solid var(--border-subtle)' } : {}}
        >
          {qrMenuItems.map(({ to, icon: Icon, label }) => {
            const badge = to === '/qr-menu/orders' ? qrPendingOrders?.pending : null;
            return (
              <div key={to} className="relative">
                <NavItem to={to} icon={Icon} label={label} end={to === '/qr-menu'} badge={badge} />
              </div>
            );
          })}
        </div>
      </div>

      {/* Telegram Section */}
      <div className={collapsed ? 'pt-2' : 'pt-1'}>
        <SectionHeader icon={Send} label="Telegram" />
        <div
          className={`rounded-xl p-1 space-y-0.5`}
          style={!collapsed ? { background: 'var(--sidebar-section-bg)', border: '1px solid var(--border-subtle)' } : {}}
        >
          {telegramItems.map(({ to, icon: Icon, label }) => (
            <NavItem key={to} to={to} icon={Icon} label={label} />
          ))}
        </div>
      </div>

      {/* FAQs & Subscription */}
      {!isStaff && (
        <>
          <NavItem to="/faqs" icon={HelpCircle} label="FAQs" />
          <NavItem to="/subscription" icon={ShieldCheck} label="Subscription" />
        </>
      )}

      {/* Settings */}
      <NavItem to="/settings" icon={Settings} label="Settings" />

      {/* Logout */}
      <NavTooltip label="Logout" collapsed={collapsed}>
        <button
          onClick={() => setShowLogoutConfirm(true)}
          data-haptic
          className={`flex items-center gap-2.5 w-full rounded-xl font-medium transition-all border border-transparent hover:border-rose-500/20 ${
            collapsed ? 'px-2 py-2.5 justify-center' : 'px-2.5 py-2'
          }`}
          style={{ color: '#f43f5e' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(244,63,94,0.08)')}
          onMouseLeave={e => (e.currentTarget.style.background = '')}
        >
          <LogOut className="w-[18px] h-[18px] flex-shrink-0" style={{ color: '#f43f5e' }} />
          {!collapsed && <span className="text-sm">Logout</span>}
        </button>
      </NavTooltip>

      <ConfirmDialog
        open={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={() => { setShowLogoutConfirm(false); logout(); }}
        title="Logout"
        message="Are you sure you want to logout?"
        confirmText="Logout"
        variant="danger"
      />
    </div>
  );

  const botName = selectedBot
    ? (selectedBot.bot_full_name || selectedBot.bot_username || 'Teleshop')
    : (user?.email?.split('@')[0] || 'Teleshop');
  const logoUrl = selectedBot?.profile_picture || user?.profile_picture;
  const [logoFailed, setLogoFailed] = useState(false);

  /** Logo / branding area at top of sidebar */
  const logoArea = (
    <div
      className={`flex items-center shrink-0 px-3 py-3 border-b ${collapsed ? 'justify-center' : 'gap-2.5 justify-between'}`}
      style={{ borderColor: 'var(--sidebar-border)' }}
    >
      <div className={`flex items-center ${collapsed ? '' : 'gap-2.5 min-w-0'}`}>
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0 ring-2"
          style={{ ringColor: 'var(--accent)', background: 'var(--accent-light)' }}
        >
          {logoUrl && !logoFailed ? (
            <img
              src={logoUrl}
              alt=""
              className="w-full h-full object-cover"
              onError={() => setLogoFailed(true)}
            />
          ) : (
            <span
              className="text-xs font-black"
              style={{ color: 'var(--accent-text)' }}
            >
              {botName.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        {!collapsed && (
          <span
            className="text-sm font-bold truncate"
            style={{ color: 'var(--sidebar-text-active)' }}
          >
            {botName}
          </span>
        )}
      </div>

      {/* Collapse toggle button (desktop only) */}
      {!collapsed && (
        <button
          onClick={onToggle}
          className="w-6 h-6 flex items-center justify-center rounded-lg transition-all flex-shrink-0"
          style={{ color: 'var(--sidebar-text)', background: 'var(--sidebar-hover-bg)' }}
          title="Collapse sidebar"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
      )}
      {collapsed && (
        <button
          onClick={onToggle}
          className="absolute -right-3 top-14 w-6 h-6 flex items-center justify-center rounded-full shadow-lg z-10 transition-all"
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          title="Expand sidebar"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
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
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={onMobileClose}
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="absolute left-0 top-0 bottom-0 w-64 flex flex-col overflow-y-auto"
              style={{
                background: 'var(--sidebar-bg)',
                borderRight: '1px solid var(--sidebar-border)',
              }}
            >
              {/* Mobile drawer header */}
              <div
                className="flex items-center justify-between px-3 py-3 border-b shrink-0"
                style={{ borderColor: 'var(--sidebar-border)' }}
              >
                <div className="flex items-center gap-2.5">
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
                  <span className="text-sm font-bold" style={{ color: 'var(--sidebar-text-active)' }}>
                    {botName}
                  </span>
                </div>
                <button
                  onClick={onMobileClose}
                  className="w-7 h-7 rounded-full flex items-center justify-center transition-all"
                  style={{ background: 'rgba(244,63,94,0.12)', color: '#f43f5e' }}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {user?.is_superadmin && (
                <div className="px-3 py-3 border-b shrink-0" style={{ borderColor: 'var(--sidebar-border)' }}>
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
        className="sidebar-panel hidden md:flex flex-col h-full overflow-y-auto scrollbar-hide relative"
        style={{
          background: 'var(--sidebar-bg)',
          borderRight: '1px solid var(--sidebar-border)',
          width: collapsed ? 'var(--sidebar-collapsed, 64px)' : 'var(--sidebar-width, 260px)',
          transition: 'width 0.25s cubic-bezier(0.4,0,0.2,1)',
          flexShrink: 0,
        }}
      >
        {logoArea}
        {user?.is_superadmin && !collapsed && (
          <div className="px-3 py-2 border-b shrink-0" style={{ borderColor: 'var(--sidebar-border)' }}>
            <BotSwitcher />
          </div>
        )}
        {navContent(false)}
      </aside>
    </>
  );
}
