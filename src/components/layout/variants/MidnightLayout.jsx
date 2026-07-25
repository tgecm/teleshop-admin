import React, { useState, useEffect } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../../store/authStore';
import MidnightTopBar from './MidnightTopBar';
import MidnightSidebar from './MidnightSidebar';
import MidnightBottomNav from './MidnightBottomNav';
import NotificationPopup from '../../shared/NotificationPopup';
import PullToRefresh from '../../shared/PullToRefresh';
import { PageTransition } from '../../shared/PageSkeleton';

const SIDEBAR_COLLAPSED_KEY = 'sidebar-collapsed';

function getInitialCollapsed() {
  try {
    const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    return stored === 'true';
  } catch {
    return false;
  }
}

export default function MidnightLayout() {
  const { token } = useAuthStore();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(getInitialCollapsed);

  // Persist collapse state
  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(collapsed));
    } catch {}
  }, [collapsed]);

  const handleToggleCollapse = () => setCollapsed(prev => !prev);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  const handlePullRefresh = async () => {
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
    }
    const keep = ['token', 'auth-storage', 'selectedBotId', 'sidebar-collapsed'];
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
      <MidnightTopBar
        onToggleSidebar={() => setSidebarOpen(s => !s)}
        sidebarCollapsed={collapsed}
        onToggleCollapse={handleToggleCollapse}
      />

      <div className="flex flex-1 min-h-0">
        <MidnightSidebar
          mobileOpen={sidebarOpen}
          onMobileClose={() => setSidebarOpen(false)}
          collapsed={collapsed}
          onToggle={handleToggleCollapse}
        />

        <main className="flex-1 overflow-y-auto scrollbar-hide scroll-smooth">
          <PullToRefresh onRefresh={handlePullRefresh}>
            <div className="py-4 md:py-6 px-3 sm:px-4 md:px-6 lg:px-8 pb-nav md:pb-0 max-w-[1600px] mx-auto w-full">
              <PageTransition key={location.pathname}>
                <Outlet />
              </PageTransition>
            </div>
          </PullToRefresh>
        </main>
      </div>

      <MidnightBottomNav />
      <NotificationPopup />
    </div>
  );
}
