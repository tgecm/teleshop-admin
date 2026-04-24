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
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-gray-100 z-50 shadow-[0_-4px_24px_rgba(0,0,0,0.06)] pb-safe">
        <div className="flex justify-around items-center h-[68px] px-1">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `
                flex flex-col items-center justify-center flex-1 h-full gap-1.5 transition-all active:scale-95
                ${isActive ? 'text-indigo-600' : 'text-gray-400'}
              `}
            >
              {({ isActive }) => (
                <>
                  <div className={`relative p-1.5 rounded-2xl transition-all ${isActive ? 'bg-indigo-50' : ''}`}>
                    <Icon className="w-[22px] h-[22px]" strokeWidth={isActive ? 2.5 : 1.8} />
                    {isActive && (
                      <motion.div 
                        layoutId="bottomNavIndicator"
                        className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-indigo-600"
                      />
                    )}
                  </div>
                  <span className={`text-[10px] font-semibold tracking-tight ${isActive ? 'text-indigo-600' : 'text-gray-400'}`}>{label}</span>
                </>
              )}
            </NavLink>
          ))}
          <button
            onClick={() => setIsMoreOpen(true)}
            className="flex flex-col items-center justify-center flex-1 h-full gap-1.5 text-gray-400 active:scale-95 transition-transform"
          >
            <div className="p-1.5 rounded-2xl">
              <MoreHorizontal className="w-[22px] h-[22px]" strokeWidth={1.8} />
            </div>
            <span className="text-[10px] font-semibold tracking-tight">More</span>
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
              className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[28px] p-5 pb-12 shadow-2xl border-t border-gray-100"
            >
              {/* Drag Handle */}
              <div className="flex justify-center mb-5">
                <div className="w-10 h-1 bg-gray-200 rounded-full" />
              </div>

              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">More Options</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Additional management tools</p>
                </div>
                <button 
                  onClick={() => setIsMoreOpen(false)} 
                  className="p-2.5 bg-gray-100 rounded-full active:scale-90 transition-transform"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {moreItems.map(({ to, icon: Icon, label }) => (
                  <NavLink
                    key={to}
                    to={to}
                    onClick={() => setIsMoreOpen(false)}
                    className={({ isActive }) => `
                      flex flex-col items-start gap-3 p-4 rounded-[20px] border transition-all active:scale-[0.97]
                      ${isActive 
                        ? 'bg-indigo-50 border-indigo-100 text-indigo-600 shadow-sm' 
                        : 'bg-gray-50 border-transparent text-gray-600 hover:bg-gray-100'}
                    `}
                  >
                    <div className="p-2 rounded-xl bg-white shadow-sm">
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
                  className="flex items-center justify-center gap-3 p-4 rounded-[20px] border bg-rose-50 border-rose-100 text-rose-600 col-span-2 mt-1 font-bold active:scale-[0.98] transition-transform"
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
