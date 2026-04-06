import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getOrders, updateOrder } from '../api/orders';
import { useBotStore } from '../store/botStore';
import { useToastStore } from '../store/toastStore';
import LoadingSkeleton from '../components/shared/LoadingSkeleton';
import StatusBadge from '../components/shared/StatusBadge';
import { 
  Search, 
  ChevronRight, 
  ShoppingBag, 
  User, 
  Calendar, 
  CreditCard, 
  Package, 
  X, 
  RefreshCcw,
  ArrowRight,
  MapPin,
  Phone,
  Clock,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';

export default function Orders() {
  const { selectedBotId } = useBotStore();
  const { addToast } = useToastStore();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);

  const { data: orders, isLoading } = useQuery({
    queryKey: ['orders', selectedBotId],
    queryFn: () => getOrders({ bot_id: selectedBotId }),
    enabled: !!selectedBotId,
  });

  const updateOrderMutation = useMutation({
    mutationFn: ({ id, status }) => updateOrder(id, { status }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries(['orders', selectedBotId]);
      addToast(`Order status updated to ${variables.status}`);
      setSelectedOrder(prev => prev ? { ...prev, status: variables.status } : null);
    },
    onError: () => addToast('Failed to update status', 'error'),
  });

  const filteredOrders = orders?.filter(o => {
    const term = search.toLowerCase();
    return (
      o.customer?.first_name?.toLowerCase().includes(term) ||
      o.customer?.username?.toLowerCase().includes(term) ||
      o.id.toString().includes(term)
    );
  }) || [];

  if (isLoading) return <LoadingSkeleton type="list" count={5} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text"
            placeholder="Search customer or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm transition-all"
          />
        </div>
      </div>

      <div className="text-center md:hidden">
        <p className="text-[10px] text-gray-400 italic">Pull down to refresh</p>
      </div>

      {filteredOrders.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-gray-200">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShoppingBag className="w-8 h-8 text-gray-300" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">No orders found</h3>
          <p className="text-sm text-gray-500 max-w-xs mx-auto mt-1">
            {search ? "Try a different search term." : "When customers place orders, they will appear here."}
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filteredOrders.map(order => (
            <motion.div 
              layout
              key={order.id}
              onClick={() => setSelectedOrder(order)}
              className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 hover:border-indigo-200 transition-all cursor-pointer active:scale-[0.98]"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold">
                    #{order.id.toString().slice(-4)}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900 truncate max-w-[120px] sm:max-w-none">{order.customer?.first_name || 'Customer'}</p>
                    <p className="text-[10px] text-gray-500">{format(new Date(order.created_at), 'MMM d, h:mm a')}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <p className="text-sm font-bold text-gray-900">{order.total_amount?.toLocaleString()} MMK</p>
                  <StatusBadge status={order.status} />
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 hidden sm:block" />
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Order Detail Modal/Drawer */}
      <AnimatePresence>
        {selectedOrder && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedOrder(null)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
            />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[32px] z-50 max-h-[90vh] overflow-y-auto md:max-w-lg md:mx-auto md:bottom-10 md:rounded-[32px] md:shadow-2xl"
            >
              <div className="p-6 pb-12">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900">Order Details</h2>
                  <button onClick={() => setSelectedOrder(null)} className="p-2 bg-gray-100 rounded-full active:scale-90 transition-transform">
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Customer Info */}
                  <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <div className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-indigo-100">
                      {selectedOrder.customer?.first_name?.[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 truncate">{selectedOrder.customer?.first_name}</p>
                      <p className="text-xs text-gray-500 truncate">@{selectedOrder.customer?.username || 'no_username'}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <StatusBadge status={selectedOrder.status} />
                    </div>
                  </div>

                  {/* Items List */}
                  <div className="space-y-3">
                    <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                      <Package className="w-3 h-3" /> Items
                    </h3>
                    <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
                      {selectedOrder.items?.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-6 h-6 bg-gray-100 rounded flex items-center justify-center text-[10px] font-bold text-gray-500 flex-shrink-0">
                              {item.quantity}x
                            </span>
                            <span className="text-gray-700 truncate">{item.product_name}</span>
                          </div>
                          <span className="font-bold text-gray-900 flex-shrink-0">{(item.price * item.quantity).toLocaleString()} MMK</span>
                        </div>
                      ))}
                    </div>
                    <div className="pt-3 border-t border-gray-100 flex justify-between items-center">
                      <span className="text-sm font-bold text-gray-900">Total Amount</span>
                      <span className="text-lg font-bold text-indigo-600">{selectedOrder.total_amount?.toLocaleString()} MMK</span>
                    </div>
                  </div>

                  {/* Order Meta */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100">
                      <p className="text-[10px] font-bold text-gray-400 uppercase mb-1 flex items-center gap-1">
                        <CreditCard className="w-3 h-3" /> Method
                      </p>
                      <p className="text-sm font-bold text-gray-900 capitalize">{selectedOrder.payment_method || 'Cash'}</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100">
                      <p className="text-[10px] font-bold text-gray-400 uppercase mb-1 flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> Date
                      </p>
                      <p className="text-sm font-bold text-gray-900">{format(new Date(selectedOrder.created_at), 'MMM d, yyyy')}</p>
                    </div>
                  </div>

                  {/* Status Update */}
                  <div className="space-y-3">
                    <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Update Status</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {['pending', 'processing', 'shipped', 'delivered', 'cancelled'].map(status => (
                        <button
                          key={status}
                          onClick={() => updateOrderMutation.mutate({ id: selectedOrder.id, status })}
                          disabled={updateOrderMutation.isPending}
                          className={`px-4 py-2.5 rounded-xl text-[10px] font-bold capitalize transition-all flex items-center justify-center gap-2 ${
                            selectedOrder.status === status 
                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100 border border-indigo-600' 
                            : 'bg-white text-gray-500 border border-gray-100 hover:bg-gray-50 active:bg-gray-100'
                          }`}
                        >
                          {updateOrderMutation.isPending && selectedOrder.status !== status && <Loader2 className="w-3 h-3 animate-spin" />}
                          {status}
                        </button>
                      ))}
                    </div>
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
