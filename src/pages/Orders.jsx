import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getOrders, updateOrder } from '../api/orders';
import client from '../api/client';
import { useBotStore } from '../store/botStore';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import LoadingSkeleton from '../components/shared/LoadingSkeleton';
import StatusBadge from '../components/shared/StatusBadge';
import Receipt from '../components/orders/Receipt';
import {
  Search,
  ChevronRight,
  ShoppingBag,
  Package,
  X,
  CheckCircle2,
  XCircle,
  Loader2,
  Image,
  Receipt as ReceiptIcon,
} from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';

export default function Orders() {
  const { selectedBotId } = useBotStore();
  const { addToast } = useToastStore();
  const queryClient = useQueryClient();
  const token = useAuthStore(s => s.token);
  const bots = useBotStore(s => s.bots);
  const currentBot = bots.find(b => b.id === Number(selectedBotId));
  const botUsername = currentBot?.bot_username;
  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null); // 'confirm' | 'reject' | null
  const [showReceipt, setShowReceipt] = useState(false);

  const { data: orders, isLoading } = useQuery({
    queryKey: ['orders', selectedBotId],
    queryFn: () => getOrders({ bot_id: Number(selectedBotId) }),
    enabled: !!selectedBotId,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => updateOrder(id, { status }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries(['orders', selectedBotId]);
      setSelectedOrder(prev => prev ? { ...prev, status: variables.status } : null);
      setConfirmAction(null);
      addToast('Order status updated');
    },
    onError: () => addToast('Failed to update order', 'error'),
  });

  const filteredOrders = orders?.filter(o => {
    const term = search.toLowerCase().trim();
    return (
      o.customer?.first_name?.toLowerCase().includes(term) ||
      o.customer?.username?.toLowerCase().includes(term) ||
      o.buyer_snapshot?.phone?.toLowerCase().includes(term) ||
      o.buyer_snapshot?.email?.toLowerCase().includes(term) ||
      o.order_number?.toLowerCase().includes(term) ||
      o.id.toString() === term ||
      o.id.toString().includes(term)
    );
  }) || [];

  if (isLoading) return <LoadingSkeleton type="list" count={5} />;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-lg sm:text-2xl font-bold text-gray-900">Orders</h1>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search customer or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm transition-all text-sm"
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
              className="fixed bottom-0 left-0 right-0 z-[60] bg-white rounded-t-[32px] md:rounded-[32px] md:shadow-2xl max-h-[85dvh] overflow-y-auto md:max-w-lg md:mx-auto md:bottom-10"
              style={{
                overscrollBehavior: 'contain',
                WebkitOverflowScrolling: 'touch',
                touchAction: 'pan-y',
              }}
            >
              <div className="sticky top-0 bg-white z-10 rounded-t-[32px] pt-4 pb-2 flex flex-col items-center">
                <div className="w-10 h-1 bg-gray-200 rounded-full" />
              </div>
              <div className="px-5 pb-[calc(max(env(safe-area-inset-bottom),16px)+68px)]">

                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900">Order Details</h2>
                  <button onClick={() => setSelectedOrder(null)} className="p-2 bg-gray-100 rounded-full active:scale-90 transition-transform">
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>

                <div className="space-y-5">

                  <div className="bg-gray-50 rounded-2xl border border-gray-100 p-4 space-y-3">
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Order ID</p>
                      <p className="text-base font-bold text-gray-900 break-all mt-0.5">{selectedOrder.order_number || `#${selectedOrder.id}`}</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900">
                        {selectedOrder.buyer_snapshot?.full_name || selectedOrder.customer?.first_name || 'Unknown'}
                      </span>
                      <StatusBadge status={selectedOrder.status} />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-500">Phone</span>
                      <span className="text-sm font-bold text-gray-900">{selectedOrder.buyer_snapshot?.phone || 'None (User Skipped)'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-500">Email</span>
                      <span className="text-sm font-bold text-gray-900">{selectedOrder.buyer_snapshot?.email || 'N/A'}</span>
                    </div>
                    {selectedOrder.buyer_snapshot?.address && selectedOrder.buyer_snapshot.address !== 'N/A' && (
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-medium text-gray-500 flex-shrink-0 mt-0.5">Address</span>
                        <span className="text-sm font-bold text-gray-900 text-right max-w-[200px]">{selectedOrder.buyer_snapshot.address}</span>
                      </div>
                    )}
                  </div>


                  <div className="space-y-2.5">
                    <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                      <Package className="w-3 h-3" /> Products
                    </h3>
                    <div className="space-y-1.5">
                      {selectedOrder.items?.map((item, idx) => (
                        <div key={idx} className="text-sm text-gray-700">
                          • {item.product_name || item.name} (x{item.quantity}) - {(item.price * item.quantity).toLocaleString()} MMK
                        </div>
                      ))}
                    </div>
                  </div>


                  <div className="pt-3 border-t border-gray-100 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Date</span>
                      <span className="font-bold text-gray-900">{format(new Date(selectedOrder.created_at), 'MMM d, yyyy')} at {format(new Date(selectedOrder.created_at), 'h:mm a')}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Amount</span>
                      <span className="font-bold text-indigo-600">{selectedOrder.total_amount?.toLocaleString()} MMK</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Payment Method</span>
                      <span className="font-bold text-gray-900 capitalize">{selectedOrder.payment_method || 'Cash'}</span>
                    </div>
                  </div>


                  {selectedOrder.status === 'confirmed' && (
                    <button
                      onClick={() => setShowReceipt(true)}
                      className="w-full py-3 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-indigo-100"
                    >
                      <ReceiptIcon className="w-5 h-5" />
                      Download Receipt
                    </button>
                  )}


                  {(selectedOrder.status === 'pending' || selectedOrder.status === 'pending_review') && (
                    <>

                      <div className="bg-amber-50 rounded-2xl border border-amber-100 p-4 space-y-3">
                        <div className="flex items-center gap-2">
                          <Image className="w-4 h-4 text-amber-600" />
                          <h3 className="text-xs font-bold text-amber-900 uppercase tracking-wider">Payment Proof</h3>
                        </div>
                        {selectedOrder.payment_proof_messages?.length > 0 ? (
                          <div className="space-y-3">
                            <p className="text-sm text-amber-800 font-medium">
                              ✅ {selectedOrder.payment_proof_messages.length} payment proof(s) submitted
                            </p>
                            <div className="grid gap-3">
                              {selectedOrder.payment_proof_messages.map((msgId, idx) => {
                                const imgUrl = `${client.defaults.baseURL}/orders/${selectedOrder.id}/payment-proof-image/${idx}?token=${token}`;
                                const tgLink = botUsername ? `https://t.me/${botUsername}` : '#';
                                return (
                                  <div key={idx} className="space-y-2 bg-white rounded-xl p-3 border border-amber-200">
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs font-bold text-amber-800">Proof #{idx + 1}</span>
                                      {botUsername && (
                                        <a
                                          href={tgLink}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
                                        >
                                          Open in Telegram Bot ↗
                                        </a>
                                      )}
                                    </div>
                                    <img
                                      src={imgUrl}
                                      alt={`Payment proof ${idx + 1}`}
                                      className="w-full rounded-lg border border-gray-200"
                                      onError={(e) => {
                                        e.target.onerror = null;
                                        e.target.style.display = 'none';
                                        e.target.nextElementSibling.style.display = 'block';
                                      }}
                                    />
                                    <p className="hidden text-xs text-gray-400 text-center py-4 bg-gray-50 rounded-lg">
                                      Unable to load image. Check in Telegram bot.
                                    </p>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-amber-700">No payment proof submitted yet.</p>
                        )}
                      </div>


                      <div className="flex flex-col gap-2">
                        <div className="flex gap-3">
                          <button
                            onClick={() => setConfirmAction('confirm')}
                            disabled={statusMutation.isPending}
                            className="flex-1 py-3.5 bg-emerald-600 text-white font-bold rounded-2xl hover:bg-emerald-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2 active:scale-[0.98] shadow-lg shadow-emerald-100"
                          >
                            {statusMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                            Confirm Payment
                          </button>
                          <button
                            onClick={() => setConfirmAction('reject')}
                            disabled={statusMutation.isPending}
                            className="flex-1 py-3.5 bg-rose-600 text-white font-bold rounded-2xl hover:bg-rose-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2 active:scale-[0.98] shadow-lg shadow-rose-100"
                          >
                            {statusMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <XCircle className="w-5 h-5" />}
                            Reject Payment
                          </button>
                        </div>

                        {confirmAction && (
                          <motion.div
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-gray-50 rounded-2xl border border-gray-200 p-4 space-y-3"
                          >
                            <p className="text-sm font-bold text-gray-900 text-center">
                              {confirmAction === 'confirm'
                                ? 'Confirm payment receipt? This will notify the buyer and deduct stock.'
                                : 'Reject this payment? The buyer will be notified.'}
                            </p>
                            <div className="flex gap-2">
                              <button
                                onClick={() => statusMutation.mutate({ id: selectedOrder.id, status: confirmAction === 'confirm' ? 'confirmed' : 'rejected' })}
                                disabled={statusMutation.isPending}
                                className={`flex-1 py-2.5 font-bold rounded-xl transition-all flex items-center justify-center gap-2 text-sm ${
                                  confirmAction === 'confirm'
                                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                    : 'bg-rose-600 text-white hover:bg-rose-700'
                                } disabled:opacity-50`}
                              >
                                {statusMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                Yes, {confirmAction === 'confirm' ? 'Confirm' : 'Reject'}
                              </button>
                              <button
                                onClick={() => setConfirmAction(null)}
                                disabled={statusMutation.isPending}
                                className="flex-1 py-2.5 bg-white text-gray-700 font-bold rounded-xl border border-gray-200 hover:bg-gray-50 transition-all text-sm"
                              >
                                Cancel
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </div>
                    </>
                  )}

                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <Receipt
        order={selectedOrder}
        bot={currentBot}
        open={showReceipt}
        onClose={() => setShowReceipt(false)}
      />
    </div>
  );
}
