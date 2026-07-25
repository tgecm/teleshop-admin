import React, { useState } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../../store/authStore';
import AuroraTopBar from './AuroraTopBar';
import AuroraDockNav from './AuroraDockNav';
import MidnightSidebar from './MidnightSidebar';
import NotificationPopup from '../../shared/NotificationPopup';
import PullToRefresh from '../../shared/PullToRefresh';
import { PageTransition } from '../../shared/PageSkeleton';

export default function AuroraLayout() {
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
      {/* Aurora Top Bar with ☀️/🌙 mode toggle & working mobile menu */}
      <AuroraTopBar onToggleSidebar={() => setSidebarOpen(s => !s)} />

      <div className="flex flex-1 min-h-0 relative">
        {/* Mobile Slide-out Drawer */}
        <MidnightSidebar
          mobileOpen={sidebarOpen}
          onMobileClose={() => setSidebarOpen(false)}
          collapsed={true}
        />

        {/* Main Content Frame */}
        <main className="flex-1 overflow-y-auto scrollbar-hide scroll-smooth">
          <PullToRefresh onRefresh={handlePullRefresh}>
            <div className="py-4 md:py-6 px-3 sm:px-4 md:px-6 lg:px-8 pb-24 max-w-[1600px] mx-auto w-full">
              <PageTransition key={location.pathname}>
                <Outlet />
              </PageTransition>
            </div>
          </PullToRefresh>
        </main>
      </div>

      {/* macOS Floating Glass Island Dock */}
      <AuroraDockNav />
      <NotificationPopup />
    </div>
  );
}
