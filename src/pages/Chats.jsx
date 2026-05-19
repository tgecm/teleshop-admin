import { useState, useRef, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getChats, getChatMessages, sendChatMessage, deleteChat, markChatRead, markChatUnread } from '../api/chats';
import { useBotStore } from '../store/botStore';
import { useToastStore } from '../store/toastStore';
import LoadingSkeleton from '../components/shared/LoadingSkeleton';
import {
  Search,
  MessageCircle,
  Send,
  X,
  ChevronRight,
  User,
  Loader2,
  Trash2,
  CheckCheck,
  Circle,
  Headphones,
  FileText,
} from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import client from '../api/client';
import { useAuthStore } from '../store/authStore';

function ChatBubble({ message, isAdmin, botId, botUsername }) {
  const token = useAuthStore(s => s.token);

  const renderMedia = () => {
    if (!message.file_id) return null;
    const fileUrl = `${client.defaults.baseURL}/telegram/file/${message.file_id}?bot_id=${botId}&token=${token}`;
    const tgLink = botUsername ? `https://t.me/${botUsername}` : '#';

    switch (message.file_type) {
      case 'photo':
        return (
          <div className="mb-2">
            <img
              src={fileUrl}
              alt="Photo"
              className="max-w-full rounded-lg cursor-pointer max-h-64 object-cover"
              loading="lazy"
              onClick={(e) => { e.stopPropagation(); window.open(fileUrl, '_blank'); }}
            />
            <a href={tgLink} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs font-bold mt-1.5 hover:underline"
              onClick={(e) => e.stopPropagation()}>
              Open in Telegram ↗
            </a>
          </div>
        );
      case 'video':
        return (
          <div className="mb-2">
            <video controls controlsList="nodownload" className="max-w-full rounded-lg max-h-64 w-full" preload="metadata">
              <source src={fileUrl} />
            </video>
            <a href={tgLink} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs font-bold mt-1.5 hover:underline"
              onClick={(e) => e.stopPropagation()}>
              Open in Telegram ↗
            </a>
          </div>
        );
      case 'audio':
      case 'voice':
        return (
          <div className={`mb-2 rounded-xl p-3 ${isAdmin ? 'bg-indigo-500/30' : 'bg-white/60'}`}>
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${isAdmin ? 'bg-indigo-400/30' : 'bg-gray-200'}`}>
                <Headphones className={`w-5 h-5 ${isAdmin ? 'text-indigo-200' : 'text-gray-600'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-bold ${isAdmin ? 'text-white' : 'text-gray-900'}`}>
                  {message.file_type === 'voice' ? 'Voice Message' : 'Audio'}
                </p>
              </div>
              <a href={tgLink} target="_blank" rel="noreferrer"
                className={`text-[10px] font-bold hover:underline flex-shrink-0 ${isAdmin ? 'text-indigo-200' : 'text-indigo-600'}`}
                onClick={(e) => e.stopPropagation()}>
                Open ↗
              </a>
            </div>
            <audio controls controlsList="nodownload" className="w-full h-9" preload="metadata">
              <source src={fileUrl} />
            </audio>
          </div>
        );
      case 'sticker':
        return (
          <div className="mb-2">
            <img src={fileUrl} alt="Sticker" className="max-w-[128px]" loading="lazy" />
          </div>
        );
      default:
        return (
          <div className="mb-2">
            <div className="flex items-center gap-2 opacity-90">
              <FileText className="w-4 h-4 flex-shrink-0" />
              <p className="text-sm">Sent a file</p>
            </div>
            <a href={tgLink} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs font-bold mt-1 hover:underline"
              onClick={(e) => e.stopPropagation()}>
              Open in Telegram ↗
            </a>
          </div>
        );
    }
  };

  return (
    <div className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[88%] rounded-2xl px-4 py-2.5 ${
          isAdmin
            ? 'bg-indigo-600 text-white rounded-br-md'
            : 'bg-gray-100 text-gray-900 rounded-bl-md'
        }`}
      >
        {renderMedia()}
        {message.message_text && (
          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
            {message.message_text}
          </p>
        )}
        <p
          className={`text-[10px] mt-1 ${
            isAdmin ? 'text-indigo-200' : 'text-gray-400'
          }`}
        >
          {format(new Date(message.created_at), 'h:mm a')}
        </p>
      </div>
    </div>
  );
}

function ConversationItem({ chat, isActive, onClick, onContextMenu }) {
  const unread = chat.unread_count || 0;

  return (
    <div className="relative group">
      <button
        onClick={onClick}
        onContextMenu={(e) => onContextMenu(e, chat)}
        className={`w-full text-left p-3 rounded-2xl transition-all active:scale-[0.98] ${
          isActive
            ? 'bg-indigo-50 border border-indigo-100'
            : 'bg-white border border-transparent hover:border-gray-200'
        } ${unread > 0 ? 'bg-indigo-50/50' : ''}`}
      >
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
            <User className="w-5 h-5 text-gray-500" />
            {unread > 0 && (
              <div className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-rose-500 rounded-full flex items-center justify-center">
                <span className="text-[8px] font-bold text-white">{unread > 9 ? '9+' : unread}</span>
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <p className={`text-sm truncate ${unread > 0 ? 'font-extrabold text-gray-900' : 'font-bold text-gray-900'}`}>
                {chat.first_name || `User ${chat.user_id}`}
              </p>
              {chat.last_time && (
                <span className="text-[10px] text-gray-400 flex-shrink-0">
                  {format(new Date(chat.last_time), 'MMM d')}
                </span>
              )}
            </div>
            <p className={`text-xs truncate mt-0.5 flex items-center gap-1 ${unread > 0 ? 'font-semibold text-gray-700' : 'text-gray-500'}`}>
              {chat.last_sender === 'admin' && <CheckCheck className="w-3 h-3 flex-shrink-0 text-indigo-400" />}
              {chat.last_message || 'No messages'}
            </p>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0 hidden sm:block" />
        </div>
      </button>
    </div>
  );
}

export default function Chats() {
  const { selectedBotId, bots } = useBotStore();
  const botUsername = bots.find(b => b.id === Number(selectedBotId))?.bot_username;
  const { addToast } = useToastStore();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [inputText, setInputText] = useState('');
  const [contextMenu, setContextMenu] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const menuRef = useRef(null);

  const { data: chats = [], isLoading } = useQuery({
    queryKey: ['chats', selectedBotId],
    queryFn: () => getChats(Number(selectedBotId)),
    enabled: !!selectedBotId,
    refetchInterval: 15000,
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['chatMessages', selectedBotId, selectedUser],
    queryFn: () => getChatMessages(selectedUser, Number(selectedBotId)),
    enabled: !!selectedBotId && !!selectedUser,
    refetchInterval: 10000,
  });

  const sendMutation = useMutation({
    mutationFn: ({ userId, message }) =>
      sendChatMessage(userId, Number(selectedBotId), message),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatMessages', selectedBotId, selectedUser] });
      queryClient.invalidateQueries({ queryKey: ['chats', selectedBotId] });
      setInputText('');
    },
    onError: () => addToast('Failed to send message', 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (userId) => deleteChat(userId, Number(selectedBotId)),
    onSuccess: (_data, userId) => {
      queryClient.invalidateQueries({ queryKey: ['chats', selectedBotId] });
      setContextMenu(null);
      setDeleteConfirm(null);
      if (selectedUser === userId) setSelectedUser(null);
      addToast('Chat deleted');
    },
    onError: () => addToast('Failed to delete chat', 'error'),
  });

  const readMutation = useMutation({
    mutationFn: ({ userId, markAsRead }) =>
      markAsRead ? markChatRead(userId, Number(selectedBotId)) : markChatUnread(userId, Number(selectedBotId)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chats', selectedBotId] });
      setContextMenu(null);
    },
  });

  // Close context menu on outside click
  useEffect(() => {
    if (!contextMenu) return;
    const handle = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setContextMenu(null);
        setDeleteConfirm(null);
      }
    };
    document.addEventListener('pointerdown', handle);
    return () => document.removeEventListener('pointerdown', handle);
  }, [contextMenu]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const filteredChats = chats.filter(c => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      (c.first_name || '').toLowerCase().includes(term) ||
      c.user_id.toString().includes(term)
    );
  });

  const selectedChat = chats.find(c => c.user_id === selectedUser);

  const handleSend = () => {
    const text = inputText.trim();
    if (!text || sendMutation.isPending) return;
    sendMutation.mutate({ userId: selectedUser, message: text });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleContextMenu = useCallback((e, chat) => {
    e.preventDefault();
    setContextMenu({ chat, x: e.clientX, y: e.clientY });
    setDeleteConfirm(null);
  }, []);

  const handleDeleteClick = () => {
    if (!deleteConfirm) {
      setDeleteConfirm(contextMenu.chat.user_id);
    } else {
      deleteMutation.mutate(contextMenu.chat.user_id);
    }
  };

  if (isLoading) return <LoadingSkeleton type="list" count={5} />;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-lg sm:text-2xl font-bold text-gray-900">Chats</h1>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search user..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm transition-all text-sm"
          />
        </div>
      </div>

      {filteredChats.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-gray-200">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageCircle className="w-8 h-8 text-gray-300" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">No conversations yet</h3>
          <p className="text-sm text-gray-500 max-w-xs mx-auto mt-1">
            {search
              ? 'Try a different search term.'
              : 'When users message the bot, their conversations will appear here.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-2" onContextMenu={(e) => e.preventDefault()}>
          {filteredChats.map(chat => (
            <ConversationItem
              key={chat.user_id}
              chat={chat}
              isActive={selectedUser === chat.user_id}
              onClick={() => {
                setSelectedUser(chat.user_id);
                // Mark as read on frontend immediately
                if (chat.unread_count > 0) {
                  queryClient.setQueryData(['chats', selectedBotId], (old) =>
                    old?.map(c => c.user_id === chat.user_id ? { ...c, unread_count: 0 } : c)
                  );
                  markChatRead(chat.user_id, Number(selectedBotId)).catch(() => {});
                }
              }}
              onContextMenu={handleContextMenu}
            />
          ))}
        </div>
      )}

      {/* Context Menu */}
      <AnimatePresence>
        {contextMenu && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50"
              onClick={() => { setContextMenu(null); setDeleteConfirm(null); }}
            />
            <motion.div
              ref={menuRef}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              style={{
                position: 'fixed',
                left: Math.min(contextMenu.x, window.innerWidth - 220),
                top: Math.min(contextMenu.y, window.innerHeight - 200),
                zIndex: 60,
              }}
              className="w-52 bg-white rounded-2xl shadow-xl border border-gray-100 py-1 overflow-hidden"
            >
              {/* Delete Chat */}
              {deleteConfirm === contextMenu.chat.user_id ? (
                <div className="px-4 py-3 space-y-2">
                  <p className="text-xs font-bold text-rose-600 text-center">Delete this chat?</p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleDeleteClick}
                      disabled={deleteMutation.isPending}
                      className="flex-1 py-2 bg-rose-600 text-white text-xs font-bold rounded-xl hover:bg-rose-700 disabled:opacity-50 transition-all"
                    >
                      {deleteMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin mx-auto" /> : 'Delete'}
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(null)}
                      className="flex-1 py-2 bg-gray-100 text-gray-700 text-xs font-bold rounded-xl hover:bg-gray-200 transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleDeleteClick}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-rose-600 hover:bg-rose-50 active:bg-rose-100 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Chat
                </button>
              )}

              <div className="border-t border-gray-50" />

              {/* Mark as Read / Unread */}
              {contextMenu.chat.unread_count > 0 ? (
                <button
                  onClick={() => readMutation.mutate({ userId: contextMenu.chat.user_id, markAsRead: true })}
                  disabled={readMutation.isPending}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors disabled:opacity-50"
                >
                  <CheckCheck className="w-4 h-4 text-gray-500" />
                  Mark as Read
                </button>
              ) : (
                <button
                  onClick={() => readMutation.mutate({ userId: contextMenu.chat.user_id, markAsRead: false })}
                  disabled={readMutation.isPending}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors disabled:opacity-50"
                >
                  <Circle className="w-4 h-4 text-gray-400" />
                  Mark as Unread
                </button>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Chat Modal */}
      <AnimatePresence>
        {selectedUser && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedUser(null)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 z-[60] bg-white rounded-t-[32px] md:rounded-[32px] md:shadow-2xl max-h-[85dvh] flex flex-col md:max-w-lg md:mx-auto md:bottom-10"
              style={{
                overscrollBehavior: 'contain',
                WebkitOverflowScrolling: 'touch',
                touchAction: 'pan-y',
              }}
            >
              <div className="sticky top-0 bg-white z-10 rounded-t-[32px] pt-4 pb-2 flex flex-col items-center">
                <div className="w-10 h-1 bg-gray-200 rounded-full" />
              </div>

              <div className="flex items-center justify-between px-5 pb-3 border-b border-gray-100">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-gray-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-base font-bold text-gray-900 truncate">
                      {selectedChat?.first_name || `User ${selectedUser}`}
                    </p>
                    {selectedChat?.username && (
                      <p className="text-xs text-gray-500 truncate">@{selectedChat.username}</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="p-2 bg-gray-100 rounded-full active:scale-90 transition-transform flex-shrink-0"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 min-h-0">
                {messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-sm text-gray-400">No messages yet</p>
                  </div>
                ) : (
                  messages.map(msg => (
                    <ChatBubble
                      key={msg.id}
                      message={msg}
                      isAdmin={msg.sender_type === 'admin'}
                      botId={Number(selectedBotId)}
                      botUsername={botUsername}
                    />
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="sticky bottom-0 bg-white border-t border-gray-100 px-5 py-3 pb-[calc(max(env(safe-area-inset-bottom),8px)+12px)]">
                <div className="flex items-end gap-2">
                  <div className="flex-1 relative">
                    <textarea
                      ref={inputRef}
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Type a message..."
                      rows={1}
                      className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none transition-all"
                      style={{ maxHeight: 120 }}
                    />
                  </div>
                  <button
                    onClick={handleSend}
                    disabled={!inputText.trim() || sendMutation.isPending}
                    className="w-11 h-11 bg-indigo-600 text-white rounded-2xl flex items-center justify-center hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-90 flex-shrink-0"
                  >
                    {sendMutation.isPending ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
