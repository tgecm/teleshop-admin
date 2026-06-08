import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
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
  LogOut,
  ChevronDown,
  Bot,
  Newspaper,
  Mail,
  HelpCircle,
  UserCog
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useBotStore } from '../../store/botStore';
import { getUnreadCount } from '../../api/chats';
import { getPendingOrderCount } from '../../api/orders';

export default function Sidebar() {
  const { user, logout, isStaff } = useAuthStore();
  const { bots, selectedBotId } = useBotStore();
  const selectedBot = bots.find(b => b.id.toString() === selectedBotId?.toString());

  const [telegramExpanded, setTelegramExpanded] = useState(false);
  const location = useLocation();

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

  const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    ...(user?.is_superadmin ? [{ to: '/send-message', icon: Mail, label: 'Send Message' }] : []),
    { to: '/orders', icon: Package, label: 'Orders' },
    { to: '/products', icon: ShoppingBag, label: 'Products' },
    { to: '/customers', icon: Users, label: 'Customers' },
    { to: '/chats', icon: MessageCircle, label: 'Chats' },
    { to: '/newsfeed', icon: Newspaper, label: 'Newsfeed' },
    { to: '/payments', icon: CreditCard, label: 'Payments' },
    ...(isStaff ? [] : [{ to: '/subscription', icon: ShieldCheck, label: 'Subscription' }]),
    { to: '/customization', icon: Palette, label: 'Customize' },
    ...(isStaff ? [] : [{ to: '/staff-accounts', icon: UserCog, label: 'Staff Accounts' }]),
    ...(isStaff ? [] : [{ to: '/faqs', icon: HelpCircle, label: 'FAQs' }]),
  ];

  const telegramItems = [
    { to: '/broadcast', icon: Radio, label: 'Broadcast' },
    { to: '/commands', icon: Send, label: 'Telegram Command' },
    { to: '/bot-customization', icon: Bot, label: 'Bot Customization' },
  ];

  const isTelegramActive = telegramItems.some(item => location.pathname.startsWith(item.to));

  return (
    <aside className="hidden md:flex flex-col w-64 lg:w-72 bg-white border-r border-gray-100 h-full overflow-y-auto scrollbar-hide">
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

        {/* Telegram E-commerce Section */}
        <div className="pt-3">
          {telegramExpanded && (
            <div className="ml-2 mb-1 space-y-0.5 border-l-2 border-indigo-100 pl-2">
              {telegramItems.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  data-haptic
                  className={({ isActive }) => `
                    flex items-center gap-3 px-4 py-2 lg:py-2.5 rounded-xl text-sm font-medium transition-all
                    ${isActive
                      ? 'bg-indigo-50 text-indigo-600 shadow-sm border border-indigo-100'
                      : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900 border border-transparent'}
                  `}
                >
                  <Icon className="w-4 h-4 lg:w-[18px] lg:h-[18px] flex-shrink-0" />
                  <span>{label}</span>
                </NavLink>
              ))}
            </div>
          )}
          <button
            onClick={() => setTelegramExpanded(!telegramExpanded)}
            data-haptic
            className={`flex items-center gap-3 w-full px-4 py-2.5 lg:py-3 rounded-xl text-sm font-medium transition-all border border-transparent ${
              isTelegramActive
                ? 'bg-indigo-50 text-indigo-600 border-indigo-100'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <Send className="w-[18px] h-[18px] lg:w-5 lg:h-5 flex-shrink-0" />
            <span className="flex-1 text-left">Telegram</span>
            <ChevronDown className={`w-4 h-4 transition-transform ${telegramExpanded ? 'rotate-0' : '-rotate-90'}`} />
          </button>
        </div>
      </div>

      {/* Settings (always at bottom) */}
      <div className="px-3 py-1">
        <NavLink
          to="/settings"
          data-haptic
          className={({ isActive }) => `
            flex items-center gap-3 px-4 py-2.5 lg:py-3 rounded-xl text-sm font-medium transition-all
            ${isActive
              ? 'bg-indigo-50 text-indigo-600 shadow-sm border border-indigo-100'
              : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900 border border-transparent'}
          `}
        >
          <Settings className="w-[18px] h-[18px] lg:w-5 lg:h-5 flex-shrink-0" />
          <span>Settings</span>
        </NavLink>
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
