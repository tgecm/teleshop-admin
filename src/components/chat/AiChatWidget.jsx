import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'motion/react';
import { MessageCircle, Send, ImageUp, Loader2, X } from 'lucide-react';
import { RichMessage } from './RichMessage';
import { API_BASE } from '../../api/config';

export default function AiChatWidget({ botId, botUsername, slug, theme, getProductUrl, hide }) {
  if (hide) return null;
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([
    { role: 'assistant', content: 'Hi! How can I help you today?', file_id: null, file_type: null }
  ]);
  const [chatLoading, setChatLoading] = useState(false);
  const chatRef = useRef(null);
  const chatInputRef = useRef(null);
  const photoInputRef = useRef(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showVisitorForm, setShowVisitorForm] = useState(false);
  const [visitorForm, setVisitorForm] = useState({ name: '', phone: '', email: '' });
  const visitorIdRef = useRef('');

  // Quick Questions State
  const [quickQuestions, setQuickQuestions] = useState([]);
  const [activeChipIndex, setActiveChipIndex] = useState(0);

  useEffect(() => {
    if (!botId) return;
    fetch(API_BASE + '/public/quick-questions/' + botId)
      .then(res => res.json())
      .then(data => {
        if (data && data.questions) {
          setQuickQuestions(data.questions);
        }
      })
      .catch(err => console.error('Failed to fetch quick questions:', err));
  }, [botId]);

  const visibleQuestions = React.useMemo(() => {
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

    setChatMessages(prev => [...prev, { role: 'user', content: q.question, file_id: null, file_type: null }]);
    
    if (quickQuestions.length > 3) {
      setActiveChipIndex(prev => (prev + 3) % quickQuestions.length);
    }

    if (q.response_type === 'preset' && q.preset_answer) {
      setChatMessages(prev => [
        ...prev,
        { role: 'assistant', content: q.preset_answer, file_id: null, file_type: null }
      ]);
    } else {
      setChatLoading(true);
      try {
        const history = chatMessages.slice(-100).map(m => ({ role: m.role, content: m.content }));
        const res = await fetch(API_BASE + '/public/chat/' + botId, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: q.question,
            history,
            visitor_id: visitorIdRef.current,
            name: visitorForm.name || undefined,
            phone: visitorForm.phone || undefined,
            email: visitorForm.email || undefined,
          }),
        });
        const data = await res.json();
        setChatMessages(prev => [...prev, { role: 'assistant', content: data.reply || 'Sorry, I could not process your request.', file_id: null, file_type: null }]);
      } catch (err) {
        setChatMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.', file_id: null, file_type: null }]);
      } finally {
        setChatLoading(false);
      }
    }
  }, [chatLoading, quickQuestions, chatMessages, botId, visitorForm]);

  function generateVisitorId() {
    return 'v' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  const handleVisitorPhoto = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file || !botId) return;
    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('bot_id', botId);
      const res = await fetch(API_BASE + '/public/upload/photo', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      const history = chatMessages.slice(-100).map(m => ({ role: m.role, content: m.content }));
      setChatMessages(prev => [...prev, { role: 'user', content: '', file_id: data.file_id, file_type: 'photo' }]);
      const msgRes = await fetch(API_BASE + '/public/chat/' + botId, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: '', history,
          visitor_id: visitorIdRef.current,
          file_id: data.file_id,
          file_type: 'photo',
        }),
      });
      const msgData = await msgRes.json();
      if (msgData.reply) {
        setChatMessages(prev => [...prev, { role: 'assistant', content: msgData.reply, file_id: null, file_type: null }]);
      }
    } catch {
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'Failed to send photo.' }]);
    } finally {
      setUploadingPhoto(false);
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  }, [botId, chatMessages]);

  const handleChatSend = useCallback(async () => {
    if (!chatInput.trim() || chatLoading) return;
    const msg = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: msg, file_id: null, file_type: null }]);
    setChatLoading(true);
    try {
      const history = chatMessages.slice(-100).map(m => ({ role: m.role, content: m.content }));
      const res = await fetch(`${API_BASE}/public/chat/${botId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, history, visitor_id: visitorIdRef.current }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.detail || 'Chat failed');
      if (d.ai_unavailable) {
        const noticeKey = 'ai_notice_' + visitorIdRef.current;
        if (!localStorage.getItem(noticeKey)) {
          localStorage.setItem(noticeKey, '1');
          setChatMessages(prev => [...prev, { role: 'assistant', content: 'AI Agent is not available right now. Please leave your message.' }]);
        }
      } else {
        setChatMessages(prev => [...prev, { role: 'assistant', content: d.reply, file_id: null, file_type: null }]);
      }
    } catch {
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }]);
    } finally {
      setChatLoading(false);
      setTimeout(() => chatInputRef.current?.focus(), 100);
    }
  }, [chatInput, chatLoading, botId, chatMessages]);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [chatMessages, chatLoading]);

  useEffect(() => {
    if (chatOpen && !showVisitorForm) {
      setTimeout(() => chatInputRef.current?.focus(), 200);
    }
  }, [chatOpen, showVisitorForm]);

  // Live polling for new messages from admin
  useEffect(() => {
    if (!chatOpen || !botId || showVisitorForm || !visitorIdRef.current) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(API_BASE + '/public/chat/' + botId + '/' + visitorIdRef.current + '/messages');
        const msgs = await res.json();
        if (msgs && msgs.length > 0) {
          setChatMessages(prev => {
            if (msgs.length <= prev.length) return prev;
            const existing = new Set(prev.map(m => (m.content || '') + '|' + m.role + '|' + (m.file_id || '')));
            const newMsgs = msgs.filter(m => !existing.has((m.message_text || '') + '|' + m.sender_type + '|' + (m.file_id || '')));
            if (newMsgs.length === 0) return prev;
            return [...prev, ...newMsgs.map(m => ({
              role: m.sender_type === 'user' ? 'user' : 'assistant',
              content: m.message_text || '',
              file_id: m.file_id || null,
              file_type: m.file_type || null
            }))];
          });
        }
      } catch {}
    }, 3000);
    return () => clearInterval(interval);
  }, [chatOpen, botId, showVisitorForm]);

  useEffect(() => {
    if (!chatOpen || !botId) return;

    // Check logged-in user session first (Google or Telegram auth)
    let loggedInUid = null;
    let loggedInName = '';
    let loggedInEmail = '';
    let loggedInPhone = '';

    try {
      const g = localStorage.getItem('google_user');
      if (g) {
        const parsed = JSON.parse(g);
        loggedInUid = parsed.id || parsed.uid;
        loggedInName = parsed.name || parsed.displayName || '';
        loggedInEmail = parsed.email || '';
      }
    } catch {}

    if (!loggedInUid) {
      try {
        const t = localStorage.getItem('telegram_user');
        if (t) {
          const parsed = JSON.parse(t);
          loggedInUid = String(parsed.id);
          loggedInName = parsed.name || parsed.first_name || (parsed.username ? `@${parsed.username}` : '');
        }
      } catch {}
    }

    if (loggedInUid) {
      const uidStr = String(loggedInUid);
      visitorIdRef.current = uidStr;
      setShowVisitorForm(false);
      setVisitorForm({ name: loggedInName, phone: loggedInPhone, email: loggedInEmail });

      // Sync website customer to backend
      fetch(`${API_BASE}/website-customers/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bot_id: botId,
          firebase_uid: uidStr,
          display_name: loggedInName,
          email: loggedInEmail,
          phone: loggedInPhone
        }),
      }).catch(() => {});

      // Fetch messages for logged-in user
      fetch(`${API_BASE}/public/chat/${botId}/${encodeURIComponent(uidStr)}/messages`)
        .then(r => r.json())
        .then(msgs => {
          if (Array.isArray(msgs) && msgs.length > 0) {
            setChatMessages(msgs.map(m => ({
              role: m.sender_type === 'user' ? 'user' : 'assistant',
              content: m.message_text || '',
              file_id: m.file_id || null,
              file_type: m.file_type || null
            })));
          }
        }).catch(() => {});
      return;
    }

    // Guest fallback
    if (visitorIdRef.current) return;
    const key = 'visitor_' + (botUsername || slug || 'domain');
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const info = JSON.parse(saved);
        visitorIdRef.current = info.id;
        setVisitorForm({ name: info.name || '', phone: info.phone || '', email: info.email || '' });
        fetch(API_BASE + '/public/chat/' + botId + '/' + info.id + '/messages')
          .then(r => r.json())
          .then(msgs => {
            if (msgs && msgs.length > 0) {
              setChatMessages(msgs.map(m => ({
                role: m.sender_type === 'user' ? 'user' : 'assistant',
                content: m.message_text || '',
                file_id: m.file_id || null,
                file_type: m.file_type || null
              })));
            }
          }).catch(() => {});
      } catch { setShowVisitorForm(true); }
    } else {
      setShowVisitorForm(true);
    }
  }, [chatOpen, botId, botUsername, slug]);

  async function handleVisitorSave(name, phone, email) {
    if (!botId) return;
    const id = visitorIdRef.current || generateVisitorId();
    visitorIdRef.current = id;
    const key = 'visitor_' + (botUsername || slug || 'domain');
    const info = { id, name, phone, email };
    localStorage.setItem(key, JSON.stringify(info));
    setShowVisitorForm(false);
    setVisitorForm({ name, phone, email });
    try {
      await fetch(API_BASE + '/public/visitor/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitor_id: id, bot_id: botId, name, phone, email }),
      });
    } catch {}
  }

  return (
    <>
      <button
        onClick={() => setChatOpen(!chatOpen)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg z-50 flex items-center justify-center transition-transform active:scale-90 hover:scale-105"
        style={{ background: theme?.css?.['--theme-btn'] || '#6366f1' }}
      >
        {chatOpen ? <X className="w-6 h-6 text-white" /> : <MessageCircle className="w-6 h-6 text-white" />}
      </button>

      {chatOpen && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.95 }}
          className="fixed bottom-24 left-1/2 -translate-x-1/2 w-[calc(100%-32px)] max-w-[360px] h-[520px] max-h-[75vh] bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 flex flex-col overflow-hidden"
        >
          <div className="p-4" style={{ background: theme?.css?.['--theme-header'] || '#6366f1' }}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <MessageCircle className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Shop Assistant</h3>
                <p className="text-[10px] text-white/70">Ask anything about our products</p>
              </div>
            </div>
          </div>

          {showVisitorForm ? (
            <div className="flex-1 overflow-y-auto p-4">
              <div className="text-center mb-5 mt-2">
                <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center mx-auto mb-3">
                  <MessageCircle className="w-6 h-6 text-indigo-600" />
                </div>
                <h3 className="font-bold text-gray-900 text-base">Welcome!</h3>
                <p className="text-xs text-gray-500 mt-1">Fill in or skip to chat</p>
              </div>
              <div className="space-y-2.5">
                <input
                  type="text" placeholder="Name (optional)"
                  value={visitorForm.name}
                  onChange={e => setVisitorForm(p => ({ ...p, name: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                />
                <input
                  type="tel" placeholder="Phone (optional)"
                  value={visitorForm.phone}
                  onChange={e => setVisitorForm(p => ({ ...p, phone: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                />
                <input
                  type="email" placeholder="Email (optional)"
                  value={visitorForm.email}
                  onChange={e => setVisitorForm(p => ({ ...p, email: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                />
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => handleVisitorSave(visitorForm.name, visitorForm.phone, visitorForm.email)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all active:scale-95"
                    style={{ background: theme?.css?.['--theme-btn'] || '#6366f1' }}
                  >
                    Start Chatting
                  </button>
                  <button
                    onClick={() => handleVisitorSave('', '', '')}
                    className="px-4 py-2.5 rounded-xl text-sm font-bold text-gray-500 bg-gray-100 transition-all active:scale-95"
                  >
                    Skip
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div ref={chatRef} className="flex-1 overflow-y-auto p-4 space-y-3">
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user' ? 'text-white' : 'bg-gray-100 text-gray-800'
                  }`} style={msg.role === 'user' ? { background: theme?.css?.['--theme-btn'] || '#6366f1' } : {}}>
                    {msg.file_id && msg.file_type === 'photo' && (
                      <img
                        src={API_BASE + '/telegram/file/' + msg.file_id + '?bot_id=' + botId}
                        alt="Photo"
                        className="max-w-full rounded-lg mb-1 max-h-48 object-cover"
                        loading="lazy"
                      />
                    )}
                    {msg.content && msg.role === 'assistant' ? (
                      <RichMessage content={msg.content} isAssistant={true} botId={botId} getProductUrl={getProductUrl} />
                    ) : (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    )}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-2xl px-4 py-3">
                    <div className="flex gap-1.5">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.1s]" />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Quick Question Chips */}
          {visibleQuestions && visibleQuestions.length > 0 && !showVisitorForm && (
            <div className="px-4 py-2 border-t border-gray-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar bg-gray-50/60">
              {visibleQuestions.map((q) => (
                <button
                  key={q.id}
                  onClick={() => handleQuickQuestionClick(q)}
                  disabled={chatLoading}
                  className="px-3 py-1.5 bg-white hover:bg-gray-100 border border-gray-200 rounded-full text-xs font-semibold text-gray-700 whitespace-nowrap shadow-2xs transition-all active:scale-95 disabled:opacity-50 flex-shrink-0 flex items-center gap-1"
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${q.response_type === 'preset' ? 'bg-indigo-500' : 'bg-purple-500'}`} />
                  <span>{q.question}</span>
                </button>
              ))}
            </div>
          )}

          <div className="border-t border-gray-100 px-4 py-3">
            <div className="flex gap-2 w-full min-w-0">
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                onChange={handleVisitorPhoto}
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
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChatSend(); } }}
                placeholder="Type a message..."
                className="flex-1 min-w-0 px-3.5 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                disabled={chatLoading}
              />
              <button
                onClick={handleChatSend}
                disabled={chatLoading || !chatInput.trim()}
                className="w-10 h-10 rounded-xl flex items-center justify-center disabled:opacity-50 transition-all active:scale-90"
                style={{ background: theme?.css?.['--theme-btn'] || '#6366f1' }}
              >
                <Send className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </>
  );
}
