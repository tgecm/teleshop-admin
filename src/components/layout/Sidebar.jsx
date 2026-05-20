import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Users,
  MessageCircle,
  Radio,
  Terminal,
  CreditCard,
  Settings,
  ShieldCheck,
  LogOut
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

export default function Sidebar() {
  const { logout } = useAuthStore();
  
  const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/orders', icon: Package, label: 'Orders' },
    { to: '/products', icon: ShoppingBag, label: 'Products' },
    { to: '/customers', icon: Users, label: 'Customers' },
    { to: '/chats', icon: MessageCircle, label: 'Chats' },
    { to: '/broadcast', icon: Radio, label: 'Broadcast' },
    { to: '/commands', icon: Terminal, label: 'Commands' },
    { to: '/payments', icon: CreditCard, label: 'Payments' },
    { to: '/subscription', icon: ShieldCheck, label: 'Subscription' },
    { to: '/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-100 h-[calc(100vh-64px)] overflow-y-auto">
      <div className="flex-1 py-6 px-4 space-y-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            data-haptic
            className={({ isActive }) => `
              flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all
              ${isActive 
                ? 'bg-indigo-50 text-indigo-600 shadow-sm' 
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}
            `}
          >
            <Icon className="w-5 h-5" />
            {label}
          </NavLink>
        ))}
      </div>
      
      <div className="p-4 border-t border-gray-100">
        <button
          onClick={logout}
          data-haptic
          className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium text-rose-600 hover:bg-rose-50 transition-all"
        >
          <LogOut className="w-5 h-5" />
          Logout
        </button>
      </div>
    </aside>
  );
}
