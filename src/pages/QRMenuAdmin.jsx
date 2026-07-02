import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getQRMenuItems, createQRMenuItem, updateQRMenuItem, deleteQRMenuItem, getQRMenuCategories, createQRMenuCategory, updateQRMenuCategory, deleteQRMenuCategory, getCustomers, getCustomerDetail, adjustCustomerPoints, getCoupons, createCoupon, deleteCoupon } from '../api/qrMenu';
import { BUSINESS_THEMES } from '../themes/themes';
import { getContentBlocks, updateContentBlock } from '../api/contentBlocks';
import { uploadImage } from '../api/products';
import { getBotPublicSlug } from '../api/public';
import { API_BASE } from '../api/config';
import client from '../api/client';
import { useSelectedBot } from '../hooks/useSelectedBot';
import { useToastStore } from '../store/toastStore';
import { formatPrice } from '../utils/formatPrice';
import LoadingSkeleton from '../components/shared/LoadingSkeleton';
import ConfirmDialog from '../components/shared/ConfirmDialog';
import {
  Plus, Search, Edit2, Trash2, Utensils, ImageUp, X, Copy,
  ExternalLink, Loader2, FolderPlus, Tag, Package, QrCode,
  ClipboardList, Palette, Award, Ticket, Users, Hash,
  Gift, RotateCcw, Sparkles, Check, Percent, User
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const BUSINESS_BADGES = {
  restaurant: [
    { value: 'vegetarian', label: 'Vegetarian', emoji: '🥬', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    { value: 'vegan', label: 'Vegan', emoji: '🌱', color: 'bg-green-100 text-green-700 border-green-200' },
    { value: 'spicy', label: 'Spicy', emoji: '🌶️', color: 'bg-red-100 text-red-700 border-red-200' },
    { value: 'gluten-free', label: 'Gluten Free', emoji: '🌾', color: 'bg-amber-100 text-amber-700 border-amber-200' },
    { value: 'popular', label: 'Popular', emoji: '⭐', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
    { value: 'new', label: 'New', emoji: '🆕', color: 'bg-sky-100 text-sky-700 border-sky-200' },
  ],
  cafe: [
    { value: 'hot', label: 'Hot', emoji: '☕', color: 'bg-red-100 text-red-700 border-red-200' },
    { value: 'iced', label: 'Iced', emoji: '🧊', color: 'bg-cyan-100 text-cyan-700 border-cyan-200' },
    { value: 'vegan', label: 'Vegan', emoji: '🌱', color: 'bg-green-100 text-green-700 border-green-200' },
    { value: 'popular', label: 'Popular', emoji: '⭐', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
    { value: 'new', label: 'New', emoji: '🆕', color: 'bg-sky-100 text-sky-700 border-sky-200' },
    { value: 'seasonal', label: 'Seasonal', emoji: '🍂', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  ],
  bakery: [
    { value: 'new', label: 'New', emoji: '🆕', color: 'bg-sky-100 text-sky-700 border-sky-200' },
    { value: 'fresh', label: 'Fresh', emoji: '🔥', color: 'bg-orange-100 text-orange-700 border-orange-200' },
    { value: 'vegan', label: 'Vegan', emoji: '🌱', color: 'bg-green-100 text-green-700 border-green-200' },
    { value: 'popular', label: 'Popular', emoji: '⭐', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
    { value: 'limited', label: 'Limited', emoji: '⏳', color: 'bg-purple-100 text-purple-700 border-purple-200' },
    { value: 'seasonal', label: 'Seasonal', emoji: '🎂', color: 'bg-pink-100 text-pink-700 border-pink-200' },
  ],
  salon: [
    { value: 'popular', label: 'Popular', emoji: '⭐', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
    { value: 'new', label: 'New', emoji: '🆕', color: 'bg-sky-100 text-sky-700 border-sky-200' },
    { value: 'express', label: 'Express', emoji: '⚡', color: 'bg-amber-100 text-amber-700 border-amber-200' },
    { value: 'relaxing', label: 'Relaxing', emoji: '💆', color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
    { value: 'premium', label: 'Premium', emoji: '👑', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  ],
  retail: [
    { value: 'new', label: 'New', emoji: '🆕', color: 'bg-sky-100 text-sky-700 border-sky-200' },
    { value: 'sale', label: 'Sale', emoji: '🔥', color: 'bg-red-100 text-red-700 border-red-200' },
    { value: 'popular', label: 'Popular', emoji: '⭐', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
    { value: 'limited', label: 'Limited', emoji: '📦', color: 'bg-purple-100 text-purple-700 border-purple-200' },
    { value: 'premium', label: 'Premium', emoji: '👑', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  ],
  custom: [
    { value: 'popular', label: 'Popular', emoji: '⭐', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
    { value: 'new', label: 'New', emoji: '🆕', color: 'bg-sky-100 text-sky-700 border-sky-200' },
    { value: 'sale', label: 'Sale', emoji: '🔥', color: 'bg-red-100 text-red-700 border-red-200' },
    { value: 'limited', label: 'Limited', emoji: '⏳', color: 'bg-purple-100 text-purple-700 border-purple-200' },
    { value: 'premium', label: 'Premium', emoji: '👑', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  ],
};

const BUSINESS_MODES = [
  { value: 'restaurant', label: 'Restaurant', emoji: '🍽️', description: 'Table ordering with dine-in experience' },
  { value: 'cafe', label: 'Café', emoji: '☕', description: 'Table or walk-in token ordering' },
  { value: 'bakery', label: 'Bakery', emoji: '🎂', description: 'Walk-in token queue with product showcase' },
  { value: 'salon', label: 'Salon/Spa', emoji: '💆', description: 'Service menu with appointment slots' },
  { value: 'retail', label: 'Retail', emoji: '🛍️', description: 'Product catalog with walk-in token queue' },
  { value: 'custom', label: 'Custom', emoji: '⚙️', description: 'Fully customized for your business' },
];

const LABEL_DEFAULTS = {
  restaurant: { section_name: 'QR Menu', table_name: 'Table', menu_section_title: 'Menu Items', categories_label: 'Categories', add_to_order: 'Add to Order', cart_title: 'Your Order', checkout_hint: 'Share with staff', closed_message: 'We\'re Closed', welcome_message: 'Welcome!' },
  cafe: { section_name: 'Digital Menu', table_name: 'Seat', menu_section_title: 'Our Menu', categories_label: 'Categories', add_to_order: 'Add to Order', cart_title: 'Your Order', checkout_hint: 'Show at counter', closed_message: 'We\'re Closed', welcome_message: 'Welcome!' },
  bakery: { section_name: 'Menu', table_name: 'Queue', menu_section_title: 'Our Products', categories_label: 'Categories', add_to_order: 'Add to Cart', cart_title: 'Your Cart', checkout_hint: 'Show at counter', closed_message: 'Back Soon!', welcome_message: 'Welcome!' },
  salon: { section_name: 'Services', table_name: 'Slot', menu_section_title: 'Our Services', categories_label: 'Service Types', add_to_order: 'Book Now', cart_title: 'Your Booking', checkout_hint: 'Check in at desk', closed_message: 'Back Soon!', welcome_message: 'Welcome!' },
  retail: { section_name: 'Products', table_name: 'Counter', menu_section_title: 'Our Products', categories_label: 'Categories', add_to_order: 'Add to Cart', cart_title: 'Your Cart', checkout_hint: 'Show at counter', closed_message: 'We\'re Closed', welcome_message: 'Welcome!' },
  custom: { section_name: '', table_name: '', menu_section_title: '', categories_label: '', add_to_order: '', cart_title: '', checkout_hint: '', closed_message: '', welcome_message: '' },
};

function compressImage(file) {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      let w = img.width, h = img.height;
      if (w > 720 || h > 720) {
        const ratio = Math.min(720 / w, 720 / h);
        w = Math.round(w * ratio);
        h = Math.round(h * ratio);
      }
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      c.toBlob((blob) => {
        resolve(new File([blob], file.name, { type: 'image/jpeg' }));
        URL.revokeObjectURL(url);
      }, 'image/jpeg', 0.85);
    };
    img.src = url;
  });
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

function MenuItemForm({ item, categories, onClose, onSubmit, isLoading, selectedBotId, badgeOptions, currency = 'MMK' }) {
  const [formData, setFormData] = useState({
    name: item?.name || '',
    description: item?.description || '',
    price: item?.price || '',
    category_id: item?.category_id || '',
    badges: item?.badges || [],
    is_available: item?.is_available !== false,
  });
  const [images, setImages] = useState(() => {
    if (item?.image_url) {
      try {
        const parsed = JSON.parse(item.image_url);
        if (Array.isArray(parsed)) return parsed.map(m => ({ file_id: m.file_id, type: 'photo' }));
      } catch {
        return [{ file_id: item.image_url, type: 'photo' }];
      }
    }
    return [];
  });
  const [uploading, setUploading] = useState(false);
  const fileInputRef = null;
  const [variants, setVariants] = useState(item?.data?.variants || []);
  const [addons, setAddons] = useState(item?.data?.addons || []);
  const [showVariants, setShowVariants] = useState(false);
  const [showAddons, setShowAddons] = useState(false);
  const { addToast } = useToastStore();
  const queryClient = useQueryClient();
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState('🍽️');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showCatDropdown, setShowCatDropdown] = useState(false);
  const [catSearch, setCatSearch] = useState('');

  const CAT_ICONS = ['🍽️','🍚','🍜','🍲','🔥','🥗','🥤','🍮','🥩','🌯','🥟','🍕','🥪','🧆','🫘','🥘','🫕','🥫','🍱','🍛','🦐','🍣','🥓','🧁','☕','🥂','🍺','🍷','🧃','🍹'];

  const createCategoryMutation = useMutation({
    mutationFn: ({ name, icon }) => createQRMenuCategory({ bot_id: Number(selectedBotId), name, icon }),
    onSuccess: () => {
      queryClient.invalidateQueries(['qr-menu-categories', selectedBotId]);
      addToast('Category created');
      setShowNewCategory(false);
      setNewCategoryName('');
      setNewCategoryIcon('🍽️');
    },
    onError: (err) => addToast(err.response?.data?.detail || 'Failed to create category', 'error'),
  });

  const updateCategoryIconMutation = useMutation({
    mutationFn: ({ id, icon }) => updateQRMenuCategory(id, { icon }),
    onSuccess: () => {
      queryClient.invalidateQueries(['qr-menu-categories', selectedBotId]);
    },
    onError: () => addToast('Failed to update icon', 'error'),
  });

  const toggleBadge = (value) => {
    setFormData(prev => ({
      ...prev,
      badges: prev.badges.includes(value)
        ? prev.badges.filter(b => b !== value)
        : [...prev.badges, value],
    }));
  };

  const handleImageUpload = async (e) => {
    const files = e.target.files;
    if (!files?.length) return;
    const remaining = 5 - images.length;
    if (remaining <= 0) {
      addToast('Maximum 5 photos allowed', 'error');
      return;
    }
    const batch = Array.from(files).slice(0, remaining);
    setUploading(true);
    try {
      const results = [];
      for (const file of batch) {
        const compressed = await compressImage(file);
        const res = await uploadImage(compressed, selectedBotId);
        results.push({ file_id: res.file_id, type: 'photo' });
      }
      setImages(prev => [...prev, ...results]);
    } catch {
      addToast('Failed to upload image', 'error');
    } finally {
      setUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      addToast('Please enter a name', 'error');
      return;
    }
    const imageUrl = images.length > 0
      ? JSON.stringify(images.map(img => ({ file_id: img.file_id, type: 'photo' })))
      : null;
    const payload = {
      ...formData,
      bot_id: Number(selectedBotId),
      price: Number(formData.price),
      category_id: formData.category_id ? Number(formData.category_id) : null,
      image_url: imageUrl,
    };
    const hasVariants = variants.length > 0 && variants.some(v => v.options?.length > 0);
    const hasAddons = addons.length > 0;
    if (hasVariants || hasAddons) {
      payload.data = {};
      if (hasVariants) payload.data.variants = variants;
      if (hasAddons) payload.data.addons = addons;
    }
    onSubmit(payload);
  };

  return (
    <div className="p-5">
      <div className="flex justify-center mb-4">
        <div className="w-10 h-1 bg-gray-200 rounded-full" />
      </div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">
          {item ? 'Edit Menu Item' : 'New Menu Item'}
        </h2>
        <button onClick={onClose} className="p-2 bg-gray-100 rounded-full">
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-bold text-gray-700 ml-1">Photos <span className="text-gray-400 font-normal">({images.length}/5)</span></label>
          <div className="flex flex-wrap gap-2">
            {images.map((img, idx) => (
              <div key={img.file_id} className="relative w-20 h-20 bg-gray-50 rounded-2xl border border-gray-200 overflow-hidden group">
                <img
                  src={`${API_BASE}/telegram/file/${encodeURIComponent(img.file_id)}?bot_id=${selectedBotId}`}
                  alt=""
                  className="w-full h-full object-cover"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
                <button
                  type="button"
                  onClick={() => setImages(prev => prev.filter((_, i) => i !== idx))}
                  className="absolute top-0.5 right-0.5 w-5 h-5 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3 text-white" />
                </button>
              </div>
            ))}
            {images.length < 5 && (
              <button
                type="button"
                onClick={() => document.getElementById('menu-image-input')?.click()}
                disabled={uploading}
                className="w-20 h-20 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:border-gray-300 transition-all"
              >
                {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImageUp className="w-6 h-6" />}
              </button>
            )}
          </div>
          <input id="menu-image-input" type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-gray-700 ml-1">Category</label>
          <div className="flex gap-2 items-start">
            <div className="flex-1 relative" style={{ width: '80%' }}>
              <button
                type="button"
                onClick={() => { setShowCatDropdown(!showCatDropdown); setCatSearch(''); }}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none transition-all font-medium text-left flex items-center gap-2"
              >
                {formData.category_id ? (
                  <span className="flex items-center gap-2">
                    <span>{(categories?.find(c => c.id === Number(formData.category_id))?.icon || '📁')}</span>
                    <span>{categories?.find(c => c.id === Number(formData.category_id))?.name || 'Select Category'}</span>
                  </span>
                ) : (
                  <span className="text-gray-400">Select Category</span>
                )}
                <svg className="w-4 h-4 text-gray-400 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M19 9l-7 7-7-7"/></svg>
              </button>
              {showCatDropdown && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowCatDropdown(false)} />
                  <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-2xl shadow-xl z-20 overflow-hidden">
                    <div className="sticky top-0 bg-white border-b border-gray-100 px-3 py-2">
                      <input
                        type="text"
                        value={catSearch}
                        onChange={(e) => setCatSearch(e.target.value)}
                        placeholder="Search categories..."
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                        autoFocus
                      />
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      <button
                        type="button"
                        onClick={() => { setFormData({ ...formData, category_id: '' }); setShowCatDropdown(false); }}
                        className={`w-full text-left px-4 py-3 text-sm hover:bg-orange-50 transition-all flex items-center gap-2 ${!formData.category_id ? 'bg-orange-50 text-orange-600 font-bold' : 'text-gray-500'}`}
                      >
                        None
                      </button>
                      {(categories || []).filter(cat => !catSearch || cat.name.toLowerCase().includes(catSearch.toLowerCase())).map(cat => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => { setFormData({ ...formData, category_id: String(cat.id) }); setShowCatDropdown(false); }}
                          className={`w-full text-left px-4 py-3 text-sm hover:bg-orange-50 transition-all flex items-center gap-2 ${Number(formData.category_id) === cat.id ? 'bg-orange-50 text-orange-600 font-bold' : 'text-gray-700'}`}
                        >
                          <span>{cat.icon || '📁'}</span>
                          <span>{cat.name}</span>
                        </button>
                      ))}
                      {(categories || []).filter(cat => !catSearch || cat.name.toLowerCase().includes(catSearch.toLowerCase())).length === 0 && (
                        <div className="px-4 py-6 text-center text-sm text-gray-400">No categories found</div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className="relative flex-shrink-0" style={{ width: '20%', minWidth: 52 }}>
              {(() => {
                const selectedCat = categories?.find(c => c.id === Number(formData.category_id));
                if (!selectedCat) return (
                  <div className="w-full aspect-square max-h-[46px] bg-gray-50 border border-gray-100 rounded-2xl text-lg flex items-center justify-center text-gray-300">
                    ?
                  </div>
                );
                return (
                  <>
                    <button
                      type="button"
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className="w-full aspect-square max-h-[46px] bg-gray-50 border border-gray-100 rounded-2xl text-xl flex items-center justify-center hover:border-orange-300 transition-all"
                    >
                      {selectedCat.icon || '📁'}
                    </button>
                    {showEmojiPicker && (
                      <div className="absolute bottom-12 right-0 bg-white border border-gray-200 rounded-2xl shadow-xl p-2 z-10 w-64">
                        <div className="grid grid-cols-6 gap-1 max-h-40 overflow-y-auto">
                          {CAT_ICONS.map(emoji => (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => {
                                updateCategoryIconMutation.mutate({ id: selectedCat.id, icon: emoji });
                                setShowEmojiPicker(false);
                              }}
                              className={`w-9 h-9 text-lg flex items-center justify-center rounded-lg hover:bg-orange-50 transition-all ${(selectedCat.icon || '📁') === emoji ? 'bg-orange-100 ring-2 ring-orange-400' : ''}`}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowNewCategory(true)}
            className="text-sm font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1.5 px-1 py-1"
          >
            <FolderPlus className="w-4 h-4" />
            Create New Category
          </button>
          {showNewCategory && (
            <div className="space-y-2 mt-1">
              <div className="flex gap-2 items-center">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="w-10 h-10 bg-gray-50 border border-gray-200 rounded-xl text-xl flex items-center justify-center hover:border-orange-300 transition-all"
                  >
                    {newCategoryIcon}
                  </button>
                  {showEmojiPicker && (
                    <div className="absolute bottom-12 left-0 bg-white border border-gray-200 rounded-2xl shadow-xl p-2 z-10 w-64">
                      <div className="grid grid-cols-6 gap-1 max-h-40 overflow-y-auto">
                        {CAT_ICONS.map(emoji => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => { setNewCategoryIcon(emoji); setShowEmojiPicker(false); }}
                            className={`w-9 h-9 text-lg flex items-center justify-center rounded-lg hover:bg-orange-50 transition-all ${newCategoryIcon === emoji ? 'bg-orange-100 ring-2 ring-orange-400' : ''}`}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Category name"
                  className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => createCategoryMutation.mutate({ name: newCategoryName, icon: newCategoryIcon })}
                  disabled={!newCategoryName.trim() || createCategoryMutation.isPending}
                  className="px-3 py-2 bg-orange-600 text-white text-sm font-bold rounded-xl disabled:opacity-40 hover:bg-orange-700 transition-all"
                >
                  {createCategoryMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowNewCategory(false); setNewCategoryName(''); setNewCategoryIcon('🍽️'); }}
                  className="px-3 py-2 text-gray-500 text-sm font-bold rounded-xl hover:bg-gray-100 transition-all"
                >
                Cancel
              </button>
            </div>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-gray-700 ml-1">Item Name</label>
          <input
            required
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g. Grilled Chicken Burger"
            className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none transition-all font-medium"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-gray-700 ml-1">Price ({currency})</label>
          <input
            required
            type="number"
            value={formData.price}
            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
            placeholder="0"
            className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none transition-all font-medium"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-gray-700 ml-1">Description</label>
          <textarea
            rows={2}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Brief description..."
            className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none transition-all font-medium resize-none"
          />
        </div>

        {/* Variants Section */}
        <div className="bg-gray-50 rounded-2xl border border-gray-100 overflow-hidden">
          <button
            type="button"
            onClick={() => setShowVariants(!showVariants)}
            className="w-full flex items-center justify-between p-3 hover:bg-gray-100/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
              <span className="text-sm font-bold text-gray-700">Variants</span>
              {variants.length > 0 && <span className="text-[10px] font-bold text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded-md">{variants.filter(v => v.options?.length > 0).length} groups</span>}
            </div>
            <svg className={`w-4 h-4 text-gray-400 transition-transform ${showVariants ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M19 9l-7 7-7-7"/></svg>
          </button>
          {showVariants && (
            <div className="px-3 pb-3 border-t border-gray-100 pt-2 space-y-3">
              {variants.map((vg, vi) => (
                <div key={vi} className="bg-white rounded-xl border border-gray-200 p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={vg.group}
                      onChange={(e) => {
                        const next = [...variants];
                        next[vi] = { ...next[vi], group: e.target.value };
                        setVariants(next);
                      }}
                      placeholder="e.g. Size"
                      className="flex-1 px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-orange-500"
                    />
                    <label className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={vg.required !== false}
                        onChange={(e) => {
                          const next = [...variants];
                          next[vi] = { ...next[vi], required: e.target.checked };
                          setVariants(next);
                        }}
                        className="rounded"
                      />
                      Required
                    </label>
                    <button
                      type="button"
                      onClick={() => setVariants(prev => prev.filter((_, i) => i !== vi))}
                      className="p-1 text-gray-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all flex-shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {(vg.options || []).map((opt, oi) => (
                    <div key={oi} className="flex items-center gap-2 ml-2">
                      <input
                        type="text"
                        value={opt.label}
                        onChange={(e) => {
                          const next = [...variants];
                          next[vi].options[oi] = { ...next[vi].options[oi], label: e.target.value };
                          setVariants(next);
                        }}
                        placeholder="Option name"
                        className="flex-1 px-2 py-1.5 bg-gray-50 border border-gray-100 rounded-lg text-xs outline-none focus:ring-2 focus:ring-orange-500"
                      />
                      <div className="relative flex-shrink-0">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 font-bold">+</span>
                        <input
                          type="number"
                          value={opt.price_add ?? ''}
                          onChange={(e) => {
                            const next = [...variants];
                            next[vi].options[oi] = { ...next[vi].options[oi], price_add: Number(e.target.value) };
                            setVariants(next);
                          }}
                          placeholder="0"
                          className="w-20 pl-4 pr-2 py-1.5 bg-gray-50 border border-gray-100 rounded-lg text-xs outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      </div>
                      <span className="text-[10px] text-gray-400 font-bold flex-shrink-0">{currency}</span>
                      <button
                        type="button"
                        onClick={() => {
                          const next = [...variants];
                          next[vi].options = next[vi].options.filter((_, i) => i !== oi);
                          setVariants(next);
                        }}
                        className="p-1 text-gray-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all flex-shrink-0"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      const next = [...variants];
                      next[vi].options = [...(next[vi].options || []), { label: '', price_add: 0 }];
                      setVariants(next);
                    }}
                    className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1 ml-2"
                  >
                    <Plus className="w-3 h-3" />
                    Add Option
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setVariants(prev => [...prev, { group: '', required: true, options: [{ label: '', price_add: 0 }] }])}
                className="w-full py-2 border-2 border-dashed border-gray-200 rounded-xl text-xs font-bold text-gray-500 hover:text-orange-600 hover:border-orange-300 transition-all flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Variant Group
              </button>
            </div>
          )}
        </div>

        {/* Addons Section */}
        <div className="bg-gray-50 rounded-2xl border border-gray-100 overflow-hidden">
          <button
            type="button"
            onClick={() => setShowAddons(!showAddons)}
            className="w-full flex items-center justify-between p-3 hover:bg-gray-100/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/><circle cx="12" cy="12" r="3"/></svg>
              <span className="text-sm font-bold text-gray-700">Add-ons</span>
              {addons.length > 0 && <span className="text-[10px] font-bold text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded-md">{addons.length} items</span>}
            </div>
            <svg className={`w-4 h-4 text-gray-400 transition-transform ${showAddons ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M19 9l-7 7-7-7"/></svg>
          </button>
          {showAddons && (
            <div className="px-3 pb-3 border-t border-gray-100 pt-2 space-y-2">
              {addons.map((ad, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={ad.label}
                    onChange={(e) => {
                      const next = [...addons];
                      next[i] = { ...next[i], label: e.target.value };
                      setAddons(next);
                    }}
                    placeholder="e.g. Extra Shot"
                    className="flex-1 px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <div className="relative flex-shrink-0">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 font-bold">+</span>
                    <input
                      type="number"
                      value={ad.price_add ?? ''}
                      onChange={(e) => {
                        const next = [...addons];
                        next[i] = { ...next[i], price_add: Number(e.target.value) };
                        setAddons(next);
                      }}
                      placeholder="0"
                      className="w-20 pl-4 pr-2 py-1.5 bg-white border border-gray-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <span className="text-[10px] text-gray-400 font-bold flex-shrink-0">{currency}</span>
                  <button
                    type="button"
                    onClick={() => setAddons(prev => prev.filter((_, j) => j !== i))}
                    className="p-1 text-gray-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all flex-shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setAddons(prev => [...prev, { label: '', price_add: 0 }])}
                className="w-full py-2 border-2 border-dashed border-gray-200 rounded-xl text-xs font-bold text-gray-500 hover:text-orange-600 hover:border-orange-300 transition-all flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Add-on
              </button>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-gray-700 ml-1">Dietary Labels</label>
          <div className="flex flex-wrap gap-2">
            {(badgeOptions || []).map(badge => (
              <button
                key={badge.value}
                type="button"
                onClick={() => toggleBadge(badge.value)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                  formData.badges.includes(badge.value)
                    ? badge.color + ' shadow-sm'
                    : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'
                }`}
              >
                {badge.emoji} {badge.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
          <div>
            <p className="text-sm font-bold text-gray-700">Available</p>
            <p className="text-xs text-gray-400">Show this item on the menu</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={formData.is_available}
              onChange={(e) => setFormData({ ...formData, is_available: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-orange-500 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full after:content-[''] after:absolute after:top-0.5 after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" />
          </label>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 bg-gray-100 rounded-xl font-bold text-sm text-gray-700 hover:bg-gray-200 transition-all"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="flex-1 py-3 bg-gradient-to-r from-orange-500 to-amber-500 rounded-xl font-bold text-sm text-white hover:from-orange-600 hover:to-amber-600 transition-all disabled:opacity-50 shadow-lg shadow-orange-200"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : item ? 'Save Changes' : 'Add Item'}
          </button>
        </div>
      </form>
    </div>
  );
}

function DebouncedSettingsInput({ value: initialValue, onSave, placeholder, type = 'text', className = '' }) {
  const [localValue, setLocalValue] = useState(initialValue);
  const [status, setStatus] = useState('idle');
  const savingRef = useRef(false);
  const valRef = useRef(initialValue);
  const onSaveRef = useRef(onSave);

  onSaveRef.current = onSave;

  useEffect(() => {
    if (!savingRef.current) setLocalValue(initialValue);
  }, [initialValue]);

  const doSave = async (val) => {
    savingRef.current = true;
    setStatus('saving');
    try {
      await onSaveRef.current(val);
      setStatus('saved');
      savingRef.current = false;
      setTimeout(() => setStatus('idle'), 2000);
    } catch {
      setStatus('failed');
      savingRef.current = false;
    }
  };

  const handleChange = (e) => {
    const val = e.target.value;
    setLocalValue(val);
    valRef.current = val;
  };

  const handleBlur = () => {
    if (String(valRef.current) !== String(initialValue)) {
      doSave(valRef.current);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.target.blur();
    }
  };

  const borderClass = status === 'saving' ? 'border-blue-400'
    : status === 'saved' ? 'border-green-500'
    : status === 'failed' ? 'border-red-500'
    : 'border-gray-200';

  return (
    <div>
      <input
        type={type}
        value={localValue}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={`bg-white border rounded-xl text-sm focus:ring-2 focus:ring-violet-500 outline-none transition-all ${className} ${borderClass}`}
      />
      {status !== 'idle' && (
        <div className="mt-0.5">
          {status === 'typing' && <span className="text-blue-500 text-xs">Unsaved...</span>}
          {status === 'saving' && <span className="text-blue-500 text-xs">Saving...</span>}
          {status === 'saved' && <span className="text-green-500 text-xs">Saved</span>}
          {status === 'failed' && <span className="text-red-500 text-xs">Failed</span>}
        </div>
      )}
    </div>
  );
}

export default function QRMenuAdmin() {
  const { selectedBotId, selectedBot } = useSelectedBot();
  const currency = selectedBot?.currency || 'MMK';
  const { addToast } = useToastStore();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [isDeleting, setIsDeleting] = useState(null);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [deletingCategory, setDeletingCategory] = useState(null);
  const [confirmDeletingCategory, setConfirmDeletingCategory] = useState(null);
  const [showQrSettings, setShowQrSettings] = useState(false);
  const [paymentMode, setPaymentMode] = useState('postpaid');
  const [togglingPaymentMode, setTogglingPaymentMode] = useState(false);
  const [shopOpen, setShopOpen] = useState(true);
  const [togglingShop, setTogglingShop] = useState(false);
  const [showBannerSection, setShowBannerSection] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const bannerFileRef = useRef(null);
  const [businessMode, setBusinessMode] = useState('restaurant');
  const [qrLabels, setQrLabels] = useState({});
  const [dualModeEnabled, setDualModeEnabled] = useState(false);
  const [showLabelsSection, setShowLabelsSection] = useState(false);
  const [orderFlowMode, setOrderFlowMode] = useState('postpaid');
  const [qrLanding, setQrLanding] = useState({});
  const [showLandingSection, setShowLandingSection] = useState(false);
  const [qrTheme, setQrTheme] = useState('restaurant');
  const [showThemeSection, setShowThemeSection] = useState(false);
  const [themeColors, setThemeColors] = useState({});
  const [pointsSettings, setPointsSettings] = useState({});
  const [showPointsSection, setShowPointsSection] = useState(false);
  const [showCouponSection, setShowCouponSection] = useState(false);
  const [showCustomerSection, setShowCustomerSection] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerDetail, setCustomerDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [adjustPointsAmount, setAdjustPointsAmount] = useState('');
  const [adjustingPoints, setAdjustingPoints] = useState(false);
  // Coupon form state
  const [couponForm, setCouponForm] = useState({ code: '', type: 'percentage', value: '', usage_limit: '0', min_order: '0', expires_at: '' });
  const [showCouponModal, setShowCouponModal] = useState(false);

  const { data: items, isLoading } = useQuery({
    queryKey: ['qr-menu', selectedBotId],
    queryFn: () => getQRMenuItems(selectedBotId),
    enabled: !!selectedBotId,
  });

  const { data: categories } = useQuery({
    queryKey: ['qr-menu-categories', selectedBotId],
    queryFn: () => getQRMenuCategories(selectedBotId),
    enabled: !!selectedBotId,
  });

  const { data: publicSlug } = useQuery({
    queryKey: ['public-slug', selectedBotId],
    queryFn: () => getBotPublicSlug(selectedBotId),
    enabled: !!selectedBotId,
  });

  const { data: contentBlocks } = useQuery({
    queryKey: ['content-blocks', selectedBotId],
    queryFn: () => getContentBlocks({ bot_id: selectedBotId }),
    enabled: !!selectedBotId,
  });

  const menuBannerBlock = contentBlocks?.find(b => b.key === 'menu_banners');
  const menuBanners = menuBannerBlock?.content_data?.banners || [];

  const shopSettingsBlock = contentBlocks?.find(b => b.key === 'shop_settings');
  useEffect(() => {
    if (shopSettingsBlock?.content_data) {
      const cd = shopSettingsBlock.content_data;
      if (cd.payment_mode) setPaymentMode(cd.payment_mode);
      if (cd.business_mode) setBusinessMode(cd.business_mode);
      if (cd.qr_labels) setQrLabels(cd.qr_labels);
      if (cd.dual_mode_enabled !== undefined) setDualModeEnabled(cd.dual_mode_enabled);
      if (cd.order_flow_mode) setOrderFlowMode(cd.order_flow_mode);
      if (cd.qr_landing) setQrLanding(cd.qr_landing);
      if (cd.qr_theme) setQrTheme(cd.qr_theme);
      if (cd.qr_theme_colors) setThemeColors(cd.qr_theme_colors);
      if (cd.points_settings) setPointsSettings(cd.points_settings);
    }
  }, [shopSettingsBlock]);

  const { data: customersList } = useQuery({
    queryKey: ['qr-customers', selectedBotId, customerSearch],
    queryFn: () => getCustomers(selectedBotId, customerSearch),
    enabled: !!selectedBotId && showCustomerSection,
  });

  const { data: coupons } = useQuery({
    queryKey: ['qr-coupons', selectedBotId],
    queryFn: () => getCoupons(selectedBotId),
    enabled: !!selectedBotId && showCouponSection,
  });

  const bannerMutation = useMutation({
    mutationFn: (data) => updateContentBlock(selectedBotId, 'menu_banners', data),
    onSuccess: () => {
      queryClient.invalidateQueries(['content-blocks', selectedBotId]);
      addToast('Menu banner updated');
    },
    onError: () => addToast('Failed to update banner', 'error'),
  });

  const handleBannerUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      addToast('Please select an image file', 'error');
      return;
    }
    setUploadingBanner(true);
    try {
      const result = await uploadImage(file, selectedBotId);
      const newBanners = [...menuBanners, { file_id: result.file_id, order: menuBanners.length }];
      bannerMutation.mutate({ banners: newBanners });
    } catch {
      addToast('Failed to upload image', 'error');
    } finally {
      setUploadingBanner(false);
      if (bannerFileRef.current) bannerFileRef.current.value = '';
    }
  };

  const removeBanner = (index) => {
    const newBanners = menuBanners.filter((_, i) => i !== index).map((b, i) => ({ ...b, order: i }));
    bannerMutation.mutate({ banners: newBanners });
  };

  const shopSettingsMutation = useMutation({
    mutationFn: (data) => updateContentBlock(selectedBotId, 'shop_settings', data),
    onError: () => addToast('Failed to save settings', 'error'),
  });

  const saveShopSettings = (getUpdates) => {
    const cached = queryClient.getQueryData(['content-blocks', selectedBotId]);
    const block = cached?.find(b => b.key === 'shop_settings');
    const current = block?.content_data || {};
    const updates = typeof getUpdates === 'function' ? getUpdates(current) : getUpdates;
    const next = { ...current, ...updates };
    // Update cache directly to avoid disruptive refetch
    queryClient.setQueryData(['content-blocks', selectedBotId], (old) => {
      if (!old) return old;
      return old.map(b => b.key === 'shop_settings' ? { ...b, content_data: next } : b);
    });
    return shopSettingsMutation.mutateAsync(next);
  };

  const paymentModeMutation = useMutation({
    mutationFn: (mode) => client.put('/bots/' + selectedBotId + '/payment-mode', { payment_mode: mode }),
    onSuccess: () => {
      queryClient.invalidateQueries(['content-blocks', selectedBotId]);
    },
    onError: () => addToast('Failed to update payment mode', 'error'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => createQRMenuItem(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['qr-menu', selectedBotId]);
      addToast('Menu item added');
      setIsModalOpen(false);
    },
    onError: (err) => addToast(err.response?.data?.detail || 'Failed to create item', 'error'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateQRMenuItem(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['qr-menu', selectedBotId]);
      addToast('Menu item updated');
      setIsModalOpen(false);
      setEditingItem(null);
    },
    onError: () => addToast('Failed to update item', 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => deleteQRMenuItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['qr-menu', selectedBotId]);
      addToast('Menu item deleted');
      setIsDeleting(null);
    },
    onError: () => addToast('Failed to delete item', 'error'),
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (category) => {
      const itemsInCat = (items || []).filter(i => i.category_id === category.id);
      for (const item of itemsInCat) {
        await deleteQRMenuItem(item.id);
      }
      await deleteQRMenuCategory(category.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['qr-menu', selectedBotId]);
      queryClient.invalidateQueries(['qr-menu-categories', selectedBotId]);
      addToast('Category deleted');
      setDeletingCategory(null);
      setConfirmDeletingCategory(null);
      setSelectedCategoryFilter('');
    },
    onError: () => addToast('Failed to delete category', 'error'),
  });

  const { data: botInfo } = useQuery({
    queryKey: ['bot-info', selectedBotId],
    queryFn: () => client.get('/bots/' + selectedBotId).then(res => res.data),
    enabled: !!selectedBotId,
  });

  useEffect(() => {
    if (botInfo?.is_open !== undefined) setShopOpen(botInfo.is_open);
  }, [botInfo]);

  const toggleShop = async () => {
    setTogglingShop(true);
    try {
      await client.put('/bots/' + selectedBotId + '/shop-status', { is_open: !shopOpen });
      setShopOpen(prev => !prev);
      addToast(shopOpen ? 'Shop closed' : 'Shop opened');
    } catch {
      addToast('Failed to toggle shop status', 'error');
    } finally {
      setTogglingShop(false);
    }
  };

  const filteredItems = (items || []).filter(item => {
    if (selectedCategoryFilter && item.category_id !== Number(selectedCategoryFilter)) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!item.name?.toLowerCase().includes(q) && !item.description?.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const handleEdit = (item) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleDelete = (id) => {
    setIsDeleting(id);
  };

  const qrMenuUrl = publicSlug?.slug
    ? `https://telegramecommerce.shop/${publicSlug.slug}-qr-menu`
    : null;

  if (isLoading) return <LoadingSkeleton type="grid" count={6} />;

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-2xl lg:text-3xl font-bold text-gray-900">QR Menu System</h1>
          <p className="text-xs sm:text-sm italic text-orange-400 mt-1">We're trying hard to improve the user experience with lots of features</p>
        </div>
      </div>

      {/* Toolbar: combined search+category | Orders | QR Menu | New Item */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <div className="relative flex-1 min-w-0">
          <div className="flex items-center bg-white border border-gray-200 rounded-2xl shadow-sm focus-within:ring-2 focus-within:ring-orange-500 transition-all overflow-hidden">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search menu items..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-transparent outline-none text-sm"
              />
            </div>
            <button
              onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
              className="flex items-center gap-1.5 px-3 py-2.5 bg-gray-50 border-l border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-all flex-shrink-0"
            >
              {selectedCategoryFilter
                ? <><span>{categories?.find(c => c.id === Number(selectedCategoryFilter))?.icon || ''}</span><span className="max-w-[80px] truncate">{categories?.find(c => c.id === Number(selectedCategoryFilter))?.name}</span></>
                : <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M4 6h16M4 12h16M4 18h7"/></svg><span className="hidden sm:inline">All</span></>
              }
              <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M19 9l-7 7-7-7"/></svg>
            </button>
          </div>
          {showCategoryDropdown && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowCategoryDropdown(false)} />
              <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-2xl shadow-xl z-20 overflow-hidden min-w-[200px]">
                <button
                  onClick={() => { setSelectedCategoryFilter(''); setShowCategoryDropdown(false); }}
                  className={`w-full text-left px-4 py-3 text-sm hover:bg-orange-50 transition-all flex items-center gap-2 ${!selectedCategoryFilter ? 'bg-orange-50 text-orange-600 font-bold' : 'text-gray-500'}`}
                >
                  All Categories
                </button>
                {(categories || []).map(cat => (
                  <div key={cat.id} className="flex items-center group">
                    <button
                      onClick={() => { setSelectedCategoryFilter(String(cat.id)); setShowCategoryDropdown(false); }}
                      className={`flex-1 text-left px-4 py-3 text-sm hover:bg-orange-50 transition-all ${Number(selectedCategoryFilter) === cat.id ? 'bg-orange-50 text-orange-600 font-bold' : 'text-gray-700'}`}
                    >
                      {cat.icon && <span className="mr-1.5">{cat.icon}</span>}
                      {cat.name}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setShowCategoryDropdown(false); setDeletingCategory(cat); }}
                      className="p-2 mr-1 text-gray-400 hover:text-rose-500 transition-all hover:bg-rose-50 rounded-lg"
                      title="Delete category"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.location.href = '/qr-menu/orders'}
            className="flex-1 sm:flex-none px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-2xl shadow-sm hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600 transition-all flex items-center justify-center gap-2 active:scale-95 font-bold text-sm"
          >
            <ClipboardList className="w-5 h-5" />
            <span className="hidden sm:inline">Orders</span>
          </button>
          <button
            onClick={() => { setShowCustomerSection(!showCustomerSection); setShowQrSettings(false); }}
            className={`flex-1 sm:flex-none px-4 py-2.5 border rounded-2xl shadow-sm transition-all flex items-center justify-center gap-2 active:scale-95 font-bold text-sm ${
              showCustomerSection
                ? 'bg-violet-50 border-violet-200 text-violet-700'
                : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Users className="w-5 h-5" />
            <span className="hidden sm:inline">Customers</span>
          </button>
          <button
            onClick={() => setShowQrSettings(true)}
            className="flex-1 sm:flex-none px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-2xl shadow-sm hover:bg-gray-50 transition-all flex items-center justify-center gap-2 active:scale-95 font-bold text-sm"
          >
            <QrCode className="w-5 h-5" />
            <span className="hidden sm:inline">QR Menu</span>
          </button>
          <button
            onClick={() => { setEditingItem(null); setIsModalOpen(true); }}
            className="flex-1 sm:flex-none px-4 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-2xl shadow-lg hover:from-orange-600 hover:to-amber-600 transition-all flex items-center justify-center gap-2 active:scale-95 font-bold text-sm"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">New Item</span>
          </button>
        </div>
      </div>

      {/* Menu Banner */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <button
          onClick={() => setShowBannerSection(!showBannerSection)}
          className="w-full flex items-center justify-between p-3 sm:p-4 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
              <ImageUp className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="text-left">
              <p className="text-sm sm:text-base font-bold text-gray-900">Menu Banner</p>
              <p className="text-xs text-gray-400">{menuBanners.length} image{menuBanners.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <svg className={`w-5 h-5 text-gray-400 transition-transform ${showBannerSection ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M19 9l-7 7-7-7"/></svg>
        </button>
        {showBannerSection && (
          <div className="px-3 sm:px-4 pb-4 border-t border-gray-100 pt-3">
            {menuBanners.length > 0 && (
              <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-none">
                {menuBanners.map((banner, i) => {
                  const url = `${API_BASE}/telegram/file/${encodeURIComponent(banner.file_id)}?bot_id=${selectedBotId}`;
                  return (
                    <div key={i} className="relative flex-shrink-0 w-48 sm:w-56 aspect-[3/1] rounded-xl overflow-hidden bg-gray-100 group">
                      <img src={url} alt={`Banner ${i + 1}`} className="w-full h-full object-cover" />
                      <button
                        onClick={() => removeBanner(i)}
                        className="absolute top-1.5 right-1.5 p-1.5 bg-black/50 backdrop-blur-sm rounded-lg text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/80"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="flex items-center gap-3">
              <button
                onClick={() => bannerFileRef.current?.click()}
                disabled={uploadingBanner}
                className="px-4 py-2.5 bg-orange-50 text-orange-600 border border-orange-200 rounded-xl hover:bg-orange-100 transition-all font-bold text-xs flex items-center gap-2 disabled:opacity-50"
              >
                {uploadingBanner ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageUp className="w-4 h-4" />}
                {uploadingBanner ? 'Uploading...' : 'Add Banner'}
              </button>
              <span className="text-[10px] text-gray-400">Recommended: 1200 × 400 px</span>
            </div>
            <input ref={bannerFileRef} type="file" accept="image/*" className="hidden" onChange={handleBannerUpload} />
          </div>
        )}
      </div>

      {filteredItems.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-gray-200">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Utensils className="w-8 h-8 text-gray-300" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">No menu items yet</h3>
          <p className="text-sm text-gray-500 max-w-xs mx-auto mt-1">
            {search ? "Try a different search term." : "Add your first menu item to start building your QR menu."}
          </p>
          {!search && (
            <button
              onClick={() => { setEditingItem(null); setIsModalOpen(true); }}
              className="mt-6 px-6 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold rounded-xl hover:from-orange-600 hover:to-amber-600 transition-all shadow-lg shadow-orange-200"
            >
              Add Your First Item
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-6 lg:gap-8">
          {filteredItems.map(item => {
            const activeBadges = BUSINESS_BADGES[businessMode] || BUSINESS_BADGES.restaurant;
            const itemBadges = activeBadges.filter(b => item.badges?.includes(b.value));
            const itemImages = getItemImageUrls(item.image_url, selectedBotId);
            return (
              <motion.div
                layout
                key={item.id}
                className="bg-white rounded-2xl md:rounded-3xl shadow-sm border border-gray-100 overflow-hidden hover:border-orange-200 hover:shadow-md transition-all group"
              >
                <div className="aspect-[4/3] md:aspect-square bg-gray-50 relative overflow-hidden">
                  {itemImages[0] ? (
                    <img
                      src={itemImages[0]}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                    />
                  ) : null}
                  <div className="w-full h-full items-center justify-center text-gray-300"
                    style={{ display: itemImages[0] ? 'none' : 'flex' }}
                  >
                    <Utensils className="w-10 h-10 md:w-12 md:h-12" />
                  </div>
                  {itemImages.length > 1 && (
                    <div className="absolute top-2 right-2 md:top-3 md:right-3 flex gap-1">
                      <span className="px-1.5 py-0.5 bg-white/90 backdrop-blur-sm rounded-md text-[9px] font-bold text-gray-600 shadow-xs flex items-center gap-1">
                        <Package className="w-2.5 h-2.5" />
                        {itemImages.length}
                      </span>
                    </div>
                  )}
                  <div className={`absolute top-2 right-2 md:top-3 md:right-3 flex gap-1.5 ${itemImages.length > 1 ? 'top-8 md:top-12' : ''}`}>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleEdit(item); }}
                      className="p-1.5 md:p-2 bg-white/90 backdrop-blur-sm rounded-lg md:rounded-xl shadow-sm text-gray-600 hover:text-indigo-600 transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                      className="p-1.5 md:p-2 bg-white/90 backdrop-blur-sm rounded-lg md:rounded-xl shadow-sm text-gray-600 hover:text-rose-600 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    </button>
                  </div>
                  <div className="absolute top-2 left-2 md:top-3 md:left-3">
                    <span className={`px-1.5 py-0.5 rounded-md text-[8px] md:text-[10px] font-bold uppercase tracking-wider ${
                      item.is_available !== false
                        ? 'bg-emerald-500 text-white'
                        : 'bg-gray-400 text-white'
                    }`}>
                      {item.is_available !== false ? 'Available' : 'Unavailable'}
                    </span>
                  </div>
                </div>
                <div className="p-3 md:p-4 lg:p-5">
                  {itemBadges.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-1.5">
                      {itemBadges.map(b => (
                        <span key={b.value} className={`text-[9px] px-1.5 py-0.5 rounded-md border ${b.color}`}>
                          {b.emoji}
                        </span>
                      ))}
                    </div>
                  )}
                  <h3 className="font-bold text-gray-900 text-sm md:text-base lg:text-lg line-clamp-1">{item.name}</h3>
                  {item.description && (
                    <p className="text-[10px] md:text-xs text-gray-400 line-clamp-2 mt-0.5">{item.description}</p>
                  )}
                  <p className="font-bold text-orange-600 text-sm md:text-base lg:text-lg mt-1.5">
                    {formatPrice(Number(item.price), selectedBot?.currency || 'MMK')}
                  </p>
                  {item.category_id && (
                    <div className="flex items-center gap-1.5 mt-1 text-[8px] md:text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                      <Tag className="w-2.5 h-2.5" />
                      <span className="truncate">{categories?.find(c => c.id === item.category_id)?.name || 'Uncategorized'}</span>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Customers Section */}
      {showCustomerSection && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-gray-900">Customers</h3>
              <button
                onClick={() => setShowCustomerSection(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by phone or name..."
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-violet-500 outline-none"
              />
            </div>
          </div>
          <div className="divide-y divide-gray-50 max-h-[400px] overflow-y-auto">
            {!customersList || customersList.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No customers found</p>
            ) : (
              customersList.map(c => (
                <div
                  key={c.id}
                  onClick={async () => {
                    setSelectedCustomer(c);
                    setCustomerDetail(null);
                    setAdjustPointsAmount('');
                    setDetailLoading(true);
                    try {
                      const detail = await getCustomerDetail(c.id, selectedBotId);
                      setCustomerDetail(detail);
                    } catch (e) {
                      addToast('Failed to load customer detail', 'error');
                    } finally {
                      setDetailLoading(false);
                    }
                  }}
                  className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-gray-900">{c.name || 'Unknown'}</p>
                      <p className="text-xs text-gray-500">{c.phone}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-violet-600">{c.points_balance} pts</p>
                      <p className="text-xs text-gray-500">{c.total_orders} orders</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <AnimatePresence>
        {isModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[32px] z-[60] max-h-[85svh] overflow-y-auto md:max-w-xl md:mx-auto md:top-1/2 md:-translate-y-1/2 md:bottom-auto md:max-h-[90vh] md:rounded-[32px] md:shadow-2xl"
            >
              <MenuItemForm
                item={editingItem}
                categories={categories}
                selectedBotId={selectedBotId}
                badgeOptions={BUSINESS_BADGES[businessMode] || BUSINESS_BADGES.restaurant}
                currency={currency}
                onClose={() => setIsModalOpen(false)}
                onSubmit={(data) => {
                  if (editingItem) {
                    updateMutation.mutate({ id: editingItem.id, data });
                  } else {
                    createMutation.mutate(data);
                  }
                }}
                isLoading={createMutation.isPending || updateMutation.isPending}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Coupon Create Modal */}
      <AnimatePresence>
        {showCouponModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCouponModal(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[70]"
            />
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[32px] z-[80] max-h-[85svh] overflow-y-auto md:max-w-lg md:mx-auto md:top-1/2 md:-translate-y-1/2 md:bottom-auto md:max-h-[90vh] md:rounded-[32px] md:shadow-2xl"
            >
              <div className="p-5">
                <div className="flex justify-center mb-4 md:hidden">
                  <div className="w-10 h-1 bg-gray-200 rounded-full" />
                </div>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
                      <Ticket className="w-5 h-5" />
                    </div>
                    <h2 className="text-lg font-bold text-gray-900">New Coupon</h2>
                  </div>
                  <button onClick={() => setShowCouponModal(false)} className="p-2 bg-gray-100 rounded-full">
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-gray-500 mb-1 block">Coupon Code</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={couponForm.code}
                        onChange={(e) => setCouponForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                        placeholder="e.g. WELCOME10"
                        className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-violet-500 outline-none uppercase"
                      />
                      <button
                        onClick={() => setCouponForm(f => ({ ...f, code: Math.random().toString(36).substring(2, 8).toUpperCase() }))}
                        className="px-3 py-2 bg-gray-100 border border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-200 transition-all"
                      >
                        <Sparkles className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 mb-1 block">Discount Type</label>
                    <div className="flex gap-2">
                      {[
                        { value: 'percentage', label: '% Off', icon: Percent },
                        { value: 'fixed', label: 'Fixed', icon: Hash },
                      ].map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => setCouponForm(f => ({ ...f, type: opt.value }))}
                          className={`flex-1 p-2.5 rounded-xl border-2 text-center transition-all flex items-center justify-center gap-1.5 ${
                            couponForm.type === opt.value
                              ? 'border-violet-500 bg-violet-50'
                              : 'border-gray-100 bg-white'
                          }`}
                        >
                          <opt.icon className={`w-4 h-4 ${couponForm.type === opt.value ? 'text-violet-600' : 'text-gray-400'}`} />
                          <span className={`text-sm font-bold ${couponForm.type === opt.value ? 'text-violet-700' : 'text-gray-600'}`}>{opt.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 mb-1 block">
                      {couponForm.type === 'percentage' ? 'Discount %' : `Discount Amount (${selectedBot?.currency || 'MMK'})`}
                    </label>
                    <input
                      type="number"
                      value={couponForm.value}
                      onChange={(e) => setCouponForm(f => ({ ...f, value: e.target.value }))}
                      placeholder={couponForm.type === 'percentage' ? '10' : '5000'}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-violet-500 outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-gray-500 mb-1 block">Usage Limit</label>
                      <select
                        value={couponForm.usage_limit}
                        onChange={(e) => setCouponForm(f => ({ ...f, usage_limit: e.target.value }))}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-violet-500 outline-none"
                      >
                        <option value="0">Unlimited</option>
                        <option value="10">10 uses</option>
                        <option value="50">50 uses</option>
                        <option value="100">100 uses</option>
                        <option value="500">500 uses</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-500 mb-1 block">Min. Order</label>
                      <input
                        type="number"
                        value={couponForm.min_order}
                        onChange={(e) => setCouponForm(f => ({ ...f, min_order: e.target.value }))}
                        placeholder="0"
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-violet-500 outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 mb-1 block">Expiry Date</label>
                    <input
                      type="date"
                      value={couponForm.expires_at}
                      onChange={(e) => setCouponForm(f => ({ ...f, expires_at: e.target.value }))}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-violet-500 outline-none"
                    />
                  </div>
                  <button
                    onClick={async () => {
                      if (!couponForm.code || !couponForm.value) { addToast('Code and value required', 'error'); return; }
                      try {
                        await createCoupon({
                          bot_id: selectedBotId,
                          code: couponForm.code,
                          type: couponForm.type,
                          value: Number(couponForm.value),
                          usage_limit: Number(couponForm.usage_limit),
                          min_order: Number(couponForm.min_order),
                          expires_at: couponForm.expires_at || null,
                        });
                        queryClient.invalidateQueries(['qr-coupons', selectedBotId]);
                        addToast('Coupon created');
                        setShowCouponModal(false);
                      } catch (e) {
                        addToast(e.response?.data?.detail || 'Failed to create coupon', 'error');
                      }
                    }}
                    className="w-full py-3 bg-gradient-to-r from-violet-500 to-indigo-500 text-white rounded-2xl font-bold hover:from-violet-600 hover:to-indigo-600 transition-all active:scale-[0.97]"
                  >
                    Create Coupon
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Customer Detail Modal */}
      <AnimatePresence>
        {selectedCustomer && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedCustomer(null)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[32px] z-[60] max-h-[85svh] overflow-y-auto md:max-w-lg md:mx-auto md:top-1/2 md:-translate-y-1/2 md:bottom-auto md:max-h-[90vh] md:rounded-[32px] md:shadow-2xl"
            >
              <div className="p-5">
                <div className="flex justify-center mb-4 md:hidden">
                  <div className="w-10 h-1 bg-gray-200 rounded-full" />
                </div>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
                      <User className="w-5 h-5" />
                    </div>
                    <h2 className="text-lg font-bold text-gray-900">Customer Detail</h2>
                  </div>
                  <button onClick={() => setSelectedCustomer(null)} className="p-2 bg-gray-100 rounded-full">
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>

                {detailLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
                  </div>
                ) : customerDetail ? (
                  <>
                    {/* Customer Info */}
                    <div className="bg-gray-50 rounded-2xl p-4 mb-5">
                      <p className="text-sm font-bold text-gray-900 mb-1">{customerDetail.name || 'Unknown'}</p>
                      <p className="text-sm text-gray-500 mb-3">{customerDetail.phone}</p>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-white rounded-xl p-3 text-center">
                          <p className="text-lg font-bold text-amber-500">{customerDetail.points_balance ?? 0}</p>
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Points</p>
                        </div>
                        <div className="bg-white rounded-xl p-3 text-center">
                          <p className="text-lg font-bold text-violet-600">{customerDetail.total_orders ?? 0}</p>
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Orders</p>
                        </div>
                        <div className="bg-white rounded-xl p-3 text-center">
                          <p className="text-lg font-bold text-green-600">{formatPrice(customerDetail.total_spent ?? 0, currency)}</p>
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Spent</p>
                        </div>
                      </div>
                    </div>

                    {/* Order History */}
                    <div className="mb-5">
                      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Order History</h3>
                      {customerDetail.orders && customerDetail.orders.length > 0 ? (
                        <div className="space-y-2">
                          {customerDetail.orders.map((order, idx) => (
                            <div key={order.id || idx} className="flex items-center justify-between bg-gray-50 rounded-xl p-3">
                              <div className="flex items-center gap-2.5">
                                <span className="text-base">{order.channel === 'store' ? '\u{1F3EA}' : '\u{1F4F1}'}</span>
                                <div>
                                  <p className="text-sm font-bold text-gray-900">{formatPrice(Number(order.total), selectedBot?.currency || 'MMK')}</p>
                                  <p className="text-[10px] text-gray-400">{new Date(order.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</p>
                                </div>
                              </div>
                              <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${order.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                {order.channel === 'store' ? 'Store' : 'Online'}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-400 text-center py-4">No orders yet</p>
                      )}
                    </div>

                    {/* Adjust Points */}
                    <div>
                      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Adjust Points</h3>
                      <div className="flex gap-2 mb-2">
                        <button
                          onClick={async () => {
                            setAdjustingPoints(true);
                            try {
                              await adjustCustomerPoints(customerDetail.id, selectedBotId, 100, 'Admin adjustment +100');
                              queryClient.invalidateQueries(['qr-customers', selectedBotId]);
                              const updated = await getCustomerDetail(customerDetail.id, selectedBotId);
                              setCustomerDetail(updated);
                              addToast('Added 100 points');
                            } catch (e) {
                              addToast(e.response?.data?.detail || 'Failed to adjust points', 'error');
                            } finally {
                              setAdjustingPoints(false);
                            }
                          }}
                          disabled={adjustingPoints}
                          className="flex-1 py-2.5 bg-emerald-50 text-emerald-700 font-bold text-sm rounded-xl border border-emerald-200 hover:bg-emerald-100 transition-all active:scale-[0.97] disabled:opacity-50"
                        >
                          +100
                        </button>
                        <button
                          onClick={async () => {
                            setAdjustingPoints(true);
                            try {
                              await adjustCustomerPoints(customerDetail.id, selectedBotId, -100, 'Admin adjustment -100');
                              queryClient.invalidateQueries(['qr-customers', selectedBotId]);
                              const updated = await getCustomerDetail(customerDetail.id, selectedBotId);
                              setCustomerDetail(updated);
                              addToast('Deducted 100 points');
                            } catch (e) {
                              addToast(e.response?.data?.detail || 'Failed to adjust points', 'error');
                            } finally {
                              setAdjustingPoints(false);
                            }
                          }}
                          disabled={adjustingPoints}
                          className="flex-1 py-2.5 bg-red-50 text-red-700 font-bold text-sm rounded-xl border border-red-200 hover:bg-red-100 transition-all active:scale-[0.97] disabled:opacity-50"
                        >
                          -100
                        </button>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          value={adjustPointsAmount}
                          onChange={(e) => setAdjustPointsAmount(e.target.value)}
                          placeholder="Custom amount..."
                          className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-violet-500 outline-none"
                        />
                        <button
                          onClick={async () => {
                            const amount = parseInt(adjustPointsAmount);
                            if (isNaN(amount) || amount === 0) { addToast('Enter a valid amount', 'error'); return; }
                            setAdjustingPoints(true);
                            try {
                              await adjustCustomerPoints(customerDetail.id, selectedBotId, amount, `Admin adjustment ${amount > 0 ? '+' : ''}${amount}`);
                              queryClient.invalidateQueries(['qr-customers', selectedBotId]);
                              const updated = await getCustomerDetail(customerDetail.id, selectedBotId);
                              setCustomerDetail(updated);
                              addToast(`Adjusted ${amount > 0 ? '+' : ''}${amount} points`);
                              setAdjustPointsAmount('');
                            } catch (e) {
                              addToast(e.response?.data?.detail || 'Failed to adjust points', 'error');
                            } finally {
                              setAdjustingPoints(false);
                            }
                          }}
                          disabled={adjustingPoints || !adjustPointsAmount}
                          className="px-5 py-2.5 bg-gradient-to-r from-violet-500 to-indigo-500 text-white font-bold text-sm rounded-xl hover:from-violet-600 hover:to-indigo-600 transition-all active:scale-[0.97] disabled:opacity-50"
                        >
                          {adjustingPoints ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Apply'}
                        </button>
                      </div>
                    </div>
                  </>
                ) : null}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={!!isDeleting}
        onClose={() => setIsDeleting(null)}
        onConfirm={() => { if (isDeleting) deleteMutation.mutate(isDeleting); }}
        title="Delete Menu Item"
        message="Are you sure you want to delete this menu item? This action cannot be undone."
        confirmText="Delete"
        variant="danger"
        loading={deleteMutation.isPending}
      />

      {/* Category delete - step 1 */}
      <ConfirmDialog
        open={!!deletingCategory}
        onClose={() => setDeletingCategory(null)}
        onConfirm={() => { setConfirmDeletingCategory(deletingCategory); setDeletingCategory(null); }}
        title={`Delete "${deletingCategory?.name}"?`}
        message={`Are you sure you want to delete this category?`}
        confirmText="Delete Category"
        variant="danger"
      />

      {/* Category delete - step 2 */}
      <ConfirmDialog
        open={!!confirmDeletingCategory}
        onClose={() => setConfirmDeletingCategory(null)}
        onConfirm={() => { if (confirmDeletingCategory) deleteCategoryMutation.mutate(confirmDeletingCategory); }}
        title="This cannot be undone"
        message={`This will permanently delete "${confirmDeletingCategory?.name}" and all ${(items || []).filter(i => i.category_id === confirmDeletingCategory?.id).length} items inside it. Are you absolutely sure?`}
        confirmText="Yes, delete everything"
        variant="danger"
        loading={deleteCategoryMutation.isPending}
      />

      <AnimatePresence>
        {showQrSettings && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowQrSettings(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[32px] z-[60] max-h-[85svh] overflow-y-auto md:max-w-lg md:mx-auto md:top-1/2 md:-translate-y-1/2 md:bottom-auto md:max-h-[90vh] md:rounded-[32px] md:shadow-2xl"
            >
              <div className="p-5">
                <div className="flex justify-center mb-4">
                  <div className="w-10 h-1 bg-gray-200 rounded-full" />
                </div>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                      <QrCode className="w-5 h-5" />
                    </div>
                    <h2 className="text-lg font-bold text-gray-900">QR Menu Settings</h2>
                  </div>
                  <button onClick={() => setShowQrSettings(false)} className="p-2 bg-gray-100 rounded-full">
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Business Mode */}
                  <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                    <p className="text-xs font-bold text-gray-500 mb-3">Business Type</p>
                    <div className="grid grid-cols-3 gap-2">
                      {BUSINESS_MODES.map(mode => (
                        <button
                          key={mode.value}
                          onClick={() => {
                            setBusinessMode(mode.value);
                            const defaults = LABEL_DEFAULTS[mode.value] || {};
                            setQrLabels(prev => ({ ...prev, ...defaults }));
                            saveShopSettings({ business_mode: mode.value, qr_labels: { ...qrLabels, ...defaults } });
                          }}
                          className={`p-2.5 rounded-xl border-2 text-center transition-all ${
                            businessMode === mode.value
                              ? 'border-violet-500 bg-violet-50 shadow-sm'
                              : 'border-gray-100 bg-white hover:border-gray-200'
                          }`}
                        >
                          <span className="text-xl block">{mode.emoji}</span>
                          <span className="text-[10px] font-bold mt-0.5 block leading-tight">{mode.label}</span>
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-gray-400 italic mt-2">
                      {BUSINESS_MODES.find(m => m.value === businessMode)?.description}
                    </p>
                  </div>

                  {/* Visual Theme */}
                  <div className="bg-gray-50 rounded-2xl border border-gray-100 overflow-hidden">
                    <button
                      onClick={() => setShowThemeSection(!showThemeSection)}
                      className="w-full flex items-center justify-between p-4 hover:bg-gray-100/50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Palette className="w-4 h-4 text-gray-500" />
                        <span className="text-sm font-bold text-gray-700">Visual Theme</span>
                      </div>
                      <svg className={`w-4 h-4 text-gray-400 transition-transform ${showThemeSection ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M19 9l-7 7-7-7"/></svg>
                    </button>
                    {showThemeSection && (
                      <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-3">
                        <div className="grid grid-cols-3 gap-2">
                          {Object.values(BUSINESS_THEMES).map(theme => (
                            <button
                              key={theme.id}
                              onClick={() => {
                                setQrTheme(theme.id);
                                saveShopSettings({ qr_theme: theme.id });
                              }}
                              className={`p-2.5 rounded-xl border-2 text-center transition-all ${
                                qrTheme === theme.id
                                  ? 'border-violet-500 bg-violet-50 shadow-sm'
                                  : 'border-gray-100 bg-white hover:border-gray-200'
                              }`}
                            >
                              <div className="h-6 rounded-lg mb-1.5" style={{ background: theme.preview }} />
                              <span className="text-[10px] font-bold block leading-tight">{theme.name}</span>
                            </button>
                          ))}
                        </div>
                        {qrTheme === 'custom' && (
                          <div className="space-y-2 pt-2 border-t border-gray-200">
                            <p className="text-[10px] font-bold text-gray-500">Custom Colors</p>
                            <div className="grid grid-cols-2 gap-2">
                              {['primary', 'secondary', 'accent', 'background'].map(key => (
                                <div key={key}>
                                  <label className="text-[9px] font-bold text-gray-400 block mb-0.5 capitalize">{key}</label>
                                  <input
                                    type="color"
                                    value={themeColors[key] || BUSINESS_THEMES.custom[key] || '#4f46e5'}
                                    onChange={(e) => {
                                      const next = { ...themeColors, [key]: e.target.value };
                                      setThemeColors(next);
                                      saveShopSettings({ qr_theme_colors: next });
                                    }}
                                    className="w-full h-8 rounded-lg border border-gray-200 cursor-pointer"
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Custom Labels */}
                  <div className="bg-gray-50 rounded-2xl border border-gray-100 overflow-hidden">
                    <button
                      onClick={() => setShowLabelsSection(!showLabelsSection)}
                      className="w-full flex items-center justify-between p-4 hover:bg-gray-100/50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>
                        <span className="text-sm font-bold text-gray-700">Custom Labels</span>
                      </div>
                      <svg className={`w-4 h-4 text-gray-400 transition-transform ${showLabelsSection ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M19 9l-7 7-7-7"/></svg>
                    </button>
                    {showLabelsSection && (
                      <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-3">
                        {[
                          { key: 'section_name', label: 'Section Name', placeholder: 'e.g. Digital Menu' },
                          { key: 'table_name', label: 'Table/Slot Name', placeholder: 'e.g. Table' },
                          { key: 'menu_section_title', label: 'Menu Section Title', placeholder: 'e.g. Menu Items' },
                          { key: 'categories_label', label: 'Categories Label', placeholder: 'e.g. Categories' },
                          { key: 'add_to_order', label: 'Add to Order Button', placeholder: 'e.g. Add to Order' },
                          { key: 'cart_title', label: 'Cart Title', placeholder: 'e.g. Your Order' },
                          { key: 'checkout_hint', label: 'Checkout Hint Text', placeholder: 'e.g. Share with staff' },
                          { key: 'closed_message', label: 'Closed Message', placeholder: 'e.g. We\'re Closed' },
                          { key: 'welcome_message', label: 'Welcome Message', placeholder: 'e.g. Welcome!' },
                        ].map(field => (
                          <div key={field.key}>
                            <label className="text-[11px] font-bold text-gray-500 mb-1 block">{field.label}</label>
                            <DebouncedSettingsInput
                              value={qrLabels[field.key] || ''}
                              onSave={(val) => saveShopSettings((c) => ({ qr_labels: { ...(c.qr_labels || {}), [field.key]: val } }))}
                              placeholder={field.placeholder}
                              className="w-full px-3 py-2"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Dual Mode Toggle */}
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <div>
                      <p className="text-sm font-bold text-gray-900">Dual Mode</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Let customers choose between Table or Token on scan
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setDualModeEnabled(!dualModeEnabled);
                        saveShopSettings({ dual_mode_enabled: !dualModeEnabled });
                      }}
                      className={`relative w-14 h-7 rounded-full transition-all ${
                        dualModeEnabled ? 'bg-violet-500' : 'bg-gray-300'
                      }`}
                    >
                      <div className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-sm transition-all ${
                        dualModeEnabled ? 'left-7' : 'left-0.5'
                      }`} />
                    </button>
                  </div>

                  {/* Open/Close Shop */}
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <div>
                      <p className="text-sm font-bold text-gray-900">
                        {shopOpen ? 'Shop is Open' : 'Shop is Closed'}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {shopOpen
                          ? 'Customers can view and order from your menu'
                          : 'Customers will see a "Shop Closed" message'}
                      </p>
                    </div>
                    <button
                      onClick={toggleShop}
                      disabled={togglingShop}
                      className={`relative w-14 h-7 rounded-full transition-all ${
                        shopOpen ? 'bg-emerald-500' : 'bg-gray-300'
                      }`}
                    >
                      <div className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-sm transition-all ${
                        shopOpen ? 'left-7' : 'left-0.5'
                      }`} />
                    </button>
                  </div>

                  {/* Order Flow Mode */}
                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <p className="text-xs font-bold text-gray-500 mb-3">Order Flow Mode</p>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { value: 'prepaid', label: 'Prepaid', icon: '💳', desc: 'Pay first, then serve' },
                        { value: 'postpaid', label: 'Postpaid', icon: '⏰', desc: 'Order now, pay later' },
                        { value: 'browse_only', label: 'Browse Only', icon: '👁️', desc: 'Menu viewing only' },
                        { value: 'token_browse', label: 'Token + Browse', icon: '🎫', desc: 'Get token, pre-select' },
                      ].map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => {
                            setOrderFlowMode(opt.value);
                            if (opt.value === 'prepaid' || opt.value === 'postpaid') {
                              setPaymentMode(opt.value);
                              paymentModeMutation.mutate(opt.value);
                            }
                            saveShopSettings({ order_flow_mode: opt.value, payment_mode: opt.value === 'prepaid' || opt.value === 'postpaid' ? opt.value : paymentMode });
                          }}
                          className={`p-3 rounded-xl border-2 text-center transition-all ${
                            orderFlowMode === opt.value
                              ? 'border-violet-500 bg-violet-50 shadow-sm'
                              : 'border-gray-100 bg-white hover:border-gray-200'
                          }`}
                        >
                          <span className="text-xl block">{opt.icon}</span>
                          <span className="text-[11px] font-bold mt-1 block leading-tight">{opt.label}</span>
                          <span className="text-[9px] text-gray-400 mt-0.5 block">{opt.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Landing Page */}
                  <div className="bg-gray-50 rounded-2xl border border-gray-100 overflow-hidden">
                    <button
                      onClick={() => setShowLandingSection(!showLandingSection)}
                      className="w-full flex items-center justify-between p-4 hover:bg-gray-100/50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><path d="M3 9h18M9 21V9"/></svg>
                        <span className="text-sm font-bold text-gray-700">Landing Page</span>
                      </div>
                      <svg className={`w-4 h-4 text-gray-400 transition-transform ${showLandingSection ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M19 9l-7 7-7-7"/></svg>
                    </button>
                    {showLandingSection && (
                      <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-3">
                        <div>
                          <label className="text-[11px] font-bold text-gray-500 mb-1 block">Welcome Message</label>
                          <DebouncedSettingsInput
                            value={qrLanding?.welcome_message || ''}
                            onSave={(val) => saveShopSettings((c) => ({ qr_landing: { ...(c.qr_landing || {}), welcome_message: val } }))}
                            placeholder="Welcome! Browse our menu below"
                            className="w-full px-3 py-2"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-bold text-gray-500 mb-1 block">Announcement</label>
                          <DebouncedSettingsInput
                            value={qrLanding?.announcement || ''}
                            onSave={(val) => saveShopSettings((c) => ({ qr_landing: { ...(c.qr_landing || {}), announcement: val } }))}
                            placeholder="Today's Special: 10% off all drinks!"
                            className="w-full px-3 py-2"
                          />
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-gray-500">Show announcement</span>
                            <button
                              onClick={() => {
                                const next = { ...qrLanding, announcement_enabled: !qrLanding?.announcement_enabled };
                                setQrLanding(next);
                                saveShopSettings({ qr_landing: next });
                              }}
                              className={`relative w-11 h-6 rounded-full transition-all ${
                                qrLanding?.announcement_enabled ? 'bg-violet-500' : 'bg-gray-300'
                              }`}
                            >
                              <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-all ${
                                qrLanding?.announcement_enabled ? 'left-5' : 'left-0.5'
                              }`} />
                            </button>
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-[11px] font-bold text-gray-500">Operating Hours</label>
                            <button
                              onClick={() => {
                                const next = { ...qrLanding, hours_enabled: !qrLanding?.hours_enabled };
                                setQrLanding(next);
                                saveShopSettings({ qr_landing: next });
                              }}
                              className={`relative w-11 h-6 rounded-full transition-all ${
                                qrLanding?.hours_enabled ? 'bg-violet-500' : 'bg-gray-300'
                              }`}
                            >
                              <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-all ${
                                qrLanding?.hours_enabled ? 'left-5' : 'left-0.5'
                              }`} />
                            </button>
                          </div>
                          {qrLanding?.hours_enabled && (
                            <div className="flex flex-col gap-2 mt-2">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-gray-400 w-16">Mon-Fri</span>
                                <DebouncedSettingsInput
                                  type="time"
                                  value={qrLanding?.hours_weekday_open || '09:00'}
                                  onSave={(val) => saveShopSettings((c) => ({ qr_landing: { ...(c.qr_landing || {}), hours_weekday_open: val } }))}
                                  className="flex-1 px-2 py-1.5 rounded-lg text-xs"
                                />
                                <span className="text-xs text-gray-400">to</span>
                                <DebouncedSettingsInput
                                  type="time"
                                  value={qrLanding?.hours_weekday_close || '21:00'}
                                  onSave={(val) => saveShopSettings((c) => ({ qr_landing: { ...(c.qr_landing || {}), hours_weekday_close: val } }))}
                                  className="flex-1 px-2 py-1.5 rounded-lg text-xs"
                                />
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-gray-400 w-16">Weekend</span>
                                <DebouncedSettingsInput
                                  type="time"
                                  value={qrLanding?.hours_weekend_open || '10:00'}
                                  onSave={(val) => saveShopSettings((c) => ({ qr_landing: { ...(c.qr_landing || {}), hours_weekend_open: val } }))}
                                  className="flex-1 px-2 py-1.5 rounded-lg text-xs"
                                />
                                <span className="text-xs text-gray-400">to</span>
                                <DebouncedSettingsInput
                                  type="time"
                                  value={qrLanding?.hours_weekend_close || '22:00'}
                                  onSave={(val) => saveShopSettings((c) => ({ qr_landing: { ...(c.qr_landing || {}), hours_weekend_close: val } }))}
                                  className="flex-1 px-2 py-1.5 rounded-lg text-xs"
                                />
                              </div>
                            </div>
                          )}
                        </div>

                        <div>
                          <label className="text-[11px] font-bold text-gray-500 mb-1 block">Social Links</label>
                          <div className="space-y-2">
                            <DebouncedSettingsInput
                              type="url"
                              value={qrLanding?.social_facebook || ''}
                              onSave={(val) => saveShopSettings((c) => ({ qr_landing: { ...(c.qr_landing || {}), social_facebook: val } }))}
                              placeholder="Facebook URL"
                              className="w-full px-3 py-2"
                            />
                            <DebouncedSettingsInput
                              type="url"
                              value={qrLanding?.social_instagram || ''}
                              onSave={(val) => saveShopSettings((c) => ({ qr_landing: { ...(c.qr_landing || {}), social_instagram: val } }))}
                              placeholder="Instagram URL"
                              className="w-full px-3 py-2"
                            />
                            <DebouncedSettingsInput
                              type="tel"
                              value={qrLanding?.social_phone || ''}
                              onSave={(val) => saveShopSettings((c) => ({ qr_landing: { ...(c.qr_landing || {}), social_phone: val } }))}
                              placeholder="Phone number"
                              className="w-full px-3 py-2"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Points & Rewards */}
                  <div className="bg-gray-50 rounded-2xl border border-gray-100 overflow-hidden">
                    <button
                      onClick={() => setShowPointsSection(!showPointsSection)}
                      className="w-full flex items-center justify-between p-4 hover:bg-gray-100/50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Award className="w-4 h-4 text-gray-500" />
                        <span className="text-sm font-bold text-gray-700">Points & Rewards</span>
                      </div>
                      <svg className={`w-4 h-4 text-gray-400 transition-transform ${showPointsSection ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M19 9l-7 7-7-7"/></svg>
                    </button>
                    {showPointsSection && (
                      <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-gray-700">Enable Points</span>
                          <button
                            onClick={() => {
                              const next = { ...pointsSettings, enabled: !pointsSettings.enabled };
                              setPointsSettings(next);
                              saveShopSettings({ points_settings: next });
                            }}
                            className={`relative w-14 h-7 rounded-full transition-all ${pointsSettings.enabled ? 'bg-violet-500' : 'bg-gray-300'}`}
                          >
                            <div className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-sm transition-all ${pointsSettings.enabled ? 'left-7' : 'left-0.5'}`} />
                          </button>
                        </div>
                        {pointsSettings.enabled && (
                          <>
                            <div>
                              <label className="text-[11px] font-bold text-gray-500 mb-1 block">Earn Rate</label>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-400">Every</span>
                                <DebouncedSettingsInput
                                  type="number"
                                  value={pointsSettings.earn_per || ''}
                                  onSave={(val) => saveShopSettings((c) => ({ points_settings: { ...(c.points_settings || {}), earn_per: Number(val) } }))}
                                  placeholder="1000"
                                  className="w-20 px-2 py-1.5 rounded-lg text-sm text-center"
                                />
                                <span className="text-xs text-gray-400">{selectedBot?.currency || 'MMK'} =</span>
                                <DebouncedSettingsInput
                                  type="number"
                                  value={pointsSettings.earn_rate || ''}
                                  onSave={(val) => saveShopSettings((c) => ({ points_settings: { ...(c.points_settings || {}), earn_rate: Number(val) } }))}
                                  placeholder="1"
                                  className="w-16 px-2 py-1.5 rounded-lg text-sm text-center"
                                />
                                <span className="text-xs text-gray-400">pt(s)</span>
                              </div>
                            </div>
                            <div>
                              <label className="text-[11px] font-bold text-gray-500 mb-1 block">Redemption Rate</label>
                              <div className="flex items-center gap-2">
                                <DebouncedSettingsInput
                                  type="number"
                                  value={pointsSettings.redeem_points || ''}
                                  onSave={(val) => saveShopSettings((c) => ({ points_settings: { ...(c.points_settings || {}), redeem_points: Number(val) } }))}
                                  placeholder="100"
                                  className="w-16 px-2 py-1.5 rounded-lg text-sm text-center"
                                />
                                <span className="text-xs text-gray-400">pts =</span>
                                <DebouncedSettingsInput
                                  type="number"
                                  value={pointsSettings.redeem_value || ''}
                                  onSave={(val) => saveShopSettings((c) => ({ points_settings: { ...(c.points_settings || {}), redeem_value: Number(val) } }))}
                                  placeholder="1000"
                                  className="w-20 px-2 py-1.5 rounded-lg text-sm text-center"
                                />
                                <span className="text-xs text-gray-400">{selectedBot?.currency || 'MMK'}</span>
                              </div>
                            </div>
                            <div>
                              <label className="text-[11px] font-bold text-gray-500 mb-1 block">Min. Redeem Points</label>
                              <DebouncedSettingsInput
                                type="number"
                                value={pointsSettings.min_redeem || ''}
                                onSave={(val) => saveShopSettings((c) => ({ points_settings: { ...(c.points_settings || {}), min_redeem: Number(val) } }))}
                                placeholder="50"
                                className="w-full px-3 py-2"
                              />
                            </div>
                            <div>
                              <label className="text-[11px] font-bold text-gray-500 mb-1 block">Welcome Bonus (points)</label>
                              <DebouncedSettingsInput
                                type="number"
                                value={pointsSettings.welcome_bonus || ''}
                                onSave={(val) => saveShopSettings((c) => ({ points_settings: { ...(c.points_settings || {}), welcome_bonus: Number(val) } }))}
                                placeholder="0"
                                className="w-full px-3 py-2"
                              />
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Coupons */}
                  <div className="bg-gray-50 rounded-2xl border border-gray-100 overflow-hidden">
                    <button
                      onClick={() => setShowCouponSection(!showCouponSection)}
                      className="w-full flex items-center justify-between p-4 hover:bg-gray-100/50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Ticket className="w-4 h-4 text-gray-500" />
                        <span className="text-sm font-bold text-gray-700">Coupons</span>
                      </div>
                      <svg className={`w-4 h-4 text-gray-400 transition-transform ${showCouponSection ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M19 9l-7 7-7-7"/></svg>
                    </button>
                    {showCouponSection && (
                      <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-gray-500">{coupons?.length || 0} coupon(s)</span>
                          <button
                            onClick={() => {
                              setCouponForm({ code: '', type: 'percentage', value: '', usage_limit: '0', min_order: '0', expires_at: '' });
                              setShowCouponModal(true);
                            }}
                            className="px-3 py-1.5 bg-violet-500 text-white rounded-lg text-xs font-bold hover:bg-violet-600 transition-all flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" />
                            New Coupon
                          </button>
                        </div>
                        {(!coupons || coupons.length === 0) ? (
                          <p className="text-xs text-gray-400 text-center py-4">No coupons yet</p>
                        ) : (
                          <div className="space-y-2 max-h-60 overflow-y-auto">
                            {coupons.map(c => (
                              <div key={c.id} className="flex items-center justify-between bg-white rounded-xl p-3 border border-gray-100">
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-bold text-gray-900">{c.code}</span>
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                                      c.type === 'percentage' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                                    }`}>
                                      {c.type === 'percentage' ? `${c.value}%` : formatPrice(c.value, selectedBot?.currency || 'MMK')}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className={`text-[10px] font-bold ${
                                      !c.is_active ? 'text-rose-500' :
                                      c.expires_at && new Date(c.expires_at) < new Date() ? 'text-amber-500' :
                                      c.usage_limit > 0 && c.used_count >= c.usage_limit ? 'text-amber-500' :
                                      'text-emerald-500'
                                    }`}>
                                      {!c.is_active ? 'Inactive' :
                                       c.expires_at && new Date(c.expires_at) < new Date() ? 'Expired' :
                                       c.usage_limit > 0 && c.used_count >= c.usage_limit ? 'Used up' : 'Active'}
                                    </span>
                                    <span className="text-[10px] text-gray-400">{c.used_count}/{c.usage_limit || '∞'} used</span>
                                  </div>
                                </div>
                                <button
                                  onClick={async () => {
                                    if (!confirm('Delete this coupon?')) return;
                                    try { await deleteCoupon(c.id, selectedBotId); queryClient.invalidateQueries(['qr-coupons', selectedBotId]); addToast('Coupon deleted'); }
                                    catch { addToast('Failed to delete coupon', 'error'); }
                                  }}
                                  className="p-1.5 text-gray-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all flex-shrink-0"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* QR Menu URL */}
                    <p className="text-xs font-bold text-gray-500 mb-2">QR Menu URL</p>
                    {qrMenuUrl ? (
                      <div className="space-y-3">
                        <a
                          href={qrMenuUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1.5 break-all"
                        >
                          telegramecommerce.shop/{publicSlug.slug}-qr-menu
                          <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                        </a>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(qrMenuUrl);
                            addToast('QR Menu URL copied');
                          }}
                          className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-100 transition-all font-bold text-xs flex items-center justify-center gap-1.5"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          Copy URL
                        </button>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400">Generate a public shop URL in Settings first.</p>
                    )}
                  </div>
                </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
