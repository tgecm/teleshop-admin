import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getPublicShop, getPublicShopByDomain } from '../api/public';
import {
  ShoppingBag, Package, AlertCircle, ShoppingCart, ChevronRight,
  Tag, Sparkles, TrendingUp, Clock, Star, Search, X, ChevronLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const API_BASE = 'https://api.telegramecommerce.shop';

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

function ProductDetailModal({ product, shop, onClose }) {
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
            <span className="text-2xl font-bold text-indigo-600">{formatPrice(product.price)}</span>
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
            onClick={(e) => isOutOfStock && e.preventDefault()}
            className={`w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-bold text-base transition-all ${
              isOutOfStock
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:shadow-xl hover:shadow-indigo-200 hover:from-indigo-700 hover:to-purple-700 active:scale-[0.98] shadow-lg shadow-indigo-100'
            }`}
          >
            <ShoppingCart className="w-5 h-5" />
            {isOutOfStock ? 'Currently Unavailable' : 'Buy Now on Telegram'}
          </a>

          <p className="text-xs text-gray-400 text-center mt-3">
            You'll be redirected to Telegram to complete your purchase
          </p>
        </div>
      </motion.div>
    </div>
  );
}

function ShopClosed({ shop }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', damping: 20, stiffness: 200 }}
        className="bg-white rounded-[40px] shadow-2xl shadow-indigo-100/50 p-10 max-w-md w-full text-center relative overflow-hidden"
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
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-2xl hover:shadow-xl hover:shadow-indigo-200 hover:from-indigo-700 hover:to-purple-700 active:scale-[0.98] transition-all shadow-lg shadow-indigo-100"
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

  useEffect(() => {
    document.title = shop?.bot_full_name || 'TeleShop';
    return () => { document.title = 'TeleShop Admin'; };
  }, [shop?.bot_full_name]);

  const getBuyLink = (product, botUsername) => {
    const token = product.link_token;
    return `https://t.me/${botUsername}?start=${token}`;
  };

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

  const getInitials = (name) => {
    return (name || 'S').charAt(0).toUpperCase();
  };

  if (isLoading) return <LoadingSkeleton />;

  if (error || !shop) {
    const isNotFound = error?.response?.status === 404;
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
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
                className="w-full px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-2xl hover:shadow-xl hover:shadow-indigo-200 transition-all"
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
    return <ShopClosed shop={shop} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="relative bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 overflow-hidden">
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

        <div className="absolute -bottom-1 left-0 right-0 h-8 bg-gray-50 rounded-t-[32px]" />
      </div>

      <div className="max-w-7xl mx-auto px-4 -mt-10 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-3xl p-5 md:p-6 shadow-xl shadow-indigo-100/50 mb-6 flex items-center justify-between"
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
          <button
            onClick={() => setShowSearch(!showSearch)}
            className={`p-2.5 rounded-xl transition-all ${
              showSearch
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
            }`}
          >
            {showSearch ? <X className="w-5 h-5" /> : <Search className="w-5 h-5" />}
          </button>
        </motion.div>

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
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
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
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                      : 'bg-white text-gray-500 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {searchQuery && (
          <p className="text-sm text-gray-400 mb-4 ml-1">
            {filteredProducts.length} result{filteredProducts.length !== 1 ? 's' : ''} for "{searchQuery}"
          </p>
        )}

        {filteredProducts.length === 0 ? (
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
            {filteredProducts.map((product, index) => {
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
                  className="bg-white rounded-2xl md:rounded-3xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl hover:shadow-indigo-100/50 hover:-translate-y-1 transition-all duration-300 group cursor-pointer"
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
                    <h3 className="font-bold text-gray-900 text-sm md:text-base line-clamp-1 mb-0.5 group-hover:text-indigo-600 transition-colors">
                      {product.name}
                    </h3>
                    {product.description && (
                      <p className="text-xs text-gray-400 line-clamp-2 mb-2 leading-relaxed">
                        {product.description}
                      </p>
                    )}

                    <div className="flex items-baseline gap-1 mb-3">
                      <span className="font-bold text-indigo-600 text-sm md:text-base">
                        {formatPrice(product.price)}
                      </span>
                      <span className="text-[10px] text-gray-400 font-medium">MMK</span>
                    </div>

                    <a
                      href={getBuyLink(product, shop.bot_username)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${
                        isOutOfStock
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:shadow-lg hover:shadow-indigo-200 hover:from-indigo-700 hover:to-purple-700 active:scale-[0.97]'
                      }`}
                    >
                      <ShoppingCart className="w-4 h-4" />
                      {isOutOfStock ? 'Unavailable' : 'Buy Now'}
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
            <div className="w-6 h-6 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-md flex items-center justify-center">
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
          />
        )}
      </AnimatePresence>
    </div>
  );
}
