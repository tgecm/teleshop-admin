import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getQRMenuItems, createQRMenuItem, updateQRMenuItem, deleteQRMenuItem, getQRMenuCategories, createQRMenuCategory, updateQRMenuCategory, deleteQRMenuCategory } from '../api/qrMenu';
import { getContentBlocks, updateContentBlock } from '../api/contentBlocks';
import { uploadImage } from '../api/products';
import { getBotPublicSlug } from '../api/public';
import client from '../api/client';
import { useBotStore } from '../store/botStore';
import { useToastStore } from '../store/toastStore';
import LoadingSkeleton from '../components/shared/LoadingSkeleton';
import ConfirmDialog from '../components/shared/ConfirmDialog';
import {
  Plus, Search, Edit2, Trash2, Utensils, ImageUp, X, Copy,
  ExternalLink, Loader2, FolderPlus, Tag, Package, QrCode,
  ClipboardList
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const DIETARY_BADGES = [
  { value: 'vegetarian', label: 'Vegetarian', emoji: '🥬', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  { value: 'vegan', label: 'Vegan', emoji: '🌱', color: 'bg-green-100 text-green-700 border-green-200' },
  { value: 'spicy', label: 'Spicy', emoji: '🌶️', color: 'bg-red-100 text-red-700 border-red-200' },
  { value: 'gluten-free', label: 'Gluten Free', emoji: '🌾', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { value: 'popular', label: 'Popular', emoji: '⭐', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
];

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
      return parsed.map(m => `https://api.telegramecommerce.shop/telegram/file/${encodeURIComponent(m.file_id)}?bot_id=${botId}`);
    }
  } catch {}
  return [`https://api.telegramecommerce.shop/telegram/file/${encodeURIComponent(image_url)}?bot_id=${botId}`];
}

function MenuItemForm({ item, categories, onClose, onSubmit, isLoading, selectedBotId }) {
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
    onSubmit({
      ...formData,
      bot_id: Number(selectedBotId),
      price: Number(formData.price),
      category_id: formData.category_id ? Number(formData.category_id) : null,
      image_url: imageUrl,
    });
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
                  src={`https://api.telegramecommerce.shop/telegram/file/${encodeURIComponent(img.file_id)}?bot_id=${selectedBotId}`}
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
          <label className="text-sm font-bold text-gray-700 ml-1">Price (MMK)</label>
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

        <div className="space-y-2">
          <label className="text-sm font-bold text-gray-700 ml-1">Dietary Labels</label>
          <div className="flex flex-wrap gap-2">
            {DIETARY_BADGES.map(badge => (
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

export default function QRMenuAdmin() {
  const { selectedBotId } = useBotStore();
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
    if (shopSettingsBlock?.content_data?.payment_mode) {
      setPaymentMode(shopSettingsBlock.content_data.payment_mode);
    }
  }, [shopSettingsBlock]);

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
    onSuccess: (data) => {
      if (data?.is_open !== undefined) setShopOpen(data.is_open);
    },
  });

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
        <h1 className="text-lg sm:text-2xl lg:text-3xl font-bold text-gray-900">QR Menu System</h1>
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
                  const url = `https://api.telegramecommerce.shop/telegram/file/${encodeURIComponent(banner.file_id)}?bot_id=${selectedBotId}`;
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
            const itemBadges = DIETARY_BADGES.filter(b => item.badges?.includes(b.value));
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
                    {Number(item.price).toLocaleString()} MMK
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

                  {/* Payment Mode */}
                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <p className="text-xs font-bold text-gray-500 mb-3">Payment Mode</p>
                    <div className="relative bg-white rounded-xl p-1 border border-gray-200 shadow-sm flex">
                      <div className={`absolute top-1 bottom-1 rounded-lg transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] shadow-sm ${
                        paymentMode === 'prepaid' ? 'left-1 right-[50%] bg-gradient-to-r from-orange-500 to-amber-500' : 'left-[50%] right-1 bg-gradient-to-r from-violet-500 to-indigo-500'
                      }`} />
                      <button
                        onClick={() => { setPaymentMode('prepaid'); paymentModeMutation.mutate('prepaid'); }}
                        disabled={paymentModeMutation.isPending}
                        className={`relative z-10 flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 ${
                          paymentMode === 'prepaid' ? 'text-white' : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2"/>
                          <circle cx="12" cy="12" r="4"/>
                        </svg>
                        Prepaid
                        <span className="text-[10px] opacity-80 font-medium hidden sm:inline">(Pay First)</span>
                      </button>
                      <button
                        onClick={() => { setPaymentMode('postpaid'); paymentModeMutation.mutate('postpaid'); }}
                        disabled={paymentModeMutation.isPending}
                        className={`relative z-10 flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 ${
                          paymentMode === 'postpaid' ? 'text-white' : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                          <path d="M12 6v6l4 2"/>
                        </svg>
                        Postpaid
                        <span className="text-[10px] opacity-80 font-medium hidden sm:inline">(Pay Later)</span>
                      </button>
                    </div>
                  </div>

                  {/* QR Menu URL */}
                  <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
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
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
