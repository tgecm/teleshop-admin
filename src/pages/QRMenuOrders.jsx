import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useBotStore } from '../store/botStore';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import { getQRMenuOrders, getQRMenuPendingCount } from '../api/orders';
import { updateOrder } from '../api/orders';
import LoadingSkeleton from '../components/shared/LoadingSkeleton';
import { API_BASE } from '../api/config';
import client from '../api/client';
import { downloadBlob } from '../utils/download';
import { Loader2, Package, X, Download } from 'lucide-react';

export default function QRMenuOrders() {
  const { selectedBotId } = useBotStore();
  const { addToast } = useToastStore();
  const queryClient = useQueryClient();
  const token = useAuthStore(s => s.token);
  const [orderTab, setOrderTab] = useState('pending');
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [fullScreenImage, setFullScreenImage] = useState(null);

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
                const orderNotes = (() => {
                  try {
                    const sa = typeof order.shipping_address === 'string' ? JSON.parse(order.shipping_address) : order.shipping_address;
                    return sa?.notes || '';
                  } catch { return ''; }
                })();
                const isExpanded = expandedOrder === order.id;
                return (
                  <div key={order.id}>
                    <div
                      onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                      className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-gray-100 cursor-pointer hover:bg-gray-50 transition-all active:scale-[0.99]"
                    >
                      <span className="text-xs font-bold text-gray-500 min-w-[70px]">#{order.order_number ? order.order_number.slice(-6) : `ORD-${order.id}`}</span>
                      {orderNotes && <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-1.5 py-0.5 whitespace-nowrap">{orderNotes}</span>}
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
                        {orderNotes && (
                          <p className="flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                            <span>📍</span> {orderNotes}
                          </p>
                        )}
                        {order.payment_method && order.payment_method !== 'prepaid' && (
                          <p className="text-gray-500 text-xs">💳 {order.payment_method}</p>
                        )}
                        {(() => {
                          try {
                            const bs = typeof order.buyer_snapshot === 'string' ? JSON.parse(order.buyer_snapshot) : order.buyer_snapshot;
                            if (bs?.points_redeemed) {
                              return <p className="text-xs font-semibold text-amber-600">⭐ {bs.points_redeemed} pts used</p>;
                            }
                          } catch {}
                          return null;
                        })()}
                        {order.payment_proof_messages && order.payment_proof_messages.length > 0 && (
                          <div className="grid grid-cols-2 gap-3">
                            {(() => {
                              const proofs = typeof order.payment_proof_messages === 'string'
                                ? JSON.parse(order.payment_proof_messages)
                                : order.payment_proof_messages;
                              return proofs.map((proof, i) => {
                                const fileId = proof.file_id || proof;
                                if (!fileId) return null;
                                const imgSrc = `${API_BASE}/telegram/file/${encodeURIComponent(fileId)}?bot_id=${selectedBotId}`;
                                const dlUrl = `${API_BASE}/orders/${order.id}/payment-proof-image/${i}?download=1&token=${token}`;
                                return (
                                  <div key={i} className="relative">
                                    <img
                                      src={imgSrc}
                                      alt="Payment proof"
                                      className="w-full h-44 rounded-lg border border-gray-200 bg-white object-contain cursor-pointer"
                                      onClick={() => setFullScreenImage(imgSrc)}
                                    />
                                    <a
                                      href={dlUrl}
                                      download={`payment_proof_${order.id}_${i + 1}.jpg`}
                                      onClick={(e) => e.stopPropagation()}
                                      className="absolute top-2 right-2 flex items-center justify-center gap-1.5 w-9 h-9 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg transition-all active:scale-90"
                                    >
                                      <Download className="w-5 h-5" />
                                    </a>
                                  </div>
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

      {fullScreenImage && (
        <ImageViewer src={fullScreenImage} onClose={() => setFullScreenImage(null)} />
      )}
    </div>
  );
}

function ImageViewer({ src, onClose }) {
  const imgRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const lastDist = useRef(null);
  const lastPos = useRef(null);
  const lastScale = useRef(1);
  const lastPosition = useRef({ x: 0, y: 0 });
  const [panning, setPanning] = useState(false);

  const reset = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    lastScale.current = 1;
    lastPosition.current = { x: 0, y: 0 };
  };

  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastDist.current = Math.hypot(dx, dy);
      lastScale.current = scale;
      lastPosition.current = { ...position };
    } else if (e.touches.length === 1 && scale > 1) {
      setPanning(true);
      lastPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      lastPosition.current = { ...position };
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      if (lastDist.current) {
        const newScale = Math.min(Math.max(lastScale.current * (dist / lastDist.current), 1), 5);
        setScale(newScale);
        if (newScale <= 1) {
          setPosition({ x: 0, y: 0 });
        }
      }
    } else if (e.touches.length === 1 && panning && scale > 1) {
      const dx = e.touches[0].clientX - lastPos.current.x;
      const dy = e.touches[0].clientY - lastPos.current.y;
      setPosition({
        x: lastPosition.current.x + dx,
        y: lastPosition.current.y + dy,
      });
    }
  };

  const handleTouchEnd = () => {
    lastDist.current = null;
    lastPos.current = null;
    setPanning(false);
  };

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-10 h-10 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center z-10 transition-all active:scale-90"
      >
        <X className="w-5 h-5 text-white" />
      </button>

      <button
        onClick={(e) => { e.stopPropagation(); reset(); }}
        className="absolute top-4 left-4 w-10 h-10 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center z-10 transition-all active:scale-90"
      >
        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
        </svg>
      </button>

      <img
        ref={imgRef}
        src={src}
        alt="Payment proof"
        className="max-w-full max-h-full object-contain select-none transition-transform duration-200 ease-out"
        style={{
          transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
        }}
        onDoubleClick={(e) => {
          e.stopPropagation();
          scale > 1 ? reset() : setScale(2.5);
        }}
        draggable={false}
      />
      <p className="absolute bottom-6 left-1/2 -translate-x-1/2 text-xs text-white/50">Pinch to zoom · Double tap to zoom</p>
    </div>
  );
}