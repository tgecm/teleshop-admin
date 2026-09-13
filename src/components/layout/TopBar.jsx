import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuthStore } from '../../store/authStore';
import { LogOut, Mail, X, Loader2, Trash2, Menu, Store, Sparkles, DollarSign, ShoppingBag, Plus, Headphones } from 'lucide-react';
import BotSwitcher from '../shared/BotSwitcher';
import RefreshButton from '../shared/RefreshButton';
import AiChatModal from '../shared/AiChatModal';
import ConfirmDialog from '../shared/ConfirmDialog';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useBotStore } from '../../store/botStore';
import { normalizeText } from '../../utils/normalizeText';
import { getAdminUnreadMessagesCount, getAdminMessages, markAdminMessagesRead, deleteAdminMessage } from '../../api/superadmin';
import { getStats } from '../../api/stats';
import { getSalesDisplay } from '../../api/bots';
import { formatPrice } from '../../utils/formatPrice';
import { linkifyText } from '../../utils/linkify';
import { TOPBAR_THEMES, DEFAULT_TOPBAR_THEME } from '../../utils/topbarThemes';
import { getContentBlocks } from '../../api/contentBlocks';

export default function TopBar({ onToggleSidebar }) {
  const { user, logout, isStaff } = useAuthStore();
  const { bots, selectedBotId } = useBotStore();
  const queryClient = useQueryClient();
  const selectedBot = (bots || []).find(b => b.id.toString() === selectedBotId?.toString());
  const botName = selectedBot ? normalizeText(selectedBot.bot_full_name || selectedBot.bot_username || 'E-commerce Myanmar') : (user?.email?.split('@')[0] || 'E-commerce Myanmar');
  const [logoFailed, setLogoFailed] = useState(false);
  const logoUrl = selectedBot?.profile_picture || user?.profile_picture;
  useEffect(() => { setLogoFailed(false); }, [logoUrl]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showAiChat, setShowAiChat] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showMessages, setShowMessages] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deletingMsg, setDeletingMsg] = useState(false);
  const navigate = useNavigate();

  const [topbarColorKey, setTopbarColorKey] = useState(() => localStorage.getItem('topbar_color') || DEFAULT_TOPBAR_THEME);

  const { data: contentBlocks } = useQuery({
    queryKey: ['contentBlocks', selectedBotId],
    queryFn: () => getContentBlocks({ bot_id: Number(selectedBotId) }),
    enabled: !!selectedBotId,
    staleTime: 60000,
  });

  useEffect(() => {
    if (contentBlocks && Array.isArray(contentBlocks)) {
      const topbarBlock = contentBlocks.find(b => b.key === 'topbar_color');
      if (topbarBlock?.content_data?.color) {
        setTopbarColorKey(topbarBlock.content_data.color);
        localStorage.setItem('topbar_color', topbarBlock.content_data.color);
      }
    }
  }, [contentBlocks]);

  useEffect(() => {
    const handleTopbarColor = () => {
      setTopbarColorKey(localStorage.getItem('topbar_color') || DEFAULT_TOPBAR_THEME);
    };
    window.addEventListener('storage', handleTopbarColor);
    window.addEventListener('topbar_color_change', handleTopbarColor);
    return () => {
      window.removeEventListener('storage', handleTopbarColor);
      window.removeEventListener('topbar_color_change', handleTopbarColor);
    };
  }, []);

  const themeConfig = TOPBAR_THEMES[topbarColorKey] || TOPBAR_THEMES[DEFAULT_TOPBAR_THEME];

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

  const [salesPeriod, setSalesPeriod] = useState(() => localStorage.getItem('topbar_sales_period') || 'today');

  const { data: salesDisplayData } = useQuery({
    queryKey: ['sales-display', selectedBotId],
    queryFn: () => getSalesDisplay(selectedBotId),
    enabled: !!selectedBotId,
    refetchInterval: 3000,
  });

  const activeSalesPeriod = salesDisplayData?.sales_display || salesPeriod;

  useEffect(() => {
    const handleStorage = () => {
      setSalesPeriod(localStorage.getItem('topbar_sales_period') || 'today');
    };
    window.addEventListener('storage', handleStorage);
    window.addEventListener('topbar_sales_period_change', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('topbar_sales_period_change', handleStorage);
    };
  }, []);

  const { data: statsData } = useQuery({
    queryKey: ['topBarStats', selectedBotId],
    queryFn: () => getStats({ bot_id: Number(selectedBotId) }),
    enabled: !!selectedBotId && activeSalesPeriod !== 'disabled',
    refetchInterval: 15000,
  });

  const getSalesInfo = () => {
    if (activeSalesPeriod === 'disabled') return null;
    if (activeSalesPeriod === 'week') {
      const val = statsData?.weekly_revenue ?? 0;
      return { label: 'This Week', value: formatPrice(val) };
    }
    if (activeSalesPeriod === 'month') {
      const val = statsData?.monthly_revenue ?? 0;
      return { label: 'This Month', value: formatPrice(val) };
    }
    const val = statsData?.today_revenue ?? statsData?.total_revenue ?? 0;
    return { label: 'Today', value: formatPrice(val) };
  };

  const salesInfo = getSalesInfo();

  return (
    <header
      className={`topbar-panel sticky top-0 z-40 w-full relative transition-all duration-300 ${themeConfig.borderBottom || ''}`}
      style={{ background: themeConfig.bg, boxShadow: '0 2px 16px rgba(0,0,0,0.12)' }}
    >
      {/* Mobile header */}
      <div className="md:hidden grid grid-cols-[1fr_auto_1fr] items-center h-10 px-2">
        <button onClick={onToggleSidebar} className={`justify-self-start rounded-xl p-1.5 -ml-1.5 transition-colors ${themeConfig.iconColor}`}>
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex flex-col items-center justify-center min-w-0 max-w-[220px] mx-auto text-center leading-tight">
          <span className={`text-[11px] font-black tracking-wider uppercase truncate w-full ${themeConfig.textColor}`}>{botName}</span>
          {salesInfo && (
            <span className={`text-[9px] font-bold truncate w-full tracking-wide ${themeConfig.salesIconColor || 'text-emerald-400'}`}>
              {salesInfo.label}: {salesInfo.value}
            </span>
          )}
        </div>
        <div className="flex items-center justify-end gap-1">
          <button onClick={() => setShowAiChat(true)} className={`p-1.5 rounded-full transition-all active:scale-90 ${themeConfig.iconColor}`} title="AI Assistant"><Sparkles className="w-[18px] h-[18px]" /></button>
          <RefreshButton />
          <button
            onClick={() => setMenuOpen(prev => !prev)}
            className="w-7 h-7 rounded-full bg-indigo-500 border-2 border-white/20 flex items-center justify-center text-white overflow-hidden shadow-sm active:scale-95 transition-transform"
          >
            {logoUrl && !logoFailed ? (
              <img src={logoUrl} alt="" onError={() => setLogoFailed(true)} className="w-full h-full object-cover" />
            ) : (
              <Store className="w-[14px] h-[14px]" />
            )}
          </button>
        </div>
      </div>

      {/* Desktop header */}
      <div className="hidden md:flex items-center justify-between h-16 px-6 lg:px-8 gap-4">
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className={`text-xl lg:text-2xl font-black tracking-widest uppercase truncate ${themeConfig.textColor}`}>{botName}</span>
          {user?.is_superadmin && (
            <div className="max-w-[180px] xl:max-w-[260px]">
              <BotSwitcher />
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 lg:gap-3 flex-shrink-0">
          {/* Sales Metric Pill */}
          {salesInfo && (
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold shadow-sm backdrop-blur-md ${themeConfig.pillBg}`} title={`${salesInfo.label} Sales`}>
              <DollarSign className={`w-3.5 h-3.5 ${themeConfig.salesIconColor || 'text-emerald-400'}`} />
              <span>{salesInfo.label}: {salesInfo.value}</span>
            </div>
          )}

          <button onClick={() => setShowAiChat(true)} className={`p-2 rounded-full transition-all active:scale-90 ${themeConfig.iconColor}`} title="AI Assistant"><Sparkles className="w-[18px] h-[18px]" /></button>
          <RefreshButton />
          <div className="hidden md:flex flex-col items-end">
            <span className={`text-sm font-medium leading-none ${themeConfig.textColor}`}>{user?.email?.split('@')[0]}</span>
            <span className={`text-[10px] mt-1 uppercase font-bold tracking-wider ${themeConfig.subTextColor}`}>{user?.is_superadmin ? 'Superadmin' : 'Owner'}</span>
          </div>

          <button
            onClick={() => setMenuOpen(prev => !prev)}
            className="w-10 h-10 rounded-full bg-indigo-500 border-2 border-white/20 flex items-center justify-center text-white overflow-hidden shadow-sm active:scale-95 transition-transform"
          >
            {logoUrl && !logoFailed ? (
              <img src={logoUrl} alt="" onError={() => setLogoFailed(true)} className="w-full h-full object-cover" />
            ) : (
              <Store className="w-6 h-6" />
            )}
          </button>
        </div>
      </div>

      {/* Messages modal - shared */}
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

      {/* Avatar menu dropdown - shared */}
      <AnimatePresence>
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="absolute right-2 md:right-6 top-10 md:top-16 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 py-1.5 z-50"
            >
              <div className="px-4 py-3 border-b border-gray-50">
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
          </>
        )}
      </AnimatePresence>

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
      <AiChatModal open={showAiChat} onClose={() => setShowAiChat(false)} />
    </header>
  );
}

