import React, { useState, useEffect, useRef } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { useRequireAuth } from '../hooks/useRequireAuth';
import { useTelegramAuth } from '../context/TelegramAuthContext';
import { useAuthTokenFromUrl } from '../hooks/useAuthTokenFromUrl';
import { useCartState } from '../context/CartContext';

function authHeaders() {
  const token = localStorage.getItem('telegram_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const FETCH_TIMEOUT_MS = 15000;

function fetchWithTimeout(url, options, timeoutMs = FETCH_TIMEOUT_MS) {
  return Promise.race([
    fetch(url, options),
    new Promise((_, reject) => setTimeout(() => reject(new Error('Request timed out')), timeoutMs)),
  ]);
}

function decodeJwtPayload(token) {
  try {
    const payload = token.split('.')[1];
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function getUserIdFromToken() {
  const token = localStorage.getItem('telegram_token');
  if (!token) return null;
  const payload = decodeJwtPayload(token);
  if (!payload) return null;
  return payload.sub || payload.user_id || payload.id || null;
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

function setPageMeta(title, pictureUrl) {
  document.title = title;
  const icon = document.querySelector('link[rel="icon"]');
  if (icon && pictureUrl) {
    makeCircularFavicon(pictureUrl).then((dataUrl) => {
      icon.setAttribute('href', dataUrl);
    });
  } else if (icon) {
    icon.setAttribute('href', '/vite.svg');
  }
}
import { motion, AnimatePresence } from 'motion/react';
import {
  ShoppingBag, Package, Clock, CheckCircle2, XCircle, ChevronRight,
  MapPin, Phone, Mail, User, Plus, Trash2, LogOut, Loader2,
  ShoppingCart, Home, Truck, Copy, Receipt as ReceiptIcon,
  CheckCircle, X, Upload
} from 'lucide-react';
import Receipt from '../components/orders/Receipt';
import { useToastStore } from '../store/toastStore';

const API_BASE = 'https://api.telegramecommerce.shop';

function formatPrice(price) {
  return Number(price).toLocaleString();
}

const statusConfig = {
  pending: { label: 'Pending', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200', dot: 'bg-amber-400' },
  processing: { label: 'Processing', icon: Package, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200', dot: 'bg-blue-400' },
  shipped: { label: 'Shipped', icon: Truck, color: 'text-indigo-600', bg: 'bg-indigo-50 border-indigo-200', dot: 'bg-indigo-400' },
  delivered: { label: 'Delivered', icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200', dot: 'bg-emerald-400' },
  cancelled: { label: 'Cancelled', icon: XCircle, color: 'text-red-600', bg: 'bg-red-50 border-red-200', dot: 'bg-red-400' },
};

export default function CustomerDashboard({ shopSlug }) {
  const { user, loading: authLoading } = useAuth();
  const { telegramUser: ctxTelegramUser } = useTelegramAuth();
  const { isAuthenticated } = useRequireAuth(shopSlug);
  const [activeTab, setActiveTab] = useState('overview');
  const [shopData, setShopData] = useState(null);

  const telegramToken = typeof window !== 'undefined' ? localStorage.getItem('telegram_token') : null;
  const isTelegramUser = !!telegramToken && !user;
  // Fall back to reading from localStorage directly in case context hasn't
  // initialized from it yet (StrictMode, SSR edge cases, etc.)
  const telegramUser = ctxTelegramUser || (() => {
    try {
      const u = localStorage.getItem('telegram_user');
      return u ? JSON.parse(u) : null;
    } catch { return null; }
  })();
  // Use Firebase UID when available (Google auth), fall back to JWT sub (telegram_id)
  const uid = user?.uid
    || (telegramToken ? (getUserIdFromToken() || '') : '')
    || (telegramUser?.id ? String(telegramUser.id) : '');
  const displayName = user?.displayName || telegramUser?.name || 'User';
  const photoUrl = user?.photoURL || telegramUser?.photo_url || null;

  useAuthTokenFromUrl();

  useEffect(() => {
    fetch(`${API_BASE}/public/shop/${encodeURIComponent(shopSlug)}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        setShopData(data);
        const s = data?.shop;
        if (s?.bot_full_name) {
          setPageMeta(s.bot_full_name, s.profile_picture);
        }
        // Sync website customer to backend (Firebase only)
        if (s?.id && user?.uid) {
          fetch(`${API_BASE}/website-customers/sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              bot_id: s.id,
              firebase_uid: user.uid,
              display_name: user.displayName,
              email: user.email,
              photo_url: user.photoURL,
            }),
          }).catch(() => {});
        }
      })
      .catch(() => {});
  }, [shopSlug, user?.uid, user?.displayName, user?.email, user?.photoURL]);

  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-400 font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const shopName = shopData?.shop?.bot_full_name || shopSlug;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-gradient-to-r from-indigo-600 to-purple-600 shadow-md">
        <div className="flex items-center justify-between px-4 h-12">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-white/20 backdrop-blur flex items-center justify-center shrink-0">
              <ShoppingBag className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-white text-sm font-bold truncate">{shopName}</h1>
          </div>
          <div className="flex items-center gap-1">
            {photoUrl && (
              <img src={photoUrl} alt="" className="w-6 h-6 rounded-full ring-2 ring-white/30" />
            )}
            <span className="text-white text-xs font-medium ml-1.5 truncate max-w-[100px]">
              {displayName}
            </span>
          </div>
        </div>
      </header>

      {/* Tab Content */}
      <main className="flex-1 overflow-y-auto pb-16">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
          >
            {activeTab === 'overview' && <OverviewTab shopSlug={shopSlug} user={user} uid={uid} displayName={displayName} photoUrl={photoUrl} shopName={shopName} onNavigate={setActiveTab} shop={shopData?.shop} />}
            {activeTab === 'orders' && <OrdersTab shopSlug={shopSlug} uid={uid} shop={shopData?.shop} />}
            {activeTab === 'cart' && <CartTab shopSlug={shopSlug} shop={shopData?.shop} user={user} telegramUser={telegramUser} isTelegramUser={isTelegramUser} />}
            {activeTab === 'profile' && <ProfileTab shopSlug={shopSlug} user={user} uid={uid} displayName={displayName} photoUrl={photoUrl} email={user?.email || null} isTelegramUser={isTelegramUser} telegramUser={telegramUser} />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom Tab Nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-200 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
        <div className="max-w-lg mx-auto flex">
          {[
            { id: 'overview', label: 'Home', icon: Home },
            { id: 'orders', label: 'Orders', icon: Package },
            { id: 'cart', label: 'Cart', icon: ShoppingCart },
            { id: 'profile', label: 'Profile', icon: User },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex flex-col items-center justify-center py-2 transition-all relative ${
                  isActive ? 'text-indigo-600' : 'text-gray-400'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="tabIndicator"
                    className="absolute -top-0.5 left-1/4 right-1/4 h-0.5 bg-indigo-600 rounded-full"
                  />
                )}
                <Icon className="w-5 h-5 mb-0.5" strokeWidth={isActive ? 2.5 : 1.8} />
                <span className={`text-[10px] font-bold ${isActive ? 'text-indigo-600' : 'text-gray-400'}`}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

/* ─── OVERVIEW TAB ─── */
function OverviewTab({ shopSlug, user, uid, displayName, photoUrl, shopName, onNavigate, shop }) {
  const { cartCount } = useCartState(shop?.id, shopSlug, user, 'ecommerce');
  const [orderStats, setOrderStats] = useState(null);

  useEffect(() => {
    if (!uid || !shopSlug) return;
    const fetchStats = () => {
      fetchWithTimeout(`${API_BASE}/customer/${encodeURIComponent(uid)}/orders/stats?shop=${encodeURIComponent(shopSlug)}`, { headers: authHeaders() })
        .then(r => r.ok ? r.json() : null)
        .then(s => setOrderStats(s || { total: 0, pending: 0, delivered: 0, cancelled: 0 }))
        .catch(() => {});
    };
    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, [uid, shopSlug]);

  const stats = [
    { label: 'Total Orders', value: orderStats?.total ?? 0, icon: Package, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Pending', value: orderStats?.pending ?? 0, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Completed', value: orderStats?.delivered ?? 0, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Cart Items', value: cartCount, icon: ShoppingCart, color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      {/* Welcome */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100"
      >
        <div className="flex items-center gap-3">
          {photoUrl && (
            <img src={photoUrl} alt="" className="w-12 h-12 rounded-full ring-2 ring-indigo-100" />
          )}
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              Hello, {displayName || 'there'}!
            </h2>
            <p className="text-sm text-gray-500">Welcome back to {shopName}</p>
          </div>
        </div>
      </motion.div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3">
        {stats.map((s, i) => {
          const Icon = s.icon;
          return (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`${s.bg} rounded-2xl p-4 shadow-sm border border-gray-100/50`}
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon className={`w-4 h-4 ${s.color}`} strokeWidth={2.5} />
                <span className="text-xs font-medium text-gray-500">{s.label}</span>
              </div>
              <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => onNavigate('orders')}
          className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-left hover:shadow-md transition-all active:scale-[0.98]"
        >
          <Package className="w-6 h-6 text-indigo-600 mb-2" />
          <p className="font-bold text-sm text-gray-900">My Orders</p>
          <p className="text-xs text-gray-400 mt-0.5">View order history</p>
        </button>
        <button
          onClick={() => onNavigate('cart')}
          className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-left hover:shadow-md transition-all active:scale-[0.98]"
        >
          <ShoppingCart className="w-6 h-6 text-purple-600 mb-2" />
          <p className="font-bold text-sm text-gray-900">My Cart</p>
          <p className="text-xs text-gray-400 mt-0.5">Saved items</p>
        </button>
        <button
          onClick={() => onNavigate('profile')}
          className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-left hover:shadow-md transition-all active:scale-[0.98]"
        >
          <User className="w-6 h-6 text-amber-600 mb-2" />
          <p className="font-bold text-sm text-gray-900">Profile</p>
          <p className="text-xs text-gray-400 mt-0.5">Manage your details</p>
        </button>
        <a
          href={`/?p=${encodeURIComponent(shopSlug)}`}
          className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-left hover:shadow-md transition-all active:scale-[0.98] block"
        >
          <ShoppingBag className="w-6 h-6 text-emerald-600 mb-2" />
          <p className="font-bold text-sm text-gray-900">Shop</p>
          <p className="text-xs text-gray-400 mt-0.5">Browse products</p>
        </a>
      </div>
    </div>
  );
}

/* ─── ORDERS TAB ─── */
function OrdersTab({ shopSlug, uid, shop }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [downloadOrder, setDownloadOrder] = useState(null);
  const [downloadType, setDownloadType] = useState('invoice');

  // Safety timeout: never show loading spinner for more than 20 seconds
  const loadingTimeoutRef = useRef(null);
  useEffect(() => {
    loadingTimeoutRef.current = setTimeout(() => setLoading(false), 20000);
    return () => clearTimeout(loadingTimeoutRef.current);
  }, []);

  useEffect(() => {
    if (!uid) {
      setLoading(false);
      return;
    }
    const fetchOrders = () => {
      fetchWithTimeout(`${API_BASE}/customer/${encodeURIComponent(uid)}/orders?shop=${encodeURIComponent(shopSlug)}`, { headers: authHeaders() })
        .then(r => r.ok ? r.json() : [])
        .then(data => { setOrders(Array.isArray(data) ? data : []); setLoading(false); })
        .catch(() => { setOrders([]); setLoading(false); });
    };
    fetchOrders();
    const interval = setInterval(fetchOrders, 5000);
    return () => { clearInterval(interval); clearTimeout(loadingTimeoutRef.current); };
  }, [uid, shopSlug]);

  if (loading) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12 flex justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Package className="w-10 h-10 text-gray-300" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-1">No orders yet</h3>
        <p className="text-sm text-gray-400 mb-6">
          When you place an order, it will appear here.
        </p>
        <a
          href={`/?p=${encodeURIComponent(shopSlug)}`}
          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-2xl text-sm shadow-lg shadow-indigo-100 hover:shadow-xl transition-all"
        >
          <ShoppingBag className="w-4 h-4" />
          Start Shopping
        </a>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-lg mx-auto px-4 py-6 space-y-3">
      <h2 className="text-lg font-bold text-gray-900 mb-1">My Orders</h2>
      {orders.map(order => {
        const status = statusConfig[order.status] || statusConfig.pending;
        const StatusIcon = status.icon;
        const isExpanded = expandedId === order.id;
        return (
          <motion.div
            key={order.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
          >
            <button
              onClick={() => setExpandedId(isExpanded ? null : order.id)}
              className="w-full p-4 text-left active:bg-gray-50 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono font-bold text-gray-400">#{order.id}</span>
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border ${status.bg} ${status.color}`}>
                  <StatusIcon className="w-3.5 h-3.5" strokeWidth={2.5} />
                  <span className="text-[10px] font-bold">{status.label}</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-gray-900">
                    {order.items_count || 0} item{(order.items_count || 0) !== 1 ? 's' : ''}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {order.created_at ? new Date(order.created_at).toLocaleDateString() : '—'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-black text-gray-900">
                    {order.total ? formatPrice(order.total) : '—'} {order.currency || 'MMK'}
                  </span>
                  <ChevronRight className={`w-4 h-4 text-gray-300 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                </div>
              </div>
            </button>
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-t border-gray-50"
                >
                  <div className="p-4 space-y-3 bg-gray-50/50">
                    {order.shipping_address && (
                      <div className="bg-white rounded-xl p-3 border border-gray-100 space-y-1.5">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Contact Info</p>
                        <p className="text-xs text-gray-700"><span className="font-medium">Name:</span> {order.shipping_address.name || '—'}</p>
                        <p className="text-xs text-gray-700"><span className="font-medium">Phone:</span> {order.shipping_address.phone || '—'}</p>
                        <p className="text-xs text-gray-700"><span className="font-medium">Email:</span> {order.buyer_snapshot?.email || '—'}</p>
                        {order.buyer_snapshot?.telegram_username && <p className="text-xs text-gray-700"><span className="font-medium">Telegram:</span> {order.buyer_snapshot.telegram_username}</p>}
                        {order.buyer_snapshot?.viber_number && <p className="text-xs text-gray-700"><span className="font-medium">Viber:</span> {order.buyer_snapshot.viber_number}</p>}
                        <p className="text-xs text-gray-700"><span className="font-medium">Address:</span> {order.shipping_address.address || '—'}</p>
                        {order.shipping_address.notes && <p className="text-xs text-gray-700"><span className="font-medium">Notes:</span> {order.shipping_address.notes}</p>}
                      </div>
                    )}
                    {order.items?.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        {item.image_url && (
                          <div className="w-12 h-12 rounded-xl bg-gray-100 overflow-hidden shrink-0">
                            <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-gray-900 truncate">{item.name}</p>
                          <p className="text-xs text-gray-400">
                            {item.quantity ? `x${item.quantity}` : ''} {item.price ? `${formatPrice(item.price)} MMK` : ''}
                          </p>
                        </div>
                      </div>
                    ))}
                    {order.notes && (
                      <div className="text-xs text-gray-500 bg-white rounded-xl p-3 border border-gray-100">
                        <span className="font-bold text-gray-700">Note:</span> {order.notes}
                      </div>
                    )}
                    {order.status === 'pending' && order.payment_info && (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                        <p className="text-xs font-bold text-amber-700 mb-1">Payment Info</p>
                        <p className="text-xs text-amber-600">{order.payment_info}</p>
                      </div>
                    )}
                    <div className="flex gap-2 pt-1">
                      {order.status === 'pending' ? (
                        <button
                          onClick={() => { setDownloadType('invoice'); setDownloadOrder(order); }}
                          className="flex-1 py-2.5 text-xs font-bold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all"
                        >
                          <ReceiptIcon className="w-3.5 h-3.5 inline mr-1" />
                          Download Invoice
                        </button>
                      ) : order.status !== 'cancelled' && order.status !== 'rejected' && order.status !== 'payment_failed' ? (
                        <>
                          <button
                            onClick={() => { setDownloadType('invoice'); setDownloadOrder(order); }}
                            className="flex-1 py-2.5 text-xs font-bold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all"
                          >
                            <ReceiptIcon className="w-3.5 h-3.5 inline mr-1" />
                            Download Invoice
                          </button>
                          <button
                            onClick={() => { setDownloadType('receipt'); setDownloadOrder(order); }}
                            className="flex-1 py-2.5 text-xs font-bold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all"
                          >
                            <ReceiptIcon className="w-3.5 h-3.5 inline mr-1" />
                            Download Receipt
                          </button>
                        </>
                      ) : null}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>

    <Receipt
      order={downloadOrder}
      bot={shop}
      open={!!downloadOrder}
      onClose={() => setDownloadOrder(null)}
      receiptType={downloadType}
    />
    </>
  );
}

/* ─── CART TAB ─── */
function CartTab({ shopSlug, shop, user, telegramUser, isTelegramUser }) {
  const [shopData, setShopData] = useState(null);
  const [showPaymentSelect, setShowPaymentSelect] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(null);
  const effectiveShop = shopData?.shop || shop;
  const cart = useCartState(effectiveShop?.id, shopSlug, user, 'ecommerce');
  const { items: cartItems, cartCount, totalAmount, loading, removeItem: removeContextItem, clearCart } = cart;

  const removeItem = (productId) => {
    removeContextItem(productId);
  };

  const fetchShopDataIfNeeded = async () => {
    if (shopData) return shopData;
    try {
      const res = await fetch(`${API_BASE}/public/shop/${encodeURIComponent(shopSlug)}`);
      const data = await res.json();
      if (data) setShopData(data);
      return data || null;
    } catch { return null; }
  };

  const handleCheckoutAll = async () => {
    const data = await fetchShopDataIfNeeded();
    const methods = data?.payment_methods || shopData?.payment_methods || [];
    if (methods.length > 0) {
      setShowPaymentSelect(true);
    } else {
      setCheckoutOpen(true);
    }
  };

  const handlePaymentNext = (paymentId) => {
    if (!paymentId) return;
    const pm = (shopData?.payment_methods || []).find(p => p.id === paymentId);
    setSelectedPayment(pm || null);
    setShowPaymentSelect(false);
    setCheckoutOpen(true);
  };

  const handleOrderPlacedCallback = (orderData) => {
    setCheckoutOpen(false);
    setOrderPlaced(orderData);
    clearCart();
    setSelectedPayment(null);
  };

  if (loading) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12 flex justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (orderPlaced) {
    return (
      <OrderConfirmationInline
        orderData={orderPlaced}
        shop={shopData?.shop || null}
        onContinueShopping={() => setOrderPlaced(null)}
        shopSlug={shopSlug}
      />
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <ShoppingCart className="w-10 h-10 text-gray-300" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-1">Your cart is empty</h3>
        <p className="text-sm text-gray-400 mb-6">
          Items you add from the shop will appear here.
        </p>
        <a
          href={`/?p=${encodeURIComponent(shopSlug)}`}
          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-2xl text-sm shadow-lg shadow-indigo-100 hover:shadow-xl transition-all"
        >
          <ShoppingBag className="w-4 h-4" />
          Browse Products
        </a>
      </div>
    );
  }

  // totalAmount from cart context

  return (
    <>
      <div className="max-w-lg mx-auto px-4 py-6 space-y-3">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg font-bold text-gray-900">My Cart</h2>
          <span className="text-xs font-medium text-gray-400">{cartItems.length} item{cartItems.length !== 1 ? 's' : ''}</span>
        </div>
        {cartItems.map((item) => (
          <motion.div
            key={item.product_id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-3"
          >
            {item.image_url ? (
              <div className="w-16 h-16 rounded-xl bg-gray-100 overflow-hidden shrink-0">
                <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center shrink-0">
                <Package className="w-6 h-6 text-indigo-300" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-gray-900 truncate">{item.name}</p>
              <p className="text-sm font-black text-indigo-600 mt-0.5">
                {formatPrice(item.price)} MMK
              </p>
              {item.quantity && (
                <p className="text-xs text-gray-400 mt-0.5">Qty: {item.quantity}</p>
              )}
            </div>
            <button onClick={() => removeItem(item.product_id)}
              className="w-8 h-8 bg-rose-50 rounded-xl flex items-center justify-center text-rose-400 hover:bg-rose-100 active:bg-rose-200 transition-all shrink-0" title="Remove">
              <Trash2 className="w-4 h-4" strokeWidth={2} />
            </button>
          </motion.div>
        ))}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mt-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-bold text-gray-700">Total</span>
            <span className="text-xl font-black text-gray-900">{formatPrice(totalAmount)} MMK</span>
          </div>
          <button onClick={handleCheckoutAll}
            className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-2xl text-sm shadow-lg shadow-indigo-100 hover:shadow-xl transition-all active:scale-[0.98]">
            Checkout All
          </button>
        </div>
      </div>

      {/* Payment Select Overlay */}
      {showPaymentSelect && (
        <PaymentSelectInline
          paymentMethods={shopData?.payment_methods || []}
          onBack={() => setShowPaymentSelect(false)}
          onNext={handlePaymentNext}
        />
      )}

      {/* Checkout Form Overlay */}
      {checkoutOpen && (
        <CheckoutFormInline
          shop={shopData?.shop || null}
          cartItems={cartItems}
          totalAmount={totalAmount}
          user={user}
          telegramUser={telegramUser}
          shopSlug={shopSlug}
          selectedPayment={selectedPayment}
          onClose={() => setCheckoutOpen(false)}
          onOrderPlaced={handleOrderPlacedCallback}
        />
      )}
    </>
  );
}

/* ─── PROFILE TAB ─── */
function ProfileTab({ shopSlug, user, uid, displayName: defaultName, photoUrl, email, isTelegramUser, telegramUser }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState('');

  const [displayName, setDisplayName] = useState('');
  const [phones, setPhones] = useState(['']);
  const [emails, setEmails] = useState(['']);
  const [telegram, setTelegram] = useState('');
  const [viber, setViber] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');

  // Resolve bot_id from shopSlug once and cache it
  const botIdRef = useRef(null);
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    if (!uid || !shopSlug) {
      setLoading(false);
      return;
    }
    setResolving(true);
    fetch(`${API_BASE}/public/shop/${encodeURIComponent(shopSlug)}`)
      .then(r => r.ok ? r.json() : null)
      .then(shopData => {
        const botId = shopData?.shop?.id;
        if (!botId) { setLoading(false); setResolving(false); return; }
        botIdRef.current = botId;
        return fetch(`${API_BASE}/api/customer-profile?bot_id=${botId}&uid=${encodeURIComponent(uid)}`);
      })
      .then(r => r && r.ok ? r.json() : {})
      .then(data => {
        if (data && data.id) {
          setDisplayName(data.display_name || '');
          const pl = data.phone ? data.phone.split(',').map(s => s.trim()).filter(Boolean) : [''];
          setPhones(pl.length > 0 ? pl : ['']);
          const el = data.email ? data.email.split(',').map(s => s.trim()).filter(Boolean) : [email || ''];
          setEmails(el.length > 0 ? el : ['']);
          setTelegram(data.telegram_username || '');
          setViber(data.viber_number || '');
          setAddress(data.address || '');
          setNotes(data.notes || '');
        } else {
          setDisplayName(defaultName || '');
          setEmails([email || '']);
        }
        setLoading(false);
        setResolving(false);
      })
      .catch(() => { setLoading(false); setResolving(false); });
  }, [uid, shopSlug, defaultName, email]);

  const addPhone = () => setPhones(prev => [...prev, '']);
  const removePhone = (idx) => { if (phones.length > 1) setPhones(prev => prev.filter((_, i) => i !== idx)); };

  const addEmail = () => setEmails(prev => [...prev, '']);
  const removeEmail = (idx) => { if (emails.length > 1) setEmails(prev => prev.filter((_, i) => i !== idx)); };

  const handleSave = async () => {
    if (!displayName.trim() || !phones[0]?.trim() || !emails[0]?.trim()) return;
    setSaving(true);
    setSaved(false);
    setSaveError('');
    try {
      let botId = botIdRef.current;
      if (!botId) {
        const shopRes = await fetch(`${API_BASE}/public/shop/${encodeURIComponent(shopSlug)}`);
        const shopData = await shopRes.json();
        botId = shopData?.shop?.id;
        if (!botId) throw new Error('Shop not found');
        botIdRef.current = botId;
      }
      const res = await fetch(`${API_BASE}/api/customer-profile/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bot_id: botId,
          uid: uid,
          display_name: displayName.trim(),
          email: emails.filter(Boolean).map(e => e.trim()).join(', '),
          phone: phones.filter(Boolean).map(p => p.trim()).join(', '),
          telegram_username: telegram.trim(),
          viber_number: viber.trim(),
          address: address.trim(),
          notes: notes.trim(),
        }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        const errText = await res.text().catch(() => '');
        setSaveError(errText || 'Save failed. Please try again later.');
      }
    } catch (err) {
      setSaveError('Failed to save. Please check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    try {
      const isTelegram = !!localStorage.getItem('telegram_token');
      if (isTelegram) {
        localStorage.removeItem('telegram_token');
        localStorage.removeItem('telegram_user');
      } else {
        await signOut(auth);
      }
      window.location.href = `/?p=${encodeURIComponent(shopSlug)}`;
    } catch (err) {
      console.error('Sign out failed:', err);
    }
  };

  if (loading) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12 flex justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
      {/* User Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100"
      >
        <div className="flex items-center gap-4">
          {photoUrl ? (
            <img src={photoUrl} alt="" className="w-16 h-16 rounded-full ring-2 ring-indigo-100" />
          ) : (
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center">
              <User className="w-8 h-8 text-indigo-400" />
            </div>
          )}
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-gray-900 truncate">{displayName || 'User'}</h3>
            {email && (
              <div className="flex items-center gap-1.5 mt-0.5">
                <Mail className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-sm text-gray-500 truncate">{email}</span>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Contact Information */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100"
      >
        <h4 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Phone className="w-4 h-4 text-gray-400" />
          Contact Information
        </h4>

        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="text-xs text-gray-500 font-medium mb-1.5 block">Full Name *</label>
            <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm" />
          </div>

          {/* Phone Numbers */}
          <div>
            <label className="text-xs text-gray-500 font-medium mb-1.5 block">Phone Numbers *</label>
            <div className="space-y-2">
              {phones.map((phone, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input type="tel" value={phone} onChange={e => {
                    const next = [...phones]; next[idx] = e.target.value; setPhones(next);
                  }} placeholder={idx === 0 ? "09xxxxxxxxx" : "Additional phone"}
                    className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm" />
                  {idx === 0 ? (
                    <button onClick={addPhone} className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-500 hover:bg-indigo-100 transition-all shrink-0">
                      <Plus className="w-4 h-4" />
                    </button>
                  ) : (
                    <button onClick={() => removePhone(idx)} className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center text-rose-400 hover:bg-rose-100 transition-all shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Emails */}
          <div>
            <label className="text-xs text-gray-500 font-medium mb-1.5 block">Email Addresses *</label>
            <div className="space-y-2">
              {emails.map((email, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input type="email" value={email} onChange={e => {
                    const next = [...emails]; next[idx] = e.target.value; setEmails(next);
                  }} placeholder={idx === 0 ? "your@email.com" : "Additional email"}
                    className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm" />
                  {idx === 0 ? (
                    <button onClick={addEmail} className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-500 hover:bg-indigo-100 transition-all shrink-0">
                      <Plus className="w-4 h-4" />
                    </button>
                  ) : (
                    <button onClick={() => removeEmail(idx)} className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center text-rose-400 hover:bg-rose-100 transition-all shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Telegram Username */}
          <div>
            <label className="text-xs text-gray-500 font-medium mb-1.5 block">Telegram Username</label>
            <input type="text" value={telegram} onChange={e => setTelegram(e.target.value)}
              placeholder="@username"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm" />
          </div>

          {/* Viber Number */}
          <div>
            <label className="text-xs text-gray-500 font-medium mb-1.5 block">Viber Number</label>
            <input type="tel" value={viber} onChange={e => setViber(e.target.value)}
              placeholder="09xxxxxxxxx"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm" />
          </div>

          {/* Address */}
          <div>
            <label className="text-xs text-gray-500 font-medium mb-1.5 block">Full Address *</label>
            <textarea value={address} onChange={e => setAddress(e.target.value)} rows={3}
              placeholder="Street, city, postal code..."
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm resize-none" />
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs text-gray-500 font-medium mb-1.5 block">Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              placeholder="Any additional information..."
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm resize-none" />
          </div>

          {/* Error message */}
          {saveError && (
            <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-2xl">
              <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <p className="text-xs font-medium text-rose-700">{saveError}</p>
            </div>
          )}

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={saving || !displayName.trim() || !phones[0]?.trim() || !emails[0]?.trim()}
            className={`w-full py-3 rounded-2xl font-bold text-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2 ${
              saved ? 'bg-emerald-500 text-white' : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white'
            } disabled:opacity-50`}
          >
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : saved ? <><CheckCircle2 className="w-4 h-4" /> Saved!</> : 'Save Profile'}
          </button>
        </div>
      </motion.div>

      {/* Sign Out */}
      <button
        onClick={handleSignOut}
        className="w-full py-3 bg-rose-50 border border-rose-200 text-rose-600 font-bold rounded-2xl text-sm hover:bg-rose-100 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
      >
        <LogOut className="w-4 h-4" />
        Sign Out
      </button>

      <p className="text-[10px] text-gray-400 text-center pb-4">
        Powered by Telegram E-Commerce Platform
      </p>
    </div>
  );
}

const PAYMENT_COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#f97316', '#8b5cf6'];

/* ─── PAYMENT SELECT INLINE ─── */
function PaymentSelectInline({ paymentMethods, onBack, onNext }) {
  const [selectedId, setSelectedId] = useState(null);
  const { addToast } = useToastStore();

  const handleCopy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      addToast('Copied to clipboard');
    } catch {
      addToast('Failed to copy', 'error');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm"
    >
      <motion.div
        initial={{ y: '100%', opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="relative bg-white w-full max-w-lg md:rounded-[32px] max-h-[92svh] overflow-y-auto rounded-t-[32px] shadow-2xl p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-gray-900">Select Payment Method</h2>
          <button onClick={onBack} className="p-2 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100 transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        {paymentMethods.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-400 text-sm">No payment methods available</p>
            <button onClick={onBack}
              className="mt-4 px-6 py-2.5 bg-gray-100 text-gray-600 rounded-xl font-bold text-sm hover:bg-gray-200 transition-all">
              Back to Cart
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {paymentMethods.map((pm, i) => {
              const isSelected = selectedId === pm.id;
              const color = PAYMENT_COLORS[i % PAYMENT_COLORS.length];
              return (
                <div key={pm.id}
                  onClick={() => setSelectedId(isSelected ? null : pm.id)}
                  className={`rounded-2xl border-2 cursor-pointer transition-all active:scale-[0.99] ${
                    isSelected ? 'border-indigo-500 shadow-lg' : 'border-gray-100 hover:border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-3 p-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0 shadow-sm"
                      style={{ backgroundColor: color }}>
                      {(pm.name || '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 text-sm truncate">{pm.name}</p>
                      {pm.account_name && (
                        <p className="text-xs text-gray-500 truncate">{pm.account_name}</p>
                      )}
                    </div>
                    <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform ${isSelected ? 'rotate-90' : ''}`} />
                  </div>

                  {isSelected && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                      className="overflow-hidden border-t border-gray-100">
                      <div className="p-4 pt-3 space-y-3">
                        {pm.qr_code_url && (
                          <div className="flex justify-center bg-gray-50 rounded-xl p-4">
                            <img src={pm.qr_code_url} alt="QR Code" className="w-40 h-40 object-contain rounded-lg"
                              onError={(e) => { e.target.style.display = 'none'; }} />
                          </div>
                        )}
                        {pm.account_name && (
                          <div>
                            <p className="text-xs text-gray-400 font-medium mb-0.5">Account Name</p>
                            <p className="text-sm font-bold text-gray-900">{pm.account_name}</p>
                          </div>
                        )}
                        {pm.payment_number && (
                          <div>
                            <p className="text-xs text-gray-400 font-medium mb-0.5">Account Number</p>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-bold text-gray-900">{pm.payment_number}</p>
                              <button onClick={(e) => { e.stopPropagation(); handleCopy(pm.payment_number); }}
                                className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all active:scale-90">
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        )}
                        {pm.description && (
                          <div>
                            <p className="text-xs text-gray-400 font-medium mb-0.5">Details</p>
                            <p className="text-sm text-gray-700 whitespace-pre-wrap">{pm.description}</p>
                          </div>
                        )}
                        {pm.notes && (
                          <div className="bg-amber-50 rounded-xl p-3 border border-amber-100">
                            <p className="text-xs text-amber-700 whitespace-pre-wrap">{pm.notes}</p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {paymentMethods.length > 0 && (
          <div className="flex gap-3 mt-6">
            <button onClick={onBack}
              className="flex-1 py-3 rounded-2xl font-bold text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 transition-all active:scale-[0.98]">
              Back
            </button>
            <button onClick={() => onNext(selectedId)}
              disabled={!selectedId}
              className={`flex-1 py-3 rounded-2xl font-bold text-sm transition-all active:scale-[0.98] disabled:opacity-50 ${
                selectedId ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}>
              Transferred, Next...
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

/* ─── CHECKOUT FORM INLINE ─── */
function CheckoutFormInline({ shop, cartItems, totalAmount, user, telegramUser, shopSlug, selectedPayment, onClose, onOrderPlaced }) {
  const [form, setForm] = useState({ name: '', phones: [''], emails: [''], telegram: '', viber: '', address: '', notes: '' });
  const [proofFile, setProofFile] = useState(null);
  const [proofPreview, setProofPreview] = useState('');
  const [uploadingProof, setUploadingProof] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [agreed1, setAgreed1] = useState(false);
  const [agreed2, setAgreed2] = useState(false);

  const loadContactCache = () => {
    const cacheKey = 'checkout_contact_' + shopSlug;
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const data = JSON.parse(cached);
        if (data && data.name) {
          setForm({
            name: data.name || '',
            phones: data.phones?.length > 0 ? data.phones : [''],
            emails: data.email ? [data.email] : [''],
            telegram: data.telegram || '',
            viber: data.viber || '',
            address: data.address || '',
            notes: data.notes || '',
          });
        }
      }
    } catch {}
  };

  useEffect(() => {
    if (!shopSlug || profileLoaded || !shop?.id) return;
    const tgToken = localStorage.getItem('telegram_token');
    const customerUid = user?.uid
      || (tgToken ? (getUserIdFromToken() || '_') : '');
    if (!customerUid) {
      loadContactCache();
      setProfileLoaded(true);
      return;
    }
    fetch(`${API_BASE}/api/customer-profile?bot_id=${shop.id}&uid=${encodeURIComponent(customerUid)}&email=${encodeURIComponent(user?.email || '')}`)
      .then(r => r.ok ? r.json() : {})
      .then(data => {
        if (data && data.id) {
          const pl = data.phone ? data.phone.split(',').map(s => s.trim()).filter(Boolean) : [''];
          const el = data.email ? data.email.split(',').map(s => s.trim()).filter(Boolean) : [user?.email || ''];
          setForm({
            name: data.display_name || user?.displayName || '',
            phones: pl.length > 0 ? pl : [''],
            emails: el.length > 0 ? el : [user?.email || ''],
            telegram: data.telegram_username || '',
            viber: data.viber_number || '',
            address: data.address || '',
            notes: data.notes || '',
          });
        } else {
          setForm(prev => ({ ...prev, name: user?.displayName || '', emails: [user?.email || ''] }));
          loadContactCache();
        }
        setProfileLoaded(true);
      })
      .catch(() => { loadContactCache(); setProfileLoaded(true); });
  }, [shopSlug, user?.uid, shop?.id, user?.displayName, user?.email, profileLoaded]);

  const setPhone = (idx, val) => setForm(p => { const n = [...p.phones]; n[idx] = val; return { ...p, phones: n }; });
  const addPhone = () => setForm(p => ({ ...p, phones: [...p.phones, ''] }));
  const removePhone = (idx) => setForm(p => ({ ...p, phones: p.phones.filter((_, i) => i !== idx) }));

  const setEmail = (idx, val) => setForm(p => { const n = [...p.emails]; n[idx] = val; return { ...p, emails: n }; });
  const addEmail = () => setForm(p => ({ ...p, emails: [...p.emails, ''] }));
  const removeEmail = (idx) => setForm(p => ({ ...p, emails: p.emails.filter((_, i) => i !== idx) }));

  const handleProofFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProofFile(file);
    const reader = new FileReader();
    reader.onload = () => setProofPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) { setError('Name is required'); return; }
    if (!form.phones[0]?.trim()) { setError('At least one phone number is required'); return; }
    if (!form.emails[0]?.trim()) { setError('At least one email is required'); return; }
    if (!form.address.trim()) { setError('Delivery address is required'); return; }
    if (!proofFile) { setError('Payment proof screenshot is required'); return; }
    setLoading(true);
    setError('');
    try {
      let paymentProof = '';
      if (proofFile) {
        setUploadingProof(true);
        const fd = new FormData();
        fd.append('file', proofFile);
        fd.append('bot_id', shop.id);
        const uploadRes = await fetch(API_BASE + '/public/upload/photo', {
          method: 'POST',
          body: fd,
        });
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          paymentProof = uploadData.file_id || '';
        }
        setUploadingProof(false);
      }

      const phoneStr = form.phones.filter(Boolean).map(p => p.trim()).join(', ');
      const emailStr = form.emails.filter(Boolean).map(e => e.trim()).join(', ');

      const profileUid = user?.uid || getUserIdFromToken() || '';
      if (profileUid) {
        await fetch(API_BASE + '/api/customer-profile/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            uid: profileUid,
            bot_id: shop.id,
            display_name: form.name.trim(),
            email: emailStr,
            phone: phoneStr,
            photo_url: user?.photoURL || '',
            telegram_username: form.telegram.trim(),
            viber_number: form.viber.trim(),
            address: form.address.trim(),
            notes: form.notes.trim(),
          }),
        }).catch(() => {});
      }

      const body = {
        bot_id: shop.id,
        ...(profileUid ? { firebase_uid: profileUid } : {}),
        ...(telegramUser?.id ? { telegram_id: telegramUser.id } : {}),
        customer_name: form.name.trim(),
        phone: phoneStr,
        email: emailStr,
        address: form.address.trim(),
        notes: form.notes.trim(),
        telegram_username: form.telegram.trim(),
        viber_number: form.viber.trim(),
        items: cartItems.map(i => ({
          product_id: i.product_id,
          name: i.name,
          price: i.price,
          quantity: i.quantity,
        })),
        total_amount: totalAmount,
      };
      if (paymentProof) body.payment_proof = paymentProof;
      if (selectedPayment?.name) body.payment_method = selectedPayment.name;

      const res = await fetch(API_BASE + '/public/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to place order');
      const cacheKey = 'checkout_contact_' + shopSlug;
      try {
        localStorage.setItem(cacheKey, JSON.stringify({
          name: form.name.trim(),
          phones: form.phones.filter(Boolean).map(p => p.trim()),
          email: emailStr,
          telegram: form.telegram.trim(),
          viber: form.viber.trim(),
          address: form.address.trim(),
          notes: form.notes.trim(),
        }));
      } catch {}
      onOrderPlaced(data);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm"
    >
      <motion.div
        initial={{ y: '100%', opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="relative bg-white w-full max-w-lg md:rounded-[32px] max-h-[92svh] overflow-y-auto rounded-t-[32px] shadow-2xl p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Checkout</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100 transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Order Summary */}
        <div className="bg-gray-50 rounded-2xl p-4 mb-6">
          <p className="text-xs text-gray-500 font-medium mb-2">Order Summary</p>
          {cartItems.map((item, idx) => (
            <div key={idx} className="flex justify-between text-sm py-1">
              <span className="text-gray-700">{item.name} x{item.quantity}</span>
              <span className="font-medium text-gray-900">{formatPrice(item.price * item.quantity)} MMK</span>
            </div>
          ))}
          <div className="border-t border-gray-200 mt-2 pt-2 flex justify-between font-bold text-gray-900">
            <span>Total</span>
            <span>{formatPrice(totalAmount)} MMK</span>
          </div>
        </div>

        {/* Form Fields */}
        <div className="space-y-4">
          <div>
            <label className="text-xs text-gray-500 font-medium mb-1.5 block">Full Name *</label>
            <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm" />
          </div>

          <div>
            <label className="text-xs text-gray-500 font-medium mb-1.5 block">Phone Numbers *</label>
            <div className="space-y-2">
              {form.phones.map((phone, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input type="tel" value={phone} onChange={e => setPhone(idx, e.target.value)}
                    placeholder={idx === 0 ? "09xxxxxxxxx" : "Additional phone"}
                    className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm" />
                  {idx === 0 ? (
                    <button onClick={addPhone} className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-500 hover:bg-indigo-100 transition-all shrink-0">
                      <Plus className="w-4 h-4" />
                    </button>
                  ) : (
                    <button onClick={() => removePhone(idx)} className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center text-rose-400 hover:bg-rose-100 transition-all shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500 font-medium mb-1.5 block">Email Addresses *</label>
            <div className="space-y-2">
              {form.emails.map((email, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input type="email" value={email} onChange={e => setEmail(idx, e.target.value)}
                    placeholder={idx === 0 ? "your@email.com" : "Additional email"}
                    className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm" />
                  {idx === 0 ? (
                    <button onClick={addEmail} className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-500 hover:bg-indigo-100 transition-all shrink-0">
                      <Plus className="w-4 h-4" />
                    </button>
                  ) : (
                    <button onClick={() => removeEmail(idx)} className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center text-rose-400 hover:bg-rose-100 transition-all shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500 font-medium mb-1.5 block">Telegram Username</label>
            <input type="text" value={form.telegram} onChange={e => setForm(p => ({ ...p, telegram: e.target.value }))}
              placeholder="@username"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm" />
          </div>

          <div>
            <label className="text-xs text-gray-500 font-medium mb-1.5 block">Viber Number</label>
            <input type="tel" value={form.viber} onChange={e => setForm(p => ({ ...p, viber: e.target.value }))}
              placeholder="09xxxxxxxxx"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm" />
          </div>

          <div>
            <label className="text-xs text-gray-500 font-medium mb-1.5 block">Delivery Address *</label>
            <textarea value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} rows={3}
              placeholder="Street, city, postal code..."
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm resize-none" />
          </div>

          <div>
            <label className="text-xs text-gray-500 font-medium mb-1.5 block">Notes</label>
            <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2}
              placeholder="Any additional information..."
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm resize-none" />
          </div>
        </div>

        {/* Selected Payment */}
        {selectedPayment && (
          <div className="mt-6 bg-indigo-50 rounded-2xl p-4 border border-indigo-100">
            <p className="text-xs font-bold text-indigo-700 mb-2">Payment Method</p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold shadow-sm shrink-0 bg-indigo-500">
                {selectedPayment.name?.charAt(0).toUpperCase() || '?'}
              </div>
              <div>
                <p className="font-bold text-sm text-gray-900">{selectedPayment.name}</p>
                {selectedPayment.payment_number && (
                  <p className="text-xs text-gray-600">{selectedPayment.payment_number}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Payment Proof Upload */}
        <div className="mt-6">
          <label className="text-xs text-gray-500 font-medium mb-1.5 block">Payment Proof *</label>
          <div className="border-2 border-dashed border-gray-200 rounded-2xl p-4 text-center hover:border-indigo-300 transition-colors">
            {proofPreview ? (
              <div className="relative">
                <img src={proofPreview} alt="Proof" className="max-h-40 mx-auto rounded-xl" />
                <button onClick={() => { setProofFile(null); setProofPreview(''); }}
                  className="mt-2 text-xs text-rose-500 font-medium hover:text-rose-700">
                  Remove
                </button>
              </div>
            ) : (
              <label className="cursor-pointer block">
                <Upload className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500 font-medium">Tap to upload screenshot</p>
                <p className="text-xs text-gray-400 mt-1">Show the payment confirmation</p>
                <input type="file" accept="image/*" onChange={handleProofFile} className="hidden" />
              </label>
            )}
          </div>
        </div>

        {/* Agreement Checkboxes */}
        <div className="space-y-3 pt-6">
          <label className="flex items-start gap-3 cursor-pointer group">
            <input type="checkbox" checked={agreed1} onChange={(e) => setAgreed1(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
            <span className="text-[12px] text-gray-600 leading-relaxed group-hover:text-gray-900 transition-colors">
              အထက်ပါ ဆက်သွယ်ရန် အချက်အလက်များကို မှန်ကန်တိကျစွာ ဖြည့်ပြီးပါပြီ။
            </span>
          </label>
          <label className="flex items-start gap-3 cursor-pointer group">
            <input type="checkbox" checked={agreed2} onChange={(e) => setAgreed2(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
            <span className="text-[12px] text-gray-600 leading-relaxed group-hover:text-gray-900 transition-colors">
              ဖုန်းနံပါတ်၊ Email၊ လိပ်စာ၊ Telegram၊ Viber နံပါတ်များ မှားယွင်းစွာထည့်ထားပြီး Admin Team မှ ဆက်သွယ်၍မရပါက ဝယ်ယူသူ၏ တာဝန်သာဖြစ်ကြောင်း သဘောတူလက်ခံပါသည်။
            </span>
          </label>
        </div>

        {error && <p className="text-rose-500 text-sm mt-3 text-center">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={loading || !agreed1 || !agreed2}
          className="w-full mt-6 flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-base text-white bg-gradient-to-r from-indigo-600 to-purple-600 transition-all active:scale-[0.98] disabled:opacity-60"
        >
          {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> Placing Order...</> : `Place Order — ${formatPrice(totalAmount)} MMK`}
        </button>
      </motion.div>
    </motion.div>
  );
}

/* ─── ORDER CONFIRMATION INLINE ─── */
function OrderConfirmationInline({ orderData, shop, onContinueShopping, shopSlug }) {
  const [showInvoice, setShowInvoice] = useState(false);

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="max-w-lg mx-auto px-4 py-16 text-center"
      >
        <motion.div
          initial={{ scale: 0 }} animate={{ scale: 1 }}
          transition={{ type: 'spring', damping: 15, stiffness: 200 }}
          className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6"
        >
          <CheckCircle className="w-10 h-10 text-emerald-600" />
        </motion.div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Order တင်ပြီးပါပြီ။</h2>
        <p className="text-sm text-gray-500 mb-1">Your order has been placed successfully.</p>
        <p className="text-sm text-gray-500 mb-6">
          Order ID: <span className="font-bold text-gray-900">{orderData?.order_number}</span>
        </p>

        <div className="bg-gray-50 rounded-2xl p-4 mb-6 text-left text-sm text-gray-600 space-y-1">
          <p>The shop owner will review your order and contact you.</p>
        </div>

        <div className="flex flex-col gap-3">
          <button onClick={() => setShowInvoice(true)}
            className="w-full py-3.5 rounded-2xl font-bold text-sm bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg hover:shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2">
            <ReceiptIcon className="w-4 h-4" />
            Download Invoice
          </button>
          <button onClick={onContinueShopping}
            className="w-full py-3.5 rounded-2xl font-bold text-sm text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 transition-all active:scale-[0.98]">
            Continue Shopping
          </button>
        </div>
      </motion.div>

      <Receipt
        order={orderData}
        bot={shop}
        open={showInvoice}
        onClose={() => setShowInvoice(false)}
        receiptType="invoice"
      />
    </>
  );
}
