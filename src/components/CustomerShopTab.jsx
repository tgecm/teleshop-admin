import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, X, ShoppingCart, Package, SlidersHorizontal, CheckCircle, ChevronLeft, ChevronRight, Star, ZoomIn } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getPublicShop } from '../api/public';
import { useCartState } from '../context/CartContext';

import { API_BASE } from '../api/config';
import { formatPrice } from '../utils/formatPrice';
import { getColorName } from '../data/colors';
import { resolveColorName, resolveProductPrice } from '../utils/productPricing';
import { FullScreenImageViewer } from '../pages/PublicEcommerce';

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

export default function CustomerShopTab({ shopSlug, shop, user, viewMode = 'ecommerce', onNavigate }) {
  const currency = shop?.currency || 'MMK';
  const { items: cartItems, addItem, updateQty } = useCartState(shop?.id, shopSlug, user, viewMode);

  const { data, isLoading } = useQuery({
    queryKey: ['public-shop', shopSlug],
    queryFn: () => getPublicShop(shopSlug),
    enabled: !!shopSlug,
  });

  const products = data?.products || [];
  const categories = data?.categories || [];
  const [detailProduct, setDetailProduct] = useState(null);
  const [selColor, setSelColor] = useState(null);
  const [selOptions, setSelOptions] = useState({});

  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [sortBy, setSortBy] = useState('newest');

  const categoryMap = {};
  categories.forEach(c => { categoryMap[c.id] = c.name; });

  const filteredProducts = useMemo(() => {
    let result = products.filter(p => {
      if (selectedCategory && p.category_id !== selectedCategory) return false;
      if (searchQuery) {
        const q = normalizeSearchText(searchQuery);
        return normalizeSearchText(p.name).includes(q) || normalizeSearchText(p.description || '').includes(q);
      }
      return true;
    });
    if (sortBy === 'price-low') result.sort((a, b) => (a.price || 0) - (b.price || 0));
    else if (sortBy === 'price-high') result.sort((a, b) => (b.price || 0) - (a.price || 0));
    else result.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    return result;
  }, [products, selectedCategory, searchQuery, sortBy]);

  const cartQty = (productId) => {
    const item = cartItems.find(i => i.product_id === productId);
    return item ? item.quantity : 0;
  };
  const totalCartQty = cartItems.reduce((s, i) => s + (i.quantity || 0), 0);

  if (isLoading) {
    return (
      <div className="px-4 md:px-8 xl:px-16 py-12 flex justify-center max-w-[1600px] mx-auto">
        <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="px-4 md:px-8 xl:px-16 py-6 max-w-[1600px] mx-auto">
      {/* Search + Sort */}
      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => setShowSearch(!showSearch)}
          className="p-2 rounded-xl bg-gray-100 text-gray-500 hover:bg-gray-200 transition-all">
          <Search className="w-4 h-4" />
        </button>
        <button onClick={() => setSortBy(s => s === 'price-low' ? 'price-high' : s === 'price-high' ? 'newest' : 'price-low')}
          className="px-3 py-2 rounded-xl bg-gray-100 text-gray-500 hover:bg-gray-200 transition-all text-[11px] font-bold">
          {sortBy === 'price-low' ? 'Price ↑' : sortBy === 'price-high' ? 'Price ↓' : 'Newest'}
        </button>
        <div className="flex-1" />
        <span className="text-[11px] text-gray-400 font-medium">{filteredProducts.length} products</span>
      </div>

      <AnimatePresence>
        {showSearch && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mb-4">
            <div className="flex items-center bg-white rounded-xl border border-gray-200 p-1">
              <Search className="w-4 h-4 text-gray-400 ml-3 shrink-0" />
              <input type="text" autoFocus value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search products..." className="flex-1 px-3 py-2.5 bg-transparent outline-none text-sm" />
              {searchQuery && <button onClick={() => setSearchQuery('')} className="p-1.5 text-gray-400 mr-1"><X className="w-4 h-4" /></button>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Categories */}
      {categories.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-3 mb-3 scrollbar-none">
          <button onClick={() => setSelectedCategory(null)}
            className={`shrink-0 px-3.5 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
              !selectedCategory ? 'bg-indigo-600 text-white' : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'
            }`}>
            All
          </button>
          {categories.map(c => (
            <button key={c.id} onClick={() => setSelectedCategory(c.id)}
              className={`shrink-0 px-3.5 py-1.5 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all ${
                selectedCategory === c.id ? 'bg-indigo-600 text-white' : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'
              }`}>
              {c.name}
            </button>
          ))}
        </div>
      )}

      {/* Products Grid */}
      {filteredProducts.length === 0 ? (
        <div className="py-16 text-center">
          <Package className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-sm text-gray-400 font-medium">No products found</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3 pb-8">
          {filteredProducts.map((product, i) => {
            const images = getPublicImageUrls(product.image_url, shop?.id);
            const qty = cartQty(product.id);
            return (
              <motion.div key={product.id}
                initial={{ y: 20 }} whileInView={{ y: 0 }} viewport={{ once: true, margin: "-30px" }} transition={{ duration: 0.2 }}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden cursor-pointer"
                onClick={() => { setDetailProduct(product); setSelColor(null); setSelOptions({}); }}>
                {/* Image */}
                <div className="aspect-square bg-gray-50 relative overflow-hidden">
                  {images[0] ? (
                    <img src={images[0]} alt={product.name} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                      loading="lazy" onError={(e) => { e.target.style.display = 'none'; }} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-8 h-8 text-gray-200" />
                    </div>
                  )}
                  {product.stock_quantity !== null && product.stock_quantity < 5 && (
                    <span className="absolute top-2 right-2 px-2 py-0.5 bg-rose-500 text-white text-[9px] font-bold rounded-md">
                      {product.stock_quantity === 0 ? 'Out of Stock' : `${product.stock_quantity} left`}
                    </span>
                  )}
                  {product.category_id && categoryMap[product.category_id] && (
                    <span className="absolute top-2 left-2 px-2 py-0.5 bg-white/90 text-gray-700 text-[9px] font-bold rounded-md backdrop-blur">
                      {categoryMap[product.category_id]}
                    </span>
                  )}
                </div>

                {/* Info */}
                <div className="p-3">
                  <p className="text-xs font-bold text-gray-900 line-clamp-1">{product.name}</p>
                  {product.description && (
                    <p className="text-[10px] text-gray-400 line-clamp-2 mt-0.5">{product.description}</p>
                  )}
                  <div className="flex items-baseline gap-1.5 mt-1">
                    {product.original_price > 0 && (
                      <p className="text-xs line-through text-red-400 font-medium">{formatPrice(product.original_price, currency)}</p>
                    )}
                    <p className="text-sm font-black text-indigo-600">{formatPrice(product.price, currency)}</p>
                  </div>

                  {/* Color swatches preview */}
                  {product.specifications?.colors?.length > 0 && (
                    <div className="flex gap-1 mt-2" onClick={e => e.stopPropagation()}>
                      {product.specifications.colors.slice(0, 5).map(c => (
                        <div key={c.color} className="w-4 h-4 rounded-full border border-gray-200" style={{ backgroundColor: c.color }} />
                      ))}
                      {product.specifications.colors.length > 5 && (
                        <span className="text-[9px] text-gray-400 font-medium ml-1">+{product.specifications.colors.length - 5}</span>
                      )}
                    </div>
                  )}

                  {/* Add to Cart */}
                  {qty > 0 ? (
                    <div className="flex items-center gap-2 mt-2">
                      <button onClick={(e) => { e.stopPropagation(); updateQty(product.id, -1); }}
                        className="w-8 h-8 rounded-xl bg-gray-100 text-gray-600 font-bold text-sm hover:bg-gray-200 transition-all">
                        −
                      </button>
                      <span className="text-sm font-bold text-gray-900 min-w-[20px] text-center">{qty}</span>
                      <button onClick={(e) => { e.stopPropagation(); updateQty(product.id, 1); }}
                        disabled={product.stock_quantity !== null && qty >= product.stock_quantity}
                        className="w-8 h-8 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 transition-all disabled:opacity-40">
                        +
                      </button>
                    </div>
                  ) : (
                    <button onClick={(e) => { e.stopPropagation(); addItem({ id: product.id, name: product.name, price: Number(product.price), image_url: images[0] || '' }, null); }}
                      disabled={product.stock_quantity === 0 || product.specifications?.colors?.length > 0 || product.specifications?.options?.length > 0}
                      className="w-full mt-2 py-2 rounded-xl bg-indigo-600 text-white text-[11px] font-bold hover:bg-indigo-700 transition-all active:scale-[0.97] disabled:opacity-50">
                      {product.specifications?.colors?.length > 0 || product.specifications?.options?.length > 0 ? 'Select Options' : 'Add to Cart'}
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Product Detail Modal */}
      <AnimatePresence>
        {detailProduct && (
          <ProductDetailModal
            product={detailProduct}
            shop={shop}
            cartQty={cartQty(detailProduct.id)}
            addItem={addItem}
            updateQty={updateQty}
            selColor={selColor}
            setSelColor={setSelColor}
            selOptions={selOptions}
            setSelOptions={setSelOptions}
            onClose={() => { setDetailProduct(null); setSelColor(null); setSelOptions({}); }}
          />
        )}
      </AnimatePresence>

      {/* Floating cart button */}
      {totalCartQty > 0 && (
        <button onClick={() => onNavigate?.('cart')}
          className="fixed bottom-24 right-5 z-40 flex items-center gap-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white pl-4 pr-5 py-3 rounded-full shadow-lg shadow-indigo-600/30 hover:shadow-xl hover:scale-105 active:scale-95 transition-all">
          <ShoppingCart className="w-5 h-5" />
          <span className="text-sm font-bold">{totalCartQty}</span>
        </button>
      )}
    </div>
  );
}

function ProductDetailModal({ product, shop, cartQty, addItem, updateQty, selColor, setSelColor, selOptions, setSelOptions, onClose }) {
  const currency = shop?.currency || 'MMK';
  const images = getPublicImageUrls(product.image_url, shop?.id);
  const isOutOfStock = product.stock_quantity !== null && product.stock_quantity === 0;
  const productColors = product.specifications?.colors || [];
  const productOptions = product.specifications?.options || [];
  const [curImgIdx, setCurImgIdx] = useState(0);
  const [imgRatio, setImgRatio] = useState('landscape');
  const [showFullScreen, setShowFullScreen] = useState(false);
  const touchStartX = useRef(null);

  const handleTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const diff = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(diff) > 50) {
      if (diff > 0 && curImgIdx > 0) setCurImgIdx(i => i - 1);
      else if (diff < 0 && curImgIdx < images.length - 1) setCurImgIdx(i => i + 1);
    }
    touchStartX.current = null;
  };

  const prevImage = useCallback(() => { if (curImgIdx > 0) setCurImgIdx(i => i - 1); }, [curImgIdx]);
  const nextImage = useCallback(() => { if (curImgIdx < images.length - 1) setCurImgIdx(i => i + 1); }, [curImgIdx, images.length]);

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); if (e.key === 'ArrowLeft') prevImage(); if (e.key === 'ArrowRight') nextImage(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose, prevImage, nextImage]);

  const colorStr = selColor ? (getColorName(selColor) || selColor) : null;
  const opts = selOptions && typeof selOptions === 'object' && Object.keys(selOptions).length > 0 ? selOptions : null;
  const currentPrice = resolveProductPrice(product, colorStr, opts);

  const containerClass = imgRatio === 'landscape'
    ? 'sticky top-0 z-10 aspect-[16/9] bg-gray-900/5 overflow-hidden relative flex items-center justify-center'
    : imgRatio === 'portrait'
    ? 'sticky top-0 z-10 aspect-[4/5] sm:aspect-square bg-gray-900/5 overflow-hidden relative flex items-center justify-center'
    : 'sticky top-0 z-10 aspect-square bg-gray-900/5 overflow-hidden relative flex items-center justify-center';

  const imgClass = imgRatio === 'landscape'
    ? 'w-full h-full object-cover relative z-10'
    : imgRatio === 'portrait'
    ? 'w-full h-full object-contain relative z-10 p-2 md:p-4 drop-shadow-md'
    : 'w-full h-full object-cover relative z-10';

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <motion.div
        initial={{ y: '100%', opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="relative bg-white w-full max-w-lg md:rounded-[32px] md:mx-4 max-h-[92svh] overflow-y-auto rounded-t-xl shadow-2xl"
      >
        <button onClick={onClose} className="absolute top-4 right-4 z-30 p-2 bg-white/90 backdrop-blur-md rounded-full shadow-lg hover:bg-white active:scale-90 transition-all">
          <X className="w-5 h-5 text-gray-700" />
        </button>

        {/* Image */}
        <div className={containerClass} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
          {images[curImgIdx] && imgRatio === 'portrait' && (
            <img
              src={images[curImgIdx]}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-35 scale-125 pointer-events-none transition-all duration-500"
            />
          )}

          {images.length > 0 ? (
            <AnimatePresence mode="wait">
              <motion.img
                key={curImgIdx} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.2 }}
                src={images[curImgIdx]} alt={product.name}
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
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            </AnimatePresence>
          ) : (
            <div className="w-full h-full flex items-center justify-center"><Package className="w-20 h-20 text-gray-300" /></div>
          )}

          {images.length > 1 && (
            <>
              {curImgIdx > 0 && (
                <button onClick={prevImage} className="absolute left-3 top-1/2 -translate-y-1/2 p-2 bg-white/90 backdrop-blur-md rounded-full shadow-lg z-20">
                  <ChevronLeft className="w-5 h-5 text-gray-700" />
                </button>
              )}
              {curImgIdx < images.length - 1 && (
                <button onClick={nextImage} className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-white/90 backdrop-blur-md rounded-full shadow-lg z-20">
                  <ChevronRight className="w-5 h-5 text-gray-700" />
                </button>
              )}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-1.5">
                {images.map((_, i) => (
                  <button key={i} onClick={() => setCurImgIdx(i)}
                    className={`w-2 h-2 rounded-full transition-all ${i === curImgIdx ? 'bg-white w-6 shadow-md' : 'bg-white/50'}`} />
                ))}
              </div>
            </>
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
            <span className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider backdrop-blur-sm shadow-md ${
              isOutOfStock ? 'bg-rose-500/90 text-white' :
              product.stock_quantity !== null && product.stock_quantity <= 5 ? 'bg-amber-500/90 text-white' : 'bg-emerald-500/90 text-white'
            }`}>
              {isOutOfStock ? 'Out of Stock' :
               product.stock_quantity !== null && product.stock_quantity <= 5 ? `${product.stock_quantity} left` : 'In Stock'}
            </span>
          </div>
        </div>

        <div className="p-5">
          <h2 className="text-xl font-bold text-gray-900 mb-2">{product.name}</h2>
          <div className="mb-4 flex items-baseline gap-2">
            {product.original_price > 0 && <p className="text-sm line-through text-red-400 font-medium">{formatPrice(product.original_price, currency)}</p>}
            <p className="text-2xl font-bold text-indigo-600">{formatPrice(currentPrice, currency)}</p>
          </div>

          {product.description && (
            <div className="bg-gray-50 rounded-2xl p-4 mb-4">
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{product.description}</p>
            </div>
          )}

          {/* Colors */}
          {productColors.length > 0 && (
            <div className="mb-5">
              <p className="text-xs text-gray-500 font-medium mb-2.5">Color</p>
              <div className="flex flex-wrap gap-3">
                {productColors.map(c => {
                  const isSelected = selColor === c.color;
                  return (
                    <button key={c.color}
                      onClick={() => { setSelColor(isSelected ? null : c.color); setCurImgIdx(0); }}
                      className={`flex flex-col items-center gap-1.5 transition-all active:scale-90 ${isSelected ? 'scale-110' : 'opacity-70 hover:opacity-100'}`}
                    >
                      <div className={`w-10 h-10 rounded-full border-[3px] transition-all ${isSelected ? 'border-white ring-2 ring-offset-2 ring-indigo-500 shadow-lg' : 'border-gray-300'}`}
                        style={{ backgroundColor: c.color }} />
                      <span className={`text-[10px] font-bold ${isSelected ? 'text-indigo-600' : 'text-gray-500'}`}>
                        {getColorName(c.color)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Options */}
          {productOptions.length > 0 && (
            <div className="mb-5 space-y-4">
              {productOptions.map(opt => (
                <div key={opt.id}>
                  <p className="text-xs text-gray-500 font-medium mb-2.5">{opt.name}</p>
                  <div className="flex flex-wrap gap-2">
                    {opt.values.map(v => {
                      const isSelected = selOptions[opt.id] === v.id;
                      return (
                        <button key={v.id}
                          onClick={() => setSelOptions(prev => ({ ...prev, [opt.id]: isSelected ? null : v.id }))}
                          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all active:scale-95 ${isSelected ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
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

          {/* Add to Cart */}
          {cartQty > 0 ? (
            <div className="flex items-center gap-3 mt-4">
              <button onClick={() => updateQty(product.id, -1)}
                className="flex-1 py-3.5 rounded-2xl bg-gray-100 text-gray-700 font-bold text-sm hover:bg-gray-200 transition-all active:scale-[0.98]">
                − Remove
              </button>
              <span className="text-lg font-bold text-gray-900 min-w-[30px] text-center">{cartQty}</span>
              <button onClick={() => updateQty(product.id, 1)}
                disabled={product.stock_quantity !== null && cartQty >= product.stock_quantity}
                className="flex-1 py-3.5 rounded-2xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 transition-all active:scale-[0.98] disabled:opacity-40">
                + Add
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                addItem({
                  id: product.id, name: product.name, price: currentPrice,
                  image_url: images[0] || '',
                }, selColor || null, opts);
                onClose();
              }}
              disabled={isOutOfStock || (productColors.length > 0 && !selColor) || (productOptions.length > 0 && productOptions.some(o => !selOptions[o.id]))}
              className={`w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-bold text-base transition-all active:scale-[0.98] ${
                isOutOfStock || (productColors.length > 0 && !selColor) || (productOptions.length > 0 && productOptions.some(o => !selOptions[o.id]))
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg hover:shadow-xl'
              }`}
            >
              <ShoppingCart className="w-5 h-5" />
              {isOutOfStock ? 'Currently Unavailable' : productColors.length > 0 && !selColor ? 'Select a Color' : productOptions.length > 0 && productOptions.some(o => !selOptions[o.id]) ? 'Select Options' : 'Add to Cart'}
            </button>
          )}
        </div>
      </motion.div>

      {/* Fullscreen Viewer */}
      <AnimatePresence>
        {showFullScreen && (
          <FullScreenImageViewer
            images={images}
            initialIndex={curImgIdx}
            onClose={() => setShowFullScreen(false)}
            title={product.name}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
