import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getProducts, createProduct, updateProduct, deleteProduct, getCategories, uploadImage, getImageUrl } from '../api/products';
import { useBotStore } from '../store/botStore';
import { useToastStore } from '../store/toastStore';
import LoadingSkeleton from '../components/shared/LoadingSkeleton';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Package, 
  Tag, 
  MoreVertical, 
  X, 
  Image as ImageIcon, 
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Products() {
  const { selectedBotId } = useBotStore();
  const { addToast } = useToastStore();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [isDeleting, setIsDeleting] = useState(null);

  const { data: products, isLoading } = useQuery({
    queryKey: ['products', selectedBotId],
    queryFn: () => getProducts({ bot_id: Number(selectedBotId) }),
    enabled: !!selectedBotId,
  });

  const { data: categories } = useQuery({
    queryKey: ['categories', selectedBotId],
    queryFn: () => getCategories({ bot_id: Number(selectedBotId) }),
    enabled: !!selectedBotId,
  });

  const createMutation = useMutation({
    mutationFn: (data) => createProduct({ 
      ...data, 
      bot_id: Number(selectedBotId),
      category_id: data.category_id || null,
    }),
    onSuccess: (result) => {
      queryClient.invalidateQueries(['products', selectedBotId]);
      addToast('Product created successfully');
      setIsModalOpen(false);
      console.log('[Product] Created:', result);
    },
    onError: (err) => {
      console.error('[Product] Create failed:', err.response?.data || err.message);
      addToast(err.response?.data?.detail || 'Failed to create product', 'error');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateProduct(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['products', selectedBotId]);
      addToast('Product updated successfully');
      setIsModalOpen(false);
      setEditingProduct(null);
    },
    onError: () => addToast('Failed to update product', 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['products', selectedBotId]);
      addToast('Product deleted');
      setIsDeleting(null);
    },
    onError: () => addToast('Failed to delete product', 'error'),
  });

  const filteredProducts = products?.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.description?.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const handleEdit = (product) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  const handleDelete = (id) => {
    if (confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
      deleteMutation.mutate(id);
    }
  };

  if (isLoading) return <LoadingSkeleton type="grid" count={6} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Products</h1>
        <div className="flex gap-2">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm transition-all"
            />
          </div>
          <button 
            disabled
            className="p-2.5 bg-gray-400 text-white rounded-2xl shadow-lg flex items-center gap-2 opacity-50 cursor-not-allowed"
            title="Temporarily disabled"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline font-bold">New Product</span>
          </button>
        </div>
      </div>

      <div className="text-center md:hidden">
        <p className="text-[10px] text-gray-400 italic">Pull down to refresh</p>
      </div>

      {filteredProducts.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-gray-200">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Package className="w-8 h-8 text-gray-300" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">No products found</h3>
          <p className="text-sm text-gray-500 max-w-xs mx-auto mt-1">
            {search ? "Try a different search term." : "Start adding products to your shop to see them here."}
          </p>
          {!search && (
            <button 
              onClick={() => setIsModalOpen(true)}
              className="mt-6 px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all"
            >
              Add Your First Product
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-6">
          {filteredProducts.map(product => (
            <motion.div 
              layout
              key={product.id}
              className="bg-white rounded-2xl md:rounded-3xl shadow-sm border border-gray-100 overflow-hidden hover:border-indigo-200 transition-all group"
            >
              <div className="aspect-square bg-gray-50 relative overflow-hidden">
                {product.image_url ? (
                  <img 
                    src={getImageUrl(product.image_url, selectedBotId)} 
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    onError={(e) => { 
                      console.warn(`[Image] Failed to load for product #${product.id}:`, {
                        image_url: product.image_url,
                        resolved_url: getImageUrl(product.image_url, selectedBotId),
                        bot_id: selectedBotId
                      });
                      e.target.style.display='none'; 
                      e.target.nextSibling.style.display='flex'; 
                    }}
                  />
                ) : null}
                <div className="w-full h-full items-center justify-center text-gray-300"
                  style={{ display: product.image_url ? 'none' : 'flex' }}
                >
                  <ImageIcon className="w-10 h-10 md:w-12 md:h-12" />
                </div>
                <div className="absolute top-2 right-2 md:top-3 md:right-3 flex gap-1.5 md:gap-2">
                  <button 
                    onClick={() => handleEdit(product)}
                    className="p-1.5 md:p-2 bg-white/90 backdrop-blur-sm rounded-lg md:rounded-xl shadow-sm text-gray-600 hover:text-indigo-600 transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  </button>
                  <button 
                    onClick={() => handleDelete(product.id)}
                    className="p-1.5 md:p-2 bg-white/90 backdrop-blur-sm rounded-lg md:rounded-xl shadow-sm text-gray-600 hover:text-rose-600 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  </button>
                </div>
                <div className="absolute bottom-2 left-2 md:bottom-3 md:left-3">
                  <span className={`px-1.5 py-0.5 md:px-2 md:py-1 rounded-md md:rounded-lg text-[8px] md:text-[10px] font-bold uppercase tracking-wider ${
                    product.stock_quantity > 10 ? 'bg-emerald-500 text-white' :
                    product.stock_quantity > 0 ? 'bg-amber-500 text-white' :
                    'bg-rose-500 text-white'
                  }`}>
                    {product.stock_quantity > 0 ? `${product.stock_quantity} In Stock` : 'Out of Stock'}
                  </span>
                </div>
              </div>
              <div className="p-3 md:p-4">
                <div className="flex flex-col gap-0.5 mb-1">
                  <h3 className="font-bold text-gray-900 text-sm md:text-base line-clamp-1">{product.name}</h3>
                  <p className="font-bold text-indigo-600 text-sm md:text-base">{product.price.toLocaleString()} MMK</p>
                </div>
                <div className="flex items-center gap-1.5 text-[8px] md:text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                  <Tag className="w-2.5 h-2.5 md:w-3 md:h-3" />
                  <span className="truncate">{categories?.find(c => c.id === product.category_id)?.name || 'Uncategorized'}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Product Modal */}
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
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[32px] z-50 max-h-[90vh] overflow-y-auto md:max-w-lg md:mx-auto md:bottom-10 md:rounded-[32px] md:shadow-2xl"
            >
              <ProductForm 
                product={editingProduct} 
                categories={categories}
                selectedBotId={selectedBotId}
                onClose={() => setIsModalOpen(false)}
                onSubmit={(data) => {
                  if (editingProduct) {
                    updateMutation.mutate({ id: editingProduct.id, data });
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
    </div>
  );
}

function ProductForm({ product, categories, onClose, onSubmit, isLoading, selectedBotId }) {
  const [formData, setFormData] = useState({
    name: product?.name || '',
    description: product?.description || '',
    price: product?.price || '',
    stock_quantity: product?.stock_quantity || '',
    category_id: product?.category_id || '',
    image_url: product?.image_url || '',
  });
  const [uploading, setUploading] = useState(false);
  const { addToast } = useToastStore();

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const result = await uploadImage(file, Number(selectedBotId));
      if (result.file_id) {
        setFormData({ ...formData, image_url: result.file_id });
        addToast('Image uploaded successfully');
      } else if (result.url) {
        setFormData({ ...formData, image_url: result.url });
        addToast('Image uploaded successfully');
      }
    } catch (err) {
      console.error('[Image] Upload failed:', err.response?.data || err.message);
      addToast(err.response?.data?.detail || 'Image upload failed', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      price: Number(formData.price),
      stock_quantity: Number(formData.stock_quantity) || null,
      category_id: formData.category_id ? Number(formData.category_id) : null,
    });
  };

  return (
    <div className="p-5 pb-12">
      <div className="flex justify-center mb-4">
        <div className="w-10 h-1 bg-gray-200 rounded-full" />
      </div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">
          {product ? 'Edit Product' : 'New Product'}
        </h2>
        <button onClick={onClose} className="p-2 bg-gray-100 rounded-full">
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-bold text-gray-700 ml-1">Product Image</label>
          <div className="flex gap-4 items-center">
            <div className="w-24 h-24 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 flex items-center justify-center relative overflow-hidden group">
              {formData.image_url ? (
                <img 
                  src={getImageUrl(formData.image_url, selectedBotId)} 
                  className="w-full h-full object-cover" 
                  alt="Preview"
                />
              ) : (
                <ImageIcon className="w-8 h-8 text-gray-300" />
              )}
              {uploading && (
                <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
                </div>
              )}
            </div>
            <div className="flex-1">
<label className="inline-block px-4 py-2 bg-gray-100 text-gray-400 rounded-xl text-sm font-bold cursor-not-allowed opacity-50" title="Temporarily disabled">
                {formData.image_url ? 'Change Image' : 'Upload Image'}
                <input type="file" className="hidden" accept="image/*" disabled />
              </label>
              <p className="text-[10px] text-gray-400 mt-2">Recommended: Square image, max 2MB</p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-gray-700 ml-1">Product Name</label>
          <input
            required
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g. Premium Coffee Beans"
            className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700 ml-1">Price (MMK)</label>
            <input
              required
              type="number"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              placeholder="0"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700 ml-1">Stock</label>
            <input
              required
              type="number"
              value={formData.stock_quantity}
              onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
              placeholder="0"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-gray-700 ml-1">Category</label>
          <select
            required
            value={formData.category_id}
            onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
          >
            <option value="">Select Category</option>
            {categories?.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-gray-700 ml-1">Description</label>
          <textarea
            rows={3}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Describe your product..."
            className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium resize-none"
          />
        </div>

        <div className="pt-4 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 font-bold rounded-2xl hover:bg-gray-200 transition-all"
          >
            Cancel
          </button>
          <button
            disabled={isLoading || uploading}
            type="submit"
            className="flex-[2] px-6 py-3 bg-indigo-600 text-white font-bold rounded-2xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            {isLoading && <Loader2 className="w-5 h-5 animate-spin" />}
            {product ? 'Update Product' : 'Create Product'}
          </button>
        </div>
      </form>
    </div>
  );
}
