import { NavLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Users,
  MessageCircle,
  Settings
} from 'lucide-react';
import { useBotStore } from '../../store/botStore';
import { getUnreadCount } from '../../api/chats';
import { getPendingOrderCount } from '../../api/orders';

export default function BottomNav() {
  const { selectedBotId } = useBotStore();

  const { data: unread } = useQuery({
    queryKey: ['unreadCount', selectedBotId],
    queryFn: () => getUnreadCount(Number(selectedBotId)),
    enabled: !!selectedBotId,
    refetchInterval: 3000,
    refetchIntervalInBackground: true,
    staleTime: 0,
  });

  const { data: pendingOrders } = useQuery({
    queryKey: ['pendingOrderCount', selectedBotId],
    queryFn: () => getPendingOrderCount(Number(selectedBotId)),
    enabled: !!selectedBotId,
    refetchInterval: 3000,
    refetchIntervalInBackground: true,
    staleTime: 0,
  });

  const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Home' },
    { to: '/orders', icon: Package, label: 'Orders' },
    { to: '/products', icon: ShoppingBag, label: 'Products' },
    { to: '/customers', icon: Users, label: 'Users' },
    { to: '/chats', icon: MessageCircle, label: 'Chats' },
    { to: '/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <nav
      className="bottomnav-panel md:hidden fixed bottom-0 left-0 right-0 z-50 pb-safe"
      style={{
        background: 'var(--bottomnav-bg)',
        borderTop: '1px solid var(--bottomnav-border)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        boxShadow: '0 -4px 24px rgba(0,0,0,0.06)',
      }}
    >
      <div className="flex justify-around items-center h-[68px] px-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            data-haptic
            className="flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all active:scale-95"
          >
            {({ isActive }) => (
              <>
                <div
                  className={`relative p-1.5 rounded-xl transition-all`}
                  style={{ background: isActive ? 'var(--accent-light)' : 'transparent' }}
                >
                  <Icon
                    className="w-[22px] h-[22px]"
                    strokeWidth={isActive ? 2.5 : 1.8}
                    style={{ color: isActive ? 'var(--bottomnav-active)' : 'var(--bottomnav-inactive)' }}
                  />
                  {(to === '/chats' && unread?.total > 0) || (to === '/orders' && pendingOrders?.pending > 0) ? (
                    <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[8px] font-bold min-w-[14px] h-[14px] flex items-center justify-center rounded-full px-0.5 leading-none shadow-sm">
                      {to === '/chats'
                        ? (unread.total > 99 ? '99+' : unread.total)
                        : (pendingOrders.pending > 99 ? '99+' : pendingOrders.pending)}
                    </span>
                  ) : null}
                </div>
                <span
                  className="text-[10px] font-semibold tracking-tight"
                  style={{ color: isActive ? 'var(--bottomnav-active)' : 'var(--bottomnav-inactive)' }}
                >
                  {label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
