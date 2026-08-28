import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getPublicShop, getPublicShopByDomain } from '../api/public';
import {
  ShoppingBag, Package, AlertCircle, ShoppingCart, ChevronRight,
  Tag, Sparkles, TrendingUp, Clock, Star, Search, X, ChevronLeft,
  ArrowUpDown, ZoomIn
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { THEMES, DEFAULT_THEME } from '../themes/themes';

import { API_BASE } from '../api/config';
import AiChatWidget from '../components/chat/AiChatWidget';
import { formatPrice } from '../utils/formatPrice';
import { filterAndSortProducts } from '../utils/search';

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

function FullScreenImageViewer({ images, initialIndex = 0, onClose, title }) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const touchStartRef = useRef(null);
  const initialPinchDistRef = useRef(null);
  const initialScaleRef = useRef(1);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);

  useEffect(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, [currentIndex]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
      if (scale === 1) {
        if (e.key === 'ArrowLeft' && currentIndex > 0) setCurrentIndex(i => i - 1);
        if (e.key === 'ArrowRight' && currentIndex < images.length - 1) setCurrentIndex(i => i + 1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, currentIndex, images.length, scale]);

  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      initialPinchDistRef.current = dist;
      initialScaleRef.current = scale;
    } else if (e.touches.length === 1) {
      touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      if (scale > 1) {
        isDraggingRef.current = true;
        dragStartRef.current = { x: e.touches[0].clientX - position.x, y: e.touches[0].clientY - position.y };
      }
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 2 && initialPinchDistRef.current) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const factor = dist / initialPinchDistRef.current;
      const newScale = Math.min(Math.max(initialScaleRef.current * factor, 1), 4);
      setScale(newScale);
      if (newScale === 1) {
        setPosition({ x: 0, y: 0 });
      }
    } else if (e.touches.length === 1 && isDraggingRef.current && scale > 1) {
      setPosition({
        x: e.touches[0].clientX - dragStartRef.current.x,
        y: e.touches[0].clientY - dragStartRef.current.y
      });
    }
  };

  const handleTouchEnd = (e) => {
    if (e.touches.length < 2) {
      initialPinchDistRef.current = null;
    }
    if (e.touches.length === 0) {
      isDraggingRef.current = false;
      if (touchStartRef.current && scale === 1) {
        const diffX = e.changedTouches[0].clientX - touchStartRef.current.x;
        const diffY = e.changedTouches[0].clientY - touchStartRef.current.y;
        if (Math.abs(diffX) > 60 && Math.abs(diffY) < 50) {
          if (diffX > 0 && currentIndex > 0) setCurrentIndex(i => i - 1);
          else if (diffX < 0 && currentIndex < images.length - 1) setCurrentIndex(i => i + 1);
        }
      }
      touchStartRef.current = null;
    }
  };

  const handleMouseDown = (e) => {
    if (scale > 1) {
      isDraggingRef.current = true;
      dragStartRef.current = { x: e.clientX - position.x, y: e.clientY - position.y };
    }
  };

  const handleMouseMove = (e) => {
    if (isDraggingRef.current && scale > 1) {
      setPosition({
        x: e.clientX - dragStartRef.current.x,
        y: e.clientY - dragStartRef.current.y
      });
    }
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleDoubleTap = (e) => {
    e.stopPropagation();
    if (scale > 1) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
    } else {
      setScale(2.5);
    }
  };

  const handleWheel = (e) => {
    const zoomFactor = 0.15;
    const direction = e.deltaY < 0 ? 1 : -1;
    const newScale = Math.min(Math.max(scale + direction * zoomFactor, 1), 4);
    setScale(newScale);
    if (newScale === 1) {
      setPosition({ x: 0, y: 0 });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex flex-col justify-between select-none touch-none"
      onClick={() => { if (scale === 1) onClose(); }}
    >
      <div className="p-4 flex items-center justify-between z-20 bg-gradient-to-b from-black/55 to-transparent pointer-events-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2">
          {images.length > 1 && (
            <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-white text-xs font-bold shadow-md">
              {currentIndex + 1} / {images.length}
            </span>
          )}
          {title && <span className="text-white font-medium text-sm truncate max-w-[200px] drop-shadow">{title}</span>}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-white/40 text-xs hidden sm:inline-block">Double click / Pinch to zoom</span>
          <button
            onClick={onClose}
            className="p-2.5 bg-white/10 hover:bg-white/25 text-white rounded-full transition-all active:scale-95 shadow"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div
        className="flex-1 relative flex items-center justify-center overflow-hidden w-full h-full cursor-zoom-in"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDoubleClick={handleDoubleTap}
        onWheel={handleWheel}
        onClick={() => { if (scale === 1) onClose(); }}
      >
        <div
          className="transition-transform duration-100 ease-out select-none flex items-center justify-center"
          style={{
            transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
          }}
        >
          <img
            src={images[currentIndex] || '/placeholder.svg'}
            alt=""
            className="max-w-[100vw] max-h-[85vh] object-contain select-none pointer-events-none"
            draggable="false"
          />
        </div>

        {images.length > 1 && scale === 1 && (
          <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 flex justify-between pointer-events-none z-10">
            {currentIndex > 0 ? (
              <button
                onClick={(e) => { e.stopPropagation(); setCurrentIndex(i => i - 1); }}
                className="p-3 bg-black/40 hover:bg-black/60 text-white rounded-full transition-all active:scale-90 pointer-events-auto backdrop-blur-sm"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            ) : <div />}
            {currentIndex < images.length - 1 ? (
              <button
                onClick={(e) => { e.stopPropagation(); setCurrentIndex(i => i + 1); }}
                className="p-3 bg-black/40 hover:bg-black/60 text-white rounded-full transition-all active:scale-90 pointer-events-auto backdrop-blur-sm"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            ) : <div />}
          </div>
        )}
      </div>

      <div className="p-6 text-center text-white/50 text-xs bg-gradient-to-t from-black/55 to-transparent pointer-events-none">
        {scale > 1 ? 'Drag to pan around' : 'Pinch or double tap to zoom'}
      </div>
    </motion.div>
  );
}

