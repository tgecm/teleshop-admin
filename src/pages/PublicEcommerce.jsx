import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getPublicShop, getPublicShopByDomain, getShopBio, trackOrder } from '../api/public';
import { useCartState } from '../context/CartContext';
import { ShoppingBag, Package, AlertCircle, ShoppingCart, ChevronRight,
  Tag, Sparkles, Clock, Search, X, ChevronLeft, ChevronDown, ArrowUpDown, Newspaper,
  Minus, Plus, Trash2, LogOut, CheckCircle, CheckCircle2, Loader2, User,
  MessageCircle, Send, ImageUp, Copy, Ticket, CreditCard, Award, Map
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { THEMES, DEFAULT_THEME } from '../themes/themes';
import SearchableSelect from '../components/shared/SearchableSelect';
import { REGION_NAMES, getDistricts, getTownships } from '../data/townships';
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
import { RichMessage } from '../components/chat/RichMessage';
import NewsfeedFeed from '../components/NewsfeedFeed';

import { formatPrice } from '../utils/formatPrice';
import { API_BASE, fileUrl } from '../api/config';

function authHeaders() {
  const token = localStorage.getItem('telegram_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function decodeJwtPayload(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    return JSON.parse(atob(parts[1]));
  } catch { return null; }
}

function getUserIdFromToken() {
  const token = localStorage.getItem('telegram_token');
  if (!token) return null;
  const payload = decodeJwtPayload(token);
  if (!payload) return null;
  return payload.sub || payload.user_id || payload.id || null;
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

function linkifyText(text) {
  const urlRegex = /(https?:\/\/[^\s<]+)|((?:www\.)[^\s<]+\.[^\s<]{2,})|([a-zA-Z0-9][a-zA-Z0-9-]*(?:\.[a-zA-Z]{2,})+(?:\/[^\s<]*)?)/gi;
  const parts = text.split(urlRegex).filter(Boolean);
  return parts.map((part, i) => {
    if (part.match(/^https?:\/\//i)) {
      return <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-indigo-600 font-medium hover:underline">{part}</a>;
    }
    if (part.match(/^www\./i)) {
      return <a key={i} href={'https://' + part} target="_blank" rel="noopener noreferrer" className="text-indigo-600 font-medium hover:underline">{part}</a>;
    }
    if (part.match(/^[a-zA-Z0-9][a-zA-Z0-9-]*\.[a-zA-Z]{2,}/)) {
      return <a key={i} href={'https://' + part} target="_blank" rel="noopener noreferrer" className="text-indigo-600 font-medium hover:underline">{part}</a>;
    }
    return part;
  });
}

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

function ProductDetailModal({ product, shop, onClose, onAddToCart, cartQty, viewMode, sentProducts, setSentProducts, slug, orderButtonLabel, onOpenCart, onUpdateQty, totalCartCount }) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [selectedColor, setSelectedColor] = useState(null);
  const [selectedOptions, setSelectedOptions] = useState({});
  const touchStartX = useRef(null);
  const images = getPublicImageUrls(product.image_url, shop?.id);
  const isOutOfStock = product.stock_quantity !== null && product.stock_quantity === 0;
  const productColors = product.specifications?.colors && Array.isArray(product.specifications.colors)
    ? product.specifications.colors : [];
  const productOptions = product.specifications?.options && Array.isArray(product.specifications.options)
    ? product.specifications.options : [];

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
        className="relative bg-white w-full max-w-lg md:rounded-[32px] md:mx-4 max-h-[92svh] overflow-y-auto rounded-t-xl shadow-2xl"
      >
        <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
          {viewMode !== 'telegram' && (
            <button onClick={onOpenCart} className="p-2.5 bg-white/90 backdrop-blur-md rounded-full shadow-lg hover:bg-white active:scale-90 transition-all relative">
              <ShoppingCart className="w-5 h-5 text-gray-700" />
              {totalCartCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 shadow-md">
                  {totalCartCount > 99 ? '99+' : totalCartCount}
                </span>
              )}
            </button>
          )}
          <button onClick={onClose} className="p-2.5 bg-white/90 backdrop-blur-md rounded-full shadow-lg hover:bg-white active:scale-90 transition-all">
            <X className="w-5 h-5 text-gray-700" />
          </button>
        </div>

        <div className="sticky top-0 z-10 aspect-[16/9] bg-gray-100 overflow-hidden" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
          <AnimatePresence mode="wait">
            <motion.img
              key={currentImageIndex} initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} transition={{ duration: 0.2 }}
              src={allImages[currentImageIndex] || '/placeholder.svg'} alt={product.name}
              className="w-full h-full object-contain"
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

        <div className="p-5 pt-3 pb-6">
          {colorImages.length > 0 && colorImages.map(c => (
            <img key={c.color} src={c.url} alt="" className="hidden" aria-hidden="true" />
          ))}
          <h2 className="text-xl font-bold text-gray-900 mb-2">{product.name}</h2>
          <div className="mb-4">
            {product.original_price > 0 && <p className="text-sm line-through text-red-400 font-medium">{formatPrice(product.original_price, shop?.currency || 'MMK')}</p>}
            <p className="text-2xl font-bold theme-price inline-flex items-baseline gap-1"><span>{formatPrice(product.price, shop?.currency || 'MMK')}</span></p>
          </div>

          {product.description && (
            <div className="bg-gray-50 rounded-2xl p-4 mb-4 border border-gray-100">
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{product.description}</p>
            </div>
          )}

          {viewMode !== 'telegram' && productColors.length > 0 && (
            <div className="mb-5">
              <p className="text-xs text-gray-500 font-medium mb-2.5">Color</p>
              <div className="flex flex-wrap gap-3">
                {productColors.map(c => {
                  const isSelected = selectedColor === c.color;
                  return (
                    <button key={c.color}
                      onClick={() => {
                        setSelectedColor(isSelected ? null : c.color);
                        setCurrentImageIndex(0);
                      }}
                      className={`flex flex-col items-center gap-1.5 transition-all active:scale-90 ${
                        isSelected ? 'scale-110' : 'opacity-70 hover:opacity-100'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-full border-[3px] transition-all ${
                        isSelected ? 'border-white ring-2 ring-offset-2 ring-indigo-500 shadow-lg' : 'border-gray-300'
                      }`} style={{ backgroundColor: c.color }} />
                      <span className={`text-[10px] font-bold transition-all ${isSelected ? 'text-indigo-600' : 'text-gray-500'}`}>
                        {COLOR_NAMES[c.color] || c.color.replace('#', '')}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {viewMode !== 'telegram' && productOptions.length > 0 && (
            <div className="mb-5 space-y-4">
              {productOptions.map(opt => (
                <div key={opt.id}>
                  <p className="text-xs text-gray-500 font-medium mb-2.5">{opt.name}</p>
                  <div className="flex flex-wrap gap-2">
                    {opt.values.map(v => {
                      const isSelected = selectedOptions[opt.id] === v.id;
                      return (
                        <button key={v.id}
                          onClick={() => setSelectedOptions(prev => ({ ...prev, [opt.id]: isSelected ? null : v.id }))}
                          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all active:scale-95 ${
                            isSelected
                              ? 'bg-indigo-600 text-white shadow-md'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {v.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {viewMode !== 'telegram' && (
            <div className="flex gap-2">
              {cartQty > 0 ? (
                <div className="flex-1 flex items-center justify-between bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3">
                  <button
                    onClick={() => onUpdateQty(product.id, -1)}
                    className="w-9 h-9 rounded-xl bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-100 active:scale-90 transition-all"
                  >
                    <Minus className="w-4 h-4 text-gray-600" />
                  </button>
                  <span className="text-lg font-bold text-gray-900 min-w-[28px] text-center">{cartQty}</span>
                  <button
                    onClick={() => { onAddToCart(product, selectedColor, selectedOptions); }}
                    disabled={isOutOfStock || (product.stock_quantity !== null && cartQty >= product.stock_quantity)}
                    className="w-9 h-9 rounded-xl bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-100 active:scale-90 transition-all disabled:opacity-40"
                  >
                    <Plus className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => { onAddToCart(product, selectedColor, selectedOptions); }}
                  disabled={isOutOfStock || (productColors.length > 0 && !selectedColor) || (productOptions.length > 0 && productOptions.some(o => !selectedOptions[o.id]))}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm transition-all shadow-sm ${
                    isOutOfStock
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'
                      : productColors.length > 0 && !selectedColor
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'
                        : productOptions.length > 0 && productOptions.some(o => !selectedOptions[o.id])
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'
                        : 'bg-white border-2 border-indigo-600 text-indigo-600 hover:bg-indigo-50 active:scale-[0.98]'
                  }`}
                >
                  <ShoppingCart className="w-4 h-4" />
                  {isOutOfStock ? 'Currently Unavailable' : productColors.length > 0 && !selectedColor ? 'Select a Color' : productOptions.length > 0 && productOptions.some(o => !selectedOptions[o.id]) ? 'Select Options' : 'Add to Cart'}
                </button>
              )}
              <button
                onClick={() => {
                  if (cartQty === 0) onAddToCart(product, selectedColor, selectedOptions);
                  onOpenCart();
                }}
                disabled={isOutOfStock || cartQty === 0 && ((productColors.length > 0 && !selectedColor) || (productOptions.length > 0 && productOptions.some(o => !selectedOptions[o.id])))}
                className="flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm transition-all shadow-lg theme-btn hover:shadow-xl active:scale-[0.98] disabled:opacity-50"
              >
                <ShoppingCart className="w-4 h-4" />
                Buy
              </button>
            </div>
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
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm whitespace-nowrap transition-all active:scale-[0.98] theme-btn">
                <ShoppingCart className="w-5 h-5" />
                {orderButtonLabel}
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
  const [error, setError] = useState('');
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
    setError('');
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
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-2xl">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
              <p className="text-xs font-medium text-red-700 text-left">{error}</p>
            </div>
          )}
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

export function CheckoutModal({ shop, cartItems, totalAmount, user, telegramUser, onClose, onOrderPlaced, shopSlug, viewMode, selectedPayment, products, deliverySettings, deliveryFees, contactForm, checkoutFields, pointsSettings, customerPoints, customerUid }) {
  const cFields = checkoutFields || { name: false, phones: false, emails: false, telegram: false, viber: false, zone: false, address: false, notes: false };
  const [proofFile, setProofFile] = useState(null);
  const [proofPreview, setProofPreview] = useState('');
  const [uploadingProof, setUploadingProof] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [agreed1, setAgreed1] = useState(false);
  const [agreed2, setAgreed2] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [couponApplied, setCouponApplied] = useState(null);
  const [couponError, setCouponError] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const { addToast } = useToastStore();
  const [pointsToRedeem, setPointsToRedeem] = useState(0);
  const [pointsDiscount, setPointsDiscount] = useState(0);
  const [redeemingPoints, setRedeemingPoints] = useState(false);
  const [isPointsPayment, setIsPointsPayment] = useState(false);

  const handleCopy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      addToast('Copied to clipboard');
    } catch {
      addToast('Failed to copy', 'error');
    }
  };

  const appliedDiscount = couponApplied ? Number(couponApplied.discount_amount) || 0 : 0;
  const effectiveTotal = couponApplied ? totalAmount - appliedDiscount : totalAmount;

  const deliveryFeeAmount = useMemo(() => {
    const total = couponApplied ? effectiveTotal : totalAmount;
    let fee = 0;

    const mode = deliverySettings?.delivery_fee_mode || 'flat';

    if (mode === 'flat') {
      // Flat fee applies globally regardless of per-product flags
      fee = Number(deliverySettings?.delivery_fee) || 0;
    } else {
      // Zone mode: if zone fees are configured and region/district/township match, apply the fee
      const zFees = deliveryFees || [];
      if (zFees.length > 0 && contactForm.region && contactForm.district && contactForm.township) {
        const match = zFees.find(zf =>
          zf.region?.toLowerCase() === contactForm.region.toLowerCase() &&
          zf.district?.toLowerCase() === contactForm.district.toLowerCase() &&
          zf.township?.toLowerCase() === contactForm.township.toLowerCase()
        );
        if (match && Number(match.fee) > 0) {
          fee = Number(match.fee);
        }
      }
    }

    // Free delivery threshold
    const threshold = Number(deliverySettings?.free_delivery_threshold) || 0;
    if (fee > 0 && threshold > 0 && total >= threshold) {
      fee = 0;
    }

    return fee;
  }, [deliverySettings, deliveryFees, totalAmount, couponApplied, effectiveTotal, contactForm.region, contactForm.district, contactForm.township, cartItems, products]);

  const handleProofFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const img = new Image();
    const reader = new FileReader();
    reader.onload = () => {
      img.src = reader.result;
      img.onload = () => {
        let w = img.naturalWidth;
        let h = img.naturalHeight;
        const MAX = 854; // 480p width
        if (w > MAX || h > MAX * 0.75) {
          if (w > h) { h = (h / w) * MAX; w = MAX; }
          else { w = (w / h) * (MAX * 0.75); h = MAX * 0.75; }
        }
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        const ctx = c.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, w, h);
        c.toBlob(blob => {
          const compressed = new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' });
          setProofFile(compressed);
          setProofPreview(c.toDataURL('image/jpeg', 0.85));
        }, 'image/jpeg', 0.85);
      };
    };
    reader.readAsDataURL(file);
  };

  const ptsEnabled = pointsSettings?.enabled && customerPoints != null;
  const redeemPtsRate = Number(pointsSettings?.redeem_points) || 100;
  const redeemVal = Number(pointsSettings?.redeem_value) || 1000;
  const pointsMmkVal = customerPoints ? Math.floor((customerPoints / redeemPtsRate) * redeemVal) : 0;
  const ptsNeededForFull = totalAmount > 0 ? Math.ceil((totalAmount / redeemVal) * redeemPtsRate) : 0;
  const effectivePts = Math.min(customerPoints || 0, ptsNeededForFull);
  const ptsDisc = isPointsPayment ? Math.min(pointsMmkVal, totalAmount) : pointsDiscount;
  const ptsTotal = isPointsPayment ? Math.max(0, totalAmount - ptsDisc) : (couponApplied ? effectiveTotal : totalAmount) - pointsDiscount;

  const handleRedeemPoints = async () => {
    const minRedeem = Number(pointsSettings?.min_redeem) || 50;
    if (!customerUid || pointsToRedeem < minRedeem) return;
    setRedeemingPoints(true);
    try {
      const res = await fetch(API_BASE + '/customer/redeem-points', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firebase_uid: customerUid,
          bot_id: shop.id,
          points_to_use: pointsToRedeem,
          order_total: totalAmount,
        }),
      });
      const result = await res.json();
      if (result.discount !== undefined) {
        setPointsDiscount(result.discount);
        setPointsToRedeem(result.points_used || 0);
      }
    } catch (e) {
      console.error('Redeem points error:', e);
    }
    setRedeemingPoints(false);
  };

  const handleSubmit = async () => {
    if (cFields.name && !contactForm.name.trim()) { setError('Name is required'); return; }
    if (cFields.phones && !contactForm.phones[0]?.trim()) { setError('At least one phone number is required'); return; }
    if (cFields.emails && !contactForm.emails[0]?.trim()) { setError('At least one email is required'); return; }
    if (cFields.address && !contactForm.address.trim()) { setError('Delivery address is required'); return; }
    if (cFields.telegram && !contactForm.telegram.trim()) { setError('Telegram username is required'); return; }
    if (cFields.viber && !contactForm.viber.trim()) { setError('Viber number is required'); return; }
    if (cFields.notes && !contactForm.notes.trim()) { setError('Notes is required'); return; }
    if ((viewMode === 'ecommerce' || viewMode === 'guest') && !proofFile && selectedPayment?.id !== 'cod' && !isPointsPayment) { setError('Payment proof screenshot is required'); return; }
    setLoading(true);
    setError('');
    try {
      // Check stock before proceeding
      const stockRes = await fetch(API_BASE + '/public/check-stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bot_id: shop.id, items: cartItems.map(i => ({ product_id: i.product_id, quantity: i.quantity })) }),
      });
      if (stockRes.ok) {
        const stockData = await stockRes.json();
        const oosItems = stockData.items?.filter(i => !i.in_stock) || [];
        if (oosItems.length > 0) {
          const names = oosItems.map(i => i.name || `Product #${i.product_id}`).join(', ');
          setError(`Out of stock: ${names}. Please remove them and try again.`);
          setLoading(false);
          return;
        }
      }

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

      const phoneStr = contactForm.phones.filter(Boolean).map(p => p.trim()).join(', ');
      const emailStr = contactForm.emails.filter(Boolean).map(e => e.trim()).join(', ');

      // Save profile first (use uid from Firebase or JWT token for custom domain proxy auth)
      const profileUid = viewMode === 'guest' ? '' : (user?.uid || getUserIdFromToken() || '');
      if (profileUid) {
        await fetch(API_BASE + '/api/customer-profile/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            uid: profileUid,
            bot_id: shop.id,
            display_name: contactForm.name.trim(),
            email: emailStr,
            phone: phoneStr,
            photo_url: user?.photoURL || '',
            telegram_username: contactForm.telegram.trim(),
            viber_number: contactForm.viber.trim(),
            address: contactForm.address.trim(),
            notes: contactForm.notes.trim(),
            region: contactForm.region,
            district: contactForm.district,
            township: contactForm.township,
          }),
        }).catch(() => {});
      }

      const body = {
        bot_id: shop.id,
        ...(profileUid ? { firebase_uid: profileUid } : {}),
        ...(viewMode !== 'guest' && telegramUser?.id ? { telegram_id: telegramUser.id } : {}),
        customer_name: contactForm.name.trim(),
        phone: phoneStr,
        email: emailStr,
        address: contactForm.address.trim(),
        notes: contactForm.notes.trim(),
        telegram_username: contactForm.telegram.trim(),
        viber_number: contactForm.viber.trim(),
        region: contactForm.region,
        district: contactForm.district,
        township: contactForm.township,
        items: cartItems.map(i => {
          const variantParts = [];
          if (i.selected_color) variantParts.push(COLOR_NAMES[i.selected_color] || i.selected_color);
          if (i.selected_options) {
            const p = products.find(pp => pp.id === i.product_id);
            const opts = p?.specifications?.options || [];
            Object.entries(i.selected_options).forEach(([optId, valId]) => {
              const o = opts.find(oo => String(oo.id) === String(optId));
              if (o) { const v = o.values.find(vv => String(vv.id) === String(valId)); if (v) variantParts.push(`${o.name}: ${v.label}`); }
            });
          }
          // Use latest price from server products array
          const currentProduct = products.find(p => p.id === i.product_id);
          const currentPrice = currentProduct ? Number(currentProduct.price) : i.price;
          return {
            product_id: i.product_id,
            name: i.name,
            price: currentPrice,
            quantity: i.quantity,
            selected_color: i.selected_color,
            selected_options: i.selected_options,
            variant_label: variantParts.join(', '),
          };
        }),
        total_amount: (() => {
          const latestTotal = cartItems.reduce((sum, i) => {
            const p = products.find(pp => pp.id === i.product_id);
            return sum + (p ? Number(p.price) : i.price) * i.quantity;
          }, 0);
          return couponApplied ? latestTotal - appliedDiscount : latestTotal;
        })(),
        delivery_fee: deliveryFeeAmount,
        coupon_code: couponApplied?.code || '',
        points_earned: 0,
        points_redeemed: isPointsPayment ? effectivePts : (pointsDiscount > 0 ? pointsToRedeem : 0),
        points_discount: isPointsPayment ? ptsDisc : pointsDiscount,
      };
      if (customerUid) body.firebase_uid = customerUid;
      if (paymentProof) body.payment_proof = paymentProof;
      if (selectedPayment?.id === 'cod') {
        body.payment_method = 'COD';
      } else if (isPointsPayment) {
        body.payment_method = 'Points';
      } else if (selectedPayment?.name) {
        body.payment_method = selectedPayment.name;
      }

      const res = await fetch(API_BASE + '/public/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.detail || 'Failed to place order');
      if (viewMode === 'guest') {
        const cacheKey = 'guest_contact_' + shopSlug;
        try {
          localStorage.setItem(cacheKey, JSON.stringify({
            name: contactForm.name.trim(),
            phones: contactForm.phones.filter(Boolean).map(p => p.trim()),
            email: emailStr,
            telegram: contactForm.telegram.trim(),
            viber: contactForm.viber.trim(),
            region: contactForm.region,
            district: contactForm.district,
            township: contactForm.township,
            address: contactForm.address.trim(),
            notes: contactForm.notes.trim(),
          }));
        } catch {}
      }
      // Fetch full order details for invoice generation (same as admin panel approach)
      let orderData = data;
      try {
        const detailRes = await fetch(API_BASE + '/public/order/' + data.order_number + '?bot_id=' + shop.id);
        if (detailRes.ok) {
          orderData = await detailRes.json();
        }
      } catch (e) {
        console.error('Failed to fetch order details:', e);
      }
      onOrderPlaced(orderData);
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
              <span className="font-medium text-gray-900">{formatPrice(item.price * item.quantity, shop?.currency || 'MMK')}</span>
            </div>
          ))}
          {couponApplied && (
            <div className="flex justify-between text-sm py-1 text-emerald-600">
              <span>Discount ({couponApplied.code})</span>
              <span className="font-semibold">-{formatPrice(appliedDiscount, shop?.currency || 'MMK')}</span>
            </div>
          )}
          {pointsDiscount > 0 && !isPointsPayment && (
            <div className="flex justify-between text-sm py-1 text-amber-600">
              <span>Points Discount</span>
              <span className="font-semibold">-{formatPrice(pointsDiscount, shop?.currency || 'MMK')}</span>
            </div>
          )}
          {isPointsPayment && (
            <div className="flex justify-between text-sm py-1 text-amber-600">
              <span>Pay with Points ({formatPrice(effectivePts)} pts)</span>
              <span className="font-semibold">-{formatPrice(ptsDisc, shop?.currency || 'MMK')}</span>
            </div>
          )}
          <div className="flex justify-between text-sm py-1 text-gray-600">
            <span>Delivery Fee</span>
            <span>{deliveryFeeAmount > 0 ? formatPrice(deliveryFeeAmount, shop?.currency || 'MMK') : 'Free'}</span>
          </div>
          <div className="border-t border-gray-200 mt-2 pt-2 flex justify-between font-bold text-gray-900">
            <span>Total</span>
            <span>{formatPrice((isPointsPayment ? ptsTotal : (couponApplied ? effectiveTotal : totalAmount) - pointsDiscount) + deliveryFeeAmount, shop?.currency || 'MMK')}</span>
          </div>
          {appliedDiscount > 0 && (
            <p className="text-[10px] text-emerald-500 font-medium text-center mt-1">
              🎉 You saved {formatPrice(appliedDiscount, shop?.currency || 'MMK')}
            </p>
          )}
        </div>

        {/* Points & Rewards */}
        {ptsEnabled && (
          <div className="bg-amber-50 rounded-2xl p-4 mb-4 border border-amber-200">
            <div className="flex items-center gap-1.5 mb-2">
              <Award className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-bold text-amber-700">Points Balance: {customerPoints} pts</span>
            </div>
            {isPointsPayment ? (
              <div className="space-y-1">
                <p className="text-[11px] text-amber-600">
                  <strong>{customerPoints} Points</strong> = {formatPrice(pointsMmkVal, shop?.currency || 'MMK')}
                </p>
                {customerPoints < Number(pointsSettings?.min_redeem || 50) ? (
                  <p className="text-[11px] text-rose-600 font-medium">Minimum {pointsSettings?.min_redeem || 50} points required</p>
                ) : ptsTotal > 0 ? (
                  <p className="text-[11px] text-rose-600 font-medium">Not enough points — need {formatPrice(ptsNeededForFull - (customerPoints || 0))} more pts</p>
                ) : (
                  <p className="text-[11px] text-emerald-600 font-medium">Points cover the full order!</p>
                )}
                <button onClick={() => { setIsPointsPayment(false); setPointsDiscount(0); setPointsToRedeem(0); }}
                  className="text-[11px] text-amber-600 underline mt-1">Cancel points payment</button>
              </div>
            ) : pointsDiscount > 0 ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] text-amber-600 font-medium">Points discount: {formatPrice(pointsDiscount, shop?.currency || 'MMK')}</p>
                  <p className="text-[10px] text-amber-500">{pointsToRedeem} pts used</p>
                </div>
                <button onClick={() => { setPointsDiscount(0); setPointsToRedeem(0); }}
                  className="text-[10px] text-rose-500 underline">Cancel</button>
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="flex gap-1.5">
                  <input type="number" min={Number(pointsSettings?.min_redeem) || 50} max={customerPoints}
                    value={pointsToRedeem || ''}
                    onChange={(e) => setPointsToRedeem(Math.min(Number(e.target.value) || 0, customerPoints))}
                    placeholder={`Min ${pointsSettings?.min_redeem || 50}`}
                    className="flex-1 px-2.5 py-1.5 rounded-lg border border-amber-300 text-xs focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white" />
                  <button onClick={handleRedeemPoints}
                    disabled={redeemingPoints || pointsToRedeem < (Number(pointsSettings?.min_redeem) || 50)}
                    className="px-3 py-1.5 bg-amber-500 text-white rounded-lg text-xs font-semibold hover:bg-amber-600 disabled:opacity-50 transition-all">
                    {redeemingPoints ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Redeem'}
                  </button>
                </div>
                {pointsToRedeem > 0 && pointsToRedeem < (Number(pointsSettings?.min_redeem) || 50) && (
                  <p className="text-[10px] text-rose-600">Minimum {pointsSettings?.min_redeem || 50} points to redeem</p>
                )}
                {customerPoints >= Number(pointsSettings?.min_redeem || 50) && pointsMmkVal >= totalAmount && (
                  <button onClick={() => setIsPointsPayment(true)}
                    className="text-[11px] text-amber-600 underline mt-0.5">Or pay all with points</button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Coupon */}
        <div className="mb-6">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Ticket className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={couponCode}
                onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponError(''); }}
                placeholder="Coupon code"
                disabled={!!couponApplied}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm uppercase font-medium disabled:opacity-50"
              />
            </div>
            {couponApplied ? (
              <button
                onClick={() => { setCouponApplied(null); setCouponCode(''); setCouponError(''); }}
                className="px-4 py-2.5 bg-rose-50 text-rose-600 font-bold rounded-xl hover:bg-rose-100 transition-all text-sm flex items-center gap-1.5"
              >
                <X className="w-4 h-4" /> Remove
              </button>
            ) : (
              <button
                onClick={async () => {
                  if (!couponCode.trim() || !shop?.id) return;
                  setCouponLoading(true);
                  setCouponError('');
                  try {
                    const res = await fetch(API_BASE + '/public/coupon/validate', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ bot_id: shop.id, code: couponCode.trim(), cart_total: totalAmount }),
                    });
                    const data = await res.json().catch(() => null);
                    if (!res.ok) throw new Error(data?.detail || 'Invalid coupon');
                    setCouponApplied(data);
                  } catch (err) {
                    setCouponError(err.message);
                    setCouponApplied(null);
                  } finally {
                    setCouponLoading(false);
                  }
                }}
                disabled={couponLoading || !couponCode.trim()}
                className="px-4 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-40 transition-all text-sm flex items-center gap-1.5"
              >
                {couponLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Apply
              </button>
            )}
          </div>
          {couponError && (
            <p className="text-xs text-rose-500 font-medium mt-1.5 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {couponError}
            </p>
          )}
          {couponApplied && (
            <p className="text-xs text-emerald-600 font-medium mt-1.5 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Coupon applied!
            </p>
          )}
        </div>

        {selectedPayment && (() => {
          if (selectedPayment.id === 'cod') {
            return (
              <div className="bg-emerald-50 rounded-2xl p-5 border border-emerald-100 text-center">
                <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <p className="font-bold text-gray-900">Cash on Delivery</p>
                <p className="text-sm text-gray-600 mt-2 leading-relaxed">
                  Cash on Delivery. Please prepare the amount of <span className="font-bold text-gray-900">{formatPrice((couponApplied ? effectiveTotal : totalAmount) + deliveryFeeAmount, shop?.currency || 'MMK')}</span> for the package
                </p>
              </div>
            );
          }
          const pm = selectedPayment;
          const color = PAYMENT_COLORS[(pm.id || 0) % PAYMENT_COLORS.length];
          return (
            <div className="bg-indigo-50 rounded-2xl p-4 border border-indigo-100 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold flex-shrink-0 shadow-sm"
                  style={{ backgroundColor: color }}>
                  <CreditCard className="w-5 h-5" />
                </div>
                <p className="font-bold text-sm text-gray-900">Pay via {pm.name}</p>
              </div>
              {pm.qr_code_url && (
                <div className="flex flex-col items-center gap-2">
                  <div className="flex justify-center bg-white rounded-xl p-3">
                    <img src={pm.qr_code_url} alt="QR Code" className="w-36 h-36 object-contain rounded-lg"
                      onError={(e) => { e.target.style.display = 'none'; }} />
                  </div>
                  <a href={pm.qr_code_url + (pm.qr_code_url.includes('?') ? '&' : '?') + 'download=payment.jpg'}
                    className="text-xs font-medium text-indigo-600 hover:text-indigo-700 hover:underline transition-colors">
                    Download QR
                  </a>
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
          );
        })()}

        {selectedPayment?.id !== 'cod' && (
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
        )}

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

        {error && <p className="text-rose-500 text-sm mt-3 text-center">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={loading || !agreed1 || !agreed2}
          className="w-full mt-6 flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-base text-white transition-all active:scale-[0.98] disabled:opacity-60"
          style={{ background: THEMES[DEFAULT_THEME].css['--theme-btn'] }}
        >
          {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> Placing Order...</> : `Place Order — ${formatPrice((couponApplied ? effectiveTotal : totalAmount) + deliveryFeeAmount, shop?.currency || 'MMK')}`}
        </button>
      </motion.div>
    </motion.div>
  );
}

function OrderConfirmation({ data, shop, onContinueShopping, viewMode }) {
  const [showInvoice, setShowInvoice] = useState(false);
  const { addToast } = useToastStore();
  const isGuest = viewMode === 'guest';

  const handleCopyId = async (text) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      addToast('Copied order id');
    } catch {
      addToast('Failed to copy', 'error');
    }
  };
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
          <button onClick={() => handleCopyId(data?.order_number)} className="inline-flex ml-1.5 align-middle text-indigo-500 hover:text-indigo-600 transition-colors active:scale-90">
            <Copy className="w-4 h-4" />
          </button>
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

export function PaymentSelect({ paymentMethods, onBack, onNext, codEnabled }) {
  const [selectedId, setSelectedId] = useState(null);
  const hasOptions = paymentMethods.length > 0 || codEnabled;

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

        {!hasOptions ? (
          <div className="text-center py-8">
            <p className="text-gray-400 text-sm">No payment methods available</p>
            <button onClick={onBack}
              className="mt-4 px-6 py-2.5 bg-gray-100 text-gray-600 rounded-xl font-bold text-sm hover:bg-gray-200 transition-all">
              Back to Cart
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {codEnabled && (
              <div
                onClick={() => setSelectedId(selectedId === 'cod' ? null : 'cod')}
                className={`rounded-2xl border-2 cursor-pointer transition-all active:scale-[0.99] p-4 ${
                  selectedId === 'cod' ? 'border-emerald-500 shadow-lg' : 'border-gray-100 hover:border-gray-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                    selectedId === 'cod' ? 'border-emerald-500' : 'border-gray-300'
                  }`}>
                    {selectedId === 'cod' && <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />}
                  </div>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-sm"
                    style={{ backgroundColor: '#10b981' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <p className="font-bold text-gray-900 text-sm">Cash on Delivery</p>
                </div>
              </div>
            )}
            {paymentMethods.map((pm, i) => {
              const isSelected = selectedId === pm.id;
              const color = PAYMENT_COLORS[i % PAYMENT_COLORS.length];
              return (
                <div key={pm.id}
                  onClick={() => setSelectedId(isSelected ? null : pm.id)}
                  className={`rounded-2xl border-2 cursor-pointer transition-all active:scale-[0.99] p-4 ${
                    isSelected ? 'border-indigo-500 shadow-lg' : 'border-gray-100 hover:border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                      isSelected ? 'border-indigo-500' : 'border-gray-300'
                    }`}>
                      {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-indigo-500" />}
                    </div>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-sm"
                      style={{ backgroundColor: color }}>
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <p className="font-bold text-gray-900 text-sm">{pm.name}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {hasOptions && (
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
              Next
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

export function ContactInfoStep({ form, setForm, onBack, onNext, user, viewMode, shop, shopSlug, showZoneFields = true, checkoutFields }) {
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [error, setError] = useState('');

  const fields = checkoutFields || { name: false, phones: false, emails: false, telegram: false, viber: false, zone: false, address: false, notes: false };

  // Clear zone fields when hidden to avoid stale data in order
  useEffect(() => {
    if (!showZoneFields && (form.region || form.district || form.township)) {
      setForm(p => ({ ...p, region: '', district: '', township: '' }));
    }
  }, [showZoneFields]);

  useEffect(() => {
    const tgToken = localStorage.getItem('telegram_token');
    const customerUid = user?.uid
      || (tgToken ? (getUserIdFromToken() || '_') : '');
    if (!customerUid || !shopSlug || profileLoaded || !shop?.id) return;
    fetch(API_BASE + `/api/customer-profile?bot_id=${shop.id}&uid=${encodeURIComponent(customerUid)}&email=${encodeURIComponent(user?.email || '')}`)
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
            region: data.region || '',
            district: data.district || '',
            township: data.township || '',
            address: data.address || '',
            notes: data.notes || '',
          });
        } else {
          setForm(prev => ({ ...prev, name: user?.displayName || '', emails: [user?.email || ''] }));
        }
        setProfileLoaded(true);
      })
      .catch(() => setProfileLoaded(true));
  }, [user?.uid, shop?.id, user?.displayName, user?.email, profileLoaded]);

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
            region: data.region || '',
            district: data.district || '',
            township: data.township || '',
            address: data.address || '',
            notes: data.notes || '',
          });
        }
      }
    } catch {}
    setProfileLoaded(true);
  }, [viewMode, shopSlug, profileLoaded]);

  const setPhone = (idx, val) => setForm(p => { const n = [...p.phones]; n[idx] = val.replace(/\D/g, '').slice(0, 15); return { ...p, phones: n }; });
  const addPhone = () => setForm(p => ({ ...p, phones: [...p.phones, ''] }));
  const removePhone = (idx) => setForm(p => ({ ...p, phones: p.phones.filter((_, i) => i !== idx) }));
  const setEmail = (idx, val) => setForm(p => { const n = [...p.emails]; n[idx] = val; return { ...p, emails: n }; });
  const addEmail = () => setForm(p => ({ ...p, emails: [...p.emails, ''] }));
  const removeEmail = (idx) => setForm(p => ({ ...p, emails: p.emails.filter((_, i) => i !== idx) }));

  const handleNext = () => {
    if (fields.name && !form.name.trim()) { setError('Name is required'); return; }
    if (fields.phones && !form.phones[0]?.trim()) { setError('At least one phone number is required'); return; }
    if (fields.emails && !form.emails[0]?.trim()) { setError('At least one email is required'); return; }
    if (showZoneFields && fields.zone && (!form.region || !form.district || !form.township)) { setError('Please select Region, District and Township'); return; }
    if (fields.address && !form.address.trim()) { setError('Delivery address is required'); return; }
    if (fields.telegram && !form.telegram.trim()) { setError('Telegram username is required'); return; }
    if (fields.viber && !form.viber.trim()) { setError('Viber number is required'); return; }
    if (fields.notes && !form.notes.trim()) { setError('Notes is required'); return; }
    onNext(form);
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
          <h2 className="text-xl font-bold text-gray-900">Contact Information</h2>
          <button onClick={onBack} className="p-2 text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>

        <div className="space-y-3">
          {fields.name && <div>
            <label className="text-xs text-gray-500 font-medium mb-1 block">Full Name *</label>
            <input type="text" value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm" />
          </div>}

          {fields.phones && <div>
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
          </div>}

          {fields.emails && <div>
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
          </div>}

          {fields.telegram && <div>
            <label className="text-xs text-gray-500 font-medium mb-1 block">Telegram Username *</label>
            <input type="text" value={form.telegram} onChange={e => setForm(p => ({...p, telegram: e.target.value}))}
              placeholder="@username"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm" />
          </div>}

          {fields.viber && <div>
            <label className="text-xs text-gray-500 font-medium mb-1 block">Viber Number *</label>
            <input type="tel" value={form.viber} onChange={e => setForm(p => ({...p, viber: e.target.value.replace(/\D/g, '').slice(0, 15)}))}
              placeholder="09xxxxxxxxx"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm" />
          </div>}

          {showZoneFields && fields.zone && (<>
              <div>
                <label className="text-xs text-gray-500 font-medium mb-1 block">Region (တိုင်း/ပြည်နယ်) *</label>
                <SearchableSelect
                  value={form.region}
                  onChange={v => setForm(p => ({ ...p, region: v, district: '', township: '' }))}
                  options={REGION_NAMES}
                  placeholder="Select Region"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium mb-1 block">District (ခရိုင်)</label>
                <SearchableSelect
                  value={form.district}
                  onChange={v => setForm(p => ({ ...p, district: v, township: '' }))}
                  options={getDistricts(form.region)}
                  placeholder="Select District"
                  disabled={!form.region}
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium mb-1 block">Township (မြို့နယ်)</label>
                <SearchableSelect
                  value={form.township}
                  onChange={v => setForm(p => ({ ...p, township: v }))}
                  options={getTownships(form.region, form.district)}
                  placeholder="Select Township"
                  disabled={!form.district}
                />
              </div>
            </>)}

          {fields.address && <div>
            <label className="text-xs text-gray-500 font-medium mb-1 block">Delivery Address *</label>
            <textarea value={form.address} onChange={e => setForm(p => ({...p, address: e.target.value}))} rows={2}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm resize-none" />
          </div>}

          {fields.notes && <div>
            <label className="text-xs text-gray-500 font-medium mb-1 block">Notes *</label>
            <input type="text" value={form.notes} onChange={e => setForm(p => ({...p, notes: e.target.value}))}
              placeholder="Any special requests?"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm" />
          </div>}
        </div>

        {error && <p className="text-rose-500 text-sm mt-3 text-center">{error}</p>}

        <div className="flex gap-3 mt-6">
          <button onClick={onBack}
            className="flex-1 py-3 rounded-2xl font-bold text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 transition-all active:scale-[0.98]">
            Back
          </button>
          <button onClick={handleNext}
            className="flex-1 py-3 rounded-2xl font-bold text-sm text-white shadow-lg transition-all active:scale-[0.98]"
            style={{ background: THEMES[DEFAULT_THEME].css['--theme-btn'] }}
          >
            Next
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function PublicEcommerce({ slug, viaDomain, mode }) {
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
  const [showCart, setShowCart] = useState(false);
  const [showSignIn, setShowSignIn] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [showPaymentSelect, setShowPaymentSelect] = useState(false);
  const [showContactInfo, setShowContactInfo] = useState(false);
  const [contactForm, setContactForm] = useState({ name: '', phones: [''], emails: [''], telegram: '', viber: '', region: '', district: '', township: '', address: '', notes: '' });
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
  const chatQueueRef = useRef([]);
  const chatSendingRef = useRef(false);
  const chatMessagesRef = useRef(chatMessages);
  useEffect(() => { chatMessagesRef.current = chatMessages; }, [chatMessages]);
  const copyTimerRef = useRef(null);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [showVisitorForm, setShowVisitorForm] = useState(false);
  const [visitorForm, setVisitorForm] = useState({ name: '', phone: '', email: '' });
  const [showTrackOrder, setShowTrackOrder] = useState(false);
  const [trackSearch, setTrackSearch] = useState('');
  const [trackResult, setTrackResult] = useState(null);
  const [trackLoading, setTrackLoading] = useState(false);
  const [trackError, setTrackError] = useState('');
  const chatRef = useRef(null);
  const chatInputRef = useRef(null);
  const photoInputRef = useRef(null);
  const visitorIdRef = useRef('');
  const pendingBuyNowRef = useRef(false);
  const [selectedColors, setSelectedColors] = useState({});
  const [linkSelectedOptions, setLinkSelectedOptions] = useState({});
  const [oosMap, setOosMap] = useState({});
  const crossSellScrollRef = useRef(null);
  const crossSellDrag = useRef({ isDragging: false, startX: 0, scrollLeft: 0, moved: false });

  const handleCrossSellMouseDown = useCallback((e) => {
    const el = crossSellScrollRef.current;
    if (!el) return;
    crossSellDrag.current.isDragging = true;
    crossSellDrag.current.startX = e.pageX - el.offsetLeft;
    crossSellDrag.current.scrollLeft = el.scrollLeft;
    crossSellDrag.current.moved = false;
  }, []);

  const handleCrossSellMouseMove = useCallback((e) => {
    if (!crossSellDrag.current.isDragging) return;
    e.preventDefault();
    const el = crossSellScrollRef.current;
    if (!el) return;
    const x = e.pageX - el.offsetLeft;
    const walk = (x - crossSellDrag.current.startX) * 1.5;
    if (Math.abs(walk) > 5) crossSellDrag.current.moved = true;
    el.scrollLeft = crossSellDrag.current.scrollLeft - walk;
  }, []);

  const handleCrossSellMouseUp = useCallback(() => {
    crossSellDrag.current.isDragging = false;
  }, []);

  const [userMode, setUserMode] = useState(null);
  const setViewMode = useCallback((v) => {
    if (mode) return; // locked — cannot switch mode on dedicated pages
    setUserMode(v);
  }, [mode]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: viaDomain ? ['public-ecommerce-by-domain'] : ['public-ecommerce', slug],
    queryFn: viaDomain ? getPublicShopByDomain : () => getPublicShop(slug),
    enabled: viaDomain || !!slug,
    staleTime: 0,
    gcTime: 0,
    retry: 2,
    retryDelay: 1000,
  });

  let viewMode;
  if (mode) {
    viewMode = mode;
  } else if (userMode) {
    viewMode = userMode;
  } else if (data?.mode_order) {
    const modeData = data.mode_order;
    const order = Array.isArray(modeData) ? modeData : (modeData.order || ['telegram', 'ecommerce', 'guest']);
    const enabled = !Array.isArray(modeData) ? (modeData.enabled || {}) : {};
    let filtered = order.filter(k => enabled[k] !== false);
    if (filtered.length === 0) filtered = order;
    viewMode = filtered[0];
  } else {
    viewMode = 'telegram';
  }

  const [sentProducts, setSentProducts] = useState(new Set());
  // Product link mode — show single product instead of full shop
  const [initialProductCode] = useState(() => new URLSearchParams(window.location.search).get('product'));
  const [productLinkActive, setProductLinkActive] = useState(!!initialProductCode);
  const [initialPostCode] = useState(() => new URLSearchParams(window.location.search).get('post'));
  const [fullscreenLogo, setFullscreenLogo] = useState(false);
  const catScrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);

  const updateCatScroll = useCallback(() => {
    const el = catScrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }, []);

  const handleCatMouseDown = useCallback((e) => {
    isDraggingRef.current = true;
    startXRef.current = e.pageX - catScrollRef.current.offsetLeft;
    scrollLeftRef.current = catScrollRef.current.scrollLeft;
    catScrollRef.current.style.cursor = 'grabbing';
  }, []);

  const handleCatMouseMove = useCallback((e) => {
    if (!isDraggingRef.current) return;
    e.preventDefault();
    const x = e.pageX - catScrollRef.current.offsetLeft;
    const walk = (x - startXRef.current) * 1.5;
    catScrollRef.current.scrollLeft = scrollLeftRef.current - walk;
  }, []);

  const handleCatMouseUp = useCallback(() => {
    isDraggingRef.current = false;
    if (catScrollRef.current) catScrollRef.current.style.cursor = 'grab';
    updateCatScroll();
  }, [updateCatScroll]);

  // Auto-open newsfeed when post param is present (from permalink)
  // Wait for shop data so NewsfeedFeed mounts with the correct botId
  useEffect(() => {
    if (initialPostCode && data?.shop?.id) setShowNewsfeed(true);
  }, [initialPostCode, data?.shop?.id]);


  const shop = data?.shop;
  const products = useMemo(() => {
    const all = data?.products || [];
    return all.filter(p => {
      if (viewMode === 'telegram') return p.show_on_telegram !== false;
      if (viewMode === 'ecommerce') return p.show_on_website !== false;
      if (viewMode === 'guest') return p.show_on_guest !== false;
      return true;
    });
  }, [data?.products, viewMode]);
  const productStockMap = useMemo(() => {
    const map = {};
    products.forEach(p => { map[p.id] = p.stock_quantity; });
    return map;
  }, [products]);
  const categories = data?.categories || [];
  const paymentMethods = (data?.payment_methods || []).map(pm => {
    if (pm.qr_code_url && !pm.qr_code_url.startsWith('http')) {
      return { ...pm, qr_code_url: `${API_BASE}/telegram/file/${encodeURIComponent(pm.qr_code_url)}?bot_id=${data?.shop?.id}` };
    }
    return pm;
  });
  const codEnabled = !!(data?.cod_enabled);

  const themeName = data?.theme || DEFAULT_THEME;
  const theme = THEMES[themeName] || THEMES[DEFAULT_THEME];
  const orderButtonLabel = data?.order_button_name || 'Buy Now';

  const productLinkProduct = productLinkActive && initialProductCode
    ? products.find(p => p.link_code === initialProductCode) || null
    : null;

  useAuthTokenFromUrl();

  const cart = useCartState(shop?.id, slug || shop?.public_slug || shop?.bot_username || '', user, viewMode);
  const { items: cartItems, cartCount, totalAmount, loading: cartLoading, addItem, updateQty, removeItem, clearCart, syncPrices } = cart;

  // Only show region/district/township when shop is in zone mode and at least one cart product has delivery fee enabled
  const contactShowZoneFields = data?.delivery_settings?.delivery_fee_mode === 'zone';

  useEffect(() => {
    if (products.length > 0) syncPrices(products);
  }, [products, syncPrices]);

  const crossSellProducts = useMemo(() => {
    if (!cartItems.length || !products.length) return [];
    const cartProductIds = new Set(cartItems.map(i => i.product_id));
    const cartCategoryIds = new Set(
      cartItems.map(i => products.find(p => p.id === i.product_id)?.category_id).filter(Boolean)
    );
    if (!cartCategoryIds.size) return [];
    const suggestions = products.filter(p =>
      p.category_id && cartCategoryIds.has(p.category_id) &&
      !cartProductIds.has(p.id) && p.stock_quantity !== 0
    );
    return suggestions.sort(() => Math.random() - 0.5).slice(0, 5);
  }, [cartItems, products]);

  // Wrap addItem to resolve image URLs before saving
  const addToCart = useCallback((product, colorHex, selectedOptions) => {
    const images = getPublicImageUrls(product.image_url, shop?.id);
    const opts = selectedOptions && typeof selectedOptions === 'object' && Object.keys(selectedOptions).length > 0
      ? selectedOptions : null;
    addItem({
      id: product.id,
      name: product.name,
      price: Number(product.price),
      image_url: images[0] || '',
    }, colorHex || null, opts);
  }, [addItem, shop?.id]);

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

  // Auto-open product from ?product= URL param on page load — handled inline

  const dashboardUrl = viaDomain
    ? `/?p=/${(shop?.public_slug || slug || shop?.bot_username || 'shop')}-user-dashboard`
    : `/${(slug || shop?.public_slug || shop?.bot_username || 'shop')}-user-dashboard`;

  const getProductColors = useCallback((product) => {
    if (product.specifications?.colors && Array.isArray(product.specifications.colors)) {
      return product.specifications.colors;
    }
    return [];
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
    clearCart();
    addItem({
      id: product.id,
      name: product.name,
      price: Number(product.price),
      image_url: (getPublicImageUrls(product.image_url, shop?.id) || [''])[0],
    }, selColor || null);
    if (viewMode === 'guest') {
      setShowCart(false);
      paymentMethods.length > 0 || codEnabled ? setShowPaymentSelect(true) : setShowContactInfo(true);
    } else if (!user && !tgLoggedIn) {
      pendingBuyNowRef.current = true;
      setShowSignIn(true);
    } else {
      setShowCart(false);
      if (registered === true) {
        paymentMethods.length > 0 || codEnabled ? setShowPaymentSelect(true) : setShowContactInfo(true);
      } else {
        setShowRegister(true);
      }
    }
  }, [user, tgLoggedIn, registered, getProductColors, selectedColors, viewMode, paymentMethods.length, codEnabled, shop?.id]);

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
      paymentMethods.length > 0 || codEnabled ? setShowPaymentSelect(true) : setShowContactInfo(true);
    } else {
      setShowRegister(true);
    }
  }, [user, tgLoggedIn, registered, paymentMethods.length, codEnabled]);

  const handleCheckout = useCallback(() => {
    setShowCart(false);
    const goToPayment = () => {
      if (paymentMethods.length > 0 || codEnabled) {
        setShowPaymentSelect(true);
      } else {
        setShowContactInfo(true);
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
  }, [user, tgLoggedIn, registered, viewMode, paymentMethods.length, codEnabled]);

  const handlePaymentNext = useCallback((paymentId) => {
    if (!paymentId) return;
    if (paymentId === 'cod') {
      setSelectedPaymentMethod({ id: 'cod', name: 'Cash on Delivery' });
    } else {
      const pm = paymentMethods.find(p => p.id === paymentId);
      setSelectedPaymentMethod(pm || null);
    }
    setShowPaymentSelect(false);
    setShowContactInfo(true);
  }, [paymentMethods]);

  const handleContactNext = useCallback(() => {
    setShowContactInfo(false);
    setCheckoutOpen(true);
  }, []);

  const handleContactBack = useCallback(() => {
    setShowContactInfo(false);
    setShowPaymentSelect(true);
  }, []);

  const handleOrderPlaced = useCallback((orderData) => {
    setCheckoutOpen(false);
    setOrderPlaced(orderData);
    clearCart();
    setSelectedPaymentMethod(null);
  }, [clearCart]);

  const handleRegisterSuccess = useCallback(() => {
    setRegistered(true);
    setShowRegister(false);
    paymentMethods.length > 0 || codEnabled ? setShowPaymentSelect(true) : setShowContactInfo(true);
  }, [paymentMethods.length, codEnabled]);

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

  const sendMessage = useCallback(async (msg) => {
    if (!msg || !shop?.id) return;
    if (chatSendingRef.current) {
      chatQueueRef.current = [...chatQueueRef.current, { type: 'msg', msg }];
      setChatMessages(prev => [...prev, { role: 'user', content: msg }]);
      return;
    }
    chatSendingRef.current = true;
    setChatLoading(true);
    setChatMessages(prev => [...prev, { role: 'user', content: msg }]);
    try {
      const history = chatMessagesRef.current.slice(-100).map(m => ({ role: m.role, content: m.content }));
      const res = await fetch(API_BASE + '/public/chat/' + shop?.id, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, history, visitor_id: visitorIdRef.current }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.detail || 'Chat failed');
      if (d.ai_unavailable) {
        const noticeKey = 'ai_notice_' + visitorIdRef.current;
        if (!localStorage.getItem(noticeKey)) {
          localStorage.setItem(noticeKey, '1');
          setChatMessages(prev => [...prev, { role: 'assistant', content: 'AI Agent is not available right now. Please leave your message.' }]);
        }
      } else {
        setChatMessages(prev => [...prev, { role: 'assistant', content: d.reply }]);
      }
    } catch {
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }]);
    } finally {
      chatSendingRef.current = false;
      setChatLoading(false);
      setTimeout(() => chatInputRef.current?.focus(), 100);
      if (chatQueueRef.current.length > 0) {
        const next = chatQueueRef.current.shift();
        setTimeout(() => next.type === 'action' ? sendAction(next.msg) : sendMessage(next.msg), 50);
      }
    }
  }, [shop?.id]);

  const sendAction = useCallback(async (actionMsg) => {
    if (!shop?.id) return;
    if (chatSendingRef.current) {
      chatQueueRef.current = [...chatQueueRef.current, { type: 'action', msg: actionMsg }];
      return;
    }
    chatSendingRef.current = true;
    setChatLoading(true);
    try {
      const history = chatMessagesRef.current.slice(-100).map(m => ({ role: m.role, content: m.content }));
      const res = await fetch(API_BASE + '/public/chat/' + shop?.id, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: actionMsg, history, visitor_id: visitorIdRef.current }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.detail || 'Chat failed');
      if (d.ai_unavailable) {
        const noticeKey = 'ai_notice_' + visitorIdRef.current;
        if (!localStorage.getItem(noticeKey)) {
          localStorage.setItem(noticeKey, '1');
          setChatMessages(prev => [...prev, { role: 'assistant', content: 'AI Agent is not available right now. Please leave your message.' }]);
        }
      } else {
        setChatMessages(prev => [...prev, { role: 'assistant', content: d.reply }]);
      }
    } catch {
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }]);
    } finally {
      chatSendingRef.current = false;
      setChatLoading(false);
      setTimeout(() => chatInputRef.current?.focus(), 100);
      if (chatQueueRef.current.length > 0) {
        const next = chatQueueRef.current.shift();
        setTimeout(() => next.type === 'action' ? sendAction(next.msg) : sendMessage(next.msg), 50);
      }
    }
  }, [shop?.id]);

  const handleChatSend = useCallback(() => {
    const msg = chatInput.trim();
    if (!msg) return;
    setChatInput('');
    sendMessage(msg);
  }, [chatInput, sendMessage]);

  const handleAction = useCallback((actionId, value) => {
    sendAction(`__action__${actionId}:${value}`);
  }, [sendAction]);

  const handleFormSubmit = useCallback(async (formId, values, file) => {
    if (file) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('bot_id', shop?.id);
      try {
        const res = await fetch(API_BASE + '/public/upload/photo', { method: 'POST', body: formData });
        if (res.ok) {
          const data = await res.json();
          sendAction(`__form__${formId}:${JSON.stringify({ ...values, file_id: data.file_id })}`);
          return;
        }
      } catch {}
    }
    sendAction(`__form__${formId}:${JSON.stringify(values)}`);
  }, [sendAction, shop?.id]);

  const handleFileUpload = useCallback(async (uploadId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('bot_id', shop?.id);
    try {
      const res = await fetch(API_BASE + '/public/upload/photo', { method: 'POST', body: formData });
      if (res.ok) {
        const data = await res.json();
        sendAction(`__file__${uploadId}:${data.file_id}`);
      }
    } catch {}
  }, [sendAction, shop?.id]);

  const getProductUrl = useCallback((productId) => {
    const product = products.find(p => p.id === Number(productId));
    if (!product?.link_code) return null;
    const base = slug
      ? window.location.origin + '/?p=/' + slug
      : window.location.href.split('?')[0];
    return base + (slug ? '&' : '?') + 'product=' + product.link_code;
  }, [products, slug]);

  function stripComponents(t) { return t.replace(/<!--C[\s\S]*?<!--C-->/g, '').trim(); }

  const copyMsg = useCallback((i) => {
    let txt = chatMessagesRef.current[i]?.content;
    if (txt) {
      txt = stripComponents(txt);
      if (txt) {
        navigator.clipboard.writeText(txt).then(() => {
          setCopiedIndex(i);
          setTimeout(() => setCopiedIndex(null), 1500);
        }).catch(() => {});
      }
    }
  }, []);

  const handleContextMenu = useCallback((e, i) => {
    e.preventDefault();
    e.stopPropagation();
    copyMsg(i);
  }, [copyMsg]);

  const chatBubbles = useMemo(() =>
    chatMessages.map((msg, i) => (
      <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
        <div className={`relative max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed group ${
          msg.role === 'user' ? 'text-white' : 'bg-gray-100 text-gray-800'
        }`} style={msg.role === 'user' ? { background: theme.css['--theme-btn'] } : {}}
          onClick={() => copyMsg(i)}
          onContextMenu={(e) => handleContextMenu(e, i)}
          onTouchStart={() => { copyTimerRef.current = setTimeout(() => copyMsg(i), 500); }}
          onTouchEnd={() => { if (copyTimerRef.current) clearTimeout(copyTimerRef.current); }}
          onTouchMove={() => { if (copyTimerRef.current) clearTimeout(copyTimerRef.current); }}>
          {copiedIndex === i && (
            <span className="absolute -top-2 right-2 text-[9px] font-bold bg-gray-800 text-white px-1.5 py-0.5 rounded-full z-10">Copied!</span>
          )}
          {msg.file_id && msg.file_type === 'photo' && (
            <img src={API_BASE + '/telegram/file/' + msg.file_id + '?bot_id=' + shop?.id}
              alt="Photo" className="max-w-full rounded-lg mb-1 max-h-48 object-cover" loading="lazy" />
          )}
          {msg.content && msg.role === 'assistant' ? (
            <RichMessage content={msg.content} isAssistant={true} botId={shop?.id} getProductUrl={getProductUrl}
              onAction={handleAction} onFormSubmit={handleFormSubmit}
              onFileUpload={handleFileUpload} theme={theme} />
          ) : msg.content ? (
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
          ) : null}
          <span className={`absolute bottom-1 right-2 text-[8px] opacity-0 group-hover:opacity-40 transition-opacity select-none ${msg.role === 'user' ? 'text-white/50' : 'text-gray-400'}`}>
            copy
          </span>
        </div>
      </div>
    )),
    [chatMessages, handleAction, handleFormSubmit, handleFileUpload, handleContextMenu, theme, shop?.id, copyMsg, copiedIndex]
  );

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
    if (tgLoggedIn && telegramUser?.id) {
      // Telegram auth user: use telegram ID as visitor ID, skip form
      const tgVisitorId = 'tg_' + telegramUser.id;
      visitorIdRef.current = tgVisitorId;
      setVisitorForm({ name: telegramUser.name || '', phone: '', email: '' });
      setShowVisitorForm(false);
      // Register as web visitor with telegram_id for admin split
      fetch(API_BASE + '/public/visitor/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitor_id: tgVisitorId, bot_id: shop.id, name: telegramUser.name || '', email: '', telegram_id: telegramUser.id }),
      }).catch(() => {});
      // Load existing chat history
      fetch(API_BASE + '/public/chat/' + shop.id + '/' + tgVisitorId + '/messages')
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
  }, [chatOpen, shop?.id, user, slug, tgLoggedIn, telegramUser]);

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
    if (icon && shop?.profile_picture) {
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
        icon.setAttribute('href', canvas.toDataURL());
      };
      img.onerror = () => icon.setAttribute('href', shop.profile_picture);
      img.src = shop.profile_picture;
    } else if (icon) {
      icon.setAttribute('href', '/vite.svg');
    }
    return () => { document.title = 'E-commerce Myanmar'; };
  }, [shop?.bot_full_name, shop?.profile_picture]);

  // Check stock for cart items when the cart opens
  useEffect(() => {
    if (!showCart || !shop?.id || cartItems.length === 0) { setOosMap({}); return; }
    fetch(API_BASE + '/public/check-stock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bot_id: shop.id, items: cartItems.map(i => ({ product_id: i.product_id, quantity: i.quantity })) }),
    })
      .then(r => r.ok ? r.json() : { items: [] })
      .then(data => {
        const map = {};
        (data.items || []).forEach(i => { if (!i.in_stock) map[i.product_id] = true; });
        setOosMap(map);
      })
      .catch(() => {});
  }, [showCart, shop?.id, cartItems]);

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

  const planBanner = (() => {
    const p = shop?.plan_name?.toLowerCase();
    if (p !== 'free' && p !== 'basic') return null;
    return (
      <a href="https://t.me/tg_ecommerce_official_bot?start=newbot" target="_blank" rel="noopener noreferrer"
        style={{
          display: 'block', background: '#fef3c7', borderBottom: '1px solid #f59e0b',
          padding: '5px 16px', textAlign: 'center', fontSize: '11px',
          color: '#92400e', fontWeight: 500, letterSpacing: '0.01em',
          textDecoration: 'none',
        }}>
        Want this kind of E-commerce? <span style={{textDecoration:'underline', fontWeight:600}}>Get here</span>
      </a>
    );
  })();

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
      {planBanner}
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
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-gray-600 hover:text-indigo-700 transition-all active:scale-95 px-4 py-2.5 -ml-1 rounded-xl bg-white border border-gray-200 shadow-sm hover:bg-indigo-50 hover:border-indigo-200">
              <ChevronLeft className="w-4 h-4" /> Back to all products
            </button>
            {(() => {
              const images = getPublicImageUrls(productLinkProduct.image_url, shop?.id);
              const isOutOfStock = productLinkProduct.stock_quantity !== null && productLinkProduct.stock_quantity === 0;
              const stockLow = productLinkProduct.stock_quantity !== null && productLinkProduct.stock_quantity <= 5 && productLinkProduct.stock_quantity > 0;
              const productColors = productLinkProduct.specifications?.colors && Array.isArray(productLinkProduct.specifications.colors)
                ? productLinkProduct.specifications.colors : [];
              const colorImages = productColors.filter(c => c.file_id).map(c => ({
                file_id: c.file_id, color: c.color,
                url: `${API_BASE}/telegram/file/${encodeURIComponent(c.file_id)}?bot_id=${shop?.id}`,
              }));
              const linkSelectedColor = selectedColors['_link'] || null;
              const linkProductOptions = productLinkProduct.specifications?.options && Array.isArray(productLinkProduct.specifications.options)
                ? productLinkProduct.specifications.options : [];
              const linkImages = linkSelectedColor
                ? [...(colorImages.filter(c => c.color === linkSelectedColor).map(c => c.url)), ...images]
                : images;
              return (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 mt-4 max-w-lg mx-auto">
                  {linkImages.length > 0 && (
                    <div className="aspect-square bg-gray-50 relative">
                      <img src={linkImages[0]} alt={productLinkProduct.name} className="w-full h-full object-contain" />
                    </div>
                  )}
                  <div className="p-5 space-y-4">
                    <div>
                      {colorImages.length > 0 && colorImages.map(c => (
                        <img key={c.color} src={c.url} alt="" className="hidden" aria-hidden="true" />
                      ))}
                      <h2 className="text-xl font-bold text-gray-900">{productLinkProduct.name}</h2>
                      <div className="mt-1">
                        {productLinkProduct.original_price > 0 && <p className="text-sm line-through text-red-400 font-medium">{formatPrice(productLinkProduct.original_price, shop?.currency || 'MMK')}</p>}
                        <p className="text-2xl font-bold text-indigo-600">{formatPrice(productLinkProduct.price, shop?.currency || 'MMK')}</p>
                      </div>
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
                    </div>
                    {productColors.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs text-gray-500 font-medium">Color</p>
                        <div className="flex flex-wrap gap-3">
                          {productColors.map(c => {
                            const isSelected = linkSelectedColor === c.color;
                            return (
                              <button key={c.color}
                                onClick={() => setSelectedColors(prev => ({ ...prev, ['_link']: isSelected ? null : c.color }))}
                                className={`flex flex-col items-center gap-1.5 transition-all active:scale-90 ${
                                  isSelected ? 'scale-110' : 'opacity-70 hover:opacity-100'
                                }`}
                              >
                                <div className={`w-10 h-10 rounded-full border-[3px] transition-all ${
                                  isSelected ? 'border-white ring-2 ring-offset-2 ring-indigo-500 shadow-lg' : 'border-gray-300'
                                }`} style={{ backgroundColor: c.color }} />
                                <span className={`text-[10px] font-bold transition-all ${isSelected ? 'text-indigo-600' : 'text-gray-500'}`}>
                                  {COLOR_NAMES[c.color] || c.color.replace('#', '')}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {linkProductOptions.length > 0 && (
                      <div className="space-y-3">
                        {linkProductOptions.map(opt => (
                          <div key={opt.id}>
                            <p className="text-xs text-gray-500 font-medium mb-2">{opt.name}</p>
                            <div className="flex flex-wrap gap-2">
                              {opt.values.map(v => {
                                const isSelected = linkSelectedOptions[opt.id] === v.id;
                                return (
                                  <button key={v.id}
                                    onClick={() => setLinkSelectedOptions(prev => ({ ...prev, [opt.id]: isSelected ? null : v.id }))}
                                    className={`px-4 py-2 rounded-xl text-sm font-bold transition-all active:scale-95 ${
                                      isSelected
                                        ? 'bg-indigo-600 text-white shadow-md'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                                  >
                                    {v.label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
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
                          if (productColors.length > 0 && !linkSelectedColor) return;
                          if (linkProductOptions.length > 0 && linkProductOptions.some(o => !linkSelectedOptions[o.id])) return;
                          addToCart(productLinkProduct, linkSelectedColor, linkSelectedOptions);
                          if (!user) {
                            setViewMode('ecommerce');
                            pendingBuyNowRef.current = true;
                            setShowSignIn(true);
                          } else {
                            setShowCart(false);
                            if (registered === true) {
                              paymentMethods.length > 0 || codEnabled ? setShowPaymentSelect(true) : setShowContactInfo(true);
                            } else {
                              setShowRegister(true);
                            }
                          }
                        }}
                        disabled={isOutOfStock || (productColors.length > 0 && !linkSelectedColor) || (linkProductOptions.length > 0 && linkProductOptions.some(o => !linkSelectedOptions[o.id]))}
                        className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-all active:scale-[0.98] text-sm"
                      >
                        <ShoppingCart className="w-4 h-4" /> {linkProductOptions.length > 0 && linkProductOptions.some(o => !linkSelectedOptions[o.id]) ? 'Select Options' : productColors.length > 0 && !linkSelectedColor ? 'Select a Color' : 'Buy on Website'}
                      </button>
                      <button
                        onClick={() => {
                          if (productColors.length > 0 && !linkSelectedColor) return;
                          if (linkProductOptions.length > 0 && linkProductOptions.some(o => !linkSelectedOptions[o.id])) return;
                          setViewMode('guest');
                          addToCart(productLinkProduct, linkSelectedColor, linkSelectedOptions);
                          setShowCart(false);
                          paymentMethods.length > 0 || codEnabled ? setShowPaymentSelect(true) : setShowContactInfo(true);
                        }}
                        disabled={isOutOfStock || (productColors.length > 0 && !linkSelectedColor) || (linkProductOptions.length > 0 && linkProductOptions.some(o => !linkSelectedOptions[o.id]))}
                        className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition-all active:scale-[0.98] text-sm"
                      >
                        <User className="w-4 h-4" /> {linkProductOptions.length > 0 && linkProductOptions.some(o => !linkSelectedOptions[o.id]) ? 'Select Options' : 'Buy as a Guest'}
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
            {viewMode === 'guest' && (
              <button onClick={() => { setShowTrackOrder(true); setTrackSearch(''); setTrackResult(null); setTrackError(''); }}
                className="w-[38px] h-[38px] rounded-full flex items-center justify-center bg-white text-gray-500 hover:bg-gray-100 border border-gray-200 shadow-sm transition-all active:scale-90">
                <Map className="w-[15px] h-[15px]" />
              </button>
            )}
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
                          {shop?.public_slug ? (
                            <a href={dashboardUrl} onClick={() => setShowProfileMenu(false)}
                              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer">
                              <User className="w-4 h-4" /> My Dashboard
                            </a>
                          ) : (
                            <div className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-gray-400">
                              <User className="w-4 h-4" /> Loading...
                            </div>
                          )}
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
            {linkifyText(shopBio)}
          </motion.p>
        )}

        {/* View mode toggle — hide when only 1 mode enabled */}
        {!mode && (() => {
          const modeMap = {
            telegram: { key: 'telegram', label: 'Buy on Telegram' },
            ecommerce: { key: 'ecommerce', label: 'Buy on Website' },
            guest: { key: 'guest', label: 'Buy as a Guest' },
          };
          const modeData = data?.mode_order || {};
          const order = Array.isArray(modeData) ? modeData : (modeData.order || ['telegram', 'ecommerce', 'guest']);
          const enabled = !Array.isArray(modeData) ? (modeData.enabled || {}) : {};
          let ordered = order.filter(k => enabled[k] !== false);
          if (ordered.length === 0) ordered = order;
          if (ordered.length <= 1) return null;
          return (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="flex gap-1.5 mb-4">
              {ordered.map(key => modeMap[key]).filter(Boolean).map(opt => (
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
          );
        })()}

        {/* Search */}
        <AnimatePresence>
          {showSearch && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mb-4">
              <form className="bg-white rounded-2xl border border-gray-200 shadow-sm p-1 flex items-center" onSubmit={(e) => { e.preventDefault(); }}>
                <Search className="w-5 h-5 text-gray-400 ml-4 flex-shrink-0" />
                <input type="text" autoFocus value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search products..." className="flex-1 min-w-0 px-3 py-3 bg-transparent outline-none text-sm font-medium" />
                {searchQuery && <button type="button" onClick={() => setSearchQuery('')} className="p-2 text-gray-400 hover:text-gray-600 mr-1 shrink-0"><X className="w-4 h-4" /></button>}
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Categories */}
        {categories.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="relative group mb-6 -mx-4 px-4">
            {/* Left arrow — desktop only, shows on hover */}
            <button
              onClick={() => catScrollRef.current?.scrollBy({ left: -240, behavior: 'smooth' })}
              disabled={!canScrollLeft}
              className="hidden md:flex absolute left-6 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white/90 shadow-md border border-gray-200 items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white disabled:opacity-0"
            >
              <ChevronLeft className="w-4 h-4 text-gray-600" />
            </button>

            <div ref={catScrollRef}
              onScroll={updateCatScroll}
              onMouseDown={handleCatMouseDown}
              onMouseMove={handleCatMouseMove}
              onMouseUp={handleCatMouseUp}
              onMouseLeave={handleCatMouseUp}
              className="overflow-x-auto scrollbar-hide cursor-grab active:cursor-grabbing select-none"
            >
              <div className="flex gap-2 min-w-max pb-2 px-4">
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
            </div>

            {/* Right arrow — desktop only, shows on hover */}
            <button
              onClick={() => catScrollRef.current?.scrollBy({ left: 240, behavior: 'smooth' })}
              disabled={!canScrollRight}
              className="hidden md:flex absolute right-6 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white/90 shadow-md border border-gray-200 items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white disabled:opacity-0"
            >
              <ChevronRight className="w-4 h-4 text-gray-600" />
            </button>
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
              const atStockMax = product.stock_quantity !== null && inCartQty >= product.stock_quantity;

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
                    <div className="mb-1">
                      {product.original_price > 0 && <p className="text-[10px] line-through text-red-400 font-medium">{formatPrice(product.original_price, shop?.currency || 'MMK')}</p>}
                      <p className="font-bold theme-price text-sm md:text-base">{formatPrice(product.price, shop?.currency || 'MMK')}</p>
                    </div>

                    {viewMode !== 'telegram' && (() => {
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
                            className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl font-bold text-sm whitespace-nowrap transition-all active:scale-[0.97] theme-btn">
                            <ShoppingCart className="w-4 h-4" />
                            {orderButtonLabel}
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
                            disabled={atStockMax}
                            className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-100 active:scale-90 transition-all disabled:opacity-40">
                            <Plus className="w-3 h-3 text-gray-600" />
                          </button>
                        </div>
                      ) : (
                        <button onClick={(e) => {
                          e.stopPropagation();
                          const colors = getProductColors(product);
                          const hasOptions = product.specifications?.options?.length > 0;
                          if (hasOptions) { setSelectedProduct(product); return; }
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
                          <button onClick={(e) => { e.stopPropagation(); const hasOptions = product.specifications?.options?.length > 0; if (hasOptions) { setSelectedProduct(product); return; } handleBuyNow(product); }}
                            disabled={getProductColors(product).length > 0 && !selectedColors[product.id]}
                            className={`flex-1 px-3 py-2 rounded-xl font-bold text-xs whitespace-nowrap transition-all active:scale-[0.97] ${
                              getProductColors(product).length > 0 && !selectedColors[product.id] ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'theme-btn shadow-sm'
                            }`}>
                            {orderButtonLabel}
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
            orderButtonLabel={orderButtonLabel}
            totalCartCount={cartCount}
            onOpenCart={() => setShowCart(true)}
            onUpdateQty={updateQty}
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
                  <>
                  {cartItems.map(item => {
                    const isOOS = oosMap[item.product_id];
                    return (
                    <div key={item.product_id} className={`flex items-center gap-3 bg-gray-50 rounded-2xl p-3 ${isOOS ? 'opacity-50' : ''}`}>
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.name} className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-16 h-16 rounded-xl bg-gray-200 flex items-center justify-center flex-shrink-0">
                          <Package className="w-6 h-6 text-gray-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900 truncate">{item.name}</p>
                        <p className="text-xs text-gray-500">{formatPrice(item.price, shop?.currency || 'MMK')} each</p>
                        {isOOS && (
                          <p className="text-[10px] font-bold text-rose-500 mt-1">Out of stock</p>
                        )}
                        <div className="flex items-center gap-2 mt-1.5">
                          <button onClick={() => updateQty(item.product_id, -1)}
                            className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-100 active:scale-90 transition-all">
                            <Minus className="w-3 h-3 text-gray-600" />
                          </button>
                          <span className="text-sm font-bold text-gray-900 min-w-[20px] text-center">{item.quantity}</span>
                          <button onClick={() => updateQty(item.product_id, 1)}
                            disabled={productStockMap[item.product_id] !== null && productStockMap[item.product_id] !== undefined && item.quantity >= productStockMap[item.product_id]}
                            className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-100 active:scale-90 transition-all disabled:opacity-40">
                            <Plus className="w-3 h-3 text-gray-600" />
                          </button>
                          <button onClick={() => removeItem(item.product_id)}
                            className="ml-auto p-1.5 text-gray-400 hover:text-rose-500 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                    );
                  })}

                  {crossSellProducts.length > 0 && (
                    <div className="pt-2">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-bold text-gray-700">You May Also Like</h4>
                      </div>
                      <div ref={crossSellScrollRef}
                        onMouseDown={handleCrossSellMouseDown}
                        onMouseMove={handleCrossSellMouseMove}
                        onMouseUp={handleCrossSellMouseUp}
                        onMouseLeave={handleCrossSellMouseUp}
                        className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-1 cursor-grab active:cursor-grabbing select-none"
                        style={{ scrollbarWidth: 'none' }}>
                        {crossSellProducts.map(p => (
                          <div key={p.id} className="flex-shrink-0 w-28 bg-white rounded-xl border border-gray-100 overflow-hidden">
                            <div className="w-full aspect-square bg-gray-50 flex items-center justify-center overflow-hidden">
                              {(() => {
                                const img = getPublicImageUrls(p.image_url, shop?.id);
                                const src = img[0];
                                return src ? (
                                  <img src={src} alt={p.name} className="w-full h-full object-cover" />
                                ) : (
                                  <Package className="w-6 h-6 text-gray-300" />
                                );
                              })()}
                            </div>
                            <div className="p-1.5">
                              <p className="text-[11px] font-bold text-gray-900 truncate">{p.name}</p>
                              <div className="flex items-center justify-between mt-1">
                                <span className="text-[10px] font-bold" style={{ color: theme.css['--theme-btn'] }}>{formatPrice(p.price)}</span>
                                <button
                                  onClick={() => { if (crossSellDrag.current.moved) return; addToCart(p, null, null); }}
                                  className="w-6 h-6 rounded-lg flex items-center justify-center active:scale-90 transition-all"
                                  style={{ background: theme.css['--theme-btn'], color: '#fff' }}
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  </>
                )}
              </div>

              {cartItems.length > 0 && (
                <div className="border-t border-gray-100 p-4 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Subtotal</span>
                    <span className="font-bold text-gray-900">{formatPrice(totalAmount, shop?.currency || 'MMK')}</span>
                  </div>
                  <button
                    onClick={handleCheckout}
                    disabled={Object.keys(oosMap).length > 0}
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-sm text-white transition-all active:scale-[0.98] shadow-lg disabled:opacity-50"
                    style={{ background: theme.css['--theme-btn'] }}
                  >
                    {Object.keys(oosMap).length > 0 ? 'Remove out of stock items first' : 'Proceed to Checkout'} <ChevronRight className="w-4 h-4" />
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
            codEnabled={codEnabled}
          />
        )}
      </AnimatePresence>

      {/* Contact Information Modal */}
      <AnimatePresence>
        {showContactInfo && (
          <ContactInfoStep
            form={contactForm}
            setForm={setContactForm}
            onBack={handleContactBack}
            onNext={handleContactNext}
            user={user}
            viewMode={viewMode}
            shop={shop}
            shopSlug={slug || shop?.public_slug || shop?.bot_username || ''}
            showZoneFields={contactShowZoneFields}
            checkoutFields={data?.checkout_fields}
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
            shopSlug={slug || shop?.public_slug || shop?.bot_username || ''}
            selectedPayment={selectedPaymentMethod}
            products={products}
            deliverySettings={data?.delivery_settings || {}}
            deliveryFees={data?.delivery_fees || []}
            contactForm={contactForm}
            checkoutFields={data?.checkout_fields}
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
            className={`fixed bottom-24 right-6 w-14 h-14 rounded-full shadow-xl flex items-center justify-center active:scale-90 hover:scale-105 ${selectedProduct ? 'z-[70]' : 'z-40'}`}
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
                  {chatBubbles}
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
                  />
                  <button
                    onClick={handleChatSend}
                    disabled={!chatInput.trim()}
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
          userName={user?.displayName || telegramUser?.name || null}
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

      {/* Track Order Modal */}
      <AnimatePresence>
        {showTrackOrder && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowTrackOrder(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 z-[60] bg-white rounded-t-[24px] md:rounded-3xl shadow-2xl md:w-[480px] max-h-[90dvh] md:max-h-[85vh] flex flex-col overflow-hidden"
            >
              <div className="sticky top-0 bg-white z-10 rounded-t-[24px] md:rounded-t-3xl">
                <div className="flex flex-col items-center pt-3 pb-0.5 md:hidden">
                  <div className="w-10 h-1 bg-gray-200 rounded-full" />
                </div>
                <div className="flex items-center justify-between px-4 pb-3 pt-1 md:py-4">
                  <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <Map className="w-5 h-5" style={{ color: theme.css['--theme-btn'] }} />
                    Track Order
                  </h2>
                  <button onClick={() => setShowTrackOrder(false)} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
                    <X className="w-5 h-5 text-gray-400" />
                  </button>
                </div>
              </div>

              <div className="p-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={trackSearch}
                    onChange={(e) => setTrackSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && trackSearch.trim()) {
                        setTrackLoading(true);
                        setTrackResult(null);
                        setTrackError('');
                        trackOrder(trackSearch.trim(), shop?.id)
                          .then(res => { setTrackResult(res); setTrackLoading(false); })
                          .catch(err => {
                            setTrackError(err?.response?.data?.detail || 'Order not found');
                            setTrackLoading(false);
                          });
                      }
                    }}
                    placeholder="Search by Order ID, Invoice No, or Receipt No..."
                    className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  />
                  <button
                    onClick={() => {
                      if (!trackSearch.trim()) return;
                      setTrackLoading(true);
                      setTrackResult(null);
                      setTrackError('');
                      trackOrder(trackSearch.trim(), shop?.id)
                        .then(res => { setTrackResult(res); setTrackLoading(false); })
                        .catch(err => {
                          setTrackError(err?.response?.data?.detail || 'Order not found');
                          setTrackLoading(false);
                        });
                    }}
                    disabled={trackLoading || !trackSearch.trim()}
                    className="px-5 py-3 rounded-2xl font-bold text-white text-sm transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2 whitespace-nowrap"
                    style={{ background: theme.css['--theme-btn'] }}
                  >
                    {trackLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    {trackLoading ? 'Searching...' : 'Search'}
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-4 pb-4">
                {trackLoading && (
                  <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <Loader2 className="w-8 h-8 animate-spin" style={{ color: theme.css['--theme-btn'] }} />
                    <p className="text-sm text-gray-500 font-medium">Searching for your order...</p>
                  </div>
                )}

                {trackError && !trackLoading && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center justify-center py-16 gap-3"
                  >
                    <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
                      <X className="w-7 h-7 text-red-400" />
                    </div>
                    <p className="text-sm font-bold text-gray-900">Order Not Found</p>
                    <p className="text-xs text-gray-500 text-center max-w-xs">
                      No order matches your search. Please check your Order ID, Invoice Number, or Receipt Number and try again.
                    </p>
                  </motion.div>
                )}

                {trackResult && !trackLoading && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: 'spring', damping: 20, stiffness: 250 }}
                    className="space-y-3"
                  >
                    {/* Status Card */}
                    <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 text-center">
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', damping: 12, stiffness: 200, delay: 0.1 }}
                        className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3"
                        style={{ background: STATUS_COLORS[trackResult.status]?.bg || '#F3F4F6' }}
                      >
                        {STATUS_COLORS[trackResult.status]?.icon || '📦'}
                      </motion.div>
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="text-xl font-bold capitalize"
                        style={{ color: STATUS_COLORS[trackResult.status]?.text || '#374151' }}
                      >
                        {trackResult.status === 'pending_review' ? 'Pending Review' : trackResult.status}
                      </motion.p>
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="text-xs text-gray-400 mt-1"
                      >
                        Current Status
                      </motion.p>
                    </div>

                    {/* Order Details */}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.25 }}
                      className="bg-white rounded-2xl border border-gray-100 p-4 space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Order Number</span>
                        <span className="text-sm font-bold text-gray-900">{trackResult.order_number}</span>
                      </div>
                      {trackResult.invoice_number && (
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Invoice No.</span>
                          <span className="text-sm font-medium text-gray-700">{trackResult.invoice_number}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Amount</span>
                        <span className="text-sm font-bold text-gray-900">{formatPrice(trackResult.final_amount, shop?.currency || 'MMK')}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Payment</span>
                        <span className="text-sm font-medium text-gray-700 capitalize">{trackResult.payment_method}</span>
                      </div>
                      {trackResult.created_at && (
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Date</span>
                          <span className="text-sm font-medium text-gray-700">{trackResult.created_at?.split('T')[0]}</span>
                        </div>
                      )}
                      {trackResult.customer_name && (
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Customer</span>
                          <span className="text-sm font-medium text-gray-700">{trackResult.customer_name}</span>
                        </div>
                      )}
                    </motion.div>

                    {/* Items */}
                    {trackResult.items?.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.35 }}
                        className="bg-white rounded-2xl border border-gray-100 p-4 space-y-2"
                      >
                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Items</p>
                        {trackResult.items.map((item, i) => (
                          <div key={i} className="flex items-center justify-between text-sm">
                            <span className="text-gray-700 truncate max-w-[250px]">{item.name}</span>
                            <span className="font-bold text-gray-900 ml-2">x{item.quantity}</span>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </motion.div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

const STATUS_COLORS = {
  pending: { bg: '#FEF3C7', text: '#D97706', icon: '⏳' },
  pending_review: { bg: '#FEF3C7', text: '#D97706', icon: '📋' },
  confirmed: { bg: '#DBEAFE', text: '#2563EB', icon: '✅' },
  processing: { bg: '#E0F2FE', text: '#0284C7', icon: '⚙️' },
  shipped: { bg: '#F3E8FF', text: '#7C3AED', icon: '🚚' },
  delivered: { bg: '#D1FAE5', text: '#059669', icon: '📦' },
  cancelled: { bg: '#FEE2E2', text: '#DC2626', icon: '❌' },
  rejected: { bg: '#FEE2E2', text: '#DC2626', icon: '❌' },
  payment_failed: { bg: '#FEE2E2', text: '#DC2626', icon: '💳' },
};
