import React, { useState, useEffect } from 'react';
import { Outlet, Navigate, useLocation, useNavigationType } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import TopBar from './TopBar';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';
import { motion } from 'motion/react';

export default function Layout() {
  const { token } = useAuthStore();
  const location = useLocation();
  const navType = useNavigationType();
  const [animDir, setAnimDir] = useState(0);

  useEffect(() => {
    setAnimDir(navType === 'POP' ? -1 : 0);
  }, [location.pathname]);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-[100dvh] bg-gray-50 flex flex-col">
      <TopBar />

      <div className="flex flex-1 relative">
        <Sidebar />

        <main className="flex-1 px-3 sm:px-4 md:p-8 pb-nav md:pb-8 overflow-y-auto max-w-7xl mx-auto w-full scroll-smooth">
          <motion.div
            key={location.pathname}
            initial={animDir === -1 ? { opacity: 0, x: -24 } : {}}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
