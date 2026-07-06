import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useQuery } from '@tanstack/react-query';
import {
  Home, UtensilsCrossed, Star, ShoppingCart, Plus, Minus, X, CheckCircle,
  AlertCircle, Loader2, Trash2, User
} from 'lucide-react';
import TelegramLoginModal from '../components/TelegramLoginModal';
import { qrExchangeTelegramToken, storeQRLogin, clearQRLogin } from '../lib/qrAuth';
import { API_BASE } from '../api/config';
import { formatPrice } from '../utils/formatPrice';
import {
  getQRPointsHistory, getQRCustomerDashboard,
  saveQRCustomerCart, getQRCustomerCart, clearQRCustomerCart,
  validateCoupon
} from '../api/qrMenu';

const TELEGRAM_BLUE = '#2AABEE';

function getCartKey(item, variants, addons) {
  const v = variants ? Object.values(variants).map(v => v.label).sort().join(',') : '';
  const a = addons ? addons.map(x => x.label).sort().join(',') : '';
  return `${item.id}_${v}_${a}`;
}

function calcItemPrice(item, variants, addons) {
  let price = Number(item.price) || 0;
  if (variants) {
    Object.values(variants).forEach(v => { price += Number(v.price_add) || 0; });
  }
  if (addons) {
    addons.forEach(a => { price += Number(a.price_add) || 0; });
  }
  return price;
}

function hasVariants(item) {
  return (item.data?.variants || []).length > 0;
}

function hasAddons(item) {
  return (item.data?.addons || []).length > 0;
}

const BADGE_STYLES = {
  popular: { label: 'Popular', cls: 'badge-rose', emoji: '🔥' },
  spicy: { label: 'Spicy', cls: 'badge-orange', emoji: '🌶️' },
  vegetarian: { label: 'Vegetarian', cls: 'badge-green', emoji: '🥬' },
  vegan: { label: 'Vegan', cls: 'badge-green', emoji: '🌱' },
  'gluten-free': { label: 'Gluten Free', cls: 'badge-yellow', emoji: '🌾' },
  new: { label: 'New', cls: 'badge-blue', emoji: '🆕' },
  hot: { label: 'Hot', cls: 'badge-orange', emoji: '☕' },
  iced: { label: 'Iced', cls: 'badge-blue', emoji: '🧊' },
  seasonal: { label: 'Seasonal', cls: 'badge-purple', emoji: '🍂' },
  fresh: { label: 'Fresh', cls: 'badge-green', emoji: '🥗' },
  limited: { label: 'Limited', cls: 'badge-rose', emoji: '⏳' },
  sale: { label: 'Sale', cls: 'badge-orange', emoji: '🏷️' },
  express: { label: 'Express', cls: 'badge-blue', emoji: '⚡' },
  relaxing: { label: 'Relaxing', cls: 'badge-purple', emoji: '🧘' },
  premium: { label: 'Premium', cls: 'badge-yellow', emoji: '💎' },
};

function TelegramIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  );
}

function getItemImageUrls(image_url, botId) {
  if (!image_url) return [];
  try {
    const parsed = JSON.parse(image_url);
    if (Array.isArray(parsed)) {
      return parsed.map(m => `${API_BASE}/telegram/file/${encodeURIComponent(m.file_id)}?bot_id=${botId}`);
    }
  } catch {}
  return [`${API_BASE}/telegram/file/${encodeURIComponent(image_url)}?bot_id=${botId}`];
}

