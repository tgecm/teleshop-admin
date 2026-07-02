import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getOrders, updateOrder } from '../api/orders';
import { useToastStore } from '../store/toastStore';
import { useBotStore } from '../store/botStore';
import LoadingSkeleton from '../components/shared/LoadingSkeleton';
import StatusBadge from '../components/shared/StatusBadge';
import {
  Search, X, Package, ShoppingBag, UserCircle, ChevronRight,
  CheckCircle2, XCircle, Loader2, Filter, Truck, Bot,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { myanmarFormat } from '../utils/date';
import { formatPrice } from '../utils/formatPrice';

const STATUS_STEPS = [
  { key: 'pending', label: 'Pending' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'processing', label: 'Processing' },
  { key: 'shipped', label: 'Shipped' },
  { key: 'delivered', label: 'Delivered' },
];
const TERMINAL_STATUSES = ['cancelled', 'rejected'];

export default function SuperadminOrders() {
  const { addToast } = useToastStore();
  const queryClient = useQueryClient();
  const { bots, setSelectedBot } = useBotStore();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [botFilter, setBotFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  const { data: orders, isLoading } = useQuery({
    queryKey: ['superadmin', 'all-orders'],
    queryFn: () => getOrders({ limit: 200, sort: 'created_at', order: 'desc' }),
    refetchInterval: 15000,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => updateOrder(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin', 'all-orders'] });
      setSelectedOrder(prev => prev ? { ...prev, status: confirmAction } : null);
      setConfirmAction(null);
      addToast('Order status updated');
    },
    onError: () => addToast('Failed to update order', 'error'),
  });

  const filteredOrders = useMemo(() => {
    if (!orders) return [];
    return orders.filter(o => {
      const q = search.toLowerCase().trim();
      const matchesSearch = !q
        || o.customer?.first_name?.toLowerCase().includes(q)
        || o.customer?.username?.toLowerCase().includes(q)
        || o.buyer_snapshot?.name?.toLowerCase().includes(q)
        || o.buyer_snapshot?.phone?.toLowerCase().includes(q)
        || String(o.id).includes(q)
        || String(o.id) === q;
      const matchesStatus = statusFilter === 'all'
        || o.status?.toLowerCase() === statusFilter
        || (statusFilter === 'rejected' && ['rejected', 'payment_failed', 'cancelled'].includes(o.status?.toLowerCase()));
      const matchesBot = botFilter === 'all' || String(o.bot_id) === botFilter;
      return matchesSearch && matchesStatus && matchesBot;
    });
  }, [orders, search, statusFilter, botFilter]);

  const stats = useMemo(() => {
    if (!orders) return { total: 0, pending: 0, today: 0, revenue: 0 };
    const today = new Date().toISOString().split('T')[0];
    return {
      total: orders.length,
      pending: orders.filter(o => o.status === 'pending').length,
      today: orders.filter(o => o.created_at?.startsWith(today)).length,
      revenue: orders.reduce((s, o) => s + Number(o.total_amount || o.amount || 0), 0),
    };
  }, [orders]);

  const handleSwitchBot = (botId) => {
    setSelectedBot(botId);
    window.location.href = '/orders';
  };

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        {[
          { label: 'Total Orders', value: stats.total.toLocaleString(), color: 'bg-indigo-50 text-indigo-600' },
          { label: 'Pending', value: stats.pending.toLocaleString(), color: 'bg-amber-50 text-amber-600' },
          { label: 'Today', value: stats.today.toLocaleString(), color: 'bg-emerald-50 text-emerald-600' },
          { label: 'Total Revenue', value: formatPrice(stats.revenue, 'MMK'), color: 'bg-purple-50 text-purple-600' },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 p-3.5 shadow-sm">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{s.label}</p>
            <p className={`text-lg font-bold mt-0.5 ${s.color.split(' ')[1]}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Search + filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by customer, phone, or order ID..."
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <button onClick={() => setShowFilters(!showFilters)}
          className={`px-3 py-2.5 rounded-xl border text-sm font-bold transition-all flex items-center gap-2 ${showFilters || statusFilter !== 'all' || botFilter !== 'all' ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
          <Filter className="w-4 h-4" />
          Filters
        </button>
      </div>

      <AnimatePresence>
        {showFilters && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm space-y-3">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Status</p>
                <div className="flex flex-wrap gap-1.5">
                  {['all', 'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'rejected'].map(s => (
                    <button key={s} onClick={() => setStatusFilter(s)}
                      className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${statusFilter === s ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                      {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Bot</p>
                <div className="flex flex-wrap gap-1.5">
                  <button onClick={() => setBotFilter('all')}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${botFilter === 'all' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                    All Bots
                  </button>
                  {bots.map(b => (
                    <button key={b.id} onClick={() => setBotFilter(String(b.id))}
                      className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${botFilter === String(b.id) ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                      {b.bot_username || `Bot #${b.id}`}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Order list */}
      {isLoading ? (
        <div className="space-y-2">{[1, 2, 3, 4].map(i => <LoadingSkeleton key={i} className="h-16" />)}</div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
          <ShoppingBag className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">{search ? 'No orders match your search' : 'No orders yet'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredOrders.map(o => {
            const bot = bots.find(b => String(b.id) === String(o.bot_id));
            return (
              <div key={o.id} onClick={() => setSelectedOrder(o)}
                className="bg-white rounded-xl border border-gray-100 p-3.5 hover:border-gray-200 hover:shadow-sm cursor-pointer transition-all flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-gray-100 text-gray-600 flex items-center justify-center font-bold text-xs flex-shrink-0">
                  #{String(o.id).slice(-4)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-900 truncate">{o.buyer_snapshot?.name || o.customer?.first_name || 'Customer'}</span>
                    <StatusBadge status={o.status} />
                  </div>
                  <p className="text-[11px] text-gray-500 truncate mt-0.5">
                    {bot ? `@${bot.bot_username} · ` : ''}
                    {o.items?.[0]?.name || formatPrice(o.total_amount || o.amount || 0, 'MMK')}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-gray-900">{formatPrice(o.total_amount || o.amount || 0, 'MMK')}</p>
                  <p className="text-[10px] text-gray-400">{o.created_at ? myanmarFormat(o.created_at, 'MMM d') : ''}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
              </div>
            );
          })}
        </div>
      )}

      {/* Order detail sheet */}
      <AnimatePresence>
        {selectedOrder && (
          <>
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50" onClick={() => setSelectedOrder(null)} />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 z-[60] bg-white rounded-t-[32px] max-h-[85dvh] overflow-y-auto md:max-w-lg md:mx-auto md:bottom-10 md:rounded-[32px] md:shadow-2xl"
            >
              <div className="sticky top-0 bg-white rounded-t-[32px] pt-4 pb-2 flex flex-col items-center">
                <div className="w-10 h-1 bg-gray-200 rounded-full" />
              </div>
              <div className="px-5 pb-[calc(max(env(safe-area-inset-bottom),16px)+24px)] space-y-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-gray-900">Order #{selectedOrder.id}</h2>
                  <button onClick={() => setSelectedOrder(null)} className="p-2 bg-gray-100 rounded-full"><X className="w-4 h-4 text-gray-500" /></button>
                </div>

                {/* Customer info */}
                <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 space-y-2">
                  {selectedOrder.buyer_snapshot?.name && (
                    <div className="flex justify-between"><span className="text-xs text-gray-500">Name</span><span className="text-sm font-bold text-gray-900">{selectedOrder.buyer_snapshot.name}</span></div>
                  )}
                  {selectedOrder.buyer_snapshot?.phone && (
                    <div className="flex justify-between"><span className="text-xs text-gray-500">Phone</span><span className="text-sm font-bold text-gray-900">{selectedOrder.buyer_snapshot.phone}</span></div>
                  )}
                  {selectedOrder.buyer_snapshot?.email && (
                    <div className="flex justify-between"><span className="text-xs text-gray-500">Email</span><span className="text-sm font-bold text-gray-900">{selectedOrder.buyer_snapshot.email}</span></div>
                  )}
                  {selectedOrder.buyer_snapshot?.address && selectedOrder.buyer_snapshot.address !== 'N/A' && (
                    <div className="flex justify-between gap-2"><span className="text-xs text-gray-500 flex-shrink-0">Address</span><span className="text-sm font-bold text-gray-900 text-right max-w-[200px]">{selectedOrder.buyer_snapshot.address}</span></div>
                  )}
                  <div className="flex justify-between"><span className="text-xs text-gray-500">Bot</span>
                    <button onClick={() => handleSwitchBot(selectedOrder.bot_id)}
                      className="text-sm font-bold text-indigo-600 hover:underline flex items-center gap-1">
                      {bots.find(b => String(b.id) === String(selectedOrder.bot_id))?.bot_username || `Bot #${selectedOrder.bot_id}`}
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Items */}
                {selectedOrder.items?.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Products</p>
                    {selectedOrder.items.map((item, i) => (
                      <div key={i} className="flex justify-between text-sm bg-gray-50 rounded-xl px-3 py-2">
                        <span className="font-medium text-gray-700 truncate mr-2">{item.name}{item.variant ? ` (${item.variant})` : ''}</span>
                        <span className="font-bold text-gray-900 flex-shrink-0">{item.quantity}x {formatPrice(item.price, 'MMK')}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Totals */}
                <div className="border-t border-gray-100 pt-3 space-y-1.5">
                  <div className="flex justify-between text-sm"><span className="text-gray-500">Amount</span><span className="font-bold text-indigo-600">{formatPrice(selectedOrder.total_amount || selectedOrder.amount || 0, 'MMK')}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-gray-500">Status</span><StatusBadge status={selectedOrder.status} /></div>
                  <div className="flex justify-between text-sm"><span className="text-gray-500">Date</span><span className="font-bold text-gray-900">{myanmarFormat(selectedOrder.created_at, 'MMM d, yyyy h:mm a')}</span></div>
                </div>

                {/* Status timeline + actions */}
                {!TERMINAL_STATUSES.includes(selectedOrder.status) && (
                  <div className="border-t border-gray-100 pt-4 space-y-3">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Update Status</p>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[
                        { key: 'processing', label: 'Process', icon: Package, color: 'bg-indigo-600' },
                        { key: 'shipped', label: 'Ship', icon: Truck, color: 'bg-purple-600' },
                        { key: 'delivered', label: 'Deliver', icon: CheckCircle2, color: 'bg-emerald-600' },
                        { key: 'cancelled', label: 'Cancel', icon: XCircle, color: 'bg-rose-600' },
                      ].map(({ key, label, icon: Icon, color }) => {
                        const isCur = selectedOrder.status === key;
                        return (
                          <button key={key} onClick={() => !isCur && setConfirmAction(key)} disabled={isCur || statusMutation.isPending}
                            className={`flex flex-col items-center gap-0.5 py-2.5 rounded-xl transition-all active:scale-95 ${isCur ? 'bg-gray-100 text-gray-400 cursor-default' : `${color} text-white shadow-sm hover:opacity-90`}`}>
                            <Icon className="w-4 h-4" /><span className="text-[9px] font-bold">{label}</span>
                          </button>
                        );
                      })}
                    </div>

                    <AnimatePresence>
                      {confirmAction && (
                        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                          className="bg-gray-50 rounded-2xl p-4 border border-gray-200 space-y-3">
                          <p className="text-sm font-bold text-gray-900 text-center">
                            Mark as <span className="capitalize">{confirmAction}</span>?
                          </p>
                          <div className="flex gap-2">
                            <button onClick={() => statusMutation.mutate({ id: selectedOrder.id, status: confirmAction })}
                              disabled={statusMutation.isPending}
                              className={`flex-1 py-2.5 font-bold rounded-xl text-white text-sm disabled:opacity-50 flex items-center justify-center gap-2 ${confirmAction === 'cancelled' ? 'bg-rose-600' : 'bg-indigo-600'}`}>
                              {statusMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                              Yes, {confirmAction}
                            </button>
                            <button onClick={() => setConfirmAction(null)} className="flex-1 py-2.5 bg-white text-gray-700 font-bold rounded-xl border border-gray-200 text-sm">Cancel</button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* Pending actions (confirm/reject payment) */}
                {selectedOrder.status === 'pending' && (
                  <div className="border-t border-gray-100 pt-4">
                    <div className="flex gap-3">
                      <button onClick={() => setConfirmAction('confirm')}
                        className="flex-1 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 text-sm">
                        <CheckCircle2 className="w-4 h-4" /> Confirm Payment
                      </button>
                      <button onClick={() => setConfirmAction('reject')}
                        className="flex-1 py-3 bg-rose-600 text-white font-bold rounded-xl hover:bg-rose-700 transition-all flex items-center justify-center gap-2 text-sm">
                        <XCircle className="w-4 h-4" /> Reject
                      </button>
                    </div>
                    {confirmAction && ['confirm', 'reject'].includes(confirmAction) && (
                      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                        className="mt-3 bg-gray-50 rounded-xl p-3 border border-gray-200 flex gap-2">
                        <button onClick={() => statusMutation.mutate({ id: selectedOrder.id, status: confirmAction === 'confirm' ? 'confirmed' : 'rejected' })}
                          disabled={statusMutation.isPending}
                          className="flex-1 py-2 bg-indigo-600 text-white font-bold rounded-lg text-sm disabled:opacity-50 flex items-center justify-center gap-1">
                          {statusMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                          Confirm
                        </button>
                        <button onClick={() => setConfirmAction(null)} className="flex-1 py-2 bg-white text-gray-700 font-bold rounded-lg border text-sm">Cancel</button>
                      </motion.div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
