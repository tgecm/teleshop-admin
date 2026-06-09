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
import AppVersionCheck from './components/AppVersionCheck';
import { useDisableDevTools } from './hooks/useDisableDevTools';

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
const GoogleAuthProxy = React.lazy(() => import('./pages/GoogleAuthProxy'));
const PublicAddProduct = React.lazy(() => import('./pages/PublicAddProduct'));
const PublicAddPayment = React.lazy(() => import('./pages/PublicAddPayment'));
const CustomerLogin = React.lazy(() => import('./pages/CustomerLogin'));
const CustomerDashboard = React.lazy(() => import('./pages/CustomerDashboard'));
const PublicEcommerce = React.lazy(() => import('./pages/PublicEcommerce'));
const Customization = React.lazy(() => import('./pages/Customization'));
const BotCustomization = React.lazy(() => import('./pages/BotCustomization'));
const NewsfeedAdmin = React.lazy(() => import('./pages/NewsfeedAdmin'));
const SuperadminDashboard = React.lazy(() => import('./pages/SuperadminDashboard'));
const SendMessage = React.lazy(() => import('./pages/SendMessage'));
const FAQs = React.lazy(() => import('./pages/FAQs'));
const StaffAccounts = React.lazy(() => import('./pages/StaffAccounts'));

const ADMIN_PATHS = new Set([
  'login', 'dashboard', 'orders', 'products', 'customers',
  'broadcast', 'commands', 'payments', 'subscription', 'settings',
  'chats', 'more', 'customization', 'bot-customization', 'newsfeed', 'superadmin', 'send-message', 'faqs', 'staff-accounts',
]);

const PUBLIC_DOMAIN = 'telegramecommerce.shop';

function isCustomDomain() {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  return host !== PUBLIC_DOMAIN
    && !host.endsWith(`.${PUBLIC_DOMAIN}`)
    && host !== 'localhost'
    && host !== '127.0.0.1';
}

function PublicRoute() {
  const pathname = window.location.pathname.replace(/^\//, '');

  const addProductMatch = pathname.match(/^(.+)-add-product-(\d{5})-(\d+)-(\d+)$/);
  if (addProductMatch) {
    return (
      <Suspense fallback={<SuspenseFallback />}>
        <PublicAddProduct username={addProductMatch[1]} code={addProductMatch[2]} secret1={addProductMatch[3]} secret2={addProductMatch[4]} />
      </Suspense>
    );
  }

  const addPaymentMatch = pathname.match(/^(.+)-add-new-payment-(\d{5})-(\d+)-(\d+)$/);
  if (addPaymentMatch) {
    return (
      <Suspense fallback={<SuspenseFallback />}>
        <PublicAddPayment username={addPaymentMatch[1]} code={addPaymentMatch[2]} secret1={addPaymentMatch[3]} secret2={addPaymentMatch[4]} />
      </Suspense>
    );
  }

  const customerLoginMatch = pathname.match(/^(.+)-user-dashboard-login$/);
  if (customerLoginMatch) {
    return (
      <Suspense fallback={<SuspenseFallback />}>
        <CustomerLogin shopSlug={customerLoginMatch[1]} />
      </Suspense>
    );
  }

  const customerDashboardMatch = pathname.match(/^(.+)-user-dashboard$/);
  if (customerDashboardMatch) {
    return (
      <Suspense fallback={<SuspenseFallback />}>
        <CustomerDashboard shopSlug={customerDashboardMatch[1]} />
      </Suspense>
    );
  }

  const ecommerceMatch = pathname.match(/^(.+)-ecommerce$/);
  if (ecommerceMatch) {
    return (
      <Suspense fallback={<SuspenseFallback />}>
        <PublicEcommerce slug={ecommerceMatch[1]} />
      </Suspense>
    );
  }

  if (!pathname || ADMIN_PATHS.has(pathname.split('/')[0]) || pathname.startsWith('_')) {
    return <Navigate to="/login" replace />;
  }
  const modeMatch = pathname.match(/^(.+)\/(telegram|ecommerce|guest)$/);
  if (modeMatch) {
    return <Suspense fallback={<SuspenseFallback />}><PublicEcommerce slug={modeMatch[1]} mode={modeMatch[2]} /></Suspense>;
  }
  return <Suspense fallback={<SuspenseFallback />}><PublicEcommerce slug={pathname} /></Suspense>;
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

function makeCircularFavicon(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const size = Math.min(img.width, img.height);
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext('2d');
      ctx.beginPath();
      ctx.arc(32, 32, 32, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(img, (img.width - size) / 2, (img.height - size) / 2, size, size, 0, 0, 64, 64);
      resolve(canvas.toDataURL());
    };
    img.onerror = () => resolve(url);
    img.src = url;
  });
}