function DetailModal({ item, shop, orderItems, onAddToOrder, onClose, browseOnly }) {
  const [qty, setQty] = useState(1);
  const [imgIdx, setImgIdx] = useState(0);
  const [selectedVariants, setSelectedVariants] = useState({});
  const [selectedAddons, setSelectedAddons] = useState([]);
  const images = getItemImageUrls(item.image_url, shop?.id);
  const badges = item.badges || [];
  const variants = item.data?.variants || [];
  const addons = item.data?.addons || [];
  const hasExtras = variants.length > 0 || addons.length > 0;
  const unitPrice = useMemo(() => calcItemPrice(item, selectedVariants, selectedAddons), [item, selectedVariants, selectedAddons]);
  const lineTotal = unitPrice * qty;

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const toggleAddon = (addon) => {
    setSelectedAddons(prev => {
      const ex = prev.find(a => a.label === addon.label);
      if (ex) return prev.filter(a => a.label !== addon.label);
      return [...prev, addon];
    });
  };

  const handleAdd = () => {
    if (qty < 1) return;
    onAddToOrder(item, qty, selectedVariants, selectedAddons);
    onClose();
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto shadow-xl">
        <div className="sticky top-0 bg-white z-10 flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h2 className="font-bold text-sm truncate pr-4">{item.name}</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-full"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-3">
          {images[0] && (
            <div className="relative rounded-xl overflow-hidden mb-3 bg-gray-50">
              <img src={images[imgIdx]} alt={item.name} className="w-full h-36 object-cover" />
              {images.length > 1 && (
                <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex gap-1">
                  {images.map((_, i) => (
                    <button key={i} onClick={() => setImgIdx(i)}
                      className={`w-1.5 h-1.5 rounded-full ${imgIdx === i ? 'bg-white' : 'bg-white/50'}`} />
                  ))}
                </div>
              )}
            </div>
          )}
          {badges.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {badges.map(b => { const cfg = BADGE_STYLES[b]; return cfg ? <span key={b} className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${cfg.cls}`}>{cfg.emoji || cfg.label}</span> : null; })}
            </div>
          )}
          {item.description && <p className="text-xs text-gray-500 mb-3">{item.description}</p>}

          {variants.map((vg, gi) => (
            <div key={gi} className="mb-3">
              <div className="text-xs font-semibold text-gray-700 mb-1.5">{vg.name}{vg.required ? ' *' : ''}</div>
              <div className="flex flex-wrap gap-1.5">
                {vg.options.map((opt, oi) => {
                  const isSelected = selectedVariants[vg.name]?.label === opt.label;
                  return (
                    <button key={oi} onClick={() => setSelectedVariants(prev => ({ ...prev, [vg.name]: opt }))}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${isSelected ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                      {opt.label}{Number(opt.price_add) > 0 && <span className="ml-1 text-indigo-500">+{formatPrice(opt.price_add, shop?.currency || 'MMK')}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {addons.length > 0 && (
            <div className="mb-3">
              <div className="text-xs font-semibold text-gray-700 mb-1.5">Add-ons</div>
              <div className="flex flex-wrap gap-1.5">
                {addons.map((addon, i) => {
                  const isSelected = selectedAddons.some(a => a.label === addon.label);
                  return (
                    <button key={i} onClick={() => toggleAddon(addon)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${isSelected ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                      {isSelected ? '✓ ' : ''}{addon.label}{Number(addon.price_add) > 0 && <span className="ml-1 text-emerald-500">+{formatPrice(addon.price_add, shop?.currency || 'MMK')}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
            <div>
              <div className="text-lg font-bold">{formatPrice(unitPrice, shop?.currency || 'MMK')}</div>
              {lineTotal !== unitPrice && <div className="text-[10px] text-gray-400">Total: {formatPrice(lineTotal, shop?.currency || 'MMK')}</div>}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => { if (qty > 1) setQty(q => q - 1); }} className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center"><Minus className="w-3 h-3" /></button>
              <span className="font-bold text-sm w-5 text-center">{qty}</span>
              <button onClick={() => setQty(q => q + 1)} className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center"><Plus className="w-3 h-3" /></button>
            </div>
          </div>

          {browseOnly ? (
            <div className="w-full mt-3 py-3 rounded-xl text-center text-xs font-semibold bg-gray-100 text-gray-400">
              Browse Only
            </div>
          ) : (
            <button onClick={handleAdd} className="w-full mt-3 py-3 rounded-xl font-semibold text-sm text-white text-center transition-all active:scale-[0.98]"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
              <ShoppingCart className="w-3.5 h-3.5 inline mr-1.5" />Add · {formatPrice(lineTotal, shop?.currency || 'MMK')}
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function QRMenuCustomerDashboard({ slug }) {
  const [activeTab, setActiveTab] = useState('home');
  const [authenticated, setAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [signInError, setSignInError] = useState('');
  const [exchangeLoading, setExchangeLoading] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [orderItems, setOrderItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [viewMode, setViewMode] = useState('grid');
  const [searchQ, setSearchQ] = useState('');
  const [activeCat, setActiveCat] = useState('all');
  const [orderSuccess, setOrderSuccess] = useState(null);
  const [expandedOrder, setExpandedOrder] = useState(null);

  // ── Telegram login (direct polling, bypasses ecommerce tgLoggedIn) ──
  const [tgStatus, setTgStatus] = useState('idle');
  const [tgTimeLeft, setTgTimeLeft] = useState(300);
  const [tgLoginUrl, setTgLoginUrl] = useState(null);
  const [tgBotUsername, setTgBotUsername] = useState(null);
  const pollingRef = useRef(null);
  const countdownRef = useRef(null);
  const tokenRef = useRef(null);
  const cartLoadedRef = useRef(false);
  const TIMEOUT_SECONDS = 300;
  const POLL_INTERVAL = 2500;

  // ── Shop / Menu query ──
  const { data: menuData, isLoading: menuLoading, error: menuError } = useQuery({
    queryKey: ['public-qr-menu', slug],
    queryFn: () => fetch(API_BASE + '/public/qr-menu/' + slug).then(res => { if (!res.ok) throw new Error('Not found'); return res.json(); }),
    enabled: !!slug, retry: 2, staleTime: 30000, refetchInterval: 60000,
  });

  const shop = menuData?.shop;
  const items = menuData?.items || [];
  const categories = menuData?.categories || [];
  const paymentMethods = menuData?.payment_methods || [];
  const pointsSettings = menuData?.points_settings || {};
  const orderFlowMode = menuData?.order_flow_mode || 'postpaid';
  const browseOnly = orderFlowMode === 'browse_only' || orderFlowMode === 'token_browse';
  const [browseMsg, setBrowseMsg] = useState('');

  const cleanupTelegramPolling = useCallback(() => {
    if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
    if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
  }, []);

  const resetTelegramLogin = useCallback(() => {
    cleanupTelegramPolling();
    setTgStatus('idle');
    setTgBotUsername(null);
    setTgLoginUrl(null);
    setTgTimeLeft(TIMEOUT_SECONDS);
    tokenRef.current = null;
  }, [cleanupTelegramPolling]);

  useEffect(() => { return cleanupTelegramPolling; }, [cleanupTelegramPolling]);

  const handleTelegramLogin = useCallback(() => {
    if (!shop?.bot_username) return;
    cleanupTelegramPolling();
    setTgStatus('waiting');
    setTgTimeLeft(TIMEOUT_SECONDS);
    setTgBotUsername(shop.bot_username);

    const token = crypto.randomUUID();
    tokenRef.current = token;
    const telegramUrl = `https://t.me/${shop.bot_username}?start=login-${token}`;
    setTgLoginUrl(telegramUrl);
    window.open(telegramUrl, '_blank', 'noopener');

    countdownRef.current = setInterval(() => {
      setTgTimeLeft((prev) => {
        if (prev <= 1) {
          setTgStatus('expired');
          cleanupTelegramPolling();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    pollingRef.current = setInterval(async () => {
      if (!tokenRef.current) return;
      try {
        const res = await fetch(API_BASE + '/auth/telegram/poll?token=' + tokenRef.current);
        const pollData = await res.json();
        if (pollData.status === 'confirmed' && pollData.token) {
          localStorage.setItem('telegram_token', pollData.token);
          if (pollData.user) localStorage.setItem('telegram_user', JSON.stringify(pollData.user));
          setTgStatus('confirmed');
          cleanupTelegramPolling();
          // Exchange the telegram JWT for a QR JWT
          if (slug) {
            setExchangeLoading(true);
            qrExchangeTelegramToken(slug, pollData.token, pollData.chat_id)
              .then(result => {
                storeQRLogin(result.token, result.customer_id, result.user);
                setAuthenticated(true);
              })
              .catch(err => setSignInError(err.message))
              .finally(() => { setExchangeLoading(false); resetTelegramLogin(); });
          }
        } else if (pollData.status === 'declined') {
          setTgStatus('declined');
          cleanupTelegramPolling();
        } else if (pollData.status === 'expired') {
          setTgStatus('expired');
          cleanupTelegramPolling();
        }
      } catch { /* ignore polling errors */ }
    }, POLL_INTERVAL);
  }, [shop, slug, cleanupTelegramPolling, resetTelegramLogin]);

  // ── Auth check on mount ──
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const token = sessionStorage.getItem('qr_customer_token');
    if (token) {
      setAuthenticated(true);
    }
    setAuthLoading(false);
  }, []);

  // ── Customer dashboard (authenticated) ──
  const { data: dashData, refetch: refetchDash } = useQuery({
    queryKey: ['qr-customer-dashboard', slug],
    queryFn: () => getQRCustomerDashboard(slug),
    enabled: !!slug && authenticated,
    retry: 1, staleTime: 10000,
  });

  // ── Points history (authenticated) ──
  const { data: pointsData, refetch: refetchPoints } = useQuery({
    queryKey: ['qr-points-history', slug],
    queryFn: () => getQRPointsHistory(slug),
    enabled: !!slug && authenticated,
    retry: 1, staleTime: 10000,
  });

  // ── Cart: load from backend on auth ──
  useEffect(() => {
    if (!authenticated || !slug || cartLoadedRef.current) return;
    cartLoadedRef.current = true;
    getQRCustomerCart(slug).then(data => {
      if (data?.items?.length > 0) setOrderItems(data.items);
    }).catch(() => {});
  }, [authenticated, slug]);

  // ── Cart functions ──
  const addToOrder = useCallback((item, qty, selectedVariants = {}, selectedAddons = []) => {
    const cartKey = getCartKey(item, selectedVariants, selectedAddons);
    setOrderItems(prev => {
      const ex = prev.find(oi => oi.cartKey === cartKey);
      if (ex) return prev.map(oi => oi.cartKey === cartKey ? { ...oi, qty: oi.qty + qty } : oi);
      return [...prev, { cartKey, item, qty, variants: selectedVariants, addons: selectedAddons }];
    });
  }, []);

  const updateQty = useCallback((id, qty) => {
    const key = String(id);
    if (qty <= 0) { setOrderItems(prev => prev.filter(oi => String(oi.cartKey || oi.item.id) !== key)); return; }
    setOrderItems(prev => prev.map(oi => String(oi.cartKey || oi.item.id) === key ? { ...oi, qty } : oi));
  }, []);

  const clearCart = useCallback(() => {
    setOrderItems([]);
    if (slug) clearQRCustomerCart(slug).catch(() => {});
  }, [slug]);

  // ── Persist cart to backend ──
  useEffect(() => {
    if (!authenticated || !slug || orderItems.length === 0) return;
    const timer = setTimeout(() => {
      saveQRCustomerCart(slug, orderItems).catch(() => {});
    }, 1000);
    return () => clearTimeout(timer);
  }, [authenticated, slug, orderItems]);

  // ── Computed values ──
  const filtered = useMemo(() => items.filter(item => {
    const catOk = activeCat === 'all' || item.category_id === activeCat;
    if (!catOk) return false;
    if (searchQ) {
      const q = searchQ.toLowerCase();
      return item.name?.toLowerCase().includes(q) || item.description?.toLowerCase().includes(q);
    }
    return true;
  }), [items, activeCat, searchQ]);

  const orderCount = useMemo(() => orderItems.reduce((s, oi) => s + oi.qty, 0), [orderItems]);
  const orderTotal = useMemo(() => orderItems.reduce((s, oi) => s + oi.qty * calcItemPrice(oi.item, oi.variants, oi.addons), 0), [orderItems]);

  const handleSignOut = () => {
    clearQRLogin();
    resetTelegramLogin();
    setAuthenticated(false);
    setAuthLoading(false);
    setOrderItems([]);
    cartLoadedRef.current = false;
    window.location.href = '/' + slug + '-qr-menu';
  };

  const handleCancelTelegram = () => {
    resetTelegramLogin();
  };

  // ── Checkout success ──
  const handleCheckoutSuccess = () => {
    setOrderSuccess('Order placed successfully!');
    clearCart();
    setShowCart(false);
    setShowCheckout(false);
    setActiveTab('home');
    setTimeout(() => setOrderSuccess(null), 4000);
    refetchDash();
    refetchPoints();
  };

  // ── Postpaid: just close cart, no order submitted ──
  const handlePostpaidDone = useCallback(() => {
    setShowCart(false);
    setActiveTab('home');
  }, []);

  // ── Loading state ──
  if (menuLoading || authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
            className="w-8 h-8 border-[3px] border-indigo-200 border-t-indigo-500 rounded-full mx-auto mb-3" />
          <p className="text-gray-400 text-xs">Loading...</p>
        </div>
      </div>
    );
  }

  if (!menuData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-xs">
          <div className="text-4xl mb-3">🍽️</div>
          <h2 className="text-base font-bold text-gray-800 mb-1">Menu Not Found</h2>
          <p className="text-xs text-gray-500 mb-4">This shop or menu doesn't exist.</p>
          <button onClick={() => window.location.reload()} className="px-5 py-2.5 bg-indigo-500 text-white rounded-xl font-semibold text-xs hover:bg-indigo-600 transition-all">Try Again</button>
        </div>
      </div>
    );
  }

  const customer = dashData?.customer || {};
  const stats = dashData?.stats || {};
  const recentOrders = dashData?.orders || [];
  const qrUser = authenticated ? JSON.parse(sessionStorage.getItem('qr_customer_user') || 'null') : null;

  const tabs = [
    { key: 'home', label: 'Home', icon: Home },
    { key: 'menus', label: 'Menus', icon: UtensilsCrossed },
    { key: 'points', label: 'Points', icon: Star },
  ];

  const renderHomeTab = () => (
    <div>
      {!authenticated ? (
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-5 text-white mb-3 text-center">
          <TelegramIcon className="w-8 h-8 mx-auto mb-2 text-indigo-200" />
          <h2 className="text-base font-bold mb-1">Welcome to {shop?.bot_full_name || 'Dashboard'}!</h2>
          <p className="text-indigo-100 text-xs mb-3">Sign in with Telegram to track orders and earn points</p>
          <button onClick={handleTelegramLogin} disabled={exchangeLoading}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-white text-indigo-600 font-semibold text-xs hover:bg-indigo-50 transition-all active:scale-[0.98] disabled:opacity-60">
            {exchangeLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <TelegramIcon className="w-3.5 h-3.5" />}
            <span>Continue with Telegram</span>
          </button>
        </div>
      ) : (
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-5 text-white mb-3">
          <h2 className="text-base font-bold mb-0.5">Welcome back, {customer.name || 'Customer'}!</h2>
          <p className="text-indigo-100 text-xs">{shop?.bot_full_name}</p>
          <div className="mt-3 flex items-center gap-1.5">
            <Star className="w-4 h-4 text-yellow-300" />
            <span className="text-xl font-bold">{customer.points_balance || 0}</span>
            <span className="text-indigo-200 text-xs">points</span>
          </div>
        </div>
      )}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {[
          { label: 'Orders', value: stats.total_orders || 0, color: 'bg-blue-50 text-blue-600' },
          { label: 'Completed', value: stats.completed || 0, color: 'bg-emerald-50 text-emerald-600' },
          { label: 'Pending', value: stats.pending || 0, color: 'bg-amber-50 text-amber-600' },
        ].map(s => (
          <div key={s.label} className={`rounded-xl py-3 text-center ${s.color}`}>
            <div className="text-lg font-bold">{s.value}</div>
            <div className="text-[10px] mt-0.5 opacity-75 font-medium">{s.label}</div>
          </div>
        ))}
      </div>
      <h3 className="font-semibold text-xs text-gray-700 mb-2">Recent Orders</h3>
      {recentOrders.length === 0 ? (
        <div className="text-center py-6 text-gray-400">
          <ShoppingCart className="w-8 h-8 mx-auto mb-1.5 opacity-50" />
          <p className="text-xs">No orders yet</p>
          <p className="text-[10px] mt-0.5">Browse the menu and place your first order!</p>
        </div>
      ) : (
        <div className="space-y-1.5">
            {recentOrders.slice(0, 10).map((order, i) => {
              const orderItemsData = (typeof order.items === 'string' ? JSON.parse(order.items) : order.items) || [];
              const itemCount = Array.isArray(orderItemsData) ? orderItemsData.reduce((s, oi) => s + (oi.quantity || oi.qty || 1), 0) : 0;
              const statusColors = {
                pending: 'bg-amber-100 text-amber-700',
                pending_review: 'bg-amber-100 text-amber-700',
                confirmed: 'bg-blue-100 text-blue-700',
                processing: 'bg-indigo-100 text-indigo-700',
                shipped: 'bg-purple-100 text-purple-700',
                delivered: 'bg-emerald-100 text-emerald-700',
                cancelled: 'bg-red-100 text-red-700',
              };
              const isExpanded = expandedOrder === order.id;
              return (
                <div key={order.id || i}>
                  <div onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                    className="bg-white rounded-xl px-3.5 py-3 shadow-sm active:scale-[0.99] transition-all cursor-pointer">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-xs text-gray-800">#{order.order_number || order.id}</span>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${statusColors[order.status] || 'bg-gray-100 text-gray-600'}`}>{order.status || 'Unknown'}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-400">{itemCount} item{itemCount !== 1 ? 's' : ''}</span>
                      <span className="font-semibold text-gray-800">{formatPrice(order.total_amount || order.final_amount, shop?.currency || 'MMK')}</span>
                    </div>
                    {order.created_at && <p className="text-[10px] text-gray-300 mt-0.5">{new Date(order.created_at).toLocaleDateString()}</p>}
                  </div>
                  {isExpanded && (
                    <div className="mx-2 mb-1.5 p-3 bg-gray-50 rounded-xl border border-gray-100 text-xs space-y-2">
                      {orderItemsData.map((item, j) => (
                        <div key={j} className="flex justify-between text-gray-600">
                          <span><span className="font-bold text-gray-800">{item.quantity || item.qty}x</span> {item.name}</span>
                          <span className="font-bold text-gray-700">{formatPrice(item.price, shop?.currency || 'MMK')}</span>
                        </div>
                      ))}
                      <div className="flex justify-between font-bold text-gray-900 border-t border-gray-200 pt-1.5">
                        <span>Total</span>
                        <span>{formatPrice(order.total_amount || order.final_amount, shop?.currency || 'MMK')}</span>
                      </div>
                      {order.created_at && (
                        <p className="text-[10px] text-gray-400 flex items-center gap-1">
                          <span>🕐</span> {new Date(order.created_at).toLocaleString()}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      )}
    </div>
  );

  const renderMenusTab = () => (
    <div>
      <div className="relative mb-2">
        <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
        </svg>
        <input value={searchQ} onChange={(e) => setSearchQ(e.target.value)} placeholder="Search menu..."
          className="w-full pl-8 pr-3 py-2 bg-gray-100 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-300" />
      </div>
      <div className="flex gap-1.5 overflow-x-auto pb-1.5 mb-2 scrollbar-hide">
        <button onClick={() => setActiveCat('all')}
          className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeCat === 'all' ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
          All
        </button>
        {categories.map(c => (
          <button key={c.id} onClick={() => setActiveCat(c.id)}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${activeCat === c.id ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
            {c.icon && <span>{c.icon}</span>}{c.name}
          </button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          <UtensilsCrossed className="w-8 h-8 mx-auto mb-1.5 opacity-50" />
          <p className="text-xs">No items found</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
          {filtered.map(item => {
            const imgs = getItemImageUrls(item.image_url, shop?.id);
            const badges = item.badges || [];
            const inOrderTotal = orderItems.filter(oi => oi.item.id === item.id).reduce((s, oi) => s + oi.qty, 0);
            return (
              <div key={item.id} onClick={() => setSelectedItem(item)}
                className="bg-white rounded-2xl shadow-sm overflow-hidden active:scale-[0.98] transition-transform cursor-pointer">
                <div className="aspect-square bg-gradient-to-br from-gray-50 to-gray-100 relative">
                  {imgs[0] ? <img src={imgs[0]} alt={item.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-3xl">🍽️</div>}
                  {badges.length > 0 && badges[0] && BADGE_STYLES[badges[0]] && (
                    <span className="absolute top-1.5 left-1.5 text-[10px] px-1.5 py-0.5 rounded-md bg-white/90 font-bold shadow-xs">{BADGE_STYLES[badges[0]].emoji}</span>
                  )}
                  {item.is_available === false && (
                    <span className="absolute bottom-1.5 left-1.5 text-[10px] px-1.5 py-0.5 rounded-md bg-rose-500/90 text-white font-semibold">Unavailable</span>
                  )}
                </div>
                <div className="p-2.5">
                  <h3 className="font-semibold text-xs text-gray-900 leading-tight line-clamp-1">{item.name}</h3>
                  {item.description && <p className="text-[10px] text-gray-400 leading-relaxed line-clamp-1 mt-0.5">{item.description}</p>}
                  <div className="flex items-center justify-between mt-1.5" onClick={(e) => e.stopPropagation()}>
                    <span className="font-bold text-xs text-indigo-600">{formatPrice(item.price, shop?.currency || 'MMK')}</span>
                    {item.is_available === false ? null : browseOnly ? (
                      <button onClick={() => { setBrowseMsg('Menu are currently browse only'); setTimeout(() => setBrowseMsg(''), 2500); }}
                        className="w-6 h-6 rounded-full bg-gray-200 text-gray-300 flex items-center justify-center cursor-default">
                        <Plus className="w-3 h-3" />
                      </button>
                    ) : (
                      inOrderTotal > 0 ? (
                        <div className="flex items-center gap-0.5">
                          <button onClick={() => { const first = orderItems.find(oi => oi.item.id === item.id); if (first) updateQty(first.cartKey, first.qty - 1); }}
                            className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center"><Minus className="w-2.5 h-2.5" /></button>
                          <span className="text-[10px] font-bold w-3.5 text-center text-gray-700">{inOrderTotal}</span>
                          <button onClick={() => { if (hasVariants(item)) setSelectedItem(item); else addToOrder(item, 1); }}
                            className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center"><Plus className="w-2.5 h-2.5" /></button>
                        </div>
                      ) : (
                        <button onClick={() => { if (hasVariants(item)) setSelectedItem(item); else addToOrder(item, 1); }}
                          className="w-6 h-6 rounded-full bg-indigo-500 text-white flex items-center justify-center shadow-sm">
                          <Plus className="w-3 h-3" />
                        </button>
                      )
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {!browseOnly && orderCount > 0 && (
        <button onClick={() => setShowCart(true)}
          className="fixed bottom-20 right-3 z-30 bg-indigo-500 text-white rounded-full shadow-lg flex items-center gap-1.5 px-3.5 py-2.5 active:scale-95 transition-transform text-xs font-bold">
          <ShoppingCart className="w-4 h-4" />
          <span>{formatPrice(orderTotal, shop?.currency || 'MMK')}</span>
          <span className="bg-white text-indigo-600 text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">{orderCount}</span>
        </button>
      )}
      <AnimatePresence>
        {showCart && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/50" onClick={() => { if (orderCount === 0) setShowCart(false); }}>
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl max-h-[75vh] flex flex-col shadow-xl"
              onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <h2 className="font-bold text-sm">Your Order</h2>
                <button onClick={() => setShowCart(false)} className="p-1.5 hover:bg-gray-100 rounded-full"><X className="w-4 h-4" /></button>
              </div>
              <div className="flex-1 overflow-y-auto px-4 py-2">
                {orderItems.map(oi => {
                  const imgs = getItemImageUrls(oi.item.image_url, shop?.id);
                  const itemPrice = calcItemPrice(oi.item, oi.variants, oi.addons);
                  return (
                    <div key={oi.cartKey} className="flex items-center gap-2.5 mb-2 p-2.5 bg-gray-50 rounded-xl">
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-200 shrink-0">
                        {imgs[0] ? <img src={imgs[0]} alt="" className="w-full h-full object-cover" /> : <div className="flex items-center justify-center h-full text-base">🍽️</div>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-xs truncate">{oi.item.name}</div>
                        {oi.variants && Object.keys(oi.variants).length > 0 && <div className="text-[10px] text-gray-400 truncate">{Object.values(oi.variants).map(v => v.label).join(', ')}</div>}
                        <div className="text-[10px] text-gray-400">{formatPrice(itemPrice, shop?.currency || 'MMK')} each</div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => updateQty(oi.cartKey, oi.qty - 1)} className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center"><Minus className="w-2.5 h-2.5" /></button>
                        <span className="font-semibold text-xs w-4 text-center">{oi.qty}</span>
                        <button onClick={() => updateQty(oi.cartKey, oi.qty + 1)} className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center"><Plus className="w-2.5 h-2.5" /></button>
                      </div>
                      <div className="font-semibold text-xs w-14 text-right">{formatPrice(itemPrice * oi.qty, shop?.currency || 'MMK')}</div>
                    </div>
                  );
                })}
                {orderItems.length === 0 && (
                  <div className="text-center py-8 text-gray-400">
                    <ShoppingCart className="w-8 h-8 mx-auto mb-1.5 opacity-50" />
                    <p className="text-xs">Your cart is empty</p>
                  </div>
                )}
              </div>
              {!browseOnly && orderItems.length > 0 && (
                <div className="border-t border-gray-100 px-4 py-3 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-gray-700">Total</span>
                    <span className="font-bold text-sm">{formatPrice(orderTotal, shop?.currency || 'MMK')}</span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={clearCart} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-xs font-semibold text-gray-500 hover:bg-gray-50"><Trash2 className="w-3.5 h-3.5 inline mr-1" />Clear</button>
                    {orderFlowMode === 'postpaid' ? (
                      <button onClick={handlePostpaidDone}
                        className="flex-1 py-2.5 rounded-xl font-semibold text-white text-xs transition-all active:scale-[0.98]"
                        style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                        Done
                      </button>
                    ) : (
                      <button onClick={() => { setShowCart(false); setShowCheckout(true); }}
                        className="flex-1 py-2.5 rounded-xl font-semibold text-white text-xs transition-all active:scale-[0.98]"
                        style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                        Checkout
                      </button>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {selectedItem && (
          <DetailModal item={selectedItem} shop={shop} orderItems={orderItems}
            onAddToOrder={addToOrder} onClose={() => setSelectedItem(null)} browseOnly={browseOnly} />
        )}
      </AnimatePresence>
    </div>
  );

  const renderPointsTab = () => (
    <div>
      {!authenticated ? (
        <div className="text-center py-8">
          <div className="bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl p-5 text-white mb-3 shadow-lg">
            <Star className="w-8 h-8 mx-auto mb-2 text-yellow-200" />
            <h2 className="text-base font-bold mb-1">Earn Points</h2>
            <p className="text-amber-100 text-xs mb-3">Sign in to earn and redeem points on your orders!</p>
            <button onClick={handleTelegramLogin} disabled={exchangeLoading}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-white text-amber-600 font-semibold text-xs hover:bg-amber-50 transition-all active:scale-[0.98] disabled:opacity-60">
              {exchangeLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <TelegramIcon className="w-3.5 h-3.5" />}
              <span>Continue with Telegram</span>
            </button>
          </div>
          {pointsSettings.enabled && (
            <div className="bg-white rounded-xl px-4 py-3 shadow-sm text-left">
              <h3 className="font-semibold text-xs text-gray-700 mb-1.5">How Points Work</h3>
              <p className="text-[11px] text-gray-500 leading-relaxed">
                Earn <span className="font-semibold text-amber-600">{pointsSettings.earn_rate || 1} point{(pointsSettings.earn_rate || 1) > 1 ? 's' : ''}</span> for every{' '}
                {formatPrice(pointsSettings.earn_per || 1000, shop?.currency || 'MMK')} spent.
                {pointsSettings.redeem_points ? (
                  <> Redeem <span className="font-semibold text-amber-600">{pointsSettings.redeem_points} points</span> for{' '}
                  {formatPrice(pointsSettings.redeem_value || 1000, shop?.currency || 'MMK')} discount.</>
                ) : ''}
              </p>
            </div>
          )}
        </div>
      ) : (
        <div>
          <div className="bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl p-5 text-white mb-3 text-center">
            <Star className="w-6 h-6 mx-auto mb-1.5 text-yellow-200" />
            <div className="text-3xl font-bold mb-0.5">{pointsData?.points_balance || customer.points_balance || 0}</div>
            <div className="text-amber-100 text-xs">Points Balance</div>
            <div className="flex justify-center gap-5 mt-3 text-[10px]">
              <div><span className="font-semibold text-white">+{pointsData?.total_earned || 0}</span> <span className="text-amber-200">Earned</span></div>
              <div><span className="font-semibold text-white">{pointsData?.total_redeemed || 0}</span> <span className="text-amber-200">Redeemed</span></div>
            </div>
          </div>
          {pointsSettings.enabled && (
            <div className="bg-white rounded-xl px-4 py-3 shadow-sm mb-3">
              <h3 className="font-semibold text-xs text-gray-700 mb-1.5">How Points Work</h3>
              <p className="text-[11px] text-gray-500 leading-relaxed">
                Earn <span className="font-semibold text-amber-600">{pointsSettings.earn_rate || 1} point{(pointsSettings.earn_rate || 1) > 1 ? 's' : ''}</span> for every{' '}
                {formatPrice(pointsSettings.earn_per || 1000, shop?.currency || 'MMK')} spent.
                {pointsSettings.redeem_points ? (
                  <> Redeem <span className="font-semibold text-amber-600">{pointsSettings.redeem_points} points</span> for{' '}
                  {formatPrice(pointsSettings.redeem_value || 1000, shop?.currency || 'MMK')} discount.</>
                ) : ''}
              </p>
            </div>
          )}
          <h3 className="font-semibold text-xs text-gray-700 mb-2">Points History</h3>
          {(!pointsData?.transactions || pointsData.transactions.length === 0) ? (
            <div className="text-center py-6 text-gray-400">
              <Star className="w-8 h-8 mx-auto mb-1.5 opacity-50" />
              <p className="text-xs">No points activity yet</p>
              <p className="text-[10px] mt-0.5">Start ordering to earn points!</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {pointsData.transactions.map((tx, i) => (
                <div key={tx.id || i} className="bg-white rounded-xl px-3.5 py-3 shadow-sm flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${tx.type === 'earn' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                    {tx.type === 'earn' ? <Plus className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-gray-800">{tx.description || (tx.type === 'earn' ? 'Points earned' : 'Points redeemed')}</div>
                    <div className="text-[10px] text-gray-400">{tx.created_at ? new Date(tx.created_at).toLocaleDateString() : ''}</div>
                  </div>
                  <div className={`font-semibold text-xs ${tx.type === 'earn' ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {tx.type === 'earn' ? '+' : '-'}{tx.points} pts
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {!authenticated ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/50"
          onClick={(e) => { if (e.target === e.currentTarget) window.location.href = '/' + slug + '-qr-menu'; }}>
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl p-6 w-full max-w-xs text-center shadow-xl">
            {shop?.profile_picture ? (
              <img src={shop.profile_picture} alt="" className="w-14 h-14 rounded-full mx-auto mb-3 object-cover" />
            ) : (
              <div className="w-14 h-14 bg-gradient-to-br from-indigo-100 to-indigo-200 rounded-full flex items-center justify-center mx-auto mb-3">
                <User className="w-7 h-7 text-indigo-600" />
              </div>
            )}
            <h2 className="text-lg font-bold text-gray-900 mb-1">{shop?.bot_full_name || 'Dashboard'}</h2>
            <p className="text-xs text-gray-500 mb-5">Sign in to track orders & earn points.</p>

            {tgStatus === 'waiting' || tgStatus === 'confirmed' ? (
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                  <span className="text-xs font-medium text-gray-700">
                    {tgStatus === 'confirmed' ? 'Signing in...' : 'Waiting for Telegram confirmation...'}
                  </span>
                </div>
                {tgStatus === 'waiting' && tgTimeLeft > 0 && (
                  <p className="text-[10px] text-gray-400 mb-3">Auto-cancels in {tgTimeLeft}s</p>
                )}
                {tgLoginUrl && (
                  <a href={tgLoginUrl} target="_blank" rel="noopener"
                    className="inline-block text-xs text-indigo-500 hover:text-indigo-600 underline mb-3">
                    Open Telegram again
                  </a>
                )}
              </div>
            ) : (
              <button onClick={handleTelegramLogin} disabled={exchangeLoading}
                className="w-full flex items-center justify-center gap-2.5 px-5 py-3 rounded-xl font-semibold text-sm text-white transition-all active:scale-[0.98] disabled:opacity-60"
                style={{ backgroundColor: TELEGRAM_BLUE }}>
                {exchangeLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <TelegramIcon className="w-4 h-4" />}
                <span>Continue with Telegram</span>
              </button>
            )}

            {tgStatus === 'expired' && (
              <button onClick={handleTelegramLogin}
                className="mt-2 w-full text-xs text-amber-600 font-medium hover:text-amber-700 transition-colors">
                Link expired — Try Again
              </button>
            )}

            {signInError && (
              <p className="mt-2 text-[11px] text-red-500">{signInError}</p>
            )}

            <button onClick={() => window.location.href = '/' + slug + '-qr-menu'}
              className="mt-3 text-xs text-gray-400 hover:text-gray-600 transition-colors">
              Back to Menu
            </button>
          </motion.div>
        </motion.div>
      ) : (
        <div style={{ paddingBottom: 64 }}>
          <div className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-gray-100">
            <div className="flex items-center justify-between px-4 py-2.5">
              <div className="flex items-center gap-2.5">
                {shop?.profile_picture && (
                  <img src={shop.profile_picture} alt="" className="w-8 h-8 rounded-full object-cover" />
                )}
                <div>
                  <h1 className="font-semibold text-sm text-gray-900 leading-tight">{shop?.bot_full_name || 'Dashboard'}</h1>
                  {customer.name && <p className="text-[10px] text-gray-400">{customer.name}</p>}
                </div>
              </div>
              <button onClick={handleSignOut} className="text-[10px] text-gray-400 hover:text-gray-600 px-2.5 py-1 rounded-lg border border-gray-200 font-medium">
                Sign Out
              </button>
            </div>
          </div>

          <AnimatePresence>
            {orderSuccess && (
              <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                className="fixed top-4 left-4 right-4 z-50 bg-emerald-500 text-white px-3.5 py-2.5 rounded-xl shadow-lg flex items-center gap-1.5 text-xs font-semibold">
                <CheckCircle className="w-4 h-4 shrink-0" />
                {orderSuccess}
              </motion.div>
            )}
            {browseMsg && (
              <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                className="fixed top-4 left-4 right-4 z-50 bg-amber-500 text-white px-3.5 py-2.5 rounded-xl shadow-lg flex items-center gap-1.5 text-xs font-semibold">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {browseMsg}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="p-4 max-w-4xl mx-auto w-full">
            {activeTab === 'home' && renderHomeTab()}
            {activeTab === 'menus' && renderMenusTab()}
            {activeTab === 'points' && renderPointsTab()}
          </div>

          <AnimatePresence>
            {showCheckout && (
              <CheckoutFlow
                orderItems={orderItems} orderTotal={orderTotal} shop={shop} slug={slug}
                paymentMethods={paymentMethods} pointsSettings={pointsSettings}
                customerId={customer.id} customerPoints={customer.points_balance || 0}
                onSuccess={handleCheckoutSuccess}
                onClose={() => setShowCheckout(false)}
              />
            )}
          </AnimatePresence>

          <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/90 backdrop-blur-md border-t border-gray-100 flex" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                  className={`flex-1 flex flex-col items-center justify-center py-2 transition-all ${isActive ? 'text-indigo-500' : 'text-gray-400'}`}>
                  <Icon className={`w-4 h-4 mb-0.5 ${isActive ? 'fill-indigo-500' : ''}`} />
                  <span className={`text-[9px] font-semibold ${isActive ? 'text-indigo-500' : 'text-gray-400'}`}>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <TelegramLoginModal status={tgStatus} timeLeft={tgTimeLeft} loginUrl={tgLoginUrl} botUsername={tgBotUsername}
        onCancel={handleCancelTelegram} onTryAgain={handleTelegramLogin} />
    </div>
  );
}

function CheckoutFlow({ orderItems, orderTotal, shop, slug, paymentMethods, pointsSettings, customerId: propCustomerId, customerPoints, onSuccess, onClose }) {
  // Fallback to sessionStorage customer_id if prop is missing
  const customerId = propCustomerId || (typeof window !== 'undefined' ? sessionStorage.getItem('qr_customer_id') : null);
  const [step, setStep] = useState(1);
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [proofFile, setProofFile] = useState(null);
  const [proofPreview, setProofPreview] = useState(null);
  const [error, setError] = useState('');
  const [pointsToRedeem, setPointsToRedeem] = useState(0);
  const [pointsDiscount, setPointsDiscount] = useState(0);
  const [redeeming, setRedeeming] = useState(false);
  const [done, setDone] = useState(false);
  const [isPointsPayment, setIsPointsPayment] = useState(false);
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [checkingCoupon, setCheckingCoupon] = useState(false);

  const maxRedeem = pointsSettings.min_redeem || 50;
  const netTotal = Math.max(0, orderTotal - pointsDiscount - couponDiscount);

  const redeemPointsRate = Number(pointsSettings.redeem_points) || 100;
  const redeemValue = Number(pointsSettings.redeem_value) || 1000;
  const pointsMmkValue = customerPoints ? Math.floor((customerPoints / redeemPointsRate) * redeemValue) : 0;
  const pointsNeededForFull = orderTotal > 0 ? Math.ceil((orderTotal / redeemValue) * redeemPointsRate) : 0;
  const effectivePoints = Math.min(customerPoints || 0, pointsNeededForFull);
  const effectiveDiscount = isPointsPayment ? Math.min(pointsMmkValue, orderTotal) : pointsDiscount;
  const displayTotal = isPointsPayment ? Math.max(0, orderTotal - effectiveDiscount) : netTotal;

  const handleRedeemPoints = async () => {
    if (!customerId || pointsToRedeem < maxRedeem) return;
    setRedeeming(true);
    try {
      const result = await fetch(API_BASE + '/public/qr-menu/customer/redeem-points', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customer_id: customerId, points_to_use: pointsToRedeem, order_total: orderTotal, bot_id: shop.id }),
      }).then(r => r.json());
      if (result.discount !== undefined) {
        setPointsDiscount(result.discount);
        setPointsToRedeem(result.points_used || 0);
      }
    } catch {}
    setRedeeming(false);
  };

  const handleApplyCoupon = async () => {
    if (!couponInput.trim() || !shop?.id) return;
    setCheckingCoupon(true);
    try {
      const result = await validateCoupon(couponInput.trim(), orderTotal, shop.id);
      if (result.valid) {
        setAppliedCoupon({ code: result.coupon_code, type: result.coupon_type, discount: result.discount });
        setCouponDiscount(result.discount);
        setCouponInput('');
      } else {
        setAppliedCoupon({ error: result.message });
        setCouponDiscount(0);
      }
    } catch {
      setAppliedCoupon({ error: 'Failed to validate coupon' });
    }
    setCheckingCoupon(false);
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('bot_id', String(shop.id));
      const res = await fetch(API_BASE + '/public/upload/photo', { method: 'POST', body: form });
      const data = await res.json();
      setProofFile(data.file_id || data.id);
      setProofPreview(URL.createObjectURL(file));
    } catch {
      setError('Upload failed');
    }
    setUploading(false);
  };

  const handleSubmit = async () => {
    if (!selectedMethod) return;
    if (!isPointsPayment && !proofFile) {
      setError('Please upload payment proof screenshot');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const body = {
        bot_id: shop.id,
        customer_name: 'QR Customer',
        phone: '-',
        items: orderItems.map(oi => ({
          item_id: oi.item.id,
          name: oi.item.name,
          price: calcItemPrice(oi.item, oi.variants, oi.addons),
          quantity: oi.qty,
          variants: oi.variants,
          addons: oi.addons,
        })),
        total_amount: displayTotal,
        payment_proof: '',
        payment_method: isPointsPayment ? 'Points' : (selectedMethod.id || selectedMethod.name),
        notes: 'QR Menu - Customer Dashboard',
        customer_id: customerId || '',
        points_earned: 0,
        points_redeemed: isPointsPayment ? effectivePoints : (pointsDiscount > 0 ? pointsToRedeem : 0),
        points_discount: isPointsPayment ? effectiveDiscount : pointsDiscount,
        coupon_code: appliedCoupon?.code || '',
        coupon_discount: couponDiscount,
      };
      const res = await fetch(API_BASE + '/public/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Order failed');
      }
      setDone(true);
      setTimeout(() => { onSuccess?.(); }, 1500);
    } catch (err) {
      setError(err.message);
    }
    setSubmitting(false);
  };

  if (done) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white rounded-2xl p-6 max-w-xs w-full text-center shadow-xl">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-16 h-16 bg-gradient-to-br from-emerald-100 to-emerald-200 rounded-full flex items-center justify-center mx-auto mb-3">
            <CheckCircle className="w-8 h-8 text-emerald-600" />
          </motion.div>
          <h2 className="text-base font-bold text-gray-900 mb-1">Order Placed!</h2>
          <p className="text-xs text-gray-500">Your order has been submitted for review.</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50"
      onClick={(e) => { if (e.target === e.currentTarget && !submitting) onClose(); }}>
      <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        className="bg-white rounded-t-2xl w-full max-w-md max-h-[85vh] overflow-y-auto shadow-xl">
        <div className="sticky top-0 bg-white z-10 flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h2 className="font-bold text-sm">{step === 1 ? 'Payment Method' : 'Confirm Payment'}</h2>
          <button onClick={onClose} disabled={submitting} className="p-1.5 hover:bg-gray-100 rounded-full"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-3">
          {error && (
            <div className="flex items-center gap-1.5 p-2.5 bg-red-50 border border-red-200 rounded-xl mb-3">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <p className="text-[11px] font-medium text-red-700">{error}</p>
            </div>
          )}

          {step === 1 && (
            <div>
              <p className="text-xs text-gray-500 mb-3">Select a payment method to continue</p>
              {paymentMethods.length === 0 ? (
                <div className="text-center py-6 text-gray-400">
                  <p className="text-xs">No payment methods available</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {paymentMethods.map(pm => (
                    <button key={pm.id} onClick={() => { setSelectedMethod(pm); setStep(2); }}
                      className={`p-3 rounded-xl border text-left transition-all ${selectedMethod?.id === pm.id ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'}`}>
                      <div className="font-semibold text-xs text-gray-800 truncate">{pm.name}</div>
                      {pm.account_name && <div className="text-[10px] text-gray-400 truncate mt-0.5">{pm.account_name}</div>}
                    </button>
                  ))}
                </div>
              )}
              {pointsSettings.enabled && (
              <button onClick={() => { setIsPointsPayment(true); setSelectedMethod({ id: null, name: 'Use Points' }); setStep(2); }}
                className="w-full p-3 rounded-xl border text-left transition-all border-amber-200 hover:border-amber-300 bg-amber-50 mt-2">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <Star className="w-3.5 h-3.5 text-amber-500" />
                  <span className="font-semibold text-xs text-gray-800">Use Points</span>
                </div>
                <div className="text-[10px] text-amber-600">{customerPoints ? `${customerPoints} pts available` : 'Pay with points'}</div>
              </button>
              )}
            </div>
          )}

          {step === 2 && selectedMethod && (
            <div>
              <div className="bg-gray-50 rounded-xl p-3 mb-3">
                <h3 className="font-semibold text-xs text-gray-700 mb-1.5">Order Summary</h3>
                <div className="space-y-1 text-xs">
                  {orderItems.map(oi => (
                    <div key={oi.cartKey} className="flex justify-between text-gray-500">
                      <span>{oi.item.name} x{oi.qty}</span>
                      <span>{formatPrice(calcItemPrice(oi.item, oi.variants, oi.addons) * oi.qty, shop?.currency || 'MMK')}</span>
                    </div>
                  ))}
                  <div className="border-t border-gray-200 pt-1.5 mt-1.5">
                    <div className="flex justify-between font-semibold text-gray-800">
                      <span>Subtotal</span>
                      <span>{formatPrice(orderTotal, shop?.currency || 'MMK')}</span>
                    </div>
                    {isPointsPayment ? (
                      <div className="flex justify-between text-amber-600 text-[10px] mt-0.5">
                        <span>Pay with Points ({formatPrice(effectivePoints)} pts)</span>
                        <span>-{formatPrice(effectiveDiscount, shop?.currency || 'MMK')}</span>
                      </div>
                    ) : pointsDiscount > 0 && (
                      <div className="flex justify-between text-emerald-600 text-[10px] mt-0.5">
                        <span>Points discount</span>
                        <span>-{formatPrice(pointsDiscount, shop?.currency || 'MMK')}</span>
                      </div>
                    )}
                    {couponDiscount > 0 && (
                      <div className="flex justify-between text-violet-600 text-[10px] mt-0.5">
                        <span>Coupon ({appliedCoupon?.code})</span>
                        <span>-{formatPrice(couponDiscount, shop?.currency || 'MMK')}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-semibold text-gray-800 text-sm mt-0.5">
                      <span>Total</span>
                      <span>{formatPrice(displayTotal, shop?.currency || 'MMK')}</span>
                    </div>
                  </div>
                </div>
              </div>

              {!isPointsPayment && !appliedCoupon?.code && !appliedCoupon?.error && (
                <details className="mb-3">
                  <summary className="text-xs text-gray-400 cursor-pointer font-semibold select-none">Have a coupon?</summary>
                  <div className="flex gap-2 mt-2">
                    <input value={couponInput} onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                      onKeyDown={(e) => e.key === 'Enter' && handleApplyCoupon()}
                      placeholder="Enter code" className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-violet-500 outline-none uppercase" />
                    <button onClick={handleApplyCoupon} disabled={checkingCoupon || !couponInput.trim()}
                      className="px-4 py-2 bg-violet-500 text-white rounded-xl text-xs font-semibold hover:bg-violet-600 disabled:opacity-50 transition-all">
                      {checkingCoupon ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Apply'}
                    </button>
                  </div>
                </details>
              )}
              {appliedCoupon?.code && (
                <div className="flex items-center justify-between bg-emerald-50 rounded-xl px-3 py-2 mb-3 border border-emerald-200">
                  <span className="text-xs font-semibold text-emerald-600">{appliedCoupon.code}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-emerald-600">-{formatPrice(couponDiscount, shop?.currency || 'MMK')}</span>
                    <button onClick={() => { setAppliedCoupon(null); setCouponDiscount(0); }} className="p-0.5">
                      <X className="w-3 h-3 text-emerald-400" />
                    </button>
                  </div>
                </div>
              )}
              {appliedCoupon?.error && (
                <div className="flex items-center justify-between bg-red-50 rounded-xl px-3 py-2 mb-3 border border-red-200">
                  <span className="text-xs text-red-600">{appliedCoupon.error}</span>
                  <button onClick={() => setAppliedCoupon(null)} className="p-0.5">
                    <X className="w-3 h-3 text-red-400" />
                  </button>
                </div>
              )}

              {!isPointsPayment && (
                <div className="bg-white rounded-xl p-3 border border-gray-200 mb-3">
                  <div className="font-semibold text-xs text-gray-700 mb-1">{selectedMethod.name}</div>
                  {selectedMethod.account_name && <p className="text-[11px] text-gray-500">Name: {selectedMethod.account_name}</p>}
                  {selectedMethod.payment_number && <p className="text-[11px] text-gray-500">Number: {selectedMethod.payment_number}</p>}
                  {selectedMethod.qr_code_url && (() => {
                    const qrUrl = selectedMethod.qr_code_url.startsWith('http')
                      ? selectedMethod.qr_code_url
                      : `${API_BASE}/telegram/file/${encodeURIComponent(selectedMethod.qr_code_url)}?bot_id=${shop.id}`;
                    const dlUrl = qrUrl + (qrUrl.includes('?') ? '&' : '?') + 'download=payment.jpg';
                    return (
                      <div className="mt-2 flex flex-col items-center gap-1">
                        <img src={qrUrl} alt="Payment QR" className="w-24 h-24 object-contain rounded-lg" />
                        <a href={dlUrl} className="text-[11px] font-medium text-indigo-500 hover:underline">Download QR</a>
                      </div>
                    );
                  })()}
                </div>
              )}

              {pointsSettings.enabled && customerId && customerPoints > 0 && pointsDiscount === 0 && (
                <div className="bg-amber-50 rounded-xl p-3 mb-3 border border-amber-200">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Star className="w-3.5 h-3.5 text-amber-500" />
                    <span className="font-semibold text-xs text-amber-700">Points: {customerPoints} pts</span>
                  </div>
                  <div className="flex gap-1.5">
                    <input type="number" min={maxRedeem} max={customerPoints} value={pointsToRedeem || ''}
                      onChange={(e) => setPointsToRedeem(Number(e.target.value))} placeholder={`Min ${maxRedeem}`}
                      className="flex-1 px-2.5 py-1.5 rounded-lg border border-amber-300 text-xs focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white" />
                    <button onClick={handleRedeemPoints} disabled={redeeming || pointsToRedeem < maxRedeem}
                      className="px-3 py-1.5 bg-amber-500 text-white rounded-lg text-xs font-semibold hover:bg-amber-600 disabled:opacity-50 transition-all">
                      {redeeming ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Use'}
                    </button>
                  </div>
                  {pointsToRedeem > 0 && pointsToRedeem < maxRedeem && (
                    <p className="text-[10px] text-amber-600 mt-1">Minimum {maxRedeem} points</p>
                  )}
                </div>
              )}

              {isPointsPayment && (
                <div className="bg-amber-50 rounded-xl p-3 mb-3 border border-amber-200">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Star className="w-3.5 h-3.5 text-amber-500" />
                    <span className="font-semibold text-xs text-amber-700">Pay with Points</span>
                  </div>
                  <div className="text-[11px] text-amber-600 space-y-0.5">
                    <p><strong>{customerPoints || 0} Points</strong> = {formatPrice(pointsMmkValue, shop?.currency || 'MMK')}</p>
                    {customerPoints < maxRedeem ? (
                      <p className="text-rose-600 font-medium">Minimum {maxRedeem} points required to use this payment method</p>
                    ) : displayTotal > 0 ? (
                      <p className="text-rose-600 font-medium">Not enough points — need {formatPrice(pointsNeededForFull - (customerPoints || 0))} more pts to cover this order</p>
                    ) : (
                      <p className="text-emerald-600 font-medium">Points cover the full order!</p>
                    )}
                    <p className="text-[10px] text-amber-400 mt-1">No payment proof needed</p>
                  </div>
                </div>
              )}

              {!isPointsPayment && (
              <div className="mb-3">
                <p className="text-xs font-semibold text-gray-700 mb-1.5">Payment Proof <span className="text-red-400">*</span></p>
                {proofPreview ? (
                  <div className="relative inline-block">
                    <img src={proofPreview} alt="Proof" className="w-20 h-20 object-cover rounded-lg" />
                    <button onClick={() => { setProofFile(null); setProofPreview(null); }}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center"><X className="w-2.5 h-2.5" /></button>
                  </div>
                ) : (
                  <label className="flex items-center justify-center h-20 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-gray-400 transition-colors">
                    <div className="text-center">
                      {uploading ? (
                        <Loader2 className="w-5 h-5 animate-spin text-gray-400 mx-auto" />
                      ) : (
                        <>
                          <svg className="w-5 h-5 mx-auto mb-0.5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
                          <span className="text-[10px] text-gray-400">Upload screenshot</span>
                        </>
                      )}
                    </div>
                    <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                  </label>
                )}
              </div>
              )}

              <button onClick={handleSubmit} disabled={submitting || !selectedMethod || (!isPointsPayment && !proofFile) || (isPointsPayment && (customerPoints < maxRedeem || displayTotal > 0))}
                className="w-full py-3 rounded-xl font-semibold text-xs text-white text-center transition-all active:scale-[0.98] disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin inline" /> : isPointsPayment ? (customerPoints < maxRedeem ? `Min ${maxRedeem} pts` : displayTotal > 0 ? 'Insufficient Points' : 'Pay with Points') : `Pay ${formatPrice(netTotal, shop?.currency || 'MMK')}`}
              </button>

              <button onClick={() => { setStep(1); setIsPointsPayment(false); }} disabled={submitting}
                className="w-full mt-1.5 py-2.5 text-xs text-gray-400 hover:text-gray-600 transition-colors">
                Back to payment methods
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
