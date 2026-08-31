import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { useRequireAuth } from '../hooks/useRequireAuth';
import { useTelegramAuth } from '../context/TelegramAuthContext';
import { useAuthTokenFromUrl } from '../hooks/useAuthTokenFromUrl';
import { useCartState } from '../context/CartContext';
import { myanmarFormat } from '../utils/date';
import { RichMessage } from '../components/chat/RichMessage';
import { getPublicTopProducts } from '../api/public';
import { getContentBlocks } from '../api/contentBlocks';
import SearchableSelect from '../components/shared/SearchableSelect';
import { REGION_NAMES, getDistricts, getTownships } from '../data/townships';
import { PaymentSelect, ContactInfoStep, CheckoutModal } from './PublicEcommerce';
import InstantMmpayQrModal from '../components/InstantMmpayQrModal';
import { formatPrice } from '../utils/formatPrice';
import ErrorBoundary from '../components/shared/ErrorBoundary';

function authHeaders() {
  const token = localStorage.getItem('telegram_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const FETCH_TIMEOUT_MS = 15000;

function fetchWithTimeout(url, options, timeoutMs = FETCH_TIMEOUT_MS) {
  return Promise.race([
    fetch(url, options),
    new Promise((_, reject) => setTimeout(() => reject(new Error('Request timed out')), timeoutMs)),
  ]);
}

function decodeJwtPayload(token) {
  try {
    const payload = token.split('.')[1];
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function getUserIdFromToken() {
  const token = localStorage.getItem('telegram_token');
  if (!token) return null;
  const payload = decodeJwtPayload(token);
  if (!payload) return null;
  return payload.sub || payload.user_id || payload.id || null;
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
import { motion, AnimatePresence } from 'motion/react';
import {
  ShoppingBag, Package, Clock, CheckCircle2, XCircle, ChevronRight,
  MapPin, Phone, Mail, User, Plus, Trash2, LogOut, Loader2,
  ShoppingCart, Home, Truck, Copy, Minus, Receipt as ReceiptIcon,
  CheckCircle, X, Upload, MessageCircle, Newspaper, Send, RefreshCw,
  TrendingUp, Star, Award, AlertTriangle, ChevronUp, Store, ArrowLeft
} from 'lucide-react';
import Receipt from '../components/orders/Receipt';
import CustomerShopTab from '../components/CustomerShopTab';
import NewsfeedFeed from '../components/NewsfeedFeed';
import { useToastStore } from '../store/toastStore';

import { API_BASE } from '../api/config';

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

const statusConfig = {
  pending: { label: 'Pending', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200', dot: 'bg-amber-400' },
  pending_review: { label: 'Pending', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200', dot: 'bg-amber-400' },
  confirmed: { label: 'Confirmed', icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200', dot: 'bg-emerald-400' },
  processing: { label: 'Processing', icon: Package, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200', dot: 'bg-blue-400' },
  shipped: { label: 'Shipped', icon: Truck, color: 'text-indigo-600', bg: 'bg-indigo-50 border-indigo-200', dot: 'bg-indigo-400' },
  delivered: { label: 'Delivered', icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200', dot: 'bg-emerald-400' },
  cancelled: { label: 'Cancelled', icon: XCircle, color: 'text-red-600', bg: 'bg-red-50 border-red-200', dot: 'bg-red-400' },
};

export default function CustomerDashboard({ shopSlug }) {
  const { user, loading: authLoading } = useAuth();
  const { telegramUser: ctxTelegramUser } = useTelegramAuth();
  const { isAuthenticated } = useRequireAuth(shopSlug);
  const [activeTab, setActiveTab] = useState('overview');
  const [shopData, setShopData] = useState(null);
  const [savedName, setSavedName] = useState('');
  const [orderStats, setOrderStats] = useState(null);
  const [customerOrders, setCustomerOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [customerPoints, setCustomerPoints] = useState(null);
  const [pointsHistory, setPointsHistory] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([{ role: 'assistant', content: 'Hi! How can I help you today?' }]);
  const [chatLoading, setChatLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const lastReadCountRef = useRef(0);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const chatQueueRef = useRef([]);
  const chatSendingRef = useRef(false);
  const chatMessagesRef = useRef(chatMessages);
  useEffect(() => { chatMessagesRef.current = chatMessages; }, [chatMessages]);
  const chatRef = useRef(null);
  const copyTimerRef = useRef(null);
  const chatInputRef = useRef(null);
  const mainRef = useRef(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const telegramToken = typeof window !== 'undefined' ? localStorage.getItem('telegram_token') : null;
  const isTelegramUser = !!telegramToken && !user;
  // Fall back to reading from localStorage directly in case context hasn't
  // initialized from it yet (StrictMode, SSR edge cases, etc.)
  const telegramUser = ctxTelegramUser || (() => {
    try {
      const u = localStorage.getItem('telegram_user');
      return u ? JSON.parse(u) : null;
    } catch { return null; }
  })();
  const googleUser = (() => {
    try {
      const g = localStorage.getItem('google_user');
      return g ? JSON.parse(g) : null;
    } catch { return null; }
  })();
  // Use Firebase UID when available (Google auth), fall back to google_user id or JWT sub (telegram_id)
  const uid = user?.uid
    || (googleUser?.id ? String(googleUser.id) : '')
    || (telegramToken ? (getUserIdFromToken() || '') : '')
    || (telegramUser?.id ? String(telegramUser.id) : '');
  const userEmail = user?.email || googleUser?.email || '';
  const displayName = user?.displayName
    || googleUser?.name
    || (userEmail ? userEmail.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : '')
    || telegramUser?.name
    || telegramUser?.first_name
    || (telegramUser?.username ? `@${telegramUser.username}` : '')
    || 'Customer';
  const photoUrl = user?.photoURL || googleUser?.photo_url || telegramUser?.photo_url || null;

  useAuthTokenFromUrl();

  useEffect(() => {
    fetch(`${API_BASE}/public/shop/${encodeURIComponent(shopSlug)}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        setShopData(data);
        const s = data?.shop;
        if (s?.bot_full_name) {
          setPageMeta(s.bot_full_name, s.profile_picture);
        }
        // Sync website customer to backend (Google & Telegram logins)
        if (s?.id && uid) {
          fetch(`${API_BASE}/website-customers/sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              bot_id: s.id,
              firebase_uid: uid,
              display_name: displayName !== 'Customer' ? displayName : '',
              email: userEmail || '',
              photo_url: photoUrl || '',
            }),
          }).catch(() => {});
        }
      })
      .catch(() => {});
  }, [shopSlug, uid, displayName, userEmail, photoUrl]);

  // Fetch order stats (cached in parent so OverviewTab doesn't re-fetch on switch)
  useEffect(() => {
    if (!uid || !shopSlug) return;
    fetchWithTimeout(`${API_BASE}/customer/${encodeURIComponent(uid)}/orders/stats?shop=${encodeURIComponent(shopSlug)}`, { headers: authHeaders() })
      .then(r => r.ok ? r.json() : null)
      .then(s => { if (s) setOrderStats(s); setRefreshing(false); })
      .catch(() => { setRefreshing(false); });
  }, [uid, shopSlug, refreshKey]);

  // Fetch customer orders (cached in parent so OrdersTab doesn't re-fetch on switch)
  useEffect(() => {
    if (!uid) { setCustomerOrders([]); setOrdersLoading(false); return; }
    setOrdersLoading(true);
    fetchWithTimeout(`${API_BASE}/customer/${encodeURIComponent(uid)}/orders?shop=${encodeURIComponent(shopSlug)}`, { headers: authHeaders() })
      .then(r => r.ok ? r.json() : [])
      .then(data => { setCustomerOrders(Array.isArray(data) ? data : []); setOrdersLoading(false); setRefreshing(false); })
      .catch(() => { setCustomerOrders([]); setOrdersLoading(false); setRefreshing(false); });
  }, [uid, shopSlug, refreshKey]);

  // Fetch customer points balance
  useEffect(() => {
    if (!uid || !shopSlug || !shopData?.shop?.id) return;
    const ptsSettings = shopData?.ecommerce_points_settings;
    if (!ptsSettings?.enabled) { setCustomerPoints(null); return; }
    fetchWithTimeout(`${API_BASE}/customer/${encodeURIComponent(uid)}/points?shop=${encodeURIComponent(shopSlug)}`, { headers: authHeaders() })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setCustomerPoints(d); })
      .catch(() => {});
  }, [uid, shopSlug, shopData?.shop?.id, shopData?.ecommerce_points_settings?.enabled, refreshKey]);

  // Fetch points history
  useEffect(() => {
    if (!uid || !shopSlug || !shopData?.shop?.id) { setPointsHistory(null); return; }
    const ptsSettings = shopData?.ecommerce_points_settings;
    if (!ptsSettings?.enabled) { setPointsHistory(null); return; }
    fetchWithTimeout(`${API_BASE}/customer/${encodeURIComponent(uid)}/points/history?shop=${encodeURIComponent(shopSlug)}`, { headers: authHeaders() })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setPointsHistory(d); })
      .catch(() => {});
  }, [uid, shopSlug, shopData?.shop?.id, shopData?.ecommerce_points_settings?.enabled, refreshKey]);


  const { data: contentBlocks } = useQuery({
    queryKey: ['content-blocks', shopData?.shop?.id],
    queryFn: () => getContentBlocks({ bot_id: Number(shopData?.shop?.id) }),
    enabled: !!shopData?.shop?.id,
    placeholderData: (prev) => prev,
  });

  const receiptSettingsBlock = contentBlocks?.find(b => b.key === 'receipt_settings');
  const receiptSettings = receiptSettingsBlock?.content_data || {};

  // Claim welcome bonus if not yet claimed
  useEffect(() => {
    if (!uid || !shopData?.shop?.id || !customerPoints) return;
    const ptsSettings = shopData?.ecommerce_points_settings;
    if (!ptsSettings?.enabled || !ptsSettings?.welcome_bonus || customerPoints?.welcome_bonus_claimed) return;
    fetch(`${API_BASE}/customer/claim-welcome-bonus`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid: uid, firebase_uid: uid, bot_id: shopData.shop.id }),
    }).then(r => r.json()).then(result => {
      if (result.success && !result.claimed && result.points > 0) {
        setCustomerPoints(prev => prev ? { ...prev, points_balance: (prev.points_balance || 0) + result.points, welcome_bonus_claimed: true } : prev);
      }
    }).catch(() => {});
  }, [uid, shopData?.shop?.id, customerPoints?.welcome_bonus_claimed]);

  // Chat: register visitor + load existing messages on open
  useEffect(() => {
    if (!chatOpen || !shopData?.shop?.id || !uid) return;
    // Register visitor so the admin panel can see this chat
    fetch(`${API_BASE}/public/visitor/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visitor_id: uid, bot_id: shopData.shop.id, firebase_uid: uid, name: displayName }),
    }).catch(() => {});
    // Load existing messages
    fetch(`${API_BASE}/public/chat/${shopData.shop.id}/${encodeURIComponent(uid)}/messages`)
      .then(r => r.ok ? r.json() : [])
      .then(msgs => {
        if (msgs.length > 0) {
          const formatted = msgs.map(m => ({
            role: m.sender_type === 'user' ? 'user' : 'assistant',
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
  }, [chatOpen, shopData?.shop?.id, uid]);

  // Chat: poll for admin/AI replies every 3s
  useEffect(() => {
    if (!chatOpen || !shopData?.shop?.id || !uid) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/public/chat/${shopData.shop.id}/${encodeURIComponent(uid)}/messages`);
        if (!res.ok) return;
        const msgs = await res.json();
        if (!msgs.length) return;
        const formatted = msgs.map(m => ({
          role: m.sender_type === 'user' ? 'user' : 'assistant',
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
  }, [chatOpen, shopData?.shop?.id, uid]);

  // Chat: poll unread messages count for Support Chat badge (persisted across refreshes)
  useEffect(() => {
    if (!shopData?.shop?.id || !uid) return;
    const readKey = `chat_read_count_${shopData.shop.id}_${uid}`;
    const checkUnread = async () => {
      try {
        const res = await fetch(`${API_BASE}/public/chat/${shopData.shop.id}/${encodeURIComponent(uid)}/messages`);
        if (!res.ok) return;
        const msgs = await res.json();
        if (!Array.isArray(msgs)) return;
        const adminMsgs = msgs.filter(m => m.sender_type === 'admin' || m.sender_type === 'superadmin');
        const savedReadCount = parseInt(localStorage.getItem(readKey) || '0', 10);
        
        if (chatOpen) {
          localStorage.setItem(readKey, String(adminMsgs.length));
          lastReadCountRef.current = adminMsgs.length;
          setUnreadCount(0);
        } else {
          const currentRead = Math.max(lastReadCountRef.current, savedReadCount);
          const unread = Math.max(0, adminMsgs.length - currentRead);
          setUnreadCount(unread);
        }
      } catch {}
    };
    checkUnread();
    const interval = setInterval(checkUnread, 3500);
    return () => clearInterval(interval);
  }, [chatOpen, shopData?.shop?.id, uid]);

  // Chat: auto-scroll to bottom
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const sendMessage = useCallback(async (msg) => {
    if (!msg || !shopData?.shop?.id) return;
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
      const res = await fetch(`${API_BASE}/public/chat/${shopData.shop.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, history, visitor_id: uid, disable_ai: true }),
      });
      const d = await res.json();
      if (d.reply) {
        setChatMessages(prev => [...prev, { role: 'assistant', content: d.reply }]);
      }
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
  }, [shopData?.shop?.id, uid]);

  const sendAction = useCallback(async (actionMsg) => {
    if (!shopData?.shop?.id) return;
    if (chatSendingRef.current) {
      chatQueueRef.current = [...chatQueueRef.current, { type: 'action', msg: actionMsg }];
      return;
    }
    chatSendingRef.current = true;
    setChatLoading(true);
    try {
      const history = chatMessagesRef.current.slice(-100).map(m => ({ role: m.role, content: m.content }));
      const res = await fetch(`${API_BASE}/public/chat/${shopData.shop.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: actionMsg, history, visitor_id: uid, is_faq: true }),
      });
      const d = await res.json();
      if (d.reply) {
        setChatMessages(prev => [...prev, { role: 'assistant', content: d.reply }]);
      }
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
  }, [shopData?.shop?.id, uid]);

  const handleChatSend = useCallback(() => {
    const msg = chatInput.trim();
    if (!msg) return;
    setChatInput('');
    sendMessage(msg);
  }, [chatInput, sendMessage]);

  // Quick Questions State
  const [quickQuestions, setQuickQuestions] = useState([]);
  const [activeChipIndex, setActiveChipIndex] = useState(0);

  useEffect(() => {
    const bId = shopData?.shop?.id;
    if (!bId) return;
    fetch(API_BASE + '/public/quick-questions/' + bId)
      .then(res => res.json())
      .then(data => {
        if (data && data.questions) {
          setQuickQuestions(data.questions);
        }
      })
      .catch(err => console.error('Failed to fetch quick questions:', err));
  }, [shopData?.shop?.id]);

  const visibleQuestions = useMemo(() => {
    if (!quickQuestions || quickQuestions.length === 0) return [];
    if (quickQuestions.length <= 3) return quickQuestions;
    const len = quickQuestions.length;
    const items = [];
    for (let i = 0; i < 3; i++) {
      items.push(quickQuestions[(activeChipIndex + i) % len]);
    }
    return items;
  }, [quickQuestions, activeChipIndex]);

  const handleQuickQuestionClick = useCallback(async (q) => {
    if (chatLoading || !q) return;

    setChatMessages(prev => [...prev, { role: 'user', content: q.question }]);

    if (quickQuestions.length > 3) {
      setActiveChipIndex(prev => (prev + 3) % quickQuestions.length);
    }

    if (q.response_type === 'preset' && q.preset_answer) {
      setChatMessages(prev => [
        ...prev,
        { role: 'assistant', content: q.preset_answer }
      ]);
    } else {
      sendMessage(q.question);
    }
  }, [chatLoading, quickQuestions, sendMessage]);

  const handleAction = useCallback((actionId, value) => {
    sendAction(`__action__${actionId}:${value}`);
  }, [sendAction]);

  const handleFormSubmit = useCallback(async (formId, values, file) => {
    if (file) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('bot_id', shopData?.shop?.id);
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
  }, [sendAction, shopData?.shop?.id]);

  const handleFileUpload = useCallback(async (uploadId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('bot_id', shopData?.shop?.id);
    try {
      const res = await fetch(API_BASE + '/public/upload/photo', { method: 'POST', body: formData });
      if (res.ok) {
        const data = await res.json();
        sendAction(`__file__${uploadId}:${data.file_id}`);
      }
    } catch {}
  }, [sendAction, shopData?.shop?.id]);

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

  const handleContextMenu = useCallback((e, i) => {
    e.preventDefault();
    e.stopPropagation();
    copyMsg(i);
  }, [copyMsg]);

  const chatBubbles = useMemo(() =>
    chatMessages.map((msg, i) => (
      <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
        <div className={`relative max-w-[80%] rounded-2xl px-4 py-2.5 group ${
          msg.role === 'user'
            ? 'bg-indigo-600 text-white rounded-br-md'
            : 'bg-gray-100 text-gray-800 rounded-bl-md'
        }`}
          onClick={() => copyMsg(i)}
          onContextMenu={(e) => handleContextMenu(e, i)}
          onTouchStart={() => { copyTimerRef.current = setTimeout(() => copyMsg(i), 500); }}
          onTouchEnd={() => { if (copyTimerRef.current) clearTimeout(copyTimerRef.current); }}
          onTouchMove={() => { if (copyTimerRef.current) clearTimeout(copyTimerRef.current); }}>
          {copiedIndex === i && (
            <span className="absolute -top-2 right-2 text-[9px] font-bold bg-gray-800 text-white px-1.5 py-0.5 rounded-full z-10">Copied!</span>
          )}
          {msg.file_type === 'photo' && msg.file_id ? (
            <img src={`${API_BASE}/telegram/file/${encodeURIComponent(msg.file_id)}?bot_id=${shopData.shop.id}`}
              alt="" className="max-w-full rounded-lg" />
          ) : msg.role === 'assistant' ? (
            <RichMessage content={msg.content} isAssistant={true} botId={shopData?.shop?.id}
              onAction={handleAction} onFormSubmit={handleFormSubmit}
              onFileUpload={handleFileUpload} />
          ) : msg.content ? (
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
          ) : null}
          <span className={`absolute bottom-1 right-2 text-[8px] opacity-0 group-hover:opacity-40 transition-opacity select-none ${msg.role === 'user' ? 'text-white/50' : 'text-gray-400'}`}>
            copy
          </span>
        </div>
      </div>
    )),
    [chatMessages, handleAction, handleFormSubmit, handleFileUpload, handleContextMenu, shopData?.shop?.id, copyMsg, copiedIndex]
  );

  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-400 font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const shopName = shopData?.shop?.bot_full_name || shopSlug;

  return (
    <ErrorBoundary fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 max-w-sm text-center">
          <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center mx-auto mb-3">
            <AlertTriangle className="w-6 h-6 text-rose-500" />
          </div>
          <p className="text-sm font-bold text-gray-800">Something went wrong</p>
          <p className="text-xs text-gray-500 mt-1 mb-4">Please refresh the page.</p>
          <button onClick={() => window.location.reload()}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl">
            Refresh
          </button>
        </div>
      </div>
    }>
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-gradient-to-r from-indigo-600 to-purple-600 shadow-md">
        <div className="flex items-center justify-between px-4 md:px-8 xl:px-16 h-12">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-white/20 backdrop-blur flex items-center justify-center shrink-0">
              <ShoppingBag className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-white text-sm font-bold truncate">Hello, {savedName || displayName}!</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { setRefreshing(true); setRefreshKey(k => k + 1); }}
              title="Refresh"
              className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-all cursor-pointer">
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={() => {
              setChatOpen(true);
              setUnreadCount(0);
              if (shopData?.shop?.id && uid) {
                const readKey = `chat_read_count_${shopData.shop.id}_${uid}`;
                localStorage.setItem(readKey, '99999');
              }
            }}
              title="Support Chat"
              className="relative px-2.5 py-1 bg-white text-indigo-600 font-bold text-xs rounded-full shadow-md hover:bg-indigo-50 transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer border border-white/40 shrink-0">
              <div className="relative flex items-center justify-center">
                <MessageCircle className="w-3.5 h-3.5 text-indigo-600 fill-indigo-100" />
                {unreadCount > 0 ? (
                  <span className="absolute -top-1 -right-1.5 px-1 py-0.2 bg-rose-500 text-white text-[9px] font-extrabold rounded-full min-w-[15px] text-center leading-tight shadow-xs animate-bounce">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                ) : (
                  <>
                    <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                    <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                  </>
                )}
              </div>
              <span className="hidden sm:inline">Support Chat</span>
              <span className="sm:hidden">Chat</span>
              {unreadCount > 0 && (
                <span className="ml-0.5 px-1.5 py-0.5 bg-rose-500 text-white text-[10px] font-extrabold rounded-full min-w-[18px] text-center leading-none shadow-xs">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
            {photoUrl && (
              <img src={photoUrl} alt="" className="w-7 h-7 rounded-full ring-2 ring-white/40 object-cover"
                onError={(e) => { e.target.style.display = 'none'; }} />
            )}
          </div>
        </div>
      </header>

      {/* Tab Content */}
      <main ref={mainRef} className="flex-1 overflow-y-auto pb-16">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
          >
            {activeTab === 'overview' && <OverviewTab shopSlug={shopSlug} user={user} uid={uid} displayName={displayName} photoUrl={photoUrl} shopName={shopName} onNavigate={setActiveTab} shop={shopData?.shop} orderStats={orderStats} banners={shopData?.banners || []} points={customerPoints} pointsSettings={shopData?.ecommerce_points_settings} mainRef={mainRef} setShowScrollTop={setShowScrollTop} />}
            {activeTab === 'shop' && <CustomerShopTab shopSlug={shopSlug} shop={shopData?.shop} user={user} onNavigate={setActiveTab} />}
            {activeTab === 'newsfeed' && (
              <div className="pb-20">
                <NewsfeedFeed
                  botId={shopData?.shop?.id}
                  botName={shopName}
                  onClose={() => setActiveTab('overview')}
                  viaDomain={false}
                  slug={shopSlug}
                  shop={shopData?.shop}
                  inline
                />
              </div>
            )}
            {activeTab === 'orders' && <OrdersTab shopSlug={shopSlug} uid={uid} shop={shopData?.shop} orders={customerOrders} loading={ordersLoading} receiptSettings={receiptSettings} onNavigate={setActiveTab} />}
            {activeTab === 'cart' && <CartTab shopSlug={shopSlug} shop={shopData?.shop} user={user} telegramUser={telegramUser} isTelegramUser={isTelegramUser} receiptSettings={receiptSettings} onNavigate={setActiveTab} />}
            {activeTab === 'points' && <PointsTab points={customerPoints} pointsHistory={pointsHistory} pointsSettings={shopData?.ecommerce_points_settings} shop={shopData?.shop} />}
            {activeTab === 'profile' && <ProfileTab shopSlug={shopSlug} user={user} googleUser={googleUser} uid={uid} displayName={displayName} photoUrl={photoUrl} email={userEmail} isTelegramUser={isTelegramUser} telegramUser={telegramUser} onProfileSaved={setSavedName} shop={shopData?.shop} />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom Tab Nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-200 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
        <div className="max-w-[1600px] mx-auto flex px-4 md:px-8 xl:px-16">
          {[
            { id: 'overview', label: 'Home', icon: Home },
            { id: 'shop', label: 'Shop', icon: ShoppingBag },
            { id: 'newsfeed', label: 'Newsfeed', icon: Newspaper },
            { id: 'orders', label: 'Orders', icon: Package },
            { id: 'cart', label: 'Cart', icon: ShoppingCart },
            { id: 'points', label: 'Points', icon: Award },
            { id: 'profile', label: 'Profile', icon: User },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex flex-col items-center justify-center py-2 transition-all relative cursor-pointer ${
                  isActive ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="tabIndicator"
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
      {chatOpen && shopData?.shop?.id && (
        <ErrorBoundary fallback={
          <div className="fixed inset-0 z-50 flex flex-col bg-white items-center justify-center p-8">
            <p className="text-sm text-gray-500 text-center">Something went wrong. Please close and reopen the chat.</p>
            <button onClick={() => setChatOpen(false)}
              className="mt-3 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold">
              Close
            </button>
          </div>
        }>
        <div className="fixed inset-0 z-50 flex flex-col bg-white">
          {/* Chat Header */}
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

          {/* Messages */}
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

          {/* Quick Question Chips */}
          {visibleQuestions && visibleQuestions.length > 0 && (
            <div className="px-4 py-2 border-t border-gray-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar bg-gray-50/60 shrink-0">
              {visibleQuestions.map((q) => (
                <button
                  key={q.id}
                  onClick={() => handleQuickQuestionClick(q)}
                  disabled={chatLoading}
                  className="px-3 py-1.5 bg-white hover:bg-gray-100 border border-gray-200 rounded-full text-xs font-semibold text-gray-700 whitespace-nowrap shadow-2xs transition-all active:scale-95 disabled:opacity-50 flex-shrink-0 flex items-center gap-1 cursor-pointer"
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${q.response_type === 'preset' ? 'bg-indigo-500' : 'bg-purple-500'}`} />
                  <span>{q.question}</span>
                </button>
              ))}
            </div>
          )}

          {/* Input */}
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
        </ErrorBoundary>
      )}

      {/* Scroll to top */}
      {showScrollTop && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          onClick={() => mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-28 left-5 z-50 w-11 h-11 rounded-full shadow-lg flex items-center justify-center text-white active:scale-90 transition-all"
          style={{ background: 'linear-gradient(135deg, #6366f1, #7c3aed)' }}
        >
          <ChevronUp className="w-5 h-5" />
        </motion.button>
      )}
    </div>
    </ErrorBoundary>
  );
}

/* ─── OVERVIEW TAB ─── */
function OverviewTab({ shopSlug, user, uid, displayName, photoUrl, shopName, onNavigate, shop, orderStats, banners, points, pointsSettings, mainRef, setShowScrollTop }) {
  const { cartCount } = useCartState(shop?.id, shopSlug, user, 'ecommerce');
  const [shopBio, setShopBio] = useState('');
  const [bannerIndex, setBannerIndex] = useState(0);

  useEffect(() => {
    if (shop?.shop_bio?.text) setShopBio(shop.shop_bio.text);
    else if (shop?.id) {
      fetch(`${API_BASE}/public/shop-bio/${shop.id}`)
        .then(r => r.json())
        .then(d => { if (d?.text) setShopBio(d.text); })
        .catch(() => {});
    }
  }, [shop?.id, shop?.shop_bio?.text]);

  useEffect(() => {
    if (!banners || banners.length < 2) return;
    const timer = setInterval(() => setBannerIndex(prev => (prev + 1) % banners.length), 5000);
    return () => clearInterval(timer);
  }, [banners]);

  // Scroll to top button
  const SCROLL_THRESHOLD = 600;
  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    const handler = () => setShowScrollTop(el.scrollTop > SCROLL_THRESHOLD);
    handler();
    el.addEventListener('scroll', handler, { passive: true });
    return () => el.removeEventListener('scroll', handler);
  }, []);

  const stats = [
    { label: 'Total Orders', value: orderStats?.total, icon: Package, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Pending', value: orderStats?.pending, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Completed', value: orderStats?.delivered, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Cart Items', value: cartCount, icon: ShoppingCart, color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  const { data: topProducts, isLoading: topLoading } = useQuery({
    queryKey: ['public-top-products', shopSlug],
    queryFn: () => getPublicTopProducts(shopSlug, 10),
    enabled: !!shopSlug,
    staleTime: 60000,
  });

  const productImg = (product) => {
    const url = product.image_url;
    if (!url) return '';
    if (url.startsWith('http')) return url;
    try {
      const parsed = JSON.parse(url);
      if (Array.isArray(parsed)) {
        const fileId = parsed.find(m => m.type === 'photo' || m.file_id)?.file_id;
        if (fileId) return `${API_BASE}/telegram/file/${encodeURIComponent(fileId)}?bot_id=${shop?.id}`;
      }
    } catch {}
    return `${API_BASE}/telegram/file/${encodeURIComponent(url)}?bot_id=${shop?.id}`;
  };

  return (
    <div className="px-4 md:px-8 xl:px-16 py-6 max-w-[1600px] mx-auto">
      <div className="lg:grid lg:grid-cols-3 lg:gap-6 space-y-6 lg:space-y-0">
        <div className="lg:col-span-2 space-y-6">
      {/* Banners */}
      {banners?.length > 0 && (() => {
        const banner = banners[bannerIndex];
        const url = banner?.file_id
          ? `${API_BASE}/telegram/file/${encodeURIComponent(banner.file_id)}?bot_id=${shop?.id}`
          : banner?.image_url || '';
        if (!url) return null;
        return (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="overflow-hidden rounded-2xl relative"
          >
            <AnimatePresence mode="wait">
              <motion.img
                key={bannerIndex}
                src={url}
                alt={`Banner ${bannerIndex + 1}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full aspect-[16/9] md:aspect-[3/1] object-cover rounded-xl"
                onError={(e) => { e.target.style.display = 'none'; }} />
            </AnimatePresence>
            {banners.length > 1 && (
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                {banners.map((_, i) => (
                  <button key={i} onClick={() => setBannerIndex(i)}
                    className={`w-1.5 h-1.5 rounded-full transition-all ${i === bannerIndex ? 'bg-white w-3' : 'bg-white/50'}`} />
                ))}
              </div>
            )}
          </motion.div>
        );
      })()}

      {/* Shop Bio */}
      {shopBio && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100"
        >
          <p className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed">{linkifyText(shopBio)}</p>
        </motion.div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map((s, i) => {
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
              <p className={`text-2xl font-black ${s.color}`}>{s.value !== undefined && s.value !== null ? s.value + (s.suffix || '') : '—'}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => onNavigate('orders')}
          className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-left hover:shadow-md transition-all active:scale-[0.98]"
        >
          <Package className="w-6 h-6 text-indigo-600 mb-2" />
          <p className="font-bold text-sm text-gray-900">My Orders</p>
          <p className="text-xs text-gray-400 mt-0.5">View order history</p>
        </button>
        <button
          onClick={() => onNavigate('cart')}
          className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-left hover:shadow-md transition-all active:scale-[0.98]"
        >
          <ShoppingCart className="w-6 h-6 text-purple-600 mb-2" />
          <p className="font-bold text-sm text-gray-900">My Cart</p>
          <p className="text-xs text-gray-400 mt-0.5">Saved items</p>
        </button>
        <button
          onClick={() => onNavigate('profile')}
          className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-left hover:shadow-md transition-all active:scale-[0.98]"
        >
          <User className="w-6 h-6 text-amber-600 mb-2" />
          <p className="font-bold text-sm text-gray-900">Profile</p>
          <p className="text-xs text-gray-400 mt-0.5">Manage your details</p>
        </button>
        <a
          href={`/?p=${encodeURIComponent(shopSlug)}`}
          className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-left hover:shadow-md transition-all active:scale-[0.98] block"
        >
          <ShoppingBag className="w-6 h-6 text-emerald-600 mb-2" />
          <p className="font-bold text-sm text-gray-900">Shop</p>
          <p className="text-xs text-gray-400 mt-0.5">Browse products</p>
        </a>
      </div>
    </div>

    {/* Popular Products */}
    <div className="lg:col-span-1 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
      >
        <div className="flex items-center gap-2 p-4 border-b border-gray-50">
          <TrendingUp className="w-4 h-4 text-rose-500" strokeWidth={2.5} />
          <h3 className="text-sm font-bold text-gray-900">Popular Products</h3>
          {topProducts?.length > 0 && (
            <span className="ml-auto text-[10px] font-bold text-gray-400">Top {topProducts.length}</span>
          )}
        </div>

        {topLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-gray-300" />
          </div>
        ) : !topProducts || topProducts.length === 0 ? (
          <div className="py-8 text-center">
            <Package className="w-8 h-8 text-gray-200 mx-auto mb-2" />
            <p className="text-xs text-gray-400 font-medium">No sales data yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {topProducts.map((product, i) => {
              return (
                <div key={product.id} className="flex items-center gap-3 p-3 hover:bg-gray-50/50 transition-colors">
                  {/* Rank badge */}
                  <div className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${
                    i === 0 ? 'bg-amber-100 text-amber-700' :
                    i === 1 ? 'bg-gray-100 text-gray-500' :
                    i === 2 ? 'bg-orange-100 text-orange-700' :
                    'bg-gray-50 text-gray-400'
                  }`}>
                    {i < 3 ? <Star className="w-3.5 h-3.5" fill="currentColor" /> : i + 1}
                  </div>

                  {/* Product image */}
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center shrink-0 overflow-hidden">
                    <img src={productImg(product)} alt={product.name} className="w-full h-full object-cover"
                      onError={(e) => { e.target.style.display = 'none'; }} />
                  </div>

                  {/* Product info */}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-gray-900 truncate">{product.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {product.original_price > 0 && (
                        <span className="text-[10px] line-through text-red-300 font-medium">{formatPrice(product.original_price, shop?.currency || 'MMK')}</span>
                      )}
                      <span className="text-xs font-black text-indigo-600">{formatPrice(product.price, shop?.currency || 'MMK')}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  </div>
  </div>
  );
}

/* ─── POINTS TAB ─── */
function PointsTab({ points, pointsHistory, pointsSettings, shop }) {
  const currency = shop?.currency || 'MMK';
  if (!pointsSettings?.enabled) {
    return (
      <div className="px-4 md:px-8 xl:px-16 py-16 text-center max-w-[1600px] mx-auto">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Award className="w-10 h-10 text-gray-300" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-1">Points not available</h3>
        <p className="text-sm text-gray-400">This shop has not enabled the points system.</p>
      </div>
    );
  }

  const balance = points?.points_balance ?? pointsHistory?.points_balance ?? 0;
  const totalEarned = points?.total_points_earned ?? pointsHistory?.total_earned ?? 0;
  const totalRedeemed = pointsHistory?.total_redeemed ?? 0;
  const transactions = pointsHistory?.transactions ?? [];
  return (
    <div className="px-4 md:px-8 xl:px-16 py-6 space-y-3 max-w-[1600px] mx-auto">
      {/* Points Balance Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl p-5 text-white text-center shadow-lg"
      >
        <Award className="w-6 h-6 mx-auto mb-1.5 text-yellow-200" />
        <div className="text-3xl font-bold mb-0.5">{balance}</div>
        <div className="text-amber-100 text-xs">Points Balance</div>
        <div className="flex justify-center gap-5 mt-3 text-[10px]">
          <div><span className="font-semibold text-white">+{totalEarned}</span> <span className="text-amber-200">Earned</span></div>
          <div><span className="font-semibold text-white">{totalRedeemed}</span> <span className="text-amber-200">Redeemed</span></div>
        </div>
      </motion.div>

      {/* How Points Work */}
      {pointsSettings && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl px-4 py-3 shadow-sm border border-gray-100"
        >
          <h3 className="font-semibold text-xs text-gray-700 mb-1.5">How Points Work</h3>
          <p className="text-[11px] text-gray-500 leading-relaxed">
            Earn <span className="font-semibold text-amber-600">{pointsSettings.earn_rate || 1} point{(pointsSettings.earn_rate || 1) > 1 ? 's' : ''}</span> for every{' '}
            {formatPrice(pointsSettings.earn_per || 1000, currency)} spent.
            {pointsSettings.redeem_points ? (
              <> Redeem <span className="font-semibold text-amber-600">{pointsSettings.redeem_points} points</span> for{' '}
              {formatPrice(pointsSettings.redeem_value || 1000, currency)} discount.</>
            ) : ''}
          </p>
        </motion.div>
      )}

      {/* Points History */}
      <h3 className="font-semibold text-xs text-gray-700">Points History</h3>
      {transactions.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-6 bg-white rounded-xl shadow-sm border border-gray-100"
        >
          <Award className="w-8 h-8 mx-auto mb-1.5 opacity-50 text-gray-300" />
          <p className="text-xs text-gray-400">No points activity yet</p>
          <p className="text-[10px] mt-0.5 text-gray-300">Place an order to start earning points!</p>
        </motion.div>
      ) : (
        <div className="space-y-1.5">
          {transactions.map((tx, i) => (
            <motion.div
              key={tx.id || i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="bg-white rounded-xl px-3.5 py-3 shadow-sm border border-gray-100 flex items-center gap-2.5"
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${tx.type === 'earn' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                {tx.type === 'earn' ? <Plus className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-gray-800">{tx.description || (tx.type === 'earn' ? 'Points earned' : 'Points redeemed')}</div>
                <div className="text-[10px] text-gray-400">{tx.created_at ? new Date(tx.created_at).toLocaleDateString() : ''}</div>
              </div>
              <div className={`font-semibold text-xs ${tx.type === 'earn' ? 'text-emerald-600' : 'text-amber-600'}`}>
                {tx.type === 'earn' ? '+' : '-'}{tx.points} pts
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── ORDERS TAB ─── */
function OrdersTab({ shopSlug, uid, shop, orders, loading, receiptSettings, onNavigate }) {
  const [expandedId, setExpandedId] = useState(null);
  const [downloadOrder, setDownloadOrder] = useState(null);
  const [downloadType, setDownloadType] = useState('invoice');

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
        <p className="text-sm text-gray-400 mb-6">
          When you place an order, it will appear here.
        </p>
        <button
          onClick={() => onNavigate?.('shop')}
          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-2xl text-sm shadow-lg shadow-indigo-100 hover:shadow-xl transition-all"
        >
          <ShoppingBag className="w-4 h-4" />
          Start Shopping
        </button>
      </div>
    );
  }

  return (
    <>
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
                <span className="text-xs font-mono font-bold text-gray-400">#{order.id}</span>
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border ${status.bg} ${status.color}`}>
                  <StatusIcon className="w-3.5 h-3.5" strokeWidth={2.5} />
                  <span className="text-[10px] font-bold">{status.label}</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-gray-900">
                    {order.items_count || 0} item{(order.items_count || 0) !== 1 ? 's' : ''}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {order.created_at ? myanmarFormat(order.created_at, 'MMM d, yyyy') : '—'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-black text-gray-900">
                    {order.total ? formatPrice(order.total, order.currency || shop?.currency || 'MMK') : '—'}
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
                    {order.shipping_address && (
                      <div className="bg-white rounded-xl p-3 border border-gray-100 space-y-1.5">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Contact Info</p>
                        <p className="text-xs text-gray-700"><span className="font-medium">Name:</span> {order.buyer_snapshot?.full_name || order.buyer_snapshot?.name || '—'}</p>
                        <p className="text-xs text-gray-700"><span className="font-medium">Phone:</span> {order.buyer_snapshot?.phone || '—'}</p>
                        <p className="text-xs text-gray-700"><span className="font-medium">Email:</span> {order.buyer_snapshot?.email || '—'}</p>
                        {order.buyer_snapshot?.telegram_username && <p className="text-xs text-gray-700"><span className="font-medium">Telegram:</span> {order.buyer_snapshot.telegram_username}</p>}
                        {order.buyer_snapshot?.viber_number && <p className="text-xs text-gray-700"><span className="font-medium">Viber:</span> {order.buyer_snapshot.viber_number}</p>}
                        <p className="text-xs text-gray-700"><span className="font-medium">Address:</span> {order.buyer_snapshot?.address || '—'}</p>
                        {order.shipping_address.notes && <p className="text-xs text-gray-700"><span className="font-medium">Notes:</span> {order.shipping_address.notes}</p>}
                      </div>
                    )}
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
                            {item.quantity ? `x${item.quantity}` : ''} {item.price ? formatPrice(item.price, shop?.currency || 'MMK') : ''}
                          </p>
                        </div>
                      </div>
                    ))}
                    {order.notes && (
                      <div className="text-xs text-gray-500 bg-white rounded-xl p-3 border border-gray-100">
                        <span className="font-bold text-gray-700">Note:</span> {order.notes}
                      </div>
                    )}
                    {order.status === 'pending' && order.payment_info && (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                        <p className="text-xs font-bold text-amber-700 mb-1">Payment Info</p>
                        <p className="text-xs text-amber-600">{order.payment_info}</p>
                      </div>
                    )}
                    <div className="flex gap-2 pt-1">
                      {order.status !== 'cancelled' && order.status !== 'rejected' && order.status !== 'payment_failed' && (
                        <button
                          onClick={() => { setDownloadType('invoice'); setDownloadOrder(order); }}
                          className="flex-1 py-2.5 text-xs font-bold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all"
                        >
                          <ReceiptIcon className="w-3.5 h-3.5 inline mr-1" />
                          Download Invoice
                        </button>
                      )}
                      {['confirmed', 'processing', 'shipped', 'delivered'].includes(order.status) && (
                        <button
                          onClick={() => { setDownloadType('receipt'); setDownloadOrder(order); }}
                          className="flex-1 py-2.5 text-xs font-bold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all"
                        >
                          <ReceiptIcon className="w-3.5 h-3.5 inline mr-1" />
                          Download Receipt
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>

    <Receipt
      order={downloadOrder}
      bot={shop}
      open={!!downloadOrder}
      onClose={() => setDownloadOrder(null)}
      receiptType={downloadType}
      receiptSettings={receiptSettings}
    />
    </>
  );
}

/* ─── CART TAB ─── */
function CartTab({ shopSlug, shop, user, telegramUser, isTelegramUser, receiptSettings, onNavigate }) {
  const [shopData, setShopData] = useState(null);
  const [showPaymentSelect, setShowPaymentSelect] = useState(false);
  const [customerPoints, setCustomerPoints] = useState(null);
  const cartUid = user?.uid || getUserIdFromToken() || '';
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [showContactInfo, setShowContactInfo] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [mmpayOrderData, setMmpayOrderData] = useState(null);
  const [isMmpayModalOpen, setIsMmpayModalOpen] = useState(false);
  const [contactForm, setContactForm] = useState({ name: '', phones: [''], emails: [''], telegram: '', viber: '', region: '', district: '', township: '', address: '', notes: '' });
  const [orderPlaced, setOrderPlaced] = useState(null);
  const [oosMap, setOosMap] = useState({});
  const effectiveShop = shopData?.shop || shop;
  const cart = useCartState(effectiveShop?.id, shopSlug, user, 'ecommerce');
  const { items: cartItems, cartCount, totalAmount, loading, removeItem: removeContextItem, updateQty, clearCart, syncPrices } = cart;
  const products = shopData?.products || [];

  useEffect(() => {
    if (products.length > 0) syncPrices(products);
  }, [products, syncPrices]);

  useEffect(() => {
    if (!cartUid || !shopSlug || !shopData?.shop?.id) return;
    const pts = shopData?.ecommerce_points_settings;
    if (!pts?.enabled) { setCustomerPoints(null); return; }
    fetchWithTimeout(`${API_BASE}/customer/${encodeURIComponent(cartUid)}/points?shop=${encodeURIComponent(shopSlug)}`, { headers: authHeaders() })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setCustomerPoints(d); })
      .catch(() => {});
  }, [cartUid, shopSlug, shopData?.shop?.id, shopData?.ecommerce_points_settings?.enabled]);

  const removeItem = (productId) => {
    removeContextItem(productId);
  };

  const fetchShopDataIfNeeded = async () => {
    if (shopData) return shopData;
    try {
      const res = await fetch(`${API_BASE}/public/shop/${encodeURIComponent(shopSlug)}`);
      const data = await res.json();
      if (data) setShopData(data);
      return data || null;
    } catch { return null; }
  };

  const handleCheckoutAll = async () => {
    const data = await fetchShopDataIfNeeded();
    const methods = data?.payment_methods || shopData?.payment_methods || [];
    const codEnabled = !!(data?.cod_enabled);
    if (methods.length > 0 || codEnabled) {
      setShowPaymentSelect(true);
    } else {
      setShowContactInfo(true);
    }
  };

  const handlePaymentNext = (paymentId) => {
    if (!paymentId) return;
    if (paymentId === 'cod') {
      setSelectedPayment({ id: 'cod', name: 'Cash on Delivery' });
    } else {
      const pm = (shopData?.payment_methods || []).find(p => p.id === paymentId);
      if (pm) {
        // Normalize QR code URL like PublicEcommerce does
        const botId = shopData?.shop?.id;
        const normalizedPm = { ...pm };
        if (normalizedPm.qr_code_url && !normalizedPm.qr_code_url.startsWith('http') && botId) {
          normalizedPm.qr_code_url = `${API_BASE}/telegram/file/${encodeURIComponent(normalizedPm.qr_code_url)}?bot_id=${botId}`;
        }
        setSelectedPayment(normalizedPm);
      } else {
        setSelectedPayment(null);
      }
    }
    setShowPaymentSelect(false);
    setShowContactInfo(true);
  };

  const handleContactNext = () => {
    setShowContactInfo(false);
    setCheckoutOpen(true);
  };

  const handleContactBack = () => {
    setShowContactInfo(false);
    setShowPaymentSelect(true);
  };

  const handleOrderPlacedCallback = (orderData) => {
    setCheckoutOpen(false);
    setOrderPlaced(orderData);
    clearCart();
    setSelectedPayment(null);
  };

  // Check stock when cart items change (must be before conditional returns for hooks order)
  useEffect(() => {
    if (!effectiveShop?.id || cartItems.length === 0) { setOosMap({}); return; }
    fetch(API_BASE + '/public/check-stock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bot_id: effectiveShop.id, items: cartItems.map(i => ({ product_id: i.product_id, quantity: i.quantity })) }),
    })
      .then(r => r.ok ? r.json() : { items: [] })
      .then(data => {
        const map = {};
        (data.items || []).forEach(i => { if (!i.in_stock) map[i.product_id] = true; });
        setOosMap(map);
      })
      .catch(() => {});
  }, [effectiveShop?.id, cartItems]);

  if (loading) {
    return (
      <div className="px-4 md:px-8 xl:px-16 py-12 flex justify-center max-w-[1600px] mx-auto">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (orderPlaced) {
    return (
      <OrderConfirmationInline
        orderData={orderPlaced}
        shop={shopData?.shop || null}
        onContinueShopping={() => setOrderPlaced(null)}
        shopSlug={shopSlug}
        receiptSettings={receiptSettings}
      />
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="px-4 md:px-8 xl:px-16 py-16 text-center max-w-[1600px] mx-auto">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <ShoppingCart className="w-10 h-10 text-gray-300" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-1">Your cart is empty</h3>
        <p className="text-sm text-gray-400 mb-6">
          Items you add from the shop will appear here.
        </p>
        <button
          onClick={() => onNavigate?.('shop')}
          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-2xl text-sm shadow-lg shadow-indigo-100 hover:shadow-xl transition-all active:scale-95"
        >
          <ShoppingBag className="w-4 h-4" />
          Browse Products
        </button>
      </div>
    );
  }

  // totalAmount from cart context

  const deliverySettings = shopData?.delivery_settings || {};
  const deliveryFees = shopData?.delivery_fees || [];
  const checkoutFields = shopData?.checkout_fields || null;
  const codEnabled = !!(shopData?.cod_enabled);
  const contactShowZoneFields = deliverySettings?.delivery_fee_mode === 'zone' && cartItems.some(item => {
    const pid = Number(item.product_id);
    return products.some(p => Number(p.id) === pid && p.apply_delivery_fee === true);
  });

  return (
    <>
      <div className="px-4 md:px-8 xl:px-16 py-6 space-y-3 max-w-[1600px] mx-auto">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg font-bold text-gray-900">My Cart</h2>
          <span className="text-xs font-medium text-gray-400">{cartItems.length} item{cartItems.length !== 1 ? 's' : ''}</span>
        </div>
        {cartItems.map((item) => {
          const isOOS = oosMap[item.product_id];
          return (
          <motion.div
            key={item.product_id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-3 ${isOOS ? 'opacity-50' : ''}`}
          >
            {item.image_url ? (
              <div className="w-16 h-16 rounded-xl bg-gray-100 overflow-hidden shrink-0">
                <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center shrink-0">
                <Package className="w-6 h-6 text-indigo-300" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-gray-900 truncate">{item.name}</p>
              <p className="text-sm font-black text-indigo-600 mt-0.5">
                {formatPrice(item.price, effectiveShop?.currency || 'MMK')}
              </p>
              {isOOS && (
                <p className="text-[10px] font-bold text-rose-500 mt-0.5">Out of stock</p>
              )}
              {!isOOS && (
                <div className="flex items-center gap-2 mt-1.5">
                  <button onClick={() => updateQty(item.product_id, -1)}
                    className="w-7 h-7 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center hover:bg-gray-200 active:scale-90 transition-all">
                    <Minus className="w-3.5 h-3.5 text-gray-600" />
                  </button>
                  <span className="text-sm font-bold text-gray-900 min-w-[20px] text-center">{item.quantity}</span>
                  <button onClick={() => updateQty(item.product_id, 1)}
                    className="w-7 h-7 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center hover:bg-gray-200 active:scale-90 transition-all">
                    <Plus className="w-3.5 h-3.5 text-gray-600" />
                  </button>
                </div>
              )}
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <button onClick={() => removeItem(item.product_id)}
                className="w-8 h-8 bg-rose-50 rounded-xl flex items-center justify-center text-rose-400 hover:bg-rose-100 active:bg-rose-200 transition-all shrink-0" title="Remove">
                <Trash2 className="w-4 h-4" strokeWidth={2} />
              </button>
            </div>
          </motion.div>
          );
        })}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mt-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-bold text-gray-700">Total</span>
            <span className="text-xl font-black text-gray-900">{formatPrice(totalAmount, effectiveShop?.currency || 'MMK')}</span>
          </div>
          <button onClick={handleCheckoutAll}
            disabled={Object.keys(oosMap).length > 0}
            className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-2xl text-sm shadow-lg shadow-indigo-100 hover:shadow-xl transition-all active:scale-[0.98] disabled:opacity-50">
            {Object.keys(oosMap).length > 0 ? 'Remove out of stock items first' : 'Checkout All'}
          </button>
        </div>
      </div>

      {/* Payment Select Modal */}
      <AnimatePresence>
        {showPaymentSelect && (
          <PaymentSelect
            paymentMethods={shopData?.payment_methods || []}
            onBack={() => setShowPaymentSelect(false)}
            onNext={handlePaymentNext}
            codEnabled={codEnabled}
            hasInstantMmpay={shopData?.has_instant_mmpay}
          />
        )}
      </AnimatePresence>

      {/* Contact Information Modal */}
      <AnimatePresence>
        {showContactInfo && (
          <ContactInfoStep
            form={contactForm}
            setForm={setContactForm}
            onBack={handleContactBack}
            onNext={handleContactNext}
            user={user}
            viewMode="ecommerce"
            shop={effectiveShop}
            shopSlug={shopSlug}
            showZoneFields={contactShowZoneFields}
            checkoutFields={checkoutFields}
          />
        )}
      </AnimatePresence>

      {/* Checkout Modal */}
      <AnimatePresence>
        {checkoutOpen && (
          <CheckoutModal
            shop={effectiveShop}
            cartItems={cartItems}
            totalAmount={totalAmount}
            user={user}
            telegramUser={telegramUser}
            viewMode="ecommerce"
            shopSlug={shopSlug}
            selectedPayment={selectedPayment}
            products={products}
            deliverySettings={deliverySettings}
            deliveryFees={deliveryFees}
            contactForm={contactForm}
            checkoutFields={checkoutFields}
            pointsSettings={shopData?.ecommerce_points_settings}
            customerPoints={customerPoints?.points_balance}
            customerUid={cartUid}
            onClose={() => { setCheckoutOpen(false); setSelectedPayment(null); }}
            onOrderPlaced={handleOrderPlacedCallback}
            onInstantMmpay={(mmpayData) => {
              setCheckoutOpen(false);
              setMmpayOrderData(mmpayData);
              setIsMmpayModalOpen(true);
            }}
          />
        )}
      </AnimatePresence>

      {/* Instant MMQR Payment Modal */}
      <InstantMmpayQrModal
        isOpen={isMmpayModalOpen}
        onClose={() => setIsMmpayModalOpen(false)}
        qrCodeUrl={mmpayOrderData?.qr_code_url}
        qrPayload={mmpayOrderData?.qr_payload}
        deepLink={mmpayOrderData?.deep_link}
        orderId={mmpayOrderData?.order_id || mmpayOrderData?.order_number}
        totalAmount={mmpayOrderData?.total_amount || totalAmount}
        currency={effectiveShop?.currency || 'MMK'}
        onSuccess={(confirmedOrder) => {
          setIsMmpayModalOpen(false);
          handleOrderPlacedCallback(confirmedOrder);
        }}
      />
    </>
  );
}

/* ─── PROFILE TAB ─── */
function ProfileTab({ shopSlug, user, googleUser, uid, displayName: defaultName, photoUrl, email, isTelegramUser, telegramUser, onProfileSaved, shop: profileShopProp }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState(photoUrl);
  const photoInputRef = useRef(null);

  const fallbackEmail = user?.email || email || googleUser?.email || '';
  const fallbackName = (defaultName && defaultName !== 'Customer') ? defaultName : (fallbackEmail.includes('@') ? fallbackEmail.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : '');

  const [displayName, setDisplayName] = useState(fallbackName);
  const [phones, setPhones] = useState(['']);
  const [emails, setEmails] = useState(fallbackEmail ? [fallbackEmail] : ['']);
  const [telegram, setTelegram] = useState('');
  const [viber, setViber] = useState('');
  const [profileRegion, setProfileRegion] = useState('');
  const [profileDistrict, setProfileDistrict] = useState('');
  const [profileTownship, setProfileTownship] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');

  // Resolve bot_id from shopSlug once and cache it
  const botIdRef = useRef(null);
  const [resolving, setResolving] = useState(false);

  const handlePhotoUpload = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file || !uid) return;
    let botId = botIdRef.current || profileShopProp?.id;
    if (!botId && shopSlug) {
      try {
        const shopRes = await fetch(`${API_BASE}/public/shop/${encodeURIComponent(shopSlug)}`);
        const shopData = await shopRes.json();
        botId = shopData?.shop?.id;
        if (botId) botIdRef.current = botId;
      } catch {}
    }
    if (!botId) return;

    setUploadingPhoto(true);
    try {
      // Compress to 512x512 on canvas
      const img = await new Promise((resolve, reject) => {
        const i = new Image();
        i.onload = () => resolve(i);
        i.onerror = reject;
        i.src = URL.createObjectURL(file);
      });
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, 512, 512);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      URL.revokeObjectURL(img.src);

      const res = await fetch(`${API_BASE}/api/customer-profile/update-photo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bot_id: botId,
          uid,
          photo_url: dataUrl,
        }),
      });
      if (!res.ok) throw new Error('Upload failed');
      const result = await res.json();
      setProfilePhotoUrl(result.photo_url);
    } catch {
      setSaveError('Failed to upload photo');
    } finally {
      setUploadingPhoto(false);
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  }, [uid, shopSlug, profileShopProp?.id]);

  useEffect(() => {
    if (!uid || !shopSlug) {
      setLoading(false);
      return;
    }
    setResolving(true);
    // Use parent-cached shop data if available to avoid API call
    const existingBotId = profileShopProp?.id;
    const fetchEmail = fallbackEmail;
    if (existingBotId) {
      botIdRef.current = existingBotId;
      fetch(`${API_BASE}/api/customer-profile?bot_id=${existingBotId}&uid=${encodeURIComponent(uid)}&email=${encodeURIComponent(fetchEmail)}`)
        .then(r => r.ok ? r.json() : {})
        .then(data => {
          if (data && typeof data === 'object' && Object.keys(data).length > 0) {
            setDisplayName(data.display_name && data.display_name.trim() && data.display_name.trim() !== 'User' && data.display_name.trim() !== 'Customer' ? data.display_name.trim() : (fallbackName || ''));
            const pList = data.phone ? data.phone.split(',').map(s => s.trim()).filter(Boolean) : [];
            setPhones(pList.length ? pList : ['']);
            const eList = data.email ? data.email.split(',').map(s => s.trim()).filter(Boolean) : [];
            setEmails(eList.length ? eList : (fetchEmail ? [fetchEmail] : ['']));
            setTelegram(data.telegram_username || '');
            setViber(data.viber_number || '');
            setProfileRegion(data.region || '');
            setProfileDistrict(data.district || '');
            setProfileTownship(data.township || '');
            setAddress(data.address || '');
            setNotes(data.notes || '');
            if (data.photo_url) setProfilePhotoUrl(data.photo_url);
          } else {
            setDisplayName(fallbackName || '');
            setEmails(fetchEmail ? [fetchEmail] : ['']);
          }
          setLoading(false);
          setResolving(false);
        })
        .catch(() => { setLoading(false); setResolving(false); });
    } else {
      // Fallback: fetch shop first
      fetch(`${API_BASE}/public/shop/${encodeURIComponent(shopSlug)}`)
        .then(r => r.ok ? r.json() : null)
        .then(shopData => {
          const botId = shopData?.shop?.id;
          if (!botId) { setLoading(false); setResolving(false); return; }
          botIdRef.current = botId;
          return fetch(`${API_BASE}/api/customer-profile?bot_id=${botId}&uid=${encodeURIComponent(uid)}&email=${encodeURIComponent(fetchEmail)}`);
        })
        .then(r => r && r.ok ? r.json() : {})
        .then(data => {
          if (data && typeof data === 'object' && Object.keys(data).length > 0) {
            setDisplayName(data.display_name && data.display_name.trim() && data.display_name.trim() !== 'User' && data.display_name.trim() !== 'Customer' ? data.display_name.trim() : (fallbackName || ''));
            const pList = data.phone ? data.phone.split(',').map(s => s.trim()).filter(Boolean) : [];
            setPhones(pList.length ? pList : ['']);
            const eList = data.email ? data.email.split(',').map(s => s.trim()).filter(Boolean) : [];
            setEmails(eList.length ? eList : (fetchEmail ? [fetchEmail] : ['']));
            setTelegram(data.telegram_username || '');
            setViber(data.viber_number || '');
            setProfileRegion(data.region || '');
            setProfileDistrict(data.district || '');
            setProfileTownship(data.township || '');
            setAddress(data.address || '');
            setNotes(data.notes || '');
            if (data.photo_url) setProfilePhotoUrl(data.photo_url);
          } else {
            setDisplayName(fallbackName || '');
            setEmails(fetchEmail ? [fetchEmail] : ['']);
          }
          setLoading(false);
          setResolving(false);
        })
        .catch(() => { setLoading(false); setResolving(false); });
    }
  }, [uid, shopSlug, fallbackName, fallbackEmail, profileShopProp?.id]);

  const addPhone = () => setPhones(prev => [...prev, '']);
  const removePhone = (idx) => { if (phones.length > 1) setPhones(prev => prev.filter((_, i) => i !== idx)); };

  const addEmail = () => setEmails(prev => [...prev, '']);
  const removeEmail = (idx) => { if (emails.length > 1) setEmails(prev => prev.filter((_, i) => i !== idx)); };

  const handleSave = async () => {
    if (!displayName.trim()) {
      setSaveError('Full Name is required');
      return;
    }
    setSaving(true);
    setSaved(false);
    setSaveError('');
    try {
      let botId = botIdRef.current || profileShopProp?.id;
      if (!botId) {
        const shopRes = await fetch(`${API_BASE}/public/shop/${encodeURIComponent(shopSlug)}`);
        const shopData = await shopRes.json();
        botId = shopData?.shop?.id;
        if (!botId) throw new Error('Shop not found');
        botIdRef.current = botId;
      }
      const res = await fetch(`${API_BASE}/api/customer-profile/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bot_id: botId,
          uid: uid,
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
          photo_url: profilePhotoUrl || '',
        }),
      });
      if (res.ok) {
        setSaved(true);
        onProfileSaved?.(displayName.trim());
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

  const handleSignOut = async () => {
    try {
      localStorage.removeItem('telegram_token');
      localStorage.removeItem('telegram_user');
      localStorage.removeItem('google_token');
      localStorage.removeItem('google_user');
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('visitor_')) localStorage.removeItem(key);
      });
      await signOut(auth).catch(() => {});
      window.location.href = `/?p=${encodeURIComponent(shopSlug)}`;
    } catch (err) {
      console.error('Sign out failed:', err);
    }
  };

  if (loading) {
    return (
      <div className="px-4 md:px-8 xl:px-16 py-12 flex justify-center max-w-[1600px] mx-auto">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="px-4 py-6 space-y-5 max-w-2xl mx-auto">
      {/* User Header Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-center justify-between gap-4"
      >
        <div className="flex items-center gap-4 min-w-0">
          <div className="relative shrink-0">
            {profilePhotoUrl ? (
              <img src={profilePhotoUrl} alt=""
                className="w-16 h-16 rounded-full ring-2 ring-indigo-500/20 object-cover"
                onError={(e) => { e.target.style.display = 'none'; setProfilePhotoUrl(''); }} />
            ) : (
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white shadow-md">
                <User className="w-8 h-8 text-white/90" />
              </div>
            )}
            <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
            <button onClick={() => photoInputRef.current?.click()} disabled={uploadingPhoto} title="Update Profile Photo"
              className="absolute -bottom-1 -right-1 w-7 h-7 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full flex items-center justify-center shadow-md transition-transform active:scale-90 border-2 border-white cursor-pointer disabled:opacity-50">
              {uploadingPhoto ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
            </button>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-gray-900 truncate">{displayName || 'Customer'}</h3>
              <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">Profile</span>
            </div>
            {email && (
              <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-500 truncate">
                <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <span className="truncate">{email}</span>
              </div>
            )}
          </div>
        </div>

        <button onClick={handleSignOut} title="Sign Out"
          className="p-2.5 rounded-xl text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 transition-all cursor-pointer shrink-0">
          <LogOut className="w-5 h-5" />
        </button>
      </motion.div>

      {/* Contact Information */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-5"
      >
        <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Phone className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-gray-900">Contact & Delivery Information</h4>
            <p className="text-[11px] text-gray-400">Keep your delivery details updated for faster checkout</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="text-xs font-bold text-gray-700 mb-1.5 block">Full Name <span className="text-rose-500">*</span></label>
            <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50/80 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-sm font-medium transition-all" />
          </div>

          {/* Phone Numbers */}
          <div>
            <label className="text-xs font-bold text-gray-700 mb-1.5 block">Phone Numbers <span className="text-rose-500">*</span></label>
            <div className="space-y-2">
              {phones.map((phone, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input type="tel" value={phone} onChange={e => {
                    const next = [...phones]; next[idx] = e.target.value.replace(/\D/g, '').slice(0, 15); setPhones(next);
                  }} placeholder={idx === 0 ? "09xxxxxxxxx" : "Additional phone number"}
                    className="flex-1 px-4 py-3 bg-gray-50/80 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-sm font-medium transition-all" />
                  {idx === 0 ? (
                    <button onClick={addPhone} title="Add Phone Number" className="w-11 h-11 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 hover:bg-indigo-100 transition-all shrink-0 cursor-pointer">
                      <Plus className="w-4 h-4" />
                    </button>
                  ) : (
                    <button onClick={() => removePhone(idx)} title="Remove Phone Number" className="w-11 h-11 bg-rose-50 rounded-xl flex items-center justify-center text-rose-500 hover:bg-rose-100 transition-all shrink-0 cursor-pointer">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Emails */}
          <div>
            <label className="text-xs font-bold text-gray-700 mb-1.5 block">Email Addresses <span className="text-rose-500">*</span></label>
            <div className="space-y-2">
              {emails.map((email, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input type="email" value={email} onChange={e => {
                    const next = [...emails]; next[idx] = e.target.value; setEmails(next);
                  }} placeholder={idx === 0 ? "your@email.com" : "Additional email"}
                    className="flex-1 px-4 py-3 bg-gray-50/80 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-sm font-medium transition-all" />
                  {idx === 0 ? (
                    <button onClick={addEmail} title="Add Email" className="w-11 h-11 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 hover:bg-indigo-100 transition-all shrink-0 cursor-pointer">
                      <Plus className="w-4 h-4" />
                    </button>
                  ) : (
                    <button onClick={() => removeEmail(idx)} title="Remove Email" className="w-11 h-11 bg-rose-50 rounded-xl flex items-center justify-center text-rose-500 hover:bg-rose-100 transition-all shrink-0 cursor-pointer">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Telegram & Viber Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-700 mb-1.5 block">Telegram Username</label>
              <input type="text" value={telegram} onChange={e => setTelegram(e.target.value)}
                placeholder="@username"
                className="w-full px-4 py-3 bg-gray-50/80 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-sm transition-all" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-700 mb-1.5 block">Viber Number</label>
              <input type="tel" value={viber} onChange={e => setViber(e.target.value.replace(/\D/g, '').slice(0, 15))}
                placeholder="09xxxxxxxxx"
                className="w-full px-4 py-3 bg-gray-50/80 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-sm transition-all" />
            </div>
          </div>

          {/* Region / District / Township */}
          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-gray-700 mb-1.5 block">Region / State (တိုင်း/ပြည်နယ်)</label>
              <SearchableSelect
                value={profileRegion}
                onChange={v => { setProfileRegion(v); setProfileDistrict(''); setProfileTownship(''); }}
                options={REGION_NAMES}
                placeholder="Select Region"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-700 mb-1.5 block">District (ခရိုင်)</label>
              <SearchableSelect
                value={profileDistrict}
                onChange={v => { setProfileDistrict(v); setProfileTownship(''); }}
                options={getDistricts(profileRegion)}
                placeholder="Select District"
                disabled={!profileRegion}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-700 mb-1.5 block">Township (မြို့နယ်)</label>
              <SearchableSelect
                value={profileTownship}
                onChange={setProfileTownship}
                options={getTownships(profileRegion, profileDistrict)}
                placeholder="Select Township"
                disabled={!profileDistrict}
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="text-xs font-bold text-gray-700 mb-1.5 block">Full Address <span className="text-rose-500">*</span></label>
            <textarea value={address} onChange={e => setAddress(e.target.value)} rows={3}
              placeholder="Street, house number, ward, city..."
              className="w-full px-4 py-3 bg-gray-50/80 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-sm resize-none font-medium transition-all" />
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-bold text-gray-700 mb-1.5 block">Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              placeholder="Delivery instructions or additional info..."
              className="w-full px-4 py-3 bg-gray-50/80 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-sm resize-none transition-all" />
          </div>

          {/* Error message */}
          {saveError && (
            <div className="flex items-center gap-2 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700">
              <XCircle className="w-4 h-4 shrink-0" />
              <p className="text-xs font-semibold">{saveError}</p>
            </div>
          )}

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={saving || !displayName.trim()}
            className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-md ${
              saved ? 'bg-emerald-600 text-white shadow-emerald-500/20' : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-indigo-500/25'
            } disabled:opacity-50 cursor-pointer`}
          >
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving Profile...</> : saved ? <><CheckCircle2 className="w-4 h-4" /> Profile Saved Successfully!</> : 'Save Profile'}
          </button>
        </div>
      </motion.div>

      {/* Go Back to Main Shop Button */}
      <a
        href={`/?p=/${encodeURIComponent(shopSlug)}`}
        onClick={(e) => {
          e.preventDefault();
          window.location.href = `/?p=/${encodeURIComponent(shopSlug)}`;
        }}
        className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold rounded-2xl text-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer shadow-md text-center"
      >
        <Store className="w-4 h-4" />
        Go Back to Main Shop
      </a>

      {/* Sign Out Button */}
      <button
        onClick={handleSignOut}
        className="w-full py-3.5 bg-white border border-rose-200 text-rose-600 font-bold rounded-2xl text-sm hover:bg-rose-50 hover:border-rose-300 transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
      >
        <LogOut className="w-4 h-4" />
        Sign Out Account
      </button>

      <p className="text-[10px] text-gray-400 text-center pb-6 font-medium">
        Powered by Telegram E-Commerce Platform
      </p>
    </div>
  );
}


/* ─── ORDER CONFIRMATION INLINE ─── */
function OrderConfirmationInline({ orderData, shop, onContinueShopping, shopSlug, receiptSettings }) {
  const [showInvoice, setShowInvoice] = useState(false);

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="px-4 md:px-8 xl:px-16 py-16 text-center max-w-[1600px] mx-auto"
      >
        <motion.div
          initial={{ scale: 0 }} animate={{ scale: 1 }}
          transition={{ type: 'spring', damping: 15, stiffness: 200 }}
          className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6"
        >
          <CheckCircle className="w-10 h-10 text-emerald-600" />
        </motion.div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Order တင်ပြီးပါပြီ။</h2>
        <p className="text-sm text-gray-500 mb-1">Your order has been placed successfully.</p>
        <p className="text-sm text-gray-500 mb-6">
          Order ID: <span className="font-bold text-gray-900">{orderData?.order_number}</span>
        </p>

        <div className="bg-gray-50 rounded-2xl p-4 mb-6 text-left text-sm text-gray-600 space-y-1">
          <p>The shop owner will review your order and contact you.</p>
        </div>

        <div className="flex flex-col gap-3">
          <button onClick={() => setShowInvoice(true)}
            className="w-full py-3.5 rounded-2xl font-bold text-sm bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg hover:shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2">
            <ReceiptIcon className="w-4 h-4" />
            Download Invoice
          </button>
          <button onClick={onContinueShopping}
            className="w-full py-3.5 rounded-2xl font-bold text-sm text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 transition-all active:scale-[0.98]">
            Continue Shopping
          </button>
        </div>
      </motion.div>

      <Receipt
        order={orderData}
        bot={shop}
        open={showInvoice}
        onClose={() => setShowInvoice(false)}
        receiptType="invoice"
        receiptSettings={receiptSettings}
      />
    </>
  );
}
