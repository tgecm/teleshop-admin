import React, { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getUsers, updateUser } from '../api/customers';
import { getOrders } from '../api/orders';
import { useBotStore } from '../store/botStore';
import { useToastStore } from '../store/toastStore';
import LoadingSkeleton from '../components/shared/LoadingSkeleton';
import ConfirmDialog from '../components/shared/ConfirmDialog';
import PullToRefresh from '../components/shared/PullToRefresh';
import {
  Search,
  User,
  ShoppingBag,
  Ban,
  MessageSquare,
  Calendar,
  Clock,
  ShieldAlert,
  ShieldCheck,
  Loader2,
  Phone,
  Mail,
  MapPin,
  X,
  Package,
  Hash,
  DollarSign,
  ChevronDown
} from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';

export default function Customers() {
  const { selectedBotId } = useBotStore();
  const { addToast } = useToastStore();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterTab, setFilterTab] = useState('all');
  const [confirmCustomer, setConfirmCustomer] = useState(null);
  const [detailCustomer, setDetailCustomer] = useState(null);

  const { data: customers, isLoading: customersLoading, refetch: refetchCustomers } = useQuery({
    queryKey: ['users', 'customers', selectedBotId],
    queryFn: () => getUsers({ bot_id: Number(selectedBotId) }),
    enabled: !!selectedBotId,
  });

  const handleRefresh = useCallback(async () => {
    await refetchCustomers();
    queryClient.invalidateQueries({ queryKey: ['orders', selectedBotId] });
  }, [refetchCustomers, queryClient, selectedBotId]);

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

  const getCustomerOrderCount = (customerId) => {
    return orders?.filter(o => o.customer_id === customerId).length || 0;
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

  if (customersLoading) return <LoadingSkeleton type="list" count={6} />;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-lg sm:text-2xl font-bold text-gray-900">Customers</h1>
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

      <div className="flex gap-2 sticky top-0 z-10 bg-gray-50 pb-2">
        <button
          onClick={() => setFilterTab('all')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
            filterTab === 'all'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100'
              : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          All ({customers?.length || 0})
        </button>
        <button
          onClick={() => setFilterTab('blocked')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
            filterTab === 'blocked'
              ? 'bg-rose-600 text-white shadow-md shadow-rose-100'
              : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          <span className="flex items-center gap-1.5">
            <Ban className="w-3 h-3" />
            Blocked ({customers?.filter(c => c.is_blocked)?.length || 0})
          </span>
        </button>
      </div>

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
                        {getCustomerOrderCount(customer.id)} orders
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
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300, mass: 1 }}
              className="fixed bottom-0 left-0 right-0 z-[80] bg-white rounded-t-[28px] shadow-2xl max-h-[85vh] flex flex-col"
            >
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-9 h-1 bg-gray-200 rounded-full" />
              </div>

              <div className="flex items-center justify-between px-6 pb-3 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg shadow-sm ${detailCustomer.is_blocked ? 'bg-rose-100 text-rose-600' : 'bg-indigo-100 text-indigo-600'}`}>
                    {detailCustomer.first_name?.[0] || '?'}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{detailCustomer.first_name}</h3>
                    <p className="text-xs text-gray-500">@{detailCustomer.username || 'no_username'}</p>
                  </div>
                </div>
                <button
                  onClick={() => setDetailCustomer(null)}
                  className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center active:scale-90 transition-transform"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
                <div className="bg-gray-50 rounded-2xl p-4 space-y-4">
                  {detailCustomer.created_at && (
                    <DetailRow icon={Calendar} label="Joined" value={format(new Date(detailCustomer.created_at), 'MMM d, yyyy')} />
                  )}
                  {detailCustomer.phone_number && (
                    <DetailRow icon={Phone} label="Phone" value={detailCustomer.phone_number} />
                  )}
                  {detailCustomer.email && (
                    <DetailRow icon={Mail} label="Email" value={detailCustomer.email} />
                  )}
                  {detailCustomer.address && (
                    <DetailRow icon={MapPin} label="Address" value={detailCustomer.address} />
                  )}
                  {detailCustomer.telegram_id && (
                    <DetailRow icon={Hash} label="Telegram ID" value={detailCustomer.telegram_id.toString()} />
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Package className="w-4 h-4 text-indigo-600" />
                    <h4 className="text-sm font-bold text-gray-900">
                      Orders ({getCustomerOrderCount(detailCustomer.id)})
                    </h4>
                  </div>
                  {orders?.filter(o => o.customer_id === detailCustomer.id).length === 0 ? (
                    <div className="bg-gray-50 rounded-2xl p-6 text-center">
                      <ShoppingBag className="w-6 h-6 text-gray-300 mx-auto mb-2" />
                      <p className="text-xs text-gray-400">No orders yet</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {orders?.filter(o => o.customer_id === detailCustomer.id).slice(0, 10).map(order => (
                        <div key={order.id} className="bg-gray-50 rounded-2xl p-3.5 flex items-center justify-between border border-gray-100">
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-gray-900 truncate">
                              #{order.id} {order.product_name && `· ${order.product_name}`}
                            </p>
                            <p className="text-[10px] text-gray-500 mt-0.5">
                              {order.created_at ? format(new Date(order.created_at), 'MMM d, HH:mm') : ''}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                            <span className="text-xs font-bold text-gray-900">
                              {order.currency || ''} {order.total || order.amount || ''}
                            </span>
                            <span className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded-lg ${
                              order.status === 'completed' || order.status === 'paid'
                                ? 'bg-emerald-100 text-emerald-700'
                                : order.status === 'cancelled'
                                ? 'bg-rose-100 text-rose-700'
                                : 'bg-amber-100 text-amber-700'
                            }`}>
                              {order.status || 'pending'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

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
        <p className="text-sm font-bold text-gray-900 truncate">{value}</p>
      </div>
    </div>
  );
}
