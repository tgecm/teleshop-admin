import React, { useEffect, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from './store/authStore';
import { useBotStore } from './store/botStore';
import { getMe } from './api/auth';
import { getBots } from './api/bots';
import { getAllBots } from './api/superadmin';
import { normalizeText } from './utils/normalizeText';
import { updatePwaManifest } from './utils/dynamicManifest';
import { preloadImage } from './utils/imageCache';
import { NotificationToast } from './components/NotificationToast';
import VpnWarningModal from './components/VpnWarningModal';
import ToastContainer from './components/shared/ToastContainer';
import SelectionToolbar from './components/shared/SelectionToolbar';
import ErrorBoundary from './components/shared/ErrorBoundary';
import HapticProvider from './components/shared/HapticProvider';
import NetworkStatus from './components/shared/NetworkStatus';
import PermissionGuard from './components/shared/PermissionGuard';
import PlanGate from './components/shared/PlanGate';
import AppVersionCheck from './components/AppVersionCheck';
import AppSplashScreen from './components/AppSplashScreen';
import { useDisableDevTools } from './hooks/useDisableDevTools';
import { useAppBadge } from './hooks/useAppBadge';
import { useBackgroundSync } from './hooks/useBackgroundSync';

const ThemedLayout = React.lazy(() => import('./components/layout/ThemedLayout'));

const PublicLayout = React.lazy(() => import('./components/layout/PublicLayout'));
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
const AiAgent = React.lazy(() => import('./pages/AiAgent'));
const BotCustomization = React.lazy(() => import('./pages/BotCustomization'));
const NewsfeedAdmin = React.lazy(() => import('./pages/NewsfeedAdmin'));
const SuperadminDashboard = React.lazy(() => import('./pages/SuperadminDashboard'));
const SendMessage = React.lazy(() => import('./pages/SendMessage'));
const Subscribers = React.lazy(() => import('./pages/Subscribers'));
const FAQs = React.lazy(() => import('./pages/FAQs'));
const StaffAccounts = React.lazy(() => import('./pages/StaffAccounts'));
const Homepage = React.lazy(() => import('./pages/Homepage'));
const QRMenuAdmin = React.lazy(() => import('./pages/QRMenuAdmin'));
const QRMenuOrders = React.lazy(() => import('./pages/QRMenuOrders'));
const QRMenuTables = React.lazy(() => import('./pages/QRMenuTables'));
const QRMenuDashboard = React.lazy(() => import('./pages/QRMenuDashboard'));
const Profit = React.lazy(() => import('./pages/Profit'));
const PublicQRMenu = React.lazy(() => import('./pages/PublicQRMenu'));
const QRMenuCustomerDashboard = React.lazy(() => import('./pages/QRMenuCustomerDashboard'));
const LiveTokenDisplay = React.lazy(() => import('./pages/LiveTokenDisplay'));

const ADMIN_PATHS = new Set([
  'login', 'manage-web-panel', 'dashboard', 'orders', 'products', 'customers',
  'broadcast', 'commands', 'payments', 'profit', 'subscription', 'settings',
  'chats', 'more', 'customization', 'bot-customization', 'newsfeed', 'superadmin', 'send-message', 'subscribers', 'faqs', 'staff-accounts', 'qr-menu', 'qr-menu-orders',
  'qr-menu/orders',
  'qr-menu/tables',
  'qr-menu/dashboard',
]);

const PUBLIC_DOMAINS = ['telegramecommerce.shop', 'crossmart.shop'];

function isCustomDomain() {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  return !PUBLIC_DOMAINS.some(d => host === d || host.endsWith(`.${d}`))
    && host !== 'localhost'
    && host !== '127.0.0.1';
}

function PublicRoute() {
  const pathname = window.location.pathname.replace(/^\//, '');

  if (pathname === 'homepage') {
    return <Navigate to="/login" replace />;
  }

  const addProductMatch = pathname.match(/^(.+)-add-product-(\d{5})-(\d+)-(\d+)$/);
  if (addProductMatch) {
    return (
      <PublicLayout>
        <Suspense fallback={<SuspenseFallback />}>
          <PublicAddProduct username={addProductMatch[1]} code={addProductMatch[2]} secret1={addProductMatch[3]} secret2={addProductMatch[4]} />
        </Suspense>
      </PublicLayout>
    );
  }

  const addPaymentMatch = pathname.match(/^(.+)-add-new-payment-(\d{5})-(\d+)-(\d+)$/);
  if (addPaymentMatch) {
    return (
      <PublicLayout>
        <Suspense fallback={<SuspenseFallback />}>
          <PublicAddPayment username={addPaymentMatch[1]} code={addPaymentMatch[2]} secret1={addPaymentMatch[3]} secret2={addPaymentMatch[4]} />
        </Suspense>
      </PublicLayout>
    );
  }

  const customerLoginMatch = pathname.match(/^(.+)-user-dashboard-login$/);
  if (customerLoginMatch) {
    return (
      <PublicLayout>
        <Suspense fallback={<SuspenseFallback />}>
          <CustomerLogin shopSlug={customerLoginMatch[1]} />
        </Suspense>
      </PublicLayout>
    );
  }

  const customerDashboardMatch = pathname.match(/^(.+)-user-dashboard$/);
  if (customerDashboardMatch) {
    return (
      <PublicLayout>
        <Suspense fallback={<SuspenseFallback />}>
          <CustomerDashboard shopSlug={customerDashboardMatch[1]} />
        </Suspense>
      </PublicLayout>
    );
  }

  const ecommerceMatch = pathname.match(/^(.+)-ecommerce$/);
  if (ecommerceMatch) {
    return (
      <PublicLayout>
        <Suspense fallback={<SuspenseFallback />}>
          <PublicEcommerce slug={ecommerceMatch[1]} />
        </Suspense>
      </PublicLayout>
    );
  }

  if (!pathname || ADMIN_PATHS.has(pathname.split('/')[0]) || pathname.startsWith('_')) {
    return <Navigate to="/login" replace />;
  }
  const modeMatch = pathname.match(/^(.+)\/(telegram|ecommerce|guest)$/);
  if (modeMatch) {
    return <PublicLayout><Suspense fallback={<SuspenseFallback />}><PublicEcommerce slug={modeMatch[1]} mode={modeMatch[2]} /></Suspense></PublicLayout>;
  }
  const qrDashboard = pathname.match(/^(.+)-qr-dashboard$/);
  if (qrDashboard) {
    return <PublicLayout><Suspense fallback={<SuspenseFallback />}><QRMenuCustomerDashboard slug={qrDashboard[1]} /></Suspense></PublicLayout>;
  }
  const qrMenu = pathname.match(/^(.+)-qr-menu(?:\/t(\d+))?$/);
  if (qrMenu) {
    return <PublicLayout><Suspense fallback={<SuspenseFallback />}><PublicQRMenu slug={qrMenu[1]} table={qrMenu[2] || ''} /></Suspense></PublicLayout>;
  }
  const tokenDash = pathname.match(/^(.+)-token-dashboard$/);
  if (tokenDash) {
    return <PublicLayout><Suspense fallback={<SuspenseFallback />}><PublicQRMenu slug={tokenDash[1]} table="" forceDashboard /></Suspense></PublicLayout>;
  }
  const tokenDisplay = pathname.match(/^(.+)-token-display$/);
  if (tokenDisplay) {
    return <PublicLayout><Suspense fallback={<SuspenseFallback />}><LiveTokenDisplay slug={tokenDisplay[1]} /></Suspense></PublicLayout>;
  }
  return <PublicLayout><Suspense fallback={<SuspenseFallback />}><PublicEcommerce slug={pathname} /></Suspense></PublicLayout>;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
    },
  },
});

