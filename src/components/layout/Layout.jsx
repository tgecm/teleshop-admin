import React, { useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import TopBar from './TopBar';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';
import NotificationPopup from '../shared/NotificationPopup';
import PullToRefresh from '../shared/PullToRefresh';

export default function Layout() {
  const { token } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="h-full bg-gray-50 flex flex-col">
      <TopBar onToggleSidebar={() => setSidebarOpen(s => !s)} />
      <NotificationPopup />

      <div className="flex flex-1 relative min-h-0">
        <Sidebar mobileOpen={sidebarOpen} onMobileClose={() => setSidebarOpen(false)} />

        <main className="flex-1 px-3 sm:px-4 md:px-8 lg:px-10 pb-nav md:pb-0 overflow-y-auto scrollbar-hide max-w-[1600px] mx-auto w-full scroll-smooth">
          <PullToRefresh onRefresh={async () => {
            if ('caches' in window) {
              const keys = await caches.keys();
              await Promise.all(keys.map(k => caches.delete(k)));
            }
            const keep = ['token', 'auth-storage', 'selectedBotId'];
            Object.keys(localStorage).forEach(k => {
              if (!keep.includes(k)) localStorage.removeItem(k);
            });
            window.location.href = window.location.pathname + '?_hc=' + Date.now();
          }}>
          <div className="py-4 md:py-6 lg:py-8">
            <Outlet />
          </div>
          </PullToRefresh>
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
