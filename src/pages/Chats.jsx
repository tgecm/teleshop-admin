import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { getChats, getChatMessages, sendChatMessage, deleteChat, markChatRead, markChatUnread,
  getWebVisitors, getWebVisitorMessages, sendWebVisitorMessage, deleteWebVisitor, toggleWebVisitorAI,
  markWebVisitorRead, markWebVisitorUnread, initiateWebVisitorChat, getWebsiteCustomersForChat, updateChatMetadata } from '../api/chats';
import { useBotStore } from '../store/botStore';
import { useToastStore } from '../store/toastStore';
import ErrorBoundary from '../components/shared/ErrorBoundary';
import ConfirmDialog from '../components/shared/ConfirmDialog';
import FullScreenImageViewer from '../components/shared/FullScreenImageViewer';
import {
  Search,
  MessageCircle,
  Send,
  X,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
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
  BadgeCheck,
  Plus,
  UserPlus,
  Pin,
  PinOff,
  CheckCircle2,
  Clock,
  CreditCard,
  Ban,
  VolumeX,
  Volume2,
  Filter,
  Bot,
  Smile,
  Maximize2,
} from 'lucide-react';
import { myanmarFormat } from '../utils/date';
import { MarkdownRenderer } from '../utils/linkify';
import { RichMessage } from '../components/chat/RichMessage';
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

const FILE_SIZE_LIMIT = 5 * 1024 * 1024; // 5MB

function DocumentItem({ fileUrl, tgLink, isAdmin, showTelegramLink }) {
  const [size, setSize] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    fetch(fileUrl, { method: 'HEAD', signal: controller.signal })
      .then(r => {
        const len = parseInt(r.headers.get('content-length') || '0', 10);
        if (!cancelled) { setSize(len); setChecking(false); }
      })
      .catch(() => { if (!cancelled) { setSize(0); setChecking(false); } });
    return () => { cancelled = true; controller.abort(); };
  }, [fileUrl]);

  if (checking) {
    return (
      <div className="mb-2">
        <div className="flex items-center gap-2 p-3 bg-white/10 rounded-xl">
          <Loader2 className="w-5 h-5 flex-shrink-0 animate-spin" />
          <p className="text-sm font-medium">Checking file...</p>
        </div>
      </div>
    );
  }

  // If under 5MB, render as audio player
  if (size < FILE_SIZE_LIMIT) {
    return (
      <div className={`mb-2 rounded-xl p-3 ${isAdmin ? 'bg-indigo-500/30' : 'bg-white/60'}`}>
        <div className="flex items-center gap-3 mb-2">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${isAdmin ? 'bg-indigo-400/30' : 'bg-gray-200'}`}>
            <Headphones className={`w-5 h-5 ${isAdmin ? 'text-indigo-200' : 'text-gray-600'}`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-bold ${isAdmin ? 'text-white' : 'text-gray-900'}`}>
              Voice Message
            </p>
          </div>
        </div>
        <audio src={fileUrl} controls controlsList="nodownload" className="w-full h-9" preload="auto">
          <source src={fileUrl} type="audio/mpeg" />
          <source src={fileUrl} />
        </audio>
      </div>
    );
  }

  // Over 5MB, show as document
  return (
    <div className="mb-2">
      <div className="flex items-center gap-2 p-3 bg-white/10 rounded-xl">
        <FileText className="w-5 h-5 flex-shrink-0" />
        <p className="text-sm font-medium">Document</p>
      </div>
      {showTelegramLink && (
        <a href={tgLink} target="_blank" rel="noreferrer"
          className="inline-flex items-center gap-1 text-xs font-bold mt-1.5 hover:underline"
          onClick={(e) => e.stopPropagation()}>
          Open in Telegram ↗
        </a>
      )}
    </div>
  );
}

