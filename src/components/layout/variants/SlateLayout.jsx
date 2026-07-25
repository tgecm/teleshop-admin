import React, { useState } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../../store/authStore';
import SlateTopNav from './SlateTopNav';
import NotificationPopup from '../../shared/NotificationPopup';
import PullToRefresh from '../../shared/PullToRefresh';
import { PageTransition } from '../../shared/PageSkeleton';

export default function SlateLayout() {
  const { token } = useAuthStore();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  const handlePullRefresh = async () => {
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
    }
    const keep = ['token', 'auth-storage', 'selectedBotId'];
    Object.keys(localStorage).forEach(k => {
      if (!keep.includes(k)) localStorage.removeItem(k);
    });
    window.location.href = window.location.pathname + '?_hc=' + Date.now();
  };

  return (
    <div
      className="h-full flex flex-col"
      style={{ background: 'var(--bg-base)' }}
    >
      <SlateTopNav onToggleSidebar={() => setSidebarOpen(s => !s)} />

      <main className="flex-1 overflow-y-auto scrollbar-hide scroll-smooth">
        <PullToRefresh onRefresh={handlePullRefresh}>
          <div className="py-3 sm:py-4 md:py-6 px-3 sm:px-4 md:px-6 lg:px-8 pb-8 max-w-[1600px] mx-auto w-full">
            <PageTransition key={location.pathname}>
              <Outlet />
            </PageTransition>
          </div>
        </PullToRefresh>
      </main>

      <NotificationPopup />
    </div>
  );
}
