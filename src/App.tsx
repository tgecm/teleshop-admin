import React, { useEffect, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from './store/authStore';
import { useBotStore } from './store/botStore';
import { getMe } from './api/auth';
import { getBots } from './api/bots';
import { getAllBots } from './api/superadmin';
import { normalizeText } from './utils/normalizeText';

import ToastContainer from './components/shared/ToastContainer';
import SelectionToolbar from './components/shared/SelectionToolbar';
import HapticProvider from './components/shared/HapticProvider';
import NetworkStatus from './components/shared/NetworkStatus';

const Layout = React.lazy(() => import('./components/layout/Layout'));
const Login = React.lazy(() => import('./pages/Login'));
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Orders = React.lazy(() => import('./pages/Orders'));
const Products = React.lazy(() => import('./pages/Products'));
const Customers = React.lazy(() => import('./pages/Customers'));
const Broadcast = React.lazy(() => import('./pages/Broadcast'));
const Commands = React.lazy(() => import('./pages/Commands'));
const Payments = React.lazy(() => import('./pages/Payments'));
const Subscription = React.lazy(() => import('./pages/Subscription'));
const Settings = React.lazy(() => import('./pages/Settings'));
const Chats = React.lazy(() => import('./pages/Chats'));
const WebPanel = React.lazy(() => import('./pages/WebPanel'));
const PublicShop = React.lazy(() => import('./pages/PublicShop'));

const ADMIN_PATHS = new Set([
  'login', 'dashboard', 'orders', 'products', 'customers',
  'broadcast', 'commands', 'payments', 'subscription', 'settings',
  'chats', 'more',
]);

const PUBLIC_DOMAIN = 'telegramecommerce.shop';

function isCustomDomain() {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  return host !== PUBLIC_DOMAIN && host !== 'localhost' && host !== '127.0.0.1';
}

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

function SuspenseFallback() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-400 font-medium">Loading...</p>
      </div>
    </div>
  );
}

export default function App() {
  const { token, setUser, logout } = useAuthStore();
  const { bots, setBots, selectedBotId, setSelectedBot } = useBotStore();

  const publicSlug = (() => {
    if (typeof window === 'undefined') return null;
    const p = new URLSearchParams(window.location.search).get('p');
    if (!p) return null;
    const slug = p.replace(/^\//, '');
    if (!slug || ADMIN_PATHS.has(slug.split('/')[0]) || slug.startsWith('_')) return null;
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

  useEffect(() => {
    if (selectedBotId && bots.length > 0) {
      const bot = bots.find(b => b.id.toString() === selectedBotId?.toString());
      if (bot) {
        const name = normalizeText(bot.bot_full_name || bot.bot_username || 'Admin');
        document.title = `${name} Admin`;
      } else {
        document.title = 'Admin Panel';
      }
    } else {
      document.title = 'Admin Panel';
    }
  }, [selectedBotId, bots]);

  return (
    <QueryClientProvider client={queryClient}>
      <HapticProvider>
      <NetworkStatus />
      {isCustomDomain() ? (
        <>
          <PublicShop viaDomain />
          <ToastContainer />
          <SelectionToolbar />
        </>
      ) : publicSlug ? (
        <>
          <PublicShop slug={publicSlug} />
          <ToastContainer />
          <SelectionToolbar />
        </>
      ) : (
        <>
          <BrowserRouter basename="/">
            <Routes>
              <Route path="/login" element={
                <Suspense fallback={<SuspenseFallback />}><Login /></Suspense>
              } />
              <Route path="/manage-web-panel" element={
                <Suspense fallback={<SuspenseFallback />}><WebPanel /></Suspense>
              } />
              <Route path="/" element={
                <Suspense fallback={<SuspenseFallback />}><Layout /></Suspense>
              }>
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
    </HapticProvider>
    </QueryClientProvider>
  );
}
