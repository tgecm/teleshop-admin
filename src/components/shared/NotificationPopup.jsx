import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'motion/react';
import { useBotStore } from '../../store/botStore';
import { getUnreadCount } from '../../api/chats';
import { getPendingOrderCount } from '../../api/orders';
import { getAdminUnreadMessagesCount } from '../../api/superadmin';
import { notificationSound } from '../../utils/sound';

export default function NotificationPopup() {
  const navigate = useNavigate();
  const { selectedBotId } = useBotStore();
  const [notice, setNotice] = useState(null);
  const timerRef = useRef(null);
  const prevUnread = useRef(null);
  const prevPending = useRef(null);
  const prevAdmin = useRef(null);
  const initUnread = useRef(false);
  const initPending = useRef(false);
  const initAdmin = useRef(false);

  const { data: unread, isFetching: fetchingUnread } = useQuery({
    queryKey: ['unreadCount', selectedBotId],
    queryFn: () => getUnreadCount(Number(selectedBotId)),
    enabled: !!selectedBotId,
    refetchInterval: 3000,
    refetchIntervalInBackground: true,
    staleTime: 0,
  });

  const { data: pendingOrders, isFetching: fetchingOrders } = useQuery({
    queryKey: ['pendingOrderCount', selectedBotId],
    queryFn: () => getPendingOrderCount(Number(selectedBotId)),
    enabled: !!selectedBotId,
    refetchInterval: 3000,
    refetchIntervalInBackground: true,
    staleTime: 0,
  });

  const { data: unreadAdminMsgs, isFetching: fetchingAdmin } = useQuery({
    queryKey: ['adminUnreadMessages'],
    queryFn: getAdminUnreadMessagesCount,
    refetchInterval: 3000,
    refetchIntervalInBackground: true,
    staleTime: 0,
  });

  const pop = (type, msg, path) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    notificationSound();
    setNotice({ type, msg, path });
    timerRef.current = setTimeout(() => setNotice(null), 4000);
  };

  useEffect(() => {
    const curr = unread?.total ?? 0;
    if (initUnread.current && curr > prevUnread.current) {
      pop('message', 'New message', '/chats');
    }
    if (unread !== undefined) initUnread.current = true;
    prevUnread.current = curr;
  }, [unread?.total, fetchingUnread]);

  useEffect(() => {
    const curr = pendingOrders?.pending ?? 0;
    if (initPending.current && curr > prevPending.current) {
      pop('order', 'New order', '/orders');
    }
    if (pendingOrders !== undefined) initPending.current = true;
    prevPending.current = curr;
  }, [pendingOrders?.pending, fetchingOrders]);

  useEffect(() => {
    const curr = unreadAdminMsgs?.count ?? 0;
    if (initAdmin.current && curr > prevAdmin.current) {
      pop('admin', 'E-commerce Support', '/chats');
    }
    if (unreadAdminMsgs !== undefined) initAdmin.current = true;
    prevAdmin.current = curr;
  }, [unreadAdminMsgs?.count, fetchingAdmin]);

  const tap = () => {
    if (!notice) return;
    navigate(notice.path);
    setNotice(null);
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  const icons = { order: '📦', message: '💬', admin: '📧' };
  const subtitles = { order: 'Tap to view order', message: 'Tap to open chat', admin: 'Tap to open chat' };

  return (
    <AnimatePresence>
      {notice && (
        <motion.div
          initial={{ height: 32, opacity: 0, y: -20, scaleX: 0.6 }}
          animate={{ height: 'auto', opacity: 1, y: 0, scaleX: 1 }}
          exit={{ height: 32, opacity: 0, y: -20, scaleX: 0.6 }}
          transition={{ type: 'spring', damping: 22, stiffness: 280 }}
          onClick={tap}
          className="fixed top-3 left-0 right-0 z-[100] flex justify-center pointer-events-none px-6"
        >
          <motion.div
            layout
            transition={{ type: 'spring', damping: 22, stiffness: 280 }}
            className="pointer-events-auto bg-black/95 text-white rounded-2xl shadow-2xl px-4 py-3 flex items-center gap-3 cursor-pointer active:scale-[0.98] transition-transform border border-white/10 max-w-sm w-full backdrop-blur-xl"
          >
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-base flex-shrink-0 shadow-lg shadow-indigo-500/20">
              {icons[notice.type] || '🔔'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold leading-tight">{notice.msg}</p>
              <p className="text-[11px] text-white/40 font-medium mt-0.5">{subtitles[notice.type] || 'Tap to view'}</p>
            </div>
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse flex-shrink-0 shadow-sm shadow-green-400/50" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
