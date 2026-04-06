import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingBag, 
  Users, 
  MoreHorizontal,
  Radio,
  CreditCard,
  Settings,
  ShieldCheck,
  LogOut,
  X
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { motion, AnimatePresence } from 'motion/react';

export default function BottomNav() {
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const { logout } = useAuthStore();

  const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Home' },
    { to: '/orders', icon: Package, label: 'Orders' },
    { to: '/products', icon: ShoppingBag, label: 'Products' },
    { to: '/customers', icon: Users, label: 'Users' },
  ];

  const moreItems = [
    { to: '/broadcast', icon: Radio, label: 'Broadcast' },
    { to: '/payments', icon: CreditCard, label: 'Payments' },
    { to: '/settings', icon: Settings, label: 'Settings' },
    { to: '/subscription', icon: ShieldCheck, label: 'Subscription' },
  ];

  return (
    <>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t border-gray-100 px-2 py-1 z-50 shadow-[0_-8px_20px_rgba(0,0,0,0.05)] pb-safe">
        <div className="flex justify-around items-center h-16">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `
                flex flex-col items-center justify-center w-full h-full gap-1 transition-all active:scale-90
                ${isActive ? 'text-indigo-600' : 'text-gray-400'}
              `}
            >
              <div className={`p-1.5 rounded-xl transition-colors ${label === 'Home' ? '' : ''}`}>
                <Icon className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-tighter">{label}</span>
            </NavLink>
          ))}
          <button
            onClick={() => setIsMoreOpen(true)}
            className="flex flex-col items-center justify-center w-full h-full gap-1 text-gray-400 active:scale-90 transition-transform"
          >
            <div className="p-1.5 rounded-xl">
              <MoreHorizontal className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-tighter">More</span>
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {isMoreOpen && (
          <div className="fixed inset-0 z-[60] md:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMoreOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[32px] p-6 pb-12 shadow-2xl border-t border-gray-100"
            >
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">More Options</h3>
                  <p className="text-xs text-gray-500 mt-1">Additional management tools</p>
                </div>
                <button 
                  onClick={() => setIsMoreOpen(false)} 
                  className="p-2.5 bg-gray-100 rounded-full active:scale-90 transition-transform"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {moreItems.map(({ to, icon: Icon, label }) => (
                  <NavLink
                    key={to}
                    to={to}
                    onClick={() => setIsMoreOpen(false)}
                    className={({ isActive }) => `
                      flex flex-col items-start gap-3 p-4 rounded-[24px] border transition-all active:scale-[0.97]
                      ${isActive 
                        ? 'bg-indigo-50 border-indigo-100 text-indigo-600 shadow-sm' 
                        : 'bg-gray-50 border-gray-50 text-gray-600 hover:bg-gray-100'}
                    `}
                  >
                    <div className={`p-2 rounded-xl ${isActive ? 'bg-white shadow-sm' : 'bg-white shadow-sm'}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="font-bold text-sm">{label}</span>
                  </NavLink>
                ))}
                <button
                  onClick={() => {
                    setIsMoreOpen(false);
                    logout();
                  }}
                  className="flex items-center justify-center gap-3 p-4 rounded-[24px] border bg-rose-50 border-rose-100 text-rose-600 col-span-2 mt-2 font-bold active:scale-[0.98] transition-transform"
                >
                  <LogOut className="w-5 h-5" />
                  <span>Logout</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
