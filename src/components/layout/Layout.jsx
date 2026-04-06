import React, { useState, useEffect } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import TopBar from './TopBar';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';
import { X, LogOut, LayoutDashboard, Package, ShoppingBag, Users, Radio, CreditCard, Settings, ShieldCheck } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';

export default function Layout() {
  const { token, logout } = useAuthStore();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const location = useLocation();

  // Close drawer on route change
  useEffect(() => {
    setIsDrawerOpen(false);
  }, [location.pathname]);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/orders', icon: Package, label: 'Orders' },
    { to: '/products', icon: ShoppingBag, label: 'Products' },
    { to: '/customers', icon: Users, label: 'Customers' },
    { to: '/broadcast', icon: Radio, label: 'Broadcast' },
    { to: '/payments', icon: CreditCard, label: 'Payments' },
    { to: '/subscription', icon: ShieldCheck, label: 'Subscription' },
    { to: '/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <TopBar onMenuClick={() => setIsDrawerOpen(true)} />
      
      <div className="flex flex-1 relative">
        <Sidebar />
        
        {/* Mobile Drawer */}
        <AnimatePresence>
          {isDrawerOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsDrawerOpen(false)}
                className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[50] md:hidden"
              />
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed inset-y-0 left-0 w-72 bg-white z-[60] md:hidden flex flex-col shadow-2xl"
              >
                <div className="p-6 flex items-center justify-between border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold text-xl">T</span>
                    </div>
                    <span className="text-gray-900 font-bold text-lg">TeleShop</span>
                  </div>
                  <button 
                    onClick={() => setIsDrawerOpen(false)}
                    className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
                
                <div className="flex-1 overflow-y-auto py-4 px-4 space-y-1">
                  {navItems.map(({ to, icon: Icon, label }) => (
                    <NavLink
                      key={to}
                      to={to}
                      className={({ isActive }) => `
                        flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all
                        ${isActive 
                          ? 'bg-indigo-50 text-indigo-600 shadow-sm border border-indigo-100' 
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}
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
                    className="flex items-center gap-3 w-full px-4 py-3.5 rounded-2xl text-sm font-bold text-rose-600 bg-rose-50 border border-rose-100 hover:bg-rose-100 transition-all"
                  >
                    <LogOut className="w-5 h-5" />
                    Logout
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <main className="flex-1 p-4 md:p-8 pb-24 md:pb-8 overflow-y-auto max-w-7xl mx-auto w-full">
          <Outlet />
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
