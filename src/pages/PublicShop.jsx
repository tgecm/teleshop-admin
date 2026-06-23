import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getPublicShop, getPublicShopByDomain } from '../api/public';
import {
  ShoppingBag, Package, AlertCircle, ShoppingCart, ChevronRight,
  Tag, Sparkles, TrendingUp, Clock, Star, Search, X, ChevronLeft,
  MessageCircle, Send, ImageUp, Loader2, ArrowUpDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { THEMES, DEFAULT_THEME } from '../themes/themes';

import { API_BASE } from '../api/config';
import { RichMessage } from '../components/chat/RichMessage';

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
  } catch (e) {}

  const clean = image_url.startsWith('[') ? JSON.parse(image_url) : image_url;
  if (Array.isArray(clean)) {
    return clean.map(f => `${API_BASE}/telegram/file/${encodeURIComponent(f.file_id || f)}?bot_id=${bot_id}`);
  }
  return [`${API_BASE}/telegram/file/${encodeURIComponent(image_url)}?bot_id=${bot_id}`];
}

function formatPrice(price) {
  return Number(price).toLocaleString();
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

function ProductDetailModal({ product, shop, onClose, onBuyNow, isSent }) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const touchStartX = useRef(null);
  const images = getPublicImageUrls(product.image_url, shop?.id);

  const isOutOfStock = product.stock_quantity !== null && product.stock_quantity === 0;
  const getBuyLink = (prod, username) =>
    `https://t.me/${username}?start=${prod.link_token}`;

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const diff = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(diff) > 50) {
      if (diff > 0 && currentImageIndex > 0) {
        setCurrentImageIndex(i => i - 1);
      } else if (diff < 0 && currentImageIndex < images.length - 1) {
        setCurrentImageIndex(i => i + 1);
      }
    }
    touchStartX.current = null;
  };

  const prevImage = useCallback(() => {
    if (currentImageIndex > 0) setCurrentImageIndex(i => i - 1);
  }, [currentImageIndex]);
  const nextImage = useCallback(() => {
    if (currentImageIndex < images.length - 1) setCurrentImageIndex(i => i + 1);
  }, [currentImageIndex, images.length]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') prevImage();
      if (e.key === 'ArrowRight') nextImage();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, prevImage, nextImage]);

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />

      <motion.div
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="relative bg-white w-full max-w-lg md:rounded-[32px] md:mx-4 max-h-[92svh] overflow-y-auto rounded-t-[32px] shadow-2xl"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2.5 bg-white/90 backdrop-blur-md rounded-full shadow-lg hover:bg-white active:scale-90 transition-all"
        >
          <X className="w-5 h-5 text-gray-700" />
        </button>

        <div
          className="relative aspect-square bg-gray-100 overflow-hidden"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <AnimatePresence mode="wait">
            <motion.img
              key={currentImageIndex}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.2 }}
              src={images[currentImageIndex] || '/placeholder.svg'}
              alt={product.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          </AnimatePresence>

          {images.length > 1 && (
            <>
              {currentImageIndex > 0 && (
                <button
                  onClick={prevImage}
                  className="absolute left-3 top-1/2 -translate-y-1/2 p-2.5 bg-white/90 backdrop-blur-md rounded-full shadow-lg hover:bg-white active:scale-90 transition-all"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-700" />
                </button>
              )}
              {currentImageIndex < images.length - 1 && (
                <button
                  onClick={nextImage}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 bg-white/90 backdrop-blur-md rounded-full shadow-lg hover:bg-white active:scale-90 transition-all"
                >
                  <ChevronRight className="w-5 h-5 text-gray-700" />
                </button>
              )}

              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                {images.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentImageIndex(i)}
                    className={`w-2 h-2 rounded-full transition-all ${
                      i === currentImageIndex
                        ? 'bg-white w-6 shadow-md'
                        : 'bg-white/50 hover:bg-white/70'
                    }`}
                  />
                ))}
              </div>

              <div className="absolute top-4 left-4 px-3 py-1.5 bg-black/40 backdrop-blur-md rounded-full">
                <span className="text-white text-xs font-bold">
                  {currentImageIndex + 1}/{images.length}
                </span>
              </div>
            </>
          )}

          {!images.length && (
            <div className="w-full h-full flex items-center justify-center text-gray-300">
              <Package className="w-20 h-20" />
            </div>
          )}

          <div className="absolute bottom-4 right-4">
            <span className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider backdrop-blur-sm shadow-sm ${
              isOutOfStock ? 'bg-rose-500/90 text-white' :
              product.stock_quantity !== null && product.stock_quantity <= 5
                ? 'bg-amber-500/90 text-white'
                : 'bg-emerald-500/90 text-white'
            }`}>
              {isOutOfStock ? 'Out of Stock' :
               product.stock_quantity !== null && product.stock_quantity <= 5
                 ? `${product.stock_quantity} left`
                 : 'In Stock'}
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
            <div className="bg-gray-50 rounded-2xl p-4 mb-6 border border-gray-100">
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{product.description}</p>
            </div>
          )}

          <a
            href={getBuyLink(product, shop?.bot_username)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              if (isOutOfStock) { e.preventDefault(); return; }
              onBuyNow?.(e, getBuyLink(product, shop?.bot_username), product.id);
            }}
            className={`w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-bold text-base transition-all ${
              isOutOfStock
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed pointer-events-none no-underline'
                : 'theme-btn hover:shadow-xl active:scale-[0.98] shadow-lg'
            }`}
          >
            <ShoppingCart className="w-5 h-5" />
            {isOutOfStock ? 'Currently Unavailable' : isSent ? (
              <span className="text-xs leading-tight">Product sent in Telegram. Check it!</span>
            ) : 'Buy Now on Telegram'}
          </a>

          <p className="text-xs text-gray-400 text-center mt-3">
            You'll be redirected to Telegram to complete your purchase
          </p>
        </div>
      </motion.div>
    </div>
  );
}

function ShopClosed({ shop, theme }) {
  const t = theme?.css || THEMES[DEFAULT_THEME].css;
  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: t['--theme-primary-light'] }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', damping: 20, stiffness: 200 }}
        className="bg-white rounded-[40px] p-10 max-w-md w-full text-center relative overflow-hidden"
        style={{ boxShadow: `0 20px 25px -5px ${t['--theme-primary-shadow']}, 0 10px 10px -5px ${t['--theme-primary-shadow']}` }}
      >
        <div className="absolute -top-20 -right-20 w-48 h-48 bg-gradient-to-br from-rose-50 to-rose-100 rounded-full opacity-60" />
        <div className="absolute -bottom-16 -left-16 w-40 h-40 bg-gradient-to-br from-amber-50 to-amber-100 rounded-full opacity-60" />

        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', damping: 15, stiffness: 250, delay: 0.15 }}
          className="relative z-10"
        >
          <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-rose-100 to-rose-200 rounded-[28px] flex items-center justify-center shadow-lg shadow-rose-100/50">
            <motion.div
              animate={{ rotate: [0, -10, 10, -10, 0] }}
              transition={{ duration: 0.6, delay: 0.5 }}
            >
              <Clock className="w-12 h-12 text-rose-500" />
            </motion.div>
          </div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2"
        >
          {shop?.bot_full_name || 'Shop'}
        </motion.p>

        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="text-2xl font-bold text-gray-900 mb-3"
        >
          Shop is Currently Closed
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-gray-500 text-sm leading-relaxed mb-8"
        >
          The shop owner has closed the store for now. Please check back later or contact us on Telegram for more information.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <a
            href={`https://t.me/${shop?.bot_username}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-8 py-3.5 theme-btn font-bold rounded-2xl hover:shadow-xl active:scale-[0.98] transition-all shadow-lg"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
            </svg>
            Contact on Telegram
          </a>
        </motion.div>

        <motion.div
          animate={{
            scale: [1, 1.05, 1],
            opacity: [0.5, 0.8, 0.5],
          }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute bottom-6 left-1/2 -translate-x-1/2 w-16 h-1 bg-rose-200/50 rounded-full"
        />
      </motion.div>
    </div>
  );
}

