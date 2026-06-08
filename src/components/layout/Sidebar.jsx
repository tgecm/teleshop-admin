import React from 'react';
import { NavLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
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
  LogOut
} from 'lucide-react';
import { normalizeText } from '../../utils/normalizeText';
import { useAuthStore } from '../../store/authStore';
import { useBotStore } from '../../store/botStore';
import { getUnreadCount } from '../../api/chats';
import { getPendingOrderCount } from '../../api/orders';

export default function Sidebar() {
  const { logout } = useAuthStore();
  const { bots, selectedBotId } = useBotStore();
  const selectedBot = bots.find(b => b.id.toString() === selectedBotId?.toString());
  const botName = selectedBot ? normalizeText(selectedBot.bot_full_name || selectedBot.bot_username || 'Shop') : 'Shop';

  const { data: unread } = useQuery({
    queryKey: ['unreadCount', selectedBotId],
    queryFn: () => getUnreadCount(Number(selectedBotId)),
    enabled: !!selectedBotId,
    refetchInterval: 15000,
  });

  const { data: pendingOrders } = useQuery({
    queryKey: ['pendingOrderCount', selectedBotId],
    queryFn: () => getPendingOrderCount(Number(selectedBotId)),
    enabled: !!selectedBotId,
    refetchInterval: 15000,
  });

  const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/orders', icon: Package, label: 'Orders' },
    { to: '/products', icon: ShoppingBag, label: 'Products' },
    { to: '/customers', icon: Users, label: 'Customers' },
    { to: '/chats', icon: MessageCircle, label: 'Chats' },
    { to: '/broadcast', icon: Radio, label: 'Broadcast' },
    { to: '/commands', icon: Send, label: 'Telegram Command' },
    { to: '/payments', icon: CreditCard, label: 'Payments' },
    { to: '/subscription', icon: ShieldCheck, label: 'Subscription' },
    { to: '/customization', icon: Palette, label: 'Customize' },
    { to: '/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 lg:w-72 bg-white border-r border-gray-100 h-full overflow-y-auto scrollbar-hide">
      {/* Logo area */}
      <div className="px-6 pt-6 pb-4 border-b border-gray-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md shadow-indigo-100">
            <LayoutDashboard className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-extrabold text-gray-900 tracking-tight truncate max-w-[160px]">{botName}</p>
            <p className="text-[9px] text-gray-400 font-semibold uppercase tracking-wider">Admin Panel</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto scrollbar-hide">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            data-haptic
            className={({ isActive }) => `
              flex items-center gap-3 px-4 py-2.5 lg:py-3 rounded-xl text-sm font-medium transition-all
              ${isActive
                ? 'bg-indigo-50 text-indigo-600 shadow-sm border border-indigo-100'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900 border border-transparent'}
            `}
          >
            <Icon className="w-[18px] h-[18px] lg:w-5 lg:h-5 flex-shrink-0" />
            <span>{label}</span>
            {(to === '/chats' && unread?.total > 0) || (to === '/orders' && pendingOrders?.pending > 0) ? (
              <span className="ml-auto bg-red-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] flex items-center justify-center rounded-full px-1">
                {to === '/chats'
                  ? (unread.total > 99 ? '99+' : unread.total)
                  : (pendingOrders.pending > 99 ? '99+' : pendingOrders.pending)}
              </span>
            ) : null}
          </NavLink>
        ))}
      </div>

      {/* Logout */}
      <div className="p-3 border-t border-gray-100">
        <button
          onClick={logout}
          data-haptic
          className="flex items-center gap-3 w-full px-4 py-2.5 lg:py-3 rounded-xl text-sm font-medium text-rose-600 hover:bg-rose-50 transition-all border border-transparent hover:border-rose-100"
        >
          <LogOut className="w-[18px] h-[18px] lg:w-5 lg:h-5" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
