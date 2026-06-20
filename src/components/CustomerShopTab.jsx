import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, X, ShoppingCart, Package, SlidersHorizontal, CheckCircle, ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getPublicShop } from '../api/public';
import { useCartState } from '../context/CartContext';

import { API_BASE } from '../api/config';

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

const COLOR_NAMES = {
  '#FF0000': 'Red', '#00FF00': 'Green', '#0000FF': 'Blue', '#FFFF00': 'Yellow',
  '#FF00FF': 'Magenta', '#00FFFF': 'Cyan', '#000000': 'Black', '#FFFFFF': 'White',
  '#808080': 'Gray', '#C0C0C0': 'Silver', '#800000': 'Maroon', '#808000': 'Olive',
  '#008000': 'Dark Green', '#800080': 'Purple', '#008080': 'Teal', '#000080': 'Navy',
  '#FFA500': 'Orange', '#FFC0CB': 'Pink', '#A52A2A': 'Brown', '#F5F5DC': 'Beige',
};

export default function CustomerShopTab({ shopSlug, shop, user, viewMode = 'ecommerce' }) {
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
              <motion.div key={product.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
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
                      <p className="text-xs line-through text-red-400 font-medium">{formatPrice(product.original_price)} MMK</p>
                    )}
                    <p className="text-sm font-black text-indigo-600">{formatPrice(product.price)} MMK</p>
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
    </div>
  );
}

function ProductDetailModal({ product, shop, cartQty, addItem, updateQty, selColor, setSelColor, selOptions, setSelOptions, onClose }) {
  const images = getPublicImageUrls(product.image_url, shop?.id);
  const isOutOfStock = product.stock_quantity !== null && product.stock_quantity === 0;
  const productColors = product.specifications?.colors || [];
  const productOptions = product.specifications?.options || [];
  const [curImgIdx, setCurImgIdx] = useState(0);

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <motion.div
        initial={{ y: '100%', opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="relative bg-white w-full max-w-lg md:rounded-[32px] md:mx-4 max-h-[92svh] overflow-y-auto rounded-t-xl shadow-2xl"
      >
        <button onClick={onClose} className="absolute top-4 right-4 z-20 p-2 bg-white/90 backdrop-blur-md rounded-full shadow-lg">
          <X className="w-5 h-5 text-gray-700" />
        </button>

        {/* Image */}
        <div className="sticky top-0 z-10 aspect-square bg-gray-100 overflow-hidden">
          {images.length > 0 ? (
            <>
              <img src={images[curImgIdx]} alt={product.name} className="w-full h-full object-cover"
                onError={(e) => { e.target.style.display = 'none'; }} />
              {images.length > 1 && (
                <>
                  {curImgIdx > 0 && (
                    <button onClick={() => setCurImgIdx(i => i - 1)} className="absolute left-3 top-1/2 -translate-y-1/2 p-2 bg-white/90 backdrop-blur-md rounded-full shadow-lg">
                      <ChevronLeft className="w-5 h-5 text-gray-700" />
                    </button>
                  )}
                  {curImgIdx < images.length - 1 && (
                    <button onClick={() => setCurImgIdx(i => i + 1)} className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-white/90 backdrop-blur-md rounded-full shadow-lg">
                      <ChevronRight className="w-5 h-5 text-gray-700" />
                    </button>
                  )}
                </>
              )}
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center"><Package className="w-20 h-20 text-gray-300" /></div>
          )}
          <div className="absolute top-4 left-4 px-3 py-1.5 bg-black/40 backdrop-blur-md rounded-full">
            <span className="text-white text-xs font-bold">{isOutOfStock ? 'Out of Stock' : product.stock_quantity !== null && product.stock_quantity <= 5 ? `${product.stock_quantity} left` : 'In Stock'}</span>
          </div>
        </div>

        <div className="p-5">
          <h2 className="text-xl font-bold text-gray-900 mb-2">{product.name}</h2>
          <div className="mb-4 flex items-baseline gap-2">
            {product.original_price > 0 && <p className="text-sm line-through text-red-400 font-medium">{formatPrice(product.original_price)} MMK</p>}
            <p className="text-2xl font-bold text-indigo-600">{formatPrice(product.price)} <span className="text-sm text-gray-400 font-medium">MMK</span></p>
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
                        {COLOR_NAMES[c.color] || c.color.replace('#', '')}
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
                id: product.id, name: product.name, price: Number(product.price),
                image_url: images[0] || '',
                selected_color: selColor || undefined,
                selected_options: Object.keys(selOptions).length > 0 ? selOptions : undefined,
              }, null);
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
    </div>
  );
}