function ProductDetailModal({ product, shop, onClose, onBuyNow, isSent }) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showFullScreen, setShowFullScreen] = useState(false);
  const touchStartX = useRef(null);
  const images = getPublicImageUrls(product.image_url, shop?.id);

  const isOutOfStock = product.stock_quantity === 0 || product.specifications?.stock_status === 'out' || product.stock_status === 'out';
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

  const [imgRatio, setImgRatio] = useState('landscape');

  const containerClass = imgRatio === 'landscape'
    ? 'relative aspect-[16/9] bg-gray-900/5 overflow-hidden flex items-center justify-center'
    : imgRatio === 'portrait'
    ? 'relative aspect-[4/5] sm:aspect-square bg-gray-900/5 overflow-hidden flex items-center justify-center'
    : 'relative aspect-square bg-gray-900/5 overflow-hidden flex items-center justify-center';

  const imgClass = imgRatio === 'landscape'
    ? 'w-full h-full object-cover relative z-10'
    : imgRatio === 'portrait'
    ? 'w-full h-full object-contain relative z-10 p-2 md:p-4 drop-shadow-md'
    : 'w-full h-full object-cover relative z-10';

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
        <div
          className={containerClass}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div className="absolute top-4 right-4 z-30 flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-2.5 bg-white/90 backdrop-blur-md rounded-full shadow-lg hover:bg-white active:scale-90 transition-all"
            >
              <X className="w-5 h-5 text-gray-700" />
            </button>
          </div>
          {images[currentImageIndex] && imgRatio === 'portrait' && (
            <img
              src={images[currentImageIndex]}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-35 scale-125 pointer-events-none transition-all duration-500"
            />
          )}
          <AnimatePresence mode="wait">
            <motion.img
              key={currentImageIndex}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              src={images[currentImageIndex] || '/placeholder.svg'}
              alt={product.name}
              className={`${imgClass} cursor-zoom-in`}
              onClick={() => setShowFullScreen(true)}
              onLoad={(e) => {
                const w = e.target.naturalWidth;
                const h = e.target.naturalHeight;
                if (w && h) {
                  const r = w / h;
                  if (r > 1.3) setImgRatio('landscape');
                  else if (r < 0.85) setImgRatio('portrait');
                  else setImgRatio('square');
                }
              }}
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

              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-1.5">
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

              <div className="absolute top-4 left-4 z-20 px-3 py-1.5 bg-black/40 backdrop-blur-md rounded-full">
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

          {images.length > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); setShowFullScreen(true); }}
              className="absolute bottom-4 left-4 z-20 p-2.5 bg-white/90 backdrop-blur-md rounded-full shadow-lg hover:bg-white active:scale-90 transition-all pointer-events-auto"
              title="View Fullscreen"
            >
              <ZoomIn className="w-4 h-4 text-gray-700" />
            </button>
          )}

          <div className="absolute bottom-4 right-4 z-20">
            {(() => {
              const status = product?.specifications?.stock_status || product?.stock_status;
              if (status === 'preorder') {
                return (
                  <span className="px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider backdrop-blur-sm shadow-md bg-purple-600/90 text-white">
                    Pre-order
                  </span>
                );
              }
              if (status === 'limited') {
                return (
                  <span className="px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider backdrop-blur-sm shadow-md bg-amber-400 text-gray-950">
                    Limited
                  </span>
                );
              }

              return (
                <span className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider backdrop-blur-sm shadow-md ${
                  isOutOfStock ? 'bg-rose-500/90 text-white' :
                  product.stock_quantity !== null && product.stock_quantity <= 5 ? 'bg-amber-500/90 text-white' : 'bg-emerald-500/90 text-white'
                }`}>
                  {isOutOfStock ? 'Out of Stock' :
                   product.stock_quantity !== null && product.stock_quantity <= 5 ? `${product.stock_quantity} left` : 'In Stock'}
                </span>
              );
            })()}
          </div>
        </div>

        <div className="p-6 pb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-2">{product.name}</h2>

          <div className="flex items-baseline gap-1.5 mb-4">
            <span className="text-2xl font-bold theme-price">{formatPrice(product.price, shop?.currency || 'MMK')}</span>
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

      <AnimatePresence>
        {showFullScreen && (
          <FullScreenImageViewer
            images={images}
            initialIndex={currentImageIndex}
            onClose={() => setShowFullScreen(false)}
            title={product.name}
          />
        )}
      </AnimatePresence>
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

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: viaDomain ? ['public-shop-by-domain'] : ['public-shop', slug],
    queryFn: viaDomain ? getPublicShopByDomain : () => getPublicShop(slug),
    enabled: viaDomain || !!slug,
    retry: 2,
    retryDelay: 1000,
    refetchInterval: 10000,
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

  // Process data

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

  const sortedProducts = filterAndSortProducts(products, searchQuery, selectedCategory, categoryMap, sortBy);

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

  const plan = shop?.plan_name?.toLowerCase() || 'free';
  const isWebSupported = plan === 'standard' || plan === 'pro' || plan === 'business';
  if (!isWebSupported) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full text-center border border-gray-100"
        >
          <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Shop Unavailable</h2>
          <p className="text-gray-500 text-sm leading-relaxed">
            This shop is currently unavailable...
          </p>
        </motion.div>
      </div>
    );
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
              const isOutOfStock = product.stock_quantity === 0 || product.specifications?.stock_status === 'out' || product.stock_status === 'out';
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
                      {(() => {
                        const status = product?.specifications?.stock_status || product?.stock_status;
                        if (status === 'preorder') {
                          return (
                            <span className="px-2 py-0.5 md:px-2.5 md:py-1 rounded-lg text-[10px] md:text-xs font-bold uppercase tracking-wider backdrop-blur-sm shadow-sm bg-purple-600/90 text-white">
                              Pre-order
                            </span>
                          );
                        }
                        if (status === 'limited') {
                          return (
                            <span className="px-2 py-0.5 md:px-2.5 md:py-1 rounded-lg text-[10px] md:text-xs font-black uppercase tracking-wider backdrop-blur-sm shadow-sm bg-amber-400 text-gray-950">
                              Limited
                            </span>
                          );
                        }

                        return (
                          <span className={`px-2 py-0.5 md:px-2.5 md:py-1 rounded-lg text-[10px] md:text-xs font-bold uppercase tracking-wider backdrop-blur-sm shadow-sm ${
                            isOutOfStock ? 'bg-rose-500/90 text-white' :
                            stockLow ? 'bg-amber-500/90 text-white' :
                            'bg-emerald-500/90 text-white'
                          }`}>
                            {isOutOfStock ? 'Out of Stock' :
                             stockLow ? `${product.stock_quantity} left` :
                             'In Stock'}
                          </span>
                        );
                      })()}
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
                        {formatPrice(product.price, shop?.currency || 'MMK')}
                      </span>
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
        <AiChatWidget
          botId={shop?.id}
          botUsername={shop?.bot_username}
          slug={slug}
          theme={theme}
          getProductUrl={getProductUrl}
          hide={Boolean(selectedProduct)}
        />
      )}
    </div>
  );
}
