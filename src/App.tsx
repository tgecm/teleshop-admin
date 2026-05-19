import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from './store/authStore';
import { useBotStore } from './store/botStore';
import { getMe } from './api/auth';
import { getBots } from './api/bots';
import { getAllBots } from './api/superadmin';

import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Orders from './pages/Orders';
import Products from './pages/Products';
import Customers from './pages/Customers';
import Broadcast from './pages/Broadcast';
import Commands from './pages/Commands';
import Payments from './pages/Payments';
import Subscription from './pages/Subscription';
import Settings from './pages/Settings';
import Chats from './pages/Chats';
import WebPanel from './pages/WebPanel';
import PublicShop from './pages/PublicShop';
import ToastContainer from './components/shared/ToastContainer';
import SelectionToolbar from './components/shared/SelectionToolbar';

const ADMIN_PATHS = new Set([
  'login', 'dashboard', 'orders', 'products', 'customers',
  'broadcast', 'commands', 'payments', 'subscription', 'settings',
  'chats', 'more',
]);

function PublicRoute() {
  const pathname = window.location.pathname.replace(/^\//, '');
  if (!pathname || ADMIN_PATHS.has(pathname.split('/')[0]) || pathname.startsWith('_')) {
    return <Navigate to="/login" replace />;
  }
  return <PublicShop slug={pathname} />;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30000,
    },
  },
});

export default function App() {
  const { token, setUser, logout } = useAuthStore();
  const { setBots, selectedBotId, setSelectedBot } = useBotStore();

  // Intercept ?p=/slug from GitHub Pages 404 SPA redirect
  const publicSlug = (() => {
    if (typeof window === 'undefined') return null;
    const p = new URLSearchParams(window.location.search).get('p');
    if (!p) return null;
    const slug = p.replace(/^\//, '');
    if (!slug || ADMIN_PATHS.has(slug.split('/')[0]) || slug.startsWith('_')) return null;
    // Restore original URL so BrowserRouter can resolve admin-facing routes
    if (slug === 'manage-web-panel') {
      window.history.replaceState(null, '', '/' + slug);
      return null;
    }
    return slug;
  })();

  useEffect(() => {
    if (token) {
      const init = async () => {
        try {
          const me = await getMe();
          setUser(me);

          const botsData = me.is_superadmin ? await getAllBots() : await getBots();
          setBots(botsData);

          if (botsData.length > 0) {
            const currentBotExists = botsData.some(b => b.id === Number(selectedBotId));
            if (!currentBotExists) {
              setSelectedBot(botsData[0].id);
            }
          }
        } catch (err) {
          console.error('Initialization failed', err);
          if (err.response?.status === 401) {
            logout();
          }
        }
      };
      init();
    }
  }, [token]);

  return (
    <QueryClientProvider client={queryClient}>
      {publicSlug ? (
        <>
          <PublicShop slug={publicSlug} />
          <ToastContainer />
          <SelectionToolbar />
        </>
      ) : (
        <>
          <BrowserRouter basename="/">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/manage-web-panel" element={<WebPanel />} />

              <Route path="/" element={<Layout />}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="orders" element={<Orders />} />
                <Route path="products" element={<Products />} />
                <Route path="customers" element={<Customers />} />
                <Route path="broadcast" element={<Broadcast />} />
                <Route path="commands" element={<Commands />} />
                <Route path="payments" element={<Payments />} />
                <Route path="subscription" element={<Subscription />} />
                <Route path="settings" element={<Settings />} />
                <Route path="chats" element={<Chats />} />
                <Route path="more" element={<Navigate to="/broadcast" replace />} />
              </Route>

              <Route path="*" element={<PublicRoute />} />
            </Routes>
          </BrowserRouter>
          <ToastContainer />
          <SelectionToolbar />
        </>
      )}
    </QueryClientProvider>
  );
}
