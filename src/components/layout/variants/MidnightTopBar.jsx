import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuthStore } from '../../../store/authStore';
import {
  LogOut, Mail, X, Loader2, Trash2, Menu, Store, Sparkles, Bell, ChevronLeft, ChevronRight,
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

/** Derive a human-readable page title from the pathname */
function getPageTitle(pathname) {
  const segment = pathname.split('/').filter(Boolean)[0] || 'dashboard';
  return segment
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export default function MidnightTopBar({ onToggleSidebar, sidebarCollapsed, onToggleCollapse }) {
  const { user, logout, isStaff } = useAuthStore();
  const { bots, selectedBotId } = useBotStore();
  const queryClient = useQueryClient();
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

  // Mark messages as read when panel opens
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
        <Store className="w-4 h-4" style={{ color: 'var(--accent-text)' }} />
      )}
    </button>
  );

  const ActionButtons = () => (
    <div className="flex items-center gap-1">
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

      {/* Notification bell */}
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
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--border-subtle)',
        height: 'var(--topbar-height, 52px)',
      }}
    >
      {/* Mobile header */}
      <div
        className="md:hidden grid grid-cols-[1fr_auto_1fr] items-center h-full px-2"
      >
        <button
          onClick={onToggleSidebar}
          className="justify-self-start p-2 rounded-xl transition-all active:scale-90"
          style={{ color: 'var(--topbar-text)' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--topbar-btn-hover)')}
          onMouseLeave={e => (e.currentTarget.style.background = '')}
        >
          <Menu className="w-5 h-5" />
        </button>
        <span
          className="text-center text-sm font-bold truncate"
          style={{ color: 'var(--topbar-text)' }}
        >
          {pageTitle}
        </span>
        <div className="flex items-center justify-end gap-0.5">
          <button
            onClick={() => setShowAiChat(true)}
            className="p-1.5 rounded-full transition-all active:scale-90"
            style={{ color: 'var(--topbar-subtext)' }}
          >
            <Sparkles className="w-[18px] h-[18px]" />
          </button>
          <RefreshButton />
          <button
            onClick={() => setMenuOpen(prev => !prev)}
            className="w-7 h-7 rounded-full flex items-center justify-center overflow-hidden active:scale-95 transition-transform"
            style={{ background: 'var(--accent)', border: '2px solid var(--border)' }}
          >
            {logoUrl && !logoFailed ? (
              <img src={logoUrl} alt="" onError={() => setLogoFailed(true)} className="w-full h-full object-cover" />
            ) : (
              <Store className="w-[14px] h-[14px]" style={{ color: 'var(--accent-text)' }} />
            )}
          </button>
        </div>
      </div>

      {/* Desktop header */}
      <div className="hidden md:flex items-center justify-between h-full px-4 lg:px-6 gap-4">
        {/* Left: collapse toggle + page title */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onToggleCollapse}
            className="p-1.5 rounded-lg transition-all flex-shrink-0"
            style={{ color: 'var(--topbar-subtext)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--topbar-btn-hover)')}
            onMouseLeave={e => (e.currentTarget.style.background = '')}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed
              ? <ChevronRight className="w-4 h-4" />
              : <ChevronLeft className="w-4 h-4" />}
          </button>
          <h1
            className="text-base font-bold truncate"
            style={{ color: 'var(--topbar-text)' }}
          >
            {pageTitle}
          </h1>
        </div>

        {/* Center: bot switcher for superadmin */}
        {user?.is_superadmin && (
          <div className="flex-1 flex justify-center max-w-[200px] md:max-w-none">
            <BotSwitcher />
          </div>
        )}

        {/* Right: actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="hidden md:flex flex-col items-end mr-1">
            <span className="text-sm font-medium leading-none" style={{ color: 'var(--topbar-text)' }}>
              {user?.email?.split('@')[0]}
            </span>
            <span className="text-[10px] mt-1 uppercase font-bold tracking-wider" style={{ color: 'var(--topbar-subtext)' }}>
              {user?.is_superadmin ? 'Superadmin' : 'Owner'}
            </span>
          </div>
          <ActionButtons />
        </div>
      </div>

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
                          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(244,63,94,0.08)')}
                          onMouseLeave={e => (e.currentTarget.style.background = '')}
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
              className="absolute right-2 md:right-6 top-full mt-2 w-56 rounded-2xl shadow-xl py-1.5 z-50"
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
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(244,63,94,0.08)')}
                onMouseLeave={e => (e.currentTarget.style.background = '')}
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Delete message confirm */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          >
            <div
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => !deletingMsg && setDeleteConfirm(null)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative rounded-3xl shadow-2xl p-6 max-w-sm w-full mx-auto text-center"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
            >
              <div className="w-12 h-12 rounded-full bg-rose-500/10 flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-6 h-6 text-rose-500" />
              </div>
              <h3 className="text-lg font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Delete Message</h3>
              <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>Are you sure you want to delete this message?</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  disabled={deletingMsg}
                  className="flex-1 py-2.5 font-bold rounded-2xl transition-all text-sm disabled:opacity-50"
                  style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    setDeletingMsg(true);
                    try {
                      await deleteAdminMessage(deleteConfirm);
                      queryClient.invalidateQueries({ queryKey: ['adminMessages'] });
                      queryClient.invalidateQueries({ queryKey: ['adminUnreadMessages'] });
                      setDeleteConfirm(null);
                    } catch {} finally {
                      setDeletingMsg(false);
                    }
                  }}
                  disabled={deletingMsg}
                  className="flex-1 py-2.5 bg-rose-500 text-white font-bold rounded-2xl hover:bg-rose-600 transition-all text-sm disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {deletingMsg ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
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
