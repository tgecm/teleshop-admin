import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getPublicShop, getPublicShopByDomain, getShopBio } from '../api/public';
import {
  ShoppingBag, Package, AlertCircle, ShoppingCart, ChevronRight,
  Tag, Sparkles, Clock, Search, X, ChevronLeft, ChevronDown, ArrowUpDown, Newspaper,
  Minus, Plus, Trash2, LogOut, CheckCircle, Loader2, User,
  MessageCircle, Send, ImageUp, Copy
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { THEMES, DEFAULT_THEME } from '../themes/themes';
import { useToastStore } from '../store/toastStore';
import ShopBanner from '../components/shared/ShopBanner';
import { useAuth } from '../context/AuthContext';
import { useTelegramAuth } from '../context/TelegramAuthContext';
import { useTelegramLogin } from '../hooks/useTelegramLogin';
import TelegramLoginModal from '../components/TelegramLoginModal';
import Receipt from '../components/orders/Receipt';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { signInWithGoogle } from '../lib/googleSignIn';
import { isMainDomain } from '../utils/authProxy';
import { useAuthTokenFromUrl } from '../hooks/useAuthTokenFromUrl';
import NewsfeedFeed from '../components/NewsfeedFeed';

const API_BASE = 'https://api.telegramecommerce.shop';

function authHeaders() {
  const token = localStorage.getItem('telegram_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const CART_KEY = 'ecommerce_cart';

function getCartKey(slug, viaDomain, viewMode) {
  const base = CART_KEY + '_' + (slug || 'domain');
  if (viewMode === 'guest') return base + '_guest';
  if (viewMode === 'ecommerce') return base + '_user';
  return base;
}

const COLOR_NAMES = {
  '#FF0000': 'Red', '#2563EB': 'Blue', '#16A34A': 'Green', '#EAB308': 'Yellow',
  '#EA580C': 'Orange', '#9333EA': 'Purple', '#EC4899': 'Pink', '#000000': 'Black',
  '#FFFFFF': 'White', '#6B7280': 'Gray', '#78350F': 'Brown', '#0D9488': 'Teal',
};

function getPublicImageUrls(image_url, bot_id) {
  if (!image_url) return [];
  if (image_url.startsWith('http')) return [image_url];
  try {
    const parsed = JSON.parse(image_url);
    if (Array.isArray(parsed)) {
      return parsed
        .filter(m => m.type === 'photo' || m.file_id)
        .map(m => `${API_BASE}/telegram/file/${encodeURIComponent(m.file_id)}?bot_id=${bot_id}`);
    }
  } catch {}
  const clean = image_url.startsWith('[') ? JSON.parse(image_url) : image_url;
  if (Array.isArray(clean)) {
    return clean.map(f => `${API_BASE}/telegram/file/${encodeURIComponent(f.file_id || f)}?bot_id=${bot_id}`);
  }
  return [`${API_BASE}/telegram/file/${encodeURIComponent(image_url)}?bot_id=${bot_id}`];
}

function formatPrice(price) {
  return Number(price).toLocaleString();
}

function normalizeSearchText(text) {
  if (!text) return '';
  let s = text.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const result = [];
  for (const ch of s) {
    const code = ch.codePointAt(0);
    if (code >= 0x1D400 && code <= 0x1D7FF) {
      const pos = (code - 0x1D400) % 52;
      result.push(String.fromCharCode(0x61 + (pos < 26 ? pos : pos - 26)));
    } else {
      result.push(ch);
    }
  }
  return result.join('');
}

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="h-48 bg-gradient-to-r from-gray-200 to-gray-100 animate-pulse" />
      <div className="max-w-7xl mx-auto px-4 -mt-16 relative z-10">
        <div className="bg-white rounded-3xl p-6 shadow-xl mb-8 animate-pulse">
          <div className="h-8 w-48 bg-gray-200 rounded-lg mb-3" />
          <div className="h-4 w-32 bg-gray-100 rounded-lg" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-white rounded-3xl overflow-hidden shadow-sm animate-pulse">
              <div className="aspect-square bg-gray-100" />
              <div className="p-4 space-y-3">
                <div className="h-4 w-3/4 bg-gray-200 rounded-lg" />
                <div className="h-3 w-full bg-gray-100 rounded-lg" />
                <div className="h-5 w-1/3 bg-gray-200 rounded-lg" />
                <div className="h-10 w-full bg-gray-100 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ProductDetailModal({ product, shop, onClose, onAddToCart, cartQty, viewMode, sentProducts, setSentProducts, slug }) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [selectedColor, setSelectedColor] = useState(null);
  const touchStartX = useRef(null);
  const images = getPublicImageUrls(product.image_url, shop?.id);
  const isOutOfStock = product.stock_quantity !== null && product.stock_quantity === 0;
  const productColors = product.specifications?.colors && Array.isArray(product.specifications.colors)
    ? product.specifications.colors : [];

  const handleTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const diff = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(diff) > 50) {
      if (diff > 0 && currentImageIndex > 0) setCurrentImageIndex(i => i - 1);
      else if (diff < 0 && currentImageIndex < images.length - 1) setCurrentImageIndex(i => i + 1);
    }
    touchStartX.current = null;
  };

  const prevImage = useCallback(() => { if (currentImageIndex > 0) setCurrentImageIndex(i => i - 1); }, [currentImageIndex]);
  const nextImage = useCallback(() => { if (currentImageIndex < images.length - 1) setCurrentImageIndex(i => i + 1); }, [currentImageIndex, images.length]);

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); if (e.key === 'ArrowLeft') prevImage(); if (e.key === 'ArrowRight') nextImage(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose, prevImage, nextImage]);

  const colorImages = productColors.filter(c => c.file_id).map(c => ({
    file_id: c.file_id,
    color: c.color,
    url: `${API_BASE}/telegram/file/${encodeURIComponent(c.file_id)}?bot_id=${shop?.id}`,
  }));

  const allImages = selectedColor
    ? [...(colorImages.filter(c => c.color === selectedColor).map(c => c.url)), ...images]
    : images;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <motion.div
        initial={{ y: '100%', opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="relative bg-white w-full max-w-lg md:rounded-[32px] md:mx-4 max-h-[92svh] overflow-y-auto rounded-t-[32px] shadow-2xl"
      >
        <button onClick={onClose} className="absolute top-4 right-4 z-20 p-2.5 bg-white/90 backdrop-blur-md rounded-full shadow-lg hover:bg-white active:scale-90 transition-all">
          <X className="w-5 h-5 text-gray-700" />
        </button>

        <div className="relative aspect-square bg-gray-100 overflow-hidden" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
          <AnimatePresence mode="wait">
            <motion.img
              key={currentImageIndex} initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} transition={{ duration: 0.2 }}
              src={allImages[currentImageIndex] || '/placeholder.svg'} alt={product.name}
              className="w-full h-full object-cover"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          </AnimatePresence>
          {allImages.length > 1 && (
            <>
              {currentImageIndex > 0 && (
                <button onClick={prevImage} className="absolute left-3 top-1/2 -translate-y-1/2 p-2.5 bg-white/90 backdrop-blur-md rounded-full shadow-lg">
                  <ChevronLeft className="w-5 h-5 text-gray-700" />
                </button>
              )}
              {currentImageIndex < allImages.length - 1 && (
                <button onClick={nextImage} className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 bg-white/90 backdrop-blur-md rounded-full shadow-lg">
                  <ChevronRight className="w-5 h-5 text-gray-700" />
                </button>
              )}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                {allImages.map((_, i) => (
                  <button key={i} onClick={() => setCurrentImageIndex(i)}
                    className={`w-2 h-2 rounded-full transition-all ${i === currentImageIndex ? 'bg-white w-6 shadow-md' : 'bg-white/50'}`} />
                ))}
              </div>
              <div className="absolute top-4 left-4 px-3 py-1.5 bg-black/40 backdrop-blur-md rounded-full">
                <span className="text-white text-xs font-bold">{currentImageIndex + 1}/{allImages.length}</span>
              </div>
            </>
          )}
          {!allImages.length && (
            <div className="w-full h-full flex items-center justify-center text-gray-300"><Package className="w-20 h-20" /></div>
          )}
          <div className="absolute bottom-4 right-4">
            <span className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider backdrop-blur-sm shadow-sm ${
              isOutOfStock ? 'bg-rose-500/90 text-white' :
              product.stock_quantity !== null && product.stock_quantity <= 5 ? 'bg-amber-500/90 text-white' : 'bg-emerald-500/90 text-white'
            }`}>
              {isOutOfStock ? 'Out of Stock' :
               product.stock_quantity !== null && product.stock_quantity <= 5 ? `${product.stock_quantity} left` : 'In Stock'}
            </span>
          </div>
        </div>

        <div className="p-6 pb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-2">{product.name}</h2>
          <div className="flex items-baseline gap-1.5 mb-4">
            <span className="text-2xl font-bold theme-price">{formatPrice(product.price)}</span>
            <span className="text-sm text-gray-400 font-medium">MMK</span>
          </div>

          {product.description && (
            <div className="bg-gray-50 rounded-2xl p-4 mb-4 border border-gray-100">
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{product.description}</p>
            </div>
          )}

          {productColors.length > 0 && (
            <div className="mb-5">
              <p className="text-xs text-gray-500 font-medium mb-2 flex items-center gap-1">
                <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: selectedColor || '#ccc' }} />
                Color: <span className="font-bold text-gray-700">{selectedColor ? COLOR_NAMES[selectedColor] || selectedColor : 'Select'}</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {productColors.map(c => {
                  const isSelected = selectedColor === c.color;
                  return (
                    <button key={c.color}
                      onClick={() => {
                        setSelectedColor(isSelected ? null : c.color);
                        setCurrentImageIndex(0);
                      }}
                      className={`w-10 h-10 rounded-full border-2 transition-all active:scale-90 ${
                        isSelected ? 'border-indigo-500 scale-110 shadow-md ring-2 ring-indigo-200' : 'border-gray-300 hover:scale-110'
                      }`}
                      style={{ backgroundColor: c.color }}
                      title={COLOR_NAMES[c.color] || c.color}
                    >
                      {isSelected && <span className="w-2 h-2 rounded-full bg-white shadow-sm mx-auto block" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {viewMode !== 'telegram' && (
            <button
              onClick={() => onAddToCart(product, selectedColor)}
              disabled={isOutOfStock || (productColors.length > 0 && !selectedColor)}
              className={`w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-bold text-base transition-all ${
                isOutOfStock
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : productColors.length > 0 && !selectedColor
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'theme-btn hover:shadow-xl active:scale-[0.98] shadow-lg'
              }`}
            >
              <ShoppingCart className="w-5 h-5" />
              {isOutOfStock ? 'Currently Unavailable' : productColors.length > 0 && !selectedColor ? 'Select a Color' : cartQty > 0 ? `Add to Cart (${cartQty} in cart)` : 'Add to Cart'}
            </button>
          )}

          {shop?.bot_username && viewMode === 'telegram' && (
            sentProducts.has(product.id) ? (
              <div className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-base bg-emerald-50 text-emerald-600 border border-emerald-200 cursor-default">
                <CheckCircle className="w-5 h-5" />
                Product sent. Check in Telegram
              </div>
            ) : (
              <button onClick={() => {
                const link = `https://t.me/${shop.bot_username}?start=${product.link_token || product.id}`;
                window.open(link, '_blank', 'noopener');
                setSentProducts(prev => new Set(prev).add(product.id));
              }}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-base transition-all active:scale-[0.98] theme-btn">
                <ShoppingCart className="w-5 h-5" />
                Buy Now
              </button>
            )
          )}

          {cartQty > 0 && (
            <p className="text-xs text-gray-400 text-center mt-3">
              You have {cartQty} of this item in your cart
            </p>
          )}

          {viewMode !== 'telegram' && product.link_code && (
            <button
              onClick={() => {
                const url = slug
                  ? window.location.origin + '/?p=/' + slug + '&product=' + product.link_code
                  : window.location.href.split('?')[0] + '?product=' + product.link_code;
                navigator.clipboard.writeText(url).catch(() => {});
              }}
              className="absolute top-4 left-4 z-20 p-2 bg-white/90 backdrop-blur-md rounded-full shadow-lg hover:bg-white active:scale-90 transition-all"
              title="Copy product link"
            >
              <Copy className="w-4 h-4 text-gray-600" />
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function ShopClosed({ shop, theme }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: theme.css['--theme-primary-light'] }}>
      <motion.div initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-[40px] p-10 max-w-md w-full text-center relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-48 h-48 bg-gradient-to-br from-rose-50 to-rose-100 rounded-full opacity-60" />
        <div className="absolute -bottom-16 -left-16 w-40 h-40 bg-gradient-to-br from-amber-50 to-amber-100 rounded-full opacity-60" />
        <div className="relative z-10">
          <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-rose-100 to-rose-200 rounded-[28px] flex items-center justify-center">
            <Clock className="w-12 h-12 text-rose-500" />
          </div>
          <p className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">{shop?.bot_full_name || 'Shop'}</p>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Shop is Currently Closed</h2>
          <p className="text-gray-500 text-sm leading-relaxed mb-8">The shop owner has closed the store. Please check back later.</p>
          <a href={`https://t.me/${shop?.bot_username}`} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-8 py-3.5 theme-btn font-bold rounded-2xl hover:shadow-xl active:scale-[0.98] transition-all shadow-lg">
            Contact on Telegram
          </a>
        </div>
      </motion.div>
    </div>
  );
}

