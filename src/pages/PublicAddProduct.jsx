import { API_BASE } from '../api/config';
import React, { useState, useRef } from 'react';

function compressImage(file, maxDimension = 720) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width <= maxDimension && height <= maxDimension) {
        resolve(file);
        return;
      }
      if (width > height) {
        height = Math.round(height * (maxDimension / width));
        width = maxDimension;
      } else {
        width = Math.round(width * (maxDimension / height));
        height = maxDimension;
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => {
        resolve(new File([blob], file.name, { type: 'image/jpeg' }));
      }, 'image/jpeg', 0.8);
    };
    img.src = URL.createObjectURL(file);
  });
}

export default function PublicAddProduct({ username, code, secret1 = '', secret2 = '' }) {
  const initialFormData = { name: '', description: '', price: '', original_price: '', stock_quantity: '', category_id: '' };
  const [state, setState] = useState('loading'); // loading | error | form | success
  const [botInfo, setBotInfo] = useState(null);
  const [categories, setCategories] = useState([]);
  const [formData, setFormData] = useState({ ...initialFormData });
  const [promotion, setPromotion] = useState(false);
  const [stockOption, setStockOption] = useState('unlimited');
  const [customStock, setCustomStock] = useState('');
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [creatingCategory, setCreatingCategory] = useState(false);
  const fileInputRef = useRef(null);

  // Resolve bot on mount
  React.useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE}/public/bot-resolve/${encodeURIComponent(username)}/${encodeURIComponent(code)}?secret1=${encodeURIComponent(secret1)}&secret2=${encodeURIComponent(secret2)}`)
      .then(res => {
        if (!res.ok) throw new Error('Invalid link');
        return res.json();
      })
      .then(data => {
        if (cancelled) return;
        setBotInfo(data);
        const cats = data.categories || [];
        setCategories(cats);
        if (cats.length === 0) setShowNewCategory(true);
        if (data.limits && data.counts && data.limits.products !== null && data.counts.products >= data.limits.products) {
          setState('limit_reached');
        } else {
          setState('form');
        }
      })
      .catch(() => {
        if (cancelled) return;
        setState('error');
      });
    return () => { cancelled = true; };
  }, [username, code]);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (images.length >= 10) return;
    setUploading(true);
    try {
      const compressed = await compressImage(file);
      const formData = new FormData();
      formData.append('file', compressed);
      formData.append('bot_id', botInfo.bot_id);
      const res = await fetch(`${API_BASE}/public/upload/photo`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      setImages(prev => [...prev, { file_id: data.file_id, type: 'photo' }]);
    } catch {
      // ignore upload error silently
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeImage = (idx) => {
    setImages(prev => prev.filter((_, i) => i !== idx));
  };

  const handleCreateCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) return;
    setCreatingCategory(true);
    try {
      const res = await fetch(`${API_BASE}/public/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, code, name, secret1, secret2 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed');
      const newCat = { id: data.id, name: data.name };
      setCategories(prev => [...prev, newCat]);
      setFormData(f => ({ ...f, category_id: String(data.id) }));
      setShowNewCategory(false);
      setNewCategoryName('');
    } catch {
      // ignore silently
    } finally {
      setCreatingCategory(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.category_id) return;
    setSubmitting(true);
    const imageUrl = images.length > 0
      ? JSON.stringify(images.map(img => ({ file_id: img.file_id, type: 'photo' })))
      : null;
    try {
      const res = await fetch(`${API_BASE}/public/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          code,
          secret1,
          secret2,
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          price: Number(formData.price),
          original_price: promotion && formData.original_price ? Number(formData.original_price) : null,
          stock_quantity: stockOption === 'unlimited' ? null : stockOption === 'out' ? 0 : Number(customStock),
          category_id: formData.category_id ? Number(formData.category_id) : null,
          image_url: imageUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.detail || 'Failed to create product');
        setSubmitting(false);
        return;
      }
      setResult(data);
      setState('success');
    } catch (err) {
      setErrorMsg(err?.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Loading state
  if (state === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-[3px] border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-400 font-medium">Loading, If slow, use VPN</p>
        </div>
      </div>
    );
  }

  // Error state
  if (state === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full text-center"
        >
          <div className="w-20 h-20 bg-gradient-to-br from-red-50 to-red-100 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <AlertCircle className="w-10 h-10 text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Invalid Link</h2>
          <p className="text-gray-500 text-sm mb-6">
            Please add product using your mobile phone
          </p>
          <a
            href="https://t.me/tg_ecommerce_official_bot"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 font-bold rounded-2xl hover:bg-gray-200 transition-all"
          >
            Contact Support
            <ChevronRight className="w-4 h-4" />
          </a>
        </motion.div>
      </div>
    );
  }

  // Success state
  if (state === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full text-center"
        >
          <div className="w-20 h-20 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <CheckCircle2 className="w-10 h-10 text-emerald-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Product Submitted!</h2>
          <p className="text-gray-500 text-sm mb-2">
            Your product has been submitted successfully.
          </p>
          {result && (
            <div className="bg-gray-50 rounded-2xl p-4 mb-6 text-left border border-gray-100">
              <p className="text-sm font-bold text-gray-900">{result.name}</p>
              <p className="text-lg font-bold text-emerald-600 mt-1">{Number(result.price).toLocaleString()} MMK</p>
            </div>
          )}
          <p className="text-xs text-gray-400">
            The shop owner will review your product shortly.
          </p>
          <button
            type="button"
            onClick={() => {
              setFormData({ ...initialFormData });
              setImages([]);
              setResult(null);
              setErrorMsg('');
              setState('form');
            }}
            className="mt-4 w-full px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-2xl shadow-lg hover:shadow-xl hover:from-indigo-700 hover:to-purple-700 transition-all flex items-center justify-center gap-2 text-sm active:scale-[0.98]"
          >
            <Package className="w-4 h-4" />
            Add Another Product
          </button>
        </motion.div>
      </div>
    );
  }

  // Limit reached state
  if (state === 'limit_reached') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full text-center"
        >
          <div className="w-20 h-20 bg-gradient-to-br from-amber-50 to-amber-100 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <AlertCircle className="w-10 h-10 text-amber-400" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Limit Reached</h2>
          <p className="text-gray-500 text-sm mb-6">
            You have reach your limit of adding new product, to add more, please upgrade!
          </p>
          <a
            href="https://t.me/tg_ecommerce_official_bot"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-2xl hover:from-indigo-700 hover:to-purple-700 transition-all"
          >
            Contact Support to Upgrade
            <ChevronRight className="w-4 h-4" />
          </a>
        </motion.div>
      </div>
    );
  }

  // Form state
  const isValid = formData.name.trim() && formData.price && formData.category_id;
  const shopName = botInfo?.bot_full_name || 'Shop';

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="max-w-lg mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl shadow-lg overflow-hidden"
        >
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-center">
            <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg border border-white/20">
              <Package className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-xl font-bold text-white">Add Product</h1>
            <p className="text-indigo-200 text-sm mt-1">{shopName}</p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {errorMsg && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-2xl">
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                <p className="text-sm font-medium text-red-700">{errorMsg}</p>
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 ml-1">Category *</label>
              <div className="flex gap-2">
                <select
                  value={formData.category_id}
                  onChange={(e) => { setFormData({ ...formData, category_id: e.target.value }); setErrorMsg(''); }}
                  className="flex-1 px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-sm"
                >
                  <option value="">Select Category</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              {botInfo?.limits && botInfo?.counts && botInfo.limits.categories !== null && botInfo.counts.categories >= botInfo.limits.categories ? (
                <p className="text-xs font-medium text-amber-600 text-center py-1">
                  You cannot add new category. Your category reach the limit.
                </p>
              ) : (
              <button
                type="button"
                onClick={() => setShowNewCategory(true)}
                className="w-full py-2.5 border-2 border-dashed border-indigo-300 bg-indigo-50/50 text-indigo-700 font-bold rounded-2xl hover:bg-indigo-100 hover:border-indigo-400 transition-all flex items-center justify-center gap-2 text-sm"
              >
                <FolderPlus className="w-4 h-4" />
                + Create New Category
              </button>
              )}
              {showNewCategory && (
                <div className="flex gap-2 items-center mt-1">
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="Category name"
                    className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleCreateCategory}
                    disabled={!newCategoryName.trim() || creatingCategory}
                    className="px-3 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl disabled:opacity-40 hover:bg-indigo-700 transition-all"
                  >
                    {creatingCategory ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowNewCategory(false); setNewCategoryName(''); }}
                    className="px-3 py-2 text-gray-500 text-sm font-bold rounded-xl hover:bg-gray-100 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 ml-1">Product Name *</label>
              <input
                required
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Premium Coffee Beans"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-sm"
              />
            </div>

            <div className="space-y-3">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 ml-1">Price (MMK) *
                  <label className="ml-3 text-sm font-normal text-gray-500 cursor-pointer select-none">
                    <input type="checkbox" checked={promotion} onChange={() => {
                      if (!promotion && !formData.original_price) {
                        setFormData(prev => ({ ...prev, original_price: prev.price }));
                      }
                      setPromotion(!promotion);
                    }} className="mr-1.5 align-middle" />
                    Promotion
                  </label>
                </label>
                {promotion ? (
                  <div className="flex gap-2">
                    <input required type="number" value={formData.original_price}
                      onChange={(e) => setFormData({ ...formData, original_price: e.target.value })}
                      placeholder="Original Price"
                      className="w-1/2 px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-sm" />
                    <input required type="number" value={formData.price}
                      onChange={(e) => { setFormData({ ...formData, price: e.target.value }); }}
                      placeholder="Promotion Price"
                      className="w-1/2 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none font-medium text-sm" />
                  </div>
                ) : (
                  <input required type="number" value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="0"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-sm" />
                )}
                {promotion && Number(formData.price) > Number(formData.original_price) && (
                  <p className="text-xs text-rose-500 font-medium mt-1">Promotion price cannot exceed original price</p>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 ml-1">Stock</label>
                <div className="flex gap-1.5 flex-wrap">
                  {[
                    { value: 'unlimited', label: 'In stock' },
                    { value: 'out', label: 'Out of Stock' },
                    { value: 'custom', label: 'Add' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setStockOption(opt.value)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        stockOption === opt.value
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                {stockOption === 'custom' && (
                  <input
                    required
                    type="number"
                    min="0"
                    value={customStock}
                    onChange={(e) => setCustomStock(e.target.value)}
                    placeholder="Enter quantity"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-sm mt-2"
                  />
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 ml-1">Description</label>
              <textarea
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe your product..."
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-sm resize-none"
              />
            </div>

            <div className="space-y-3">
              <label className="text-sm font-bold text-gray-700 ml-1">
                Photos <span className="text-gray-400 font-normal">({images.length}/10)</span>
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={handleImageUpload}
                className="hidden"
              />
              {images.length > 0 && (
                <div className={images.length === 1 ? 'flex justify-center' : 'grid grid-cols-4 gap-2'}>
                  {images.map((img, idx) => (
                    <div key={idx} className={`relative ${images.length === 1 ? 'w-36 h-36' : 'aspect-square'}`}>
                      <img
                        src={`${API_BASE}/telegram/file/${encodeURIComponent(img.file_id)}?bot_id=${botInfo.bot_id}`}
                        alt={`Photo ${idx + 1}`}
                        className="w-full h-full object-cover rounded-2xl border border-gray-200"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-rose-600 transition-all"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {images.length < 10 && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className={`w-full ${images.length === 0 ? 'py-10 border-2 border-dashed border-gray-200 rounded-2xl' : 'py-3 border-2 border-dashed border-gray-200 rounded-xl'} flex flex-col items-center gap-2 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all`}
                >
                  {uploading ? (
                    <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                  ) : (
                    <>
                      <ImageUp className={images.length === 0 ? 'w-7 h-7 text-gray-300' : 'w-5 h-5 text-gray-300'} />
                      <span className={`font-bold text-gray-500 ${images.length === 0 ? 'text-sm' : 'text-xs'}`}>
                        {images.length === 0 ? 'Upload Photos' : 'Add More'}
                      </span>
                    </>
                  )}
                </button>
              )}
            </div>

            <div className="pt-4 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setFormData({ ...initialFormData });
                  setImages([]);
                  setErrorMsg('');
                }}
                className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 font-bold rounded-2xl hover:bg-gray-200 transition-all text-sm"
              >
                Reset
              </button>
              <button
                disabled={!isValid || submitting}
                type="submit"
                className="flex-[2] px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-2xl shadow-lg shadow-indigo-100 hover:shadow-xl hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2 text-sm active:scale-[0.98]"
              >
                {submitting && <Loader2 className="w-5 h-5 animate-spin" />}
                {submitting ? 'Submitting...' : 'Submit Product'}
              </button>
            </div>
          </form>
        </motion.div>

        <div className="text-center mt-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-5 h-5 rounded-md flex items-center justify-center bg-indigo-600">
              <ShoppingBag className="w-3 h-3 text-white" />
            </div>
            <span className="text-xs font-bold text-gray-500">Telegram E-Commerce</span>
          </div>
          <p className="text-[10px] text-gray-400">Powered by Telegram E-Commerce Platform</p>
        </div>
      </div>
    </div>
  );
}
