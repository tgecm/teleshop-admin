import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { RichMessage } from '../components/chat/RichMessage';
import FullScreenImageViewer from '../components/shared/FullScreenImageViewer';
import { myanmarFormat } from '../utils/date';
import { motion, AnimatePresence } from 'motion/react';
import {
  Clock, Trash2, Loader2,
  CheckCircle, X, MessageCircle, Send,
  Ticket, QrCode, ImageUp, Maximize2
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
  const photoInputRef = useRef(null);
  const [fullScreenImg, setFullScreenImg] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const shopName = shop?.bot_full_name || slug;
  const botId = shop?.id;

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
      setChatMessages(prev => [...prev, { role: 'user', content: '', file_id: data.file_id, file_type: 'photo' }]);
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
        setChatMessages(prev => [...prev, { role: 'assistant', content: msgData.reply, file_id: null, file_type: null }]);
      }
    } catch {
      useToastStore.getState().addToast('Failed to upload photo', 'error');
    } finally {
      setUploadingPhoto(false);
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  }, [botId]);


  // Set page meta
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
          }));
          setChatMessages(prev => {
            const isGreeting = prev.length === 1 && prev[0].role === 'assistant' && prev[0].content === 'Hi! How can I help you today?';
            return isGreeting ? formatted : [...prev, ...formatted];
          });
        }
      })
      .catch(() => {});
  }, [chatOpen, botId, shop?.bot_full_name]);

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
        body: JSON.stringify({ message: msg, history, visitor_id: getVisitorId() }),
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
        body: JSON.stringify({ message: actionMsg, history, visitor_id: getVisitorId() }),
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
            <span className="px-3.5 py-1 bg-gray-100/90 border border-gray-200/70 rounded-full text-[11px] font-bold text-gray-500 tracking-wide">
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
            {imgUrl ? (
              <div
                className="relative group/img cursor-pointer overflow-hidden rounded-lg mb-1"
                onClick={(e) => {
                  e.stopPropagation();
                  setFullScreenImg(imgUrl);
                }}
              >
                <img src={imgUrl} alt="" className="max-w-full rounded-lg cursor-pointer hover:opacity-95 transition-all group-hover/img:scale-[1.02]" />
                <div className="absolute inset-0 bg-black/25 opacity-0 group-hover/img:opacity-100 transition-opacity rounded-lg flex items-center justify-center pointer-events-none">
                  <span className="bg-black/75 backdrop-blur-md text-white text-[11px] font-semibold px-2.5 py-1 rounded-full flex items-center gap-1">
                    <Maximize2 className="w-3 h-3" /> Full Screen
                  </span>
                </div>
              </div>
            ) : null}
            {msg.role === 'assistant' ? (
              <RichMessage content={msg.content} isAssistant={true} botId={botId}
                onAction={handleAction} onFormSubmit={handleFormSubmit} onFileUpload={handleFileUpload} />
            ) : msg.content ? (
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
            ) : null}
            <span className={`absolute bottom-1 right-2 text-[8px] opacity-0 group-hover:opacity-40 transition-opacity select-none ${msg.role === 'user' ? 'text-white/50' : 'text-gray-400'}`}>copy</span>
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
        addToast(`Token #${data.token_number} assigned!`);
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
        addToast('Token #' + myToken + ' cancelled');
        setRefreshKey(k => k + 1);
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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-gradient-to-r from-indigo-600 to-purple-600 shadow-md">
        <div className="flex items-center justify-between px-4 md:px-8 xl:px-16 h-12">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-white/20 backdrop-blur flex items-center justify-center shrink-0">
              <Ticket className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-white text-sm font-bold truncate">{shopName}</h1>
          </div>
          <button onClick={() => setChatOpen(true)}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-all">
            <MessageCircle className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Queue Content */}
      <main className="flex-1 overflow-y-auto">
        <TokenQueueTab
          slug={slug}
          shop={shop}
          myToken={myToken}
          onGetToken={handleGetToken}
          onDeleteToken={() => setDeleteConfirm(true)}
          onTokenServed={handleTokenServed}
        />
      </main>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) setDeleteConfirm(null); }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[32px] p-6 max-w-sm w-full text-center shadow-2xl"
            >
              <div className="w-14 h-14 bg-gradient-to-br from-rose-100 to-red-200 rounded-[20px] flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Trash2 className="w-7 h-7 text-red-500" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Cancel Token?</h3>
              <p className="text-sm text-gray-500 mb-6">
                Do you want to cancel token <span className="font-bold text-gray-700">#{myToken}</span>?
                This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-2xl text-sm hover:bg-gray-200 transition-all active:scale-[0.98]"
                >
                  No, Keep It
                </button>
                <button
                  onClick={handleDeleteToken}
                  disabled={deleting}
                  className="flex-1 py-3 bg-gradient-to-r from-rose-500 to-red-600 text-white font-bold rounded-2xl text-sm hover:from-rose-600 hover:to-red-700 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {deleting ? 'Cancelling...' : 'Yes, Cancel'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
            {chatElements}
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
                ref={photoInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
              <button
                onClick={() => photoInputRef.current?.click()}
                disabled={uploadingPhoto || chatLoading}
                className="w-10 h-10 rounded-xl flex items-center justify-center disabled:opacity-50 transition-all active:scale-90 flex-shrink-0 bg-gray-100 text-gray-500 hover:bg-gray-200"
                title="Send photo"
              >
                {uploadingPhoto ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageUp className="w-4 h-4" />}
              </button>
              <input
                ref={chatInputRef}
                type="text"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChatSend(); } }}
                placeholder="Type a message..."
                className="flex-1 px-4 py-2.5 bg-gray-100 border border-gray-200 rounded-xl outline-none text-sm focus:ring-2 focus:ring-indigo-500"
                disabled={chatLoading}
              />
              <button onClick={handleChatSend} disabled={!chatInput.trim() || chatLoading}
                className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center hover:bg-indigo-700 transition-all disabled:opacity-50 shrink-0">
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      <FullScreenImageViewer
        isOpen={!!fullScreenImg}
        onClose={() => setFullScreenImg(null)}
        imgUrl={fullScreenImg}
        title="Chat Image Preview"
      />

    </div>
  );
}

