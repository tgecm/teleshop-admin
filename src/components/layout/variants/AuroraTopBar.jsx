import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuthStore } from '../../../store/authStore';
import { useThemeStore } from '../../../store/themeStore';
import {
  LogOut, Mail, X, Loader2, Trash2, Menu, Store, Sparkles, Bell, Sun, Moon,
} from 'lucide-react';
import BotSwitcher from '../../shared/BotSwitcher';
import RefreshButton from '../../shared/RefreshButton';
import AiChatModal from '../../shared/AiChatModal';
import ConfirmDialog from '../../shared/ConfirmDialog';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useBotStore } from '../../../store/botStore';
import { normalizeText } from '../../../utils/normalizeText';
import {
  getAdminUnreadMessagesCount,
  getAdminMessages,
  markAdminMessagesRead,
  deleteAdminMessage,
} from '../../../api/superadmin';
import { linkifyText } from '../../../utils/linkify';

function getPageTitle(pathname) {
  const segment = pathname.split('/').filter(Boolean)[0] || 'dashboard';
  return segment
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export default function AuroraTopBar({ onToggleSidebar, sidebarCollapsed, onToggleCollapse }) {
  const { user, logout, isStaff } = useAuthStore();
  const { bots, selectedBotId } = useBotStore();
  const { theme, setTheme } = useThemeStore();
  const queryClient = useQueryClient();
  const isDark = theme === 'aurora-dark';

  const selectedBot = (bots || []).find(b => b.id.toString() === selectedBotId?.toString());
  const botName = selectedBot
    ? normalizeText(selectedBot.bot_full_name || selectedBot.bot_username || 'E-commerce Myanmar')
    : (user?.email?.split('@')[0] || 'E-commerce Myanmar');

  const location = useLocation();
  const navigate = useNavigate();
  const pageTitle = getPageTitle(location.pathname);

  const [logoFailed, setLogoFailed] = useState(false);
  const logoUrl = selectedBot?.profile_picture || user?.profile_picture;
  useEffect(() => { setLogoFailed(false); }, [logoUrl]);

  const [menuOpen, setMenuOpen] = useState(false);
  const [showAiChat, setShowAiChat] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showMessages, setShowMessages] = useState(false);
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

  useEffect(() => {
    if (showMessages && unreadAdminMsgs?.count > 0) {
      markAdminMessagesRead().then(() => {
        queryClient.invalidateQueries({ queryKey: ['adminUnreadMessages'] });
      }).catch(() => {});
    }
  }, [showMessages]);

  const unreadCount = unreadAdminMsgs?.count || 0;

  const AvatarButton = ({ size = 8 }) => (
    <button
      onClick={() => setMenuOpen(prev => !prev)}
      className={`w-${size} h-${size} rounded-full flex items-center justify-center overflow-hidden transition-all active:scale-95`}
      style={{
        background: 'var(--accent)',
        border: '2px solid var(--border)',
        flexShrink: 0,
      }}
    >
      {logoUrl && !logoFailed ? (
        <img src={logoUrl} alt="" onError={() => setLogoFailed(true)} className="w-full h-full object-cover" />
      ) : (
        <Store className="w-4 h-4 text-white" />
      )}
    </button>
  );

  const ActionButtons = () => (
    <div className="flex items-center gap-1">
      {/* Light / Dark Mode Toggle */}
      <button
        onClick={() => setTheme(isDark ? 'aurora' : 'aurora-dark')}
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

      <AvatarButton size={8} />
    </div>
  );

  return (
    <header
      className="topbar-panel sticky top-0 z-40 w-full"
      style={{
        background: 'var(--topbar-bg)',
        borderBottom: '1px solid var(--border-subtle)',
        height: 'var(--topbar-height, 56px)',
      }}
    >
      {/* Mobile header */}
      <div className="md:hidden flex items-center justify-between h-full px-3">
        <span className="text-base font-bold truncate" style={{ color: 'var(--topbar-text)', fontFamily: 'var(--font-heading)' }}>
          {pageTitle}
        </span>
        <div className="flex items-center justify-end gap-0.5">
          <button
            onClick={() => setTheme(isDark ? 'aurora' : 'aurora-dark')}
            className="p-1.5 rounded-full"
            style={{ color: 'var(--topbar-subtext)' }}
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDark ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
          </button>
          <button
            onClick={() => setShowAiChat(true)}
            className="p-1.5 rounded-full"
            style={{ color: 'var(--topbar-subtext)' }}
          >
            <Sparkles className="w-[18px] h-[18px]" />
          </button>
          <RefreshButton />
          <AvatarButton size={7} />
        </div>
      </div>

      {/* Desktop header */}
      <div className="hidden md:flex items-center justify-between h-full px-4 lg:px-6">
        <div className="flex items-center gap-3">
          <span
            className="text-base lg:text-lg font-bold"
            style={{ color: 'var(--topbar-text)', fontFamily: 'var(--font-heading)' }}
          >
            {pageTitle}
          </span>
        </div>

        <ActionButtons />
      </div>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.15 }}
              className="absolute right-3 top-14 w-60 rounded-2xl shadow-xl z-50 p-2 border overflow-hidden"
              style={{
                background: 'var(--card-bg)',
                borderColor: 'var(--border)',
                boxShadow: 'var(--card-shadow)',
              }}
            >
              <div className="p-3 border-b mb-1" style={{ borderColor: 'var(--border)' }}>
                <p className="text-xs font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                  {user?.email}
                </p>
                <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                  {user?.is_superadmin ? 'Super Admin' : isStaff ? 'Staff' : 'Merchant'}
                </p>
              </div>

              <button
                onClick={() => { setMenuOpen(false); navigate('/settings'); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-xl transition-all text-left"
                style={{ color: 'var(--text-primary)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                onMouseLeave={e => (e.currentTarget.style.background = '')}
              >
                Settings
              </button>

              <button
                onClick={() => { setMenuOpen(false); setShowLogoutConfirm(true); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all text-left mt-1"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AiChatModal isOpen={showAiChat} onClose={() => setShowAiChat(false)} />
      <ConfirmDialog
        isOpen={showLogoutConfirm}
        title="Sign Out"
        message="Are you sure you want to sign out?"
        confirmText="Sign Out"
        confirmVariant="danger"
        onConfirm={() => { setShowLogoutConfirm(false); logout(); }}
        onCancel={() => setShowLogoutConfirm(false)}
      />
    </header>
  );
}
