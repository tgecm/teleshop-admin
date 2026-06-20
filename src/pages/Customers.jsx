import React, { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getUsers, updateUser, getWebCustomers } from '../api/customers';
import { getOrders } from '../api/orders';
import { useBotStore } from '../store/botStore';
import { useToastStore } from '../store/toastStore';
import LoadingSkeleton from '../components/shared/LoadingSkeleton';
import ConfirmDialog from '../components/shared/ConfirmDialog';
import PullToRefresh from '../components/shared/PullToRefresh';
import {
  Search, User, ShoppingBag, Ban, MessageSquare, Clock,
  ShieldAlert, ShieldCheck, Loader2, Phone, Mail, MapPin, X,
  Package, Hash, DollarSign, ChevronDown, Globe, Smartphone,
  AtSign, MessageCircle, FileText, Copy
} from 'lucide-react';
import { myanmarFormat } from '../utils/date';
import { motion, AnimatePresence } from 'motion/react';

import { API_BASE } from '../api/config';

export default function Customers() {
  const { selectedBotId } = useBotStore();
  const { addToast } = useToastStore();
  const queryClient = useQueryClient();
  const [section, setSection] = useState('telegram');
  const [search, setSearch] = useState('');
  const [filterTab, setFilterTab] = useState('all');
  const [confirmCustomer, setConfirmCustomer] = useState(null);
  const [detailCustomer, setDetailCustomer] = useState(null);

  const { data: customers, isLoading: customersLoading, refetch: refetchCustomers } = useQuery({
    queryKey: ['users', 'customers', selectedBotId],
    queryFn: () => getUsers({ bot_id: Number(selectedBotId) }),
    enabled: !!selectedBotId && section === 'telegram',
  });

  const { data: webCustomers, isLoading: webLoading, refetch: refetchWeb } = useQuery({
    queryKey: ['web-customers', selectedBotId],
    queryFn: () => getWebCustomers(Number(selectedBotId)),
    enabled: !!selectedBotId && section === 'website',
  });

  const handleRefresh = useCallback(async () => {
    if (section === 'telegram') {
      await refetchCustomers();
      queryClient.invalidateQueries({ queryKey: ['orders', selectedBotId] });
    } else {
      await refetchWeb();
    }
  }, [section, refetchCustomers, refetchWeb, queryClient, selectedBotId]);

  const { data: orders } = useQuery({
    queryKey: ['orders', selectedBotId],
    queryFn: () => getOrders({ bot_id: Number(selectedBotId) }),
    enabled: !!selectedBotId,
  });

  const toggleBlockMutation = useMutation({
    mutationFn: ({ id, is_blocked }) => updateUser(id, { is_blocked }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries(['users', 'customers', selectedBotId]);
      addToast(variables.is_blocked ? 'Customer blocked' : 'Customer unblocked');
    },
    onError: () => addToast('Failed to update customer status', 'error'),
  });

  const getCustomerOrders = (customer) => {
    if (!orders || !customer) return [];
    return orders.filter(o => {
      const bs = o.buyer_snapshot;
      if (!bs) return false;
      if (customer.telegram_id && String(bs.telegram_id) === String(customer.telegram_id)) return true;
      if (customer.firebase_uid && bs.firebase_uid === customer.firebase_uid) return true;
      if (customer.email && bs.email === customer.email) return true;
      return false;
    });
  };

  const getCustomerOrderCount = (customer) => getCustomerOrders(customer).length;

  const profileUid = detailCustomer?.telegram_id
    ? String(detailCustomer.telegram_id)
    : detailCustomer?.firebase_uid || detailCustomer?.uid || '';

  const { data: customerProfile } = useQuery({
    queryKey: ['customer-profile', selectedBotId, profileUid],
    queryFn: () =>
      fetch(`${API_BASE}/api/customer-profile?bot_id=${selectedBotId}&uid=${encodeURIComponent(profileUid)}`)
        .then(r => r.ok ? r.json() : null),
    enabled: !!selectedBotId && !!profileUid && !!detailCustomer,
    staleTime: 30000,
  });

  const handleCopyProfile = () => {
    if (!detailCustomer) return;
    const c = detailCustomer;
    const p = customerProfile;
    const lines = [
      `Name: ${p?.display_name || c.display_name || c.first_name || '—'}`,
      `Phone: ${p?.phone || c.phone || c.phone_number || '—'}`,
      `Email: ${p?.email || c.email || '—'}`,
      `Telegram: ${p?.telegram_username || c.telegram_username || c.username || '—'}`,
      `Viber: ${p?.viber_number || c.viber_number || '—'}`,
      `Address: ${p?.address || c.address || '—'}`,
      `Notes: ${p?.notes || c.notes || '—'}`,
    ];
    if (c.telegram_id) lines.unshift(`Telegram ID: ${c.telegram_id}`);
    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      addToast('Profile copied to clipboard');
    }).catch(() => {
      addToast('Failed to copy', 'error');
    });
  };

  const filteredCustomers = customers?.filter(c => {
    if (filterTab === 'blocked' && !c.is_blocked) return false;
    const term = search.toLowerCase();
    return (
      c.first_name?.toLowerCase().includes(term) ||
      c.username?.toLowerCase().includes(term) ||
      c.telegram_id?.toString().includes(term)
    );
  }) || [];

  const filteredWebCustomers = webCustomers?.filter(c => {
    const term = search.toLowerCase();
    return (
      c.display_name?.toLowerCase().includes(term) ||
      c.email?.toLowerCase().includes(term) ||
      c.firebase_uid?.toLowerCase().includes(term)
    );
  }) || [];

  const isLoading = section === 'telegram' ? customersLoading : webLoading;

  if (isLoading && section === 'telegram') return <LoadingSkeleton type="list" count={6} />;

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-lg sm:text-2xl lg:text-3xl font-bold text-gray-900">Customers</h1>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search customers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm transition-all text-sm"
          />
        </div>
      </div>

      {/* Section Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-2xl p-1 w-fit mb-3">
        <button
          onClick={() => setSection('telegram')}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
            section === 'telegram'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Smartphone className="w-3.5 h-3.5" />
          Telegram ({customers?.length || 0})
        </button>
        <button
          onClick={() => setSection('website')}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
            section === 'website'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
          Website ({webCustomers?.length || 0})
        </button>
      </div>

      {/* Telegram filter tabs */}
      {section === 'telegram' && (
        <div className="flex gap-1 bg-gray-100 rounded-xl p-0.5 w-fit -mt-2 mb-3">
          <button
            onClick={() => setFilterTab('all')}
            className={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all ${
              filterTab === 'all'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            All ({customers?.length || 0})
          </button>
          <button
            onClick={() => setFilterTab('blocked')}
            className={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all flex items-center gap-1 ${
              filterTab === 'blocked'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Ban className="w-3 h-3" />
            Blocked ({customers?.filter(c => c.is_blocked)?.length || 0})
          </button>
        </div>
      )}

      {/* Telegram Customers */}
      {section === 'telegram' && (
        <PullToRefresh onRefresh={handleRefresh}>
        {filteredCustomers.length === 0 ? (
          <div className="bg-white rounded-[32px] p-12 text-center border border-dashed border-gray-200">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="w-8 h-8 text-gray-300" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">No customers found</h3>
            <p className="text-sm text-gray-500 max-w-xs mx-auto mt-1">
              {search ? "Try a different search term." : "Customers will appear here once they interact with your bot."}
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {filteredCustomers.map(customer => (
              <motion.div
                layout
                key={customer.id}
                className={`contain-content bg-white p-4 rounded-2xl shadow-sm border transition-all ${customer.is_blocked ? 'border-rose-100 bg-rose-50/30' : 'border-gray-100'}`}
              >
                <button
                  onClick={() => setDetailCustomer(customer)}
                  className="w-full text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center font-bold text-base sm:text-lg flex-shrink-0 shadow-sm ${customer.is_blocked ? 'bg-rose-100 text-rose-600' : 'bg-indigo-100 text-indigo-600'}`}>
                      {customer.first_name?.[0] || '?'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-bold text-gray-900 truncate max-w-[160px] sm:max-w-none">{customer.first_name}</p>
                        {customer.is_blocked && (
                          <span className="px-1.5 py-0.5 bg-rose-100 text-rose-600 text-[8px] font-bold uppercase rounded-md flex items-center gap-1 border border-rose-200">
                            <Ban className="w-2 h-2" /> Blocked
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span className="truncate">@{customer.username || 'no_username'}</span>
                        <span className="text-gray-300">·</span>
                        <span className="flex items-center gap-1 whitespace-nowrap">
                          <ShoppingBag className="w-3 h-3 text-indigo-600" />
                          {getCustomerOrderCount(customer)} orders
                        </span>
                      </div>
                    </div>
                    <ChevronDown className="w-4 h-4 text-gray-300 flex-shrink-0" />
                  </div>
                </button>
              </motion.div>
            ))}
          </div>
        )}
        </PullToRefresh>
      )}

      {/* Website Customers */}
      {section === 'website' && (
        <PullToRefresh onRefresh={handleRefresh}>
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
          </div>
        ) : filteredWebCustomers.length === 0 ? (
          <div className="bg-white rounded-[32px] p-12 text-center border border-dashed border-gray-200">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Globe className="w-8 h-8 text-gray-300" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">No website customers yet</h3>
            <p className="text-sm text-gray-500 max-w-xs mx-auto mt-1">
              {search ? "Try a different search term." : "Customers who sign up on your website will appear here."}
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {filteredWebCustomers.map(customer => (
              <motion.div
                layout
                key={customer.id}
                className="contain-content bg-white p-4 rounded-2xl shadow-sm border border-gray-100"
              >
                <button
                  onClick={() => setDetailCustomer(customer)}
                  className="w-full text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center font-bold text-base sm:text-lg flex-shrink-0 shadow-sm bg-gradient-to-br from-emerald-100 to-teal-100 text-emerald-600 overflow-hidden">
                      {customer.photo_url ? (
                        <img src={customer.photo_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        customer.display_name?.[0]?.toUpperCase() || 'W'
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-gray-900 truncate max-w-[160px] sm:max-w-none">{customer.display_name || 'Website User'}</p>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        {customer.email && <span className="truncate">{customer.email}</span>}
                        {customer.created_at && (
                          <>
                            <span className="text-gray-300">·</span>
                            <span className="whitespace-nowrap">Joined {myanmarFormat(customer.created_at, 'MMM d')}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <ChevronDown className="w-4 h-4 text-gray-300 flex-shrink-0" />
                  </div>
                </button>
              </motion.div>
            ))}
          </div>
        )}
        </PullToRefresh>
      )}

      <ConfirmDialog
        open={!!confirmCustomer}
        onClose={() => setConfirmCustomer(null)}
        onConfirm={() => {
          if (confirmCustomer) {
            toggleBlockMutation.mutate({ id: confirmCustomer.id, is_blocked: !confirmCustomer.is_blocked });
            setConfirmCustomer(null);
          }
        }}
        title={confirmCustomer?.is_blocked ? 'Unblock Customer' : 'Block Customer'}
        message={`Are you sure you want to ${confirmCustomer?.is_blocked ? 'unblock' : 'block'} this customer?`}
        confirmText={confirmCustomer?.is_blocked ? 'Unblock' : 'Block'}
        variant={confirmCustomer?.is_blocked ? 'warning' : 'danger'}
        loading={toggleBlockMutation.isPending}
      />

      <AnimatePresence>
        {detailCustomer && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setDetailCustomer(null)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[70]"
            />
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300, mass: 1 }}
              className="fixed bottom-0 left-0 right-0 z-[80] bg-white rounded-t-[28px] shadow-2xl max-h-[85vh] flex flex-col md:max-w-xl md:mx-auto md:top-1/2 md:-translate-y-1/2 md:bottom-auto md:max-h-[90vh] md:rounded-[32px]"
            >
              <div className="flex justify-center pt-3 pb-1 md:hidden">
                <div className="w-9 h-1 bg-gray-200 rounded-full" />
              </div>

              <div className="flex items-center justify-between px-6 pb-3 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg shadow-sm overflow-hidden ${
                    detailCustomer.telegram_id
                      ? detailCustomer.is_blocked ? 'bg-rose-100 text-rose-600' : 'bg-indigo-100 text-indigo-600'
                      : 'bg-gradient-to-br from-emerald-100 to-teal-100 text-emerald-600'
                  }`}>
                    {detailCustomer.photo_url ? (
                      <img src={detailCustomer.photo_url} alt="" className="w-full h-full object-cover" />
                    ) : detailCustomer.first_name ? (
                      detailCustomer.first_name[0]
                    ) : detailCustomer.display_name ? (
                      detailCustomer.display_name[0]?.toUpperCase()
                    ) : (
                      '?'
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{detailCustomer.first_name || detailCustomer.display_name || 'User'}</h3>
                    <p className="text-xs text-gray-500">
                      {detailCustomer.telegram_id ? `@${detailCustomer.username || 'no_username'}` : detailCustomer.email || ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={handleCopyProfile}
                    className="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-xl text-[11px] font-bold flex items-center gap-1.5 hover:bg-indigo-100 transition-all active:scale-95">
                    <Copy className="w-3.5 h-3.5" />
                    Copy Info
                  </button>
                  <button onClick={() => setDetailCustomer(null)}
                    className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center active:scale-90 transition-transform"
                  >
                    <X className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
                <div className="bg-gray-50 rounded-2xl p-4 space-y-4">
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Profile Details</p>
                  {detailCustomer.telegram_id && (
                    <DetailRow icon={Hash} label="Telegram ID" value={detailCustomer.telegram_id.toString()} />
                  )}
                  <DetailRow icon={User} label="Full Name" value={
                    customerProfile?.display_name || detailCustomer.display_name || detailCustomer.first_name || null
                  } />
                  <DetailRow icon={Phone} label="Phone" value={
                    customerProfile?.phone || detailCustomer.phone || detailCustomer.phone_number || null
                  } />
                  <DetailRow icon={Mail} label="Email" value={
                    customerProfile?.email || detailCustomer.email || null
                  } />
                  <DetailRow icon={AtSign} label="Telegram Username" value={
                    customerProfile?.telegram_username || detailCustomer.telegram_username || detailCustomer.username || null
                  } />
                  <DetailRow icon={MessageCircle} label="Viber Number" value={
                    customerProfile?.viber_number || detailCustomer.viber_number || null
                  } />
                  <DetailRow icon={MapPin} label="Address" value={
                    customerProfile?.address || detailCustomer.address || null
                  } />
                  <DetailRow icon={FileText} label="Notes" value={
                    customerProfile?.notes || detailCustomer.notes || null
                  } />
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Package className="w-4 h-4 text-indigo-600" />
                    <h4 className="text-sm font-bold text-gray-900">
                      Orders ({getCustomerOrderCount(detailCustomer)})
                    </h4>
                  </div>
                  {getCustomerOrders(detailCustomer).length === 0 ? (
                    <div className="bg-gray-50 rounded-2xl p-6 text-center">
                      <ShoppingBag className="w-6 h-6 text-gray-300 mx-auto mb-2" />
                      <p className="text-xs text-gray-400">No orders yet</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {getCustomerOrders(detailCustomer).slice(0, 3).map(order => {
                        const items = Array.isArray(order.items) ? order.items : [];
                        return (
                        <div key={order.id} className="bg-gray-50 rounded-2xl p-3.5 border border-gray-100">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-bold text-gray-900">#{order.order_number || order.id}</span>
                            <span className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded-lg ${
                              order.status === 'completed' || order.status === 'paid' || order.status === 'delivered'
                                ? 'bg-emerald-100 text-emerald-700'
                                : order.status === 'cancelled' || order.status === 'rejected'
                                ? 'bg-rose-100 text-rose-700'
                                : 'bg-amber-100 text-amber-700'
                            }`}>
                              {order.status || 'pending'}
                            </span>
                          </div>
                          <div className="space-y-1">
                            {items.slice(0, 3).map((item, idx) => (
                              <div key={idx} className="flex items-center justify-between text-[11px]">
                                <span className="text-gray-700 truncate mr-2">{item.name || 'Product'}</span>
                                <span className="text-gray-900 font-bold shrink-0">
                                  {item.quantity ? `x${item.quantity}` : ''} {item.price ? `${Number(item.price).toLocaleString()} MMK` : ''}
                                </span>
                              </div>
                            ))}
                          </div>
                          <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-gray-200/50">
                            <span className="text-[10px] text-gray-400">
                              {order.created_at ? myanmarFormat(order.created_at, 'MMM d, HH:mm') : ''}
                            </span>
                            <span className="text-xs font-black text-gray-900">
                              {order.final_amount || order.total || order.amount ? `${Number(order.final_amount || order.total || order.amount).toLocaleString()} MMK` : ''}
                            </span>
                          </div>
                        </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {detailCustomer.telegram_id && (
                <div className="px-6 py-4 border-t border-gray-100 pb-sheet">
                  <button
                    onClick={() => {
                      setConfirmCustomer(detailCustomer);
                      setDetailCustomer(null);
                    }}
                    className={`w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
                      detailCustomer.is_blocked
                        ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                        : 'bg-rose-600 text-white hover:bg-rose-700'
                    }`}
                  >
                    {detailCustomer.is_blocked ? (
                      <><ShieldCheck className="w-4 h-4" /> Unblock Customer</>
                    ) : (
                      <><Ban className="w-4 h-4" /> Block Customer</>
                    )}
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function DetailRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center flex-shrink-0 shadow-sm">
        <Icon className="w-4 h-4 text-indigo-600" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">{label}</p>
        {value ? (
          <p className="text-sm font-bold text-gray-900 truncate">{value}</p>
        ) : (
          <p className="text-sm text-gray-300 italic">Not Added Yet</p>
        )}
      </div>
    </div>
  );
}