function ChatBubble({ message, isAdmin, isAi, isFollowup, botId, botUsername, showTelegramLink, onImageClick }) {
  const token = useAuthStore(s => s.token);
  const currentUser = useAuthStore(s => s.user);
  const isOwner = currentUser?.is_superadmin;
  const copyTimerRef = useRef(null);
  const touchCopiedRef = useRef(false);
  const msgRef = useRef(null);
  const isRightSide = isAdmin || isAi || isFollowup;

  const txt = message.message_text || '';
  const isAction = txt.startsWith('__action__') || txt.startsWith('__form__') || txt.startsWith('__file__');
  const hasComponents = txt.includes('<!--C');
  const stripComponents = (t) => typeof t === 'string' ? t.replace(/<!--C[\s\S]*?<!--C-->/g, '').trim() : t;
  if (isAction) return null;

  const renderMedia = () => {
    if (!message.file_id) return null;
    const effectiveBotId = message.bot_id || botId;
    const fileUrl = `${client.defaults.baseURL}/telegram/file/${message.file_id}?bot_id=${effectiveBotId}&token=${token}`;
    const tgLink = botUsername ? `https://t.me/${botUsername}` : '#';

    switch (message.file_type) {
      case 'photo':
        return (
          <div className="mb-2">
            <div
              className="relative group cursor-pointer overflow-hidden rounded-lg"
              onClick={() => onImageClick?.(fileUrl)}
            >
              <img
                src={fileUrl}
                alt="Photo"
                className="max-w-full rounded-lg max-h-64 object-cover select-none cursor-pointer hover:opacity-95 transition-all shadow-sm group-hover:scale-[1.01]"
                loading="lazy"
                draggable={false}
                onContextMenu={(e) => e.preventDefault()}
              />
              <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center pointer-events-none">
                <span className="bg-black/75 backdrop-blur-md text-white text-xs font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg">
                  <Maximize2 className="w-3.5 h-3.5" /> Tap for Full Screen
                </span>
              </div>
            </div>
            {showTelegramLink && (
              <a href={tgLink} target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs font-bold mt-1.5 hover:underline"
                onClick={(e) => e.stopPropagation()}>
                Open in Telegram ↗
              </a>
            )}
          </div>
        );
      case 'video':
        return (
          <div className="mb-2">
            <div className="flex items-center gap-2 p-3 bg-white/10 rounded-xl">
              <FileText className="w-4 h-4 flex-shrink-0" />
              <p className="text-sm font-medium">Sent a video</p>
            </div>
            {showTelegramLink && (
              <a href={tgLink} target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs font-bold mt-1.5 hover:underline"
                onClick={(e) => e.stopPropagation()}>
                Open in Telegram ↗
              </a>
            )}
          </div>
        );
      case 'audio':
      case 'voice':
        return (
          <div className={`mb-2 rounded-xl p-3 ${isRightSide ? 'bg-indigo-500/30' : 'bg-white/60'}`}>
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${isRightSide ? 'bg-indigo-400/30' : 'bg-gray-200'}`}>
                <Headphones className={`w-5 h-5 ${isRightSide ? 'text-indigo-200' : 'text-gray-600'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-bold ${isRightSide ? 'text-white' : 'text-gray-900'}`}>
                  {message.file_type === 'voice' ? 'Voice Message' : 'Audio'}
                </p>
              </div>
              {showTelegramLink && (
                <a href={fileUrl} target="_blank" rel="noreferrer"
                  className={`text-[10px] font-bold hover:underline flex-shrink-0 ${isRightSide ? 'text-indigo-200' : 'text-indigo-600'}`}
                  onClick={(e) => e.stopPropagation()}>
                  Open ↗
                </a>
              )}
            </div>
            <audio src={fileUrl} controls controlsList="nodownload" className="w-full h-9" preload="auto">
              <source src={fileUrl} type="audio/mpeg" />
              <source src={fileUrl} type="audio/ogg" />
              <source src={fileUrl} />
            </audio>
          </div>
        );
      case 'sticker':
        return (
          <div className="mb-2">
            <div
              className="relative group cursor-pointer"
              onClick={() => onImageClick?.(fileUrl)}
            >
              <img
                src={fileUrl}
                alt="Sticker"
                className="max-w-[160px] max-h-[160px] object-contain select-none filter drop-shadow-sm cursor-pointer hover:scale-105 transition-transform"
                loading="lazy"
                draggable={false}
                onContextMenu={(e) => e.preventDefault()}
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  if (e.currentTarget.nextSibling) {
                    e.currentTarget.nextSibling.style.display = 'flex';
                  }
                }}
              />
            </div>
            <div className="hidden items-center gap-2 p-3 bg-white/10 rounded-xl">
              <Smile className="w-4 h-4 flex-shrink-0" />
              <p className="text-sm font-medium">Sticker</p>
            </div>
            {showTelegramLink && (
              <a href={tgLink} target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs font-bold mt-1.5 hover:underline"
                onClick={(e) => e.stopPropagation()}>
                Open in Telegram ↗
              </a>
            )}
          </div>
        );

      case 'document':
        return <DocumentItem fileUrl={fileUrl} tgLink={tgLink} isAdmin={isRightSide} showTelegramLink={showTelegramLink} />;
      default:
        return (
          <div className="mb-2">
            <div className="flex items-center gap-2 p-3 bg-white/10 rounded-xl">
              <FileText className="w-4 h-4 flex-shrink-0" />
              <p className="text-sm font-medium">File</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div
      className={`flex ${
        isRightSide ? 'justify-end' : 'justify-start'
      }`}
    >
      <div
        className={`max-w-[85%] sm:max-w-[75%] rounded-3xl p-3 sm:p-4 shadow-sm transition-all ${
          isAi
            ? 'bg-indigo-50 text-indigo-900 border border-indigo-200 rounded-br-md'
            : isAdmin
              ? 'bg-indigo-600 text-white rounded-br-md'
              : 'bg-gray-100 text-gray-900 rounded-bl-md'
        }`}
      >
        {renderMedia()}
        {isFollowup || message.sender_type === 'followup' ? (
          <p className="text-[10px] font-bold text-indigo-400 mb-0.5">AI Follow-Up</p>
        ) : isAi || message.sender_type === 'ai' || message.sender_type === 'assistant' ? (
          <p className="text-[10px] font-bold text-indigo-400 mb-0.5">AI</p>
        ) : null}
        {isAdmin && message.sender_name && isOwner && (
          <p className="text-[10px] font-bold text-indigo-200 mb-0.5">{message.sender_name}</p>
        )}
        {message.message_text && (hasComponents ? (
          <div ref={msgRef} className="text-sm leading-relaxed break-words select-all cursor-text"
            onContextMenu={(e) => {
              if (touchCopiedRef.current) { touchCopiedRef.current = false; return; }
              e.preventDefault();
              e.stopPropagation();
              navigator.clipboard.writeText(stripComponents(message.message_text));
              useToastStore.getState().addToast('Copied', 'success');
            }}
            onTouchStart={() => {
              copyTimerRef.current = setTimeout(() => {
                touchCopiedRef.current = true;
                navigator.clipboard.writeText(stripComponents(message.message_text));
                useToastStore.getState().addToast('Copied', 'success');
                setTimeout(() => { touchCopiedRef.current = false; }, 200);
              }, 500);
            }}
            onTouchEnd={() => {
              if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
            }}
            onTouchMove={() => {
              if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
            }}>
            <RichMessage content={message.message_text} isAssistant={isAi} isAdmin={isAdmin} botId={botId} />
          </div>
        ) : (
          <div ref={msgRef} className="text-sm leading-relaxed whitespace-pre-wrap break-words select-all cursor-text"
            onContextMenu={(e) => {
              if (touchCopiedRef.current) { touchCopiedRef.current = false; return; }
              e.preventDefault();
              e.stopPropagation();
              navigator.clipboard.writeText(stripComponents(message.message_text));
              useToastStore.getState().addToast('Copied', 'success');
            }}
            onTouchStart={() => {
              copyTimerRef.current = setTimeout(() => {
                touchCopiedRef.current = true;
                navigator.clipboard.writeText(stripComponents(message.message_text));
                useToastStore.getState().addToast('Copied', 'success');
                setTimeout(() => { touchCopiedRef.current = false; }, 200);
              }, 500);
            }}
            onTouchEnd={() => {
              if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
            }}
            onTouchMove={() => {
              if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
            }}>
            <ErrorBoundary fallback={<span className="text-sm leading-relaxed whitespace-pre-wrap break-words">{message.message_text}</span>}>
              <MarkdownRenderer isAdmin={isAdmin} isAssistant={isAi}>{message.message_text}</MarkdownRenderer>
            </ErrorBoundary>
          </div>
        ))}
        <p
          className={`text-[10px] mt-1 ${
            isAi ? 'text-indigo-400' : isAdmin ? 'text-indigo-200' : 'text-gray-400'
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
          <div className="relative w-10 h-10 flex-shrink-0">
            <CustomerAvatar photoUrl={chat.profile_picture || chat.photo_url} name={chat.first_name || chat.account_name} size="w-10 h-10" fontSize="text-sm" />
            {unread > 0 && (
              <div className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-rose-500 rounded-full flex items-center justify-center shadow-xs z-10">
                <span className="text-[8px] font-bold text-white">{unread > 9 ? '9+' : unread}</span>
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <p className={`text-sm truncate ${unread > 0 ? 'font-extrabold text-gray-900' : 'font-bold text-gray-900'} flex items-center gap-1.5`}>
                {chat.is_pinned && <Pin className="w-3.5 h-3.5 text-amber-500 fill-amber-400 flex-shrink-0" title="Pinned" />}
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
            {(chat.is_done || chat.payment_status === 'paid' || chat.payment_status === 'pending' || chat.is_blocked || chat.is_muted) && (
              <div className="flex items-center gap-1.5 flex-wrap mt-1">
                {chat.is_done && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Done
                  </span>
                )}
                {chat.payment_status === 'paid' && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-green-50 text-green-700 text-[10px] font-bold border border-green-200">
                    <CreditCard className="w-3 h-3 text-green-600" /> Paid
                  </span>
                )}
                {chat.payment_status === 'pending' && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 text-[10px] font-bold border border-amber-200">
                    <Clock className="w-3 h-3 text-amber-600" /> Pending
                  </span>
                )}
                {chat.is_blocked && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-rose-50 text-rose-700 text-[10px] font-bold border border-rose-200">
                    <Ban className="w-3 h-3 text-rose-600" /> Blocked
                  </span>
                )}
                {chat.is_muted && (
                  <VolumeX className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" title="Muted" />
                )}
              </div>
            )}
          </div>
          <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0 hidden sm:block" />
        </div>
      </button>
    </div>
  );
}

function CustomerAvatar({ photoUrl, name, size = "w-9 h-9", fontSize = "text-sm" }) {
  const [imgError, setImgError] = useState(false);
  const initial = (name || 'C').trim().charAt(0).toUpperCase();

  useEffect(() => {
    setImgError(false);
  }, [photoUrl]);

  const getFullPhotoUrl = (url) => {
    if (!url) return null;
    const cleanUrl = String(url).trim();
    if (!cleanUrl) return null;
    if (cleanUrl.startsWith('data:') || cleanUrl.startsWith('blob:')) {
      return cleanUrl;
    }
    if (cleanUrl.includes('http://') || cleanUrl.includes('https://')) {
      const idx = cleanUrl.lastIndexOf('http');
      return cleanUrl.substring(idx);
    }
    const base = (client.defaults.baseURL || 'https://api.telegramecommerce.shop').replace(/\/+$/, '');
    const path = cleanUrl.replace(/^\/+/, '');
    return `${base}/${path}`;
  };

  const fullUrl = getFullPhotoUrl(photoUrl);

  if (fullUrl && !imgError) {
    return (
      <div className={`${size} rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold ${fontSize} flex-shrink-0 select-none border border-indigo-200/50 shadow-xs relative overflow-hidden`}>
        <span className="z-0">{initial}</span>
        <img
          src={fullUrl}
          alt={name || ''}
          onError={() => setImgError(true)}
          className="absolute inset-0 w-full h-full rounded-full object-cover z-10 bg-gradient-to-br from-indigo-500 to-purple-600"
        />
      </div>
    );
  }

  return (
    <div className={`${size} rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold ${fontSize} flex-shrink-0 select-none border border-indigo-200/50 shadow-xs`}>
      {initial}
    </div>
  );
}

function WebVisitorItem({ v, isSelected, onClick, onContextMenu }) {
  return (
    <div className="relative group">
      <button
        onClick={onClick}
        onContextMenu={(e) => onContextMenu(e, v)}
        className={`w-full text-left p-3 rounded-2xl transition-all active:scale-[0.98] ${
          isSelected
            ? 'bg-indigo-50 border border-indigo-100'
            : 'bg-white border border-transparent hover:border-gray-200'
        } ${v.unread_count > 0 ? 'bg-indigo-50/50' : ''}`}
      >
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 flex-shrink-0">
            {v.name === 'E-commerce Support' ? (
              <img src="/logo.webp" alt="Support" className="w-10 h-10 rounded-full object-cover border border-indigo-100" />
            ) : (
              <CustomerAvatar photoUrl={v.photo_url} name={v.name} size="w-10 h-10" fontSize="text-sm" />
            )}
            {v.unread_count > 0 && (
              <div className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-rose-500 rounded-full flex items-center justify-center shadow-xs z-10">
                <span className="text-[8px] font-bold text-white">{v.unread_count > 9 ? '9+' : v.unread_count}</span>
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <p className={`text-sm truncate ${v.unread_count > 0 ? 'font-extrabold' : 'font-bold'} text-gray-900 flex items-center gap-1.5`}>
                {v.is_pinned && <Pin className="w-3.5 h-3.5 text-amber-500 fill-amber-400 flex-shrink-0" title="Pinned" />}
                {v.name === 'E-commerce Support' ? <>E-commerce Support<BadgeCheck className="w-4 h-4 fill-blue-600 text-white flex-shrink-0" /></> : v.name}
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
            {(v.is_done || v.payment_status === 'paid' || v.payment_status === 'pending' || v.is_blocked || v.is_muted) && (
              <div className="flex items-center gap-1.5 flex-wrap mt-1">
                {v.is_done && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Done
                  </span>
                )}
                {v.payment_status === 'paid' && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-green-50 text-green-700 text-[10px] font-bold border border-green-200">
                    <CreditCard className="w-3 h-3 text-green-600" /> Paid
                  </span>
                )}
                {v.payment_status === 'pending' && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 text-[10px] font-bold border border-amber-200">
                    <Clock className="w-3 h-3 text-amber-600" /> Pending
                  </span>
                )}
                {v.is_blocked && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-rose-50 text-rose-700 text-[10px] font-bold border border-rose-200">
                    <Ban className="w-3 h-3 text-rose-600" /> Blocked
                  </span>
                )}
                {v.is_muted && (
                  <VolumeX className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" title="Muted" />
                )}
              </div>
            )}
          </div>
          <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0 hidden sm:block" />
        </div>
      </button>
    </div>
  );
}

