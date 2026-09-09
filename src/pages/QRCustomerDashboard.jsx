import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { RichMessage } from '../components/chat/RichMessage';
import FullScreenImageViewer from '../components/shared/FullScreenImageViewer';
import { myanmarFormat } from '../utils/date';
import { motion, AnimatePresence } from 'motion/react';
import {
  Clock, Trash2, Loader2,
  CheckCircle, X, MessageCircle, Send,
  Ticket, QrCode, ImageUp, Maximize2, Sparkles,
  Users, ChevronRight, CheckCircle2, AlertCircle, RefreshCcw
} from 'lucide-react';
import { useToastStore } from '../store/toastStore';
import { API_BASE } from '../api/config';

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

function getVisitorId() {
  let id = localStorage.getItem('qr_visitor_id');
  if (!id) {
    id = 'visitor_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
    localStorage.setItem('qr_visitor_id', id);
  }
  return id;
}

export default function QRCustomerDashboard({ slug, shop }) {
  const { addToast } = useToastStore();
  const [myToken, setMyToken] = useState(() => localStorage.getItem('my_token'));
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([
    { role: 'assistant', content: 'Hi! How can I help you with your order or queue status today?', created_at: new Date().toISOString() }
  ]);
  const [chatLoading, setChatLoading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [fullScreenImg, setFullScreenImg] = useState(null);
  const [copiedIndex, setCopiedIndex] = useState(null);

  const chatQueueRef = useRef([]);
  const chatSendingRef = useRef(false);
  const chatMessagesRef = useRef(chatMessages);
  useEffect(() => { chatMessagesRef.current = chatMessages; }, [chatMessages]);

  const chatRef = useRef(null);
  const copyTimerRef = useRef(null);
  const chatInputRef = useRef(null);
  const photoInputRef = useRef(null);

  const shopName = shop?.bot_full_name || slug;
  const botId = shop?.id;

  // Set page meta title & favicon
  useEffect(() => {
    if (shop?.bot_full_name) setPageMeta(shop.bot_full_name, shop.profile_picture);
  }, [shop]);

  // Chat - register and load messages
  useEffect(() => {
    if (!chatOpen || !botId) return;
    const visitorId = getVisitorId();
    fetch(`${API_BASE}/public/visitor/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visitor_id: visitorId, bot_id: botId, name: 'QR Customer' }),
    }).catch(() => {});

    fetch(`${API_BASE}/public/chat/${botId}/${encodeURIComponent(visitorId)}/messages`)
      .then(r => r.ok ? r.json() : [])
      .then(msgs => {
        if (msgs.length > 0) {
          const formatted = msgs.map(m => ({
            role: m.sender_type === 'user' ? 'user' : 'assistant',
            content: m.message_text || '',
            file_id: m.file_id,
            file_type: m.file_type,
            created_at: m.created_at || m.timestamp || m.time || m.date || new Date().toISOString(),
          }));
          setChatMessages(prev => {
            const isGreeting = prev.length === 1 && prev[0].role === 'assistant' && prev[0].content.includes('Hi!');
            return isGreeting ? formatted : [...prev, ...formatted];
          });
        }
      })
      .catch(() => {});
  }, [chatOpen, botId, shop?.bot_full_name]);

  // Realtime Chat Polling
  useEffect(() => {
    if (!chatOpen || !botId) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/public/chat/${botId}/${encodeURIComponent(getVisitorId())}/messages`);
        if (!res.ok) return;
        const msgs = await res.json();
        if (!msgs.length) return;
        const formatted = msgs.map(m => ({
          role: m.sender_type === 'user' ? 'user' : 'assistant',
          content: m.message_text || '',
          file_id: m.file_id,
          file_type: m.file_type,
          created_at: m.created_at || m.timestamp || m.time || m.date || new Date().toISOString(),
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

  const handlePhotoUpload = useCallback(async (e) => {
    const file = e.target.files?.[0];
    const visitorId = getVisitorId();
    if (!file || !botId || !visitorId) return;
    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('bot_id', botId);
      const res = await fetch(`${API_BASE}/public/upload/photo`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      const nowIso = new Date().toISOString();
      setChatMessages(prev => [...prev, { role: 'user', content: '', file_id: data.file_id, file_type: 'photo', created_at: nowIso }]);
      const msgRes = await fetch(`${API_BASE}/public/chat/${botId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: '',
          visitor_id: visitorId,
          file_id: data.file_id,
          file_type: 'photo',
        }),
      });
      const msgData = await msgRes.json();
      if (msgData.reply) {
        setChatMessages(prev => [...prev, { role: 'assistant', content: msgData.reply, file_id: null, file_type: null, created_at: new Date().toISOString() }]);
      }
    } catch {
      useToastStore.getState().addToast('Failed to upload photo', 'error');
    } finally {
      setUploadingPhoto(false);
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  }, [botId]);

  const sendMessage = useCallback(async (msg) => {
    if (!msg || !botId) return;
    const nowIso = new Date().toISOString();
    if (chatSendingRef.current) {
      chatQueueRef.current = [...chatQueueRef.current, { type: 'msg', msg }];
      setChatMessages(prev => [...prev, { role: 'user', content: msg, created_at: nowIso }]);
      return;
    }
    chatSendingRef.current = true;
    setChatMessages(prev => [...prev, { role: 'user', content: msg, created_at: nowIso }]);
    setChatLoading(true);
    try {
      const history = chatMessagesRef.current.slice(-100).map(m => ({ role: m.role, content: m.content }));
      const res = await fetch(`${API_BASE}/public/chat/${botId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, history, visitor_id: getVisitorId() }),
      });
      const d = await res.json();
      if (d.reply) setChatMessages(prev => [...prev, { role: 'assistant', content: d.reply, created_at: new Date().toISOString() }]);
    } catch {
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, something went wrong. Please try again.', created_at: new Date().toISOString() }]);
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
        body: JSON.stringify({ message: actionMsg, history, visitor_id: getVisitorId() }),
      });
      const d = await res.json();
      if (d.reply) setChatMessages(prev => [...prev, { role: 'assistant', content: d.reply, created_at: new Date().toISOString() }]);
    } catch {
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, something went wrong. Please try again.', created_at: new Date().toISOString() }]);
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

  // Chat Elements with Date Badges & Full Screen Photo Viewer
  const chatElements = useMemo(() => {
    let lastDateStr = null;
    const elements = [];

    chatMessages.forEach((msg, i) => {
      const rawDate = msg.created_at || msg.timestamp || msg.time || msg.date;
      let currentDateStr = null;

      if (rawDate) {
        try {
          currentDateStr = myanmarFormat(rawDate, 'd MMM yyyy');
        } catch (e) {
          currentDateStr = null;
        }
      }

      if (currentDateStr && currentDateStr !== lastDateStr) {
        lastDateStr = currentDateStr;
        elements.push(
          <div
            key={`qr-date-${currentDateStr}-${i}`}
            className="flex items-center justify-center my-4"
          >
            <span className="px-3.5 py-1 bg-white/10 backdrop-blur-md border border-white/15 rounded-full text-[11px] font-bold text-slate-300 tracking-wide shadow-sm">
              {currentDateStr}
            </span>
          </div>
        );
      }

      const imgUrl = (msg.file_type === 'photo' && msg.file_id)
        ? `${API_BASE}/telegram/file/${encodeURIComponent(msg.file_id)}?bot_id=${botId}`
        : null;

      elements.push(
        <div key={`msg-${i}`} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
          <div className={`relative max-w-[82%] rounded-2xl px-4 py-3 group transition-all shadow-md ${
            msg.role === 'user'
              ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-br-none shadow-indigo-500/20'
              : 'bg-slate-800/90 border border-slate-700/60 text-slate-100 rounded-bl-none shadow-black/40 backdrop-blur-md'
          }`}
            onClick={() => copyMsg(i)} onContextMenu={(e) => handleContextMenu(e, i)}
            onTouchStart={() => { copyTimerRef.current = setTimeout(() => copyMsg(i), 500); }}
            onTouchEnd={() => { if (copyTimerRef.current) clearTimeout(copyTimerRef.current); }}
            onTouchMove={() => { if (copyTimerRef.current) clearTimeout(copyTimerRef.current); }}>
            {copiedIndex === i && (
              <span className="absolute -top-2.5 right-2 text-[9px] font-bold bg-indigo-950 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full z-10 shadow-lg">Copied!</span>
            )}
            {imgUrl ? (
              <div
                className="relative group/img cursor-pointer overflow-hidden rounded-xl mb-1.5"
                onClick={(e) => {
                  e.stopPropagation();
                  setFullScreenImg(imgUrl);
                }}
              >
                <img src={imgUrl} alt="" className="max-w-full rounded-xl cursor-pointer hover:opacity-95 transition-all group-hover/img:scale-[1.02] shadow-md" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity rounded-xl flex items-center justify-center pointer-events-none">
                  <span className="bg-black/80 backdrop-blur-md text-white text-[11px] font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5 border border-white/20 shadow-xl">
                    <Maximize2 className="w-3 h-3 text-indigo-400" /> Tap for Full Screen
                  </span>
                </div>
              </div>
            ) : null}
            {msg.role === 'assistant' ? (
              <RichMessage content={msg.content} isAssistant={true} botId={botId}
                onAction={handleAction} onFormSubmit={handleFormSubmit} onFileUpload={handleFileUpload} />
            ) : msg.content ? (
              <p className="text-sm leading-relaxed whitespace-pre-wrap font-sans">{msg.content}</p>
            ) : null}
            <span className={`absolute bottom-1 right-2.5 text-[8px] opacity-0 group-hover:opacity-60 transition-opacity select-none ${msg.role === 'user' ? 'text-indigo-200' : 'text-slate-400'}`}>
              copy
            </span>
          </div>
        </div>
      );
    });

    return elements;
  }, [chatMessages, handleAction, handleFormSubmit, handleFileUpload, handleContextMenu, copyMsg, copiedIndex, botId]);

  const handleGetToken = async () => {
    if (!slug) return;
    try {
      const res = await fetch(`${API_BASE}/public/qr-menu/${encodeURIComponent(slug)}/assign-token`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('my_token', data.token_number);
        setMyToken(data.token_number);
        addToast(`Token #${data.token_number} assigned successfully!`, 'success');
      } else {
        const errData = await res.json().catch(() => ({}));
        addToast(errData.detail || 'Failed to assign token', 'error');
      }
    } catch (e) {
      addToast('Failed to assign token', 'error');
    }
  };

  const handleDeleteToken = async () => {
    if (!slug || !myToken || deleting) return;
    setDeleting(true);
    try {
      const res = await fetch(`${API_BASE}/public/qr-menu/${encodeURIComponent(slug)}/cancel-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token_number: myToken }),
      });
      if (res.ok) {
        localStorage.removeItem('my_token');
        setMyToken(null);
        setDeleteConfirm(null);
        addToast('Token #' + myToken + ' cancelled', 'info');
      } else {
        const err = await res.json().catch(() => ({}));
        addToast(err.detail || 'Failed to cancel token', 'error');
      }
    } catch (e) {
      addToast('Failed to cancel token', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleTokenServed = () => {
    localStorage.removeItem('my_token');
    setMyToken(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col relative overflow-hidden font-sans select-none">
      {/* Background Animated Gradient Mesh Globs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-purple-600/20 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-1/2 left-10 w-80 h-80 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Floating Glassmorphic Top Bar */}
      <header className="sticky top-0 z-30 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/80 shadow-2xl">
        <div className="max-w-md mx-auto flex items-center justify-between px-4 sm:px-6 h-16">
          <div className="flex items-center gap-3 min-w-0">
            {shop?.profile_picture ? (
              <img
                src={shop.profile_picture}
                alt={shopName}
                className="w-10 h-10 rounded-2xl object-cover border-2 border-indigo-500/30 shadow-lg shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white font-bold shadow-lg shrink-0">
                <Ticket className="w-5 h-5" />
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-sm font-extrabold text-white truncate tracking-tight">{shopName}</h1>
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Live Queue Active</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => setChatOpen(true)}
            className="p-2.5 rounded-2xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 text-slate-200 hover:text-white transition-all active:scale-95 flex items-center gap-1.5 text-xs font-bold shadow-lg cursor-pointer"
            title="Chat Assistant"
          >
            <MessageCircle className="w-4 h-4 text-indigo-400" />
            <span className="hidden sm:inline">Ask AI</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto max-w-md w-full mx-auto relative z-10 flex flex-col justify-between">
        <TokenQueueTab
          slug={slug}
          shop={shop}
          myToken={myToken}
          onGetToken={handleGetToken}
          onDeleteToken={() => setDeleteConfirm(true)}
          onTokenServed={handleTokenServed}
        />
      </main>

      {/* Token Cancel Modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md"
            onClick={(e) => { if (e.target === e.currentTarget) setDeleteConfirm(null); }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-slate-900 border border-slate-800 rounded-[32px] p-6 max-w-xs w-full text-center shadow-2xl relative overflow-hidden"
            >
              <div className="w-14 h-14 bg-gradient-to-br from-rose-500/20 to-red-600/30 border border-rose-500/30 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Trash2 className="w-7 h-7 text-rose-400" />
              </div>
              <h3 className="text-lg font-extrabold text-white mb-1.5">Cancel Your Token?</h3>
              <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                Are you sure you want to cancel ticket <span className="font-mono font-bold text-slate-200">#{myToken}</span>? You will lose your current spot in line.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs transition-all active:scale-[0.98] border border-slate-700/60"
                >
                  Keep Ticket
                </button>
                <button
                  onClick={handleDeleteToken}
                  disabled={deleting}
                  className="flex-1 py-3 bg-gradient-to-r from-rose-600 to-red-600 text-white font-bold rounded-xl text-xs hover:from-rose-500 hover:to-red-500 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-lg shadow-rose-900/40"
                >
                  {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {deleting ? 'Cancelling...' : 'Yes, Cancel'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modernized Full Screen / Floating Drawer Chat Panel */}
      <AnimatePresence>
        {chatOpen && botId && (
          <motion.div
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-50 flex flex-col bg-slate-950 text-slate-100 max-w-md mx-auto"
          >
            {/* Chat Drawer Header */}
            <div className="flex items-center justify-between px-5 h-16 bg-slate-900 border-b border-slate-800/80 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center shadow-lg">
                  <Sparkles className="w-5 h-5 text-white animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Shop AI Assistant</h3>
                  <p className="text-[10px] text-slate-400 font-medium">Ask questions about queue or menu</p>
                </div>
              </div>
              <button
                onClick={() => setChatOpen(false)}
                className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-all active:scale-95"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages Body */}
            <div ref={chatRef} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 bg-slate-950">
              {chatElements}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-slate-800/90 border border-slate-700/60 rounded-2xl rounded-bl-none px-4 py-3 shadow-md">
                    <div className="flex gap-1.5">
                      <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input Bar */}
            <div className="shrink-0 border-t border-slate-800/80 p-4 bg-slate-900/95 backdrop-blur-md">
              <div className="flex items-center gap-2">
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
                <button
                  onClick={() => photoInputRef.current?.click()}
                  disabled={uploadingPhoto || chatLoading}
                  className="w-11 h-11 rounded-2xl flex items-center justify-center disabled:opacity-50 transition-all active:scale-90 flex-shrink-0 bg-slate-800 border border-slate-700/60 text-slate-300 hover:text-white hover:bg-slate-700 cursor-pointer"
                  title="Send photo"
                >
                  {uploadingPhoto ? <Loader2 className="w-4 h-4 animate-spin text-indigo-400" /> : <ImageUp className="w-4 h-4 text-indigo-400" />}
                </button>
                <input
                  ref={chatInputRef}
                  type="text"
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChatSend(); } }}
                  placeholder="Ask a question..."
                  className="flex-1 px-4 py-3 bg-slate-800/90 border border-slate-700/60 rounded-2xl text-sm text-white placeholder-slate-500 outline-none focus:border-indigo-500 transition-all"
                  disabled={chatLoading}
                />
                <button
                  onClick={handleChatSend}
                  disabled={!chatInput.trim() || chatLoading}
                  className="w-11 h-11 bg-gradient-to-tr from-indigo-600 to-violet-600 text-white rounded-2xl flex items-center justify-center hover:brightness-110 transition-all disabled:opacity-50 shrink-0 shadow-lg shadow-indigo-600/30 active:scale-90 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full Screen Photo Viewer Modal */}
      <FullScreenImageViewer
        isOpen={!!fullScreenImg}
        onClose={() => setFullScreenImg(null)}
        imgUrl={fullScreenImg}
        title="Chat Image Preview"
      />
    </div>
  );
}

/* ─── ULTRA-MODERN TOKEN QUEUE TAB ─── */
function TokenQueueTab({ slug, shop, myToken, onGetToken, onDeleteToken, onTokenServed }) {
  const [queue, setQueue] = useState({ current: 0, next: 1, assigned: [] });
  const [loadingQueue, setLoadingQueue] = useState(true);

  useEffect(() => {
    if (!slug) return;
    let mounted = true;
    const poll = async () => {
      try {
        const r = await fetch(`${API_BASE}/public/qr-menu/${slug}/token-queue`);
        if (!r.ok) return;
        const d = await r.json();
        if (mounted && d.token_queue) {
          setQueue(d.token_queue);
          setLoadingQueue(false);
        }
      } catch {
        if (mounted) setLoadingQueue(false);
      }
    };
    poll();
    const id = setInterval(poll, 2000);
    return () => { mounted = false; clearInterval(id); };
  }, [slug]);

  const current = queue.current || 0;
  const assigned = queue.assigned || [];
  const waiting = assigned.filter(t => t > current).length;
  const served = assigned.filter(t => t <= current && t > 0).length;
  const nextToken = Math.min(...assigned.filter(t => t > current));
  const hasQueue = current > 0;
  const hasNext = nextToken && nextToken !== Infinity;
  const isLastToken = hasQueue && !hasNext && waiting === 0;

  // Auto-clear when token is served
  useEffect(() => {
    if (myToken && current > parseInt(myToken)) {
      onTokenServed?.();
    }
  }, [current, myToken, onTokenServed]);

  const myTokenNum = myToken ? parseInt(myToken) : null;
  const myPosition = myTokenNum ? assigned.indexOf(myTokenNum) + 1 : null;
  const isBeingServed = myTokenNum && current === myTokenNum;
  const isAlreadyServed = myTokenNum && current > myTokenNum;

  return (
    <div className="px-5 py-6 space-y-6">
      {/* User's Assigned Ticket Banner / Active Status */}
      {myToken ? (
        <motion.div
          initial={{ opacity: 0, y: 15, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="relative overflow-hidden rounded-[32px] p-6 text-center border shadow-2xl transition-all"
          style={{
            background: isBeingServed
              ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.25) 0%, rgba(5, 150, 105, 0.4) 100%)'
              : isAlreadyServed
                ? 'linear-gradient(135deg, rgba(71, 85, 105, 0.3) 0%, rgba(30, 41, 59, 0.5) 100%)'
                : 'linear-gradient(135deg, rgba(79, 70, 229, 0.3) 0%, rgba(124, 58, 237, 0.4) 100%)',
            borderColor: isBeingServed
              ? 'rgba(52, 211, 153, 0.4)'
              : isAlreadyServed
                ? 'rgba(148, 163, 184, 0.3)'
                : 'rgba(165, 180, 252, 0.4)',
          }}
        >
          {/* Neon Top Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider mb-4 border shadow-sm backdrop-blur-md"
            style={{
              background: isBeingServed ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.1)',
              borderColor: isBeingServed ? 'rgba(52, 211, 153, 0.5)' : 'rgba(255, 255, 255, 0.2)',
              color: isBeingServed ? '#34d399' : '#e0e7ff'
            }}>
            {isBeingServed ? <Sparkles className="w-3.5 h-3.5 animate-spin text-emerald-400" /> : <Ticket className="w-3.5 h-3.5 text-indigo-300" />}
            <span>{isBeingServed ? 'Your Turn Now' : isAlreadyServed ? 'Ticket Served' : 'Your Ticket'}</span>
          </div>

          <div className="text-6xl sm:text-7xl font-black tracking-tight text-white font-mono leading-none mb-3 drop-shadow-lg">
            #{String(myToken).padStart(3, '0')}
          </div>

          {myPosition && !isBeingServed && !isAlreadyServed && (
            <p className="text-xs sm:text-sm font-semibold text-indigo-200 mb-4">
              {myPosition === 1 ? "🎉 You're next in line!" : `⏳ ${myPosition - 1} customer(s) ahead of you`}
            </p>
          )}

          {!isBeingServed && !isAlreadyServed && (
            <button
              onClick={onDeleteToken}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-white/10 hover:bg-rose-500/20 hover:border-rose-500/40 text-slate-200 hover:text-rose-300 border border-white/15 text-xs font-bold transition-all active:scale-95 cursor-pointer backdrop-blur-md"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Cancel Ticket</span>
            </button>
          )}
          {isBeingServed && (
            <div className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold">
              <CheckCircle2 className="w-4 h-4 animate-bounce" />
              <span>Please step up to the counter!</span>
            </div>
          )}
        </motion.div>
      ) : (
        /* Action to Get Token */
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 border border-slate-800 rounded-[32px] p-6 text-center shadow-xl backdrop-blur-xl relative overflow-hidden"
        >
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-orange-500/30 border border-amber-500/30 flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Ticket className="w-8 h-8 text-amber-400" />
          </div>
          <h2 className="text-lg font-black text-white tracking-tight">Need a Service Ticket?</h2>
          <p className="text-xs text-slate-400 mt-1 mb-6 max-w-xs mx-auto">
            Get your instant digital queue ticket and track your order status in real time.
          </p>
          <button
            onClick={onGetToken}
            className="w-full py-4.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:brightness-110 text-slate-950 font-black text-base rounded-2xl shadow-xl shadow-amber-500/20 hover:shadow-amber-500/30 transition-all active:scale-[0.98] flex items-center justify-center gap-2.5 cursor-pointer"
          >
            <Ticket className="w-5 h-5 fill-slate-950" />
            <span>Get a Ticket Now</span>
          </button>
        </motion.div>
      )}

      {/* Live Queue Display Container */}
      <div className="bg-slate-900/80 border border-slate-800/80 rounded-[32px] p-6 shadow-2xl backdrop-blur-xl space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-400" />
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest">Live Queue Counter</h3>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-400 bg-slate-800 px-2.5 py-1 rounded-full border border-slate-700/60">
            <RefreshCcw className="w-3 h-3 text-slate-400 animate-spin [animation-duration:6s]" />
            <span>Auto Sync</span>
          </div>
        </div>

        {/* Now Serving Widget */}
        <div className="text-center py-2">
          <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest mb-3">Now Serving</p>
          <div className="relative inline-flex items-center justify-center px-8 py-3 bg-slate-950 rounded-3xl border border-indigo-500/30 shadow-inner">
            <div className="text-7xl font-black text-white font-mono tracking-tight leading-none drop-shadow-[0_0_15px_rgba(99,102,241,0.5)]">
              #{String(current).padStart(3, '0')}
            </div>
          </div>
          <div className="mt-3">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Current Counter Token</span>
            </span>
          </div>
        </div>

        {/* Up Next & Queue Stats Grid */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 text-center">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Up Next</p>
            <p className="text-2xl font-black text-purple-400 font-mono">
              {isLastToken ? '—' : hasNext ? `#${String(nextToken).padStart(3, '0')}` : '—'}
            </p>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 text-center">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">In Line</p>
            <p className="text-2xl font-black text-emerald-400 font-mono">{waiting}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