const TELEGRAM_BLUE = '#2AABEE';

function TelegramIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  );
}

function SignInModal({ onClose, onSuccess, botUsername: propBotUsername, shopSlug }) {
  const [signingIn, setSigningIn] = useState(false);
  const { status, timeLeft, loginUrl, botUsername, initLogin, reset } = useTelegramLogin();
  const telegramLoginInitiated = useRef(false);

  useEffect(() => {
    if (status === 'confirmed') {
      if (telegramLoginInitiated.current && shopSlug) {
        window.location.href = `/?p=/${encodeURIComponent(shopSlug)}-user-dashboard`;
      } else if (telegramLoginInitiated.current) {
        onSuccess?.();
      } else {
        onClose?.();
      }
    }
  }, [status, onSuccess, onClose, shopSlug]);

  const handleSignIn = async () => {
    if (!isMainDomain()) {
      // Custom domain — redirect to auth proxy on main domain
      const dashboardUri = window.location.origin + '/?p=/' + encodeURIComponent(shopSlug || propBotUsername || '') + '-user-dashboard';
      const params = new URLSearchParams({ shop_slug: shopSlug || propBotUsername || '', redirect_uri: dashboardUri });
      window.location.href = `https://www.telegramecommerce.shop/#/auth/google/proxy?${params}`;
      return;
    }
    setSigningIn(true);
    try {
      await signInWithGoogle(shopSlug || propBotUsername || '');
      onSuccess?.();
    } catch (err) {
      console.error('Sign-in error:', err);
      setSigningIn(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-[32px] p-8 max-w-sm w-full text-center shadow-2xl"
      >
        <div className="w-16 h-16 bg-gradient-to-br from-indigo-100 to-indigo-200 rounded-[20px] flex items-center justify-center mx-auto mb-4 shadow-lg">
          <User className="w-8 h-8 text-indigo-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Sign in to Purchase</h2>
        <p className="text-sm text-gray-500 mb-6">
          Sign in to proceed with checkout and track your orders.
        </p>
        <div className="space-y-3">
          <button
            onClick={handleSignIn}
            disabled={signingIn}
            className="w-full flex items-center justify-center gap-3 px-6 py-3.5 bg-white border-2 border-gray-200 rounded-2xl font-bold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all active:scale-[0.98] disabled:opacity-60"
          >
            {signingIn ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="" className="w-5 h-5" />
            )}
            {signingIn ? 'Signing in...' : 'Continue with Google'}
          </button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400 font-medium">or</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <button
            onClick={() => { telegramLoginInitiated.current = true; initLogin(propBotUsername); }}
            className="w-full flex items-center justify-center gap-3 px-6 py-3.5 rounded-2xl font-bold text-white transition-all active:scale-[0.98] border-none"
            style={{ backgroundColor: TELEGRAM_BLUE }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#2594D4')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = TELEGRAM_BLUE)}
          >
            <TelegramIcon className="w-5 h-5" />
            <span>Continue with Telegram</span>
          </button>
        </div>
        <button onClick={onClose} className="mt-4 text-sm text-gray-400 hover:text-gray-600 transition-colors">
          Cancel
        </button>
      </motion.div>

      <TelegramLoginModal
        status={status}
        timeLeft={timeLeft}
        loginUrl={loginUrl}
        botUsername={botUsername}
        onCancel={reset}
        onTryAgain={() => { telegramLoginInitiated.current = true; initLogin(propBotUsername); }}
      />
    </motion.div>
  );
}

function CheckoutModal({ shop, cartItems, totalAmount, user, telegramUser, onClose, onOrderPlaced, shopSlug, viewMode, selectedPayment }) {
  const [form, setForm] = useState({ name: '', phones: [''], emails: [''], telegram: '', viber: '', address: '', notes: '' });
  const [proofFile, setProofFile] = useState(null);
  const [proofPreview, setProofPreview] = useState('');
  const [uploadingProof, setUploadingProof] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [agreed1, setAgreed1] = useState(false);
  const [agreed2, setAgreed2] = useState(false);

  useEffect(() => {
    const tgToken = localStorage.getItem('telegram_token');
    const customerUid = user?.uid || (tgToken ? '_' : '');
    if (!customerUid || !shopSlug || profileLoaded) return;
    const headers = tgToken && !user?.uid ? authHeaders() : {};
    fetch(`${API_BASE}/customer/${encodeURIComponent(customerUid)}/profile?shop=${encodeURIComponent(shopSlug)}`, { headers })
      .then(r => r.ok ? r.json() : {})
      .then(data => {
        if (data && data.display_name) {
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
        }
        setProfileLoaded(true);
      })
      .catch(() => setProfileLoaded(true));
  }, [user?.uid, shop?.bot_username, user?.displayName, user?.email, profileLoaded]);

  // Load guest mode cached contact info
  useEffect(() => {
    if (viewMode !== 'guest' || !shopSlug || profileLoaded) return;
    const cacheKey = 'guest_contact_' + shopSlug;
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
    setProfileLoaded(true);
  }, [viewMode, shopSlug, profileLoaded]);

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
    if ((viewMode === 'ecommerce' || viewMode === 'guest') && !proofFile) { setError('Payment proof screenshot is required'); return; }
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

      // Save profile first
      if (user?.uid) {
        await fetch(API_BASE + '/customer/profile/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            firebase_uid: user.uid,
            bot_id: shop.id,
            display_name: form.name.trim(),
            email: emailStr,
            phone: phoneStr,
            photo_url: user.photoURL || '',
            telegram_username: form.telegram.trim(),
            viber_number: form.viber.trim(),
            address: form.address.trim(),
            notes: form.notes.trim(),
          }),
        }).catch(() => {});
      }

      const body = {
        bot_id: shop.id,
        ...(user?.uid ? { firebase_uid: user.uid } : {}),
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
      if (viewMode === 'guest') {
        const cacheKey = 'guest_contact_' + shopSlug;
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
      }
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
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
    >
      <motion.div
        initial={{ y: '100%', opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="relative bg-white w-full max-w-lg md:rounded-[32px] max-h-[92svh] overflow-y-auto rounded-t-[32px] shadow-2xl p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Checkout</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>

        <div className="bg-gray-50 rounded-2xl p-4 mb-6">
          <p className="text-xs text-gray-500 font-medium mb-2">Order Summary</p>
          {cartItems.map(item => (
            <div key={item.product_id} className="flex justify-between text-sm py-1">
              <span className="text-gray-700">{item.name} x{item.quantity}</span>
              <span className="font-medium text-gray-900">{formatPrice(item.price * item.quantity)} MMK</span>
            </div>
          ))}
          <div className="border-t border-gray-200 mt-2 pt-2 flex justify-between font-bold text-gray-900">
            <span>Total</span>
            <span>{formatPrice(totalAmount)} MMK</span>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-500 font-medium mb-1 block">Full Name *</label>
            <input type="text" value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm" />
          </div>

          <div>
            <label className="text-xs text-gray-500 font-medium mb-1 block">Phone Numbers *</label>
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
            <label className="text-xs text-gray-500 font-medium mb-1 block">Email Addresses *</label>
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
            <label className="text-xs text-gray-500 font-medium mb-1 block">Telegram Username</label>
            <input type="text" value={form.telegram} onChange={e => setForm(p => ({...p, telegram: e.target.value}))}
              placeholder="@username"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm" />
          </div>

          <div>
            <label className="text-xs text-gray-500 font-medium mb-1 block">Viber Number</label>
            <input type="tel" value={form.viber} onChange={e => setForm(p => ({...p, viber: e.target.value}))}
              placeholder="09xxxxxxxxx"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm" />
          </div>

          <div>
            <label className="text-xs text-gray-500 font-medium mb-1 block">Delivery Address *</label>
            <textarea value={form.address} onChange={e => setForm(p => ({...p, address: e.target.value}))} rows={2}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm resize-none" />
          </div>

          <div>
            <label className="text-xs text-gray-500 font-medium mb-1 block">Notes (optional)</label>
            <input type="text" value={form.notes} onChange={e => setForm(p => ({...p, notes: e.target.value}))}
              placeholder="Any special requests?"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm" />
          </div>

          {selectedPayment && (
            <div className="bg-indigo-50 rounded-2xl p-4 border border-indigo-100">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold flex-shrink-0 shadow-sm"
                  style={{ backgroundColor: PAYMENT_COLORS[(selectedPayment.id || 0) % PAYMENT_COLORS.length] }}>
                  {(selectedPayment.name || '?').charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-bold text-sm text-gray-900">Pay via {selectedPayment.name}</p>
                  <p className="text-xs text-indigo-600 font-medium">Selected payment method</p>
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="text-xs text-gray-500 font-medium mb-1 block">Payment Proof (screenshot) {(viewMode === 'ecommerce' || viewMode === 'guest') && <span className="text-rose-500"> *</span>}</label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => document.getElementById('proof-input').click()}
                className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-500 hover:bg-gray-100 transition-all active:scale-[0.98]"
              >
                {proofFile ? 'Change File' : 'Upload Screenshot'}
              </button>
              {proofFile && (
                <button
                  onClick={() => { setProofFile(null); setProofPreview(''); }}
                  className="text-xs text-rose-500 hover:text-rose-600"
                >
                  Remove
                </button>
              )}
            </div>
            <input id="proof-input" type="file" accept="image/*" onChange={handleProofFile} className="hidden" />
            {proofPreview && (
              <div className="mt-2 rounded-xl overflow-hidden border border-gray-200 max-w-[200px]">
                <img src={proofPreview} alt="Payment proof" className="w-full h-32 object-cover" />
              </div>
            )}
            {uploadingProof && <p className="text-xs text-gray-400 mt-1">Uploading...</p>}
          </div>

          {/* Agreement checkboxes */}
          <div className="space-y-3 pt-2">
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
        </div>

        {error && <p className="text-rose-500 text-sm mt-3 text-center">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={loading || !agreed1 || !agreed2}
          className="w-full mt-6 flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-base text-white transition-all active:scale-[0.98] disabled:opacity-60"
          style={{ background: THEMES[DEFAULT_THEME].css['--theme-btn'] }}
        >
          {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> Placing Order...</> : `Place Order — ${formatPrice(totalAmount)} MMK`}
        </button>
      </motion.div>
    </motion.div>
  );
}

function OrderConfirmation({ data, shop, onContinueShopping, viewMode }) {
  const [showInvoice, setShowInvoice] = useState(false);
  const isGuest = viewMode === 'guest';
  return (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      >
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-[32px] p-8 max-w-sm w-full text-center shadow-2xl"
      >
        <motion.div
          initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 15, stiffness: 200, delay: 0.1 }}
          className="w-20 h-20 bg-gradient-to-br from-emerald-100 to-emerald-200 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-100"
        >
          <CheckCircle className="w-10 h-10 text-emerald-600" />
        </motion.div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Order တင်ပြီးပါပြီ။</h2>
        <p className="text-sm text-gray-500 mb-1">Your order has been placed successfully.</p>
        <p className="text-sm text-gray-500 mb-6">
          Order ID: <span className="font-bold text-gray-900">{data?.order_number}</span>
        </p>

        <div className="bg-gray-50 rounded-2xl p-4 mb-6 text-left text-sm text-gray-600 space-y-1">
          <p>The shop owner will review your order and contact you.</p>
          {!isGuest && <p>You can track your order status in your dashboard.</p>}
        </div>

        <div className="flex flex-col gap-3">
          {!isGuest && (
            <a
              href={`/?p=/${shop?.public_slug || shop?.bot_username}-user-dashboard`}
              className="w-full py-3.5 rounded-2xl font-bold text-sm text-white text-center transition-all active:scale-[0.98] shadow-lg"
              style={{ background: THEMES[DEFAULT_THEME].css['--theme-btn'] }}
            >
              View My Orders
            </a>
          )}
          <button
            onClick={() => setShowInvoice(true)}
            className="w-full py-3.5 rounded-2xl font-bold text-sm text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 transition-all active:scale-[0.98]"
          >
            Download Invoice
          </button>
          <button
            onClick={onContinueShopping}
            className="w-full py-3.5 rounded-2xl font-bold text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 transition-all active:scale-[0.98]"
          >
            Continue Shopping
          </button>
        </div>
      </motion.div>
    </motion.div>

    <Receipt
      order={data}
      bot={shop}
      open={showInvoice}
      onClose={() => setShowInvoice(false)}
      receiptType="invoice"
    />
    </>
  );
}

function RegisterModal({ shop, user, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(API_BASE + '/website-customers/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bot_id: shop.id,
          firebase_uid: user.uid,
          display_name: user.displayName || '',
          email: user.email || '',
          photo_url: user.photoURL || '',
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.detail || 'Registration failed');
      }
      onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-[32px] p-8 max-w-sm w-full text-center shadow-2xl"
      >
        <div className="w-16 h-16 bg-gradient-to-br from-indigo-100 to-indigo-200 rounded-[20px] flex items-center justify-center mx-auto mb-4 shadow-lg">
          <User className="w-8 h-8 text-indigo-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">Register for</h2>
        <p className="text-lg font-semibold text-gray-700 mb-4">{shop.bot_full_name}</p>
        <p className="text-sm text-gray-500 mb-6">
          You need to register for this shop before placing an order.
          Your Google account info will be shared with the shop.
        </p>

        <div className="bg-gray-50 rounded-2xl p-4 mb-6 text-left text-sm space-y-2">
          {user.photoURL && (
            <img src={user.photoURL} alt="" className="w-10 h-10 rounded-full mx-auto mb-2" />
          )}
          <p><span className="text-gray-400">Name:</span> <span className="text-gray-900 font-medium">{user.displayName || '—'}</span></p>
          <p><span className="text-gray-400">Email:</span> <span className="text-gray-900 font-medium">{user.email || '—'}</span></p>
        </div>

        {error && <p className="text-rose-500 text-sm mb-3">{error}</p>}

        <button
          onClick={handleRegister}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl font-bold text-sm text-white transition-all active:scale-[0.98] disabled:opacity-60 shadow-lg"
          style={{ background: THEMES[DEFAULT_THEME].css['--theme-btn'] }}
        >
          {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> Registering...</> : 'Register for this Shop'}
        </button>
        <button onClick={onClose} className="mt-3 text-sm text-gray-400 hover:text-gray-600 transition-colors">
          Cancel
        </button>
      </motion.div>
    </motion.div>
  );
}

const PAYMENT_COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899'];

function PaymentSelect({ paymentMethods, onBack, onNext }) {
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
          <button onClick={onBack} className="p-2 text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
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
                              <button onClick={() => handleCopy(pm.payment_number)}
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
                selectedId ? 'text-white shadow-lg' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
              style={selectedId ? { background: THEMES[DEFAULT_THEME].css['--theme-btn'] } : {}}
            >
              Transferred, Next...
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

export default function PublicEcommerce({ slug, viaDomain }) {
  const { user, loading: authLoading } = useAuth();
  const { tgLoggedIn, telegramUser, logoutTelegram } = useTelegramAuth();
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [sortBy, setSortBy] = useState('default');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showNewsfeed, setShowNewsfeed] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [cartItems, setCartItems] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [showSignIn, setShowSignIn] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [showPaymentSelect, setShowPaymentSelect] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);
  const [orderPlaced, setOrderPlaced] = useState(null);
  const [registered, setRegistered] = useState(null); // null=checking, true, false
  const [showRegister, setShowRegister] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([
    { role: 'assistant', content: 'Hi! How can I help you today?', file_id: null, file_type: null }
  ]);
  const [chatLoading, setChatLoading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showVisitorForm, setShowVisitorForm] = useState(false);
  const [visitorForm, setVisitorForm] = useState({ name: '', phone: '', email: '' });
  const chatRef = useRef(null);
  const chatInputRef = useRef(null);
  const photoInputRef = useRef(null);
  const visitorIdRef = useRef('');
  const pendingBuyNowRef = useRef(false);
  const [selectedColors, setSelectedColors] = useState({});
  const [viewMode, setViewMode] = useState('telegram');
  const [sentProducts, setSentProducts] = useState(new Set());
  // Product link mode — show single product instead of full shop
  const [initialProductCode] = useState(() => new URLSearchParams(window.location.search).get('product'));
  const [productLinkActive, setProductLinkActive] = useState(!!initialProductCode);
  const [initialPostCode] = useState(() => new URLSearchParams(window.location.search).get('post'));
  const [fullscreenLogo, setFullscreenLogo] = useState(false);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: viaDomain ? ['public-ecommerce-by-domain'] : ['public-ecommerce', slug],
    queryFn: viaDomain ? getPublicShopByDomain : () => getPublicShop(slug),
    enabled: viaDomain || !!slug,
    retry: 2,
    retryDelay: 1000,
  });

  // Auto-open newsfeed when post param is present (from permalink)
  // Wait for shop data so NewsfeedFeed mounts with the correct botId
  useEffect(() => {
    if (initialPostCode && data?.shop?.id) setShowNewsfeed(true);
  }, [initialPostCode, data?.shop?.id]);

  const shop = data?.shop;
  const products = data?.products || [];
  const categories = data?.categories || [];
  const paymentMethods = (data?.payment_methods || []).map(pm => {
    if (pm.qr_code_url && !pm.qr_code_url.startsWith('http')) {
      return { ...pm, qr_code_url: `${API_BASE}/telegram/file/${encodeURIComponent(pm.qr_code_url)}?bot_id=${data?.shop?.id}` };
    }
    return pm;
  });
  const themeName = data?.theme || DEFAULT_THEME;
  const theme = THEMES[themeName] || THEMES[DEFAULT_THEME];

  const productLinkProduct = productLinkActive && initialProductCode
    ? products.find(p => p.link_code === initialProductCode) || null
    : null;

  useAuthTokenFromUrl();

  // Load cart from localStorage
  useEffect(() => {
    if (!slug && !viaDomain) return;
    const key = getCartKey(slug, viaDomain, viewMode);
    try {
      const saved = localStorage.getItem(key);
      if (saved) { setCartItems(JSON.parse(saved)); return; }
    } catch {}
    setCartItems([]);
  }, [slug, viaDomain, viewMode]);

  // Save cart to localStorage
  useEffect(() => {
    if (!slug && !viaDomain) return;
    const key = getCartKey(slug, viaDomain, viewMode);
    localStorage.setItem(key, JSON.stringify(cartItems));
  }, [cartItems, slug, viaDomain, viewMode]);

  // Fetch shop bio
  const [shopBio, setShopBio] = useState('');
  useEffect(() => {
    if (!shop?.id) return;
    // Check if already in public API response
    if (data?.shop_bio?.text) {
      setShopBio(data.shop_bio.text);
      return;
    }
    getShopBio(shop.id).then(setShopBio);
  }, [shop?.id, data?.shop_bio]);

  // Check if user is registered for this specific shop
  useEffect(() => {
    if (!shop) { setRegistered(null); return; }
    if (tgLoggedIn) {
      // Telegram login already creates the customer record — no need to register
      setRegistered(true);
      return;
    }
    if (!user) { setRegistered(null); return; }
    fetch(API_BASE + '/public/check-customer?firebase_uid=' + encodeURIComponent(user.uid) + '&bot_id=' + shop.id)
      .then(r => r.json())
      .then(d => setRegistered(d.registered))
      .catch(() => setRegistered(false));
  }, [user, tgLoggedIn, shop]);

  // URL sync when product detail opens — only add param, never remove initial one
  useEffect(() => {
    if (selectedProduct?.link_code) {
      const params = new URLSearchParams(window.location.search);
      params.set('product', selectedProduct.link_code);
      const newUrl = window.location.pathname + '?' + params.toString();
      window.history.replaceState(null, '', newUrl);
    }
  }, [selectedProduct]);

  // Auto-open product from ?product= URL param on page load — handled inline

  const cartCount = cartItems.reduce((sum, i) => sum + i.quantity, 0);
  const totalAmount = cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const dashboardUrl = viaDomain
    ? `/?p=/${(shop?.public_slug || slug || shop?.bot_username || 'shop')}-user-dashboard-login`
    : `/${(slug || shop?.public_slug || shop?.bot_username || 'shop')}-user-dashboard-login`;

  const getProductColors = useCallback((product) => {
    if (product.specifications?.colors && Array.isArray(product.specifications.colors)) {
      return product.specifications.colors;
    }
    return [];
  }, []);

  const addToCart = useCallback((product, colorHex) => {
    setCartItems(prev => {
      const existing = prev.find(i => i.product_id === product.id);
      if (existing) {
        return prev.map(i => i.product_id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      const images = getPublicImageUrls(product.image_url, shop?.id);
      return [...prev, {
        product_id: product.id,
        name: product.name,
        price: Number(product.price),
        quantity: 1,
        image_url: images[0] || '',
        selected_color: colorHex || null,
      }];
    });
  }, [shop?.id]);

  const updateQty = useCallback((productId, delta) => {
    setCartItems(prev => prev.map(i => {
      if (i.product_id !== productId) return i;
      const newQty = i.quantity + delta;
      return newQty <= 0 ? null : { ...i, quantity: newQty };
    }).filter(Boolean));
  }, []);

  const removeItem = useCallback((productId) => {
    setCartItems(prev => prev.filter(i => i.product_id !== productId));
  }, []);

  const handleBuyClick = useCallback(() => {
    if (!user) {
      pendingBuyNowRef.current = false;
      setShowSignIn(true);
    } else {
      setShowCart(true);
    }
  }, [user]);

  const handleBuyNow = useCallback((product) => {
    const colors = getProductColors(product);
    const selColor = selectedColors[product.id];
    if (colors.length > 0 && !selColor) return;
    // Replace entire cart with just this product (instant buy, no cart accumulation)
    const images = getPublicImageUrls(product.image_url, shop?.id);
    setCartItems([{
      product_id: product.id,
      name: product.name,
      price: Number(product.price),
      quantity: 1,
      image_url: images[0] || '',
      selected_color: selColor || null,
    }]);
    if (viewMode === 'guest') {
      setShowCart(false);
      paymentMethods.length > 0 ? setShowPaymentSelect(true) : setCheckoutOpen(true);
    } else if (!user && !tgLoggedIn) {
      pendingBuyNowRef.current = true;
      setShowSignIn(true);
    } else {
      setShowCart(false);
      if (registered === true) {
        paymentMethods.length > 0 ? setShowPaymentSelect(true) : setCheckoutOpen(true);
      } else {
        setShowRegister(true);
      }
    }
  }, [user, tgLoggedIn, registered, getProductColors, selectedColors, viewMode, paymentMethods.length, shop?.id]);

  const handleSignInSuccess = useCallback(() => {
    setShowSignIn(false);
    if (pendingBuyNowRef.current) return;
    const target = slug || shop?.public_slug || shop?.bot_username || '';
    if (target) {
      window.location.href = `/?p=/${encodeURIComponent(target)}-user-dashboard`;
    }
  }, [slug, shop?.public_slug, shop?.bot_username]);

  // After sign-in, wait for registered check, then proceed buy-now
  useEffect(() => {
    if (!pendingBuyNowRef.current) return;
    if (!(user || tgLoggedIn) || registered === null) return;
    pendingBuyNowRef.current = false;
    setShowCart(false);
    if (registered === true) {
      paymentMethods.length > 0 ? setShowPaymentSelect(true) : setCheckoutOpen(true);
    } else {
      setShowRegister(true);
    }
  }, [user, tgLoggedIn, registered, paymentMethods.length]);

  const handleCheckout = useCallback(() => {
    setShowCart(false);
    const goToPayment = () => {
      if (paymentMethods.length > 0) {
        setShowPaymentSelect(true);
      } else {
        setCheckoutOpen(true);
      }
    };
    if (viewMode === 'guest') {
      goToPayment();
    } else if (!user && !tgLoggedIn) {
      pendingBuyNowRef.current = true;
      setShowSignIn(true);
    } else if (registered === true) {
      goToPayment();
    } else {
      setShowRegister(true);
    }
  }, [user, tgLoggedIn, registered, viewMode, paymentMethods.length]);

  const handlePaymentNext = useCallback((paymentId) => {
    if (!paymentId) return;
    const pm = paymentMethods.find(p => p.id === paymentId);
    setSelectedPaymentMethod(pm || null);
    setShowPaymentSelect(false);
    setCheckoutOpen(true);
  }, [paymentMethods]);

  const handleOrderPlaced = useCallback((orderData) => {
    setCheckoutOpen(false);
    setOrderPlaced(orderData);
    setCartItems([]);
    setSelectedPaymentMethod(null);
  }, []);

  const handleRegisterSuccess = useCallback(() => {
    setRegistered(true);
    setShowRegister(false);
    paymentMethods.length > 0 ? setShowPaymentSelect(true) : setCheckoutOpen(true);
  }, [paymentMethods.length]);

  function generateVisitorId() {
    return 'v' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  const handleVisitorPhoto = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file || !shop?.id) return;
    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('bot_id', shop.id);
      const res = await fetch(API_BASE + '/public/upload/photo', { method: 'POST', body: formData });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      const history = chatMessages.slice(-100).map(m => ({ role: m.role, content: m.content }));
      setChatMessages(prev => [...prev, { role: 'user', content: '', file_id: data.file_id, file_type: 'photo' }]);
      const msgRes = await fetch(API_BASE + '/public/chat/' + shop.id, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: '', history, visitor_id: visitorIdRef.current, file_id: data.file_id, file_type: 'photo' }),
      });
      const msgData = await msgRes.json();
      if (msgData.reply) {
        setChatMessages(prev => [...prev, { role: 'assistant', content: msgData.reply, file_id: null, file_type: null }]);
      }
    } catch {
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'Failed to send photo.' }]);
    } finally {
      setUploadingPhoto(false);
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  }, [shop?.id, chatMessages]);

  const handleChatSend = useCallback(async () => {
    if (!chatInput.trim() || chatLoading) return;
    const msg = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: msg, file_id: null, file_type: null }]);
    setChatLoading(true);
    try {
      const history = chatMessages.slice(-100).map(m => ({ role: m.role, content: m.content }));
      const res = await fetch(API_BASE + '/public/chat/' + shop?.id, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, history, visitor_id: visitorIdRef.current }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.detail || 'Chat failed');
      setChatMessages(prev => [...prev, { role: 'assistant', content: d.reply, file_id: null, file_type: null }]);
    } catch {
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }]);
    } finally {
      setChatLoading(false);
      setTimeout(() => chatInputRef.current?.focus(), 100);
    }
  }, [chatInput, chatLoading, shop?.id, chatMessages]);

  async function handleVisitorSave(name, phone, email) {
    if (!shop?.id) return;
    const id = visitorIdRef.current || generateVisitorId();
    visitorIdRef.current = id;
    const key = 'visitor_' + (shop.bot_username || slug || 'domain');
    const info = { id, name, phone, email };
    localStorage.setItem(key, JSON.stringify(info));
    setShowVisitorForm(false);
    setVisitorForm({ name, phone, email });
    try {
      await fetch(API_BASE + '/public/visitor/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitor_id: id, bot_id: shop.id, name, phone, email }),
      });
    } catch {}
  }

  // Auto-scroll chat
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [chatMessages, chatLoading]);

  // Auto-focus chat input
  useEffect(() => {
    if (chatOpen && !showVisitorForm) {
      setTimeout(() => chatInputRef.current?.focus(), 200);
    }
  }, [chatOpen, showVisitorForm]);

  // Live polling for admin replies
  useEffect(() => {
    if (!chatOpen || !shop?.id || showVisitorForm || !visitorIdRef.current) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(API_BASE + '/public/chat/' + shop.id + '/' + visitorIdRef.current + '/messages');
        const msgs = await res.json();
        if (msgs && msgs.length > 0) {
          setChatMessages(prev => {
            if (msgs.length <= prev.length) return prev;
            const existing = new Set(prev.map(m => (m.content || '') + '|' + m.role + '|' + (m.file_id || '')));
            const newMsgs = msgs.filter(m => !existing.has((m.message_text || '') + '|' + m.sender_type + '|' + (m.file_id || '')));
            if (newMsgs.length === 0) return prev;
            return [...prev, ...newMsgs.map(m => ({
              role: m.sender_type === 'user' ? 'user' : 'assistant',
              content: m.message_text || '',
              file_id: m.file_id || null,
              file_type: m.file_type || null
            }))];
          });
        }
      } catch {}
    }, 3000);
    return () => clearInterval(interval);
  }, [chatOpen, shop?.id, showVisitorForm]);

  // Restore visitor session or create new one
  useEffect(() => {
    if (!chatOpen || !shop?.id) return;
    if (user) {
      // Firebase user: use UID as visitor ID, skip form
      visitorIdRef.current = user.uid;
      setVisitorForm({ name: user.displayName || '', phone: user.phoneNumber || '', email: user.email || '' });
      setShowVisitorForm(false);
      // Register as web visitor with firebase_uid for admin split
      fetch(API_BASE + '/public/visitor/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitor_id: user.uid, bot_id: shop.id, name: user.displayName || '', email: user.email || '', firebase_uid: user.uid }),
      }).catch(() => {});
      // Load existing chat history
      fetch(API_BASE + '/public/chat/' + shop.id + '/' + user.uid + '/messages')
        .then(r => r.json())
        .then(msgs => {
          if (msgs && msgs.length > 0) {
            setChatMessages(msgs.map(m => ({
              role: m.sender_type === 'user' ? 'user' : 'assistant',
              content: m.message_text || '',
              file_id: m.file_id || null,
              file_type: m.file_type || null
            })));
          }
        }).catch(() => {});
      return;
    }
    if (visitorIdRef.current) return;
    const key = 'visitor_' + (shop.bot_username || slug || 'domain');
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const info = JSON.parse(saved);
        visitorIdRef.current = info.id;
        setVisitorForm({ name: info.name || '', phone: info.phone || '', email: info.email || '' });
        fetch(API_BASE + '/public/chat/' + shop.id + '/' + info.id + '/messages')
          .then(r => r.json())
          .then(msgs => {
            if (msgs && msgs.length > 0) {
              setChatMessages(msgs.map(m => ({
                role: m.sender_type === 'user' ? 'user' : 'assistant',
                content: m.message_text || '',
                file_id: m.file_id || null,
                file_type: m.file_type || null
              })));
            }
          }).catch(() => {});
      } catch { setShowVisitorForm(true); }
    } else {
      setShowVisitorForm(true);
    }
  }, [chatOpen, shop?.id, user, slug]);

  const handleSignOut = useCallback(async () => {
    try { await signOut(auth); } catch {}
    if (tgLoggedIn) logoutTelegram();
  }, [tgLoggedIn, logoutTelegram]);

  // Theme injection
  useEffect(() => {
    const id = 'ecommerce-theme-styles';
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement('style');
      el.id = id;
      document.head.appendChild(el);
    }
    const t = theme.css;
    el.textContent = `
      .theme-card { background: ${t['--theme-card-bg']}; border-color: ${t['--theme-card-border']}; }
      .theme-card:hover { box-shadow: 0 20px 25px -5px ${t['--theme-primary-shadow']}, 0 10px 10px -5px ${t['--theme-primary-shadow']}; }
      .theme-btn { background: ${t['--theme-btn']}; color: ${t['--theme-btn-text']}; }
      .theme-btn:hover { background: ${t['--theme-btn-hover']}; box-shadow: 0 10px 15px -3px ${t['--theme-primary-shadow']}, 0 4px 6px -4px ${t['--theme-primary-shadow']}; }
      .theme-filter-active { background: ${t['--theme-filter-active']} !important; color: #fff !important; box-shadow: 0 4px 6px -1px ${t['--theme-primary-shadow']} !important; }
      .theme-price { color: ${t['--theme-price']}; }
      .theme-hover-price:hover { color: ${t['--theme-price']}; }
    `;
  }, [theme]);

  useEffect(() => {
    document.title = shop?.bot_full_name || 'E-Commerce Shop';
    const icon = document.querySelector('link[rel="icon"]');
    if (icon && shop?.profile_picture) icon.setAttribute('href', shop.profile_picture);
    else if (icon) icon.setAttribute('href', '/vite.svg');
    return () => { document.title = 'TeleShop'; };
  }, [shop?.bot_full_name, shop?.profile_picture]);

  const categoryMap = {};
  categories.forEach(c => { categoryMap[c.id] = c.name; });

  const filteredProducts = products.filter(p => {
    if (selectedCategory && p.category_id !== selectedCategory) return false;
    if (searchQuery) {
      const q = normalizeSearchText(searchQuery);
      return normalizeSearchText(p.name).includes(q) || normalizeSearchText(p.description).includes(q);
    }
    return true;
  });

  const displayedProducts = [...filteredProducts].sort((a, b) => {
    if (sortBy === 'price-low') return (a.price || 0) - (b.price || 0);
    if (sortBy === 'price-high') return (b.price || 0) - (a.price || 0);
    if (sortBy === 'newest') return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    return 0;
  });

  const getInitials = (name) => (name || 'S').charAt(0).toUpperCase();

  if (isLoading) return <LoadingSkeleton />;

  if (error || !shop) {
    const isNotFound = error?.response?.status === 404;
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: theme.css['--theme-primary-light'] }}>
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg ${isNotFound ? 'bg-gradient-to-br from-red-50 to-red-100' : 'bg-gradient-to-br from-amber-50 to-amber-100'}`}>
            <AlertCircle className={`w-10 h-10 ${isNotFound ? 'text-red-400' : 'text-amber-400'}`} />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">{isNotFound ? 'Shop Not Found' : 'Something Went Wrong'}</h2>
          <p className="text-gray-500 text-sm mb-6">
            {isNotFound ? "This shop doesn't exist." : 'Could not load the shop. Please try again.'}
          </p>
          <div className="flex flex-col gap-3">
            {!isNotFound && <button onClick={() => refetch()} className="w-full px-6 py-3 theme-btn font-bold rounded-2xl">Try Again</button>}
            <a href="https://t.me/tg_ecommerce_official_bot" className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 font-bold rounded-2xl hover:bg-gray-200">
              Contact Support <ChevronRight className="w-4 h-4" />
            </a>
          </div>
        </motion.div>
      </div>
    );
  }

  if (data?.is_open === false) return <ShopClosed shop={shop} theme={theme} />;

  return (
    <div className="min-h-screen w-full overflow-x-hidden" style={{
      backgroundColor: theme.css['--theme-bg'],
      '--theme-primary': theme.css['--theme-primary'],
      '--theme-primary-light': theme.css['--theme-primary-light'],
      '--theme-primary-shadow': theme.css['--theme-primary-shadow'],
      '--theme-primary-shadow-lg': theme.css['--theme-primary-shadow-lg'],
      '--theme-header': theme.css['--theme-header'],
      '--theme-btn': theme.css['--theme-btn'],
      '--theme-btn-hover': theme.css['--theme-btn-hover'],
      '--theme-btn-text': theme.css['--theme-btn-text'],
      '--theme-price': theme.css['--theme-price'],
      '--theme-filter-active': theme.css['--theme-filter-active'],
      '--theme-card-bg': theme.css['--theme-card-bg'],
      '--theme-card-border': theme.css['--theme-card-border'],
      '--theme-bg': theme.css['--theme-bg'],
      '--theme-header-text': theme.css['--theme-header-text'],
      '--theme-header-muted': theme.css['--theme-header-muted'],
    }}>
      {/* Header */}
      <div className="relative" style={{ background: theme.css['--theme-header'] }}>
        <ShopBanner banners={data?.banners} botId={shop?.id} theme={theme}>
          {!data?.banners?.length && (
            <>
              <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/5 rounded-full" />
              <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-white/5 rounded-full" />
            </>
          )}
          <div className="max-w-7xl mx-auto px-4 pt-6 md:pt-8 pb-16 md:pb-20 relative">
            <div className="flex items-center justify-between gap-2">
              {/* Left: Shop name only */}
              <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="min-w-0 flex-1">
                <h1 className="text-lg md:text-2xl lg:text-4xl font-bold leading-tight text-white" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.6), 0 0 4px rgba(0,0,0,0.4)' }}>{shop?.bot_full_name}</h1>
              </motion.div>

              {/* Right: Cart (all non-telegram modes) */}
              {viewMode !== 'telegram' && (
                <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-1.5 md:gap-2 flex-shrink-0">
                  <button onClick={() => setShowCart(true)}
                    className="relative w-[44px] h-[44px] bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center hover:bg-white/30 transition-all active:scale-90 flex-shrink-0">
                    <ShoppingCart className="w-5 h-5 text-white" />
                    {cartCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 shadow-lg">
                        {cartCount > 99 ? '99+' : cartCount}
                      </span>
                    )}
                  </button>
                </motion.div>
              )}
            </div>
          </div>
        </ShopBanner>
        <div className="absolute -bottom-1 left-0 right-0 h-6 md:h-8 rounded-t-[28px] md:rounded-t-[32px]" style={{ backgroundColor: theme.css['--theme-bg'] }} />
      </div>

      {/* Body */}
      <div className="max-w-7xl mx-auto px-4 -mt-10 relative z-10">
        {productLinkActive && productLinkProduct ? (
          <>
            <button onClick={() => { setProductLinkActive(false); window.history.replaceState(null, '', window.location.pathname); }}
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-gray-500 hover:text-indigo-600 transition-all active:scale-95 px-3 py-2 -ml-2 rounded-xl hover:bg-indigo-50">
              <ChevronLeft className="w-4 h-4" /> Back to all products
            </button>
            {(() => {
              const images = getPublicImageUrls(productLinkProduct.image_url, shop?.id);
              const isOutOfStock = productLinkProduct.stock_quantity !== null && productLinkProduct.stock_quantity === 0;
              const stockLow = productLinkProduct.stock_quantity !== null && productLinkProduct.stock_quantity <= 5 && productLinkProduct.stock_quantity > 0;
              const productColors = productLinkProduct.specifications?.colors && Array.isArray(productLinkProduct.specifications.colors)
                ? productLinkProduct.specifications.colors : [];
              return (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 mt-4 max-w-lg mx-auto">
                  {images.length > 0 && (
                    <div className="aspect-square bg-gray-50 relative">
                      <img src={images[0]} alt={productLinkProduct.name} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="p-5 space-y-4">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">{productLinkProduct.name}</h2>
                      <p className="text-2xl font-bold text-indigo-600 mt-1">{productLinkProduct.price.toLocaleString()} MMK</p>
                    </div>
                    {productLinkProduct.description && (
                      <p className="text-sm text-gray-500 leading-relaxed">{productLinkProduct.description}</p>
                    )}
                    <div className="flex flex-wrap gap-1.5">
                      {isOutOfStock ? (
                        <span className="px-3 py-1 bg-rose-100 text-rose-700 rounded-lg text-xs font-bold">Out of Stock</span>
                      ) : stockLow ? (
                        <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-lg text-xs font-bold">Only {productLinkProduct.stock_quantity} left</span>
                      ) : productLinkProduct.stock_quantity !== null ? (
                        <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold">{productLinkProduct.stock_quantity} In Stock</span>
                      ) : null}
                      <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-lg text-xs font-bold">
                        {categories?.find(c => c.id === productLinkProduct.category_id)?.name || 'Uncategorized'}
                      </span>
                    </div>
                    {productColors.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-bold text-gray-600 uppercase tracking-wider">Colors</p>
                        <div className="flex flex-wrap gap-2">
                          {productColors.map(c => (
                            <div key={c.color} className="w-10 h-10 rounded-xl border-2 border-gray-300 shadow-sm" style={{ backgroundColor: c.color }}>
                              {c.file_id && <img src={`https://api.telegramecommerce.shop/telegram/file/${encodeURIComponent(c.file_id)}?bot_id=${shop?.id}`} alt="" className="w-full h-full object-cover rounded-xl" />}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="flex flex-col gap-2 pt-2">
                      <button
                        onClick={() => {
                          const link = `https://t.me/${shop?.bot_username}?start=${productLinkProduct.link_token || productLinkProduct.id}`;
                          window.open(link, '_blank', 'noopener');
                        }}
                        disabled={isOutOfStock}
                        className="w-full flex items-center justify-center gap-2 py-3 bg-sky-500 text-white font-bold rounded-xl hover:bg-sky-600 disabled:opacity-50 transition-all active:scale-[0.98] text-sm"
                      >
                        <MessageCircle className="w-4 h-4" /> Buy on Telegram
                      </button>
                      <button
                        onClick={() => {
                          addToCart(productLinkProduct, null);
                          if (!user) {
                            setViewMode('ecommerce');
                            pendingBuyNowRef.current = true;
                            setShowSignIn(true);
                          } else {
                            setShowCart(false);
                            if (registered === true) {
                              paymentMethods.length > 0 ? setShowPaymentSelect(true) : setCheckoutOpen(true);
                            } else {
                              setShowRegister(true);
                            }
                          }
                        }}
                        disabled={isOutOfStock}
                        className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-all active:scale-[0.98] text-sm"
                      >
                        <ShoppingCart className="w-4 h-4" /> Buy on Website
                      </button>
                      <button
                        onClick={() => {
                          setViewMode('guest');
                          addToCart(productLinkProduct, null);
                          setShowCart(false);
                          paymentMethods.length > 0 ? setShowPaymentSelect(true) : setCheckoutOpen(true);
                        }}
                        disabled={isOutOfStock}
                        className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition-all active:scale-[0.98] text-sm"
                      >
                        <User className="w-4 h-4" /> Buy as a Guest
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })()}
          </>
        ) : (
          <>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="-mt-8 md:-mt-10 mb-2 flex items-center gap-2">
          {/* Logo - circular */}
          <button onClick={() => setFullscreenLogo(true)}
            className="-mt-6 md:-mt-8 w-[80px] h-[80px] md:w-[100px] md:h-[100px] rounded-full overflow-hidden flex-shrink-0 bg-white/20 backdrop-blur-md border-2 border-white/40 shadow-md cursor-pointer active:scale-95 transition-transform">
            {shop?.profile_picture ? (
              <img src={shop.profile_picture} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600">
                <span className="text-white font-bold text-sm">{getInitials(shop?.bot_full_name)}</span>
              </div>
            )}
          </button>
          <div className="ml-auto flex items-center gap-1.5 relative -mt-6 md:-mt-12">
            <button onClick={() => setShowNewsfeed(true)}
              className="w-[38px] h-[38px] rounded-full flex items-center justify-center bg-white text-gray-500 hover:bg-gray-100 border border-gray-200 shadow-sm transition-all active:scale-90">
              <Newspaper className="w-[15px] h-[15px]" />
            </button>
            <button onClick={() => setShowSearch(!showSearch)}
              className={`w-[44px] h-[44px] rounded-full flex items-center justify-center transition-all ${showSearch ? 'theme-filter-active' : 'bg-white text-gray-400 hover:bg-gray-100 border border-gray-200 shadow-sm'}`}>
              {showSearch ? <X className="w-4 h-4" /> : <Search className="w-4 h-4" />}
            </button>
            <button onClick={() => setShowSortMenu(!showSortMenu)}
              className={`w-[38px] h-[38px] rounded-full flex items-center justify-center transition-all active:scale-90 ${
                sortBy !== 'default'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white text-gray-500 hover:bg-gray-100 border border-gray-200 shadow-sm'
              }`}>
              <ArrowUpDown className="w-[15px] h-[15px]" />
            </button>
            {showSortMenu && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setShowSortMenu(false)} />
                <div className="absolute right-0 top-full mt-2 z-40 bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 min-w-[160px] overflow-hidden">
                  <button onClick={() => { setSortBy('price-low'); setShowSortMenu(false); }}
                    className={`w-full flex items-center justify-between px-4 py-2.5 text-[12px] font-medium transition-all hover:bg-gray-50 ${sortBy === 'price-low' ? 'text-indigo-600 bg-indigo-50' : 'text-gray-600'}`}>
                    Low to High
                    {sortBy === 'price-low' && <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />}
                  </button>
                  <button onClick={() => { setSortBy('price-high'); setShowSortMenu(false); }}
                    className={`w-full flex items-center justify-between px-4 py-2.5 text-[12px] font-medium transition-all hover:bg-gray-50 ${sortBy === 'price-high' ? 'text-indigo-600 bg-indigo-50' : 'text-gray-600'}`}>
                    High to Low
                    {sortBy === 'price-high' && <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />}
                  </button>
                  <div className="border-t border-gray-100 my-1" />
                  <button onClick={() => { setSortBy('newest'); setShowSortMenu(false); }}
                    className={`w-full flex items-center justify-between px-4 py-2.5 text-[12px] font-medium transition-all hover:bg-gray-50 ${sortBy === 'newest' ? 'text-indigo-600 bg-indigo-50' : 'text-gray-600'}`}>
                    Newest First
                    {sortBy === 'newest' && <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />}
                  </button>
                </div>
              </>
            )}
            {viewMode === 'ecommerce' && (
              <div className="relative">
                <button onClick={() => setShowProfileMenu(p => !p)}
                  className="w-[38px] h-[38px] rounded-full flex items-center justify-center bg-white text-gray-500 hover:bg-gray-100 border border-gray-200 shadow-sm transition-all active:scale-90">
                  {user?.photoURL ? (
                    <img src={user.photoURL} alt="" className="w-6 h-6 rounded-full" />
                  ) : (
                    <User className="w-[15px] h-[15px]" />
                  )}
                </button>
                {showProfileMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowProfileMenu(false)} />
                    <div className="absolute right-0 top-full mt-2 z-50 bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 min-w-[180px] overflow-hidden">
                      {(user || tgLoggedIn) ? (
                        <>
                          <div className="px-4 py-2.5 border-b border-gray-100">
                            <p className="text-sm font-bold text-gray-900 truncate">{user?.displayName || user?.email?.split('@')[0] || telegramUser?.name || telegramUser?.username || 'Account'}</p>
                            {user?.email && <p className="text-[11px] text-gray-400 truncate">{user.email}</p>}
                          </div>
                          <a href={dashboardUrl}
                            className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                            <User className="w-4 h-4" /> My Dashboard
                          </a>
                          <button onClick={() => { setShowProfileMenu(false); handleSignOut(); }}
                            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors">
                            <LogOut className="w-4 h-4" /> Sign Out
                          </button>
                        </>
                      ) : (
                        <button onClick={() => { setShowProfileMenu(false); setShowSignIn(true); }}
                          className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors">
                          <User className="w-4 h-4" /> Sign In
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </motion.div>

        {shopBio && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="text-[11px] md:text-[12px] text-gray-500 leading-relaxed mb-2 px-1 whitespace-pre-wrap">
            {shopBio}
          </motion.p>
        )}

        {/* View mode toggle */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="flex gap-1.5 mb-4">
          {[
            { key: 'telegram', label: 'Buy on Telegram' },
            { key: 'ecommerce', label: 'Buy on Website' },
            { key: 'guest', label: 'Buy as a Guest' },
          ].map(opt => (
            <button key={opt.key} onClick={() => setViewMode(opt.key)}
              className={`flex-1 px-1.5 sm:px-2.5 py-1.5 rounded-lg text-[10px] sm:text-[11px] font-bold leading-tight text-center transition-all active:scale-95 ${
                viewMode === opt.key
                  ? 'theme-filter-active'
                  : 'bg-white text-gray-500 hover:bg-gray-100 border border-gray-200'
              }`}>
              <ShoppingBag className="w-3 h-3 inline mr-1 -mt-0.5" />
              {opt.label}
            </button>
          ))}
        </motion.div>

        {/* Search */}
        <AnimatePresence>
          {showSearch && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mb-4">
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-1 flex items-center">
                <Search className="w-5 h-5 text-gray-400 ml-4 flex-shrink-0" />
                <input type="text" autoFocus value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search products..." className="flex-1 px-3 py-3 bg-transparent outline-none text-sm font-medium" />
                {searchQuery && <button onClick={() => setSearchQuery('')} className="p-2 text-gray-400 hover:text-gray-600 mr-1"><X className="w-4 h-4" /></button>}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Categories */}
        {categories.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="mb-6 overflow-x-auto scrollbar-hide -mx-4 px-4">
            <div className="flex gap-2 min-w-max pb-2">
              <button onClick={() => setSelectedCategory(null)}
                className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${!selectedCategory ? 'theme-filter-active' : 'bg-white text-gray-500 hover:bg-gray-100 border border-gray-200'}`}>
                <Sparkles className="w-4 h-4 inline mr-1.5" />All
              </button>
              {categories.map(cat => (
                <button key={cat.id} onClick={() => setSelectedCategory(cat.id === selectedCategory ? null : cat.id)}
                  className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${selectedCategory === cat.id ? 'theme-filter-active' : 'bg-white text-gray-500 hover:bg-gray-100 border border-gray-200'}`}>
                  {cat.name}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {searchQuery && (
          <p className="text-sm text-gray-400 mb-4 ml-1">{displayedProducts.length} result{displayedProducts.length !== 1 ? 's' : ''} for "{searchQuery}"</p>
        )}

        {/* Products */}
        <div id="shop-products">
        {displayedProducts.length === 0 ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-sm">
            <div className="w-20 h-20 bg-gradient-to-br from-gray-50 to-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
              <Package className="w-10 h-10 text-gray-300" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">{searchQuery ? 'No Products Found' : 'No Products Available'}</h3>
            <p className="text-sm text-gray-400 mt-1">
              {searchQuery ? 'Try a different search term.' : selectedCategory ? 'No products in this category yet.' : 'Check back later.'}
            </p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-5 pb-8">
            {displayedProducts.map((product, index) => {
              const isOutOfStock = product.stock_quantity !== null && product.stock_quantity === 0;
              const stockLow = product.stock_quantity !== null && product.stock_quantity <= 5 && product.stock_quantity > 0;
              const productImages = getPublicImageUrls(product.image_url, shop.id);
              const cartItem = cartItems.find(i => i.product_id === product.id);
              const inCartQty = cartItem?.quantity || 0;

              return (
                <motion.div key={product.id} layout
                  initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04, duration: 0.35 }}
                  className="theme-card rounded-2xl md:rounded-3xl shadow-sm overflow-hidden hover:-translate-y-1 transition-all duration-300 group cursor-pointer"
                  onClick={() => setSelectedProduct(product)}
                >
                  <div className="aspect-square bg-gradient-to-br from-gray-50 to-gray-100 relative overflow-hidden">
                    {product.image_url && productImages[0] ? (
                      <img src={productImages[0]} alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                        onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
                    ) : null}
                    <div className="w-full h-full items-center justify-center text-gray-300"
                      style={{ display: product.image_url && productImages[0] ? 'none' : 'flex' }}>
                      <Package className="w-12 h-12 md:w-16 md:h-16" />
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    {productImages.length > 1 && (
                      <div className="absolute top-2 right-2 md:top-3 md:right-3">
                        <span className="px-2 py-0.5 bg-white/90 backdrop-blur-sm rounded-lg text-[10px] font-bold text-gray-600 shadow-xs flex items-center gap-1">
                          <Package className="w-2.5 h-2.5" />{productImages.length}
                        </span>
                      </div>
                    )}
                    <div className="absolute bottom-2 left-2 md:bottom-3 md:left-3">
                      <span className={`px-2 py-0.5 md:px-2.5 md:py-1 rounded-lg text-[10px] md:text-xs font-bold uppercase tracking-wider backdrop-blur-sm shadow-sm ${
                        isOutOfStock ? 'bg-rose-500/90 text-white' :
                        stockLow ? 'bg-amber-500/90 text-white' : 'bg-emerald-500/90 text-white'
                      }`}>
                        {isOutOfStock ? 'Out of Stock' : stockLow ? `${product.stock_quantity} left` : 'In Stock'}
                      </span>
                    </div>
                    {product.category_id && categoryMap[product.category_id] && (
                      <div className="absolute top-2 left-2 md:top-3 md:left-3">
                        <span className="px-2 py-0.5 md:px-2.5 md:py-1 bg-white/90 backdrop-blur-sm rounded-lg text-[10px] md:text-xs font-bold text-gray-600 shadow-xs flex items-center gap-1">
                          <Tag className="w-2.5 h-2.5" />{categoryMap[product.category_id]}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="p-3 md:p-4">
                    <h3 className="font-bold text-gray-900 text-sm md:text-base line-clamp-1 mb-0.5 theme-hover-price transition-colors">{product.name}</h3>
                    {product.description && (
                      <p className="text-xs text-gray-400 line-clamp-2 mb-2 leading-relaxed">{product.description}</p>
                    )}
                    <div className="flex items-baseline gap-1 mb-1">
                      <span className="font-bold theme-price text-sm md:text-base">{formatPrice(product.price)}</span>
                      <span className="text-[10px] text-gray-400 font-medium">MMK</span>
                    </div>

                    {(() => {
                      const productColors = getProductColors(product);
                      if (!productColors.length) return null;
                      return (
                        <div className="flex flex-wrap gap-1.5 mb-2.5" onClick={e => e.stopPropagation()}>
                          {productColors.map(c => {
                            const isSelected = selectedColors[product.id] === c.color;
                            return (
                              <button key={c.color}
                                onClick={() => setSelectedColors(prev => ({ ...prev, [product.id]: isSelected ? null : c.color }))}
                                className={`w-6 h-6 rounded-full border-2 transition-all active:scale-90 flex items-center justify-center ${
                                  isSelected ? 'border-indigo-500 scale-110 shadow-md' : 'border-gray-300 hover:scale-110'
                                }`}
                                style={{ backgroundColor: c.color }}
                                title={COLOR_NAMES[c.color] || c.color}
                              >
                                {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white shadow-sm" />}
                              </button>
                            );
                          })}
                        </div>
                      );
                    })()}

                    <div onClick={(e) => e.stopPropagation()} className="flex flex-col gap-1.5">
                      {viewMode === 'telegram' ? (
                        sentProducts.has(product.id) ? (
                          <div className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl font-bold text-sm bg-emerald-50 text-emerald-600 border border-emerald-200">
                            <CheckCircle className="w-4 h-4" />
                            Product sent. Check in Telegram
                          </div>
                        ) : (
                          <button onClick={(e) => {
                            e.stopPropagation();
                            const link = `https://t.me/${shop?.bot_username}?start=${product.link_token || product.id}`;
                            window.open(link, '_blank', 'noopener');
                            setSentProducts(prev => new Set(prev).add(product.id));
                          }}
                            className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl font-bold text-sm transition-all active:scale-[0.97] theme-btn">
                            <ShoppingCart className="w-4 h-4" />
                            Buy Now
                          </button>
                        )
                      ) : (
                        <>
                      {inCartQty > 0 ? (
                        <div className="w-full flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
                          <button onClick={(e) => { e.stopPropagation(); updateQty(product.id, -1); }}
                            className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-100 active:scale-90 transition-all">
                            <Minus className="w-3 h-3 text-gray-600" />
                          </button>
                          <span className="text-sm font-bold text-gray-900 min-w-[24px] text-center">{inCartQty}</span>
                          <button onClick={(e) => { e.stopPropagation(); addToCart(product); }}
                            className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-100 active:scale-90 transition-all">
                            <Plus className="w-3 h-3 text-gray-600" />
                          </button>
                        </div>
                      ) : (
                        <button onClick={(e) => {
                          e.stopPropagation();
                          const colors = getProductColors(product);
                          if (colors.length > 0 && !selectedColors[product.id]) return;
                          addToCart(product, selectedColors[product.id]);
                        }}
                          disabled={isOutOfStock || (getProductColors(product).length > 0 && !selectedColors[product.id])}
                          className={`w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl font-bold text-sm transition-all active:scale-[0.97] ${
                            isOutOfStock ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'theme-btn'
                          } ${!isOutOfStock && getProductColors(product).length > 0 && !selectedColors[product.id] ? 'opacity-60' : ''}`}>
                          <ShoppingCart className="w-4 h-4" />
                          Add to Cart
                        </button>
                      )}
                      <div className="flex gap-1.5">
                        {!isOutOfStock && (
                          <button onClick={(e) => { e.stopPropagation(); handleBuyNow(product); }}
                            disabled={getProductColors(product).length > 0 && !selectedColors[product.id]}
                            className={`flex-1 px-3 py-2 rounded-xl font-bold text-xs transition-all active:scale-[0.97] ${
                              getProductColors(product).length > 0 && !selectedColors[product.id] ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'theme-btn shadow-sm'
                            }`}>
                            Buy Now
                          </button>
                        )}
                        {!isOutOfStock && viewMode === 'telegram' && shop?.bot_username && (
                          <a href={`https://t.me/${shop.bot_username}`} target="_blank" rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-xl font-bold text-xs transition-all active:scale-[0.97] bg-sky-50 text-sky-600 hover:bg-sky-100 border border-sky-200">
                            <MessageCircle className="w-3.5 h-3.5" />
                            Telegram
                          </a>
                        )}
                      </div>
                      </>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
        </div>
          </>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 mt-8">
        <div className="max-w-7xl mx-auto px-4 py-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: theme.css['--theme-btn'] }}>
              <ShoppingBag className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-bold text-gray-800">Telegram E-Commerce</span>
          </div>
          <p className="text-xs text-gray-400">Powered by Telegram E-Commerce Platform</p>
        </div>
      </footer>

      {/* Product Detail Modal */}
      <AnimatePresence>
        {selectedProduct && (
          <ProductDetailModal
            product={selectedProduct}
            shop={shop}
            onClose={() => setSelectedProduct(null)}
            onAddToCart={addToCart}
            cartQty={cartItems.find(i => i.product_id === selectedProduct.id)?.quantity || 0}
            viewMode={viewMode}
            sentProducts={sentProducts}
            setSentProducts={setSentProducts}
            slug={slug}
          />
        )}
      </AnimatePresence>

      {/* Sign In Modal */}
      <AnimatePresence>
        {showSignIn && (
          <SignInModal onClose={() => setShowSignIn(false)} onSuccess={handleSignInSuccess} botUsername={shop?.bot_username} shopSlug={slug || shop?.public_slug || shop?.bot_username || ''} />
        )}
      </AnimatePresence>

      {/* Cart Panel */}
      <AnimatePresence>
        {showCart && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) setShowCart(false); }}
          >
            <motion.div
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b border-gray-100">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5" /> Cart ({cartCount})
                </h2>
                <button onClick={() => setShowCart(false)} className="p-2 text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {cartItems.length === 0 ? (
                  <div className="text-center py-12">
                    <ShoppingCart className="w-16 h-16 text-gray-200 mx-auto mb-3" />
                    <p className="text-gray-400 text-sm">Your cart is empty</p>
                  </div>
                ) : (
                  cartItems.map(item => (
                    <div key={item.product_id} className="flex items-center gap-3 bg-gray-50 rounded-2xl p-3">
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.name} className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-16 h-16 rounded-xl bg-gray-200 flex items-center justify-center flex-shrink-0">
                          <Package className="w-6 h-6 text-gray-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900 truncate">{item.name}</p>
                        <p className="text-xs text-gray-500">{formatPrice(item.price)} MMK each</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <button onClick={() => updateQty(item.product_id, -1)}
                            className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-100 active:scale-90 transition-all">
                            <Minus className="w-3 h-3 text-gray-600" />
                          </button>
                          <span className="text-sm font-bold text-gray-900 min-w-[20px] text-center">{item.quantity}</span>
                          <button onClick={() => updateQty(item.product_id, 1)}
                            className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-100 active:scale-90 transition-all">
                            <Plus className="w-3 h-3 text-gray-600" />
                          </button>
                          <button onClick={() => removeItem(item.product_id)}
                            className="ml-auto p-1.5 text-gray-400 hover:text-rose-500 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {cartItems.length > 0 && (
                <div className="border-t border-gray-100 p-4 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Subtotal</span>
                    <span className="font-bold text-gray-900">{formatPrice(totalAmount)} MMK</span>
                  </div>
                  <button
                    onClick={handleCheckout}
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-sm text-white transition-all active:scale-[0.98] shadow-lg"
                    style={{ background: theme.css['--theme-btn'] }}
                  >
                    Proceed to Checkout <ChevronRight className="w-4 h-4" />
                  </button>
                  {!user && !tgLoggedIn && (
                    <p className="text-xs text-gray-400 text-center">You'll need to sign in during checkout</p>
                  )}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Register Modal */}
      <AnimatePresence>
        {showRegister && (
          <RegisterModal
            shop={shop}
            user={user}
            onClose={() => { setShowRegister(false); setShowCart(true); }}
            onSuccess={handleRegisterSuccess}
          />
        )}
      </AnimatePresence>

      {/* Payment Select Modal */}
      <AnimatePresence>
        {showPaymentSelect && (
          <PaymentSelect
            paymentMethods={paymentMethods}
            onBack={() => { setShowPaymentSelect(false); setShowCart(true); }}
            onNext={handlePaymentNext}
          />
        )}
      </AnimatePresence>

      {/* Checkout Modal */}
      <AnimatePresence>
        {checkoutOpen && (user || tgLoggedIn || viewMode === 'guest') && (
          <CheckoutModal
            shop={shop}
            cartItems={cartItems}
            totalAmount={totalAmount}
            user={user}
            telegramUser={telegramUser}
            viewMode={viewMode}
            shopSlug={slug}
            selectedPayment={selectedPaymentMethod}
            onClose={() => { setCheckoutOpen(false); setSelectedPaymentMethod(null); }}
            onOrderPlaced={handleOrderPlaced}
          />
        )}
      </AnimatePresence>

      {/* Order Confirmation */}
      <AnimatePresence>
        {orderPlaced && (
          <OrderConfirmation
            data={orderPlaced}
            shop={shop}
            viewMode={viewMode}
            onContinueShopping={() => setOrderPlaced(null)}
          />
        )}
      </AnimatePresence>

      {/* Floating cart FAB */}
      <AnimatePresence>
        {viewMode !== 'telegram' && cartCount > 0 && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', damping: 15, stiffness: 300 }}
            onClick={() => setShowCart(true)}
            className="fixed bottom-24 right-6 w-14 h-14 rounded-full shadow-xl z-40 flex items-center justify-center active:scale-90 hover:scale-105"
            style={{ background: theme.css['--theme-btn'] }}
          >
            <ShoppingCart className="w-6 h-6 text-white" />
            <span className="absolute -top-1.5 -right-1.5 min-w-[22px] h-5 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1.5 shadow-lg border-2 border-white">
              {cartCount > 99 ? '99+' : cartCount}
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      {data?.ai_agent_enabled && (
        <>
          <button
            onClick={() => setChatOpen(!chatOpen)}
            className="fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg z-50 flex items-center justify-center transition-transform active:scale-90 hover:scale-105"
            style={{ background: theme.css['--theme-btn'] }}
          >
            {chatOpen ? <X className="w-6 h-6 text-white" /> : <MessageCircle className="w-6 h-6 text-white" />}
          </button>

          {chatOpen && (
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.95 }}
              className="fixed bottom-24 left-1/2 -translate-x-1/2 w-[calc(100%-32px)] max-w-[360px] h-[520px] max-h-[75vh] bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 flex flex-col overflow-hidden"
            >
              <div className="p-4" style={{ background: theme.css['--theme-header'] }}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                    <MessageCircle className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Shop Assistant</h3>
                    <p className="text-[10px] text-white/70">Ask anything about our products</p>
                  </div>
                </div>
              </div>

              {showVisitorForm ? (
                <div className="flex-1 overflow-y-auto p-4">
                  <div className="text-center mb-5 mt-2">
                    <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center mx-auto mb-3">
                      <MessageCircle className="w-6 h-6 text-indigo-600" />
                    </div>
                    <h3 className="font-bold text-gray-900 text-base">Welcome!</h3>
                    <p className="text-xs text-gray-500 mt-1">Fill in or skip to chat</p>
                  </div>
                  <div className="space-y-2.5">
                    <input type="text" placeholder="Name (optional)"
                      value={visitorForm.name}
                      onChange={e => setVisitorForm(p => ({ ...p, name: e.target.value }))}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm" />
                    <input type="tel" placeholder="Phone (optional)"
                      value={visitorForm.phone}
                      onChange={e => setVisitorForm(p => ({ ...p, phone: e.target.value }))}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm" />
                    <input type="email" placeholder="Email (optional)"
                      value={visitorForm.email}
                      onChange={e => setVisitorForm(p => ({ ...p, email: e.target.value }))}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm" />
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => handleVisitorSave(visitorForm.name, visitorForm.phone, visitorForm.email)}
                        className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all active:scale-95"
                        style={{ background: theme.css['--theme-btn'] }}
                      >Start Chatting</button>
                      <button
                        onClick={() => handleVisitorSave('', '', '')}
                        className="px-4 py-2.5 rounded-xl text-sm font-bold text-gray-500 bg-gray-100 transition-all active:scale-95"
                      >Skip</button>
                    </div>
                  </div>
                </div>
              ) : (
                <div ref={chatRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                  {chatMessages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                        msg.role === 'user' ? 'text-white' : 'bg-gray-100 text-gray-800'
                      }`} style={msg.role === 'user' ? { background: theme.css['--theme-btn'] } : {}}>
                        {msg.file_id && msg.file_type === 'photo' && (
                          <img src={API_BASE + '/telegram/file/' + msg.file_id + '?bot_id=' + shop?.id}
                            alt="Photo" className="max-w-full rounded-lg mb-1 max-h-48 object-cover" loading="lazy" />
                        )}
                        {msg.content && <p className="whitespace-pre-wrap">{msg.content}</p>}
                      </div>
                    </div>
                  ))}
                  {chatLoading && (
                    <div className="flex justify-start">
                      <div className="bg-gray-100 rounded-2xl px-4 py-3">
                        <div className="flex gap-1.5">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.1s]" />
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="border-t border-gray-100 px-4 py-3">
                <div className="flex gap-2 w-full min-w-0">
                  <input ref={photoInputRef} type="file" accept="image/*" onChange={handleVisitorPhoto} className="hidden" />
                  <button
                    onClick={() => photoInputRef.current?.click()}
                    disabled={uploadingPhoto || chatLoading}
                    className="w-10 h-10 rounded-xl flex items-center justify-center disabled:opacity-50 transition-all active:scale-90 flex-shrink-0 bg-gray-100 text-gray-500 hover:bg-gray-200"
                    title="Send photo"
                  >
                    {uploadingPhoto ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageUp className="w-4 h-4" />}
                  </button>
                  <input
                    ref={chatInputRef} type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChatSend(); } }}
                    placeholder="Type a message..."
                    className="flex-1 min-w-0 px-3.5 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                    disabled={chatLoading}
                  />
                  <button
                    onClick={handleChatSend}
                    disabled={chatLoading || !chatInput.trim()}
                    className="w-10 h-10 rounded-xl flex items-center justify-center disabled:opacity-50 transition-all active:scale-90 flex-shrink-0"
                    style={{ background: theme.css['--theme-btn'] }}
                  >
                    <Send className="w-4 h-4 text-white" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </>
      )}

      {/* Newsfeed Modal */}
      {showNewsfeed && (
        <NewsfeedFeed
          botId={shop?.id}
          botName={shop?.bot_full_name}
          onClose={() => setShowNewsfeed(false)}
          viaDomain={viaDomain}
          slug={slug || shop?.public_slug}
          shop={shop}
          initialPostCode={initialPostCode}
        />
      )}

      {/* Fullscreen Logo */}
      <AnimatePresence>
        {fullscreenLogo && shop?.profile_picture && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setFullscreenLogo(false)}
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center cursor-zoom-out"
          >
            <motion.img
              key="logo-full"
              src={shop.profile_picture}
              alt="Logo"
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.7, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="max-w-[85vw] max-h-[85vh] rounded-2xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
