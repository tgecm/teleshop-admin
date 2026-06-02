import { useState, useRef, useEffect } from 'react';
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
  UserCircle,
  Filter,
  Truck,
} from 'lucide-react';
import { myanmarFormat } from '../utils/date';
import { motion, AnimatePresence } from 'motion/react';

const STATUS_STEPS = [
  {key: 'pending', label: 'Pending'},
  {key: 'confirmed', label: 'Confirmed'},
  {key: 'processing', label: 'Processing'},
  {key: 'shipped', label: 'Shipped'},
  {key: 'delivered', label: 'Delivered'},
];
const TERMINAL_STATUSES = ['rejected'];

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
  const [confirmAction, setConfirmAction] = useState(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptType, setReceiptType] = useState('invoice');
  const [orderTab, setOrderTab] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showFilter, setShowFilter] = useState(false);
  const filterRef = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (filterRef.current && !filterRef.current.contains(e.target)) setShowFilter(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

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
    const isWebsite = o.payment_method === 'website';
    const isGuest = o.payment_method === 'guest';
    if (orderTab === 'all') return true;
    if (orderTab === 'telegram' && (isWebsite || isGuest)) return false;
    if (orderTab === 'ecommerce' && !isWebsite) return false;
    if (orderTab === 'guest' && !isGuest) return false;
    if (statusFilter !== 'all') {
      if (statusFilter === 'pending') {
        if (o.status !== 'pending' && o.status !== 'pending_review') return false;
      } else if (statusFilter === 'rejected') {
        if (o.status !== 'rejected' && o.status !== 'payment_failed') return false;
      } else if (o.status !== statusFilter) return false;
    }
    const term = search.toLowerCase().trim();
    return (
      o.buyer_snapshot?.name?.toLowerCase().includes(term) ||
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
        <div className="flex items-center gap-3">
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900">Orders</h1>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search customer or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm transition-all text-sm"
          />
          <button onClick={() => setShowFilter(p => !p)}
            className={`absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg flex items-center justify-center transition-all ${statusFilter !== 'all' ? 'bg-indigo-100 text-indigo-600' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}>
            <Filter className="w-4 h-4" />
          </button>
        </div>
      </div>

      {showFilter && (
        <div ref={filterRef} className="relative">
          <div className="absolute right-0 z-30 mt-1 bg-white border border-gray-100 rounded-2xl shadow-xl p-1.5 min-w-[160px]">
            {[
              { value: 'all', label: 'All' },
              { value: 'pending', label: 'Pending' },
              { value: 'confirmed', label: 'Confirmed' },
              { value: 'cancelled', label: 'Cancelled' },
              { value: 'rejected', label: 'Rejected' },
              { value: 'processing', label: 'Processing' },
              { value: 'shipped', label: 'Shipped' },
              { value: 'delivered', label: 'Delivered' },
            ].map(s => (
              <button key={s.value} onClick={() => { setStatusFilter(s.value); setShowFilter(false); }}
                className={`block w-full text-left px-3 py-2 text-sm font-bold rounded-xl transition-all ${
                  statusFilter === s.value
                    ? 'bg-indigo-50 text-indigo-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}>
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-1 bg-gray-100 rounded-2xl p-1">
        <button onClick={() => setOrderTab('all')}
          className={`flex-1 py-2 px-4 rounded-xl font-bold text-sm transition-all ${orderTab === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
          All
        </button>
        <button onClick={() => setOrderTab('telegram')}
          className={`flex-1 py-2 px-4 rounded-xl font-bold text-sm transition-all ${orderTab === 'telegram' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
          Telegram
        </button>
        <button onClick={() => setOrderTab('ecommerce')}
          className={`flex-1 py-2 px-4 rounded-xl font-bold text-sm transition-all ${orderTab === 'ecommerce' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
          Website
        </button>
        <button onClick={() => setOrderTab('guest')}
          className={`flex-1 py-2 px-4 rounded-xl font-bold text-sm transition-all ${orderTab === 'guest' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
          Guest
        </button>
      </div>

{filteredOrders.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-gray-200">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShoppingBag className="w-8 h-8 text-gray-300" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">No orders found</h3>
          <p className="text-sm text-gray-500 max-w-xs mx-auto mt-1">
            {search ? "Try a different search term." : orderTab === 'all' ? "No orders found." : orderTab === 'telegram' ? "Telegram orders will appear here." : orderTab === 'guest' ? "Guest orders will appear here." : "Website orders will appear here."}
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filteredOrders.map(order => (
            <div key={order.id} className="relative overflow-hidden rounded-2xl">
              {order.status === 'pending' && (
                <div className="absolute inset-0 flex pointer-events-none select-none">
                  <div className="flex-1 bg-emerald-500 rounded-l-2xl flex items-center justify-start pl-5">
                    <span className="text-white text-xs font-bold">✓ Confirm</span>
                  </div>
                  <div className="flex-1 bg-rose-500 rounded-r-2xl flex items-center justify-end pr-5">
                    <span className="text-white text-xs font-bold">Cancel ✗</span>
                  </div>
                </div>
              )}
              <motion.div
                layout
                drag={order.status === 'pending' ? 'x' : false}
                dragConstraints={{left: -80, right: 80}}
                dragElastic={0.05}
                dragSnapToOrigin
                onDragEnd={(_e, info) => {
                  if (info.offset.x < -60 && order.status === 'pending') {
                    setSelectedOrder(order);
                    setConfirmAction('reject');
                  } else if (info.offset.x > 60 && order.status === 'pending') {
                    setSelectedOrder(order);
                    setConfirmAction('confirm');
                  }
                }}
                onClick={() => setSelectedOrder(order)}
                className="relative bg-white p-4 rounded-2xl shadow-sm border border-gray-100 hover:border-indigo-200 transition-all cursor-pointer active:scale-[0.98]"
                style={{touchAction: 'pan-y'}}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 flex-shrink-0">
                      <UserCircle className="w-6 h-6" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-900 truncate max-w-[120px] sm:max-w-none">{order.buyer_snapshot?.name || order.customer?.first_name || 'Customer'}</p>
                      <p className="text-[10px] text-gray-500">{myanmarFormat(order.created_at, 'MMM d, h:mm a')}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <p className="text-sm font-bold text-gray-900 whitespace-nowrap">{order.total_amount?.toLocaleString()} MMK</p>
                    <StatusBadge status={order.status} />
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 hidden sm:block flex-shrink-0" />
                </div>
              </motion.div>
            </div>
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
                        {selectedOrder.buyer_snapshot?.name || selectedOrder.buyer_snapshot?.full_name || selectedOrder.customer?.first_name || 'Unknown'}
                      </span>
                      <StatusBadge status={selectedOrder.status} />
                    </div>
                    {selectedOrder.payment_method === 'website' || selectedOrder.payment_method === 'guest' ? (
                      <>
                        {selectedOrder.buyer_snapshot?.phone && (
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-gray-500">Phone</span>
                            <span className="text-sm font-bold text-gray-900">{selectedOrder.buyer_snapshot.phone}</span>
                          </div>
                        )}
                        {selectedOrder.buyer_snapshot?.email && (
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-gray-500">Email</span>
                            <span className="text-sm font-bold text-gray-900">{selectedOrder.buyer_snapshot.email}</span>
                          </div>
                        )}
                        {selectedOrder.buyer_snapshot?.address && selectedOrder.buyer_snapshot.address !== 'N/A' && (
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-xs font-medium text-gray-500 flex-shrink-0 mt-0.5">Address</span>
                            <span className="text-sm font-bold text-gray-900 text-right max-w-[200px]">{selectedOrder.buyer_snapshot.address}</span>
                          </div>
                        )}
                        {selectedOrder.buyer_snapshot?.telegram_username && (
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-gray-500">Telegram</span>
                            <span className="text-sm font-bold text-gray-900">{selectedOrder.buyer_snapshot.telegram_username}</span>
                          </div>
                        )}
                        {selectedOrder.buyer_snapshot?.viber_number && (
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-gray-500">Viber</span>
                            <span className="text-sm font-bold text-gray-900">{selectedOrder.buyer_snapshot.viber_number}</span>
                          </div>
                        )}
                        {selectedOrder.buyer_snapshot?.notes && (
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-xs font-medium text-gray-500 flex-shrink-0 mt-0.5">Notes</span>
                            <span className="text-sm font-bold text-gray-900 text-right max-w-[200px]">{selectedOrder.buyer_snapshot.notes}</span>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-gray-500">Phone</span>
                          <span className="text-sm font-bold text-gray-900">{selectedOrder.buyer_snapshot?.phone || 'N/A'}</span>
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
                      </>
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
                      <span className="font-bold text-gray-900">{myanmarFormat(selectedOrder.created_at, 'MMM d, yyyy')} at {myanmarFormat(selectedOrder.created_at, 'h:mm a')}</span>
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

                  <div className="pt-3 border-t border-gray-100">
                    <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-4">Status Timeline</h3>
                    <div className="relative">
                      {TERMINAL_STATUSES.includes(selectedOrder.status) ? (
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full bg-rose-500 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-bold text-rose-600 capitalize">{selectedOrder.status}</p>
                            <p className="text-[10px] text-gray-500">Final status</p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-0">
                          {STATUS_STEPS.map((step, idx) => {
                            const stepIdx = STATUS_STEPS.findIndex(s => s.key === selectedOrder.status);
                            const isPast = idx < stepIdx;
                            const isCurrent = idx === stepIdx;
                            const isFuture = idx > stepIdx;
                            return (
                              <div key={step.key} className="flex gap-3">
                                <div className="flex flex-col items-center">
                                  <div className={`w-3 h-3 rounded-full flex-shrink-0 ring-2 ${
                                    isCurrent
                                      ? 'bg-indigo-600 ring-indigo-200'
                                      : isPast
                                        ? 'bg-emerald-500 ring-emerald-200'
                                        : 'bg-gray-200 ring-gray-100'
                                  }`} />
                                  {idx < STATUS_STEPS.length - 1 && (
                                    <div className={`w-0.5 h-8 ${
                                      isFuture ? 'bg-gray-200' : 'bg-emerald-300'
                                    }`} />
                                  )}
                                </div>
                                <div className={`pb-6 ${isFuture ? 'opacity-40' : ''}`}>
                                  <p className={`text-sm font-bold ${
                                    isCurrent ? 'text-indigo-600' : isPast ? 'text-gray-900' : 'text-gray-400'
                                  }`}>{step.label}</p>
                                  {isCurrent && (
                                    <p className="text-[10px] text-indigo-400 font-medium">Current</p>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>


                  {selectedOrder.status !== 'pending' && selectedOrder.status !== 'pending_review' && !TERMINAL_STATUSES.includes(selectedOrder.status) && (
                    <div className="space-y-2">
                      <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Update Status</h3>
                      <div className="grid grid-cols-4 gap-1.5">
                        {[
                          { key: 'processing', label: 'Processing', icon: Package, color: 'bg-indigo-600 hover:bg-indigo-700' },
                          { key: 'shipped', label: 'Shipped', icon: Truck, color: 'bg-purple-600 hover:bg-purple-700' },
                          { key: 'delivered', label: 'Delivered', icon: CheckCircle2, color: 'bg-emerald-600 hover:bg-emerald-700' },
                          { key: 'cancelled', label: 'Cancelled', icon: XCircle, color: 'bg-rose-600 hover:bg-rose-700' },
                        ].map(({ key, label, icon: Icon, color }) => {
                          const isCurrent = selectedOrder.status === key;
                          return (
                            <button
                              key={key}
                              onClick={() => !isCurrent && statusMutation.mutate({ id: selectedOrder.id, status: key })}
                              disabled={isCurrent || statusMutation.isPending}
                              className={`flex flex-col items-center gap-0.5 py-2 rounded-xl transition-all active:scale-[0.95] ${
                                isCurrent
                                  ? 'bg-gray-100 text-gray-400 cursor-default'
                                  : `${color} text-white shadow-sm`
                              }`}
                            >
                              <Icon className="w-4 h-4" />
                              <span className="text-[9px] font-bold leading-tight">{label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
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
                                : confirmAction === 'reject'
                                  ? 'Reject this payment? The buyer will be notified.'
                                  : `Mark order as ${confirmAction}?`}
                            </p>
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  const status = confirmAction === 'confirm' ? 'confirmed' : confirmAction === 'reject' ? 'rejected' : confirmAction;
                                  statusMutation.mutate({ id: selectedOrder.id, status });
                                }}
                                disabled={statusMutation.isPending}
                                className={`flex-1 py-2.5 font-bold rounded-xl transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50 ${
                                  confirmAction === 'confirm' || confirmAction === 'reject'
                                    ? confirmAction === 'confirm'
                                      ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                      : 'bg-rose-600 text-white hover:bg-rose-700'
                                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                                }`}
                              >
                                {statusMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                Yes
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

                      <button
                        onClick={() => { setReceiptType('invoice'); setShowReceipt(true); }}
                        className="w-full py-3 bg-white text-gray-700 font-bold rounded-2xl border border-gray-200 hover:bg-gray-50 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                      >
                        <ReceiptIcon className="w-5 h-5" />
                        Download Invoice
                      </button>
                    </>
                  )}

                  {['confirmed', 'processing', 'shipped', 'delivered'].includes(selectedOrder.status) && (
                    <div className="flex gap-3">
                      <button
                        onClick={() => { setReceiptType('invoice'); setShowReceipt(true); }}
                        className="flex-1 py-3 bg-white text-gray-700 font-bold rounded-2xl border border-gray-200 hover:bg-gray-50 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                      >
                        <ReceiptIcon className="w-5 h-5" />
                        Download Invoice
                      </button>
                      <button
                        onClick={() => { setReceiptType('receipt'); setShowReceipt(true); }}
                        className="flex-1 py-3 bg-white text-gray-700 font-bold rounded-2xl border border-gray-200 hover:bg-gray-50 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                      >
                        <ReceiptIcon className="w-5 h-5" />
                        Download Receipt
                      </button>
                    </div>
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
        receiptType={receiptType}
      />
    </div>
  );
}