export default function PublicShop({ slug, viaDomain }) {
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [sortBy, setSortBy] = useState('default');
  const [isTelegramWA, setIsTelegramWA] = useState(false);
  const [sentProductIds, setSentProductIds] = useState(new Set());
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([
    { role: 'assistant', content: 'Hi! How can I help you today?', file_id: null, file_type: null }
  ]);
  const [chatLoading, setChatLoading] = useState(false);
  const chatRef = useRef(null);
  const chatInputRef = useRef(null);
  const photoInputRef = useRef(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showVisitorForm, setShowVisitorForm] = useState(false);
  const [visitorForm, setVisitorForm] = useState({ name: '', phone: '', email: '' });
  const visitorIdRef = useRef('');

  function generateVisitorId() {
    return 'v' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: viaDomain ? ['public-shop-by-domain'] : ['public-shop', slug],
    queryFn: viaDomain ? getPublicShopByDomain : () => getPublicShop(slug),
    enabled: viaDomain || !!slug,
    retry: 2,
    retryDelay: 1000,
  });

  const shop = data?.shop;
  const products = data?.products || [];
  const categories = data?.categories || [];
  const themeName = data?.theme || DEFAULT_THEME;
  const theme = THEMES[themeName] || THEMES[DEFAULT_THEME];

  const getProductUrl = useCallback((productId) => {
    const product = products.find(p => p.id === Number(productId));
    if (!product?.link_code) return null;
    const base = slug
      ? window.location.origin + '/?p=/' + slug
      : window.location.href.split('?')[0];
    return base + (slug ? '&' : '?') + 'product=' + product.link_code;
  }, [products, slug]);

  const handleVisitorPhoto = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file || !shop?.id) return;
    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('bot_id', shop.id);
      const res = await fetch(API_BASE + '/public/upload/photo', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      const history = chatMessages.slice(-100).map(m => ({ role: m.role, content: m.content }));
      setChatMessages(prev => [...prev, { role: 'user', content: '', file_id: data.file_id, file_type: 'photo' }]);
      const msgRes = await fetch(API_BASE + '/public/chat/' + shop.id, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: '', history,
          visitor_id: visitorIdRef.current,
          file_id: data.file_id,
          file_type: 'photo',
        }),
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
      const res = await fetch(`${API_BASE}/public/chat/${shop?.id}`, {
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
        setChatMessages(prev => [...prev, { role: 'assistant', content: d.reply, file_id: null, file_type: null }]);
      }
    } catch {
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }]);
    } finally {
      setChatLoading(false);
      setTimeout(() => chatInputRef.current?.focus(), 100);
    }
  }, [chatInput, chatLoading, shop?.id, chatMessages]);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [chatMessages, chatLoading]);

  // Auto-focus chat input when chat opens or after form dismissed
  useEffect(() => {
    if (chatOpen && !showVisitorForm) {
      setTimeout(() => chatInputRef.current?.focus(), 200);
    }
  }, [chatOpen, showVisitorForm]);

  // Live polling for new messages from admin
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

  useEffect(() => {
    if (!chatOpen || !shop?.id || visitorIdRef.current) return;
    const key = 'visitor_' + (shop.bot_username || slug || 'domain');
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const info = JSON.parse(saved);
        visitorIdRef.current = info.id;
        setVisitorForm({ name: info.name || '', phone: info.phone || '', email: info.email || '' });
        // Load chat history
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
  }, [chatOpen, shop?.id]);

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

  useEffect(() => {
    document.title = shop?.bot_full_name || 'E-commerce Myanmar';
    const icon = document.querySelector('link[rel="icon"]');
    if (icon && shop?.profile_picture) {
      icon.setAttribute('href', shop.profile_picture);
    } else if (icon) {
      icon.setAttribute('href', '/vite.svg');
    }
    return () => { document.title = 'E-commerce Myanmar'; };
  }, [shop?.bot_full_name, shop?.profile_picture]);

  useEffect(() => {
    const id = 'shop-theme-styles';
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

  const getBuyLink = (product, botUsername) => {
    const token = product.link_token;
    return `https://t.me/${botUsername}?start=${token}`;
  };

  const handleBuyNow = useCallback((e, href, productId) => {
    e.preventDefault();
    if (sentProductIds.has(productId)) return; // already sent, no action
    setSentProductIds(prev => new Set([...prev, productId]));
    // Navigate — use openTelegramLink in Mini App, window.open in browser
    if (isTelegramWA && window.Telegram?.WebApp?.openTelegramLink) {
      window.Telegram.WebApp.openTelegramLink(href);
    } else {
      window.open(href, '_blank', 'noopener');
    }
  }, [isTelegramWA, sentProductIds]);

  // Detect Telegram Mini App — initData is only populated in real Mini App
  useEffect(() => {
    const check = () => {
      if (window.Telegram?.WebApp?.initData) {
        setIsTelegramWA(true);
        try { window.Telegram.WebApp.ready(); } catch {}
      }
    };
    check();
  }, []);

  const categoryMap = {};
  categories.forEach(c => { categoryMap[c.id] = c.name; });

  const filteredProducts = products.filter(p => {
    if (selectedCategory && p.category_id !== selectedCategory) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchName = p.name?.toLowerCase().includes(q);
      const matchDesc = p.description?.toLowerCase().includes(q);
      if (!matchName && !matchDesc) return false;
    }
    return true;
  });

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (sortBy === 'price_asc') return a.price - b.price;
    if (sortBy === 'price_desc') return b.price - a.price;
    return 0;
  });

  const cycleSort = () => {
    const modes = ['default', 'price_asc', 'price_desc'];
    const idx = modes.indexOf(sortBy);
    setSortBy(modes[(idx + 1) % modes.length]);
  };

  const getInitials = (name) => {
    return (name || 'S').charAt(0).toUpperCase();
  };

  if (isLoading) return <LoadingSkeleton />;

  if (error || !shop) {
    const isNotFound = error?.response?.status === 404;
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: theme.css['--theme-primary-light'] }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center"
        >
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg ${isNotFound ? 'bg-gradient-to-br from-red-50 to-red-100' : 'bg-gradient-to-br from-amber-50 to-amber-100'}`}>
            <AlertCircle className={`w-10 h-10 ${isNotFound ? 'text-red-400' : 'text-amber-400'}`} />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            {isNotFound ? 'Shop Not Found' : 'Something Went Wrong'}
          </h2>
          <p className="text-gray-500 text-sm mb-6">
            {isNotFound
              ? "This shop doesn't exist or is currently unavailable."
              : 'The shop could not be loaded due to a network error. Please try again.'}
          </p>
          <div className="flex flex-col gap-3">
            {!isNotFound && (
              <button
                onClick={() => refetch()}
                className="w-full px-6 py-3 theme-btn font-bold rounded-2xl hover:shadow-xl transition-all"
              >
                Try Again
              </button>
            )}
            <a
              href="https://t.me/tg_ecommerce_official_bot"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 font-bold rounded-2xl hover:bg-gray-200 transition-all"
            >
              Contact Support
              <ChevronRight className="w-4 h-4" />
            </a>
          </div>
        </motion.div>
      </div>
    );
  }

  if (data?.is_open === false) {
    return <ShopClosed shop={shop} theme={theme} />;
  }

  return (
    <div className="min-h-screen" style={{
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
      <div className="relative" style={{ background: theme.css['--theme-header'] }}>
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/5 rounded-full" />
        <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-white/5 rounded-full" />
        <div className="absolute top-1/2 left-1/3 w-32 h-32 bg-white/5 rounded-full" />

        <div className="max-w-7xl mx-auto px-4 pt-12 pb-20 relative">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-4"
          >
            <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-xl border border-white/30 overflow-hidden">
              {shop?.profile_picture ? (
                <img src={shop.profile_picture} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <span className="text-white font-bold text-2xl">{getInitials(shop.bot_full_name)}</span>
              )}
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white drop-shadow-sm">
                {shop.bot_full_name}
              </h1>
              <div className="flex items-center gap-3 mt-1.5">
                <span className="flex items-center gap-1.5 text-white/80 text-sm">
                  <Package className="w-4 h-4" />
                  {products.length} product{products.length !== 1 ? 's' : ''}
                </span>
                {categories.length > 0 && (
                  <span className="flex items-center gap-1.5 text-white/80 text-sm">
                    <Tag className="w-4 h-4" />
                    {categories.length} categor{categories.length !== 1 ? 'ies' : 'y'}
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        </div>

        <div className="absolute -bottom-1 left-0 right-0 h-8 rounded-t-[32px]" style={{ backgroundColor: theme.css['--theme-bg'] }} />
      </div>

      <div className="max-w-7xl mx-auto px-4 -mt-10 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-3xl p-5 md:p-6 mb-6 flex items-center justify-between"
          style={{ boxShadow: `0 20px 25px -5px ${theme.css['--theme-primary-shadow']}, 0 10px 10px -5px ${theme.css['--theme-primary-shadow']}` }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-200">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium">Bestselling</p>
              <p className="text-sm font-bold text-gray-900">Shop & Save Today</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowSearch(!showSearch)}
              className={`w-[38px] h-[38px] rounded-full flex items-center justify-center transition-all ${
                showSearch
                  ? 'theme-filter-active'
                  : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
              }`}
            >
              {showSearch ? <X className="w-4 h-4" /> : <Search className="w-4 h-4" />}
            </button>
            <button
              onClick={cycleSort}
              className={`w-[38px] h-[38px] rounded-full flex items-center justify-center transition-all ${
                sortBy !== 'default'
                  ? 'theme-filter-active'
                  : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
              }`}
            >
              <ArrowUpDown className="w-4 h-4" />
            </button>
          </div>
        </motion.div>

        {/* Switch to E-commerce banner */}
        <motion.a
          href={slug ? `/${slug}-ecommerce` : viaDomain ? '/ecommerce' : undefined}
          target="_self"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="block mb-4 p-3 rounded-2xl text-sm font-bold text-center transition-all active:scale-[0.98] border-2 border-dashed"
          style={{
            backgroundColor: theme.css['--theme-primary-light'],
            borderColor: theme.css['--theme-btn'],
            color: theme.css['--theme-btn'],
          }}
        >
          <ShoppingBag className="w-4 h-4 inline mr-1.5" />
          Product sent in Telegram. Check it
          <ChevronRight className="w-4 h-4 inline ml-1" />
        </motion.a>

        <AnimatePresence>
          {showSearch && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mb-4"
            >
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-1 flex items-center">
                <Search className="w-5 h-5 text-gray-400 ml-4 flex-shrink-0" />
                <input
                  type="text"
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search products..."
                  className="flex-1 px-3 py-3 bg-transparent outline-none text-sm font-medium"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="p-2 text-gray-400 hover:text-gray-600 mr-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {categories.length > 0 && !showSearch && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mb-6 overflow-x-auto scrollbar-hide -mx-4 px-4"
          >
            <div className="flex gap-2 min-w-max pb-2">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${
                  !selectedCategory
                    ? 'theme-filter-active'
                    : 'bg-white text-gray-500 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                <Sparkles className="w-4 h-4 inline mr-1.5" />
                All
              </button>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id === selectedCategory ? null : cat.id)}
                  className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${
                    selectedCategory === cat.id
                      ? 'theme-filter-active'
                      : 'bg-white text-gray-500 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {sortBy !== 'default' && !searchQuery && (
          <p className="text-xs mb-3 ml-1 font-medium" style={{ color: theme.css['--theme-primary'] }}>
            Sorted: {sortBy === 'price_asc' ? 'Low to High' : 'High to Low'}
          </p>
        )}

        {searchQuery && (
          <p className="text-sm text-gray-400 mb-4 ml-1">
            {sortedProducts.length} result{sortedProducts.length !== 1 ? 's' : ''} for &ldquo;{searchQuery}&rdquo;
          </p>
        )}

        {sortedProducts.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-sm"
          >
            <div className="w-20 h-20 bg-gradient-to-br from-gray-50 to-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
              <Package className="w-10 h-10 text-gray-300" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">
              {searchQuery ? 'No Products Found' : 'No Products Available'}
            </h3>
            <p className="text-sm text-gray-400 mt-1">
              {searchQuery
                ? 'Try a different search term.'
                : selectedCategory
                  ? 'No products in this category yet.'
                  : 'Check back later for new products.'}
            </p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-5 pb-8">
            {sortedProducts.map((product, index) => {
              const isOutOfStock = product.stock_quantity !== null && product.stock_quantity === 0;
              const stockLow = product.stock_quantity !== null && product.stock_quantity <= 5 && product.stock_quantity > 0;
              const productImages = getPublicImageUrls(product.image_url, shop.id);

              return (
                <motion.div
                  key={product.id}
                  layout
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04, duration: 0.35 }}
                  className="theme-card rounded-2xl md:rounded-3xl shadow-sm overflow-hidden hover:-translate-y-1 transition-all duration-300 group cursor-pointer"
                  onClick={() => setSelectedProduct(product)}
                >
                  <div className="aspect-square bg-gradient-to-br from-gray-50 to-gray-100 relative overflow-hidden">
                    {product.image_url && productImages[0] ? (
                      <img
                        src={productImages[0]}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div
                      className="w-full h-full items-center justify-center text-gray-300"
                      style={{ display: product.image_url && productImages[0] ? 'none' : 'flex' }}
                    >
                      <Package className="w-12 h-12 md:w-16 md:h-16" />
                    </div>

                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                    {productImages.length > 1 && (
                      <div className="absolute top-2 right-2 md:top-3 md:right-3">
                        <span className="px-2 py-0.5 bg-white/90 backdrop-blur-sm rounded-lg text-[10px] font-bold text-gray-600 shadow-xs flex items-center gap-1">
                          <Package className="w-2.5 h-2.5" />
                          {productImages.length}
                        </span>
                      </div>
                    )}

                    <div className="absolute bottom-2 left-2 md:bottom-3 md:left-3">
                      <span className={`px-2 py-0.5 md:px-2.5 md:py-1 rounded-lg text-[10px] md:text-xs font-bold uppercase tracking-wider backdrop-blur-sm shadow-sm ${
                        isOutOfStock ? 'bg-rose-500/90 text-white' :
                        stockLow ? 'bg-amber-500/90 text-white' :
                        'bg-emerald-500/90 text-white'
                      }`}>
                        {isOutOfStock ? 'Out of Stock' :
                         stockLow ? `${product.stock_quantity} left` :
                         'In Stock'}
                      </span>
                    </div>

                    {product.category_id && categoryMap[product.category_id] && (
                      <div className="absolute top-2 left-2 md:top-3 md:left-3">
                        <span className="px-2 py-0.5 md:px-2.5 md:py-1 bg-white/90 backdrop-blur-sm rounded-lg text-[10px] md:text-xs font-bold text-gray-600 shadow-xs flex items-center gap-1">
                          <Tag className="w-2.5 h-2.5" />
                          {categoryMap[product.category_id]}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="p-3 md:p-4">
                    <h3 className="font-bold text-gray-900 text-sm md:text-base line-clamp-1 mb-0.5 theme-hover-price transition-colors">
                      {product.name}
                    </h3>
                    {product.description && (
                      <p className="text-xs text-gray-400 line-clamp-2 mb-2 leading-relaxed">
                        {product.description}
                      </p>
                    )}

                    <div className="flex items-baseline gap-1 mb-3">
                      <span className="font-bold theme-price text-sm md:text-base">
                        {formatPrice(product.price)}
                      </span>
                      <span className="text-[10px] text-gray-400 font-medium">MMK</span>
                    </div>

                    <a
                      href={getBuyLink(product, shop.bot_username)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isOutOfStock) { e.preventDefault(); return; }
                        handleBuyNow(e, getBuyLink(product, shop.bot_username), product.id);
                      }}
                      className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${
                        isOutOfStock
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed pointer-events-none no-underline'
                          : 'theme-btn active:scale-[0.97]'
                      }`}
                    >
                      <ShoppingCart className="w-4 h-4" />
                      {isOutOfStock ? 'Unavailable' : sentProductIds.has(product.id) ? (
                        <span className="text-[10px] leading-tight">Product sent in Telegram. Check it!</span>
                      ) : 'Buy Now'}
                    </a>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      <footer className="bg-white border-t border-gray-100 mt-8">
        <div className="max-w-7xl mx-auto px-4 py-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: theme.css['--theme-btn'] }}>
              <ShoppingBag className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-bold text-gray-800">Telegram E-Commerce</span>
          </div>
          <p className="text-xs text-gray-400">
            Powered by Telegram E-Commerce Platform
          </p>
        </div>
      </footer>

      <AnimatePresence>
        {selectedProduct && (
          <ProductDetailModal
            product={selectedProduct}
            shop={shop}
            onClose={() => setSelectedProduct(null)}
            onBuyNow={handleBuyNow}
            isSent={sentProductIds.has(selectedProduct.id)}
          />
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
                    <input
                      type="text" placeholder="Name (optional)"
                      value={visitorForm.name}
                      onChange={e => setVisitorForm(p => ({ ...p, name: e.target.value }))}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                    />
                    <input
                      type="tel" placeholder="Phone (optional)"
                      value={visitorForm.phone}
                      onChange={e => setVisitorForm(p => ({ ...p, phone: e.target.value }))}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                    />
                    <input
                      type="email" placeholder="Email (optional)"
                      value={visitorForm.email}
                      onChange={e => setVisitorForm(p => ({ ...p, email: e.target.value }))}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                    />
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => handleVisitorSave(visitorForm.name, visitorForm.phone, visitorForm.email)}
                        className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all active:scale-95"
                        style={{ background: theme.css['--theme-btn'] }}
                      >
                        Start Chatting
                      </button>
                      <button
                        onClick={() => handleVisitorSave('', '', '')}
                        className="px-4 py-2.5 rounded-xl text-sm font-bold text-gray-500 bg-gray-100 transition-all active:scale-95"
                      >
                        Skip
                      </button>
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
                        <img
                          src={API_BASE + '/telegram/file/' + msg.file_id + '?bot_id=' + shop?.id}
                          alt="Photo"
                          className="max-w-full rounded-lg mb-1 max-h-48 object-cover"
                          loading="lazy"
                        />
                      )}
                      {msg.content && msg.role === 'assistant' ? (
                        <RichMessage content={msg.content} isAssistant={true} botId={shop?.id} getProductUrl={getProductUrl} />
                      ) : (
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      )}
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
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleVisitorPhoto}
                    className="hidden"
                  />
                  <button
                    onClick={() => photoInputRef.current?.click()}
                    disabled={uploadingPhoto || chatLoading}
                    className="w-10 h-10 rounded-xl flex items-center justify-center disabled:opacity-50 transition-all active:scale-90 flex-shrink-0 bg-gray-100 text-gray-500 hover:bg-gray-200"
                    title="Send photo"
                  >
                    {uploadingPhoto ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageUp className="w-4 h-4" />}
                  </button>
                  <input
                    ref={chatInputRef}
                    type="text"
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
                    className="w-10 h-10 rounded-xl flex items-center justify-center disabled:opacity-50 transition-all active:scale-90"
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
    </div>
  );
}
