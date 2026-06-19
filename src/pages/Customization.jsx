import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { useBotStore } from '../store/botStore';
import { useToastStore } from '../store/toastStore';
import { getBot, getAiSettings, updateAiSettings } from '../api/bots';
import { getContentBlocks, updateContentBlock } from '../api/contentBlocks';
import { uploadImage } from '../api/products';
import LoadingSkeleton from '../components/shared/LoadingSkeleton';
import ConfirmDialog from '../components/shared/ConfirmDialog';
import {
  Palette,
  Camera,
  Loader2,
  Brain,
  Save,
  UserCircle,
  Edit2,
  MessageSquare,
  ChevronDown,
  ChevronRight,
  ImageUp,
  Trash2,
  X,
  CheckCircle2,
  ShieldCheck,
  Link,
  ShoppingBag,
  Globe,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { THEMES, DEFAULT_THEME } from '../themes/themes';
import { requireFeature } from '../utils/plans';

function BannerEditor({ contentBlocks, onSave, botId, planName }) {
  const { addToast } = useToastStore();
  const [uploading, setUploading] = useState(false);
  const [editingLinkIndex, setEditingLinkIndex] = useState(null);
  const [linkInput, setLinkInput] = useState('');
  const fileInputRef = useRef(null);

  const block = contentBlocks?.find(b => b.key === 'shop_banners');
  const banners = block?.content_data?.banners || [];

  const setBannerLink = (index, link) => {
    const newBanners = banners.map((b, i) => i === index ? { ...b, link: link || undefined } : b);
    onSave('shop_banners', { banners: newBanners });
  };

  const getBannerUrl = (fileId) => {
    return fileId ? `https://api.telegramecommerce.shop/telegram/file/${encodeURIComponent(fileId)}?bot_id=${botId}` : null;
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      addToast('Please select an image file', 'error');
      return;
    }

    const img = new Image();
    const url = URL.createObjectURL(file);
    await new Promise((resolve) => { img.onload = resolve; img.src = url; });

    const ratio = img.width / img.height;
    const targetRatio = 1200 / 400;
    if (Math.abs(ratio - targetRatio) > 0.05) {
      addToast('Image must be 1200×400 ratio (3:1). Current size: ' + img.width + '×' + img.height, 'error');
      URL.revokeObjectURL(url);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    URL.revokeObjectURL(url);

    setUploading(true);
    try {
      const data = await uploadImage(file, botId);
      const newBanners = [...banners, { file_id: data.file_id, order: banners.length }];
      onSave('shop_banners', { banners: newBanners });
      addToast('Banner added');
    } catch (err) {
      addToast(err.message || 'Failed to upload banner', 'error');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeBanner = (index) => {
    const newBanners = banners.filter((_, i) => i !== index).map((b, i) => ({ ...b, order: i }));
    onSave('shop_banners', { banners: newBanners });
  };

  const moveBanner = (index, direction) => {
    const newBanners = [...banners];
    const target = index + direction;
    if (target < 0 || target >= newBanners.length) return;
    [newBanners[index], newBanners[target]] = [newBanners[target], newBanners[index]];
    newBanners.forEach((b, i) => b.order = i);
    onSave('shop_banners', { banners: newBanners });
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleUpload}
      />
      {banners.length > 0 && (
        <div className="space-y-2 mb-3">
          {banners.map((banner, index) => {
            const url = getBannerUrl(banner.file_id);
            return (
              <div key={index} className="flex items-center gap-3 bg-gray-50 rounded-xl border border-gray-100 p-2">
                <div className="w-20 h-[66px] rounded-lg bg-white border border-gray-200 overflow-hidden flex-shrink-0">
                  {url && <img src={url} alt="" className="w-full h-full object-cover" />}
                </div>
                <div className="flex-1 min-w-0">
                  {editingLinkIndex === index ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="url"
                        value={linkInput}
                        onChange={e => setLinkInput(e.target.value)}
                        onBlur={() => setEditingLinkIndex(null)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            setBannerLink(index, linkInput.trim());
                            setEditingLinkIndex(null);
                          }
                          if (e.key === 'Escape') setEditingLinkIndex(null);
                        }}
                        className="flex-1 px-2 py-1 text-[11px] bg-white border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-rose-500 w-full"
                        placeholder="https://..."
                        autoFocus
                      />
                      <button
                        onClick={() => setEditingLinkIndex(null)}
                        className="p-1 rounded text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : banner.link ? (
                    <div className="flex items-center gap-1 min-w-0">
                      <a
                        href={banner.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-indigo-600 font-medium truncate hover:underline"
                      >
                        {banner.link}
                      </a>
                      <button
                        onClick={() => {
                          setLinkInput(banner.link);
                          setEditingLinkIndex(index);
                        }}
                        className="p-0.5 rounded text-gray-400 hover:text-indigo-500 flex-shrink-0"
                        title="Edit link"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => setBannerLink(index, null)}
                        className="p-0.5 rounded text-gray-400 hover:text-rose-500 flex-shrink-0"
                        title="Remove link"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setEditingLinkIndex(index); setLinkInput(''); }}
                      className="text-[10px] text-gray-400 hover:text-rose-500 font-medium flex items-center gap-1"
                    >
                      <Link className="w-3 h-3" />
                      Add Link
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => moveBanner(index, -1)}
                    disabled={index === 0}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-200 disabled:opacity-30 transition-all"
                  >
                    <ChevronDown className="w-3.5 h-3.5 rotate-180" />
                  </button>
                  <button
                    onClick={() => moveBanner(index, 1)}
                    disabled={index === banners.length - 1}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-200 disabled:opacity-30 transition-all"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => removeBanner(index)}
                    className="p-1.5 rounded-lg text-rose-400 hover:text-rose-600 hover:bg-rose-50 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {banners.length < 5 && (
        <button
          onClick={() => {
            if (!requireFeature(planName, 'shop_banner', addToast)) return;
            fileInputRef.current?.click();
          }}
          disabled={uploading}
          className="w-full flex items-center justify-center gap-2 py-2 border-2 border-dashed border-gray-200 rounded-xl text-sm font-bold text-gray-500 hover:border-rose-300 hover:bg-rose-50/30 transition-all active:scale-[0.98] disabled:opacity-50"
        >
          {uploading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <ImageUp className="w-4 h-4" />
          )}
          {uploading ? 'Uploading...' : banners.length === 0 ? 'Add Banner Image' : 'Add Another Banner'}
        </button>
      )}
      {banners.length === 0 && (
        <p className="text-[11px] text-gray-400 mt-2">No banners set. Your shop will use the default gradient background.</p>
      )}
    </>
  );
}

export default function Customization() {
  const { selectedBotId, bots, setBots } = useBotStore();
  const { addToast } = useToastStore();
  const queryClient = useQueryClient();

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
      addToast(variables.key === 'shop_theme' ? 'Theme applied' : 'Content updated successfully');
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

  const [aiApiKey, setAiApiKey] = useState('');
  const [aiIsEnabled, setAiIsEnabled] = useState(false);
  const [aiGender, setAiGender] = useState('male');
  const [aiWebsiteContext, setAiWebsiteContext] = useState('');
  const [showAiWebsiteContextPopup, setShowAiWebsiteContextPopup] = useState(false);
  const [profilePicture, setProfilePicture] = useState('');
  const [uploading, setUploading] = useState(false);
  const [bioText, setBioText] = useState('');
  const [editingBio, setEditingBio] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState(DEFAULT_THEME);
  const [showThemeConfirm, setShowThemeConfirm] = useState(false);
  const [pendingTheme, setPendingTheme] = useState(null);
  const [orderButtonLabel, setOrderButtonLabel] = useState('Buy Now');
  const [showBioPopup, setShowBioPopup] = useState(false);
  const [showOrderBtnPopup, setShowOrderBtnPopup] = useState(false);

  const fileInputRef = React.useRef(null);

  React.useEffect(() => {
    if (bot?.profile_picture) setProfilePicture(bot.profile_picture);
  }, [bot?.profile_picture]);

  React.useEffect(() => {
    if (contentBlocks) {
      const themeBlock = contentBlocks.find(b => b.key === 'shop_theme');
      if (themeBlock?.content_data?.theme) {
        setSelectedTheme(themeBlock.content_data.theme);
      } else {
        setSelectedTheme(DEFAULT_THEME);
      }
      const bioBlock = contentBlocks.find(b => b.key === 'shop_bio');
      setBioText(bioBlock?.content_data?.text || '');
      const orderBtnBlock = contentBlocks.find(b => b.key === 'order_button_name');
      setOrderButtonLabel(orderBtnBlock?.content_data?.label || 'Buy Now');
    }
    if (aiSettings) {
      setAiApiKey(aiSettings.api_key || '');
      setAiWebsiteContext(aiSettings.website_system_context || '');
      setAiIsEnabled(aiSettings.is_enabled !== false);
      setAiGender(aiSettings.gender || 'male');
    }
  }, [contentBlocks, aiSettings]);

  const handleProfileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      addToast('Please select an image file', 'error');
      return;
    }
    const img = new Image();
    const url = URL.createObjectURL(file);
    await new Promise((resolve) => { img.onload = resolve; img.src = url; });
    if (img.width !== img.height) {
      addToast('Image must be 1:1 square aspect ratio', 'error');
      URL.revokeObjectURL(url);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    if (img.width > 512 || img.height > 512) {
      addToast('Image dimensions must not exceed 512x512', 'error');
      URL.revokeObjectURL(url);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    URL.revokeObjectURL(url);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('bot_id', String(selectedBotId));
      const res = await fetch('https://api.telegramecommerce.shop/upload/profile-picture', {
        method: 'POST',
        headers: { Authorization: `Bearer ${useAuthStore.getState().token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Upload failed');
      setProfilePicture(data.url);
      const updatedBots = bots.map(b =>
        b.id === Number(selectedBotId) ? { ...b, profile_picture: data.url } : b
      );
      setBots(updatedBots);
      addToast('Logo updated');
    } catch (err) {
      addToast(err.message || 'Failed to upload profile picture', 'error');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (botLoading) return <LoadingSkeleton type="list" count={5} />;

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8">
      <div className="flex items-center gap-3">
        <h1 className="text-lg sm:text-2xl lg:text-3xl font-bold text-gray-900">Customization</h1>
      </div>

      <div className="grid grid-cols-1 gap-3 md:gap-6 items-start">

        {/* Shop Theme */}
        <section className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-lg bg-pink-50 text-pink-600 flex items-center justify-center">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Public Shop Theme</h3>
              <p className="text-[10px] text-gray-500">Choose your shop's color scheme</p>
            </div>
          </div>
          <div className="grid grid-cols-5 gap-2.5">
            {Object.entries(THEMES).map(([key, theme]) => {
              const isActive = selectedTheme === key;
              return (
                <button
                  key={key}
                  onClick={() => {
                    setPendingTheme(key);
                    setShowThemeConfirm(true);
                  }}
                  disabled={updateContentMutation.isPending}
                  className="flex flex-col items-center gap-1 group"
                >
                  <div
                    className={`w-full rounded-xl transition-all ${isActive ? 'ring-2 ring-offset-2 ring-indigo-600 scale-105' : 'group-hover:scale-105'}`}
                    style={{ background: theme.preview, paddingBottom: '55%' }}
                  />
                  <span className={`text-[11px] font-medium text-center leading-tight ${isActive ? 'text-indigo-600 font-bold' : 'text-gray-600'}`}>
                    {theme.name}
                  </span>
                </button>
              );
            })}
          </div>

          <ConfirmDialog
            open={showThemeConfirm}
            onClose={() => { setShowThemeConfirm(false); setPendingTheme(null); }}
            onConfirm={() => {
              setShowThemeConfirm(false);
              if (pendingTheme) {
                setSelectedTheme(pendingTheme);
                updateContentMutation.mutate({ key: 'shop_theme', data: { theme: pendingTheme } });
              }
              setPendingTheme(null);
            }}
            title="Apply Theme?"
            message={pendingTheme ? `Switch to the "${THEMES[pendingTheme]?.name}" theme for your shop?` : ''}
            confirmText="Apply"
            variant="primary"
            loading={updateContentMutation.isPending}
          />
        </section>

        {/* Logo & Bio */}
        <section className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <UserCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Shop Identity</h3>
              <p className="text-[10px] text-gray-500">Logo and bio for your shop</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0 border-2 border-gray-200">
              {profilePicture ? (
                <img src={profilePicture} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <UserCircle className="w-7 h-7 text-gray-400" />
              )}
            </div>
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              onChange={handleProfileUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center gap-1.5 text-sm"
            >
              {uploading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Camera className="w-3.5 h-3.5" />
              )}
              {uploading ? 'Uploading...' : 'Update Logo'}
            </button>
            <div className="w-px h-8 bg-gray-200" />
            <button
              onClick={() => setShowBioPopup(true)}
              className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl border border-gray-100 hover:bg-gray-100 transition-all text-left flex-1"
            >
              <Edit2 className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              <span className="text-xs text-gray-700 truncate flex-1">
                {bioText || <span className="text-gray-400 italic">Add a shop bio...</span>}
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            </button>
          </div>
        </section>

        {/* AI Agent */}
        <section className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-50 text-cyan-600 flex items-center justify-center">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">AI Agent</h3>
              <p className="text-[10px] text-gray-500">Let AI answer customer questions on your shop</p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Enable AI Agent</span>
              <button
                onClick={() => {
                  if (!requireFeature(bot?.plan_name, 'ai_agent', addToast)) return;
                  const newVal = !aiIsEnabled;
                  setAiIsEnabled(newVal);
                  updateAiMutation.mutate({ is_enabled: newVal, api_key: aiApiKey, gender: aiGender });
                }}
                className={`w-12 h-6 rounded-full transition-colors relative ${aiIsEnabled ? 'bg-cyan-500' : 'bg-gray-300'}`}
              >
                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${aiIsEnabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
              </button>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1.5 block">AI Gender</label>
              <div className="flex bg-gray-100 rounded-xl p-0.5">
                <button
                  onClick={() => setAiGender('male')}
                  className={`flex-1 px-3 py-1.5 text-sm font-bold rounded-xl transition-all ${
                    aiGender === 'male' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  ♂ Male
                </button>
                <button
                  onClick={() => setAiGender('female')}
                  className={`flex-1 px-3 py-1.5 text-sm font-bold rounded-xl transition-all ${
                    aiGender === 'female' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  ♀ Female
                </button>
              </div>
            </div>

              {/* Website Custom Prompt */}
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Website Custom Prompt</label>
                <button
                  onClick={() => setShowAiWebsiteContextPopup(true)}
                  className="w-full flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl border border-gray-100 hover:bg-gray-100 transition-all text-left"
                >
                  <Globe className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                  <span className="text-sm text-gray-700 truncate flex-1">
                    {aiWebsiteContext || <span className="text-gray-400 italic">Custom prompt...</span>}
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                </button>
              </div>
            <button
              onClick={() => {
                if (!requireFeature(bot?.plan_name, 'ai_agent', addToast)) return;
                updateAiMutation.mutate({ api_key: aiApiKey, website_system_context: aiWebsiteContext, is_enabled: aiIsEnabled, gender: aiGender });
              }}
              disabled={updateAiMutation.isPending}
              className="w-full px-4 py-2 bg-cyan-500 text-white font-bold rounded-xl hover:bg-cyan-600 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
            >
              {updateAiMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save AI Settings
            </button>
          </div>
        </section>

        {/* Order Button */}
        <section className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Order Button</h3>
              <p className="text-[10px] text-gray-500">Choose the label for the buy button</p>
            </div>
          </div>
          <button
            onClick={() => {
              if (!requireFeature(bot?.plan_name, 'change_order_button_name', addToast)) return;
              setShowOrderBtnPopup(true);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl border border-gray-100 hover:bg-gray-100 transition-all text-left"
          >
            <ShoppingBag className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            <span className="text-sm text-gray-700 truncate flex-1">
              Current: <span className="font-bold">{orderButtonLabel}</span>
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
          </button>
        </section>

      </div>
      {/* Website Context Popup */}
      <AnimatePresence>
        {showAiWebsiteContextPopup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex flex-col bg-white"
          >
            <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b border-gray-100">
              <div>
                <h3 className="text-base font-bold text-gray-900">Website Custom Prompt</h3>
                <p className="text-[10px] text-gray-400">Instructions for the website AI assistant</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowAiWebsiteContextPopup(false)}
                  className="px-3 py-1.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-all active:scale-[0.98] text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    updateAiMutation.mutate({ api_key: aiApiKey, website_system_context: aiWebsiteContext, is_enabled: aiIsEnabled, gender: aiGender });
                    setShowAiWebsiteContextPopup(false);
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
              value={aiWebsiteContext}
              onChange={(e) => setAiWebsiteContext(e.target.value)}
              onInput={(e) => {
                const el = e.target;
                el.style.height = 'auto';
                el.style.height = el.scrollHeight + 'px';
              }}
              placeholder="E-commerce website assistant instructions..."
              className="flex-1 w-full px-5 py-4 bg-white outline-none text-sm resize-none overflow-y-auto"
              autoFocus
            />
          </motion.div>
        )}
      </AnimatePresence>


      {/* Shop Banners */}
      <section className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
            <ImageUp className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900">Shop Banners</h3>
            <p className="text-[10px] text-gray-500">Banner images for your public shop (1200×400, max 5)</p>
          </div>
        </div>

        <BannerEditor
          contentBlocks={contentBlocks}
          onSave={(key, data) => updateContentMutation.mutate({ key, data })}
          isPending={updateContentMutation.isPending}
          botId={selectedBotId}
          planName={bot?.plan_name}
        />
      </section>

      {/* Bio Popup */}
      <AnimatePresence>
        {showBioPopup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setShowBioPopup(false); setBioText(contentBlocks?.find(b => b.key === 'shop_bio')?.content_data?.text || ''); }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white rounded-3xl shadow-2xl p-6 max-w-md w-full mx-auto"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Edit Bio</h3>
                  <p className="text-[10px] text-gray-400">Short bio shown on your shop page (max 150 chars)</p>
                </div>
                <button
                  onClick={() => { setShowBioPopup(false); setBioText(contentBlocks?.find(b => b.key === 'shop_bio')?.content_data?.text || ''); }}
                  className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center active:scale-90 transition-transform"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>

              <textarea
                value={bioText}
                onChange={e => { if (e.target.value.length <= 150) setBioText(e.target.value); }}
                onInput={(e) => {
                  const el = e.target;
                  el.style.height = 'auto';
                  el.style.height = el.scrollHeight + 'px';
                }}
                rows={2}
                placeholder="Enter your shop bio..."
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm resize-none overflow-hidden"
                autoFocus
              />

              <div className="flex items-center justify-between mt-2 px-1">
                <span className="text-[11px] text-gray-400">{bioText.length}/150</span>
              </div>

              <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
                <button
                  onClick={() => { setShowBioPopup(false); setBioText(contentBlocks?.find(b => b.key === 'shop_bio')?.content_data?.text || ''); }}
                  className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-all active:scale-[0.98] text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    updateContentMutation.mutate({ key: 'shop_bio', data: { text: bioText.trim() } });
                    setShowBioPopup(false);
                  }}
                  disabled={updateContentMutation.isPending || !bioText.trim()}
                  className="flex-1 px-4 py-2.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
                >
                  {updateContentMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Order Button Popup */}
      <AnimatePresence>
        {showOrderBtnPopup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowOrderBtnPopup(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white rounded-3xl shadow-2xl p-6 max-w-sm w-full mx-auto"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Order Button</h3>
                  <p className="text-[10px] text-gray-400">Choose the label for your shop's buy button</p>
                </div>
                <button
                  onClick={() => setShowOrderBtnPopup(false)}
                  className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center active:scale-90 transition-transform"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>

              <div className="grid grid-cols-4 gap-2">
                {ORDER_BUTTON_OPTIONS.map(option => {
                  const isActive = orderButtonLabel === option;
                  return (
                    <button
                      key={option}
                      onClick={() => {
                        setOrderButtonLabel(option);
                        updateContentMutation.mutate({ key: 'order_button_name', data: { label: option } });
                        setShowOrderBtnPopup(false);
                      }}
                      disabled={updateContentMutation.isPending}
                      className={`px-3 py-2.5 rounded-xl font-bold text-sm transition-all active:scale-[0.97] ${
                        isActive
                          ? 'bg-indigo-600 text-white shadow-sm ring-1 ring-indigo-600'
                          : 'bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

const ORDER_BUTTON_OPTIONS = [
  'Order Now', 'Shop Now', 'Buy Now', 'Enroll Now', 'Book Now', 'Get Now', 'Grab Now',
];

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
    return fileId ? `https://api.telegramecommerce.shop/telegram/file/${fileId}?bot_id=${botId}` : null;
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
