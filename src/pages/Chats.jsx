import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getChats, getChatMessages, sendChatMessage, deleteChat, markChatRead, markChatUnread,
  getWebVisitors, getWebVisitorMessages, sendWebVisitorMessage, deleteWebVisitor, toggleWebVisitorAI,
  markWebVisitorRead, markWebVisitorUnread } from '../api/chats';
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
  Brain,
  ImageUp,
  Globe,
  Smartphone,
} from 'lucide-react';
import { myanmarFormat } from '../utils/date';
import { motion, AnimatePresence } from 'motion/react';
import client from '../api/client';
import { useAuthStore } from '../store/authStore';

const fileTypeLabel = (type) => {
  const labels = { photo: 'Sent a photo', video: 'Sent a video', document: 'Sent a file', audio: 'Sent an audio', voice: 'Sent a voice message', sticker: 'Sent a sticker' };
  return labels[type] || 'Sent a file';
};

const lastMessageText = (msg, fileType) => {
  if (msg) return msg.length > 40 ? msg.slice(0, 40) + '...' : msg;
  if (fileType) return fileTypeLabel(fileType);
  return 'No messages';
};

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
              className="max-w-full rounded-lg max-h-64 object-cover select-none"
              loading="lazy"
              draggable={false}
              onContextMenu={(e) => e.preventDefault()}
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
            <div className="flex items-center gap-2 p-3 bg-white/10 rounded-xl">
              <FileText className="w-4 h-4 flex-shrink-0" />
              <p className="text-sm font-medium">Sent a video</p>
            </div>
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
      case 'document':
        return (
          <div className="mb-2">
            <div className="flex items-center gap-2 p-3 bg-white/10 rounded-xl">
              <FileText className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm font-medium">Document</p>
            </div>
            <a href={tgLink} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs font-bold mt-1.5 hover:underline"
              onClick={(e) => e.stopPropagation()}>
              Open in Telegram ↗
            </a>
          </div>
        );
      default:
        return (
          <div className="mb-2">
            <div className="flex items-center gap-2 p-3 bg-white/10 rounded-xl">
              <FileText className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm font-medium">{fileTypeLabel(message.file_type)}</p>
            </div>
            <a href={tgLink} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs font-bold mt-1.5 hover:underline"
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
          {myanmarFormat(message.created_at, 'h:mm a')}
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
                  {myanmarFormat(chat.last_time, 'MMM d')}
                </span>
              )}
            </div>
            <p className={`text-xs truncate mt-0.5 flex items-center gap-1 ${unread > 0 ? 'font-semibold text-gray-700' : 'text-gray-500'}`}>
              {chat.last_sender === 'admin' && <CheckCheck className="w-3 h-3 flex-shrink-0 text-indigo-400" />}
              {lastMessageText(chat.last_message, chat.last_file_type)}
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
  const [chatTab, setChatTab] = useState('telegram');
  const [selectedVisitor, setSelectedVisitor] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const menuRef = useRef(null);
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [unreadOverrides, setUnreadOverrides] = useState({});

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

  const { data: webVisitors = [] } = useQuery({
    queryKey: ['webVisitors', selectedBotId],
    queryFn: () => getWebVisitors(Number(selectedBotId)),
    enabled: !!selectedBotId && (chatTab === 'web' || chatTab === 'guest'),
    refetchInterval: 15000,
  });

  const { data: webMessages = [] } = useQuery({
    queryKey: ['webVisitorMessages', selectedBotId, selectedVisitor],
    queryFn: () => getWebVisitorMessages(selectedVisitor, Number(selectedBotId)),
    enabled: !!selectedBotId && !!selectedVisitor && (chatTab === 'web' || chatTab === 'guest'),
    refetchInterval: 10000,
  });

  // Apply local unread overrides on top of server data
  const displayedChats = useMemo(() =>
    chats.map(c => ({ ...c, unread_count: unreadOverrides[c.user_id] ?? c.unread_count })),
    [chats, unreadOverrides]
  );

  const displayedWebVisitors = useMemo(() =>
    webVisitors.map(v => ({ ...v, unread_count: unreadOverrides[v.visitor_id] ?? v.unread_count })),
    [webVisitors, unreadOverrides]
  );

  const sendMutation = useMutation({
    mutationFn: ({ userId, message, visitorId, fileId, fileType }) => {
      if (visitorId) return sendWebVisitorMessage(visitorId, Number(selectedBotId), message, fileId, fileType);
      return sendChatMessage(userId, Number(selectedBotId), message, fileId, fileType);
    },
    onSuccess: (_data, vars) => {
      if (vars.visitorId) {
        queryClient.invalidateQueries({ queryKey: ['webVisitorMessages', selectedBotId, vars.visitorId] });
        queryClient.invalidateQueries({ queryKey: ['webVisitors', selectedBotId] });
      } else {
        queryClient.invalidateQueries({ queryKey: ['chatMessages', selectedBotId, vars.userId] });
        queryClient.invalidateQueries({ queryKey: ['chats', selectedBotId] });
      }
      setInputText('');
    },
    onError: () => addToast('Failed to send message', 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: ({ userId, visitorId }) => {
      if (visitorId) return deleteWebVisitor(visitorId, Number(selectedBotId));
      return deleteChat(userId, Number(selectedBotId));
    },
    onSuccess: (_data, vars) => {
      if (vars.visitorId) {
        queryClient.invalidateQueries({ queryKey: ['webVisitors', selectedBotId] });
        setContextMenu(null);
        setDeleteConfirm(null);
        if (selectedVisitor === vars.visitorId) setSelectedVisitor(null);
      } else {
        queryClient.invalidateQueries({ queryKey: ['chats', selectedBotId] });
        setContextMenu(null);
        setDeleteConfirm(null);
        if (selectedUser === vars.userId) setSelectedUser(null);
      }
      addToast('Chat deleted');
    },
    onError: () => addToast('Failed to delete chat', 'error'),
  });

  const readMutation = useMutation({
    mutationFn: ({ userId, visitorId, markAsRead }) => {
      if (!markAsRead) {
        // "Mark as Unread" is local-only to avoid auto-mark-read reverting it
        return Promise.resolve();
      }
      if (visitorId) {
        return markWebVisitorRead(visitorId, Number(selectedBotId));
      }
      return markChatRead(userId, Number(selectedBotId));
    },
    onMutate: (vars) => {
      setContextMenu(null);
      const key = vars.userId ?? vars.visitorId;
      if (key) {
        setUnreadOverrides(prev => ({ ...prev, [key]: vars.markAsRead ? 0 : 1 }));
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chats', selectedBotId] });
      queryClient.invalidateQueries({ queryKey: ['webVisitors', selectedBotId] });
    },
    onError: (err) => {
      console.error('Mark read/unread failed:', err);
      queryClient.invalidateQueries({ queryKey: ['chats', selectedBotId] });
      queryClient.invalidateQueries({ queryKey: ['webVisitors', selectedBotId] });
    },
  });

  const toggleAiMutation = useMutation({
    mutationFn: ({ visitorId, disabled }) =>
      toggleWebVisitorAI(visitorId, Number(selectedBotId), disabled),
    onSuccess: (_data, vars) => {
      // Update cache immediately so UI reflects toggle without waiting for refetch
      queryClient.setQueryData(['webVisitors', selectedBotId], (old) =>
        old?.map(v => v.visitor_id === vars.visitorId ? { ...v, ai_disabled: vars.disabled } : v)
      );
      queryClient.invalidateQueries({ queryKey: ['webVisitors', selectedBotId] });
      queryClient.invalidateQueries({ queryKey: ['webVisitorMessages', selectedBotId, selectedVisitor] });
    },
    onError: () => addToast('Failed to toggle AI', 'error'),
  });

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

  const telegramUnread = displayedChats.reduce((sum, c) => sum + (c.unread_count || 0), 0);
  const webVisitorsWithUid = displayedWebVisitors.filter(v => v.firebase_uid);
  const webVisitorsGuest = displayedWebVisitors.filter(v => !v.firebase_uid);
  const websiteUnread = webVisitorsWithUid.reduce((sum, v) => sum + (v.unread_count || 0), 0);
  const guestUnread = webVisitorsGuest.reduce((sum, v) => sum + (v.unread_count || 0), 0);

  const filteredChats = displayedChats.filter(c => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      (c.first_name || '').toLowerCase().includes(term) ||
      c.user_id.toString().includes(term)
    );
  });

  const filteredWebVisitors = displayedWebVisitors.filter(v => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return v.name.toLowerCase().includes(term) || v.phone.includes(term);
  });

  const selectedChat = displayedChats.find(c => c.user_id === selectedUser);
  const selectedWebChat = displayedWebVisitors.find(v => v.visitor_id === selectedVisitor);
  const isWebTab = chatTab === 'web' || chatTab === 'guest';

  const handleSend = () => {
    const text = inputText.trim();
    if (!text || sendMutation.isPending) return;
    if (isWebTab && selectedVisitor) {
      sendMutation.mutate({ visitorId: selectedVisitor, message: text });
    } else {
      sendMutation.mutate({ userId: selectedUser, message: text });
    }
  };

  const handlePhotoSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !selectedBotId) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('bot_id', Number(selectedBotId));
      const res = await fetch(`${client.defaults.baseURL}/upload/image`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${useAuthStore.getState().token}` },
        body: formData,
      });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      const caption = inputText.trim();
      setInputText('');
      if (isWebTab && selectedVisitor) {
        sendMutation.mutate({ visitorId: selectedVisitor, message: caption, fileId: data.file_id, fileType: 'photo' });
      } else {
        sendMutation.mutate({ userId: selectedUser, message: caption, fileId: data.file_id, fileType: 'photo' });
      }
    } catch {
      addToast('Failed to upload photo', 'error');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
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
      const key = isWebTab ? contextMenu.chat.visitor_id : contextMenu.chat.user_id;
      setDeleteConfirm(key);
    } else {
      if (isWebTab) {
        deleteMutation.mutate({ visitorId: contextMenu.chat.visitor_id });
      } else {
        deleteMutation.mutate({ userId: contextMenu.chat.user_id });
      }
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

      {/* Tab switcher */}
      <div className="flex gap-1 bg-gray-100 rounded-2xl p-1 w-full">
        <button
          onClick={() => { setChatTab('telegram'); setSelectedUser(null); setSelectedVisitor(null); setSearch(''); }}
          className={`flex-1 px-1.5 py-2 rounded-xl text-[11px] sm:text-sm font-bold transition-all flex items-center justify-center gap-1 whitespace-nowrap ${
            chatTab === 'telegram' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Smartphone className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" />
          Telegram
          {telegramUnread > 0 && (
            <span className="bg-red-500 text-white text-[10px] font-bold leading-none px-1.5 py-1 rounded-full min-w-[18px] text-center">
              {telegramUnread > 99 ? '99+' : telegramUnread}
            </span>
          )}
        </button>
        <button
          onClick={() => { setChatTab('web'); setSelectedUser(null); setSelectedVisitor(null); setSearch(''); }}
          className={`flex-1 px-1.5 py-2 rounded-xl text-[11px] sm:text-sm font-bold transition-all flex items-center justify-center gap-1 whitespace-nowrap ${
            chatTab === 'web' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Globe className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" />
          Website
          {websiteUnread > 0 && (
            <span className="bg-red-500 text-white text-[10px] font-bold leading-none px-1.5 py-1 rounded-full min-w-[18px] text-center">
              {websiteUnread > 99 ? '99+' : websiteUnread}
            </span>
          )}
        </button>
        <button
          onClick={() => { setChatTab('guest'); setSelectedUser(null); setSelectedVisitor(null); setSearch(''); }}
          className={`flex-1 px-1.5 py-2 rounded-xl text-[11px] sm:text-sm font-bold transition-all flex items-center justify-center gap-1 whitespace-nowrap ${
            chatTab === 'guest' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <User className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" />
          Guest
          {guestUnread > 0 && (
            <span className="bg-red-500 text-white text-[10px] font-bold leading-none px-1.5 py-1 rounded-full min-w-[18px] text-center">
              {guestUnread > 99 ? '99+' : guestUnread}
            </span>
          )}
        </button>
      </div>

      {chatTab === 'telegram' ? (
        filteredChats.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-gray-200">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageCircle className="w-8 h-8 text-gray-300" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">No conversations yet</h3>
            <p className="text-sm text-gray-500 max-w-xs mx-auto mt-1">
              {search ? 'Try a different search term.' : 'When users message the bot, their conversations will appear here.'}
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
                  setUnreadOverrides(prev => { const n = {...prev}; delete n[chat.user_id]; return n; });
                }}
                onContextMenu={handleContextMenu}
              />
            ))}
          </div>
        )
      ) : (
        <>
          {(chatTab === 'web' ? filteredWebVisitors.filter(v => v.firebase_uid) : filteredWebVisitors.filter(v => !v.firebase_uid)).length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-gray-200">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="w-8 h-8 text-gray-300" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">
                {chatTab === 'web' ? 'No website visitors yet' : 'No guest visitors yet'}
              </h3>
              <p className="text-sm text-gray-500 max-w-xs mx-auto mt-1">
                {chatTab === 'guest' ? 'Guest visitors who chat from the web shop will appear here.' : 'Signed-in users who chat from the web shop will appear here.'}
              </p>
            </div>
          ) : (
            <div className="grid gap-2" onContextMenu={(e) => e.preventDefault()}>
              {(chatTab === 'web' ? filteredWebVisitors.filter(v => v.firebase_uid) : filteredWebVisitors.filter(v => !v.firebase_uid)).map(v => (
                <div key={v.visitor_id} className="relative group">
                  <button
                    onClick={() => {
                      setSelectedVisitor(v.visitor_id);
                      setUnreadOverrides(prev => { const n = {...prev}; delete n[v.visitor_id]; return n; });
                    }}
                    onContextMenu={(e) => handleContextMenu(e, v)}
                    className={`w-full text-left p-3 rounded-2xl transition-all active:scale-[0.98] ${
                      selectedVisitor === v.visitor_id
                        ? 'bg-indigo-50 border border-indigo-100'
                        : 'bg-white border border-transparent hover:border-gray-200'
                    } ${v.unread_count > 0 ? 'bg-indigo-50/50' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                        <User className="w-5 h-5 text-gray-500" />
                        {v.unread_count > 0 && (
                          <div className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-rose-500 rounded-full flex items-center justify-center">
                            <span className="text-[8px] font-bold text-white">{v.unread_count > 9 ? '9+' : v.unread_count}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className={`text-sm truncate ${v.unread_count > 0 ? 'font-extrabold' : 'font-bold'} text-gray-900`}>
                            {v.name}
                          </p>
                          {v.last_time && (
                            <span className="text-[10px] text-gray-400 flex-shrink-0">
                              {myanmarFormat(v.last_time, 'MMM d')}
                            </span>
                          )}
                        </div>
                        <p className={`text-xs truncate mt-0.5 ${v.unread_count > 0 ? 'font-semibold text-gray-700' : 'text-gray-500'}`}>
                          {(v.last_message || '').length > 40 ? (v.last_message || '').slice(0, 40) + '...' : lastMessageText(v.last_message, v.last_file_type)}
                        </p>
                        {v.phone && <p className="text-[10px] text-gray-400 mt-0.5">{v.phone}</p>}
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0 hidden sm:block" />
                    </div>
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

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
              {deleteConfirm === (contextMenu.chat.visitor_id || contextMenu.chat.user_id) ? (
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

              {contextMenu.chat.unread_count > 0 ? (
                <button
                  onClick={() => readMutation.mutate({
                    userId: contextMenu.chat.user_id,
                    visitorId: contextMenu.chat.visitor_id,
                    markAsRead: true
                  })}
                  disabled={readMutation.isPending}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors disabled:opacity-50"
                >
                  <CheckCheck className="w-4 h-4 text-gray-500" />
                  Mark as Read
                </button>
              ) : (
                <button
                  onClick={() => readMutation.mutate({
                    userId: contextMenu.chat.user_id,
                    visitorId: contextMenu.chat.visitor_id,
                    markAsRead: false
                  })}
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

      <AnimatePresence>
        {(selectedUser || selectedVisitor) && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setSelectedUser(null); setSelectedVisitor(null); }}
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
                      {selectedWebChat?.name || selectedChat?.first_name || `User ${selectedUser}`}
                    </p>
                    {selectedChat?.username && (
                      <p className="text-xs text-gray-500 truncate">@{selectedChat.username}</p>
                    )}
                    {selectedWebChat?.phone && (
                      <p className="text-xs text-gray-500 truncate">{selectedWebChat.phone}</p>
                    )}
                  </div>
                </div>
                {selectedWebChat && (
                  <div className="flex items-center gap-1.5">
                    <div className="flex flex-col items-center">
                      <button
                        onClick={() => toggleAiMutation.mutate({ visitorId: selectedVisitor, disabled: !selectedWebChat.ai_disabled })}
                        disabled={toggleAiMutation.isPending}
                        className={`p-2 rounded-full active:scale-90 transition-all flex-shrink-0 ${
                          selectedWebChat.ai_disabled ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
                        }`}
                      >
                        <Brain className="w-5 h-5" />
                      </button>
                      <span className={`text-[9px] font-bold uppercase tracking-wider mt-0.5 ${
                        selectedWebChat.ai_disabled ? 'text-red-500' : 'text-green-500'
                      }`}>
                        {selectedWebChat.ai_disabled ? 'Off' : 'AI Mode'}
                      </span>
                    </div>
                  </div>
                )}
                <button
                  onClick={() => { setSelectedUser(null); setSelectedVisitor(null); }}
                  className="p-2 bg-gray-100 rounded-full active:scale-90 transition-transform flex-shrink-0"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto overflow-x-hidden px-5 py-4 space-y-3 min-h-0 [overflow-wrap:anywhere]">
                {(() => {
                  const msgs = selectedVisitor ? webMessages : messages;
                  return msgs.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-sm text-gray-400">No messages yet</p>
                    </div>
                  ) : (
                    msgs.map(msg => (
                      <ChatBubble
                        key={msg.id}
                        message={msg}
                        isAdmin={msg.sender_type === 'admin'}
                        botId={Number(selectedBotId)}
                        botUsername={botUsername}
                      />
                    ))
                  );
                })()}
                <div ref={messagesEndRef} />
              </div>

              <div className="sticky bottom-0 bg-white border-t border-gray-100 px-5 py-3 pb-[calc(max(env(safe-area-inset-bottom),8px)+12px)]">
                <div className="flex items-end gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoSelect}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading || sendMutation.isPending}
                    className="w-10 h-10 bg-gray-100 text-gray-500 rounded-2xl flex items-center justify-center hover:bg-gray-200 disabled:opacity-40 transition-all active:scale-90 flex-shrink-0"
                    title="Send photo"
                  >
                    {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageUp className="w-4 h-4" />}
                  </button>
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