/* ─── TOKEN QUEUE TAB ─── */
function TokenQueueTab({ slug, shop, myToken, onGetToken, onDeleteToken, onTokenServed }) {
  const [queue, setQueue] = useState({ current: 0, next: 1, assigned: [] });

  useEffect(() => {
    if (!slug) return;
    let mounted = true;
    const poll = async () => {
      try {
        const r = await fetch(`${API_BASE}/public/qr-menu/${slug}/token-queue`);
        if (!r.ok) return;
        const d = await r.json();
        if (mounted && d.token_queue) setQueue(d.token_queue);
      } catch {}
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

  if (!hasQueue && !myToken) {
    return (
      <div className="px-4 py-12 text-center">
        <div className="w-20 h-20 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-4">
          <QrCode className="w-10 h-10 text-purple-400" />
        </div>
        <div className="text-7xl font-black text-purple-300 mb-3">#000</div>
        <p className="text-base font-bold text-gray-800">No active queue</p>
        <p className="text-sm text-gray-400 mt-1">Get a token to join the queue</p>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6"
        >
          <button
            onClick={onGetToken}
            className="w-full py-5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-2xl font-bold text-lg shadow-lg shadow-amber-200 hover:shadow-xl hover:from-amber-600 hover:to-orange-600 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
          >
            <Ticket className="w-6 h-6" />
            Get a Token
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6">
      {/* Get a Token Button (when no token) */}
      {!myToken && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <button
            onClick={onGetToken}
            className="w-full py-5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-2xl font-bold text-lg shadow-lg shadow-amber-200 hover:shadow-xl hover:from-amber-600 hover:to-orange-600 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
          >
            <Ticket className="w-6 h-6" />
            Get a Token
          </button>
        </motion.div>
      )}

      {/* User's own token card */}
      {myToken && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-6"
        >
          <div
            onClick={() => {
              if (isBeingServed || isAlreadyServed) return;
              onDeleteToken?.();
            }}
            className={`w-full p-6 rounded-2xl text-center transition-all ${
              isBeingServed
                ? 'bg-gradient-to-br from-emerald-500 to-green-600'
                : isAlreadyServed
                  ? 'bg-gradient-to-br from-gray-400 to-gray-500'
                  : 'bg-gradient-to-br from-indigo-600 to-purple-600 cursor-pointer hover:shadow-xl active:scale-[0.98]'
            } shadow-lg`}
          >
            <p className="text-xs font-bold text-white/70 uppercase tracking-widest mb-2">
              {isBeingServed ? 'Being Served Now' : isAlreadyServed ? 'Served' : 'Your Token'}
            </p>
            <div className="text-6xl font-black text-white leading-none mb-2">
              #{String(myToken).padStart(3, '0')}
            </div>
            {myPosition && !isBeingServed && !isAlreadyServed && (
              <p className="text-sm text-white/80 font-medium">
                {myPosition === 1 ? "You're next!" : `${myPosition - 1} ahead of you`}
              </p>
            )}
            {!isBeingServed && !isAlreadyServed && (
              <div className="inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-bold">
                <Trash2 className="w-3 h-3" />
                Tap to cancel
              </div>
            )}
            {isBeingServed && (
              <div className="inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-bold">
                <Clock className="w-3 h-3" />
                Cannot cancel — being served
              </div>
            )}
            {isAlreadyServed && (
              <div className="inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-bold">
                <CheckCircle className="w-3 h-3" />
                Thank you!
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Queue status */}
      {hasQueue && (
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-6">
            {shop?.profile_picture && (
              <img src={shop.profile_picture} alt="" className="w-7 h-7 rounded-lg object-cover" />
            )}
            <span className="text-sm font-bold text-gray-500">{shop?.bot_full_name || 'Shop'}</span>
          </div>

          <div className="mb-8">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Now Serving</p>
            <div className="relative inline-block">
              <div className="absolute inset-0 rounded-full border-2 border-purple-400 opacity-30 animate-ping" />
              <div className="text-8xl font-black text-gray-900 leading-none relative">
                #{String(current).padStart(3, '0')}
              </div>
            </div>
            <div className="inline-flex items-center gap-1.5 mt-4 px-4 py-1.5 rounded-full bg-emerald-50 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold text-emerald-700">Being served now</span>
            </div>
          </div>

          <div className="mb-6">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Up Next</p>
            <div className="text-5xl font-black text-purple-500 leading-none">
              {isLastToken ? '—' : hasNext ? `#${String(nextToken).padStart(3, '0')}` : '—'}
            </div>
            {isLastToken ? (
              <div className="inline-flex items-center gap-1.5 mt-2 px-4 py-1.5 rounded-full bg-yellow-50 border border-yellow-200">
                <span className="text-xs font-bold text-yellow-700">🎉 Almost done!</span>
              </div>
            ) : hasNext ? (
              <div className="inline-flex items-center gap-1.5 mt-2 px-4 py-1.5 rounded-full bg-orange-50 border border-orange-200">
                <span className="text-xs font-bold text-orange-700">⏳ Please get ready</span>
              </div>
            ) : null}
          </div>

          <div className="flex items-center justify-center gap-6 py-3 px-6 bg-gray-50 rounded-2xl border border-gray-100 max-w-xs mx-auto">
            <div className="text-center">
              <p className="text-xs text-gray-400 font-medium">Waiting</p>
              <p className="text-lg font-black text-gray-800">{waiting}</p>
            </div>
            <div className="w-px h-8 bg-gray-200" />
            <div className="text-center">
              <p className="text-xs text-gray-400 font-medium">Served</p>
              <p className="text-lg font-black text-gray-800">{served}</p>
            </div>
          </div>
        </div>
      )}

      {!hasQueue && myToken && (
        <div className="text-center py-8">
          <div className="text-7xl font-black text-purple-300 mb-3">#000</div>
          <p className="text-base font-bold text-gray-800">No active queue</p>
          <p className="text-sm text-gray-400 mt-1">The queue will start soon</p>
        </div>
      )}
    </div>
  );
}
