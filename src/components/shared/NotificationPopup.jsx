import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'motion/react';
import { useBotStore } from '../../store/botStore';
import { useAuthStore } from '../../store/authStore';
import { getUnreadCount } from '../../api/chats';
import { getPendingOrderCount } from '../../api/orders';
import { getAdminUnreadMessagesCount } from '../../api/superadmin';
import { notificationSound } from '../../utils/sound';

export default function NotificationPopup() {
  const navigate = useNavigate();
  const { selectedBotId } = useBotStore();
  const { user } = useAuthStore();
  const [notice, setNotice] = useState(null);
  const timerRef = useRef(null);
  const prevUnread = useRef(null);
  const prevPending = useRef(null);
  const prevAdmin = useRef(null);

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
    enabled: user?.is_superadmin,
    refetchInterval: 3000,
  });

  const pop = (type, msg, path) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    notificationSound();
    setNotice({ type, msg, path });
    timerRef.current = setTimeout(() => setNotice(null), 3000);
  };

  useEffect(() => {
    const curr = unread?.total ?? 0;
    if (prevUnread.current !== null && curr > prevUnread.current) {
      pop('message', 'New message', '/chats');
    }
    prevUnread.current = curr;
  }, [unread?.total]);

  useEffect(() => {
    const curr = pendingOrders?.pending ?? 0;
    if (prevPending.current !== null && curr > prevPending.current) {
      pop('order', 'New order', '/orders');
    }
    prevPending.current = curr;
  }, [pendingOrders?.pending]);

  useEffect(() => {
    const curr = unreadAdminMsgs?.count ?? 0;
    if (prevAdmin.current !== null && curr > prevAdmin.current) {
      pop('admin', 'New message from Superadmin', '/send-message');
    }
    prevAdmin.current = curr;
  }, [unreadAdminMsgs?.count]);

  const tap = () => {
    if (!notice) return;
    navigate(notice.path);
    setNotice(null);
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  const icons = { order: '📦', message: '💬', admin: '📧' };

  return (
    <AnimatePresence>
      {notice && (
        <motion.div
          initial={{ y: -60, opacity: 0, scaleX: 0.9 }}
          animate={{ y: 0, opacity: 1, scaleX: 1 }}
          exit={{ y: -60, opacity: 0, scaleX: 0.9 }}
          transition={{ type: 'spring', damping: 20, stiffness: 260 }}
          onClick={tap}
          className="fixed top-2 left-0 right-0 z-[100] flex justify-center pointer-events-none"
        >
          <div className="pointer-events-auto bg-black/90 text-white rounded-full shadow-2xl px-5 py-2.5 flex items-center gap-2.5 cursor-pointer active:scale-95 transition-transform max-w-[280px] border border-white/10">
            <span className="text-sm">{icons[notice.type] || '🔔'}</span>
            <span className="text-sm font-semibold whitespace-nowrap">{notice.msg}</span>
            <span className="text-[9px] text-white/40 font-medium pl-1 border-l border-white/10">Tap</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
