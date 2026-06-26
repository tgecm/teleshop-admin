import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useCartState } from '../context/CartContext';
import { myanmarFormat } from '../utils/date';
import { RichMessage } from '../components/chat/RichMessage';
import { getPublicTopProducts } from '../api/public';
import SearchableSelect from '../components/shared/SearchableSelect';
import { REGION_NAMES, getDistricts, getTownships } from '../data/townships';
import { PaymentSelect, ContactInfoStep, CheckoutModal } from './PublicEcommerce';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShoppingBag, Package, Clock, CheckCircle2, XCircle, ChevronRight,
  MapPin, Phone, Mail, User, Plus, Trash2, LogOut, Loader2,
  ShoppingCart, Home, Truck, Copy, Minus, Receipt as ReceiptIcon,
  CheckCircle, X, Upload, MessageCircle, Newspaper, Send, RefreshCw,
  TrendingUp, Star, Ticket, ArrowRight, QrCode
} from 'lucide-react';
import Receipt from '../components/orders/Receipt';
import CustomerShopTab from '../components/CustomerShopTab';
import NewsfeedFeed from '../components/NewsfeedFeed';
import { useToastStore } from '../store/toastStore';
import { API_BASE } from '../api/config';

const FETCH_TIMEOUT_MS = 15000;

function fetchWithTimeout(url, options, timeoutMs = FETCH_TIMEOUT_MS) {
  return Promise.race([
    fetch(url, options),
    new Promise((_, reject) => setTimeout(() => reject(new Error('Request timed out')), timeoutMs)),
  ]);
}

function makeCircularFavicon(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const size = Math.min(img.width, img.height);
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext('2d');
      ctx.beginPath();
      ctx.arc(32, 32, 32, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(img, (img.width - size) / 2, (img.height - size) / 2, size, size, 0, 0, 64, 64);
      resolve(canvas.toDataURL());
    };
    img.onerror = () => resolve(url);
    img.src = url;
  });
}

function setPageMeta(title, pictureUrl) {
  document.title = title;
  const icon = document.querySelector('link[rel="icon"]');
  if (icon && pictureUrl) {
    makeCircularFavicon(pictureUrl).then((dataUrl) => {
      icon.setAttribute('href', dataUrl);
    });
  } else if (icon) {
    icon.setAttribute('href', '/vite.svg');
  }
}

function formatPrice(price) {
  return Number(price).toLocaleString();
}

