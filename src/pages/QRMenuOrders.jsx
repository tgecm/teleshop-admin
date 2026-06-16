import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useBotStore } from '../store/botStore';
import { useToastStore } from '../store/toastStore';
import { getQRMenuOrders, getQRMenuPendingCount } from '../api/orders';
import { updateOrder } from '../api/orders';
import LoadingSkeleton from '../components/shared/LoadingSkeleton';
import { Loader2, Package, X } from 'lucide-react';

export default function QRMenuOrders() {
  const { selectedBotId } = useBotStore();
  const { addToast } = useToastStore();
  const queryClient = useQueryClient();
  const [orderTab, setOrderTab] = useState('pending');
  const [expandedOrder, setExpandedOrder] = useState(null);

  const { data: pendingOrderCount } = useQuery({
    queryKey: ['qr-pending-orders-count', selectedBotId],
    queryFn: () => getQRMenuPendingCount(selectedBotId),
    enabled: !!selectedBotId,
    refetchInterval: 15000,
  });

  const { data: qrOrders, isLoading: loadingOrders } = useQuery({
    queryKey: ['qr-orders', selectedBotId],
    queryFn: () => getQRMenuOrders(selectedBotId, { limit: 100 }),
    enabled: !!selectedBotId,
  });

  const updateOrderMutation = useMutation({
    mutationFn: ({ id, status }) => updateOrder(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qr-orders'] });
      queryClient.invalidateQueries({ queryKey: ['qr-pending-orders-count'] });
    },
  });

  const counts = {
    pending: qrOrders?.filter(o => o.status === 'pending_review' || o.status === 'pending').length || 0,
    confirmed: qrOrders?.filter(o => o.status === 'confirmed').length || 0,
    cancelled: qrOrders?.filter(o => o.status === 'cancelled').length || 0,
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
          <Package className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900">QR Menu Orders</h1>
          <p className="text-xs text-gray-500">Manage orders placed through your QR menu</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Tabs */}
        <div className="flex gap-1 p-3 bg-gray-50 border-b border-gray-100">
          {(['pending', 'confirmed', 'cancelled']).map(tab => (
            <button key={tab}
              onClick={() => setOrderTab(tab)}
              className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all ${
                orderTab === tab
                  ? 'bg-white text-gray-900 shadow-sm border border-gray-200'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab === 'pending' ? 'Waiting' : tab === 'confirmed' ? 'Confirmed' : 'Rejected'}
              <span className={`ml-1.5 text-xs ${
                tab === 'pending' ? 'text-amber-600' :
                tab === 'confirmed' ? 'text-emerald-600' : 'text-rose-600'
              }`}>({counts[tab]})</span>
            </button>
          ))}
        </div>

        <div className="p-4 space-y-2">
          {loadingOrders ? (
            <div className="text-center py-12 text-gray-400 text-sm">Loading orders...</div>
          ) : !qrOrders || qrOrders.length === 0 ? (
            <div className="text-center py-16">
              <Package className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-500">No orders yet</p>
              <p className="text-xs text-gray-400 mt-1">Orders from QR menu customers will appear here</p>
            </div>
          ) : (
            qrOrders
              .filter(o => {
                if (orderTab === 'pending') return o.status === 'pending_review' || o.status === 'pending';
                if (orderTab === 'confirmed') return o.status === 'confirmed';
                if (orderTab === 'cancelled') return o.status === 'cancelled';
                return true;
              })
              .map(order => {
                const orderItems = (() => {
                  try { return typeof order.items === 'string' ? JSON.parse(order.items) : order.items || []; }
                  catch { return []; }
                })();
                const isExpanded = expandedOrder === order.id;
                return (
                  <div key={order.id}>
                    <div
                      onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                      className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-gray-100 cursor-pointer hover:bg-gray-50 transition-all active:scale-[0.99]"
                    >
                      <span className="text-xs font-bold text-gray-500 min-w-[70px]">#{order.order_number ? order.order_number.slice(-6) : `ORD-${order.id}`}</span>
                      <span className="flex-1 text-sm text-gray-700 truncate">
                        {orderItems.map(i => i.name).join(', ')}
                      </span>
                      <span className="text-sm font-bold text-gray-900 whitespace-nowrap">{Number(order.total_amount).toLocaleString()} K</span>
                      {order.status === 'pending_review' || order.status === 'pending' ? (
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                      ) : null}
                      <svg className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M19 9l-7 7-7-7"/></svg>
                    </div>
                    {isExpanded && (
                      <div className="mx-4 mb-2 p-4 bg-gray-50 rounded-xl border border-gray-100 text-sm space-y-3">
                        <div className="space-y-1.5">
                          {orderItems.map((item, i) => (
                            <div key={i} className="flex justify-between text-gray-600">
                              <span><span className="font-bold text-gray-800">{item.quantity || item.qty}x</span> {item.name}</span>
                              <span className="font-bold text-gray-700">{Number(item.price).toLocaleString()} K</span>
                            </div>
                          ))}
                        </div>
                        <div className="flex justify-between font-bold text-gray-900 border-t border-gray-200 pt-2">
                          <span>Total</span>
                          <span>{Number(order.total_amount).toLocaleString()} K</span>
                        </div>
                        {order.payment_method && order.payment_method !== 'prepaid' && (
                          <p className="text-gray-500 text-xs">💳 {order.payment_method}</p>
                        )}
                        {order.payment_proof_messages && order.payment_proof_messages.length > 0 && (
                          <div className="flex gap-2 overflow-x-auto pb-1">
                            {(() => {
                              const proofs = typeof order.payment_proof_messages === 'string'
                                ? JSON.parse(order.payment_proof_messages)
                                : order.payment_proof_messages;
                              return proofs.map((proof, i) => {
                                const fileId = proof.file_id || proof;
                                if (!fileId) return null;
                                return (
                                  <img key={i}
                                    src={`https://api.telegramecommerce.shop/telegram/file/${encodeURIComponent(fileId)}?bot_id=${selectedBotId}`}
                                    alt="Payment proof"
                                    className="h-28 w-auto rounded-lg border border-gray-200 bg-white object-contain"
                                  />
                                );
                              });
                            })()}
                          </div>
                        )}
                        {(order.status === 'pending_review' || order.status === 'pending') && (
                          <div className="flex gap-2 pt-1">
                            <button
                              onClick={(e) => { e.stopPropagation(); updateOrderMutation.mutate({ id: order.id, status: 'confirmed' }); }}
                              disabled={updateOrderMutation.isPending}
                              className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all active:scale-[0.97] disabled:opacity-50 text-sm"
                            >Confirm</button>
                            <button
                              onClick={(e) => { e.stopPropagation(); updateOrderMutation.mutate({ id: order.id, status: 'cancelled' }); }}
                              disabled={updateOrderMutation.isPending}
                              className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition-all active:scale-[0.97] disabled:opacity-50 text-sm"
                            >Decline</button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
          )}
        </div>
      </div>
    </div>
  );
}