export default function Chats() {
  const location = useLocation();
  const { selectedBotId, bots } = useBotStore();
  const botUsername = bots.find(b => b.id === Number(selectedBotId))?.bot_username;
  const { addToast } = useToastStore();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'read' | 'unread' | 'done' | 'pending' | 'paid' | 'blocked' | 'muted'
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const filterRef = useRef(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [inputText, setInputText] = useState('');
  const [contextMenu, setContextMenu] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [chatToDelete, setChatToDelete] = useState(null);
  const [chatTab, setChatTab] = useState('all');
  const [fullScreenImg, setFullScreenImg] = useState(null);

  useEffect(() => {
    const mainEl = document.querySelector('main');
    if (mainEl) {
      mainEl.scrollTop = 0;
      window.scrollTo(0, 0);
      const prevOverflow = mainEl.style.overflow;
      const prevMaxWidth = mainEl.style.maxWidth;
      mainEl.style.overflow = 'hidden';
      mainEl.style.maxWidth = 'none';
      return () => {
        mainEl.style.overflow = prevOverflow;
        mainEl.style.maxWidth = prevMaxWidth;
      };
    }
  }, []);

  const deleteMutation = useMutation({
    mutationFn: async ({ userId, visitorId }) => {
      const promises = [];
      const targetVisitorId = visitorId || (userId ? String(userId) : null);
      if (targetVisitorId) promises.push(deleteWebVisitor(targetVisitorId, Number(selectedBotId)).catch(() => {}));
      if (userId) promises.push(deleteChat(userId, Number(selectedBotId)).catch(() => {}));
      await Promise.all(promises);
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['chats', selectedBotId] });
      queryClient.invalidateQueries({ queryKey: ['webVisitors', selectedBotId] });
      setContextMenu(null);
      setDeleteConfirm(null);
      setChatToDelete(null);
      if (vars.visitorId && selectedVisitor === vars.visitorId) setSelectedVisitor(null);
      if (vars.userId && selectedUser === vars.userId) setSelectedUser(null);
      addToast('Chat deleted');
    },
    onError: () => addToast('Failed to delete chat', 'error'),
  });
  const [selectedVisitor, setSelectedVisitor] = useState(null);
  const [showStartChatModal, setShowStartChatModal] = useState(false);
  const [startChatSearch, setStartChatSearch] = useState('');

  const [selectedChatName, setSelectedChatName] = useState(null);

  useEffect(() => {
    if (!showFilterMenu) return;
    const handle = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target)) {
        setShowFilterMenu(false);
      }
    };
    document.addEventListener('pointerdown', handle);
    return () => document.removeEventListener('pointerdown', handle);
  }, [showFilterMenu]);

  useEffect(() => {
    if (location.state?.visitorId) {
      setChatTab(location.state.tab || 'web');
      setSelectedVisitor(location.state.visitorId);
      setSelectedUser(null);
      if (location.state.name) setSelectedChatName(location.state.name);
      window.history.replaceState({}, document.title);
    } else if (location.state?.userId) {
      setChatTab(location.state.tab || 'telegram');
      setSelectedUser(location.state.userId);
      setSelectedVisitor(null);
      if (location.state.name) setSelectedChatName(location.state.name);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const getCustomerDisplayName = (cust) => {
    if (!cust) return 'Website Customer';
    const name = (cust.name || '').trim();
    if (name && name !== 'Website Customer' && name !== 'Shop Visitor' && name !== 'User') {
      return name;
    }
    if (cust.email && cust.email.includes('@')) {
      const handle = cust.email.split('@')[0];
      return handle.replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    }
    return 'Website Customer';
  };

  const { data: websiteCustomers = [], isLoading: loadingWebCust } = useQuery({
    queryKey: ['websiteCustomers', selectedBotId],
    queryFn: () => getWebsiteCustomersForChat(Number(selectedBotId)),
    enabled: !!selectedBotId && showStartChatModal,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const initiateChatMutation = useMutation({
    mutationFn: (payload) => initiateWebVisitorChat(Number(selectedBotId), payload),
    onSuccess: (data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['webVisitors', selectedBotId] });
      setChatTab('web');
      setSelectedVisitor(data.visitor_id);
      setSelectedUser(null);
      setShowStartChatModal(false);
      addToast(`Chat thread opened with ${vars.name || 'Website Customer'}`);
    },
    onError: () => addToast('Failed to start chat session', 'error'),
  });

  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const [userScrolledUp, setUserScrolledUp] = useState(false);

  const handleChatScroll = useCallback(() => {
    const el = chatContainerRef.current;
    if (!el) return;
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    setUserScrolledUp(!isNearBottom);
  }, []);

  const scrollToBottom = useCallback(() => {
    const el = chatContainerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    setUserScrolledUp(false);
  }, []);

  const inputRef = useRef(null);
  const menuRef = useRef(null);
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [unreadOverrides, setUnreadOverrides] = useState({});

  const prevChatsRef = useRef([]);
  const prevMessagesRef = useRef([]);
  const initialScrollDone = useRef(false);
  const prevWebVisitorsRef = useRef([]);
  const prevWebMessagesRef = useRef([]);

  const { data: chats = [], isFetching } = useQuery({
    queryKey: ['chats', selectedBotId],
    queryFn: () => getChats(Number(selectedBotId)),
    enabled: !!selectedBotId,
    refetchInterval: 15000,
    placeholderData: keepPreviousData,
  });
  if (chats.length > 0) prevChatsRef.current = chats;
  const stableChats = isFetching && chats.length === 0 ? prevChatsRef.current : chats;

  const { data: messages = [] } = useQuery({
    queryKey: ['chatMessages', selectedBotId, selectedUser],
    queryFn: () => getChatMessages(selectedUser, Number(selectedBotId)),
    enabled: !!selectedBotId && !!selectedUser,
    refetchInterval: 15000,
    placeholderData: keepPreviousData,
  });
  if (messages.length > 0) prevMessagesRef.current = messages;
  const stableMessages = isFetching && messages.length === 0 ? prevMessagesRef.current : messages;

  const { data: webVisitors = [] } = useQuery({
    queryKey: ['webVisitors', selectedBotId],
    queryFn: () => getWebVisitors(Number(selectedBotId)),
    enabled: !!selectedBotId && (chatTab === 'all' || chatTab === 'web' || chatTab === 'guest'),
    refetchInterval: 15000,
  });
  const stableWebVisitors = webVisitors;

  const { data: webMessages = [] } = useQuery({
    queryKey: ['webVisitorMessages', selectedBotId, selectedVisitor],
    queryFn: () => getWebVisitorMessages(selectedVisitor, Number(selectedBotId)),
    enabled: !!selectedBotId && !!selectedVisitor && (chatTab === 'all' || chatTab === 'web' || chatTab === 'guest'),
    refetchInterval: 15000,
  });

  useEffect(() => {
    prevWebMessagesRef.current = [];
    initialScrollDone.current = false;
    setUserScrolledUp(false);
  }, [selectedUser, selectedVisitor]);

  const stableWebMessages = webMessages;

  const activeMsgs = selectedVisitor ? webMessages : messages;

  useEffect(() => {
    const el = chatContainerRef.current;
    if (!el || activeMsgs.length === 0) return;
    if (!initialScrollDone.current) {
      initialScrollDone.current = true;
      el.scrollTop = el.scrollHeight;
    } else if (!userScrolledUp) {
      el.scrollTop = el.scrollHeight;
    }
  }, [activeMsgs, userScrolledUp, selectedVisitor]);

  const displayedChats = useMemo(() =>
    stableChats.map(c => {
      const isCurrentlySelected = selectedUser && String(selectedUser) === String(c.user_id);
      let unread = c.unread_count;
      if (isCurrentlySelected) {
        unread = 0;
      } else if (unreadOverrides[c.user_id] !== undefined && c.unread_count === 0) {
        unread = unreadOverrides[c.user_id];
      }
      return { ...c, unread_count: unread };
    }),
    [stableChats, unreadOverrides, selectedUser]
  );

  const displayedWebVisitors = useMemo(() =>
    stableWebVisitors.map(v => {
      const isCurrentlySelected = selectedVisitor && (String(selectedVisitor) === String(v.visitor_id) || String(selectedVisitor) === String(v.customer_key));
      let unread = v.unread_count;
      if (isCurrentlySelected) {
        unread = 0;
      } else if (unreadOverrides[v.visitor_id] !== undefined && v.unread_count === 0) {
        unread = unreadOverrides[v.visitor_id];
      }
      return { ...v, unread_count: unread };
    }),
    [stableWebVisitors, unreadOverrides, selectedVisitor]
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

  const readMutation = useMutation({
    mutationFn: async ({ userId, visitorId, markAsRead }) => {
      const targetVisitorId = visitorId || (userId ? String(userId) : null);
      if (!markAsRead) {
        const promises = [];
        if (targetVisitorId) promises.push(markWebVisitorUnread(targetVisitorId, Number(selectedBotId)).catch(() => {}));
        if (userId) promises.push(markChatUnread(userId, Number(selectedBotId)).catch(() => {}));
        await Promise.all(promises);
        return;
      }
      const promises = [];
      if (targetVisitorId) promises.push(markWebVisitorRead(targetVisitorId, Number(selectedBotId)).catch(() => {}));
      if (userId) promises.push(markChatRead(userId, Number(selectedBotId)).catch(() => {}));
      await Promise.all(promises);
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

  const activeChatRef = useRef(null);
  useEffect(() => {
    if (!selectedBotId) return;
    const currentActive = selectedVisitor ? `visitor_${selectedVisitor}` : selectedUser ? `user_${selectedUser}` : null;
    if (currentActive && currentActive !== activeChatRef.current) {
      activeChatRef.current = currentActive;
      if (selectedVisitor) {
        readMutation.mutate({ visitorId: selectedVisitor, markAsRead: true });
      } else if (selectedUser) {
        readMutation.mutate({ userId: selectedUser, markAsRead: true });
      }
    }
  }, [selectedVisitor, selectedUser, selectedBotId]);

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

  const metadataMutation = useMutation({
    mutationFn: ({ visitorId, data }) => updateChatMetadata(visitorId, Number(selectedBotId), data),
    onMutate: (vars) => {
      setContextMenu(null);
      const targetId = vars.visitorId;
      if (!targetId) return;

      queryClient.setQueryData(['chats', selectedBotId], (old = []) =>
        Array.isArray(old) ? old.map(c => (String(c.user_id) === String(targetId) || c.visitor_id === targetId) ? { ...c, ...vars.data } : c) : old
      );

      queryClient.setQueryData(['webVisitors', selectedBotId], (old = []) =>
        Array.isArray(old) ? old.map(v => (v.visitor_id === targetId || String(v.user_id) === String(targetId)) ? { ...v, ...vars.data } : v) : old
      );
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['chats', selectedBotId] });
      queryClient.invalidateQueries({ queryKey: ['webVisitors', selectedBotId] });
      if (vars.data.is_pinned !== undefined) {
        addToast(vars.data.is_pinned ? 'Chat pinned to top' : 'Chat unpinned');
      } else if (vars.data.is_done !== undefined) {
        addToast(vars.data.is_done ? 'Chat marked as done' : 'Chat reopened');
      } else if (vars.data.payment_status !== undefined) {
        addToast(`Payment status set to ${vars.data.payment_status}`);
      } else if (vars.data.is_blocked !== undefined) {
        addToast(vars.data.is_blocked ? 'Customer blocked' : 'Customer unblocked');
      } else if (vars.data.is_muted !== undefined) {
        addToast(vars.data.is_muted ? 'Chat muted' : 'Chat unmuted');
      } else if (vars.data.ai_disabled !== undefined) {
        addToast(vars.data.ai_disabled ? 'AI Agent paused' : 'AI Agent resumed');
      }
    },
    onError: (err) => {
      queryClient.invalidateQueries({ queryKey: ['chats', selectedBotId] });
      queryClient.invalidateQueries({ queryKey: ['webVisitors', selectedBotId] });
      addToast(err.response?.data?.detail || 'Failed to update status', 'error');
    },
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

  const isGuestVisitor = (v) => {
    if (!v) return false;
    if (v.name === 'E-commerce Support' || (v.visitor_id && String(v.visitor_id).startsWith('support_'))) return false;

    const fb = (v.firebase_uid || '').trim();
    const hasRealFb = Boolean(fb && !fb.startsWith('wv_') && !fb.startsWith('v_') && !fb.startsWith('dc_'));

    if (v.is_registered_customer || v.website_customer_id || hasRealFb || v.phone || v.email) {
      return false;
    }

    const name = (v.name || '').trim();
    if (!name || name === 'Website Customer' || name === 'Shop Visitor' || name === 'Guest' || name === 'User') {
      return true;
    }

    return false;
  };

  const telegramUnread = displayedChats.reduce((sum, c) => sum + (c.unread_count || 0), 0);
  const webVisitorsWithUid = displayedWebVisitors.filter(v => v.name !== 'E-commerce Support' && !(v.visitor_id && String(v.visitor_id).startsWith('support_')) && !isGuestVisitor(v));
  const webVisitorsGuest = displayedWebVisitors.filter(v => v.name !== 'E-commerce Support' && !(v.visitor_id && String(v.visitor_id).startsWith('support_')) && isGuestVisitor(v));
  const websiteUnread = webVisitorsWithUid.reduce((sum, v) => sum + (v.unread_count || 0), 0);
  const guestUnread = webVisitorsGuest.reduce((sum, v) => sum + (v.unread_count || 0), 0);
  const supportVisitor = displayedWebVisitors.find(v => v.name === 'E-commerce Support' || (v.visitor_id && String(v.visitor_id).startsWith('support_'))) || (selectedBotId ? {
    visitor_id: `support_${selectedBotId}`,
    name: 'E-commerce Support',
    unread_count: 0
  } : null);
  const supportUnread = supportVisitor?.unread_count || 0;

  const matchesStatusFilter = (item) => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'read') return (item.unread_count || 0) === 0;
    if (statusFilter === 'unread') return (item.unread_count || 0) > 0;
    if (statusFilter === 'done') return !!item.is_done;
    if (statusFilter === 'pending') return item.payment_status === 'pending';
    if (statusFilter === 'paid') return item.payment_status === 'paid';
    if (statusFilter === 'blocked') return !!item.is_blocked;
    if (statusFilter === 'muted') return !!item.is_muted;
    return true;
  };

  const filteredChats = displayedChats.filter(c => {
    if (!matchesStatusFilter(c)) return false;
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      (c.first_name || '').toLowerCase().includes(term) ||
      (c.last_name || '').toLowerCase().includes(term) ||
      (c.username || '').toLowerCase().includes(term) ||
      (c.user_id ? c.user_id.toString() : '').includes(term)
    );
  });

  const filteredWebVisitors = displayedWebVisitors.filter(v => {
    if (v.name === 'E-commerce Support' || (v.visitor_id && String(v.visitor_id).startsWith('support_'))) return false;
    if (!v.last_message && !v.last_time) return false;
    if (!matchesStatusFilter(v)) return false;
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      (v.name || '').toLowerCase().includes(term) ||
      (v.phone || '').toString().toLowerCase().includes(term) ||
      (v.visitor_id || '').toString().toLowerCase().includes(term) ||
      (v.last_message || '').toLowerCase().includes(term)
    );
  });

  const selectedChat = displayedChats.find(c => c.user_id === selectedUser);
  const isSupportSelected = Boolean(selectedVisitor && (selectedVisitor === supportVisitor?.visitor_id || String(selectedVisitor).startsWith('support_')));
  const selectedWebChat = displayedWebVisitors.find(v => v.visitor_id === selectedVisitor) || (
    isSupportSelected ? (supportVisitor || {
      visitor_id: `support_${selectedBotId}`,
      name: 'E-commerce Support',
      photo_url: '/logo.webp'
    }) : null
  );
  const isSupportChat = Boolean(isSupportSelected || selectedWebChat?.name === 'E-commerce Support');
  const isWebTab = chatTab === 'web' || chatTab === 'guest';

  const getItemTime = (item) => {
    const raw = item.last_time || item.last_message_at || item.created_at || item.last_msg_at || item.updated_at || item.last_interaction;
    if (!raw) return 0;
    const t = new Date(raw).getTime();
    return isNaN(t) ? 0 : t;
  };

  const combinedAllItems = useMemo(() => {
    const telegramItems = filteredChats.map(c => ({
      type: 'telegram',
      id: c.user_id,
      item: c,
      is_pinned: !!c.is_pinned,
      timestamp: getItemTime(c),
    }));
    const webItems = filteredWebVisitors.map(v => ({
      type: 'web',
      id: v.visitor_id,
      item: v,
      is_pinned: !!v.is_pinned,
      timestamp: getItemTime(v),
    }));
    const combined = [...telegramItems, ...webItems];
    combined.sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      return b.timestamp - a.timestamp;
    });
    return combined;
  }, [filteredChats, filteredWebVisitors]);

  const handleSend = () => {
    const text = inputText.trim();
    if (!text || sendMutation.isPending) return;
    if (selectedVisitor) {
      sendMutation.mutate({ visitorId: selectedVisitor, message: text });
    } else {
      sendMutation.mutate({ userId: selectedUser, message: text });
    }
  };

  const compressImage = (file, maxDim = 720) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        let { width, height } = img;
        if (width <= maxDim && height <= maxDim) {
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          canvas.toBlob((blob) => {
            resolve(new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() }));
          }, 'image/jpeg', 0.85);
          return;
        }
        const ratio = Math.min(maxDim / width, maxDim / height);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(width * ratio);
        canvas.height = Math.round(height * ratio);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          resolve(new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() }));
        }, 'image/jpeg', 0.85);
      };
      img.onerror = reject;
      img.src = url;
    });
  };

  const handlePhotoSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !selectedBotId) return;
    setUploading(true);
    try {
      const compressed = await compressImage(file, 720);
      const formData = new FormData();
      formData.append('file', compressed);
      const { file_id } = await client.post(`/upload/image?bot_id=${selectedBotId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }).then(r => r.data);
      const caption = inputText.trim();
      setInputText('');
      if (selectedVisitor) {
        sendMutation.mutate({ visitorId: selectedVisitor, message: caption, fileId: file_id, fileType: 'photo' });
      } else {
        sendMutation.mutate({ userId: selectedUser, message: caption, fileId: file_id, fileType: 'photo' });
      }
    } catch {
      addToast('Failed to upload photo', 'error');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const el = e.target;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      setInputText(inputText.slice(0, start) + '\n' + inputText.slice(end));
      requestAnimationFrame(() => { el.selectionStart = el.selectionEnd = start + 1; });
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

  return (
    <div className="-mt-3 md:-mt-5 lg:-mt-7 -mx-3 sm:-mx-4 md:-mx-8 lg:-mx-10 h-[calc(100dvh-6.75rem)] md:h-[calc(100vh-4.5rem)] min-h-[450px] bg-white rounded-2xl lg:rounded-3xl border border-gray-200/90 ring-1 ring-black/10 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] overflow-hidden flex flex-col lg:flex-row">
      {/* LEFT SIDEBAR: Conversation List & Filters */}
      <div className={`w-full lg:w-[340px] xl:w-[380px] 2xl:w-[420px] flex-shrink-0 flex flex-col border-r border-gray-100 bg-gray-50/40 ${ (selectedUser || selectedVisitor) ? 'hidden lg:flex' : 'flex' } h-full overflow-hidden`}>
        {/* Header with Title, Search & Filter */}
        <div className="p-4 border-b border-gray-200/60 bg-white/80 backdrop-blur-md space-y-3 flex-shrink-0">
          <div className="flex items-center justify-between gap-2">
            <h1 className="text-xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
              <MessageCircle className="w-6 h-6 text-indigo-600" />
              Chats
            </h1>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setShowStartChatModal(true)}
                className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
                title="Start chat with website customer"
              >
                <Plus className="w-4 h-4" />
                <span>Start Chat</span>
              </button>
              {supportVisitor && (
                <button
                  onClick={() => {
                    setSelectedVisitor(supportVisitor.visitor_id);
                    setSelectedUser(null);
                    setSearch('');
                    setChatTab('all');
                  }}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    selectedVisitor === supportVisitor.visitor_id
                      ? 'bg-indigo-100 text-indigo-700 ring-2 ring-indigo-300'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <Headphones className="w-3.5 h-3.5" />
                  <span>Support</span>
                  {supportUnread > 0 && (
                    <span className="bg-red-500 text-white text-[9px] font-bold leading-none px-1.5 py-0.5 rounded-full">
                      {supportUnread > 99 ? '99+' : supportUnread}
                    </span>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Search Bar & Status Filter */}
          <div className="relative" ref={filterRef}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search user..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-9 py-2 bg-gray-100/80 border border-gray-200/80 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all"
            />
            <button
              onClick={() => setShowFilterMenu(!showFilterMenu)}
              className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-lg transition-all ${
                statusFilter !== 'all'
                  ? 'bg-indigo-100 text-indigo-600 font-bold'
                  : 'text-gray-400 hover:text-gray-600 hover:bg-gray-200/50'
              }`}
              title="Filter chats by status"
            >
              <Filter className="w-3.5 h-3.5" />
            </button>

            {showFilterMenu && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-gray-100 py-1.5 z-50 divide-y divide-gray-100">
                <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Filter by Status</div>
                <div className="py-1">
                  {[
                    { id: 'all', label: 'All Chats', icon: Filter, color: 'text-gray-500' },
                    { id: 'unread', label: 'Unread', icon: Circle, color: 'text-indigo-600' },
                    { id: 'read', label: 'Read', icon: CheckCheck, color: 'text-gray-500' },
                    { id: 'done', label: 'Done', icon: CheckCircle2, color: 'text-emerald-600' },
                    { id: 'pending', label: 'Pending Payment', icon: Clock, color: 'text-amber-500' },
                    { id: 'paid', label: 'Paid', icon: CreditCard, color: 'text-green-600' },
                    { id: 'blocked', label: 'Blocked', icon: Ban, color: 'text-rose-600' },
                    { id: 'muted', label: 'Muted', icon: VolumeX, color: 'text-gray-500' },
                  ].map(item => {
                    const Icon = item.icon;
                    const isActive = statusFilter === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setStatusFilter(item.id);
                          setShowFilterMenu(false);
                        }}
                        className={`w-full flex items-center justify-between px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                          isActive ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Icon className={`w-3.5 h-3.5 ${item.color}`} />
                          <span>{item.label}</span>
                        </div>
                        {isActive && <CheckCheck className="w-3.5 h-3.5 text-indigo-600" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Platform Tab Switcher */}
          <div className="flex gap-1 bg-gray-200/60 rounded-xl p-1 w-full">
            <button
              onClick={() => { setChatTab('all'); setSelectedUser(null); setSelectedVisitor(null); setSearch(''); }}
              className={`flex-1 px-1.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 whitespace-nowrap ${
                chatTab === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              All
            </button>
            <button
              onClick={() => { setChatTab('telegram'); setSelectedUser(null); setSelectedVisitor(null); setSearch(''); }}
              className={`flex-1 px-1.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 whitespace-nowrap ${
                chatTab === 'telegram' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Smartphone className="w-3 h-3 flex-shrink-0" />
              Telegram
              {telegramUnread > 0 && (
                <span className="bg-red-500 text-white text-[9px] font-bold leading-none px-1.5 py-0.5 rounded-full">
                  {telegramUnread > 99 ? '99+' : telegramUnread}
                </span>
              )}
            </button>
            <button
              onClick={() => { setChatTab('web'); setSelectedUser(null); setSelectedVisitor(null); setSearch(''); }}
              className={`flex-1 px-1.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 whitespace-nowrap ${
                chatTab === 'web' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Globe className="w-3 h-3 flex-shrink-0" />
              Website
              {websiteUnread > 0 && (
                <span className="bg-red-500 text-white text-[9px] font-bold leading-none px-1.5 py-0.5 rounded-full">
                  {websiteUnread > 99 ? '99+' : websiteUnread}
                </span>
              )}
            </button>
            <button
              onClick={() => { setChatTab('guest'); setSelectedUser(null); setSelectedVisitor(null); setSearch(''); }}
              className={`flex-1 px-1.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 whitespace-nowrap ${
                chatTab === 'guest' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <User className="w-3 h-3 flex-shrink-0" />
              Guest
              {guestUnread > 0 && (
                <span className="bg-red-500 text-white text-[9px] font-bold leading-none px-1.5 py-0.5 rounded-full">
                  {guestUnread > 99 ? '99+' : guestUnread}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Conversation List Items */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1 overflow-x-hidden flex flex-col" onContextMenu={(e) => e.preventDefault()}>
          {chatTab === 'web' || chatTab === 'guest' ? (
            <>
              {(chatTab === 'web' ? filteredWebVisitors.filter(v => !isGuestVisitor(v)) : filteredWebVisitors.filter(v => isGuestVisitor(v))).length === 0 ? (
                <div className="flex-1 min-h-[220px] flex flex-col items-center justify-center p-8 text-center border border-dashed border-gray-200/90 bg-gray-50/40 rounded-2xl">
                  <MessageCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-xs font-bold text-gray-500">
                    {chatTab === 'web' ? 'No website visitors yet' : 'No guest visitors yet'}
                  </p>
                </div>
              ) : (
                (chatTab === 'web' ? filteredWebVisitors.filter(v => !isGuestVisitor(v)) : filteredWebVisitors.filter(v => isGuestVisitor(v))).map(v => (
                  <WebVisitorItem
                    key={v.visitor_id}
                    v={v}
                    isSelected={selectedVisitor === v.visitor_id}
                    onClick={() => {
                      setSelectedVisitor(v.visitor_id);
                      setSelectedUser(null);
                      setUnreadOverrides(prev => { const n = {...prev}; delete n[v.visitor_id]; return n; });
                    }}
                    onContextMenu={handleContextMenu}
                  />
                ))
              )}
            </>
          ) : chatTab === 'telegram' ? (
            <>
              {filteredChats.length === 0 ? (
                <div className="flex-1 min-h-[220px] flex flex-col items-center justify-center p-8 text-center border border-dashed border-gray-200/90 bg-gray-50/40 rounded-2xl">
                  <MessageCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-xs font-bold text-gray-500">No Telegram conversations yet</p>
                </div>
              ) : (
                filteredChats.map(chat => (
                  <ConversationItem
                    key={chat.user_id}
                    chat={chat}
                    isActive={selectedUser === chat.user_id}
                    onClick={() => {
                      setSelectedUser(chat.user_id);
                      setSelectedVisitor(null);
                      setUnreadOverrides(prev => { const n = {...prev}; delete n[chat.user_id]; return n; });
                    }}
                    onContextMenu={handleContextMenu}
                  />
                ))
              )}
            </>
          ) : (
            <>
              {combinedAllItems.length === 0 ? (
                <div className="flex-1 min-h-[220px] flex flex-col items-center justify-center p-8 text-center border border-dashed border-gray-200/90 bg-gray-50/40 rounded-2xl">
                  <MessageCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-xs font-bold text-gray-500">No conversations found</p>
                </div>
              ) : (
                combinedAllItems.map(entry => (
                  entry.type === 'telegram' ? (
                    <ConversationItem
                      key={`tg_${entry.id}`}
                      chat={entry.item}
                      isActive={selectedUser === entry.id}
                      onClick={() => {
                        setSelectedUser(entry.id);
                        setSelectedVisitor(null);
                        setUnreadOverrides(prev => { const n = {...prev}; delete n[entry.id]; return n; });
                      }}
                      onContextMenu={handleContextMenu}
                    />
                  ) : (
                    <WebVisitorItem
                      key={`wv_${entry.id}`}
                      v={entry.item}
                      isSelected={selectedVisitor === entry.id}
                      onClick={() => {
                        setSelectedVisitor(entry.id);
                        setSelectedUser(null);
                        setUnreadOverrides(prev => { const n = {...prev}; delete n[entry.id]; return n; });
                      }}
                      onContextMenu={handleContextMenu}
                    />
                  )
                ))
              )}
            </>
          )}
        </div>
      </div>

      {/* RIGHT PANEL: Active Integrated Chat Workspace */}
      <div className={`flex-1 flex flex-col bg-white min-w-0 relative ${ !(selectedUser || selectedVisitor) ? 'hidden lg:flex' : 'flex' } h-full overflow-hidden`}>
        { (selectedUser || selectedVisitor) ? (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            {/* Chat Workspace Header */}
            <div className="p-3 px-4 sm:px-6 border-b border-gray-100 bg-white/90 backdrop-blur-md flex items-center justify-between gap-3 flex-shrink-0 shadow-xs">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  onClick={() => { setSelectedUser(null); setSelectedVisitor(null); }}
                  className="lg:hidden p-2 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all active:scale-95 flex-shrink-0"
                  title="Back to conversations"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <CustomerAvatar photoUrl={selectedWebChat?.photo_url || selectedChat?.profile_picture || selectedChat?.photo_url} name={selectedWebChat?.name || selectedChat?.first_name || selectedChat?.account_name || selectedChatName} size="w-10 h-10" fontSize="text-sm" />
                <div className="min-w-0">
                  <h2 className="text-sm font-bold text-gray-900 truncate flex items-center gap-1.5">
                    {isSupportChat ? <>E-commerce Support<BadgeCheck className="w-4 h-4 fill-blue-600 text-white flex-shrink-0 inline" /></> : (selectedWebChat?.name || selectedChat?.first_name || selectedChat?.account_name || selectedChatName || 'Customer')}
                  </h2>
                  <p className="text-[11px] text-gray-500 truncate flex items-center gap-2">
                    {selectedChat?.username && <span>@{selectedChat.username}</span>}
                    {selectedWebChat?.phone && <span>{selectedWebChat.phone}</span>}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {selectedWebChat && !isSupportChat && (
                  <button
                    onClick={() => toggleAiMutation.mutate({ visitorId: selectedVisitor, disabled: !selectedWebChat.ai_disabled })}
                    disabled={toggleAiMutation.isPending}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 shadow-xs ${
                      selectedWebChat.ai_disabled
                        ? 'bg-rose-50 text-rose-600 border border-rose-200'
                        : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                    }`}
                  >
                    <Brain className="w-3.5 h-3.5" />
                    <span>{selectedWebChat.ai_disabled ? 'AI Off' : 'AI Active'}</span>
                  </button>
                )}
                <button
                  onClick={() => { setSelectedUser(null); setSelectedVisitor(null); }}
                  className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 transition-all active:scale-95"
                  title="Close chat"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Message Stream */}
            <div ref={chatContainerRef} onScroll={handleChatScroll} className="flex-1 overflow-y-auto overflow-x-hidden px-4 sm:px-6 py-4 space-y-3 min-h-0 bg-slate-50/30">
              {(() => {
                const msgs = selectedVisitor ? stableWebMessages : stableMessages;
                if (msgs.length === 0) {
                  return (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-sm text-gray-400 font-medium">No messages yet</p>
                    </div>
                  );
                }

                let lastDateStr = null;
                const elements = [];

                msgs.forEach((msg, idx) => {
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
                        key={`date-divider-${currentDateStr}-${idx}`}
                        className="flex items-center justify-center my-4"
                      >
                        <span className="px-3.5 py-1 bg-white border border-gray-200/80 shadow-xs rounded-full text-[11px] font-bold text-gray-500 tracking-wide">
                          {currentDateStr}
                        </span>
                      </div>
                    );
                  }

                  elements.push(
                    <ChatBubble
                      key={msg.id || idx}
                      message={msg}
                      isAdmin={msg.sender_type === 'admin'}
                      isAi={msg.sender_type === 'ai' || msg.sender_type === 'assistant'}
                      isFollowup={msg.sender_type === 'followup'}
                      botId={Number(selectedBotId)}
                      botUsername={botUsername}
                      showTelegramLink={chatTab === 'all' || chatTab === 'telegram'}
                      onImageClick={(url) => setFullScreenImg(url)}
                    />
                  );
                });

                return elements;
              })()}
              <div ref={messagesEndRef} />
              {userScrolledUp && (
                <div className="sticky bottom-0 flex justify-end pb-2 pointer-events-none">
                  <button
                    onClick={scrollToBottom}
                    className="pointer-events-auto w-10 h-10 bg-white border border-gray-200 shadow-lg rounded-full flex items-center justify-center hover:bg-gray-50 active:scale-90 transition-all"
                  >
                    <ChevronDown className="w-5 h-5 text-gray-600" />
                  </button>
                </div>
              )}
            </div>

            {/* Input Bar */}
            <div className="bg-white border-t border-gray-100 px-3 sm:px-6 py-2.5 sm:py-3 shrink-0 pb-[calc(10px+env(safe-area-inset-bottom))] md:pb-3">
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
                    onChange={(e) => {
                      if (e.target.value.length > 4096) return;
                      setInputText(e.target.value);
                      e.target.style.height = 'auto';
                      e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message..."
                    rows={1}
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none transition-all"
                    style={{ maxHeight: 200 }}
                  />
                  {inputText.length > 3800 && (
                    <span className="absolute -bottom-4 right-2 text-[10px] text-gray-400">{inputText.length}/4096</span>
                  )}
                </div>
                <button
                  onClick={handleSend}
                  disabled={!inputText.trim() || sendMutation.isPending}
                  className="w-11 h-11 bg-indigo-600 text-white rounded-2xl flex items-center justify-center hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-90 flex-shrink-0 shadow-md shadow-indigo-600/20"
                >
                  {sendMutation.isPending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Blank Placeholder when no chat is selected on desktop */
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50/40">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-xl shadow-indigo-500/20 mb-4 animate-bounce">
              <MessageCircle className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-extrabold text-gray-900 tracking-tight">Select a Conversation</h3>
            <p className="text-sm text-gray-500 max-w-sm mt-1.5 leading-relaxed">
              Choose a chat.....
            </p>
          </div>
        )}
      </div>

      {/* Context Menu Dropdown */}
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
                left: Math.min(Math.max(10, contextMenu.x), Math.max(10, window.innerWidth - 240)),
                top: Math.min(Math.max(10, contextMenu.y), Math.max(10, window.innerHeight - 360)),
                maxHeight: 'calc(100vh - 40px)',
                overflowY: 'auto',
                zIndex: 60,
              }}
              className="w-56 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-gray-100 py-1.5 overflow-hidden divide-y divide-gray-100/60"
            >
              {/* Status Actions */}
              <div className="py-1">
                <button
                  onClick={() => metadataMutation.mutate({
                    visitorId: String(contextMenu.chat.visitor_id || contextMenu.chat.user_id),
                    data: { is_pinned: !contextMenu.chat.is_pinned }
                  })}
                  className="w-full flex items-center justify-between px-3.5 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    {contextMenu.chat.is_pinned ? <PinOff className="w-3.5 h-3.5 text-amber-500" /> : <Pin className="w-3.5 h-3.5 text-indigo-500" />}
                    <span>{contextMenu.chat.is_pinned ? 'Unpin Chat' : 'Pin to Top'}</span>
                  </div>
                  {contextMenu.chat.is_pinned && <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">Pinned</span>}
                </button>

                {contextMenu.chat.unread_count > 0 ? (
                  <button
                    onClick={() => readMutation.mutate({
                      userId: contextMenu.chat.user_id,
                      visitorId: contextMenu.chat.visitor_id ? String(contextMenu.chat.visitor_id) : String(contextMenu.chat.user_id),
                      markAsRead: true
                    })}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    <CheckCheck className="w-3.5 h-3.5 text-gray-500" />
                    <span>Mark as Read</span>
                  </button>
                ) : (
                  <button
                    onClick={() => readMutation.mutate({
                      userId: contextMenu.chat.user_id,
                      visitorId: contextMenu.chat.visitor_id ? String(contextMenu.chat.visitor_id) : String(contextMenu.chat.user_id),
                      markAsRead: false
                    })}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    <Circle className="w-3.5 h-3.5 text-gray-400" />
                    <span>Mark as Unread</span>
                  </button>
                )}

                <button
                  onClick={() => metadataMutation.mutate({
                    visitorId: String(contextMenu.chat.visitor_id || contextMenu.chat.user_id),
                    data: { is_done: !contextMenu.chat.is_done }
                  })}
                  className="w-full flex items-center justify-between px-3.5 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                >
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className={`w-3.5 h-3.5 ${contextMenu.chat.is_done ? 'text-gray-400' : 'text-emerald-500'}`} />
                    <span>{contextMenu.chat.is_done ? 'Reopen Chat' : 'Mark as Done'}</span>
                  </div>
                  {contextMenu.chat.is_done && <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">Done</span>}
                </button>
              </div>

              {/* Payment Tag */}
              <div className="py-1">
                <div className="px-3.5 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Payment Status</div>
                <div className="flex items-center gap-1.5 px-3 py-1">
                  <button
                    onClick={() => metadataMutation.mutate({
                      visitorId: String(contextMenu.chat.visitor_id || contextMenu.chat.user_id),
                      data: { payment_status: contextMenu.chat.payment_status === 'paid' ? 'none' : 'paid' }
                    })}
                    className={`flex-1 flex items-center justify-center gap-1 py-1 px-2 rounded-lg text-[11px] font-bold transition-all ${
                      contextMenu.chat.payment_status === 'paid'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                    }`}
                  >
                    <CreditCard className="w-3 h-3" /> Paid
                  </button>
                  <button
                    onClick={() => metadataMutation.mutate({
                      visitorId: String(contextMenu.chat.visitor_id || contextMenu.chat.user_id),
                      data: { payment_status: contextMenu.chat.payment_status === 'pending' ? 'none' : 'pending' }
                    })}
                    className={`flex-1 flex items-center justify-center gap-1 py-1 px-2 rounded-lg text-[11px] font-bold transition-all ${
                      contextMenu.chat.payment_status === 'pending'
                        ? 'bg-amber-500 text-white'
                        : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                    }`}
                  >
                    <Clock className="w-3 h-3" /> Pending
                  </button>
                </div>
              </div>

              {/* AI & Chat Controls */}
              <div className="py-1">
                <button
                  onClick={() => metadataMutation.mutate({
                    visitorId: String(contextMenu.chat.visitor_id || contextMenu.chat.user_id),
                    data: { ai_disabled: !contextMenu.chat.ai_disabled }
                  })}
                  className="w-full flex items-center justify-between px-3.5 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                >
                  <div className="flex items-center gap-2.5">
                    <Bot className={`w-3.5 h-3.5 ${contextMenu.chat.ai_disabled ? 'text-amber-500' : 'text-indigo-500'}`} />
                    <span>{contextMenu.chat.ai_disabled ? 'Resume AI Agent' : 'Pause AI Agent'}</span>
                  </div>
                  {contextMenu.chat.ai_disabled && <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">Paused</span>}
                </button>
                <button
                  onClick={() => metadataMutation.mutate({
                    visitorId: String(contextMenu.chat.visitor_id || contextMenu.chat.user_id),
                    data: { is_muted: !contextMenu.chat.is_muted }
                  })}
                  className="w-full flex items-center justify-between px-3.5 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                >
                  <div className="flex items-center gap-2.5">
                    {contextMenu.chat.is_muted ? <Volume2 className="w-3.5 h-3.5 text-indigo-500" /> : <VolumeX className="w-3.5 h-3.5 text-gray-400" />}
                    <span>{contextMenu.chat.is_muted ? 'Unmute Chat' : 'Mute Chat'}</span>
                  </div>
                  {contextMenu.chat.is_muted && <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-full">Muted</span>}
                </button>
                <button
                  onClick={() => metadataMutation.mutate({
                    visitorId: String(contextMenu.chat.visitor_id || contextMenu.chat.user_id),
                    data: { is_blocked: !contextMenu.chat.is_blocked }
                  })}
                  className="w-full flex items-center justify-between px-3.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                >
                  <div className="flex items-center gap-2.5">
                    <Ban className="w-3.5 h-3.5 text-rose-500" />
                    <span>{contextMenu.chat.is_blocked ? 'Unblock Customer' : 'Block Customer'}</span>
                  </div>
                  {contextMenu.chat.is_blocked && <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded-full">Blocked</span>}
                </button>
              </div>

              {/* Delete Chat */}
              <div className="pt-1">
                <button
                  onClick={() => {
                    const chat = contextMenu.chat;
                    setContextMenu(null);
                    setChatToDelete(chat);
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete Chat
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={!!chatToDelete}
        onClose={() => setChatToDelete(null)}
        onConfirm={() => {
          if (!chatToDelete) return;
          const uId = chatToDelete.user_id;
          const vId = chatToDelete.visitor_id || chatToDelete.customer_key || (chatToDelete.user_id ? String(chatToDelete.user_id) : null);
          deleteMutation.mutate({
            userId: uId,
            visitorId: vId,
          });
        }}
        title="Delete Chat History"
        message={`Are you sure you want to delete all chat history with ${chatToDelete?.name || chatToDelete?.first_name || 'this customer'}?`}
        confirmText="Delete Chat"
        variant="danger"
        loading={deleteMutation.isPending}
      />

      {/* Start Chat with Website Customer Modal */}
      <AnimatePresence>
        {showStartChatModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-gray-100 space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <UserPlus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-base">Start Web Chat</h3>
                    <p className="text-xs text-gray-500">Select a website customer to chat with</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowStartChatModal(false)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name, email, phone..."
                  value={startChatSearch}
                  onChange={(e) => setStartChatSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
                {loadingWebCust ? (
                  <div className="py-8 text-center text-gray-400 flex flex-col items-center gap-2">
                    <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                    <span className="text-xs font-medium">Loading website customers...</span>
                  </div>
                ) : (() => {
                  const filtered = websiteCustomers.filter(c =>
                    !startChatSearch ||
                    (c.name && c.name.toLowerCase().includes(startChatSearch.toLowerCase())) ||
                    (c.email && c.email.toLowerCase().includes(startChatSearch.toLowerCase())) ||
                    (c.phone && c.phone.includes(startChatSearch))
                  );
                  if (filtered.length === 0) {
                    return (
                      <div className="py-8 text-center text-gray-400 text-xs font-medium">
                        No registered website customers found
                      </div>
                    );
                  }
                  return filtered.map((cust) => {
                    const displayName = getCustomerDisplayName(cust);
                    return (
                      <button
                        key={cust.visitor_id || cust.firebase_uid || cust.email || cust.name}
                        onClick={() => {
                          const targetUid = cust.dashboard_chat_id || cust.firebase_uid || cust.visitor_id || `dc_${cust.id}`;
                          setChatTab('web');
                          setSelectedVisitor(targetUid);
                          setSelectedUser(null);
                          setSelectedChatName(displayName);
                          setShowStartChatModal(false);
                        }}
                        className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-indigo-50/70 border border-gray-100 transition-all text-left group cursor-pointer"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <CustomerAvatar photoUrl={cust.photo_url} name={displayName} size="w-9 h-9" fontSize="text-sm" />
                          <div className="min-w-0">
                            <p className="font-bold text-gray-900 text-sm truncate group-hover:text-indigo-600">
                              {displayName}
                            </p>
                            <p className="text-[11px] text-gray-500 truncate">
                              {cust.email || cust.phone || 'Website User'}
                            </p>
                          </div>
                        </div>
                        <div className="px-2.5 py-1 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-600 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600 transition-all flex-shrink-0">
                          Chat
                        </div>
                      </button>
                    );
                  });
                })()}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <FullScreenImageViewer
        isOpen={!!fullScreenImg}
        onClose={() => setFullScreenImg(null)}
        imgUrl={fullScreenImg}
        title="Chat Photo"
      />
    </div>
  );
}