const statusConfig = {
  pending: { label: 'Pending', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200', dot: 'bg-amber-400' },
  processing: { label: 'Processing', icon: Package, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200', dot: 'bg-blue-400' },
  confirmed: { label: 'Confirmed', icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200', dot: 'bg-emerald-400' },
  delivered: { label: 'Delivered', icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200', dot: 'bg-emerald-400' },
  cancelled: { label: 'Cancelled', icon: XCircle, color: 'text-red-600', bg: 'bg-red-50 border-red-200', dot: 'bg-red-400' },
};

function authHeaders() {
  const token = sessionStorage.getItem('qr_customer_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function getToken() {
  return sessionStorage.getItem('qr_customer_token');
}

function getCustomerId() {
  return sessionStorage.getItem('qr_customer_id');
}

function linkifyText(text) {
  const urlRegex = /(https?:\/\/[^\s<]+)|((?:www\.)[^\s<]+\.[^\s<]{2,})|([a-zA-Z0-9][a-zA-Z0-9-]*(?:\.[a-zA-Z]{2,})+(?:\/[^\s<]*)?)/gi;
  const parts = text.split(urlRegex).filter(Boolean);
  return parts.map((part, i) => {
    if (part.match(/^https?:\/\//i)) {
      return <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-indigo-600 font-medium hover:underline">{part}</a>;
    }
    if (part.match(/^www\./i)) {
      return <a key={i} href={'https://' + part} target="_blank" rel="noopener noreferrer" className="text-indigo-600 font-medium hover:underline">{part}</a>;
    }
    if (part.match(/^[a-zA-Z0-9][a-zA-Z0-9-]*\.[a-zA-Z]{2,}/)) {
      return <a key={i} href={'https://' + part} target="_blank" rel="noopener noreferrer" className="text-indigo-600 font-medium hover:underline">{part}</a>;
    }
    return part;
  });
}

export default function QRCustomerDashboard({ slug, shop, onSignOut: parentSignOut }) {
  const { addToast } = useToastStore();
  const [activeTab, setActiveTab] = useState('overview');
  const [dashboardData, setDashboardData] = useState(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([{ role: 'assistant', content: 'Hi! How can I help you today?' }]);
  const [chatLoading, setChatLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const chatQueueRef = useRef([]);
  const chatSendingRef = useRef(false);
  const chatMessagesRef = useRef(chatMessages);
  useEffect(() => { chatMessagesRef.current = chatMessages; }, [chatMessages]);
  const chatRef = useRef(null);
  const copyTimerRef = useRef(null);
  const chatInputRef = useRef(null);
  const shopName = shop?.bot_full_name || slug;
  const botId = shop?.id;

  // Fetch dashboard data
  useEffect(() => {
    if (!slug || !getToken()) { setDashboardLoading(false); return; }
    setDashboardLoading(true);
    fetchWithTimeout(`${API_BASE}/public/qr-menu/${encodeURIComponent(slug)}/customer/dashboard`, { headers: authHeaders() })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) setDashboardData(data);
        setDashboardLoading(false);
        setRefreshing(false);
      })
      .catch(() => { setDashboardLoading(false); setRefreshing(false); });
  }, [slug, refreshKey]);

  // Set page meta
  useEffect(() => {
    if (shop?.bot_full_name) setPageMeta(shop.bot_full_name, shop.profile_picture);
  }, [shop]);

  // Chat
  useEffect(() => {
    if (!chatOpen || !botId || !getCustomerId()) return;
    const visitorId = getCustomerId();
    fetch(`${API_BASE}/public/visitor/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visitor_id: visitorId, bot_id: botId, name: dashboardData?.customer?.name || 'QR Customer' }),
    }).catch(() => {});
    fetch(`${API_BASE}/public/chat/${botId}/${encodeURIComponent(visitorId)}/messages`)
      .then(r => r.ok ? r.json() : [])
      .then(msgs => {
        if (msgs.length > 0) {
          const formatted = msgs.map(m => ({
            role: m.sender_type === 'admin' ? 'assistant' : 'user',
            content: m.message_text || '',
            file_id: m.file_id,
            file_type: m.file_type,
          }));
          setChatMessages(prev => {
            const isGreeting = prev.length === 1 && prev[0].role === 'assistant' && prev[0].content === 'Hi! How can I help you today?';
            return isGreeting ? formatted : [...prev, ...formatted];
          });
        }
      })
      .catch(() => {});
  }, [chatOpen, botId, dashboardData?.customer?.name]);

  useEffect(() => {
    if (!chatOpen || !botId || !getCustomerId()) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/public/chat/${botId}/${encodeURIComponent(getCustomerId())}/messages`);
        if (!res.ok) return;
        const msgs = await res.json();
        if (!msgs.length) return;
        const formatted = msgs.map(m => ({
          role: m.sender_type === 'admin' || m.sender_type === 'ai' ? 'assistant' : 'user',
          content: m.message_text || '',
          file_id: m.file_id,
          file_type: m.file_type,
        }));
        setChatMessages(prev => {
          const existingKeys = new Set(prev.map(m => `${m.content}|${m.role}|${m.file_id || ''}`));
          const newMsgs = formatted.filter(m => !existingKeys.has(`${m.content}|${m.role}|${m.file_id || ''}`));
          return newMsgs.length ? [...prev, ...newMsgs] : prev;
        });
      } catch {}
    }, 3000);
    return () => clearInterval(interval);
  }, [chatOpen, botId]);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [chatMessages]);

  const sendMessage = useCallback(async (msg) => {
    if (!msg || !botId) return;
    if (chatSendingRef.current) {
      chatQueueRef.current = [...chatQueueRef.current, { type: 'msg', msg }];
      setChatMessages(prev => [...prev, { role: 'user', content: msg }]);
      return;
    }
    chatSendingRef.current = true;
    setChatMessages(prev => [...prev, { role: 'user', content: msg }]);
    setChatLoading(true);
    try {
      const history = chatMessagesRef.current.slice(-100).map(m => ({ role: m.role, content: m.content }));
      const res = await fetch(`${API_BASE}/public/chat/${botId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, history, visitor_id: getCustomerId() }),
      });
      const d = await res.json();
      if (d.reply) setChatMessages(prev => [...prev, { role: 'assistant', content: d.reply }]);
    } catch {
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' }]);
    } finally {
      chatSendingRef.current = false;
      setChatLoading(false);
      chatInputRef.current?.focus();
      if (chatQueueRef.current.length > 0) {
        const next = chatQueueRef.current.shift();
        setTimeout(() => next.type === 'action' ? sendAction(next.msg) : sendMessage(next.msg), 50);
      }
    }
  }, [botId]);

  const sendAction = useCallback(async (actionMsg) => {
    if (!botId) return;
    if (chatSendingRef.current) {
      chatQueueRef.current = [...chatQueueRef.current, { type: 'action', msg: actionMsg }];
      return;
    }
    chatSendingRef.current = true;
    setChatLoading(true);
    try {
      const history = chatMessagesRef.current.slice(-100).map(m => ({ role: m.role, content: m.content }));
      const res = await fetch(`${API_BASE}/public/chat/${botId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: actionMsg, history, visitor_id: getCustomerId() }),
      });
      const d = await res.json();
      if (d.reply) setChatMessages(prev => [...prev, { role: 'assistant', content: d.reply }]);
    } catch {
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' }]);
    } finally {
      chatSendingRef.current = false;
      setChatLoading(false);
      chatInputRef.current?.focus();
      if (chatQueueRef.current.length > 0) {
        const next = chatQueueRef.current.shift();
        setTimeout(() => next.type === 'action' ? sendAction(next.msg) : sendMessage(next.msg), 50);
      }
    }
  }, [botId]);

  const handleChatSend = useCallback(() => {
    const msg = chatInput.trim();
    if (!msg) return;
    setChatInput('');
    sendMessage(msg);
  }, [chatInput, sendMessage]);

  const handleAction = useCallback((actionId, value) => {
    sendAction(`__action__${actionId}:${value}`);
  }, [sendAction]);

  const handleFormSubmit = useCallback(async (formId, values, file) => {
    if (file) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('bot_id', botId);
      try {
        const res = await fetch(API_BASE + '/public/upload/photo', { method: 'POST', body: formData });
        if (res.ok) {
          const data = await res.json();
          sendAction(`__form__${formId}:${JSON.stringify({ ...values, file_id: data.file_id })}`);
          return;
        }
      } catch {}
    }
    sendAction(`__form__${formId}:${JSON.stringify(values)}`);
  }, [sendAction, botId]);

  const handleFileUpload = useCallback(async (uploadId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('bot_id', botId);
    try {
      const res = await fetch(API_BASE + '/public/upload/photo', { method: 'POST', body: formData });
      if (res.ok) {
        const data = await res.json();
        sendAction(`__file__${uploadId}:${data.file_id}`);
      }
    } catch {}
  }, [botId]);

  function stripComponents(t) { return t.replace(/<!--C[\s\S]*?<!--C-->/g, '').trim(); }

  const copyMsg = useCallback((i) => {
    let txt = chatMessagesRef.current[i]?.content;
    if (txt) {
      txt = stripComponents(txt);
      if (txt) {
        navigator.clipboard.writeText(txt).then(() => {
          setCopiedIndex(i);
          setTimeout(() => setCopiedIndex(null), 1500);
        }).catch(() => {});
      }
    }
  }, []);

  const handleContextMenu = useCallback((e, i) => { e.preventDefault(); e.stopPropagation(); copyMsg(i); }, [copyMsg]);

  const chatBubbles = useMemo(() =>
    chatMessages.map((msg, i) => (
      <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
        <div className={`relative max-w-[80%] rounded-2xl px-4 py-2.5 group ${
          msg.role === 'user' ? 'bg-indigo-600 text-white rounded-br-md' : 'bg-gray-100 text-gray-800 rounded-bl-md'
        }`}
          onClick={() => copyMsg(i)} onContextMenu={(e) => handleContextMenu(e, i)}
          onTouchStart={() => { copyTimerRef.current = setTimeout(() => copyMsg(i), 500); }}
          onTouchEnd={() => { if (copyTimerRef.current) clearTimeout(copyTimerRef.current); }}
          onTouchMove={() => { if (copyTimerRef.current) clearTimeout(copyTimerRef.current); }}>
          {copiedIndex === i && (
            <span className="absolute -top-2 right-2 text-[9px] font-bold bg-gray-800 text-white px-1.5 py-0.5 rounded-full z-10">Copied!</span>
          )}
          {msg.file_type === 'photo' && msg.file_id ? (
            <img src={`${API_BASE}/telegram/file/${encodeURIComponent(msg.file_id)}?bot_id=${botId}`}
              alt="" className="max-w-full rounded-lg" />
          ) : msg.role === 'assistant' ? (
            <RichMessage content={msg.content} isAssistant={true} botId={botId}
              onAction={handleAction} onFormSubmit={handleFormSubmit} onFileUpload={handleFileUpload} />
          ) : msg.content ? (
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
          ) : null}
          <span className={`absolute bottom-1 right-2 text-[8px] opacity-0 group-hover:opacity-40 transition-opacity select-none ${msg.role === 'user' ? 'text-white/50' : 'text-gray-400'}`}>copy</span>
        </div>
      </div>
    )),
    [chatMessages, handleAction, handleFormSubmit, handleFileUpload, handleContextMenu, copyMsg, copiedIndex, botId]
  );

  const customerName = dashboardData?.customer?.name || 'QR Customer';
  const stats = dashboardData?.stats;
  const orders = dashboardData?.orders || [];

  const handleGetToken = async () => {
    if (!slug || !getToken()) return;
    try {
      const res = await fetch(`${API_BASE}/public/qr-menu/${encodeURIComponent(slug)}/assign-token`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        addToast(`Token #${data.token_number} assigned!`);
        setRefreshKey(k => k + 1);
      } else {
        addToast('Failed to assign token', 'error');
      }
    } catch (e) {
      addToast('Failed to assign token', 'error');
    }
  };

  const handleSignOut = async () => {
    try {
      const token = sessionStorage.getItem('qr_customer_token');
      const isTelegram = !!token;
      if (isTelegram === false) {
        await signOut(auth);
      }
      sessionStorage.removeItem('qr_customer_token');
      sessionStorage.removeItem('qr_customer_id');
      sessionStorage.removeItem('qr_shop_slug');
      parentSignOut?.();
    } catch (err) {
      console.error('Sign out failed:', err);
    }
  };

  if (dashboardLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-400 font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-gradient-to-r from-indigo-600 to-purple-600 shadow-md">
        <div className="flex items-center justify-between px-4 md:px-8 xl:px-16 h-12">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-white/20 backdrop-blur flex items-center justify-center shrink-0">
              <Ticket className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-white text-sm font-bold truncate">Hello, {customerName}!</h1>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => { setRefreshKey(k => k + 1); setRefreshing(true); }}
              className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-all">
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={() => setChatOpen(true)}
              className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-all mr-1">
              <MessageCircle className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Tab Content */}
      <main className="flex-1 overflow-y-auto pb-16">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
          >
            {activeTab === 'overview' && (
              <OverviewTab
                slug={slug}
                shop={shop}
                stats={stats}
                orders={orders}
                onNavigate={setActiveTab}
                onGetToken={handleGetToken}
                shopName={shopName}
              />
            )}
            {activeTab === 'orders' && <OrdersTab slug={slug} orders={orders} loading={dashboardLoading} />}
            {activeTab === 'profile' && <ProfileTab slug={slug} shop={shop} customer={dashboardData?.customer} onSignOut={handleSignOut} />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom Tab Nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-200 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
        <div className="max-w-[1600px] mx-auto flex px-4 md:px-8 xl:px-16">
          {[
            { id: 'overview', label: 'Home', icon: Home },
            { id: 'orders', label: 'Orders', icon: Package },
            { id: 'profile', label: 'Profile', icon: User },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex flex-col items-center justify-center py-2 transition-all relative ${
                  isActive ? 'text-indigo-600' : 'text-gray-400'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="qrTabIndicator"
                    className="absolute -top-0.5 left-1/4 right-1/4 h-0.5 bg-indigo-600 rounded-full"
                  />
                )}
                <Icon className="w-5 h-5 mb-0.5" strokeWidth={isActive ? 2.5 : 1.8} />
                <span className={`text-[10px] font-bold ${isActive ? 'text-indigo-600' : 'text-gray-400'}`}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Chat Panel */}
      {chatOpen && botId && (
        <div className="fixed inset-0 z-50 flex flex-col bg-white">
          <div className="flex items-center justify-between px-4 h-12 bg-gradient-to-r from-indigo-600 to-purple-600 shrink-0">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-white" />
              <span className="text-white text-sm font-bold">Shop Assistant</span>
            </div>
            <button onClick={() => setChatOpen(false)}
              className="p-1.5 text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition-all">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div ref={chatRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {chatBubbles}
            {chatLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="shrink-0 border-t border-gray-200 px-4 py-3 bg-white">
            <div className="flex items-center gap-2">
              <input
                ref={chatInputRef}
                type="text"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChatSend(); } }}
                placeholder="Type a message..."
                className="flex-1 px-4 py-2.5 bg-gray-100 border border-gray-200 rounded-xl outline-none text-sm focus:ring-2 focus:ring-indigo-500"
              />
              <button onClick={handleChatSend} disabled={!chatInput.trim()}
                className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center hover:bg-indigo-700 transition-all disabled:opacity-50 shrink-0">
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── OVERVIEW TAB ─── */
function OverviewTab({ slug, shop, stats, orders, onNavigate, onGetToken, shopName }) {
  const statItems = [
    { label: 'Total Orders', value: stats?.total_orders, icon: Package, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Pending', value: stats?.pending, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Completed', value: stats?.completed, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Spent', value: stats?.total_spent ? formatPrice(stats.total_spent) : '0', icon: ShoppingCart, color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  return (
    <div className="px-4 md:px-8 xl:px-16 py-6 max-w-[1600px] mx-auto">
      {/* Get Token Button */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <button
          onClick={onGetToken}
          className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-2xl font-bold text-lg shadow-lg shadow-amber-200 hover:shadow-xl hover:from-amber-600 hover:to-orange-600 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
        >
          <Ticket className="w-6 h-6" />
          Get a Token
        </button>
      </motion.div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {statItems.map((s, i) => {
          const Icon = s.icon;
          return (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`${s.bg} rounded-2xl p-4 shadow-sm border border-gray-100/50`}
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon className={`w-4 h-4 ${s.color}`} strokeWidth={2.5} />
                <span className="text-xs font-medium text-gray-500">{s.label}</span>
              </div>
              <p className={`text-2xl font-black ${s.color}`}>{s.value !== undefined && s.value !== null ? s.value : '—'}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Recent Orders */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-gray-900">Recent Orders</h3>
          {orders.length > 0 && (
            <button onClick={() => onNavigate('orders')} className="text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-colors flex items-center gap-1">
              View All <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>
        {orders.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-gray-100">
            <Package className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400 font-medium">No orders yet</p>
            <p className="text-xs text-gray-300 mt-1">Get a token and place your first order</p>
          </div>
        ) : (
          <div className="space-y-2">
            {orders.slice(0, 5).map(order => {
              const status = statusConfig[order.status] || statusConfig.pending;
              const StatusIcon = status.icon;
              return (
                <div key={order.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl ${status.bg} flex items-center justify-center`}>
                      <StatusIcon className={`w-5 h-5 ${status.color}`} strokeWidth={2} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">#{order.order_number || order.id}</p>
                      <p className="text-xs text-gray-400">{order.created_at ? myanmarFormat(order.created_at, 'MMM d, yyyy') : '—'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-gray-900">{order.final_amount ? formatPrice(order.final_amount) : '—'} MMK</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${status.bg} ${status.color}`}>
                      {status.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => onNavigate('orders')}
          className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-left hover:shadow-md transition-all active:scale-[0.98]"
        >
          <Package className="w-6 h-6 text-indigo-600 mb-2" />
          <p className="font-bold text-sm text-gray-900">My Orders</p>
          <p className="text-xs text-gray-400 mt-0.5">View order history</p>
        </button>
        <button
          onClick={() => onNavigate('profile')}
          className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-left hover:shadow-md transition-all active:scale-[0.98]"
        >
          <User className="w-6 h-6 text-amber-600 mb-2" />
          <p className="font-bold text-sm text-gray-900">Profile</p>
          <p className="text-xs text-gray-400 mt-0.5">Manage your details</p>
        </button>
      </div>
    </div>
  );
}

/* ─── ORDERS TAB ─── */
function OrdersTab({ slug, orders, loading }) {
  const [expandedId, setExpandedId] = useState(null);

  if (loading) {
    return (
      <div className="px-4 md:px-8 xl:px-16 py-12 flex justify-center max-w-[1600px] mx-auto">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="px-4 md:px-8 xl:px-16 py-16 text-center max-w-[1600px] mx-auto">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Package className="w-10 h-10 text-gray-300" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-1">No orders yet</h3>
        <p className="text-sm text-gray-400 mb-6">Your QR menu orders will appear here.</p>
      </div>
    );
  }

  return (
    <div className="px-4 md:px-8 xl:px-16 py-6 space-y-3 max-w-[1600px] mx-auto">
      <h2 className="text-lg font-bold text-gray-900 mb-1">My Orders</h2>
      {orders.map(order => {
        const status = statusConfig[order.status] || statusConfig.pending;
        const StatusIcon = status.icon;
        const isExpanded = expandedId === order.id;
        return (
          <motion.div
            key={order.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
          >
            <button
              onClick={() => setExpandedId(isExpanded ? null : order.id)}
              className="w-full p-4 text-left active:bg-gray-50 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono font-bold text-gray-400">#{order.order_number || order.id}</span>
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border ${status.bg} ${status.color}`}>
                  <StatusIcon className="w-3.5 h-3.5" strokeWidth={2.5} />
                  <span className="text-[10px] font-bold">{status.label}</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-gray-900">
                    {order.items?.length || 0} item{(order.items?.length || 0) !== 1 ? 's' : ''}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {order.created_at ? myanmarFormat(order.created_at, 'MMM d, yyyy') : '—'}
                  </p>
                  {order.token_number && (
                    <p className="text-xs font-bold text-amber-600 mt-0.5">Token #{order.token_number}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-black text-gray-900">
                    {order.final_amount ? formatPrice(order.final_amount) : '—'} MMK
                  </span>
                  <ChevronRight className={`w-4 h-4 text-gray-300 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                </div>
              </div>
            </button>
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-t border-gray-50"
                >
                  <div className="p-4 space-y-3 bg-gray-50/50">
                    {order.items?.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        {item.image_url && (
                          <div className="w-12 h-12 rounded-xl bg-gray-100 overflow-hidden shrink-0">
                            <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-gray-900 truncate">{item.name}</p>
                          {item.variant_label && <p className="text-[10px] text-gray-400 truncate">{item.variant_label}</p>}
                          <p className="text-xs text-gray-400">
                            {item.quantity ? `x${item.quantity}` : ''} {item.price ? `${formatPrice(item.price)} MMK` : ''}
                          </p>
                        </div>
                      </div>
                    ))}
                    {order.customer_notes && (
                      <div className="text-xs text-gray-500 bg-white rounded-xl p-3 border border-gray-100">
                        <span className="font-bold text-gray-700">Note:</span> {order.customer_notes}
                      </div>
                    )}
                    {order.channel && (
                      <div className="text-xs text-gray-400">
                        Channel: <span className="font-bold text-gray-600">{order.channel === 'token' ? 'Token Queue' : 'Table'}</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
}

/* ─── PROFILE TAB ─── */
function ProfileTab({ slug, shop, customer, onSignOut }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState('');

  const [displayName, setDisplayName] = useState(customer?.name || '');
  const [phones, setPhones] = useState([customer?.phone || '']);
  const [emails, setEmails] = useState([customer?.email || '']);
  const [telegram, setTelegram] = useState('');
  const [viber, setViber] = useState('');
  const [profileRegion, setProfileRegion] = useState('');
  const [profileDistrict, setProfileDistrict] = useState('');
  const [profileTownship, setProfileTownship] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');

  const addPhone = () => setPhones(prev => [...prev, '']);
  const removePhone = (idx) => { if (phones.length > 1) setPhones(prev => prev.filter((_, i) => i !== idx)); };
  const addEmail = () => setEmails(prev => [...prev, '']);
  const removeEmail = (idx) => { if (emails.length > 1) setEmails(prev => prev.filter((_, i) => i !== idx)); };

  const handleSave = async () => {
    if (!displayName.trim() || !phones[0]?.trim() || !emails[0]?.trim()) return;
    setSaving(true);
    setSaved(false);
    setSaveError('');
    try {
      let botId = shop?.id;
      if (!botId) throw new Error('Shop not found');
      const res = await fetch(`${API_BASE}/api/customer-profile/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          bot_id: botId,
          uid: getCustomerId(),
          display_name: displayName.trim(),
          email: emails.filter(Boolean).map(e => e.trim()).join(', '),
          phone: phones.filter(Boolean).map(p => p.trim()).join(', '),
          telegram_username: telegram.trim(),
          viber_number: viber.trim(),
          address: address.trim(),
          notes: notes.trim(),
          region: profileRegion,
          district: profileDistrict,
          township: profileTownship,
        }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        const errText = await res.text().catch(() => '');
        setSaveError(errText || 'Save failed. Please try again later.');
      }
    } catch (err) {
      setSaveError('Failed to save. Please check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="px-4 md:px-8 xl:px-16 py-6 space-y-5 max-w-[1600px] mx-auto">
      {/* User Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100"
      >
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center">
            <User className="w-8 h-8 text-indigo-400" />
          </div>
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-gray-900 truncate">{displayName || 'User'}</h3>
            {customer?.phone && (
              <div className="flex items-center gap-1.5 mt-0.5">
                <Phone className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-sm text-gray-500 truncate">{customer.phone}</span>
              </div>
            )}
            {customer?.email && (
              <div className="flex items-center gap-1.5 mt-0.5">
                <Mail className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-sm text-gray-500 truncate">{customer.email}</span>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Contact Information */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100"
      >
        <h4 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Phone className="w-4 h-4 text-gray-400" />
          Contact Information
        </h4>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-gray-500 font-medium mb-1.5 block">Full Name *</label>
            <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm" />
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium mb-1.5 block">Phone Numbers *</label>
            <div className="space-y-2">
              {phones.map((phone, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input type="tel" value={phone} onChange={e => {
                    const next = [...phones]; next[idx] = e.target.value; setPhones(next);
                  }} placeholder={idx === 0 ? "09xxxxxxxxx" : "Additional phone"}
                    className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm" />
                  {idx === 0 ? (
                    <button onClick={addPhone} className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-500 hover:bg-indigo-100 transition-all shrink-0">
                      <Plus className="w-4 h-4" />
                    </button>
                  ) : (
                    <button onClick={() => removePhone(idx)} className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center text-rose-400 hover:bg-rose-100 transition-all shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium mb-1.5 block">Email Addresses *</label>
            <div className="space-y-2">
              {emails.map((email, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input type="email" value={email} onChange={e => {
                    const next = [...emails]; next[idx] = e.target.value; setEmails(next);
                  }} placeholder={idx === 0 ? "your@email.com" : "Additional email"}
                    className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm" />
                  {idx === 0 ? (
                    <button onClick={addEmail} className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-500 hover:bg-indigo-100 transition-all shrink-0">
                      <Plus className="w-4 h-4" />
                    </button>
                  ) : (
                    <button onClick={() => removeEmail(idx)} className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center text-rose-400 hover:bg-rose-100 transition-all shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium mb-1.5 block">Telegram Username</label>
            <input type="text" value={telegram} onChange={e => setTelegram(e.target.value)}
              placeholder="@username"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm" />
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium mb-1.5 block">Viber Number</label>
            <input type="tel" value={viber} onChange={e => setViber(e.target.value)}
              placeholder="09xxxxxxxxx"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm" />
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium mb-1.5 block">Region (တိုင်း/ပြည်နယ်)</label>
            <SearchableSelect
              value={profileRegion}
              onChange={v => { setProfileRegion(v); setProfileDistrict(''); setProfileTownship(''); }}
              options={REGION_NAMES}
              placeholder="Select Region"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium mb-1.5 block">District (ခရိုင်)</label>
            <SearchableSelect
              value={profileDistrict}
              onChange={v => { setProfileDistrict(v); setProfileTownship(''); }}
              options={getDistricts(profileRegion)}
              placeholder="Select District"
              disabled={!profileRegion}
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium mb-1.5 block">Township (မြို့နယ်)</label>
            <SearchableSelect
              value={profileTownship}
              onChange={setProfileTownship}
              options={getTownships(profileRegion, profileDistrict)}
              placeholder="Select Township"
              disabled={!profileDistrict}
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium mb-1.5 block">Full Address</label>
            <textarea value={address} onChange={e => setAddress(e.target.value)} rows={3}
              placeholder="Street, city, postal code..."
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm resize-none" />
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium mb-1.5 block">Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              placeholder="Any additional information..."
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm resize-none" />
          </div>
          {saveError && (
            <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-2xl">
              <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <p className="text-xs font-medium text-rose-700">{saveError}</p>
            </div>
          )}
          <button
            onClick={handleSave}
            disabled={saving || !displayName.trim() || !phones[0]?.trim() || !emails[0]?.trim()}
            className={`w-full py-3 rounded-2xl font-bold text-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2 ${
              saved ? 'bg-emerald-500 text-white' : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white'
            } disabled:opacity-50`}
          >
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : saved ? <><CheckCircle2 className="w-4 h-4" /> Saved!</> : 'Save Profile'}
          </button>
        </div>
      </motion.div>

      <button
        onClick={onSignOut}
        className="w-full py-3 bg-rose-50 border border-rose-200 text-rose-600 font-bold rounded-2xl text-sm hover:bg-rose-100 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
      >
        <LogOut className="w-4 h-4" />
        Sign Out
      </button>

      <p className="text-[10px] text-gray-400 text-center pb-4">
        Powered by Telegram E-Commerce Platform
      </p>
    </div>
  );
}