if (typeof window !== 'undefined') {
  (window as any).__reactQueryClient = queryClient;
}

function SuspenseFallback() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
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
  useAppBadge();
  useBackgroundSync();

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
    if (!slug) return null;
    const baseSlug = slug.split('/')[0];
    if (ADMIN_PATHS.has(baseSlug) || slug.startsWith('_')) {
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
          const { isStaff: staffUser } = useAuthStore.getState();
          if (!staffUser) {
            setUser(me);
          }

          const botsData = me.is_superadmin ? await getAllBots() : await getBots();
          setBots(botsData || []);

          if (botsData?.length > 0) {
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
    if (selectedBotId && (bots || []).length > 0) {
      const bot = (bots || []).find(b => b.id.toString() === selectedBotId?.toString());
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
        updatePwaManifest(name, bot.profile_picture);
        if (bot.profile_picture) preloadImage(bot.profile_picture);
      } else {
        document.title = 'E-commerce Myanmar';
      }
    } else {
      document.title = 'E-commerce Myanmar';
    }
  }, [selectedBotId, bots]);

  return (
    <QueryClientProvider client={queryClient}>
      <AppSplashScreen />
      <AppVersionCheck />
      <HapticProvider>
      <NetworkStatus />
      <VpnWarningModal />
      {addProductFromHash ? (
        <>
          <PublicLayout>
            <Suspense fallback={<SuspenseFallback />}>
              <PublicAddProduct username={addProductFromHash.username} code={addProductFromHash.code} secret1={addProductFromHash.secret1} secret2={addProductFromHash.secret2} />
            </Suspense>
          </PublicLayout>
          <ToastContainer />
          <SelectionToolbar />
        </>
      ) : addPaymentFromHash ? (
        <>
          <PublicLayout>
            <Suspense fallback={<SuspenseFallback />}>
              <PublicAddPayment username={addPaymentFromHash.username} code={addPaymentFromHash.code} secret1={addPaymentFromHash.secret1} secret2={addPaymentFromHash.secret2} />
            </Suspense>
          </PublicLayout>
          <ToastContainer />
          <SelectionToolbar />
        </>
      ) : addProductParam ? (
        <>
          <PublicLayout>
            <Suspense fallback={<SuspenseFallback />}>
              <PublicAddProduct username={addProductParam.username} code={addProductParam.code} secret1={addProductParam.secret1} secret2={addProductParam.secret2} />
            </Suspense>
          </PublicLayout>
          <ToastContainer />
          <SelectionToolbar />
        </>
      ) : addPaymentParam ? (
        <>
          <PublicLayout>
            <Suspense fallback={<SuspenseFallback />}>
              <PublicAddPayment username={addPaymentParam.username} code={addPaymentParam.code} secret1={addPaymentParam.secret1} secret2={addPaymentParam.secret2} />
            </Suspense>
          </PublicLayout>
          <ToastContainer />
          <SelectionToolbar />
        </>
      ) : publicSlug ? (
        <>
          <PublicLayout>
            <Suspense fallback={<SuspenseFallback />}>
              {(() => {
                if (publicSlug === 'homepage') return <Homepage />;
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
                const qrMenu = publicSlug.match(/^(.+)-qr-menu(?:\/t(\d+))?$/);
                if (qrMenu) return <PublicQRMenu slug={qrMenu[1]} table={qrMenu[2] || ''} />;
                const qrDash = publicSlug.match(/^(.+)-qr-dashboard$/);
                if (qrDash) return <QRMenuCustomerDashboard slug={qrDash[1]} />;
                const tokenDash = publicSlug.match(/^(.+)-token-dashboard$/);
                if (tokenDash) return <PublicQRMenu slug={tokenDash[1]} table="" forceDashboard />;
                const tokenDisplay = publicSlug.match(/^(.+)-token-display$/);
                if (tokenDisplay) return <LiveTokenDisplay slug={tokenDisplay[1]} />;
                return <PublicEcommerce slug={publicSlug} />;
              })()}
            </Suspense>
          </PublicLayout>
          <ToastContainer />
          <SelectionToolbar />
        </>
      ) : window.location.hash.startsWith('#/auth/google/proxy') ? (
        <>
          <PublicLayout>
            <Suspense fallback={<SuspenseFallback />}>
              <GoogleAuthProxy />
            </Suspense>
          </PublicLayout>
          <ToastContainer />
          <SelectionToolbar />
        </>
      ) : isCustomDomain() ? (
        (() => {
          const pathname = window.location.pathname.replace(/^\//, '');
          const ecomMode = pathname.match(/^(telegram|ecommerce|guest)$/);
          if (ecomMode) {
            return <><PublicLayout><Suspense fallback={<SuspenseFallback />}><PublicEcommerce viaDomain mode={ecomMode[1]} /></Suspense></PublicLayout><ToastContainer /><SelectionToolbar /></>;
          }
          const qrMenu = pathname.match(/^(.+)-qr-menu(?:\/t(\d+))?$/);
          if (qrMenu) {
            return <><PublicLayout><Suspense fallback={<SuspenseFallback />}><PublicQRMenu slug={qrMenu[1]} table={qrMenu[2] || ''} /></Suspense></PublicLayout><ToastContainer /><SelectionToolbar /></>;
          }
          const qrDash = pathname.match(/^(.+)-qr-dashboard$/);
          if (qrDash) {
            return <><PublicLayout><Suspense fallback={<SuspenseFallback />}><QRMenuCustomerDashboard slug={qrDash[1]} /></Suspense></PublicLayout><ToastContainer /><SelectionToolbar /></>;
          }
          const tokenDash = pathname.match(/^(.+)-token-dashboard$/);
          if (tokenDash) {
            return <><PublicLayout><Suspense fallback={<SuspenseFallback />}><PublicQRMenu slug={tokenDash[1]} table="" forceDashboard /></Suspense></PublicLayout><ToastContainer /><SelectionToolbar /></>;
          }
          const tokenDisplay = pathname.match(/^(.+)-token-display$/);
          if (tokenDisplay) {
            return <><PublicLayout><Suspense fallback={<SuspenseFallback />}><LiveTokenDisplay slug={tokenDisplay[1]} /></Suspense></PublicLayout><ToastContainer /><SelectionToolbar /></>;
          }
          const cd = pathname.match(/^(.+)-user-dashboard$/);
          if (cd) {
            return <><PublicLayout><Suspense fallback={<SuspenseFallback />}><CustomerDashboard shopSlug={cd[1]} /></Suspense></PublicLayout><ToastContainer /><SelectionToolbar /></>;
          }
          const cl = pathname.match(/^(.+)-user-dashboard-login$/);
          if (cl) {
            return <><PublicLayout><Suspense fallback={<SuspenseFallback />}><CustomerLogin shopSlug={cl[1]} /></Suspense></PublicLayout><ToastContainer /><SelectionToolbar /></>;
          }
          return (
            <>
              <PublicLayout>
                <Suspense fallback={<SuspenseFallback />}>
                  <PublicEcommerce viaDomain />
                </Suspense>
              </PublicLayout>
              <ToastContainer />
              <SelectionToolbar />
            </>
          );
        })()
      ) : (() => {
        // Render landing page at root outside BrowserRouter to avoid routing conflicts
        // Skip landing page in Capacitor app — go straight to admin panel
        const isCapacitor = typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.();
        const pn = window.location.pathname.replace(/^\//, '');
        if (!pn && !isCapacitor) {
          return (
            <>
              <PublicLayout>
                <Suspense fallback={<SuspenseFallback />}><Homepage /></Suspense>
              </PublicLayout>
              <ToastContainer />
              <NotificationToast />
              <SelectionToolbar />
            </>
          );
        }
        return (
          <>
            <BrowserRouter basename="/">
              <Routes>
                <Route path="/login" element={
                  <PublicLayout><Suspense fallback={<SuspenseFallback />}><Login /></Suspense></PublicLayout>
                } />
                <Route path="/manage-web-panel" element={
                  <PublicLayout><Suspense fallback={<SuspenseFallback />}><WebPanel /></Suspense></PublicLayout>
                } />
                <Route path="/" element={
                  <Suspense fallback={<SuspenseFallback />}><ThemedLayout /></Suspense>
                }>

                  <Route index element={<Navigate to="/dashboard" replace />} />
                  <Route path="dashboard" element={<PermissionGuard><PlanGate><ErrorBoundary><Dashboard /></ErrorBoundary></PlanGate></PermissionGuard>} />
                  <Route path="orders" element={<PermissionGuard><PlanGate><Orders /></PlanGate></PermissionGuard>} />
                  <Route path="products" element={<PermissionGuard><PlanGate><Products /></PlanGate></PermissionGuard>} />
                  <Route path="customers" element={<PermissionGuard><PlanGate><Customers /></PlanGate></PermissionGuard>} />
                  <Route path="broadcast" element={<PermissionGuard><PlanGate><Broadcast /></PlanGate></PermissionGuard>} />
                  <Route path="commands" element={<PermissionGuard><PlanGate><Commands /></PlanGate></PermissionGuard>} />
                  <Route path="payments" element={<PermissionGuard><PlanGate><Payments /></PlanGate></PermissionGuard>} />
                  <Route path="profit" element={<PermissionGuard><PlanGate><Profit /></PlanGate></PermissionGuard>} />
                  <Route path="subscription" element={<PermissionGuard><Subscription /></PermissionGuard>} />
                  <Route path="settings" element={<PermissionGuard><PlanGate><Settings /></PlanGate></PermissionGuard>} />
                  <Route path="chats" element={<PermissionGuard><PlanGate><Chats /></PlanGate></PermissionGuard>} />
                  <Route path="customization" element={<PermissionGuard><PlanGate><Customization /></PlanGate></PermissionGuard>} />
                  <Route path="ai-agent" element={<PermissionGuard><PlanGate><AiAgent /></PlanGate></PermissionGuard>} />
                  <Route path="bot-customization" element={<PermissionGuard><PlanGate><BotCustomization /></PlanGate></PermissionGuard>} />
                  <Route path="superadmin" element={<SuperadminDashboard />} />
                  <Route path="send-message" element={<SendMessage />} />
                  <Route path="subscribers" element={<Subscribers />} />
                  <Route path="faqs" element={<PermissionGuard><FAQs /></PermissionGuard>} />
                  <Route path="qr-menu/dashboard" element={<PermissionGuard><PlanGate><QRMenuDashboard /></PlanGate></PermissionGuard>} />
                  <Route path="qr-menu" element={<PermissionGuard><PlanGate><QRMenuAdmin /></PlanGate></PermissionGuard>} />
                  <Route path="qr-menu/orders" element={<PermissionGuard><PlanGate><QRMenuOrders /></PlanGate></PermissionGuard>} />
                  <Route path="qr-menu/tables" element={<PermissionGuard><PlanGate><QRMenuTables /></PlanGate></PermissionGuard>} />
                  <Route path="staff-accounts" element={<PlanGate><StaffAccounts /></PlanGate>} />
                  <Route path="more" element={<Navigate to="/broadcast" replace />} />
                  <Route path="newsfeed" element={<PermissionGuard><PlanGate><NewsfeedAdmin /></PlanGate></PermissionGuard>} />
                </Route>
                <Route path="*" element={<PublicRoute />} />
              </Routes>
            </BrowserRouter>
            <ToastContainer />
            <NotificationToast />
            <SelectionToolbar />
          </>
        );
      })()}
    </HapticProvider>
    </QueryClientProvider>
  );
}
