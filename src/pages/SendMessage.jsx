import { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import { getAllBots, sendSuperadminMessage, getSuperadminMessages, getSupportConversations, getSupportMessages, replySupport } from '../api/superadmin';
import {
  Mail, Search, X, ChevronRight, Loader2, CheckCircle2, Send, MessageCircle, ArrowLeft
} from 'lucide-react';
import { motion } from 'motion/react';

export default function SendMessage() {
  const { user } = useAuthStore();
  const { addToast } = useToastStore();
  const queryClient = useQueryClient();
  const [view, setView] = useState('new'); // 'new' | 'conversations' | 'chat'
  const [selectedBot, setSelectedBot] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const chatEndRef = useRef(null);

  const { data: allBots } = useQuery({
    queryKey: ['superadmin', 'all-bots'],
    queryFn: getAllBots,
    enabled: user?.is_superadmin,
  });

  const { data: conversations } = useQuery({
    queryKey: ['superadmin-support-conversations'],
    queryFn: getSupportConversations,
    enabled: user?.is_superadmin,
    refetchInterval: 10000,
  });

  const { data: chatMessages, refetch: refetchChat } = useQuery({
    queryKey: ['superadmin-support-chat', selectedBot?.id],
    queryFn: () => getSupportMessages(selectedBot.id),
    enabled: !!selectedBot && view === 'chat',
    refetchInterval: 5000,
  });

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  const filteredBots = useMemo(() => {
    if (!allBots) return [];
    const q = searchTerm.toLowerCase();
    return allBots.filter(b =>
      !q || (b.bot_username || '').toLowerCase().includes(q)
      || (b.bot_full_name || '').toLowerCase().includes(q)
      || String(b.id).includes(q)
    );
  }, [allBots, searchTerm]);

  const handleSend = async () => {
    if (!selectedBot || !messageText.trim()) return;
    setSending(true);
    try {
      await sendSuperadminMessage(selectedBot.id, messageText.trim());
      queryClient.invalidateQueries({ queryKey: ['superadmin-messages'] });
      queryClient.invalidateQueries({ queryKey: ['adminUnreadMessages'] });
      queryClient.invalidateQueries({ queryKey: ['superadmin-support-conversations'] });
      setMessageText('');
      addToast('Message sent to ' + (selectedBot.bot_full_name || selectedBot.bot_username));
    } catch (err) {
      addToast(err.response?.data?.detail || 'Failed to send message', 'error');
    } finally {
      setSending(false);
    }
  };

  const handleReply = async () => {
    if (!selectedBot || !replyText.trim()) return;
    setSendingReply(true);
    try {
      await replySupport(selectedBot.id, replyText.trim());
      queryClient.invalidateQueries({ queryKey: ['superadmin-support-chat', selectedBot.id] });
      queryClient.invalidateQueries({ queryKey: ['superadmin-support-conversations'] });
      queryClient.invalidateQueries({ queryKey: ['adminUnreadMessages'] });
      setReplyText('');
    } catch (err) {
      addToast(err.response?.data?.detail || 'Failed to send reply', 'error');
    } finally {
      setSendingReply(false);
    }
  };

  const openChat = (bot) => {
    setSelectedBot(bot);
    setView('chat');
  };

  if (!user?.is_superadmin) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400 text-sm">
        Superadmin access required.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
          <Mail className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900">Support Chat</h1>
          <p className="text-xs text-gray-500">Chat with bot owners</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-white p-0.5 rounded-xl border border-gray-100 w-fit">
        <button onClick={() => { setView('new'); setSelectedBot(null); }}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${view === 'new' ? 'bg-amber-500 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
          Send New
        </button>
        <button onClick={() => setView('conversations')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${view === 'conversations' ? 'bg-amber-500 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
          Conversations {conversations?.length > 0 && `(${conversations.length})`}
        </button>
      </div>

      {/* Send New View */}
      {view === 'new' && (
        <>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Search bots..."
                  className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-amber-500" />
                {searchTerm && <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X className="w-3.5 h-3.5" /></button>}
              </div>
            </div>
            <div className="max-h-[400px] overflow-y-auto divide-y divide-gray-50">
              {!allBots ? (
                <div className="p-8 text-center"><Loader2 className="w-5 h-5 animate-spin text-gray-300 mx-auto" /></div>
              ) : filteredBots.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-sm">No bots found</div>
              ) : (
                filteredBots.map(b => (
                  <button key={b.id} onClick={() => { setSelectedBot(b); }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-amber-50 transition-colors text-left">
                    <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600 font-bold text-sm flex-shrink-0">
                      {(b.bot_full_name || b.bot_username || '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900 truncate">{b.bot_full_name || b.bot_username || `Bot #${b.id}`}</p>
                      <p className="text-[11px] text-gray-500">@{b.bot_username || 'no_username'}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {selectedBot && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
              <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
                <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600 font-bold text-sm flex-shrink-0">
                  {(selectedBot.bot_full_name || selectedBot.bot_username || '?').charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900">{selectedBot.bot_full_name || selectedBot.bot_username}</p>
                  <p className="text-[10px] text-gray-400">Will appear in their Chats as "Support"</p>
                </div>
              </div>
              <textarea value={messageText} onChange={e => setMessageText(e.target.value)}
                rows={4} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                placeholder="Type your message..." autoFocus />
              <div className="flex gap-3">
                <button onClick={handleSend} disabled={sending || !messageText.trim()}
                  className="flex-1 py-3 bg-amber-500 text-white font-bold rounded-2xl hover:bg-amber-600 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 text-sm">
                  {sending ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</> : <><Send className="w-4 h-4" /> Send</>}
                </button>
                <button onClick={() => openChat(selectedBot)}
                  className="py-3 px-4 bg-gray-100 text-gray-600 font-bold rounded-2xl hover:bg-gray-200 transition-all text-sm">
                  Chat
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Conversations List */}
      {view === 'conversations' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {!conversations ? (
            <div className="p-8 text-center"><Loader2 className="w-5 h-5 animate-spin text-gray-300 mx-auto" /></div>
          ) : conversations.length === 0 ? (
            <div className="p-8 text-center">
              <MessageCircle className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-sm text-gray-400 font-medium">No conversations yet</p>
              <p className="text-xs text-gray-300 mt-1">Send a message to start a chat.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50 max-h-[500px] overflow-y-auto">
              {conversations.map(c => (
                <button key={c.visitor_id} onClick={() => openChat({ id: c.bot_id, bot_username: c.bot_username, bot_full_name: c.bot_full_name })}
                  className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-amber-50 transition-colors text-left">
                  <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0">
                    <MessageCircle className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-gray-900 truncate">{c.bot_full_name || c.bot_username || `Bot #${c.bot_id}`}</p>
                      {(c.unread_count || 0) > 0 && (
                        <span className="bg-amber-500 text-white text-[9px] font-bold min-w-[18px] h-[18px] flex items-center justify-center rounded-full px-1">{c.unread_count}</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 truncate mt-0.5">{c.last_message || 'No messages'}</p>
                  </div>
                  <span className="text-[10px] text-gray-400 flex-shrink-0">{c.last_time ? new Date(c.last_time).toLocaleDateString() : ''}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Chat View */}
      {view === 'chat' && selectedBot && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden" style={{ maxHeight: '65vh' }}>
          <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 shrink-0">
            <button onClick={() => { setView('conversations'); setSelectedBot(null); }} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900">{selectedBot.bot_full_name || selectedBot.bot_username}</p>
              <p className="text-[10px] text-gray-400">Support conversation</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-3">
            {!chatMessages ? (
              <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-gray-300" /></div>
            ) : chatMessages.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">No messages yet</div>
            ) : (
              chatMessages.map(msg => (
                <div key={msg.id} className={`flex ${msg.sender_type === 'superadmin' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                    msg.sender_type === 'superadmin'
                      ? 'bg-amber-500 text-white rounded-br-md'
                      : 'bg-gray-100 text-gray-800 rounded-bl-md'
                  }`}>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.message_text}</p>
                    <p className={`text-[9px] mt-1 ${msg.sender_type === 'superadmin' ? 'text-amber-200' : 'text-gray-400'}`}>
                      {msg.sender_type === 'superadmin' ? 'Support' : selectedBot.bot_full_name || selectedBot.bot_username}
                      · {msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </p>
                  </div>
                </div>
              ))
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="shrink-0 border-t border-gray-100 px-5 py-4 bg-white">
            <div className="flex items-center gap-2">
              <input type="text" value={replyText} onChange={e => setReplyText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleReply(); } }}
                placeholder="Type a reply..."
                className="flex-1 px-4 py-2.5 bg-gray-100 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-amber-500" />
              <button onClick={handleReply} disabled={sendingReply || !replyText.trim()}
                className="w-10 h-10 bg-amber-500 text-white rounded-xl flex items-center justify-center hover:bg-amber-600 transition-all disabled:opacity-50 shrink-0">
                {sendingReply ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
