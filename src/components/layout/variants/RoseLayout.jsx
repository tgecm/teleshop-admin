import React, { useState } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../../store/authStore';
import RoseTopBar from './RoseTopBar';
import RoseSpine from './RoseSpine';
import BottomNav from '../BottomNav';
import NotificationPopup from '../../shared/NotificationPopup';
import PullToRefresh from '../../shared/PullToRefresh';
import { PageTransition } from '../../shared/PageSkeleton';

export default function RoseLayout() {
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
      className="h-full flex flex-col md:flex-row"
      style={{ background: 'var(--bg-base)' }}
    >
      {/* 5th Template Structural Feature 1: Ultra-slim 64px Icon Spine on Left */}
      <RoseSpine
        mobileOpen={sidebarOpen}
        onMobileClose={() => setSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* 5th Template Structural Feature 2: Executive Top Header Banner with ☀️/🌙 toggle */}
        <RoseTopBar onToggleSidebar={() => setSidebarOpen(s => !s)} />

        {/* 5th Template Structural Feature 3: Framed Elevated Canvas */}
        <main className="flex-1 overflow-y-auto scrollbar-hide scroll-smooth p-2 sm:p-3 md:p-4">
          <PullToRefresh onRefresh={handlePullRefresh}>
            <div
              className="py-4 px-3 sm:px-5 md:px-6 pb-6 md:pb-6 max-w-[1600px] mx-auto w-full rounded-3xl min-h-[calc(100vh-100px)]"
              style={{
                background: 'var(--card-bg)',
                border: '1px solid var(--border)',
                boxShadow: 'var(--card-shadow)',
              }}
            >
              <PageTransition key={location.pathname}>
                <Outlet />
              </PageTransition>
            </div>
          </PullToRefresh>
        </main>
      </div>

      <NotificationPopup />
    </div>
  );
}
