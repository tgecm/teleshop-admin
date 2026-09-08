import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useBotStore } from '../store/botStore';
import { useToastStore } from '../store/toastStore';
import { API_BASE } from '../api/config';
import { getBot, getAiSettings, updateAiSettings } from '../api/bots';
import { getContentBlocks, updateContentBlock } from '../api/contentBlocks';
import { uploadImage } from '../api/products';
import { isFeatureAllowed } from '../utils/plans';
import { useAuthStore } from '../store/authStore';
import client from '../api/client';
import TempAccountModal from '../components/shared/TempAccountModal';
import {
  MessageSquare,
  ImageUp,
  Brain,
  Save,
  Edit2,
  ChevronDown,
  ChevronRight,
  X,
  Loader2,
  Globe,
  Plus,
  Trash2,
  Phone,
  Mail,
  ShieldAlert,
  Lock,
  AlertTriangle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function BotCustomization() {
  const { user } = useAuthStore();
  const { selectedBotId } = useBotStore();
  const { addToast } = useToastStore();
  const queryClient = useQueryClient();

  const isTempAccount = Boolean(
    user?.is_temp_account ||
    (user?.email && user.email.toLowerCase().endsWith('@gmail.com') && (user.email.toLowerCase().includes('bot') || user.email.toLowerCase().includes('test')))
  );

  const [isTempSkipped, setIsTempSkipped] = useState(false);

  const { data: bot, isLoading: botLoading } = useQuery({
    queryKey: ['bots', selectedBotId],
    queryFn: () => getBot(selectedBotId),
    enabled: !!selectedBotId,
  });

  const { data: contentBlocks } = useQuery({
    queryKey: ['content-blocks', selectedBotId],
    queryFn: () => getContentBlocks({ bot_id: Number(selectedBotId) }),
    enabled: !!selectedBotId,
  });

  const { data: aiSettings } = useQuery({
    queryKey: ['ai-settings', selectedBotId],
    queryFn: () => getAiSettings(selectedBotId),
    enabled: !!selectedBotId,
  });

  const updateContentMutation = useMutation({
    mutationFn: ({ key, data }) => updateContentBlock(selectedBotId, key, data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries(['content-blocks', selectedBotId]);
      addToast('Content updated successfully');
    },
    onError: () => addToast('Failed to update content', 'error'),
  });

  const updateAiMutation = useMutation({
    mutationFn: (data) => updateAiSettings(selectedBotId, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['ai-settings', selectedBotId]);
      addToast('AI settings updated');
    },
  });

  const [aiContext, setAiContext] = useState('');
  const [showAiContextPopup, setShowAiContextPopup] = useState(false);
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [websiteEnabled, setWebsiteEnabled] = useState(true);
  const [editingWebsiteUrl, setEditingWebsiteUrl] = useState(false);

  React.useEffect(() => {
    if (aiSettings) {
      setAiContext(aiSettings.system_context || '');
    }
  }, [aiSettings]);

  React.useEffect(() => {
    if (contentBlocks) {
      const web = contentBlocks.find(b => b.key === 'website_link');
      if (web) {
        setWebsiteUrl(web.content_data?.url || '');
        setWebsiteEnabled(web.content_data?.enabled !== false);
      }
    }
  }, [contentBlocks]);

  if (botLoading) return <LoadingSkeleton type="list" count={5} />;

  if (isTempAccount && !isTempSkipped) {
    return (
      <TempAccountModal
        title="Change temporary mail and password to unlock the Customize."
        onSkip={() => setIsTempSkipped(true)}
      />
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8">
      <div className="flex items-center gap-3">
        <h1 className="text-lg sm:text-2xl lg:text-3xl font-bold text-gray-900">Bot Customization</h1>
      </div>

      {/* Bot Captions */}
      <section className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900">Bot Captions</h3>
            <p className="text-[10px] text-gray-500">Edit text shown to users in your bot</p>
          </div>
        </div>

        <CaptionEditor
          contentBlocks={contentBlocks}
          onSave={(key, data) => updateContentMutation.mutate({ key, data })}
          isPending={updateContentMutation.isPending}
        />
      </section>

      {/* Update Poster */}
      <section className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
            <ImageUp className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900">Update Poster</h3>
            <p className="text-[10px] text-gray-500">Upload poster images shown in your bot</p>
          </div>
        </div>

        <PosterEditor
          contentBlocks={contentBlocks}
          onSave={(key, data) => updateContentMutation.mutate({ key, data })}
          isPending={updateContentMutation.isPending}
          botId={selectedBotId}
          planName={bot?.plan_name}
        />
      </section>

      {/* Custom Prompt Telegram */}
      <section className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-8 h-8 rounded-lg bg-cyan-50 text-cyan-600 flex items-center justify-center">
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900">AI Custom Prompt Telegram</h3>
            <p className="text-[10px] text-gray-500">Custom instructions for Telegram AI assistant</p>
            {!isFeatureAllowed(bot?.plan_name, 'ai_agent') && (
              <span className="text-[10px] font-semibold text-amber-600">Requires Standard plan or above</span>
            )}
          </div>
        </div>
        <div className="space-y-2">
          <button
            onClick={() => setShowAiContextPopup(true)}
            className="w-full flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl border border-gray-100 hover:bg-gray-100 transition-all text-left"
          >
            <Edit2 className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            <span className="text-sm text-gray-700 truncate flex-1">
              {aiContext || <span className="text-gray-400 italic">Custom prompt...</span>}
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
          </button>
          <button
            onClick={() => {
              updateAiMutation.mutate({ system_context: aiContext });
            }}
            disabled={updateAiMutation.isPending}
            className="w-full px-4 py-2 bg-cyan-500 text-white font-bold rounded-xl hover:bg-cyan-600 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
          >
            {updateAiMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Prompt
          </button>
          {isFeatureAllowed(bot?.plan_name, 'ai_agent') && !aiContext && (
            <p className="text-[10px] text-gray-400 italic text-center">Using default system prompt — add a custom prompt to tailor the AI</p>
          )}
        </div>
      </section>

      {/* AI Context Popup */}
      <AnimatePresence>
        {showAiContextPopup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex flex-col bg-white"
          >
            <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b border-gray-100">
              <div>
                <h3 className="text-base font-bold text-gray-900">Custom Prompt</h3>
                <p className="text-[10px] text-gray-400">Instructions for the AI assistant</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowAiContextPopup(false)}
                  className="px-3 py-1.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-all active:scale-[0.98] text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    updateAiMutation.mutate({ system_context: aiContext });
                    setShowAiContextPopup(false);
                  }}
                  disabled={updateAiMutation.isPending}
                  className="px-4 py-1.5 bg-cyan-500 text-white font-bold rounded-xl hover:bg-cyan-600 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center gap-1.5 text-sm"
                >
                  {updateAiMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save
                </button>
              </div>
            </div>

            <textarea
              value={aiContext}
              onChange={(e) => setAiContext(e.target.value)}
              onInput={(e) => {
                const el = e.target;
                el.style.height = 'auto';
                el.style.height = el.scrollHeight + 'px';
              }}
              placeholder="လုပ်ငန်းအသေးစိတ်၊ ဖုန်းနံပါတ်၊ လိပ်စာနှင့် ဝန်ဆောင်မှုအကြောင်း အကြမ်းဖျင်းရေးပေးပါ။"
              className="flex-1 w-full px-5 py-4 bg-white outline-none text-sm resize-none overflow-y-auto"
              autoFocus
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Website Link */}
      <section className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Website Link</h3>
              <p className="text-[10px] text-gray-500">Website button in bot's main menu</p>
            </div>
          </div>
          <button
            onClick={() => {
              const newEnabled = !websiteEnabled;
              setWebsiteEnabled(newEnabled);
              if (!newEnabled) {
                updateContentMutation.mutate({ key: 'website_link', data: { url: websiteUrl, enabled: false } });
              }
            }}
            className={`w-12 h-6 rounded-full transition-colors relative flex-shrink-0 ${websiteEnabled ? 'bg-emerald-500' : 'bg-gray-300'}`}
          >
            <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all shadow-sm ${websiteEnabled ? 'left-6.5' : 'left-0.5'}`} />
          </button>
        </div>
        {websiteEnabled && (
          <div className="flex gap-2">
            <input
              type="url"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              disabled={!editingWebsiteUrl}
              className="flex-1 px-3 py-2 border border-gray-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium disabled:bg-gray-100 disabled:cursor-not-allowed enabled:bg-white"
              placeholder="https://..."
            />
            {editingWebsiteUrl ? (
              <button
                onClick={() => {
                  if (!websiteUrl.startsWith('https://')) {
                    addToast('the link must starts with https://', 'error');
                    return;
                  }
                  updateContentMutation.mutate({ key: 'website_link', data: { url: websiteUrl, enabled: websiteEnabled } });
                  setEditingWebsiteUrl(false);
                }}
                className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all active:scale-[0.98] text-sm"
              >
                Save
              </button>
            ) : (
              <button
                onClick={() => setEditingWebsiteUrl(true)}
                className="px-4 py-2 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-all active:scale-[0.98] text-sm"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
        {!websiteEnabled && (
          <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 text-center">
            <p className="text-xs text-gray-400">Website button is hidden</p>
          </div>
        )}
      </section>
    </div>
  );
}

const CAPTION_OPTIONS = [
  { key: 'welcome_caption', label: 'Welcome Caption' },
  { key: 'browse_categories_caption', label: 'Shopping Caption' },
  { key: 'search_caption', label: 'Search Caption' },
  { key: 'cart_caption_title', label: 'View Cart Caption' },
  { key: 'my_orders_caption', label: 'My Order Caption' },
  { key: 'settings_caption', label: 'Setting Caption' },
  { key: 'support_caption', label: 'Support Caption' },
  { key: 'about_menu_caption', label: 'About Caption' },
  { key: 'order_confirmation_message', label: 'Order Confirmation' },
];

function CaptionEditor({ contentBlocks, onSave, isPending }) {
  const [selectedKey, setSelectedKey] = useState('');
  const [text, setText] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const block = contentBlocks?.find(b => b.key === selectedKey);
  const currentText = block?.content_data?.content || block?.content_data?.text || '';

  React.useEffect(() => {
    if (isOpen) setText(currentText);
  }, [currentText, isOpen]);

  const handleSave = () => {
    onSave(selectedKey, { source: 'text', content: text.trim() });
    setIsOpen(false);
  };

  return (
    <>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <select
            value={selectedKey}
            onChange={(e) => setSelectedKey(e.target.value)}
            className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium appearance-none cursor-pointer"
          >
            <option value="">Select a caption to edit...</option>
            {CAPTION_OPTIONS.map(opt => (
              <option key={opt.key} value={opt.key}>{opt.label}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
        <button
          onClick={() => { if (selectedKey) { setText(currentText); setIsOpen(true); } }}
          disabled={!selectedKey}
          className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed text-sm flex items-center gap-1.5"
        >
          <Edit2 className="w-3.5 h-3.5" />
          Edit
        </button>
      </div>

      {selectedKey && !isOpen && (
        <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 mt-2">
          <p className="text-xs text-gray-500 font-mono mb-1">/{selectedKey}</p>
          <p className="text-xs text-gray-700 whitespace-pre-wrap line-clamp-2">{currentText || <span className="text-gray-400 italic">Not set</span>}</p>
        </div>
      )}

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[70]"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-[80] bg-white rounded-t-[28px] shadow-2xl p-6 pb-sheet max-h-[70vh] flex flex-col"
            >
              <div className="flex justify-center pt-0 pb-3">
                <div className="w-9 h-1 bg-gray-200 rounded-full" />
              </div>

              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{CAPTION_OPTIONS.find(o => o.key === selectedKey)?.label}</h3>
                  <p className="text-[10px] text-gray-400 font-mono">/{selectedKey}</p>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center active:scale-90 transition-transform"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto">
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={8}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm resize-none"
                  autoFocus
                  placeholder="Enter the caption text..."
                />
              </div>

              <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
                <button
                  onClick={() => setIsOpen(false)}
                  className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-all active:scale-[0.98] text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isPending || !text.trim()}
                  className="flex-1 px-4 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
                >
                  {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

const POSTER_ITEMS = [
  { key: 'welcome_poster', icon: '🏠', label: 'Update Main Menu Poster' },
  { key: 'shopping_poster', icon: '🛍️', label: 'Update Shopping Poster' },
  { key: 'search_poster', icon: '🔍', label: 'Update Search Poster' },
  { key: 'view_cart_poster', icon: '🛒', label: 'Update View Cart Poster' },
  { key: 'my_orders_poster', icon: '📦', label: 'Update My Orders Poster' },
  { key: 'profile_poster', icon: '👤', label: 'Update Profile Poster' },
  { key: 'settings_poster', icon: '⚙️', label: 'Update Settings Poster' },
  { key: 'support_poster', icon: '📞', label: 'Update Support Poster' },
  { key: 'about_poster', icon: 'ℹ️', label: 'Update About Poster' },
  { key: 'admin_panel_poster', icon: '👑', label: 'Update Control Center Poster' },
  { key: 'admin_panel_2_poster', icon: '👑', label: 'Update Shop Setup Poster' },
];

function PosterEditor({ contentBlocks, onSave, botId }) {
  const { addToast } = useToastStore();
  const [showPanel, setShowPanel] = useState(false);
  const [uploadingKey, setUploadingKey] = useState(null);
  const [selectedPoster, setSelectedPoster] = useState(null);
  const fileInputRef = React.useRef(null);

  const posterData = selectedPoster ? POSTER_ITEMS.find(p => p.key === selectedPoster) : null;
  const uploadedCount = contentBlocks?.filter(b => POSTER_ITEMS.some(p => p.key === b.key) && b.content_data?.file_id).length || 0;

  const getPosterUrl = (key) => {
    const block = contentBlocks?.find(b => b.key === key);
    const fileId = block?.content_data?.file_id;
    return fileId ? `${API_BASE}/telegram/file/${fileId}?bot_id=${botId}` : null;
  };

  const handleUpload = async (e, key) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      addToast('Please select an image file', 'error');
      return;
    }
    setUploadingKey(key);
    try {
      const img = new Image();
      const url = URL.createObjectURL(file);
      await new Promise(resolve => { img.onload = resolve; img.src = url; });

      const MAX = 720;
      let { width, height } = img;
      if (width > MAX || height > MAX) {
        if (width > height) { height = Math.round((height / width) * MAX); width = MAX; }
        else { width = Math.round((width / height) * MAX); height = MAX; }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.85));
      URL.revokeObjectURL(url);

      const data = await uploadImage(blob, botId);

      onSave(key, { file_id: data.file_id, source: 'telegram' });
      setSelectedPoster(null);
    } catch (err) {
      addToast(err.message || 'Failed to upload poster', 'error');
    } finally {
      setUploadingKey(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const triggerUpload = (key) => {
    fileInputRef.current._posterKey = key;
    fileInputRef.current.click();
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const key = e.target._posterKey || POSTER_ITEMS[0].key;
          handleUpload(e, key);
        }}
      />
      <button
        onClick={() => setShowPanel(true)}
        className="w-full flex items-center gap-2.5 px-4 py-2 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200 transition-all active:scale-[0.99]"
      >
        <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
          <ImageUp className="w-4 h-4" />
        </div>
        <div className="flex-1 text-left">
          <p className="text-sm font-bold text-gray-900">Update Posters</p>
          <p className="text-[11px] text-gray-500">{uploadedCount}/{POSTER_ITEMS.length} uploaded</p>
        </div>
        <ChevronRight className="w-4 h-4 text-gray-400" />
      </button>

      {showPanel && (
        <div className="fixed inset-0 z-50 flex flex-col">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowPanel(false)}
          />
          <div className="relative mt-auto bg-white rounded-t-3xl shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between p-5 pb-3 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Bot Posters</h3>
                <p className="text-xs text-gray-500">{uploadedCount}/{POSTER_ITEMS.length} uploaded</p>
              </div>
              <button
                onClick={() => setShowPanel(false)}
                className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 pt-4 pb-24">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {POSTER_ITEMS.map(({ key, icon, label }) => {
                  const url = getPosterUrl(key);
                  return (
                    <div key={key} className="bg-gray-50 rounded-xl border border-gray-100 p-3 flex items-center gap-3">
                      <div className="w-14 h-14 rounded-lg bg-white border border-gray-200 flex-shrink-0 overflow-hidden flex items-center justify-center">
                        {url ? (
                          <img src={url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-lg">{icon}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-gray-900 truncate">{label}</p>
                      </div>
                      <button
                        onClick={() => setSelectedPoster(key)}
                        className="px-3 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all active:scale-[0.98] text-[11px] flex items-center gap-1 flex-shrink-0"
                      >
                        <ImageUp className="w-3 h-3" />
                        Upload
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedPoster && posterData && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setSelectedPoster(null)}
          />
          <div className="relative bg-white rounded-3xl shadow-2xl p-6 max-w-sm w-full mx-auto">
            <button
              onClick={() => setSelectedPoster(null)}
              className="absolute top-4 right-4 p-1.5 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex flex-col items-center text-center pt-2">
              <div className="w-40 h-40 rounded-2xl bg-gray-50 border border-gray-200 overflow-hidden flex items-center justify-center mb-4">
                {getPosterUrl(selectedPoster) ? (
                  <img src={getPosterUrl(selectedPoster)} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-4xl">{posterData.icon}</span>
                )}
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">{posterData.label}</h3>
              <p className="text-xs text-gray-500 mb-6">Choose a new image to update this poster</p>
              <button
                onClick={() => triggerUpload(selectedPoster)}
                disabled={uploadingKey === selectedPoster}
                className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl transition-all active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center justify-center gap-2"
              >
                {uploadingKey === selectedPoster ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ImageUp className="w-4 h-4" />
                )}
                {uploadingKey === selectedPoster ? 'Uploading...' : 'Choose Image'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
