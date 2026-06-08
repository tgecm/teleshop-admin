import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuthStore } from '../../store/authStore';
import { LogOut, User, MessageCircle, Package, Mail, X, Loader2, ChevronRight, Trash2 } from 'lucide-react';
import BotSwitcher from '../shared/BotSwitcher';
import RefreshButton from '../shared/RefreshButton';
import ConfirmDialog from '../shared/ConfirmDialog';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useBotStore } from '../../store/botStore';
import { normalizeText } from '../../utils/normalizeText';
import { getUnreadCount } from '../../api/chats';
import { getPendingOrderCount } from '../../api/orders';
import { getAdminUnreadMessagesCount, getAdminMessages, markAdminMessagesRead, deleteAdminMessage } from '../../api/superadmin';
import { linkifyText } from '../../utils/linkify';

export default function TopBar() {
  const { user, logout } = useAuthStore();
  const { bots, selectedBotId } = useBotStore();
  const queryClient = useQueryClient();
  const selectedBot = bots.find(b => b.id.toString() === selectedBotId?.toString());
  const botName = selectedBot ? normalizeText(selectedBot.bot_full_name || selectedBot.bot_username || 'Admin') : 'Admin';
  const [menuOpen, setMenuOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showMessages, setShowMessages] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deletingMsg, setDeletingMsg] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();

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
    if (!menuOpen) return;
    const handle = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('pointerdown', handle);
    return () => document.removeEventListener('pointerdown', handle);
  }, [menuOpen]);

  return (
    <header className="sticky top-0 z-40 w-full bg-indigo-600 shadow-[0_2px_16px_rgba(99,102,241,0.3)]">
      <div className="flex items-center justify-between h-10 md:h-16 px-2 md:px-6 lg:px-8 gap-1 md:gap-4">
        <div className="flex items-center gap-2.5">
          <span className="text-white text-base md:text-xl lg:text-2xl font-black tracking-widest uppercase truncate max-w-[130px] sm:max-w-[220px] md:max-w-[300px] lg:max-w-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]">{botName}</span>
        </div>

        {user?.is_superadmin && (
          <div className="flex-1 flex justify-center max-w-[140px] sm:max-w-[200px] md:max-w-none">
            <BotSwitcher />
          </div>
        )}

        <div className="flex items-center gap-1 md:gap-3 flex-shrink-0">
          <div className="relative">
            <button
              onClick={() => { setShowMessages(!showMessages); if (!showMessages) markAdminMessagesRead().then(() => queryClient.invalidateQueries({ queryKey: ['adminUnreadMessages'] })).catch(() => {}); }}
              className="relative text-white p-1.5 md:p-2.5 hover:bg-white/10 active:bg-white/15 rounded-xl transition-colors"
            >
              <Mail className="w-[20px] h-[20px] md:w-[22px] md:h-[22px]" strokeWidth={1.8} />
              {(unreadAdminMsgs?.count || 0) > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-amber-400 text-white text-[8px] font-bold min-w-[15px] h-[15px] flex items-center justify-center rounded-full px-0.5 leading-none shadow-sm">
                  {unreadAdminMsgs.count > 99 ? '99+' : unreadAdminMsgs.count}
                </span>
              )}
            </button>

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
                    className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden"
                  >
                    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
                      <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <Mail className="w-5 h-5 text-amber-500" />
                        Messages
                      </h3>
                      <button onClick={() => setShowMessages(false)} className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center active:scale-90 transition-transform">
                        <X className="w-4 h-4 text-gray-500" />
                      </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6">
                      {!adminMessages ? (
                        <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>
                      ) : adminMessages.length === 0 ? (
                        <div className="text-center py-12">
                          <Mail className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                          <p className="text-sm text-gray-400 font-medium">No messages</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {adminMessages.map(msg => (
                            <div key={msg.id} className="bg-amber-50/50 rounded-2xl p-4 border border-amber-100/50 relative">
                              <button
                                onClick={() => setDeleteConfirm(msg.id)}
                                className="absolute top-3 right-3 p-1.5 rounded-lg text-rose-400 hover:text-rose-600 hover:bg-rose-50 transition-all"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                              <p className="text-sm text-gray-900 leading-relaxed whitespace-pre-wrap pr-8">{linkifyText(msg.message_text.split(' ').slice(0, 15).join(' ') + (msg.message_text.split(' ').length > 15 ? '...' : ''))}</p>
                              <div className="flex items-center gap-2 mt-2">
                                <span className="text-[10px] text-gray-400">
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
          </div>
          <button
            onClick={() => navigate('/chats')}
            className="relative text-white p-1.5 md:p-2.5 hover:bg-white/10 active:bg-white/15 rounded-xl transition-colors"
          >
            <MessageCircle className="w-[20px] h-[20px] md:w-[22px] md:h-[22px]" strokeWidth={1.8} />
            {unread?.total > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[8px] font-bold min-w-[15px] h-[15px] flex items-center justify-center rounded-full px-0.5 leading-none shadow-sm">
                {unread.total > 99 ? '99+' : unread.total}
              </span>
            )}
          </button>
          <button
            onClick={() => navigate('/orders')}
            className="relative text-white p-1.5 md:p-2.5 hover:bg-white/10 active:bg-white/15 rounded-xl transition-colors"
          >
            <Package className="w-[20px] h-[20px] md:w-[22px] md:h-[22px]" strokeWidth={1.8} />
            {pendingOrders?.pending > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-amber-400 text-white text-[8px] font-bold min-w-[15px] h-[15px] flex items-center justify-center rounded-full px-0.5 leading-none shadow-sm">
                {pendingOrders.pending > 99 ? '99+' : pendingOrders.pending}
              </span>
            )}
          </button>
          <RefreshButton />
          <div className="hidden md:flex flex-col items-end">
            <span className="text-white text-sm font-medium leading-none">{user?.email?.split('@')[0]}</span>
            <span className="text-indigo-200 text-[10px] mt-1 uppercase font-bold tracking-wider">{user?.is_superadmin ? 'Superadmin' : 'Owner'}</span>
          </div>

          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(prev => !prev)}
              className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-indigo-500 border-2 border-white/20 flex items-center justify-center text-white overflow-hidden shadow-sm active:scale-95 transition-transform"
            >
              {user?.profile_picture ? (
                <img src={user.profile_picture} alt="Avatar" className="w-full h-full object-cover" />
              ) : user?.telegram_id ? (
                <img src={`https://t.me/i/userpic/320/${user.telegram_id}.jpg`} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <User className="w-[18px] h-[18px] md:w-6 md:h-6" />
              )}
            </button>

            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.95 }}
                  transition={{ duration: 0.15, ease: 'easeOut' }}
                  className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 py-1.5 z-50"
                >
                  <div className="px-4 py-3 border-b border-gray-50 md:hidden">
                    <p className="text-sm font-bold text-gray-900 truncate">{user?.email}</p>
                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mt-0.5">{user?.is_superadmin ? 'Superadmin' : 'Owner'}</p>
                  </div>
                  <div className="hidden md:block px-4 py-3 border-b border-gray-50">
                    <p className="text-sm font-bold text-gray-900 truncate">{user?.email}</p>
                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mt-0.5">{user?.is_superadmin ? 'Superadmin' : 'Owner'}</p>
                  </div>
                  <button
                    onClick={() => { setMenuOpen(false); setShowLogoutConfirm(true); }}
                    className="w-full flex items-center gap-2.5 px-4 py-3 text-sm font-bold text-rose-600 hover:bg-rose-50 active:bg-rose-100 transition-colors rounded-lg mx-1.5"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          >
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !deletingMsg && setDeleteConfirm(null)} />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white rounded-3xl shadow-2xl p-6 max-w-sm w-full mx-auto text-center"
            >
              <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-6 h-6 text-rose-500" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">Delete Message</h3>
              <p className="text-sm text-gray-500 mb-6">Are you sure you want to delete this message?</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteConfirm(null)} disabled={deletingMsg}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-2xl hover:bg-gray-200 transition-all text-sm disabled:opacity-50">
                  Cancel
                </button>
                <button onClick={async () => {
                  setDeletingMsg(true);
                  try {
                    await deleteAdminMessage(deleteConfirm);
                    queryClient.invalidateQueries({ queryKey: ['adminMessages'] });
                    queryClient.invalidateQueries({ queryKey: ['adminUnreadMessages'] });
                    setDeleteConfirm(null);
                  } catch {} finally {
                    setDeletingMsg(false);
                  }
                }} disabled={deletingMsg}
                  className="flex-1 py-2.5 bg-rose-500 text-white font-bold rounded-2xl hover:bg-rose-600 transition-all text-sm disabled:opacity-50 flex items-center justify-center gap-1.5">
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
    </header>
  );
}