export default function App() {
  const { token, setUser, logout } = useAuthStore();
  const { bots, setBots, selectedBotId, setSelectedBot } = useBotStore();

  useDisableDevTools();

  const addProductFromHash = (() => {
    if (typeof window === 'undefined') return null;
    const hash = window.location.hash.replace(/^#/, '');
    if (!hash.startsWith('add/')) return null;
    const m = hash.replace('add/', '').match(/^(.+)-(\d{5})-(\d+)-(\d+)$/);
    if (m) window.history.replaceState(null, '', window.location.pathname + window.location.search);
    return m ? { username: m[1], code: m[2], secret1: m[3], secret2: m[4] } : null;
  })();

  const addPaymentFromHash = (() => {
    if (typeof window === 'undefined') return null;
    const hash = window.location.hash.replace(/^#/, '');
    if (!hash.startsWith('add-payment/')) return null;
    const m = hash.replace('add-payment/', '').match(/^(.+)-(\d{5})-(\d+)-(\d+)$/);
    if (m) window.history.replaceState(null, '', window.location.pathname + window.location.search);
    return m ? { username: m[1], code: m[2], secret1: m[3], secret2: m[4] } : null;
  })();

  const addProductParam = (() => {
    if (typeof window === 'undefined') return null;
    const add = new URLSearchParams(window.location.search).get('add-product') || new URLSearchParams(window.location.search).get('add');
    if (!add) return null;
    const m = add.match(/^(.+)-(\d{5})-(\d+)-(\d+)$/);
    return m ? { username: m[1], code: m[2], secret1: m[3], secret2: m[4] } : null;
  })();

  const addPaymentParam = (() => {
    if (typeof window === 'undefined') return null;
    const v = new URLSearchParams(window.location.search).get('add-payment');
    if (!v) return null;
    const m = v.match(/^(.+)-(\d{5})-(\d+)-(\d+)$/);
    return m ? { username: m[1], code: m[2], secret1: m[3], secret2: m[4] } : null;
  })();

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
        document.title = name;
        const icon = document.querySelector('link[rel="icon"]');
        if (icon && bot.profile_picture) {
          makeCircularFavicon(bot.profile_picture).then((dataUrl) => {
            icon.setAttribute('href', dataUrl);
          });
        } else if (icon) {
          icon.setAttribute('href', '/vite.svg');
        }
      } else {
        document.title = 'E-commerce Myanmar';
      }
    } else {
      document.title = 'E-commerce Myanmar';
    }
  }, [selectedBotId, bots]);

  return (
    <QueryClientProvider client={queryClient}>
      <AppVersionCheck />
      <HapticProvider>
      <NetworkStatus />
      {addProductFromHash ? (
        <>
          <Suspense fallback={<SuspenseFallback />}>
            <PublicAddProduct username={addProductFromHash.username} code={addProductFromHash.code} secret1={addProductFromHash.secret1} secret2={addProductFromHash.secret2} />
          </Suspense>
          <ToastContainer />
          <SelectionToolbar />
        </>
      ) : addPaymentFromHash ? (
        <>
          <Suspense fallback={<SuspenseFallback />}>
            <PublicAddPayment username={addPaymentFromHash.username} code={addPaymentFromHash.code} secret1={addPaymentFromHash.secret1} secret2={addPaymentFromHash.secret2} />
          </Suspense>
          <ToastContainer />
          <SelectionToolbar />
        </>
      ) : addProductParam ? (
        <>
          <Suspense fallback={<SuspenseFallback />}>
            <PublicAddProduct username={addProductParam.username} code={addProductParam.code} secret1={addProductParam.secret1} secret2={addProductParam.secret2} />
          </Suspense>
          <ToastContainer />
          <SelectionToolbar />
        </>
      ) : addPaymentParam ? (
        <>
          <Suspense fallback={<SuspenseFallback />}>
            <PublicAddPayment username={addPaymentParam.username} code={addPaymentParam.code} secret1={addPaymentParam.secret1} secret2={addPaymentParam.secret2} />
          </Suspense>
          <ToastContainer />
          <SelectionToolbar />
        </>
      ) : publicSlug ? (
        <>
          <Suspense fallback={<SuspenseFallback />}>
            {(() => {
              const m = publicSlug.match(/^(.+)-add-product-(\d{5})-(\d+)-(\d+)$/);
              if (m) return <PublicAddProduct username={m[1]} code={m[2]} secret1={m[3]} secret2={m[4]} />;
              const pm = publicSlug.match(/^(.+)-add-new-payment-(\d{5})-(\d+)-(\d+)$/);
              if (pm) return <PublicAddPayment username={pm[1]} code={pm[2]} secret1={pm[3]} secret2={pm[4]} />;
              const cl = publicSlug.match(/^(.+)-user-dashboard-login$/);
              if (cl) return <CustomerLogin shopSlug={cl[1]} />;
              const cd = publicSlug.match(/^(.+)-user-dashboard$/);
              if (cd) return <CustomerDashboard shopSlug={cd[1]} />;
              const ec = publicSlug.match(/^(.+)-ecommerce$/);
              if (ec) return <PublicEcommerce slug={ec[1]} />;
              const modeSlug = publicSlug.match(/^(.+)\/(telegram|ecommerce|guest)$/);
              if (modeSlug) return <PublicEcommerce slug={modeSlug[1]} mode={modeSlug[2]} />;
              return <PublicEcommerce slug={publicSlug} />;
            })()}
          </Suspense>
          <ToastContainer />
          <SelectionToolbar />
        </>
      ) : window.location.hash.startsWith('#/auth/google/proxy') ? (
        <>
          <Suspense fallback={<SuspenseFallback />}>
            <GoogleAuthProxy />
          </Suspense>
          <ToastContainer />
          <SelectionToolbar />
        </>
      ) : isCustomDomain() ? (
        (() => {
          const modePath = window.location.pathname.replace(/\/+$/, '').replace(/^\//, '').match(/^(telegram|ecommerce|guest)$/);
          return (
            <>
              <Suspense fallback={<SuspenseFallback />}>
                <PublicEcommerce viaDomain mode={modePath?.[1] || undefined} />
              </Suspense>
              <ToastContainer />
              <SelectionToolbar />
            </>
          );
        })()
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
                <Route path="customization" element={<Customization />} />
                <Route path="bot-customization" element={<BotCustomization />} />
                <Route path="superadmin" element={<SuperadminDashboard />} />
                <Route path="send-message" element={<SendMessage />} />
                <Route path="faqs" element={<FAQs />} />
                <Route path="staff-accounts" element={<StaffAccounts />} />
                <Route path="more" element={<Navigate to="/broadcast" replace />} />
                <Route path="newsfeed" element={<NewsfeedAdmin />} />
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
