import { useState, useRef, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getProducts, createProduct, updateProduct, deleteProduct, getCategories, createCategory, deleteCategory, updateCategory, getImageUrl, uploadImage } from '../api/products';
import client from '../api/client';
import { createCoupon, getCoupons, deleteCoupon } from '../api/coupons';
import { getContentBlocks, updateContentBlock } from '../api/contentBlocks';
import { useBotStore } from '../store/botStore';
import { useToastStore } from '../store/toastStore';
import { useSelectedBot } from '../hooks/useSelectedBot';
import { formatPrice } from '../utils/formatPrice';
import { sanitizeSpecPrices } from '../utils/productPricing';
import { downloadBlob } from '../utils/download';
import { getPlanLimit } from '../utils/plans';
import LoadingSkeleton from '../components/shared/LoadingSkeleton';
import ConfirmDialog from '../components/shared/ConfirmDialog';
import SearchableSelect from '../components/shared/SearchableSelect';
import CachedImage from '../components/shared/CachedImage';
import ProductSorting from '../components/ProductSorting';
import {
  Plus, Search, Edit2, Trash2, Package, Tag, MoreVertical, X,
  Image as ImageIcon, ChevronRight, ChevronDown, AlertCircle, CheckCircle2,
  Loader2, FolderPlus, ImageUp, Palette, Copy, ArrowUpDown,
  Ticket, Percent, CalendarDays, Coins, Users, Truck, Download, Upload,
  Settings, BadgeDollarSign, ClipboardList, Award, Pencil
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import townshipsData, { REGION_NAMES, getDistricts, getTownships } from '../data/townships';
import { PREDEFINED_COLORS, getColorName } from '../data/colors';

export default function Products() {
  const { selectedBotId } = useBotStore();
  const { selectedBot } = useSelectedBot();
  const { addToast } = useToastStore();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [isDeleting, setIsDeleting] = useState(null);
  const [showSorting, setShowSorting] = useState(false);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('');
  const [noCostPriceFilter, setNoCostPriceFilter] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('no_cost_price') === '1') {
      // Clean URL param after reading
      const url = new URL(window.location);
      url.searchParams.delete('no_cost_price');
      window.history.replaceState({}, '', url);
      return true;
    }
    return false;
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('action') === 'new' || params.get('new') === '1') {
      setIsModalOpen(true);
      setEditingProduct(null);
      const url = new URL(window.location);
      url.searchParams.delete('action');
      url.searchParams.delete('new');
      window.history.replaceState({}, '', url);
    }
  }, []);
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [couponForm, setCouponForm] = useState({
    code: '',
    discount_type: 'fixed',
    discount_value: '',
    end_date: '',
    total_coupons: '',
    min_spend: '0',
  });
  const [deletingCoupon, setDeletingCoupon] = useState(null);
  const [showCouponMenu, setShowCouponMenu] = useState(false);
  const [showCouponManager, setShowCouponManager] = useState(false);
  const [showDeliveryFeeModal, setShowDeliveryFeeModal] = useState(false);
  const [showCheckoutFieldsModal, setShowCheckoutFieldsModal] = useState(false);
  const [checkoutFields, setCheckoutFields] = useState(null);
  const [checkoutFieldsLoading, setCheckoutFieldsLoading] = useState(false);
  const [deliveryFee, setDeliveryFee] = useState('');
  const [freeDeliveryThreshold, setFreeDeliveryThreshold] = useState('');
  const [deliveryFeeMode, setDeliveryFeeMode] = useState('flat');
  const [deliveryFeeLoading, setDeliveryFeeLoading] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedTownship, setSelectedTownship] = useState('');
  const [townshipFeeInput, setTownshipFeeInput] = useState('');
  const [townshipFees, setTownshipFees] = useState([]);
  const [townshipFeesLoading, setTownshipFeesLoading] = useState(false);
  const [savingTownshipFee, setSavingTownshipFee] = useState(false);
  const [deletingTownshipFeeId, setDeletingTownshipFeeId] = useState(null);
  const [importingCsv, setImportingCsv] = useState(false);
  const fileInputRef = useRef(null);
  const [showPointsModal, setShowPointsModal] = useState(false);
  const [pointsSettings, setPointsSettings] = useState({});
  const [showPointsSection, setShowPointsSection] = useState(false);
  const [savingPoints, setSavingPoints] = useState(false);

  const { data: products, isLoading } = useQuery({
    queryKey: ['products', selectedBotId],
    queryFn: () => getProducts({ bot_id: Number(selectedBotId) }),
    enabled: !!selectedBotId,
    placeholderData: (prev) => prev,
    refetchInterval: 10000,
  });

  const { data: categories } = useQuery({
    queryKey: ['categories', selectedBotId],
    queryFn: () => getCategories({ bot_id: Number(selectedBotId) }),
    enabled: !!selectedBotId,
    placeholderData: (prev) => prev,
  });

  const planName = selectedBot?.plan_name;
  const productLimit = getPlanLimit(planName, 'products');
  const categoryLimit = getPlanLimit(planName, 'categories');
  const productCount = products?.length || 0;
  const categoryCount = categories?.length || 0;
  const atProductLimit = productCount >= productLimit;
  const atCategoryLimit = categoryCount >= categoryLimit;

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
      if (import.meta.env.DEV) console.log('[Product] Created:', result);
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
    onError: (err) => {
      console.error('[Product] Update failed:', err.response?.data || err.message);
      addToast(err.response?.data?.detail || 'Failed to update product', 'error');
    },
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

  const { data: coupons } = useQuery({
    queryKey: ['coupons', selectedBotId],
    queryFn: () => getCoupons(Number(selectedBotId)),
    enabled: !!selectedBotId,
  });

  const createCouponMutation = useMutation({
    mutationFn: (data) => createCoupon(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['coupons', selectedBotId]);
      addToast('Coupon created successfully');
      setShowCouponModal(false);
      setCouponForm({ code: '', discount_type: 'fixed', discount_value: '', end_date: '', total_coupons: '', min_spend: '0' });
    },
    onError: (err) => addToast(err?.response?.data?.detail || 'Failed to create coupon', 'error'),
  });

  const deleteCouponMutation = useMutation({
    mutationFn: (id) => deleteCoupon(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['coupons', selectedBotId]);
      addToast('Coupon deleted');
      setDeletingCoupon(null);
    },
    onError: () => addToast('Failed to delete coupon', 'error'),
  });

  const fetchDeliverySettings = useCallback(async () => {
    if (!selectedBotId) return;
    try {
      const res = await client.get(`/bots/${selectedBotId}/delivery-settings`);
      setDeliveryFee(String(res.data.delivery_fee || ''));
      setFreeDeliveryThreshold(String(res.data.free_delivery_threshold || ''));
      setDeliveryFeeMode(res.data.delivery_fee_mode || 'flat');
    } catch (e) {
      console.error('Failed to load delivery settings:', e);
    }
  }, [selectedBotId]);

  useEffect(() => {
    if (showDeliveryFeeModal) fetchDeliverySettings();
  }, [showDeliveryFeeModal, fetchDeliverySettings]);

  const saveDeliverySettings = async () => {
    if (!selectedBotId) return;
    setDeliveryFeeLoading(true);
    try {
      await client.put(`/bots/${selectedBotId}/delivery-settings`, {
        delivery_fee: Number(deliveryFee) || 0,
        free_delivery_threshold: Number(freeDeliveryThreshold) || 0,
        delivery_fee_mode: deliveryFeeMode,
      });
      addToast('Delivery settings saved');
      setShowDeliveryFeeModal(false);
    } catch (e) {
      console.error('Save delivery settings error:', e.response?.data || e.message);
      addToast(e.response?.data?.detail || 'Failed to save delivery settings', 'error');
    } finally {
      setDeliveryFeeLoading(false);
    }
  };

  const fetchCheckoutFields = useCallback(async () => {
    if (!selectedBotId) return;
    try {
      const res = await client.get(`/bots/${selectedBotId}/checkout-fields`);
      setCheckoutFields(res.data || {});
    } catch (e) {
      console.error('Failed to load checkout fields:', e);
    }
  }, [selectedBotId]);

  const fetchPointsSettings = useCallback(async () => {
    if (!selectedBotId) return;
    try {
      const blocks = await getContentBlocks({ bot_id: Number(selectedBotId) });
      const block = blocks?.find(b => b.key === 'ecommerce_points_settings');
      const data = block?.content_data || {};
      setPointsSettings(data);
    } catch (e) {
      console.error('Failed to load points settings:', e);
    }
  }, [selectedBotId]);

  useEffect(() => {
    if (showCheckoutFieldsModal) fetchCheckoutFields();
  }, [showCheckoutFieldsModal, fetchCheckoutFields]);

  const saveCheckoutFields = async () => {
    if (!selectedBotId || !checkoutFields) return;
    const finalFields = { ...checkoutFields, name: true };
    const enabledCount = Object.values(finalFields).filter(Boolean).length;
    if (enabledCount < 2) {
      addToast('At least 2 fields must be enabled', 'error');
      return;
    }
    setCheckoutFieldsLoading(true);
    try {
      await client.put(`/bots/${selectedBotId}/checkout-fields`, finalFields);
      addToast('Checkout fields saved');
      setShowCheckoutFieldsModal(false);
    } catch (e) {
      console.error('Save checkout fields error:', e.response?.data || e.message);
      addToast(e.response?.data?.detail || 'Failed to save checkout fields', 'error');
    } finally {
      setCheckoutFieldsLoading(false);
    }
  };

  const savePointsSettings = async () => {
    if (!selectedBotId) return;
    setSavingPoints(true);
    try {
      await updateContentBlock(selectedBotId, 'ecommerce_points_settings', pointsSettings);
      addToast('Points & Rewards settings saved');
      setShowPointsModal(false);
    } catch (e) {
      console.error('Save points settings error:', e.response?.data || e.message);
      addToast(e.response?.data?.detail || 'Failed to save points settings', 'error');
    } finally {
      setSavingPoints(false);
    }
  };

  const toggleCheckoutField = (key) => {
    setCheckoutFields(prev => {
      if (!prev) return prev;
      return { ...prev, [key]: !prev[key] };
    });
  };

  const fetchTownshipFees = useCallback(async () => {
    if (!selectedBotId) return;
    setTownshipFeesLoading(true);
    try {
      const res = await client.get(`/bots/${selectedBotId}/delivery-fees`);
      setTownshipFees(res.data || []);
    } catch (e) {
      console.error('Failed to load township fees:', e);
    } finally {
      setTownshipFeesLoading(false);
    }
  }, [selectedBotId]);

  useEffect(() => {
    if (showDeliveryFeeModal) fetchTownshipFees();
  }, [showDeliveryFeeModal, fetchTownshipFees]);

  useEffect(() => {
    if (showPointsModal) {
      fetchPointsSettings();
      setShowPointsSection(false);
    }
  }, [showPointsModal, fetchPointsSettings]);

  useEffect(() => {
    if (isModalOpen || showCouponModal || showCouponManager || showDeliveryFeeModal || showCheckoutFieldsModal || showPointsModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isModalOpen, showCouponModal, showCouponManager, showDeliveryFeeModal, showCheckoutFieldsModal, showPointsModal]);

  const saveTownshipFee = async () => {
    if (!selectedBotId || !selectedTownship || !townshipFeeInput) return;
    setSavingTownshipFee(true);
    try {
      await client.put(`/bots/${selectedBotId}/delivery-fees`, {
        region: selectedRegion,
        district: selectedDistrict,
        township: selectedTownship,
        fee: Number(townshipFeeInput) || 0,
      });
      addToast('Township fee saved');
      setTownshipFeeInput('');
      setSelectedTownship('');
      setSelectedDistrict('');
      setSelectedRegion('');
      fetchTownshipFees();
    } catch (e) {
      addToast(e.response?.data?.detail || 'Failed to save township fee', 'error');
    } finally {
      setSavingTownshipFee(false);
    }
  };

  const deleteTownshipFee = async (id) => {
    if (!selectedBotId) return;
    setDeletingTownshipFeeId(id);
    try {
      await client.delete(`/bots/${selectedBotId}/delivery-fees/${id}`);
      addToast('Township fee deleted');
      fetchTownshipFees();
    } catch (e) {
      addToast(e.response?.data?.detail || 'Failed to delete township fee', 'error');
    } finally {
      setDeletingTownshipFeeId(null);
    }
  };

  const downloadCsvTemplate = async () => {
    try {
      const res = await client.get(`/bots/${selectedBotId}/delivery-fees/template`, {
        responseType: 'blob',
      });
      await downloadBlob(res.data, 'delivery-fees-template.xlsx');
    } catch (e) {
      addToast('Failed to download template', 'error');
    }
  };

  const handleCsvImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.csv') && !file.name.endsWith('.xlsx')) {
      addToast('Please select a .csv or .xlsx file', 'error');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    setImportingCsv(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      await client.post(`/bots/${selectedBotId}/delivery-fees/import`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      addToast('Delivery fees imported successfully');
      fetchTownshipFees();
    } catch (err) {
      addToast(err.response?.data?.detail || 'Failed to import CSV', 'error');
    } finally {
      setImportingCsv(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRegionChange = (region) => {
    setSelectedRegion(region);
    setSelectedDistrict('');
    setSelectedTownship('');
  };

  const handleDistrictChange = (district) => {
    setSelectedDistrict(district);
    setSelectedTownship('');
  };

  const copyCode = async (code) => {
    try {
      await navigator.clipboard.writeText(code);
      addToast('Copied');
    } catch { addToast('Failed to copy', 'error'); }
  };

  const generateCouponCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
    setCouponForm(prev => ({ ...prev, code }));
  };

  const normalizeForSearch = (s) => (s || '').normalize('NFKD').replace(/[̀-ͯ]/g, '');

  const filteredProducts = products?.filter(p => {
    const term = normalizeForSearch(search).toLowerCase();
    if (selectedCategoryFilter === 'hidden') {
      const isHidden = p.show_on_telegram === false && p.show_on_website === false && p.show_on_guest === false;
      if (!isHidden) return false;
    } else if (selectedCategoryFilter && p.category_id !== Number(selectedCategoryFilter)) {
      return false;
    }
    if (noCostPriceFilter && p.cost_price != null && p.cost_price !== '') return false;
    return (
      normalizeForSearch(p.name).toLowerCase().includes(term) ||
      normalizeForSearch(p.description).toLowerCase().includes(term)
    );
  }) || [];

  const handleEdit = (product) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  const handleDelete = (id) => {
    setIsDeleting(id);
  };

  if (isLoading) return <LoadingSkeleton type="grid" count={6} />;

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-lg sm:text-2xl lg:text-3xl font-bold text-gray-900">Products</h1>
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm transition-all text-sm"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
          <CategoryDropdown
            categories={categories || []}
            selected={selectedCategoryFilter}
            onSelect={setSelectedCategoryFilter}
          />
          <button
            onClick={() => setShowSorting(true)}
            className="p-2.5 bg-white text-gray-600 border border-gray-200 rounded-2xl shadow-sm hover:bg-gray-50 transition-all flex items-center gap-2 active:scale-95"
            title="Drag to reorder products"
          >
            <ArrowUpDown className="w-5 h-5" />
            <span className="hidden sm:inline font-bold">Sort</span>
          </button>
          <div className="relative">
            <button
              onClick={() => setShowCouponMenu(!showCouponMenu)}
              className="p-2.5 bg-white text-emerald-600 border border-emerald-200 rounded-2xl shadow-sm hover:bg-emerald-50 transition-all flex items-center gap-2 active:scale-95"
              title="Coupons"
            >
              <Ticket className="w-5 h-5" />
              <span className="hidden sm:inline font-bold">Coupon</span>
            </button>
            {showCouponMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowCouponMenu(false)} />
                <div className="absolute left-0 sm:left-auto sm:right-0 top-full mt-1 z-50 bg-white rounded-2xl shadow-xl border border-gray-100 py-1.5 min-w-[180px] overflow-hidden">
                  <button
                    onClick={() => { setShowCouponMenu(false); setShowCouponModal(true); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-emerald-50 hover:text-emerald-600 transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    Create Coupon
                  </button>
                  <button
                    onClick={() => { setShowCouponMenu(false); setShowCouponManager(true); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 transition-all"
                  >
                    <Ticket className="w-4 h-4" />
                    See Coupons
                  </button>
                </div>
              </>
            )}
          </div>
          <button
            onClick={() => {
              if (atProductLimit) {
                addToast('Your account has reached total limits of products', 'error');
                return;
              }
              setEditingProduct(null); setIsModalOpen(true);
            }}
            className="hidden sm:flex p-2.5 bg-indigo-600 text-white rounded-2xl shadow-lg hover:bg-indigo-700 transition-all items-center gap-2 active:scale-95"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline font-bold">New Product</span>
          </button>
          <button
            onClick={() => setShowDeliveryFeeModal(true)}
            className="p-2.5 bg-emerald-600 text-white rounded-2xl shadow-lg hover:bg-emerald-700 transition-all flex items-center gap-2 active:scale-95"
          >
            <Truck className="w-5 h-5" />
            <span className="hidden sm:inline font-bold">Delivery Fees</span>
          </button>
          <button
            onClick={() => setShowCheckoutFieldsModal(true)}
            className="p-2.5 bg-violet-600 text-white rounded-2xl shadow-lg hover:bg-violet-700 transition-all flex items-center gap-2 active:scale-95"
          >
            <ClipboardList className="w-5 h-5" />
            <span className="hidden sm:inline font-bold">Profile Info</span>
          </button>
          <button
            onClick={() => setShowPointsModal(true)}
            className="p-2.5 bg-amber-500 text-white rounded-2xl shadow-lg hover:bg-amber-600 transition-all flex items-center gap-2 active:scale-95"
          >
            <Award className="w-5 h-5" />
            <span className="hidden sm:inline font-bold">Points & Rewards</span>
          </button>
          </div>
        </div>
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
              onClick={() => {
                if (atProductLimit) {
                  addToast('Your account has reached total limits of products', 'error');
                  return;
                }
                setEditingProduct(null); setIsModalOpen(true);
              }}
              className="mt-6 px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all"
            >
              Add Your First Product
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-6 lg:gap-8">
          {filteredProducts.map(product => (
            <motion.div
              layout
              key={product.id}
              className="bg-white rounded-2xl md:rounded-3xl shadow-sm border border-gray-100 overflow-hidden hover:border-indigo-200 hover:shadow-md transition-all group"
            >
              <div className="aspect-[4/3] md:aspect-square bg-gray-50 relative overflow-hidden">
                {!product.cost_price && (
                  <div className="absolute top-1.5 left-1.5 md:top-2 md:left-2 z-10 w-2 h-2 md:w-2.5 md:h-2.5 bg-orange-400/70 rounded-full" />
                )}
                {product.image_url ? (
                  <CachedImage
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
                <div className="absolute top-2 right-2 md:top-3 md:right-3 flex gap-1.5 md:gap-2 opacity-80 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
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
                  {(() => {
                    const status = product?.specifications?.stock_status || product?.stock_status;
                    const isOOS = product?.stock_quantity === 0 || status === 'out';
                    const isLow = product?.stock_quantity !== null && product?.stock_quantity > 0 && product?.stock_quantity <= 5;
                    if (status === 'preorder') {
                      return (
                        <span className="px-1.5 py-0.5 md:px-2 md:py-1 rounded-md md:rounded-lg text-[8px] md:text-[10px] font-bold uppercase tracking-wider bg-purple-600 text-white">
                          {product.stock_quantity !== null && product.stock_quantity > 0 ? `PRE-ORDER (${product.stock_quantity} Left)` : 'PRE-ORDER'}
                        </span>
                      );
                    }
                    if (status === 'limited') {
                      return (
                        <span className="px-1.5 py-0.5 md:px-2 md:py-1 rounded-md md:rounded-lg text-[8px] md:text-[10px] font-black uppercase tracking-wider bg-amber-400 text-gray-950 shadow-sm">
                          {product.stock_quantity !== null && product.stock_quantity > 0 ? `LIMITED (${product.stock_quantity} Left)` : 'LIMITED'}
                        </span>
                      );
                    }
                    return (
                      <span className={`px-1.5 py-0.5 md:px-2 md:py-1 rounded-md md:rounded-lg text-[8px] md:text-[10px] font-bold uppercase tracking-wider ${
                        isOOS ? 'bg-rose-500 text-white' :
                        isLow ? 'bg-amber-500 text-white' :
                        'bg-emerald-500 text-white'
                      }`}>
                        {isOOS ? 'Out of Stock' :
                         product.stock_quantity !== null ? `${product.stock_quantity} In Stock` :
                         'In Stock'}
                      </span>
                    );
                  })()}
                </div>
              </div>
              <div className="p-3 md:p-4 lg:p-5">
                <div className="flex flex-col gap-0.5 mb-1">
                  <h3 className="font-bold text-gray-900 text-sm md:text-base lg:text-lg line-clamp-1">{product.name}</h3>
                  <p className="font-bold text-indigo-600 text-sm md:text-base lg:text-lg">
                    {product.original_price > 0 && <span className="text-xs line-through text-red-400 font-medium mr-1.5">{formatPrice(product.original_price, selectedBot?.currency || 'MMK')}</span>}
                    {formatPrice(product.price, selectedBot?.currency || 'MMK')}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-[8px] md:text-[10px] lg:text-xs text-gray-400 font-bold uppercase tracking-wider">
                  <Tag className="w-2.5 h-2.5 md:w-3 md:h-3" />
                  <span className="truncate">{categories?.find(c => c.id === product.category_id)?.name || 'Uncategorized'}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}


      <button
        onClick={() => {
          if (atProductLimit) {
            addToast('Your account has reached total limits of products', 'error');
            return;
          }
          setEditingProduct(null); setIsModalOpen(true);
        }}
        className="sm:hidden fixed bottom-24 right-6 w-14 h-14 bg-indigo-600 rounded-full shadow-2xl shadow-indigo-200 flex items-center justify-center text-white hover:bg-indigo-700 transition-all active:scale-90 z-40 border-4 border-white"
      >
        <Plus className="w-8 h-8" />
      </button>

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
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative bg-white rounded-[20px] md:rounded-[32px] shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto"
              >
                <ProductForm
                product={editingProduct}
                categories={categories}
                products={products}
                selectedBotId={selectedBotId}
                atCategoryLimit={atCategoryLimit}
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
            </div>
          </>
        )}
      </AnimatePresence>

      {/* Delivery Fee Settings Modal */}
      {showDeliveryFeeModal && (
        <>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50" onClick={() => setShowDeliveryFeeModal(false)} />
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-2 sm:p-4">
            <div className="bg-white rounded-2xl sm:rounded-3xl w-full max-w-lg p-3 sm:p-6 shadow-2xl max-h-[85vh] sm:max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                    <Truck className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
                  </div>
                  <h2 className="text-base sm:text-lg font-bold text-gray-900">Delivery Fee Settings</h2>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium ${deliveryFeeMode === 'zone' ? 'text-emerald-600' : 'text-gray-400'}`}>Zone</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={deliveryFeeMode === 'flat'}
                      onChange={() => setDeliveryFeeMode(deliveryFeeMode === 'flat' ? 'zone' : 'flat')}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:bg-emerald-500 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full after:content-[''] after:absolute after:top-0.5 after:start-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all" />
                  </label>
                  <span className={`text-xs font-medium ${deliveryFeeMode === 'flat' ? 'text-emerald-600' : 'text-gray-400'}`}>Flat</span>
                </div>
                <button onClick={() => setShowDeliveryFeeModal(false)} className="p-1.5 sm:p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors">
                  <X className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-500" />
                </button>
              </div>

              {deliveryFeeMode === 'flat' && (
                <div className="space-y-3 sm:space-y-4 pb-3 sm:pb-4 border-b border-gray-100">
                  <div>
                    <label className="text-xs sm:text-sm font-medium text-gray-700 block mb-1 sm:mb-1.5">Delivery Fee ({selectedBot?.currency || 'MMK'})</label>
                    <input
                      type="number"
                      value={deliveryFee}
                      onChange={(e) => setDeliveryFee(e.target.value)}
                      placeholder="e.g. 5000"
                      className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-xs sm:text-sm"
                    />
                    <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5 sm:mt-1">Flat fee added at checkout if any product has delivery fee enabled</p>
                  </div>
                  <div>
                    <label className="text-xs sm:text-sm font-medium text-gray-700 block mb-1 sm:mb-1.5">Free Delivery if spent this amount ({selectedBot?.currency || 'MMK'})</label>
                    <input
                      type="number"
                      value={freeDeliveryThreshold}
                      onChange={(e) => setFreeDeliveryThreshold(e.target.value)}
                      placeholder="e.g. 50000"
                      className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-xs sm:text-sm"
                    />
                    <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5 sm:mt-1">Delivery fee is waived when cart total reaches or exceeds this amount</p>
                  </div>
                </div>
              )}

              {deliveryFeeMode === 'zone' && (
                <>
                  {/* CSV Import Section */}
                  <div className="mt-3 sm:mt-5 pt-3 sm:pt-4 border-t border-gray-100">
                    <div className="flex gap-2">
                      <button
                        onClick={downloadCsvTemplate}
                        className="flex-1 py-2 sm:py-2.5 bg-gray-100 rounded-xl font-medium text-xs sm:text-sm text-gray-700 hover:bg-gray-200 transition-all flex items-center justify-center gap-1.5 sm:gap-2"
                      >
                        <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        Download CSV
                      </button>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={importingCsv}
                        className="flex-1 py-2 sm:py-2.5 bg-emerald-100 rounded-xl font-medium text-xs sm:text-sm text-emerald-700 hover:bg-emerald-200 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 sm:gap-2"
                      >
                        <Upload className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        {importingCsv ? 'Importing...' : 'Import CSV'}
                      </button>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,.xlsx"
                      onChange={handleCsvImport}
                      className="hidden"
                    />
                    <p className="text-[10px] sm:text-xs text-gray-400 italic mt-1.5 sm:mt-2 text-center leading-relaxed">Delivery Fees ဟာ ဒေသပေါ်မူတည်ပြီး မတူညီကြတာကြောင့် ကိုယ်နေတဲ့မြို့ပေါ်မူတည်ပြီး ကိုယ်တိုင် သတ်မှတ်ပေးပါနော်။ Excel Template ကို Download ရယူကာ သက်ဆိုင်ရာမြို့များရဲ့ Delivery Fees များကို ဖြည့်သွင်းပြီး Import CSV မှ တစ်ဆင့် ပြန်လည်ထည့်သွင်းပေးပါ။</p>
                  </div>

                  {/* Zone-based Delivery Fees */}
                  <div className="mt-3 sm:mt-5">
                    <h3 className="text-xs sm:text-sm font-bold text-gray-900 mb-2 sm:mb-3">Zone-based Delivery Fees</h3>

                    <div className="space-y-2 sm:space-y-3">
                      <div>
                        <label className="text-[10px] sm:text-xs font-medium text-gray-600 block mb-0.5 sm:mb-1">Region (တိုင်း/ပြည်နယ်)</label>
                        <SearchableSelect
                          value={selectedRegion}
                          onChange={handleRegionChange}
                          options={REGION_NAMES}
                          placeholder="Select Region"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] sm:text-xs font-medium text-gray-600 block mb-0.5 sm:mb-1">District (ခရိုင်)</label>
                        <SearchableSelect
                          value={selectedDistrict}
                          onChange={handleDistrictChange}
                          options={getDistricts(selectedRegion)}
                          placeholder="Select District"
                          disabled={!selectedRegion}
                        />
                      </div>

                      <div>
                        <label className="text-[10px] sm:text-xs font-medium text-gray-600 block mb-0.5 sm:mb-1">Township (မြို့နယ်)</label>
                        <SearchableSelect
                          value={selectedTownship}
                          onChange={setSelectedTownship}
                          options={getTownships(selectedRegion, selectedDistrict)}
                          placeholder="Select Township"
                          disabled={!selectedDistrict}
                        />
                      </div>

                      <div className="flex gap-2 items-end">
                        <div className="flex-1">
                          <label className="text-[10px] sm:text-xs font-medium text-gray-600 block mb-0.5 sm:mb-1">Delivery Fee ({selectedBot?.currency || 'MMK'})</label>
                          <input
                            type="number"
                            value={townshipFeeInput}
                            onChange={(e) => setTownshipFeeInput(e.target.value)}
                            placeholder="e.g. 3000"
                            disabled={!selectedTownship}
                            className="w-full px-2.5 sm:px-3 py-2 sm:py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-xs sm:text-sm disabled:opacity-50"
                          />
                        </div>
                        <button
                          onClick={saveTownshipFee}
                          disabled={!selectedTownship || !townshipFeeInput || savingTownshipFee}
                          className="px-3 sm:px-4 py-2 sm:py-2.5 bg-emerald-600 rounded-xl font-bold text-xs sm:text-sm text-white hover:bg-emerald-700 transition-all disabled:opacity-50 h-[36px] sm:h-[42px]"
                        >
                          {savingTownshipFee ? 'Saving...' : 'Add'}
                        </button>
                      </div>
                    </div>

                    {/* Saved township fees list */}
                    {townshipFeesLoading ? (
                      <div className="text-center py-3 sm:py-4 text-xs sm:text-sm text-gray-400">Loading...</div>
                    ) : townshipFees.length > 0 ? (
                      <div className="mt-3 sm:mt-4 space-y-1.5 sm:space-y-2 max-h-40 sm:max-h-48 overflow-y-auto">
                        {townshipFees.map((tf) => (
                          <div key={tf.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-2.5 sm:px-3 py-2 sm:py-2.5">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">{tf.township}</p>
                              <p className="text-[10px] sm:text-xs text-gray-500 truncate">{tf.region} &gt; {tf.district}</p>
                            </div>
                            <div className="flex items-center gap-1.5 sm:gap-2 ml-2 shrink-0">
                              <span className="text-xs sm:text-sm font-bold text-emerald-600">{formatPrice(Number(tf.fee), selectedBot?.currency || 'MMK')}</span>
                              <button
                                onClick={() => deleteTownshipFee(tf.id)}
                                disabled={deletingTownshipFeeId === tf.id}
                                className="p-1 sm:p-1.5 bg-white rounded-lg border border-gray-200 text-red-400 hover:text-red-600 hover:border-red-200 transition-all disabled:opacity-50"
                              >
                                <X className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center py-3 sm:py-4 text-xs sm:text-sm text-gray-400">No township fees set yet</p>
                    )}
                  </div>

                  {/* Free delivery threshold */}
                  <div className="mt-4 sm:mt-6 pt-4 sm:pt-5 border-t border-gray-100">
                    <div>
                      <label className="text-xs sm:text-sm font-medium text-gray-700 block mb-1 sm:mb-1.5">Free Delivery if spent this amount ({selectedBot?.currency || 'MMK'})</label>
                      <input
                        type="number"
                        value={freeDeliveryThreshold}
                        onChange={(e) => setFreeDeliveryThreshold(e.target.value)}
                        placeholder="e.g. 50000"
                        className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-xs sm:text-sm"
                      />
                      <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5 sm:mt-1">Delivery fee is waived when cart total reaches or exceeds this amount</p>
                    </div>
                  </div>
                </>
              )}

              <div className="sticky bottom-0 mt-10 sm:mt-12 pt-4 sm:pt-5 border-t border-gray-100 flex gap-2 sm:gap-3 bg-white">
                <button
                  onClick={() => setShowDeliveryFeeModal(false)}
                  className="flex-1 py-2 sm:py-3 bg-gray-100 rounded-xl font-medium text-xs sm:text-sm text-gray-700 hover:bg-gray-200 active:bg-gray-300 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={saveDeliverySettings}
                  disabled={deliveryFeeLoading}
                  className="flex-1 py-2 sm:py-3 bg-emerald-600 rounded-xl font-bold text-xs sm:text-sm text-white hover:bg-emerald-700 active:bg-emerald-800 transition-all disabled:opacity-50"
                >
                  {deliveryFeeLoading ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      <ConfirmDialog
        open={!!isDeleting}
        onClose={() => setIsDeleting(null)}
        onConfirm={() => {
          if (isDeleting) {
            deleteMutation.mutate(isDeleting);
          }
        }}
        title="Delete Product"
        message="Are you sure you want to delete this product? This action cannot be undone."
        confirmText="Delete"
        variant="danger"
        loading={deleteMutation.isPending}
      />

      {showSorting && (
        <ProductSorting
          products={products || []}
          categories={categories || []}
          botId={selectedBotId}
          onClose={() => setShowSorting(false)}
        />
      )}

      {/* Coupon list */}
      {coupons?.length > 0 && (
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Ticket className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-gray-900">Active Coupons</h3>
              <span className="text-[10px] text-gray-400 font-medium bg-gray-100 px-2 py-0.5 rounded-full">{coupons.length}</span>
            </div>
            <button
              onClick={() => setShowCouponModal(true)}
              className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> New
            </button>
            <button
              onClick={() => setShowCouponManager(true)}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 ml-2"
            >
              <Ticket className="w-3.5 h-3.5" /> See All
            </button>
          </div>
          <div className="divide-y divide-gray-50">
            {coupons.map(coupon => {
              const isExpired = coupon.end_date && new Date(coupon.end_date) < new Date();
              const isFullyUsed = coupon.current_uses >= coupon.total_coupons;
              const status = !coupon.is_active || isExpired ? 'expired' : isFullyUsed ? 'used' : 'active';
              return (
                <div key={coupon.id} className="px-5 py-3.5 flex items-center justify-between gap-3 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      status === 'active' ? 'bg-emerald-100 text-emerald-600' :
                      status === 'used' ? 'bg-amber-100 text-amber-600' :
                      'bg-gray-100 text-gray-400'
                    }`}>
                      <Percent className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-gray-900 font-mono">{coupon.code}</span>
                        <button onClick={() => copyCode(coupon.code)} className="text-gray-300 hover:text-indigo-600 transition-colors p-0.5">
                          <Copy className="w-3 h-3" />
                        </button>
                        <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-md ${
                          status === 'active' ? 'bg-emerald-50 text-emerald-700' :
                          status === 'used' ? 'bg-amber-50 text-amber-700' :
                          'bg-gray-100 text-gray-500'
                        }`}>
                          {status === 'active' ? 'Active' : status === 'used' ? 'Used Up' : 'Expired'}
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-500 mt-0.5">
                        {coupon.discount_type === 'percentage' ? `${coupon.discount_value}% off` : `${formatPrice(Number(coupon.discount_value), selectedBot?.currency || 'MMK')} off`}
                        {Number(coupon.min_spend) > 0 && ` · min ${formatPrice(Number(coupon.min_spend), selectedBot?.currency || 'MMK')}`}
                        {` · ${coupon.current_uses}/${coupon.total_coupons} used`}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setDeletingCoupon(coupon.id)}
                    className="p-1.5 rounded-lg text-gray-300 hover:text-rose-500 hover:bg-rose-50 transition-all flex-shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Checkout Fields Modal */}
      {showCheckoutFieldsModal && checkoutFields && (
        <>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50" onClick={() => setShowCheckoutFieldsModal(false)} />
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-2 sm:p-4">
            <div className="bg-white rounded-2xl sm:rounded-3xl w-full max-w-md p-3 sm:p-6 shadow-2xl max-h-[85vh] sm:max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-violet-100 rounded-full flex items-center justify-center">
                    <ClipboardList className="w-4 h-4 sm:w-5 sm:h-5 text-violet-600" />
                  </div>
                  <h2 className="text-base sm:text-lg font-bold text-gray-900">Checkout Profile Fields</h2>
                </div>
                <button onClick={() => setShowCheckoutFieldsModal(false)} className="p-1.5 sm:p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors">
                  <X className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-500" />
                </button>
              </div>
              <p className="text-xs text-gray-500 mb-4">Toggle which fields customers must fill at checkout. At least 2 fields must be enabled.</p>

              <div className="space-y-2">
                {[
                  { key: 'name', label: 'Full Name', required: true },
                  { key: 'phones', label: 'Phone Number' },
                  { key: 'emails', label: 'Email Address' },
                  { key: 'telegram', label: 'Telegram Username' },
                  { key: 'viber', label: 'Viber Number' },
                  { key: 'zone', label: 'Zone (Region, District, Township)' },
                  { key: 'address', label: 'Delivery Address' },
                  { key: 'notes', label: 'Notes' },
                ].map(field => (
                  <div key={field.key} className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium text-gray-700">{field.label}</span>
                      {field.required && <span className="text-[10px] text-violet-600 font-bold bg-violet-50 px-2 py-0.5 rounded-md uppercase tracking-wider">Required</span>}
                    </div>
                    <button
                      onClick={() => !field.required && toggleCheckoutField(field.key)}
                      disabled={field.required}
                      className={`relative w-11 h-6 rounded-full transition-all duration-200 ${
                        field.required || checkoutFields[field.key] ? 'bg-violet-600' : 'bg-gray-200'
                      } ${field.required ? 'opacity-80 cursor-not-allowed' : ''}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-all duration-200 ${
                        field.required || checkoutFields[field.key] ? 'translate-x-5' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>
                ))}
              </div>

              <button
                onClick={saveCheckoutFields}
                disabled={checkoutFieldsLoading}
                className="mt-6 w-full py-2.5 sm:py-3 bg-violet-600 text-white rounded-xl font-bold text-sm sm:text-base hover:bg-violet-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {checkoutFieldsLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : 'Save Settings'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Points & Rewards Modal */}
      {showPointsModal && (
        <>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50" onClick={() => setShowPointsModal(false)} />
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-2 sm:p-4">
            <div className="bg-white rounded-2xl sm:rounded-3xl w-full max-w-md p-3 sm:p-6 shadow-2xl max-h-[85vh] sm:max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-amber-100 rounded-full flex items-center justify-center">
                    <Award className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" />
                  </div>
                  <h2 className="text-base sm:text-lg font-bold text-gray-900">Points & Rewards</h2>
                </div>
                <button onClick={() => setShowPointsModal(false)} className="p-1.5 sm:p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors">
                  <X className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-500" />
                </button>
              </div>
              <p className="text-xs text-gray-500 mb-4">Configure the points & rewards system for your ecommerce store. Customers earn points when they place orders and can redeem them for discounts.</p>

              {/* Enable Points */}
              <div className="bg-gray-50 rounded-2xl border border-gray-100 overflow-hidden mb-3">
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
                          setPointsSettings(prev => ({ ...prev, enabled: !prev.enabled }));
                        }}
                        className={`relative w-14 h-7 rounded-full transition-all ${pointsSettings.enabled ? 'bg-amber-500' : 'bg-gray-300'}`}
                      >
                        <div className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-sm transition-all ${pointsSettings.enabled ? 'left-7' : 'left-0.5'}`} />
                      </button>
                    </div>
                    {pointsSettings.enabled && (
                      <>
                        {/* Earn Rate */}
                        <div>
                          <label className="text-[11px] font-bold text-gray-500 mb-1 block">Earn Rate</label>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-400">Every</span>
                            <input
                              type="number"
                              value={pointsSettings.earn_per ?? ''}
                              onChange={(e) => setPointsSettings(prev => ({ ...prev, earn_per: Number(e.target.value) }))}
                              placeholder="1000"
                              className="w-20 px-2 py-1.5 rounded-lg text-sm text-center border border-gray-200 bg-white focus:ring-2 focus:ring-amber-500 outline-none"
                            />
                            <span className="text-xs text-gray-400">{selectedBot?.currency || 'MMK'} =</span>
                            <input
                              type="number"
                              value={pointsSettings.earn_rate ?? ''}
                              onChange={(e) => setPointsSettings(prev => ({ ...prev, earn_rate: Number(e.target.value) }))}
                              placeholder="1"
                              className="w-16 px-2 py-1.5 rounded-lg text-sm text-center border border-gray-200 bg-white focus:ring-2 focus:ring-amber-500 outline-none"
                            />
                            <span className="text-xs text-gray-400">pt(s)</span>
                          </div>
                        </div>
                        {/* Redemption Rate */}
                        <div>
                          <label className="text-[11px] font-bold text-gray-500 mb-1 block">Redemption Rate</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              value={pointsSettings.redeem_points ?? ''}
                              onChange={(e) => setPointsSettings(prev => ({ ...prev, redeem_points: Number(e.target.value) }))}
                              placeholder="100"
                              className="w-16 px-2 py-1.5 rounded-lg text-sm text-center border border-gray-200 bg-white focus:ring-2 focus:ring-amber-500 outline-none"
                            />
                            <span className="text-xs text-gray-400">pts =</span>
                            <input
                              type="number"
                              value={pointsSettings.redeem_value ?? ''}
                              onChange={(e) => setPointsSettings(prev => ({ ...prev, redeem_value: Number(e.target.value) }))}
                              placeholder="1000"
                              className="w-20 px-2 py-1.5 rounded-lg text-sm text-center border border-gray-200 bg-white focus:ring-2 focus:ring-amber-500 outline-none"
                            />
                            <span className="text-xs text-gray-400">{selectedBot?.currency || 'MMK'}</span>
                          </div>
                        </div>
                        {/* Min. Redeem Points */}
                        <div>
                          <label className="text-[11px] font-bold text-gray-500 mb-1 block">Min. Redeem Points</label>
                          <input
                            type="number"
                            value={pointsSettings.min_redeem ?? ''}
                            onChange={(e) => setPointsSettings(prev => ({ ...prev, min_redeem: Number(e.target.value) }))}
                            placeholder="50"
                            className="w-full px-3 py-2 border border-gray-200 bg-white rounded-xl text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                          />
                        </div>
                        {/* Welcome Bonus */}
                        <div>
                          <label className="text-[11px] font-bold text-gray-500 mb-1 block">Welcome Bonus (points)</label>
                          <input
                            type="number"
                            value={pointsSettings.welcome_bonus ?? ''}
                            onChange={(e) => setPointsSettings(prev => ({ ...prev, welcome_bonus: Number(e.target.value) }))}
                            placeholder="0"
                            className="w-full px-3 py-2 border border-gray-200 bg-white rounded-xl text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                          />
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Cancel / Save buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowPointsModal(false)}
                  className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-2xl hover:bg-gray-200 transition-all text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={savePointsSettings}
                  disabled={savingPoints}
                  className="flex-[2] py-3 bg-amber-500 text-white font-bold rounded-2xl hover:bg-amber-600 disabled:opacity-50 transition-all flex items-center justify-center gap-2 text-sm"
                >
                  {savingPoints ? <Loader2 className="w-4 h-4 animate-spin" /> : <Award className="w-4 h-4" />}
                  Save Settings
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Coupon Create Modal */}
      <AnimatePresence>
        {showCouponModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCouponModal(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
            />
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative bg-white rounded-[20px] md:rounded-[32px] shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
              >
              <div className="px-6 pb-8">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                      <Ticket className="w-5 h-5" />
                    </div>
                    <h2 className="text-lg font-bold text-gray-900">Create Coupon</h2>
                  </div>
                  <button onClick={() => setShowCouponModal(false)} className="p-2 bg-gray-100 rounded-full">
                    <X className="w-4 h-4 text-gray-500" />
                  </button>
                </div>

                <form onSubmit={(e) => {
                  e.preventDefault();
                  if (!couponForm.code || !couponForm.discount_value || !couponForm.end_date || !couponForm.total_coupons) {
                    addToast('Please fill in all required fields', 'error');
                    return;
                  }
                  if (couponForm.discount_type === 'percentage' && Number(couponForm.discount_value) > 100) {
                    addToast('Percentage discount cannot exceed 100%', 'error');
                    return;
                  }
                  if (couponForm.discount_type === 'percentage' && (!couponForm.min_spend || Number(couponForm.min_spend) <= 0)) {
                    addToast('Minimum spend is required for percentage discounts', 'error');
                    return;
                  }
                  createCouponMutation.mutate({
                    bot_id: Number(selectedBotId),
                    code: couponForm.code.toUpperCase().slice(0, 9),
                    discount_type: couponForm.discount_type,
                    discount_value: Number(couponForm.discount_value),
                    end_date: couponForm.end_date,
                    total_coupons: Number(couponForm.total_coupons),
                    min_spend: Number(couponForm.min_spend) || 0,
                  });
                }} className="space-y-4">
                  {/* Coupon Code */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-600 ml-1">Coupon Code *</label>
                    <div className="flex gap-2 flex-wrap">
                      <input
                        required maxLength={9}
                        value={couponForm.code}
                        onChange={(e) => setCouponForm(p => ({ ...p, code: e.target.value.toUpperCase() }))}
                        placeholder="e.g. SAVE50"
                        className="flex-1 px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-mono font-bold uppercase text-sm tracking-widest min-w-0"
                      />
                      <button type="button" onClick={generateCouponCode}
                        className="px-3 py-2 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-all text-xs font-bold flex items-center gap-1.5 flex-shrink-0"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                        Generate
                      </button>
                    </div>
                    <p className="text-[10px] text-gray-400 ml-1">{couponForm.code.length}/9 characters</p>
                  </div>

                  {/* Discount Type + Value */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-600 ml-1">Discount *</label>
                    <div className="flex gap-2 flex-wrap">
                      <div className="flex bg-gray-100 p-0.5 rounded-lg flex-shrink-0">
                        <button type="button"
                          onClick={() => setCouponForm(p => ({ ...p, discount_type: 'fixed' }))}
                          className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all ${couponForm.discount_type === 'fixed' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
                        >
                          <Coins className="w-3 h-3 inline mr-0.5" />Fixed
                        </button>
                        <button type="button"
                          onClick={() => setCouponForm(p => ({ ...p, discount_type: 'percentage' }))}
                          className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all ${couponForm.discount_type === 'percentage' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
                        >
                          <Percent className="w-3 h-3 inline mr-0.5" />%
                        </button>
                      </div>
                      <input
                        required type="number" min="1"
                        max={couponForm.discount_type === 'percentage' ? 100 : undefined}
                        value={couponForm.discount_value}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (couponForm.discount_type === 'percentage' && Number(val) > 100) return;
                          setCouponForm(p => ({ ...p, discount_value: val }));
                        }}
                        placeholder={couponForm.discount_type === 'fixed' ? `Amount in ${selectedBot?.currency || 'MMK'}` : 'Percentage (max 100%)'}
                        className="flex-1 px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm min-w-0"
                      />
                    </div>
                  </div>

                  {/* End Date */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-600 ml-1">End Date *</label>
                    <div className="relative">
                      <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                      <input
                        required type="date"
                        value={couponForm.end_date}
                        onChange={(e) => setCouponForm(p => ({ ...p, end_date: e.target.value }))}
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                      />
                    </div>
                  </div>

                  {/* Total Coupons */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-600 ml-1">Total Coupons *</label>
                    <div className="relative">
                      <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                      <input
                        required type="number" min="1"
                        value={couponForm.total_coupons}
                        onChange={(e) => setCouponForm(p => ({ ...p, total_coupons: e.target.value }))}
                        placeholder="How many times can this be used?"
                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                      />
                    </div>
                  </div>

                  {/* Min Spend */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-600 ml-1">
                      Min. Spend {couponForm.discount_type === 'percentage' ? '*' : '(optional)'}
                    </label>
                    <input
                      required={couponForm.discount_type === 'percentage'}
                      type="number" min="0"
                      value={couponForm.min_spend}
                      onChange={(e) => setCouponForm(p => ({ ...p, min_spend: e.target.value }))}
                      placeholder={couponForm.discount_type === 'percentage' ? 'Required for % discount' : '0 = no minimum'}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                    />
                    <p className="text-[10px] text-gray-400 ml-1">Coupon only applies if cart total is at least this amount</p>
                  </div>

                  <div className="pt-2 flex gap-3">
                    <button type="button" onClick={() => setShowCouponModal(false)}
                      className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-2xl hover:bg-gray-200 transition-all text-sm"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={createCouponMutation.isPending}
                      className="flex-[2] py-3 bg-emerald-600 text-white font-bold rounded-2xl hover:bg-emerald-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2 text-sm"
                    >
                      {createCouponMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ticket className="w-4 h-4" />}
                      Create Coupon
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={!!deletingCoupon}
        onClose={() => setDeletingCoupon(null)}
        onConfirm={() => {
          if (deletingCoupon) {
            deleteCouponMutation.mutate(deletingCoupon);
          }
        }}
        title="Delete Coupon"
        message="Are you sure you want to delete this coupon?"
        confirmText="Delete"
        variant="danger"
        loading={deleteCouponMutation.isPending}
      />

      {/* See Coupons Modal */}
      <AnimatePresence>
        {showCouponManager && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCouponManager(false)}
              className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-[28px] shadow-2xl max-h-[85vh] flex flex-col"
            >
              <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100 shrink-0">
                <div className="flex items-center gap-2">
                  <Ticket className="w-5 h-5 text-emerald-600" />
                  <h2 className="text-lg font-bold text-gray-900">Coupon Manager</h2>
                  <span className="text-[10px] text-gray-400 font-medium bg-gray-100 px-2 py-0.5 rounded-full">{coupons?.length || 0}</span>
                </div>
                <button
                  onClick={() => setShowCouponManager(false)}
                  className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center active:scale-90 transition-transform"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto min-h-0 p-5 pt-4">
                {!coupons || coupons.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Ticket className="w-8 h-8 text-gray-300" />
                    </div>
                    <p className="text-sm font-bold text-gray-900 mb-1">No coupons yet</p>
                    <p className="text-xs text-gray-400">Create your first coupon to start offering discounts.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {coupons.map(coupon => {
                      const isExpired = coupon.end_date && new Date(coupon.end_date) < new Date();
                      const isFullyUsed = coupon.current_uses >= coupon.total_coupons;
                      const status = !coupon.is_active || isExpired ? 'expired' : isFullyUsed ? 'used' : 'active';
                      const remaining = Math.max(0, (coupon.total_coupons || 0) - (coupon.current_uses || 0));
                      return (
                        <div key={coupon.id} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                                status === 'active' ? 'bg-emerald-100 text-emerald-600' :
                                status === 'used' ? 'bg-amber-100 text-amber-600' :
                                'bg-gray-100 text-gray-400'
                              }`}>
                                <Percent className="w-5 h-5" />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-bold text-gray-900 font-mono">{coupon.code}</span>
                                  <button onClick={() => copyCode(coupon.code)} className="text-gray-300 hover:text-indigo-600 transition-colors p-0.5">
                                    <Copy className="w-3.5 h-3.5" />
                                  </button>
                                  <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-md ${
                                    status === 'active' ? 'bg-emerald-50 text-emerald-700' :
                                    status === 'used' ? 'bg-amber-50 text-amber-700' :
                                    'bg-gray-100 text-gray-500'
                                  }`}>
                                    {status === 'active' ? 'Active' : status === 'used' ? 'Used Up' : 'Expired'}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                  {coupon.discount_type === 'percentage' ? `${coupon.discount_value}% off` : `${formatPrice(Number(coupon.discount_value), selectedBot?.currency || 'MMK')} off`}
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={() => setDeletingCoupon(coupon.id)}
                              className="p-1.5 rounded-lg text-gray-300 hover:text-rose-500 hover:bg-rose-50 transition-all flex-shrink-0"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="mt-3 grid grid-cols-3 gap-3">
                            <div className="bg-gray-50 rounded-xl p-2.5 text-center">
                              <p className="text-[10px] text-gray-400 font-medium">Used</p>
                              <p className="text-sm font-bold text-gray-900">{coupon.current_uses || 0}</p>
                            </div>
                            <div className="bg-gray-50 rounded-xl p-2.5 text-center">
                              <p className="text-[10px] text-gray-400 font-medium">Remaining</p>
                              <p className="text-sm font-bold text-emerald-600">{remaining}</p>
                            </div>
                            <div className="bg-gray-50 rounded-xl p-2.5 text-center">
                              <p className="text-[10px] text-gray-400 font-medium">Total</p>
                              <p className="text-sm font-bold text-gray-900">{coupon.total_coupons}</p>
                            </div>
                          </div>
                          {Number(coupon.min_spend) > 0 && (
                            <p className="text-[10px] text-gray-400 mt-2">Min. spend: {formatPrice(Number(coupon.min_spend), selectedBot?.currency || 'MMK')}</p>
                          )}
                          {coupon.end_date && (
                            <p className="text-[10px] text-gray-400 mt-0.5">Expires: {new Date(coupon.end_date).toLocaleDateString()}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="px-5 py-4 border-t border-gray-100 shrink-0">
                <button
                  onClick={() => { setShowCouponManager(false); setShowCouponModal(true); }}
                  className="w-full py-3 bg-emerald-600 text-white font-bold rounded-2xl hover:bg-emerald-700 transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Create New Coupon
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

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
        resolve(new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() }));
      }, 'image/jpeg', 0.8);
    };
    img.src = URL.createObjectURL(file);
  });
}

function CategoryDropdown({ categories, selected, onSelect }) {
  const [open, setOpen] = useState(false);
  const [deletingCategory, setDeletingCategory] = useState(null);
  const [confirmStep, setConfirmStep] = useState(1);
  const ref = useRef(null);
  const queryClient = useQueryClient();
  const deleteMutation = useMutation({
    mutationFn: (id) => deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      if (selected === String(deletingCategory?.id)) onSelect('');
      setDeletingCategory(null);
      setConfirmStep(1);
      setOpen(false);
      addToast('Category and its products deleted', 'success');
    },
  });

  useEffect(() => {
    const handle = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('pointerdown', handle);
    return () => document.removeEventListener('pointerdown', handle);
  }, []);

  const handleCloseConfirm = () => {
    setDeletingCategory(null);
    setConfirmStep(1);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={`p-2.5 rounded-2xl border transition-all flex items-center gap-2 active:scale-95 text-sm font-bold whitespace-nowrap ${
          selected
            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
            : 'bg-white text-gray-600 border-gray-200 shadow-sm hover:bg-gray-50'
        }`}
      >
        <Tag className="w-5 h-5" />
        <span className="hidden sm:inline max-w-[80px] truncate">
          {selected === 'hidden' ? 'Hidden' : selected ? categories.find(c => String(c.id) === selected)?.name || 'Category' : 'All'}
        </span>
      </button>
      {open && (
        <div className="absolute left-0 sm:left-1/2 sm:-translate-x-1/2 top-full mt-1 w-48 bg-white rounded-2xl shadow-xl border border-gray-100 py-1.5 z-50 max-h-60 overflow-y-auto">
          <button
            onClick={() => { onSelect(''); setOpen(false); }}
            className={`w-full text-left px-4 py-2.5 text-sm font-bold transition-colors ${!selected ? 'text-indigo-600 bg-indigo-50' : 'text-gray-700 hover:bg-gray-50'}`}
          >
            All
          </button>
          <button
            onClick={() => { onSelect('hidden'); setOpen(false); }}
            className={`w-full text-left px-4 py-2.5 text-sm font-bold transition-colors ${selected === 'hidden' ? 'text-indigo-600 bg-indigo-50' : 'text-gray-700 hover:bg-gray-50'}`}
          >
            Hidden
          </button>
          {categories.map(cat => (
            <div key={cat.id} className={`flex items-center px-4 py-2.5 text-sm font-bold transition-colors ${selected === String(cat.id) ? 'text-indigo-600 bg-indigo-50' : 'text-gray-700 hover:bg-gray-50'}`}>
              <button
                onClick={() => { onSelect(String(cat.id)); setOpen(false); }}
                className="flex-1 text-left truncate"
              >
                {cat.name}
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setDeletingCategory(cat); setConfirmStep(1); }}
                className="p-1 ml-1 text-gray-400 hover:text-rose-500 transition-colors flex-shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {confirmStep === 1 && (
        <ConfirmDialog
          open={!!deletingCategory}
          onClose={handleCloseConfirm}
          onConfirm={() => setConfirmStep(2)}
          title="Delete Category"
          message={`Every product in "${deletingCategory?.name || ''}" will be deleted. Are you sure?`}
          confirmText="Delete"
          variant="danger"
        />
      )}

      {confirmStep === 2 && (
        <ConfirmDialog
          open={!!deletingCategory}
          onClose={handleCloseConfirm}
          onConfirm={() => { if (deletingCategory) deleteMutation.mutate(deletingCategory.id); }}
          title="Are you absolutely sure?"
          message="This action cannot be undone."
          confirmText="Yes, Delete"
          variant="danger"
          loading={deleteMutation.isPending}
        />
      )}
    </div>
  );
}

function ProductForm({ product, categories, products, onClose, onSubmit, isLoading, selectedBotId, atCategoryLimit }) {
  const { selectedBot } = useSelectedBot();
  const [formData, setFormData] = useState({
    name: product?.name || '',
    description: product?.description || '',
    price: product?.price || '',
    original_price: product?.original_price || '',
    category_id: product?.category_id || '',
    apply_delivery_fee: product?.apply_delivery_fee || false,
    cost_price: product?.cost_price || '',
    show_on_telegram: product?.show_on_telegram !== undefined ? product.show_on_telegram : true,
    show_on_website: product?.show_on_website !== undefined ? product.show_on_website : true,
    show_on_guest: product?.show_on_guest !== undefined ? product.show_on_guest : true,
  });
  const [nameError, setNameError] = useState(false);
  const [categoryError, setCategoryError] = useState(false);
  const [showAdditional, setShowAdditional] = useState(() => !!product?.cost_price);
  const [promotion, setPromotion] = useState(() => !!product?.original_price);
  const [stockOption, setStockOption] = useState(() => {
    if (product?.specifications?.stock_status) {
      return product.specifications.stock_status;
    }
    if (product?.stock_status) {
      return product.stock_status;
    }
    if (product?.stock_quantity === null || product?.stock_quantity === undefined) return 'unlimited';
    if (product?.stock_quantity === 0) return 'out';
    return 'custom';
  });
  const [customStock, setCustomStock] = useState(() => {
    if (product?.stock_quantity > 0) return String(product.stock_quantity);
    return '';
  });
  const [editingStockQtyFor, setEditingStockQtyFor] = useState(() => {
    const status = product?.specifications?.stock_status || product?.stock_status;
    if ((status === 'preorder' || status === 'limited') && product?.stock_quantity > 0) {
      return status;
    }
    return null;
  });
  const [specPrices, setSpecPrices] = useState(() => {
    if (product?.spec_prices) {
      if (Array.isArray(product.spec_prices)) return product.spec_prices;
      if (typeof product.spec_prices === 'string') {
        try { return JSON.parse(product.spec_prices); } catch (e) { return []; }
      }
    }
    return [];
  });
  const [showSpecModal, setShowSpecModal] = useState(false);
  const [specPriceInput, setSpecPriceInput] = useState('');
  const [specSelectedColor, setSpecSelectedColor] = useState(null);
  const [specSelectedOptions, setSpecSelectedOptions] = useState({});
  const { addToast } = useToastStore();
  const queryClient = useQueryClient();
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [catDropdownOpen, setCatDropdownOpen] = useState(false);
  const [editingCatId, setEditingCatId] = useState(null);
  const [editingCatValue, setEditingCatValue] = useState('');
  const catDropdownRef = useRef(null);

  useEffect(() => {
    const handle = (e) => { if (catDropdownRef.current && !catDropdownRef.current.contains(e.target)) setCatDropdownOpen(false); };
    document.addEventListener('pointerdown', handle);
    return () => document.removeEventListener('pointerdown', handle);
  }, []);
  const [images, setImages] = useState(() => {
    if (product?.image_url) {
      try {
        const parsed = JSON.parse(product.image_url);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map(m => ({ file_id: m.file_id, type: 'photo' }));
        }
      } catch (e) {
        if (typeof product.image_url === 'string' && product.image_url) {
          return [{ file_id: product.image_url, type: 'photo' }];
        }
      }
    }
    return [];
  });
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (images.length >= 10) {
      addToast('Maximum 10 photos allowed', 'error');
      return;
    }
    setUploading(true);
    try {
      const compressed = await compressImage(file);
      const res = await uploadImage(compressed, selectedBotId);
      setImages(prev => [...prev, { file_id: res.file_id, type: 'photo' }]);
    } catch (err) {
      console.error('Upload failed', err);
      addToast('Failed to upload image', 'error');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const [colors, setColors] = useState(() => {
    if (product?.specifications?.colors && Array.isArray(product.specifications.colors)) {
      return product.specifications.colors;
    }
    return [];
  });
  const [options, setOptions] = useState(() => {
    if (product?.specifications?.options && Array.isArray(product.specifications.options)) {
      return product.specifications.options;
    }
    return [];
  });
  const [optionErrors, setOptionErrors] = useState({});

  const [showUnsavedConfirmModal, setShowUnsavedConfirmModal] = useState(false);
  const initialSnapshotRef = useRef(null);

  useEffect(() => {
    initialSnapshotRef.current = JSON.stringify({
      formData,
      promotion,
      stockOption,
      customStock,
      images,
      colors,
      options,
      specPrices
    });
  }, []);

  const checkIsDirty = useCallback(() => {
    if (!initialSnapshotRef.current) return false;
    const currentSnapshot = JSON.stringify({
      formData,
      promotion,
      stockOption,
      customStock,
      images,
      colors,
      options,
      specPrices
    });
    return currentSnapshot !== initialSnapshotRef.current;
  }, [formData, promotion, stockOption, customStock, images, colors, options, specPrices]);

  const handleRequestClose = () => {
    if (checkIsDirty()) {
      setShowUnsavedConfirmModal(true);
    } else {
      onClose();
    }
  };

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (checkIsDirty()) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    window.history.pushState({ modalOpen: true }, '');

    const handlePopState = () => {
      if (checkIsDirty()) {
        window.history.pushState({ modalOpen: true }, '');
        setShowUnsavedConfirmModal(true);
      } else {
        onClose();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [checkIsDirty, onClose]);
  const uid = () => Math.random().toString(36).substring(2, 9);

  const clearOptionError = (id) => {
    setOptionErrors(prev => {
      if (!prev[id]) return prev;
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
  };

  const addOption = () => {
    setOptions(prev => [...prev, { id: uid(), name: '', values: [] }]);
  };

  const removeOption = (id) => {
    setOptions(prev => prev.filter(o => o.id !== id));
    clearOptionError(id);
  };

  const updateOptionName = (id, name) => {
    setOptions(prev => prev.map(o => o.id === id ? { ...o, name } : o));
    clearOptionError(id);
  };

  const addOptionValue = (optionId) => {
    setOptions(prev => prev.map(o => o.id === optionId ? { ...o, values: [...o.values, { id: uid(), label: '' }] } : o));
    clearOptionError(optionId);
  };

  const updateOptionValue = (optionId, valueId, label) => {
    setOptions(prev => prev.map(o => o.id === optionId ? { ...o, values: o.values.map(v => v.id === valueId ? { ...v, label } : v) } : o));
    if (label && label.trim() !== '') clearOptionError(optionId);
  };

  const removeOptionValue = (optionId, valueId) => {
    setOptions(prev => {
      const updated = prev.map(o => o.id === optionId ? { ...o, values: o.values.filter(v => v.id !== valueId) } : o);
      const target = updated.find(o => o.id === optionId);
      if (target && target.values.length === 0) {
        return updated.filter(o => o.id !== optionId);
      }
      return updated;
    });
  };
  const [showColorPickerModal, setShowColorPickerModal] = useState(false);
  const [previewColorHex, setPreviewColorHex] = useState('#FF0000');
  const [previewColorName, setPreviewColorName] = useState('Red');
  const [previewColorError, setPreviewColorError] = useState('');
  const [isCustomPicker, setIsCustomPicker] = useState(false);
  const [showPhotoConfirm, setShowPhotoConfirm] = useState(false);
  const [uploadingColor, setUploadingColor] = useState(null);
  const colorFileInputRef = useRef(null);
  const pendingColorRef = useRef(null);

  const openColorPickerModal = () => {
    const availablePreset = PREDEFINED_COLORS.find(p => !colors.some(c => c.color.toLowerCase() === p.hex.toLowerCase())) || PREDEFINED_COLORS[0];
    setPreviewColorHex(availablePreset.hex);
    setPreviewColorName(availablePreset.name);
    setPreviewColorError('');
    setIsCustomPicker(false);
    setShowColorPickerModal(true);
  };

  const handleSelectPresetSwatch = (preset) => {
    setPreviewColorHex(preset.hex);
    setPreviewColorName(preset.name);
    setPreviewColorError('');
    setIsCustomPicker(false);
  };

  const handleCustomColorInput = (e) => {
    const hex = e.target.value;
    if (!hex) return;
    setPreviewColorHex(hex);
    if (!isCustomPicker) {
      setIsCustomPicker(true);
      setPreviewColorName(getColorName(hex));
    }
  };

  const saveSelectedColor = () => {
    const trimmedName = previewColorName.trim();
    if (!trimmedName) {
      setPreviewColorError('Please enter a color name.');
      return;
    }

    if (colors.some(c => c.color.toLowerCase() === previewColorHex.toLowerCase())) {
      setPreviewColorError(`Color hex ${previewColorHex} is already added to this product.`);
      return;
    }

    if (colors.some(c => (c.name && c.name.toLowerCase() === trimmedName.toLowerCase()))) {
      setPreviewColorError(`Color name "${trimmedName}" is already added to this product.`);
      return;
    }

    if (isCustomPicker) {
      const presetMatch = PREDEFINED_COLORS.find(
        p => p.name.toLowerCase() === trimmedName.toLowerCase()
      );
      if (presetMatch && presetMatch.hex.toLowerCase() !== previewColorHex.toLowerCase()) {
        setPreviewColorError(`"${trimmedName}" is a preset color name. Please select it from the preset grid or enter a unique custom name.`);
        return;
      }
    }

    pendingColorRef.current = { color: previewColorHex, name: trimmedName };
    setShowColorPickerModal(false);
    setShowPhotoConfirm(true);
  };

  const handleColorNoPhoto = () => {
    const target = pendingColorRef.current;
    if (!target) return;
    pendingColorRef.current = null;
    setShowPhotoConfirm(false);
    setColors(prev => [...prev, typeof target === 'string' ? { color: target, name: getColorName(target) } : target]);
  };

  const handleCustomColorPick = (e) => {
    const hex = e.target.value;
    if (!hex) return;
    e.target.value = '';
    const name = pendingCustomNameRef.current || getColorName(hex);
    pendingCustomNameRef.current = null;

    if (colors.some(c => c.color === hex)) {
      addToast('Color already added', 'error');
      return;
    }

    pendingColorRef.current = { color: hex, name };
    setShowColorPicker(false);
    setShowPhotoConfirm(true);
  };

  const handleColorImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !pendingColorRef.current) return;
    const target = pendingColorRef.current;
    pendingColorRef.current = null;
    setShowPhotoConfirm(false);
    const colorHex = typeof target === 'string' ? target : target.color;
    setUploadingColor(colorHex);
    try {
      const compressed = await compressImage(file, 720);
      const res = await uploadImage(compressed, selectedBotId);
      const colorObj = typeof target === 'string'
        ? { color: target, name: getColorName(target), file_id: res.file_id }
        : { ...target, file_id: res.file_id };
      setColors(prev => [...prev, colorObj]);
    } catch (err) {
      addToast('Failed to upload color image', 'error');
    } finally {
      setUploadingColor(null);
      if (colorFileInputRef.current) colorFileInputRef.current.value = '';
    }
  };

  const removeColor = (hex) => {
    setColors(prev => prev.filter(c => c.color !== hex));
  };

  const createCategoryMutation = useMutation({
    mutationFn: (name) => createCategory({ bot_id: Number(selectedBotId), name }),
    onSuccess: () => {
      queryClient.invalidateQueries(['categories', selectedBotId]);
      addToast('Category created');
      setShowNewCategory(false);
      setNewCategoryName('');
    },
    onError: (err) => {
      addToast(err.response?.data?.detail || 'Failed to create category', 'error');
    },
  });

  const renameCategoryMutation = useMutation({
    mutationFn: ({ id, name }) => updateCategory(id, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries(['categories', selectedBotId]);
      setEditingCatId(null);
      setEditingCatValue('');
    },
    onError: (err) => {
      addToast(err.response?.data?.detail || 'Failed to rename category', 'error');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setNameError(false);
    setCategoryError(false);

    if (!formData.category_id) {
      setCategoryError(true);
      setCatDropdownOpen(true);
      addToast('Please select a category for this product.', 'error');
      if (catDropdownRef.current) {
        catDropdownRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    // Check if admin filled Title, but didn't add option values
    const invalidOptions = options.filter(opt => {
      const hasName = opt.name && opt.name.trim() !== '';
      const hasValues = opt.values && opt.values.some(v => v.label && v.label.trim() !== '');
      return hasName && !hasValues;
    });

    if (invalidOptions.length > 0) {
      const errMap = {};
      invalidOptions.forEach(opt => {
        errMap[opt.id] = 'Add at least one option. Title only not allowed';
      });
      setOptionErrors(errMap);
      addToast('Add at least one option. Title only not allowed', 'error');

      const firstId = invalidOptions[0].id;
      setTimeout(() => {
        const el = document.getElementById(`option-box-${firstId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 50);
      return;
    }

    if (promotion && Number(formData.price) > Number(formData.original_price)) {
      addToast('Promotion price cannot exceed original price', 'error');
      return;
    }
    if (products) {
      const duplicate = products.some(p =>
        p.name === formData.name.trim() && (!product || p.id !== product.id)
      );
      if (duplicate) {
        setNameError(true);
        addToast('Product name already exists. Please use a different name.', 'error');
        return;
      }
    }

    const imageUrl = images.length > 0
      ? JSON.stringify(images.map(img => ({ file_id: img.file_id, type: 'photo' })))
      : null;
    const validOptions = options.filter(opt => {
      const hasName = opt.name && opt.name.trim() !== '';
      const hasValues = opt.values && opt.values.some(v => v.label && v.label.trim() !== '');
      return hasName || hasValues;
    });
    const specs = {
      ...(product?.specifications || {}),
      stock_status: stockOption,
      colors: colors,
      options: validOptions,
    };

    const { cost_price, ...rest } = formData;
    onSubmit({
      ...rest,
      cost_price: cost_price ? Number(cost_price) : null,
      apply_delivery_fee: formData.apply_delivery_fee || false,
      price: Number(formData.price),
      original_price: promotion && formData.original_price ? Number(formData.original_price) : null,
      stock_quantity: stockOption === 'unlimited' ? null : stockOption === 'out' ? 0 : stockOption === 'custom' ? (customStock !== '' ? Number(customStock) : null) : editingStockQtyFor === stockOption && customStock !== '' ? Number(customStock) : null,
      stock_status: stockOption,
      category_id: formData.category_id ? Number(formData.category_id) : null,
      image_url: imageUrl,
      specifications: specs,
      spec_prices: sanitizeSpecPrices(specPrices, colors, options),
    });
  };

  return (
    <div className="p-5 pb-5">
      <div className="flex justify-center mb-4">
        <div className="w-10 h-1 bg-gray-200 rounded-full" />
      </div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">
          {product ? 'Edit Product' : 'New Product'}
        </h2>
        <button onClick={handleRequestClose} className="p-2 bg-gray-100 rounded-full">
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-bold text-gray-700 ml-1">Category <span className="text-red-500">*</span></label>
            {categoryError && (
              <span className="text-xs font-bold text-red-500 animate-pulse">Category is required</span>
            )}
          </div>
          <div className="relative" ref={catDropdownRef}>
            <button
              type="button"
              onClick={() => { setCatDropdownOpen(!catDropdownOpen); setCategoryError(false); }}
              className={`w-full px-4 py-3 rounded-2xl outline-none transition-all font-medium text-sm flex items-center justify-between gap-2 ${
                categoryError
                  ? 'bg-red-50/50 border-2 border-red-500 text-red-900 focus:ring-2 focus:ring-red-400'
                  : 'bg-gray-50 border border-gray-100 focus:ring-2 focus:ring-indigo-500'
              }`}
            >
              <span className={formData.category_id ? 'text-gray-900 font-semibold' : categoryError ? 'text-red-500 font-bold' : 'text-gray-400'}>
                {formData.category_id
                  ? categories?.find(c => String(c.id) === String(formData.category_id))?.name || 'Select Category'
                  : 'Select Category'}
              </span>
              <ChevronDown className={`w-4 h-4 transition-transform ${categoryError ? 'text-red-500' : 'text-gray-400'} ${catDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            {catDropdownOpen && (
              <div className="absolute left-0 top-full mt-1 w-full bg-white rounded-2xl shadow-xl border border-gray-100 z-50 max-h-60 overflow-y-auto">
                <div className="sticky top-0 bg-white z-10 border-b border-gray-100 p-1 shadow-xs">
                  <button
                    type="button"
                    onClick={() => {
                      if (atCategoryLimit) {
                        addToast('Your account has reached total limits of category', 'error');
                        return;
                      }
                      setCatDropdownOpen(false);
                      setShowNewCategory(true);
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm font-bold rounded-xl transition-colors ${atCategoryLimit ? 'text-gray-300 cursor-not-allowed' : 'text-indigo-600 hover:bg-indigo-50 bg-indigo-50/50'}`}
                    disabled={atCategoryLimit}
                  >
                    <FolderPlus className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                    Create New Category
                  </button>
                </div>
                <div className="py-1">
                  {categories?.map(cat => (
                    <div key={cat.id} className="flex items-center px-3 py-2 text-sm font-bold transition-colors hover:bg-gray-50 gap-1">
                      {editingCatId === cat.id ? (
                        <input
                          type="text"
                          value={editingCatValue}
                          onChange={(e) => setEditingCatValue(e.target.value)}
                          onBlur={() => {
                            const trimmed = editingCatValue.trim();
                            if (trimmed && trimmed !== cat.name) {
                              renameCategoryMutation.mutate({ id: cat.id, name: trimmed });
                            } else {
                              setEditingCatId(null);
                              setEditingCatValue('');
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') e.target.blur();
                            if (e.key === 'Escape') { setEditingCatId(null); setEditingCatValue(''); }
                          }}
                          className="flex-1 px-2 py-1 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => { setFormData({ ...formData, category_id: cat.id }); setCategoryError(false); setCatDropdownOpen(false); }}
                            className={`flex-1 text-left truncate ${String(formData.category_id) === String(cat.id) ? 'text-indigo-600 font-bold' : 'text-gray-700'}`}
                          >
                            {cat.name}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setEditingCatId(cat.id); setEditingCatValue(cat.name); }}
                            className="p-1 text-gray-400 hover:text-indigo-600 transition-colors flex-shrink-0"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  ))}
                  {(!categories || categories.length === 0) && (
                    <div className="px-3 py-4 text-sm text-gray-400 text-center">No categories yet</div>
                  )}
                </div>
              </div>
            )}
          </div>
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
                onClick={() => {
                  if (atCategoryLimit) {
                    addToast('Your account has reached total limits of category', 'error');
                    return;
                  }
                  const trimmed = newCategoryName.trim();
                  if (!trimmed) return;
                  if (categories?.some(c => c.name.toLowerCase() === trimmed.toLowerCase())) {
                    addToast('Category "' + trimmed + '" already exists. Use a different name.', 'error');
                    return;
                  }
                  createCategoryMutation.mutate(trimmed);
                }}
                disabled={!newCategoryName.trim() || createCategoryMutation.isPending}
                className="px-3 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl disabled:opacity-40 hover:bg-indigo-700 transition-all"
              >
                {createCategoryMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
              </button>
              <button
                type="button"
                onClick={() => { setShowNewCategory(false); setNewCategoryName(''); }}
                className="px-3 py-2 text-gray-500 text-sm font-bold rounded-xl hover:bg-gray-100 transition-all flex-shrink-0 whitespace-nowrap"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-gray-700 ml-1">Product Name</label>
          <input
            required
            type="text"
            value={formData.name}
            onChange={(e) => { setNameError(false); setFormData({ ...formData, name: e.target.value }); }}
            placeholder="e.g. Premium Coffee Beans"
            className={`w-full px-4 py-3 bg-gray-50 border rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium ${nameError ? 'border-red-400 ring-2 ring-red-200' : 'border-gray-100'}`}
          />
        </div>

        <div className="space-y-2">
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700 ml-1">Price ({selectedBot?.currency || 'MMK'})
              <label className="ml-3 text-sm font-normal text-gray-500 cursor-pointer select-none" onClick={(e) => { e.stopPropagation();
                if (!promotion && !formData.original_price) {
                  setFormData(prev => ({ ...prev, original_price: prev.price }));
                }
                setPromotion(!promotion);
              }}>
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
                  className="w-1/2 px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium" />
                <input required type="number" value={formData.price}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData({ ...formData, price: val });
                  }}
                  placeholder="Promotion Price"
                  className="w-1/2 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-medium" />
              </div>
            ) : (
              <input required type="number" value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="0"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium" />
            )}
            {promotion && Number(formData.price) > Number(formData.original_price) && (
              <p className="text-xs text-rose-500 font-medium mt-1">Promotion price cannot exceed original price</p>
            )}
          </div>

        {/* Additional Settings - Cost Price */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setShowAdditional(!showAdditional)}
            className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 rounded-2xl border border-gray-100 text-sm font-bold text-gray-700 hover:bg-gray-100 transition-all"
          >
            <div className="flex items-center gap-2">
              <BadgeDollarSign className="w-4 h-4 text-emerald-500" />
              💰 Cost Price
            </div>
            <motion.div
              animate={{ rotate: showAdditional ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </motion.div>
          </button>
          <AnimatePresence initial={false}>
            {showAdditional && (
              <motion.div
                key="additional-settings"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: 'easeInOut' }}
                className="overflow-hidden"
              >
                <div className="space-y-3 pt-1">
                  <div className="space-y-2">
                    <label className="text-[10px] text-gray-400 ml-1">Not public — just to track net profit. You can ignore this.</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.cost_price}
                      onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                      placeholder="Enter cost price"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
                      onKeyDown={(e) => { if (e.key === '-' || e.key === 'e') e.preventDefault(); }}
                    />
                    {formData.cost_price && Number(formData.cost_price) > 0 && (
                      <p className="text-sm font-semibold ml-1">
                        Estimated Profit: <span className="text-emerald-600">
                          {formatPrice(Number(formData.price || 0) - Number(formData.cost_price || 0), selectedBot?.currency || 'MMK')}
                        </span>
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700 ml-1">Stock</label>
            <div className="flex gap-1.5 flex-wrap">
              {[
                { value: 'unlimited', label: 'In stock' },
                { value: 'out', label: 'Out of Stock' },
                { value: 'preorder', label: 'Pre-order', hasPencil: true },
                { value: 'limited', label: 'Limited', hasPencil: true },
                { value: 'custom', label: 'Custom Quantity' },
              ].map(opt => {
                const isSelected = stockOption === opt.value;
                const isPencilOpen = editingStockQtyFor === opt.value;
                return (
                  <div key={opt.value} className="flex items-center">
                    {opt.hasPencil ? (
                      <div
                        className={`inline-flex items-center rounded-lg text-xs font-bold transition-all border overflow-hidden ${
                          isSelected
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                            : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setStockOption(opt.value);
                            setEditingStockQtyFor(null);
                          }}
                          className="px-3 py-1.5 hover:opacity-90 active:scale-95 transition-all"
                        >
                          {opt.label}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setStockOption(opt.value);
                            setEditingStockQtyFor(prev => prev === opt.value ? null : opt.value);
                          }}
                          className={`px-2 py-1.5 hover:opacity-80 transition-all border-l ${
                            isSelected ? 'border-indigo-400/50 hover:bg-indigo-700' : 'border-gray-200 hover:bg-gray-200'
                          }`}
                          title="Click to set stock quantity"
                        >
                          <Pencil
                            className={`w-3 h-3 ${
                              isPencilOpen
                                ? 'text-amber-300 scale-110'
                                : isSelected
                                ? 'text-white'
                                : 'text-gray-400 hover:text-indigo-600'
                            }`}
                          />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setStockOption(opt.value);
                          setEditingStockQtyFor(null);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          isSelected
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        {opt.label}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            {(stockOption === 'custom' || (editingStockQtyFor === stockOption && (stockOption === 'preorder' || stockOption === 'limited'))) && (
              <div className="mt-2 space-y-1.5 animate-in fade-in duration-150">
                <div className="flex items-center justify-between text-xs font-semibold text-gray-600 ml-1">
                  <span>
                    {stockOption === 'preorder'
                      ? 'Pre-order Stock Quantity (optional)'
                      : stockOption === 'limited'
                      ? 'Limited Stock Quantity (optional)'
                      : 'Stock Quantity'}
                  </span>
                  {customStock && <span className="text-indigo-600 font-bold">{customStock} items</span>}
                </div>
                <input
                  required={stockOption === 'custom'}
                  type="number"
                  min="0"
                  value={customStock}
                  onChange={(e) => setCustomStock(e.target.value)}
                  placeholder={
                    stockOption === 'preorder'
                      ? 'Enter pre-order max quantity (e.g. 10)'
                      : stockOption === 'limited'
                      ? 'Enter limited stock quantity (e.g. 10)'
                      : 'Enter quantity'
                  }
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
                />
              </div>
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
            className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium resize-none"
          />
        </div>

        {/* Delivery fee toggle */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-gray-500" />
            <p className="text-sm font-semibold text-gray-700">Delivery Fees</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={formData.apply_delivery_fee}
              onChange={(e) => setFormData({ ...formData, apply_delivery_fee: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-emerald-500 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full after:content-[''] after:absolute after:top-0.5 after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" />
          </label>
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
              {images.map((img, index) => (
                <div key={index} className={`relative ${images.length === 1 ? 'w-48 h-48' : 'aspect-square'}`}>
                  <CachedImage
                    src={getImageUrl(img.file_id, selectedBotId)}
                    alt={`Photo ${index + 1}`}
                    className="w-full h-full object-cover rounded-2xl border border-gray-200"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute -top-2 -right-2 w-7 h-7 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-rose-600 transition-all active:scale-90"
                  >
                    <X className="w-4 h-4" />
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
              className={`w-full ${images.length === 0 ? 'py-12 border-2 border-dashed border-gray-200 rounded-2xl' : 'py-3 border-2 border-dashed border-gray-200 rounded-xl'} flex flex-col items-center gap-2 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all active:scale-[0.98]`}
            >
              {uploading ? (
                <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
              ) : (
                <>
                  <ImageUp className={images.length === 0 ? 'w-8 h-8 text-gray-300' : 'w-5 h-5 text-gray-300'} />
                  <span className={`font-bold text-gray-500 ${images.length === 0 ? 'text-sm' : 'text-xs'}`}>
                    {images.length === 0 ? 'Upload Photos' : 'Add More'}
                  </span>
                  {images.length === 0 && (
                    <span className="text-[10px] text-gray-400">Auto-compress • JPEG • Max 10 photos</span>
                  )}
                </>
              )}
            </button>
          )}
        </div>

        {/* Price per Specs Button & Modal */}
        {(() => {
          const hasColorsOrOptions = (colors && colors.length > 0) || (options && options.some(o => o.name && o.values && o.values.length > 0));
          const isSpecDisabled = !hasColorsOrOptions;
          return (
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  if (isSpecDisabled) return;
                  setShowSpecModal(true);
                }}
                disabled={isSpecDisabled}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl border text-sm font-bold transition-all ${
                  isSpecDisabled
                    ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed opacity-50'
                    : 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100 shadow-sm active:scale-98'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-purple-600" />
                  <span>Price per Specs</span>
                  {specPrices.length > 0 && (
                    <span className="px-2 py-0.5 text-xs bg-purple-600 text-white rounded-full font-extrabold ml-1">
                      {specPrices.length}
                    </span>
                  )}
                </div>
                <ChevronRight className={`w-4 h-4 ${isSpecDisabled ? 'text-gray-300' : 'text-purple-400'}`} />
              </button>

              <AnimatePresence>
                {showSpecModal && (
                  <>
                    <div
                      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[70]"
                      onClick={() => setShowSpecModal(false)}
                    />
                    <div className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-4">
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-5 sm:p-6 max-h-[90vh] overflow-y-auto"
                      >
                        <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600">
                              <Tag className="w-4 h-4" />
                            </div>
                            <h3 className="text-base font-bold text-gray-900">Set Price per Specs</h3>
                          </div>
                          <button
                            type="button"
                            onClick={() => setShowSpecModal(false)}
                            className="p-1.5 bg-gray-100 rounded-full text-gray-500 hover:bg-gray-200 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="space-y-4">
                          {/* Price Input */}
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-700">
                              Price Amount ({selectedBot?.currency || 'MMK'})
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={specPriceInput}
                              onChange={(e) => {
                                const val = e.target.value.replace(/\D/g, '');
                                setSpecPriceInput(val);
                              }}
                              placeholder="e.g. 12000 (digits only)"
                              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-purple-500 outline-none"
                            />
                          </div>

                          {/* Color Selector */}
                          {colors && colors.length > 0 && (
                            <div className="space-y-2 pt-1">
                              <label className="text-xs font-bold text-gray-700 block">
                                Colors
                              </label>
                              <div className="flex flex-wrap gap-2">
                                {colors.map(c => {
                                  const cName = c.name || c.color;
                                  const isSelected = specSelectedColor === cName;
                                  const bgHex = c.hex || (c.color && c.color.startsWith('#') ? c.color : '#6B7280');
                                  return (
                                    <button
                                      key={c.id || cName}
                                      type="button"
                                      onClick={() => {
                                        const nextColor = isSelected ? null : cName;
                                        setSpecSelectedColor(nextColor);
                                        // Auto-fill price if rule exists
                                        const areOptionsEqual = (a = {}, b = {}) => {
                                          const kA = Object.keys(a || {}).filter(k => a[k]);
                                          const kB = Object.keys(b || {}).filter(k => b[k]);
                                          if (kA.length !== kB.length) return false;
                                          return kA.every(k => String(a[k]).trim().toLowerCase() === String(b[k] || '').trim().toLowerCase());
                                        };
                                        const existing = specPrices.find(sp => (sp.color || null) === (nextColor || null) && areOptionsEqual(sp.options, specSelectedOptions));
                                        if (existing) setSpecPriceInput(String(existing.price));
                                      }}
                                      className={`flex items-center gap-2 px-3 py-2 rounded-2xl border text-xs font-bold transition-all ${
                                        isSelected
                                          ? 'bg-purple-600 text-white border-purple-600 shadow-sm scale-105'
                                          : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                                      }`}
                                    >
                                      <span
                                        className="w-3.5 h-3.5 rounded-full border border-black/10 inline-block shadow-inner"
                                        style={{ backgroundColor: bgHex }}
                                      />
                                      <span>{cName}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Options Selector(s) */}
                          {options && options.length > 0 && options.map(optGroup => {
                            if (!optGroup.name || !optGroup.values || optGroup.values.length === 0) return null;
                            return (
                              <div key={optGroup.id} className="space-y-2 pt-1">
                                <label className="text-xs font-bold text-gray-700 block">
                                  {optGroup.name}
                                </label>
                                <div className="flex flex-wrap gap-2">
                                  {optGroup.values.map(v => {
                                    if (!v.label) return null;
                                    const isSelected = specSelectedOptions[optGroup.id] === v.label;
                                    return (
                                      <button
                                        key={v.id || v.label}
                                        type="button"
                                        onClick={() => {
                                          const nextOpts = { ...specSelectedOptions };
                                          if (isSelected) {
                                            delete nextOpts[optGroup.id];
                                          } else {
                                            nextOpts[optGroup.id] = v.label;
                                          }
                                          setSpecSelectedOptions(nextOpts);
                                          // Auto-fill price if rule exists
                                          const areOptionsEqual = (a = {}, b = {}) => {
                                            const kA = Object.keys(a || {}).filter(k => a[k]);
                                            const kB = Object.keys(b || {}).filter(k => b[k]);
                                            if (kA.length !== kB.length) return false;
                                            return kA.every(k => String(a[k]).trim().toLowerCase() === String(b[k] || '').trim().toLowerCase());
                                          };
                                          const existing = specPrices.find(sp => (sp.color || null) === (specSelectedColor || null) && areOptionsEqual(sp.options, nextOpts));
                                          if (existing) setSpecPriceInput(String(existing.price));
                                        }}
                                        className={`px-3 py-2 rounded-2xl border text-xs font-bold transition-all ${
                                          isSelected
                                            ? 'bg-purple-600 text-white border-purple-600 shadow-sm scale-105'
                                            : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                                        }`}
                                      >
                                        {v.label}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}

                          {/* Save & Cancel */}
                          {(() => {
                            const isSelectedAny = specSelectedColor || Object.values(specSelectedOptions).filter(Boolean).length > 0;
                            const isSaveDisabled = !specPriceInput || Number(specPriceInput) <= 0 || !isSelectedAny;
                            return (
                              <div className="flex gap-2 pt-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSpecPriceInput('');
                                    setSpecSelectedColor(null);
                                    setSpecSelectedOptions({});
                                    setShowSpecModal(false);
                                  }}
                                  className="flex-1 py-3 bg-gray-100 text-gray-600 font-bold rounded-2xl hover:bg-gray-200 transition-colors text-sm"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  disabled={isSaveDisabled}
                                  onClick={() => {
                                    if (isSaveDisabled) return;
                                    const newPrice = Number(specPriceInput);
                                    const newRule = {
                                      id: Date.now().toString(),
                                      price: newPrice,
                                      color: specSelectedColor || null,
                                      options: specSelectedOptions,
                                    };
                                    // Remove existing rule if matching color & options
                                    setSpecPrices(prev => {
                                      const areOptionsEqual = (a = {}, b = {}) => {
                                        const kA = Object.keys(a || {}).filter(k => a[k]);
                                        const kB = Object.keys(b || {}).filter(k => b[k]);
                                        if (kA.length !== kB.length) return false;
                                        return kA.every(k => String(a[k]).trim().toLowerCase() === String(b[k] || '').trim().toLowerCase());
                                      };
                                      const filtered = prev.filter(sp => !((sp.color || null) === (newRule.color || null) && areOptionsEqual(sp.options, newRule.options)));
                                      return [...filtered, newRule];
                                    });
                                    addToast('Spec price rule added', 'success');
                                    setSpecPriceInput('');
                                    setSpecSelectedColor(null);
                                    setSpecSelectedOptions({});
                                  }}
                                  className={`flex-1 py-3 text-white font-bold rounded-2xl transition-all text-sm ${
                                    isSaveDisabled
                                      ? 'bg-purple-300 cursor-not-allowed opacity-50'
                                      : 'bg-purple-600 hover:bg-purple-700 shadow-md active:scale-98'
                                  }`}
                                >
                                  Add Rule
                                </button>
                              </div>
                            );
                          })()}

                          {/* Existing Saved Rules List */}
                          {specPrices.length > 0 && (
                            <div className="mt-4 pt-3 border-t border-gray-100 space-y-2">
                              <p className="text-xs font-bold text-gray-500">Saved Spec Prices ({specPrices.length}):</p>
                              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                                {specPrices.map((sp, idx) => {
                                  const optVals = Object.values(sp.options || {}).filter(Boolean);
                                  return (
                                    <div key={sp.id || idx} className="flex items-center justify-between p-2.5 bg-purple-50/60 border border-purple-100 rounded-2xl text-xs">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="font-extrabold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-lg">
                                          {formatPrice(sp.price, selectedBot?.currency || 'MMK')}
                                        </span>
                                        {sp.color && (
                                          <span className="px-2 py-0.5 bg-white border border-gray-200 rounded-lg text-gray-700 font-semibold">
                                            🎨 {sp.color}
                                          </span>
                                        )}
                                        {optVals.map((ov, oidx) => (
                                          <span key={oidx} className="px-2 py-0.5 bg-white border border-gray-200 rounded-lg text-gray-700 font-semibold">
                                            ⚙️ {ov}
                                          </span>
                                        ))}
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setSpecPrices(prev => prev.filter(item => item.id !== sp.id));
                                          addToast('Rule deleted');
                                        }}
                                        className="p-1 text-gray-400 hover:text-rose-500 transition-colors ml-2 flex-shrink-0"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    </div>
                  </>
                )}
              </AnimatePresence>
            </div>
          );
        })()}

        {/* Colors Section */}
        <div className="space-y-3">
          <label className="text-sm font-bold text-gray-700 ml-1 flex items-center gap-1.5">
            <Palette className="w-4 h-4" /> Colors
            {colors.length > 0 && <span className="text-gray-400 font-normal">({colors.length})</span>}
          </label>

          <input ref={colorFileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleColorImageUpload} className="hidden" />

          {colors.length > 0 && (
            <div className="flex flex-wrap gap-3">
              {colors.map(c => (
                <div key={c.color} className="flex flex-col items-center gap-1.5">
                  <div className="relative group">
                    <div
                      className="w-14 h-14 rounded-xl border-2 border-gray-200 shadow-sm overflow-hidden cursor-default"
                      style={{ backgroundColor: c.color }}
                    >
                      {c.file_id && (
                        <CachedImage
                          src={getImageUrl(c.file_id, selectedBotId)}
                          alt={c.color}
                          className="w-full h-full object-cover"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeColor(c.color)}
                      className="absolute -top-2 -right-2 w-5 h-5 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-md hover:bg-rose-600 transition-all active:scale-90 text-[10px] font-bold"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  <span className="text-[9px] text-gray-400 font-medium uppercase">{c.name || getColorName(c.color)}</span>
                </div>
              ))}
            </div>
          )}

          {showColorPickerModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
              <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 overflow-hidden relative">
                
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                      <Palette className="w-4 h-4" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-800">Select Color</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowColorPickerModal(false)}
                    className="text-gray-400 hover:text-gray-600 p-1.5 rounded-xl hover:bg-gray-100 transition-all"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Live Color Preview Card */}
                <div className="bg-gray-50 border border-gray-200/80 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center gap-4">
                    {/* Color Swatch */}
                    <div
                      className="w-16 h-16 rounded-2xl border-4 border-white shadow-md flex-shrink-0 transition-all duration-300 transform hover:scale-105"
                      style={{ backgroundColor: previewColorHex }}
                    />
                    
                    {/* Color Name & Hex Input */}
                    <div className="flex-1 space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Color Name</label>
                      <input
                        type="text"
                        value={previewColorName}
                        onChange={(e) => {
                          setPreviewColorName(e.target.value);
                          if (previewColorError) setPreviewColorError('');
                        }}
                        placeholder="Color Name (e.g. Red, Rose Gold)"
                        className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none transition-all"
                      />
                      <div className="flex items-center justify-between text-xs font-mono text-gray-400 font-semibold px-1">
                        <span>HEX: {previewColorHex.toUpperCase()}</span>
                        {isCustomPicker && <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-sans font-bold">Custom</span>}
                      </div>
                    </div>
                  </div>

                  {previewColorError && (
                    <div className="bg-rose-50 border border-rose-200 rounded-xl p-2.5 text-xs text-rose-600 font-medium flex items-center gap-2">
                      <span>⚠️</span>
                      <span>{previewColorError}</span>
                    </div>
                  )}
                </div>

                {/* Preset Color Swatches */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">Preset Colors</span>
                    <span className="text-[11px] text-gray-400 font-medium">{PREDEFINED_COLORS.length} colors available</span>
                  </div>
                  <div className="max-h-48 overflow-y-auto pr-1 flex flex-wrap gap-2.5 custom-scrollbar">
                    {PREDEFINED_COLORS.map((p) => {
                      const isSelected = previewColorHex.toLowerCase() === p.hex.toLowerCase() && !isCustomPicker;
                      const isAdded = colors.some(c => c.color.toLowerCase() === p.hex.toLowerCase());
                      return (
                        <button
                          key={p.hex}
                          type="button"
                          disabled={isAdded}
                          onClick={() => handleSelectPresetSwatch(p)}
                          title={`${p.name} (${p.hex})`}
                          className={`w-9 h-9 rounded-xl border-2 transition-all relative flex items-center justify-center ${
                            isSelected
                              ? 'border-indigo-600 shadow-lg scale-110 ring-2 ring-indigo-500/30'
                              : isAdded
                              ? 'opacity-30 cursor-not-allowed border-gray-200'
                              : 'border-gray-200 hover:scale-105 hover:border-gray-400'
                          }`}
                          style={{ backgroundColor: p.hex }}
                        >
                          {isSelected && (
                            <span className={`w-2.5 h-2.5 rounded-full ${p.hex === '#FFFFFF' || p.hex === '#FFF44F' || p.hex === '#E6E6FA' ? 'bg-black' : 'bg-white'}`} />
                          )}
                        </button>
                      );
                    })}

                    {/* Custom Color Wheel Button */}
                    <label
                      title="Pick Custom Color"
                      className={`w-9 h-9 rounded-xl border-2 border-dashed border-gray-300 bg-gradient-to-br from-red-400 via-green-400 to-blue-500 transition-all hover:scale-105 cursor-pointer flex items-center justify-center ${
                        isCustomPicker ? 'ring-2 ring-indigo-500 ring-offset-2 scale-110 border-indigo-600' : ''
                      }`}
                    >
                      <span className="w-5 h-5 rounded-full bg-white/90 text-indigo-700 font-bold text-xs flex items-center justify-center shadow-sm">+</span>
                      <input
                        type="color"
                        value={previewColorHex}
                        onChange={handleCustomColorInput}
                        className="opacity-0 w-0 h-0 absolute pointer-events-none"
                      />
                    </label>
                  </div>
                </div>

                {/* Modal Actions */}
                <div className="flex items-center gap-3 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setShowColorPickerModal(false)}
                    className="flex-1 py-3 px-4 bg-gray-100 hover:bg-gray-200 rounded-2xl text-xs font-bold text-gray-600 transition-all active:scale-95"
                  >
                    ← Back
                  </button>
                  <button
                    type="button"
                    onClick={saveSelectedColor}
                    className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold shadow-md shadow-indigo-200 transition-all active:scale-95 flex items-center justify-center gap-1.5"
                  >
                    Save Color ✨
                  </button>
                </div>
              </div>
            </div>
          )}

          {showPhotoConfirm && (
            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200 text-center">
              <p className="text-sm font-bold text-gray-700 mb-3">Do you want add the photo of this color?</p>
              <div className="flex gap-3 justify-center">
                <button type="button" onClick={handleColorNoPhoto}
                  className="px-6 py-2.5 bg-white border-2 border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-100 transition-all active:scale-95">
                  No
                </button>
                <button type="button" onClick={() => { setShowPhotoConfirm(false); setTimeout(() => colorFileInputRef.current?.click(), 100); }}
                  className="px-6 py-2.5 bg-indigo-600 border-2 border-indigo-600 rounded-xl text-sm font-bold text-white hover:bg-indigo-700 transition-all active:scale-95">
                  Yes
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            {!showColorPickerModal && !showPhotoConfirm && (
              <button
                type="button"
                onClick={openColorPickerModal}
                className="px-4 py-2.5 bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl text-sm font-bold text-gray-500 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all active:scale-[0.98] flex items-center gap-1.5"
              >
                <Palette className="w-4 h-4" />
                Add Color
              </button>
            )}
            {uploadingColor && (
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" /> Uploading color image...
              </span>
            )}
          </div>
        </div>

        {/* Options Section */}
        <div className="space-y-3">
          <label className="text-sm font-bold text-gray-700 ml-1 flex items-center gap-1.5">
            <Package className="w-4 h-4" /> Options
            {options.length > 0 && <span className="text-gray-400 font-normal">({options.length})</span>}
          </label>

          <div className="space-y-3">
            {options.map(opt => {
              const hasErr = !!optionErrors[opt.id];
              return (
                <div
                  key={opt.id}
                  id={`option-box-${opt.id}`}
                  className={`rounded-2xl p-4 transition-all relative ${
                    hasErr
                      ? 'bg-red-50/50 border-2 border-red-500 shadow-sm'
                      : 'bg-gray-50 border border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <input
                        type="text"
                        value={opt.name}
                        onChange={(e) => updateOptionName(opt.id, e.target.value)}
                        placeholder="e.g. Size"
                        className={`flex-1 min-w-0 px-3 py-1.5 bg-white border rounded-lg text-sm font-bold outline-none ${
                          hasErr
                            ? 'border-red-300 text-red-900 focus:border-red-500 focus:ring-1 focus:ring-red-200'
                            : 'border-gray-200 text-gray-800 focus:border-indigo-300 focus:ring-1 focus:ring-indigo-200'
                        }`}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeOption(opt.id)}
                      className="p-1.5 bg-white rounded-lg text-gray-400 hover:text-rose-500 hover:bg-rose-50 transition-all active:scale-90 flex-shrink-0 ml-2"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {opt.values.map(v => (
                      <div key={v.id} className="flex items-center gap-1 bg-white rounded-lg border border-gray-200 px-2 py-1">
                        <input
                          type="text"
                          value={v.label}
                          onChange={(e) => updateOptionValue(opt.id, v.id, e.target.value)}
                          className="w-20 sm:w-28 text-xs font-bold text-gray-700 bg-transparent outline-none"
                          placeholder="Option"
                        />
                        <button
                          type="button"
                          onClick={() => removeOptionValue(opt.id, v.id)}
                          className="p-0.5 rounded text-gray-300 hover:text-rose-500 transition-all"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => addOptionValue(opt.id)}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-white border-2 border-dashed border-gray-200 rounded-lg text-xs font-bold text-gray-500 hover:border-indigo-300 hover:text-indigo-600 transition-all active:scale-95"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {hasErr && (
                    <p className="text-xs font-bold text-red-500 mt-2.5 flex items-center gap-1 animate-pulse">
                      <span>⚠️</span>
                      <span>Add at least one option. Title only not allowed</span>
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={addOption}
            disabled={options.length >= 10}
            className="px-4 py-2.5 bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl text-sm font-bold text-gray-500 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all active:scale-[0.98] flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            {options.length >= 10 ? 'Max 10 options' : 'Add Option'}
          </button>
        </div>

        {/* Channel Visibility */}
        <div className="space-y-2">
          <label className="text-sm font-bold text-gray-700 ml-1">This product will be shown on</label>
          <div className="flex gap-2">
            {[
              { key: 'show_on_telegram', label: 'Telegram' },
              { key: 'show_on_website', label: 'Website' },
              { key: 'show_on_guest', label: 'Guest' },
            ].map(({ key, label }) => (
              <label
                key={key}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 cursor-pointer transition-all select-none ${
                  formData[key] ? 'border-indigo-300 bg-indigo-50/50' : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <input
                  type="checkbox"
                  checked={formData[key]}
                  onChange={(e) => {
                    setFormData({ ...formData, [key]: e.target.checked });
                  }}
                  className="w-3.5 h-3.5 text-indigo-600 rounded accent-indigo-600"
                />
                <span className={`text-xs font-bold ${formData[key] ? 'text-indigo-700' : 'text-gray-600'}`}>{label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="pt-4 flex gap-3">
          <button
            type="button"
            onClick={handleRequestClose}
            className="flex-1 px-3 py-2.5 sm:px-6 sm:py-3 bg-gray-100 text-gray-700 font-bold rounded-xl sm:rounded-2xl hover:bg-gray-200 transition-all text-sm sm:text-base"
          >
            Cancel
          </button>
          <button
            disabled={isLoading}
            type="submit"
            className="flex-[2] px-3 py-2.5 sm:px-6 sm:py-3 bg-indigo-600 text-white font-bold rounded-xl sm:rounded-2xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2 text-sm sm:text-base"
          >
            {isLoading && <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />}
            {product ? 'Update Product' : 'Create Product'}
          </button>
        </div>
      </form>

      {showUnsavedConfirmModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-500 mx-auto flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 mb-1">Unsaved Changes</h3>
              <p className="text-sm font-medium text-gray-600">You have made some changes. Do you want to save?</p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowUnsavedConfirmModal(false);
                  onClose();
                }}
                className="flex-1 py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-2xl transition-all text-sm active:scale-95"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={(e) => {
                  setShowUnsavedConfirmModal(false);
                  handleSubmit(e);
                }}
                className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-md shadow-indigo-200 transition-all text-sm active:scale-95"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
