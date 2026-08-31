import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAllBots, getAdminMmpayMerchants, saveAdminMmpayMerchant, deleteAdminMmpayMerchant } from '../api/superadmin';
import { useToastStore } from '../store/toastStore';
import LoadingSkeleton from '../components/shared/LoadingSkeleton';
import {
  CreditCard,
  Plus,
  ArrowLeft,
  Save,
  Trash2,
  Edit2,
  CheckCircle2,
  XCircle,
  Search,
  Bot,
  Key,
  ShieldCheck,
  Building2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function MyanMyanPayAdmin() {
  const queryClient = useQueryClient();
  const { addToast } = useToastStore();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingMerchant, setEditingMerchant] = useState(null);
  const [search, setSearch] = useState('');
  const [showSecret, setShowSecret] = useState(false);

  // Form State
  const [selectedBotId, setSelectedBotId] = useState('');
  const [appId, setAppId] = useState('');
  const [publicKey, setPublicKey] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [isEnabled, setIsEnabled] = useState(true);

  // Queries
  const { data: merchants, isLoading: loadingMerchants } = useQuery({
    queryKey: ['admin-mmpay-merchants'],
    queryFn: getAdminMmpayMerchants,
  });

  const { data: bots } = useQuery({
    queryKey: ['all-bots'],
    queryFn: getAllBots,
  });

  // Mutations
  const saveMutation = useMutation({
    mutationFn: saveAdminMmpayMerchant,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-mmpay-merchants'] });
      addToast('MyanMyanPay merchant saved successfully!');
      handleCloseForm();
    },
    onError: (err) => {
      addToast(err?.response?.data?.detail || err?.response?.data?.error || 'Failed to save merchant keys', 'error');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAdminMmpayMerchant,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-mmpay-merchants'] });
      addToast('Merchant keys deleted successfully');
    },
    onError: () => {
      addToast('Failed to delete merchant', 'error');
    },
  });

  const handleOpenForm = (merchant = null) => {
    if (merchant) {
      setEditingMerchant(merchant);
      setSelectedBotId(String(merchant.bot_id));
      setAppId(merchant.app_id_decrypted || '');
      setPublicKey(merchant.publishable_key_masked || '••••••••••••••••••••••••••••••••');
      setSecretKey(merchant.secret_key_masked || '••••••••••••••••••••••••••••••••');
      setIsEnabled(Boolean(merchant.enabled));
    } else {
      setEditingMerchant(null);
      setSelectedBotId('');
      setAppId('');
      setPublicKey('');
      setSecretKey('');
      setIsEnabled(true);
    }
    setShowSecret(false);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingMerchant(null);
    setSelectedBotId('');
    setAppId('');
    setPublicKey('');
    setSecretKey('');
    setIsEnabled(true);
    setShowSecret(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedBotId) {
      addToast('Please select a shop', 'error');
      return;
    }
    if (!appId.trim()) {
      addToast('App ID is required', 'error');
      return;
    }
    if (!editingMerchant && (!publicKey.trim() || !secretKey.trim())) {
      addToast('App ID, Public Key, and Private Key are all required for new merchants', 'error');
      return;
    }

    saveMutation.mutate({
      bot_id: Number(selectedBotId),
      app_id: appId.trim(),
      publishable_key: publicKey.trim(),
      secret_key: secretKey.trim(),
      enabled: isEnabled,
    });
  };

  const filteredMerchants = merchants?.filter(m => {
    const term = search.toLowerCase();
    return (
      (m.bot_full_name && m.bot_full_name.toLowerCase().includes(term)) ||
      (m.bot_username && m.bot_username.toLowerCase().includes(term)) ||
      (m.app_id_decrypted && m.app_id_decrypted.toLowerCase().includes(term)) ||
      String(m.bot_id).includes(term)
    );
  }) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-900 flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-indigo-600" />
            MyanMyanPay Merchant Management
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Configure instant payment keys for shop owners (Superadmin Only)
          </p>
        </div>

        {!isFormOpen && (
          <button
            onClick={() => handleOpenForm()}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-2xl shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            Add Merchant Keys
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {isFormOpen ? (
          /* Form View */
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm space-y-6 max-w-3xl"
          >
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-600" />
                {editingMerchant ? 'Edit Merchant Keys' : 'Configure New MMPay Merchant'}
              </h2>
              <button
                onClick={handleCloseForm}
                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-xs rounded-xl flex items-center gap-1.5 transition-all"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Shop Dropdown */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  Select Shop / Bot *
                </label>
                <div className="relative">
                  <select
                    value={selectedBotId}
                    onChange={(e) => setSelectedBotId(e.target.value)}
                    disabled={!!editingMerchant}
                    className="w-full pl-4 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-semibold text-gray-900 transition-all disabled:opacity-60"
                  >
                    <option value="">-- Choose a Shop --</option>
                    {bots?.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.bot_full_name || b.bot_username || `Bot #${b.id}`} (@{b.bot_username || 'no_username'}) [ID: {b.id}]
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* App ID */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  MMPay App ID *
                </label>
                <input
                  type="text"
                  placeholder="e.g. MM62541801"
                  value={appId}
                  onChange={(e) => setAppId(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-mono text-gray-900 transition-all"
                />
              </div>

              {/* Public Key */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  Public Key (Publishable Key) *
                </label>
                <input
                  type="text"
                  placeholder="pk_live_... or pk_test_..."
                  value={publicKey}
                  onChange={(e) => setPublicKey(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-mono text-gray-900 transition-all"
                />
              </div>

              {/* Private Key / Secret Key */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  Private Key (Secret Key) *
                </label>
                <input
                  type="text"
                  placeholder="sk_live_... or sk_test_..."
                  value={secretKey}
                  onChange={(e) => setSecretKey(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-mono text-gray-900 transition-all"
                />
              </div>

              {/* Enabled Toggle */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-200">
                <div>
                  <p className="text-sm font-bold text-gray-900">Enable Instant Checkout</p>
                  <p className="text-xs text-gray-500">Allow buyers to make automated MMPay payments for this shop</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEnabled(!isEnabled)}
                  className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${isEnabled ? 'bg-indigo-600' : 'bg-gray-300'}`}
                >
                  <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${isEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={handleCloseForm}
                  className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-sm rounded-2xl transition-all"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={saveMutation.isPending}
                  className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-2xl shadow-sm transition-all disabled:opacity-60"
                >
                  <Save className="w-4 h-4" />
                  {saveMutation.isPending ? 'Saving...' : 'Save Merchant Keys'}
                </button>
              </div>
            </form>
          </motion.div>
        ) : (
          /* Table / List View */
          <motion.div
            key="table"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            {/* Search Bar */}
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search merchant or bot ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm transition-all shadow-xs"
              />
            </div>

            {loadingMerchants ? (
              <LoadingSkeleton type="list" count={4} />
            ) : filteredMerchants.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-gray-200 space-y-3">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto text-gray-400">
                  <CreditCard className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-gray-900">No MMPay Merchants Configured</h3>
                <p className="text-xs text-gray-500 max-w-sm mx-auto">
                  {search ? 'No matching merchants found.' : 'Click "Add Merchant Keys" above to activate MMPay for a shop.'}
                </p>
              </div>
            ) : (
              <div className="grid gap-3">
                {filteredMerchants.map((m) => (
                  <div
                    key={m.id}
                    className="bg-white p-5 rounded-2xl shadow-xs border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-base flex-shrink-0 shadow-xs">
                        <Building2 className="w-6 h-6" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-bold text-gray-900 truncate">
                            {m.bot_full_name || `Bot #${m.bot_id}`}
                          </h3>
                          <span className="text-xs font-semibold text-gray-400">@{m.bot_username || 'no_username'}</span>
                          <span
                            className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-md flex items-center gap-1 border ${
                              m.enabled
                                ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                                : 'bg-gray-100 text-gray-500 border-gray-200'
                            }`}
                          >
                            {m.enabled ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                            {m.enabled ? 'Enabled' : 'Disabled'}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap mt-1">
                          <span className="font-mono bg-gray-50 px-2 py-0.5 rounded-md border border-gray-200/80">
                            App ID: {m.app_id_decrypted}
                          </span>
                          <span className="font-mono text-gray-400">
                            Public Key: {m.publishable_key_masked}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <button
                        onClick={() => handleOpenForm(m)}
                        className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                        title="Edit Keys"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Are you sure you want to remove MMPay keys for ${m.bot_full_name || m.bot_id}?`)) {
                            deleteMutation.mutate(m.bot_id);
                          }
                        }}
                        className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                        title="Delete Merchant"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
