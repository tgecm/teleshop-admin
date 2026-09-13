import { API_BASE } from '../api/config';
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { useBotStore } from '../store/botStore';
import { useToastStore } from '../store/toastStore';
import { getBot, getAiSettings, updateAiSettings, updateBot } from '../api/bots';
import { getContentBlocks, updateContentBlock } from '../api/contentBlocks';
import { uploadImage } from '../api/products';
import LoadingSkeleton from '../components/shared/LoadingSkeleton';
import ConfirmDialog from '../components/shared/ConfirmDialog';
import currencies, { getCurrencyByCode } from '../utils/currencies';
import { getAdminQuickQuestions, createQuickQuestion, updateQuickQuestion, deleteQuickQuestion } from '../api/quickQuestions';
import { getShopMmpayStatus } from '../api/payments';
import client from '../api/client';
import TempAccountModal from '../components/shared/TempAccountModal';
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
  Lock,
  Trash2,
  X,
  CheckCircle2,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Link,
  ShoppingBag,
  Globe,
  DollarSign,
  Search,
  Plus,
  ToggleLeft,
  ToggleRight,
  Sparkles,
  Phone,
  Mail,
  LayoutGrid,
  Clock,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { TOPBAR_THEMES, DEFAULT_TOPBAR_THEME } from '../utils/topbarThemes';
import { THEMES, DEFAULT_THEME } from '../themes/themes';
import { requireFeature, isFeatureAllowed } from '../utils/plans';
import { useThemeStore } from '../store/themeStore';

const TEMPLATE_META = {
  classic: {
    id: 'classic',
    name: 'Classic',
    description: 'Clean, familiar light design with indigo accents. The original Teleshop experience.',
    colors: ['#ffffff', '#6366f1', '#f8fafc', '#eef2ff'],
    layout: 'sidebar',
    badge: 'Default',
    preview: {
      bg: '#f8fafc',
      sidebar: '#ffffff',
      topbar: '#6366f1',
      card: '#ffffff',
      accent: '#6366f1',
      text: '#0f172a',
      textMuted: '#64748b',
    },
  },
  midnight: {
    id: 'midnight',
    name: 'Midnight',
    description: 'Pitch black OLED mode with indigo glow accents.',
    colors: ['#050508', '#6366f1', '#818cf8', '#0d0d14'],
    layout: 'sidebar-collapse',
    badge: 'Dark',
    preview: {
      bg: '#050508',
      sidebar: '#08080c',
      topbar: '#08080c',
      card: '#0d0d14',
      accent: '#6366f1',
      text: '#f8fafc',
      textMuted: '#64748b',
    },
  },
  slate: {
    id: 'slate',
    name: 'Slate Pro',
    description: 'Clean light slate with top navigation bar.',
    colors: ['#ffffff', '#0284c7', '#f1f5f9', '#cbd5e1'],
    layout: 'top-nav',
    badge: 'Light / Dark',
    preview: {
      bg: '#f1f5f9',
      sidebar: '#ffffff',
      topbar: '#ffffff',
      card: '#ffffff',
      accent: '#0284c7',
      text: '#0f172a',
      textMuted: '#64748b',
    },
  },
  aurora: {
    id: 'aurora',
    name: 'Aurora',
    description: 'Emerald teal design with white & dark modes.',
    colors: ['#ffffff', '#10b981', '#f0fdf4', '#bbf7d0'],
    layout: 'sidebar',
    badge: 'Light / Dark',
    preview: {
      bg: '#f0fdf4',
      sidebar: '#ffffff',
      topbar: '#ffffff',
      card: '#ffffff',
      accent: '#10b981',
      text: '#064e3b',
      textMuted: '#6ee7b7',
    },
  },
  rose: {
    id: 'rose',
    name: 'Rose Gold',
    description: 'Luxury rose & gold luxury with white & dark modes.',
    colors: ['#ffffff', '#f43f5e', '#fff5f7', '#fecdd3'],
    layout: 'sidebar',
    badge: 'Light / Dark',
    preview: {
      bg: '#fff5f7',
      sidebar: '#ffffff',
      topbar: '#ffffff',
      card: '#ffffff',
      accent: '#f43f5e',
      text: '#881337',
      textMuted: '#fda4af',
    },
  },
};

const LAYOUT_LABELS = {
  'sidebar': 'Collapsible Sidebar',
  'sidebar-collapse': 'Collapsible Sidebar',
  'top-nav': 'Top Navigation',
};

function MiniDashboardPreview({ p }) {
  return (
    <div
      className="w-full h-full rounded-xl overflow-hidden flex"
      style={{ background: p.bg, border: `1px solid ${p.topbar}22` }}
    >
      <div
        className="w-[22%] h-full flex flex-col gap-1 p-1.5"
        style={{ background: p.sidebar }}
      >
        <div className="flex items-center gap-1 mb-1.5">
          <div className="w-3 h-3 rounded-full" style={{ background: p.accent }} />
          <div className="h-1.5 w-8 rounded-full" style={{ background: p.accent, opacity: 0.5 }} />
        </div>
        {[1,2,3,4].map(i => (
          <div
            key={i}
            className="h-1.5 rounded-full"
            style={{ background: i === 1 ? p.accent : p.textMuted, opacity: i === 1 ? 0.8 : 0.25, width: `${55 + i * 8}%` }}
          />
        ))}
      </div>
      <div className="flex-1 flex flex-col">
        <div className="h-[18%] flex items-center px-2" style={{ background: p.topbar }}>
          <div className="h-1.5 w-12 rounded-full" style={{ background: p.text, opacity: 0.6 }} />
        </div>
        <div className="flex-1 p-1.5 grid grid-cols-2 gap-1">
          {[p.accent, p.accent + 'aa', '#10b981', '#f59e0b'].map((c, i) => (
            <div
              key={i}
              className="rounded-lg p-1 flex flex-col gap-0.5"
              style={{ background: p.card, border: `1px solid ${p.textMuted}22` }}
            >
              <div className="w-3 h-3 rounded-md" style={{ background: c, opacity: 0.8 }} />
              <div className="h-1 rounded" style={{ background: p.text, opacity: 0.5, width: '70%' }} />
              <div className="h-1 rounded" style={{ background: p.textMuted, opacity: 0.3, width: '40%' }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TemplatePickerSection({ planName }) {
  const { theme: activeTheme, setTheme } = useThemeStore();
  const [hoveredId, setHoveredId] = React.useState(null);
  const [lockedTmplName, setLockedTmplName] = React.useState(null);
  const { addToast } = useToastStore();
  const navigate = useNavigate();
  const plan = (planName || 'free').toLowerCase();

  const isTemplateLocked = (tmplId) => {
    if (!isFeatureAllowed(planName, 'admin_template')) return true;
    if (plan === 'pro' && !['classic', 'midnight'].includes(tmplId)) return true;
    return false;
  };

  const handleTemplateClick = (tmplId, tmplName) => {
    if (isTemplateLocked(tmplId)) {
      addToast(`🔒 Please upgrade your plan to use ${tmplName}`, 'error');
      setLockedTmplName(tmplName);
      return;
    }
    setTheme(tmplId);
    addToast(`Switched UI template to ${tmplName}`, 'success');
  };

  return (
    <section className="bg-white p-3 sm:p-4 rounded-2xl shadow-sm border border-gray-100">
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
          <Palette className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-base font-bold text-gray-900">Admin UI Templates</h3>
          <p className="text-[10px] text-gray-500">Switch between different dashboard UI & navigation layouts</p>
        </div>
      </div>

      <div className="flex overflow-x-auto pb-2 scrollbar-hide snap-x sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
        {Object.values(TEMPLATE_META).map((tmpl) => {
          const isActive = activeTheme === tmpl.id || (activeTheme === `${tmpl.id}-dark`);
          const isHovered = hoveredId === tmpl.id;
          const locked = isTemplateLocked(tmpl.id);

          return (
            <motion.button
              key={tmpl.id}
              onClick={() => handleTemplateClick(tmpl.id, tmpl.name)}
              onMouseEnter={() => setHoveredId(tmpl.id)}
              onMouseLeave={() => setHoveredId(null)}
              whileHover={locked ? undefined : { y: -2 }}
              whileTap={locked ? undefined : { scale: 0.98 }}
              className={`text-left rounded-2xl border transition-all overflow-hidden flex flex-col p-2.5 w-[210px] shrink-0 snap-start sm:w-auto ${
                isActive
                  ? 'ring-2 ring-indigo-500 border-transparent shadow-md'
                  : locked ? 'opacity-60' : 'hover:shadow-md'
              }`}
              style={{
                background: 'var(--card-bg)',
                borderColor: isActive ? 'var(--accent)' : 'var(--border)',
              }}
            >
              <div className="w-full h-20 sm:h-24 rounded-xl overflow-hidden mb-2 relative group">
                <MiniDashboardPreview p={tmpl.preview} />
                {locked && !isActive && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-xl backdrop-blur-sm">
                    <div className="flex flex-col items-center gap-1">
                      <Lock className="w-6 h-6 text-white" />
                      <span className="text-[9px] font-bold text-white/80">Locked</span>
                    </div>
                  </div>
                )}
                {tmpl.badge && (
                  <span
                    className="absolute top-1.5 right-1.5 text-[8px] sm:text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-sm"
                    style={{
                      background: isActive ? 'var(--accent)' : 'var(--card-bg)',
                      color: isActive ? '#ffffff' : 'var(--text-primary)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    {tmpl.badge}
                  </span>
                )}
              </div>

              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-xs font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                      {tmpl.name}
                    </h4>
                    <div className="flex gap-0.5 shrink-0">
                      {tmpl.colors.slice(0, 4).map((c, i) => (
                        <div
                          key={i}
                          className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full border"
                          style={{ background: c, borderColor: 'var(--border)' }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-1 mt-0.5 border-t" style={{ borderColor: 'var(--border)' }}>
                  <span className="text-[9px] font-medium" style={{ color: 'var(--text-muted)' }}>
                    {LAYOUT_LABELS[tmpl.layout] || tmpl.layout}
                  </span>
                  {isActive ? (
                    <span
                      className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                      style={{ background: 'var(--accent-light)', color: 'var(--accent-text)' }}
                    >
                      ✓ Applied
                    </span>
                  ) : locked ? (
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full text-gray-400 flex items-center gap-1" style={{ background: 'var(--bg-elevated)' }}>
                      <Lock className="w-2.5 h-2.5" />
                      Locked
                    </span>
                  ) : (
                    <span
                      className="text-[9px] font-bold px-2 py-0.5 rounded-full transition-all"
                      style={{
                        background: isHovered ? 'var(--accent)' : 'var(--bg-elevated)',
                        color: isHovered ? '#ffffff' : 'var(--text-secondary)',
                      }}
                    >
                      Apply
                    </span>
                  )}
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      <ConfirmDialog
        open={!!lockedTmplName}
        onClose={() => setLockedTmplName(null)}
        onConfirm={() => {
          setLockedTmplName(null);
          navigate('/subscription');
        }}
        title="Upgrade Required"
        message={`The "${lockedTmplName}" UI template is available on Standard and Business plans. Would you like to upgrade your plan now?`}
        confirmText="Upgrade Plan"
        variant="primary"
      />
    </section>
  );
}

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
    return fileId ? `${API_BASE}/telegram/file/${encodeURIComponent(fileId)}?bot_id=${botId}` : null;
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
    const is3_1 = Math.abs(ratio - 3) < 0.05;
    const is16_9 = Math.abs(ratio - 16/9) < 0.05;
    if (!is3_1 && !is16_9) {
      addToast('Image must be 3:1 (1200×400) or 16:9 (1920×1080) ratio. Current: ' + img.width + '×' + img.height, 'error');
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
  const { user } = useAuthStore();
  const { selectedBotId, bots, setBots } = useBotStore();
  const { addToast } = useToastStore();
  const queryClient = useQueryClient();

  const isTempAccount = Boolean(user?.is_temp_account);

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

  const { data: mmpayStatus } = useQuery({
    queryKey: ['shop-mmpay-status', selectedBotId],
    queryFn: () => getShopMmpayStatus(selectedBotId),
    enabled: !!selectedBotId,
  });

  const isMmpayEnabled = Boolean(
    mmpayStatus?.configured && mmpayStatus?.superadmin_enabled && mmpayStatus?.shop_enabled
  );

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

  const updateBotMutation = useMutation({
    mutationFn: (data) => updateBot(selectedBotId, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['bots', selectedBotId]);
      addToast('Currency updated');
    },
    onError: () => addToast('Failed to update currency', 'error'),
  });

  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [currencySearch, setCurrencySearch] = useState('');

  const currentCurrency = getCurrencyByCode(bot?.currency);
  const filteredCurrencies = currencySearch.trim()
    ? currencies.filter(c =>
        c.code.toLowerCase().includes(currencySearch.toLowerCase()) ||
        c.name.toLowerCase().includes(currencySearch.toLowerCase()) ||
        c.countries.toLowerCase().includes(currencySearch.toLowerCase())
      )
    : currencies;

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
  const [selectedTopbarColor, setSelectedTopbarColor] = useState(() => localStorage.getItem('topbar_color') || DEFAULT_TOPBAR_THEME);
  const lastTopbarColorChangeRef = useRef(0);
  const [topbarCooldownLeft, setTopbarCooldownLeft] = useState(0);

  useEffect(() => {
    if (topbarCooldownLeft <= 0) return;
    const timer = setInterval(() => {
      setTopbarCooldownLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [topbarCooldownLeft]);

  const handleSelectTopbarColor = (colorKey) => {
    if (colorKey === selectedTopbarColor) return;

    const now = Date.now();
    const elapsedSeconds = (now - lastTopbarColorChangeRef.current) / 1000;
    if (elapsedSeconds < 5) {
      const remaining = Math.ceil(5 - elapsedSeconds);
      setTopbarCooldownLeft(remaining);
      addToast(`Please wait ${remaining} second${remaining > 1 ? 's' : ''} before changing theme again`, 'warning');
      return;
    }

    lastTopbarColorChangeRef.current = now;
    setTopbarCooldownLeft(5);
    setSelectedTopbarColor(colorKey);
    localStorage.setItem('topbar_color', colorKey);
    window.dispatchEvent(new Event('topbar_color_change'));
    addToast('Top bar theme updated', 'success');
    updateContentMutation.mutate({ key: 'topbar_color', data: { color: colorKey } });
  };
  const [orderButtonLabel, setOrderButtonLabel] = useState('Buy Now');
  const [orderButtonUrl, setOrderButtonUrl] = useState('');
  const [orderButtonType, setOrderButtonType] = useState('text');
  const [showBioPopup, setShowBioPopup] = useState(false);
  const [showOrderBtnPopup, setShowOrderBtnPopup] = useState(false);

  // Quick Questions State
  const [showQuickQuestionModal, setShowQuickQuestionModal] = useState(false);
  const [quickQuestionsExpanded, setQuickQuestionsExpanded] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [questionText, setQuestionText] = useState('');
  const [responseType, setResponseType] = useState('preset');
  const [presetAnswerText, setPresetAnswerText] = useState('');

  const { data: quickQuestions = [], refetch: refetchQuickQuestions } = useQuery({
    queryKey: ['quickQuestions', selectedBotId],
    queryFn: () => getAdminQuickQuestions(selectedBotId),
    enabled: !!selectedBotId,
  });

  const createQuestionMutation = useMutation({
    mutationFn: createQuickQuestion,
    onSuccess: () => {
      addToast('Quick question created', 'success');
      setShowQuickQuestionModal(false);
      resetQuestionForm();
      refetchQuickQuestions();
    },
    onError: (err) => addToast(err.response?.data?.detail || 'Failed to create question', 'error'),
  });

  const updateQuestionMutation = useMutation({
    mutationFn: updateQuickQuestion,
    onSuccess: () => {
      addToast('Quick question updated', 'success');
      setShowQuickQuestionModal(false);
      resetQuestionForm();
      refetchQuickQuestions();
    },
    onError: (err) => addToast(err.response?.data?.detail || 'Failed to update question', 'error'),
  });

  const deleteQuestionMutation = useMutation({
    mutationFn: deleteQuickQuestion,
    onSuccess: () => {
      addToast('Quick question deleted', 'success');
      refetchQuickQuestions();
    },
    onError: (err) => addToast(err.response?.data?.detail || 'Failed to delete question', 'error'),
  });

  const resetQuestionForm = () => {
    setEditingQuestion(null);
    setQuestionText('');
    setResponseType('preset');
    setPresetAnswerText('');
  };

  const fileInputRef = React.useRef(null);
  const bioTextareaRef = useRef(null);

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
      const topbarBlock = contentBlocks.find(b => b.key === 'topbar_color');
      if (topbarBlock?.content_data?.color) {
        setSelectedTopbarColor(topbarBlock.content_data.color);
        localStorage.setItem('topbar_color', topbarBlock.content_data.color);
        window.dispatchEvent(new Event('topbar_color_change'));
      }
      const bioBlock = contentBlocks.find(b => b.key === 'shop_bio');
      setBioText(bioBlock?.content_data?.text || '');
      const orderBtnBlock = contentBlocks.find(b => b.key === 'order_button_name');
      const obData = orderBtnBlock?.content_data;
      if (obData) {
        setOrderButtonLabel(obData.label || 'Buy Now');
        setOrderButtonUrl(obData.url || '');
        setOrderButtonType(obData.type || (obData.label === 'Link' ? 'link' : 'text'));
      } else {
        setOrderButtonLabel('Buy Now');
        setOrderButtonUrl('');
        setOrderButtonType('text');
      }
    }
    if (aiSettings) {
      setAiApiKey(aiSettings.api_key || '');
      setAiWebsiteContext(aiSettings.website_system_context || '');
      setAiIsEnabled(aiSettings.is_enabled !== false);
      setAiGender(aiSettings.gender || 'male');
    }
  }, [contentBlocks, aiSettings]);

  useEffect(() => {
    if (showBioPopup && bioTextareaRef.current) {
      bioTextareaRef.current.style.height = 'auto';
      bioTextareaRef.current.style.height = bioTextareaRef.current.scrollHeight + 'px';
    }
  }, [showBioPopup, bioText]);

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
    URL.revokeObjectURL(url);
    setUploading(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, 512, 512);
      const resizedBlob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.9));
      const resizedFile = new File([resizedBlob], 'logo.jpg', { type: 'image/jpeg' });

      const formData = new FormData();
      formData.append('file', resizedFile);
      formData.append('bot_id', String(selectedBotId));
      const res = await fetch(`${API_BASE}/upload/profile-picture`, {
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
        <h1 className="text-lg sm:text-2xl lg:text-3xl font-bold text-gray-900">Customization</h1>
      </div>

      <div className="grid grid-cols-1 gap-3 md:gap-6 items-start">

        {/* Admin UI Templates */}
        <TemplatePickerSection planName={bot?.plan_name} />

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

        {/* Admin Top Bar Theme */}
        <section className="bg-white p-3.5 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <LayoutGrid className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Admin Top Bar Theme</h3>
                <p className="text-[10px] text-gray-500">Choose the color scheme for your admin top navigation bar</p>
              </div>
            </div>
            {topbarCooldownLeft > 0 && (
              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200/80 flex items-center gap-1 shadow-2xs">
                <Clock className="w-3 h-3 text-amber-600 animate-pulse" />
                Wait {topbarCooldownLeft}s
              </span>
            )}
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2.5">
            {Object.entries(TOPBAR_THEMES).map(([key, theme]) => {
              const isActive = selectedTopbarColor === key;
              return (
                <button
                  key={key}
                  onClick={() => handleSelectTopbarColor(key)}
                  className="flex flex-col items-center gap-1.5 group cursor-pointer"
                >
                  <div
                    className={`w-full rounded-xl transition-all shadow-xs ${isActive ? 'ring-2 ring-offset-2 ring-indigo-600 scale-105 border border-indigo-400' : 'group-hover:scale-105 border border-gray-200'}`}
                    style={{ background: theme.preview, paddingBottom: '55%' }}
                  />
                  <span className={`text-[10px] font-medium text-center leading-tight ${isActive ? 'text-indigo-600 font-bold' : 'text-gray-600'}`}>
                    {theme.name}
                  </span>
                </button>
              );
            })}
          </div>
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
          <div className="flex flex-col md:flex-row md:items-center gap-3">
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
            </div>
            <div className="hidden md:block w-px h-8 bg-gray-200" />
            <button
              onClick={() => setShowBioPopup(true)}
              className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl border border-gray-100 hover:bg-gray-100 transition-all text-left w-full md:flex-1"
            >
              <Edit2 className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              <span className="text-xs text-gray-700 truncate flex-1">
                {bioText ? (bioText.length > 40 ? bioText.slice(0, 40) + '...' : bioText) : <span className="text-gray-400 italic">Add a shop bio...</span>}
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            </button>
          </div>
        </section>

        {/* Social Media & Contact Links */}
        <section className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-gray-900">Social Media & Contact Links</h3>
                {!isFeatureAllowed(bot?.plan_name, 'social_links') && (
                  <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Requires Business Plan
                  </span>
                )}
              </div>
              <p className="text-[10px] text-gray-500">Configure up to 3 links/numbers per platform for your public shop popup</p>
            </div>
          </div>

          <SocialLinksEditor
            contentBlocks={contentBlocks}
            planName={bot?.plan_name}
            onSave={(data) => updateContentMutation.mutate({ key: 'social_links', data })}
            isPending={updateContentMutation.isPending}
          />
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
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">Enable AI Agent</span>
                {!isFeatureAllowed(bot?.plan_name, 'ai_agent') && (
                  <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">Requires Standard+</span>
                )}
              </div>
              <button
                onClick={() => {
                  if (!requireFeature(bot?.plan_name, 'ai_agent', addToast)) return;
                  const newVal = !aiIsEnabled;
                  setAiIsEnabled(newVal);
                  updateAiMutation.mutate({ is_enabled: newVal, api_key: aiApiKey, gender: aiGender });
                }}
                className={`w-12 h-6 rounded-full transition-colors relative ${!isFeatureAllowed(bot?.plan_name, 'ai_agent') ? 'opacity-40 cursor-not-allowed' : ''} ${aiIsEnabled ? 'bg-cyan-500' : 'bg-gray-300'}`}
              >
                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${aiIsEnabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
              </button>
            </div>
            {aiIsEnabled && !aiWebsiteContext && (
              <p className="text-[10px] text-gray-400 italic">Using default system prompt — add a custom prompt below to tailor responses</p>
            )}
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

            {/* Web Chat Quick Questions Sub-Section */}
            <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
              <div
                className="flex items-center justify-between cursor-pointer select-none group"
                onClick={() => setQuickQuestionsExpanded(prev => !prev)}
              >
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-cyan-600" />
                    Quick Questions
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-700 ml-1">
                      {quickQuestions.length}
                    </span>
                  </h4>
                  <button
                    type="button"
                    className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 group-hover:text-gray-700 transition-colors"
                  >
                    {quickQuestionsExpanded ? (
                      <ChevronDown className="w-4 h-4 text-cyan-600" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    resetQuestionForm();
                    setShowQuickQuestionModal(true);
                  }}
                  className="px-2.5 py-1 bg-cyan-50 text-cyan-700 hover:bg-cyan-100 font-bold rounded-lg text-xs flex items-center gap-1 transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Question
                </button>
              </div>

              {quickQuestionsExpanded && (
                <div className="space-y-2 pt-1">
                  {quickQuestions.length === 0 ? (
                    <button
                      type="button"
                      onClick={() => {
                        resetQuestionForm();
                        setShowQuickQuestionModal(true);
                      }}
                      className="w-full p-3 rounded-xl bg-gray-50 hover:bg-cyan-50/50 text-center text-xs text-gray-500 border border-dashed border-gray-200 hover:border-cyan-300 transition-all cursor-pointer block"
                    >
                      No quick questions added yet. Click "+ Add Question" above to create one.
                    </button>
                  ) : (
                    quickQuestions.map((q) => (
                      <div key={q.id} className="p-2.5 rounded-xl bg-gray-50 border border-gray-100 flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                              q.response_type === 'preset' ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 'bg-purple-50 text-purple-600 border border-purple-100'
                            }`}>
                              {q.response_type === 'preset' ? 'Preset Message' : 'AI Answer'}
                            </span>
                            {!q.is_active && (
                              <span className="text-[9px] font-semibold text-gray-400 bg-gray-200 px-1.5 py-0.5 rounded">Disabled</span>
                            )}
                          </div>
                          <p className="text-xs font-bold text-gray-800 truncate">{q.question}</p>
                          {q.response_type === 'preset' && q.preset_answer && (
                            <p className="text-[11px] text-gray-500 line-clamp-1 mt-0.5 italic">"{q.preset_answer}"</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              updateQuestionMutation.mutate({
                                id: q.id,
                                question: q.question,
                                response_type: q.response_type,
                                preset_answer: q.preset_answer,
                                is_active: !q.is_active
                              });
                            }}
                            className={`p-1.5 rounded-lg text-xs transition-colors ${q.is_active ? 'text-cyan-600 hover:bg-cyan-50' : 'text-gray-400 hover:bg-gray-200'}`}
                            title={q.is_active ? "Disable" : "Enable"}
                          >
                            {q.is_active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingQuestion(q);
                              setQuestionText(q.question);
                              setResponseType(q.response_type);
                              setPresetAnswerText(q.preset_answer || '');
                              setShowQuickQuestionModal(true);
                            }}
                            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-200 hover:text-gray-700 transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm('Delete this quick question?')) {
                                deleteQuestionMutation.mutate(q.id);
                              }
                            }}
                            className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
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
              {orderButtonLabel === 'Link' && orderButtonUrl && (
                <span className="text-xs font-normal text-indigo-600 ml-1.5 truncate">
                  ({orderButtonUrl})
                </span>
              )}
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
          </button>
        </section>

        {/* Currency */}
        <section className={`p-3 rounded-2xl shadow-sm border transition-all ${
          isMmpayEnabled
            ? 'bg-amber-50/40 border-amber-200/70'
            : 'bg-white border-gray-100'
        }`}>
          <div className="flex items-center gap-2.5 mb-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              isMmpayEnabled ? 'bg-amber-100 text-amber-700' : 'bg-green-50 text-green-600'
            }`}>
              <DollarSign className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-gray-900">Currency</h3>
                {isMmpayEnabled && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-100/80 text-amber-800 border border-amber-300/80 px-2 py-0.5 rounded-md">
                    <Lock className="w-3 h-3 text-amber-700" /> Locked (MyanMyanPay Active)
                  </span>
                )}
              </div>
              <p className="text-[10px] text-gray-500">
                {isMmpayEnabled
                  ? 'Locked to MMK — MyanMyanPay only accepts MMK'
                  : 'Set the currency for your bot and shop'
                }
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              if (isMmpayEnabled) {
                addToast('Currency is locked to MMK while MyanMyanPay is enabled.', 'error');
                return;
              }
              setShowCurrencyModal(true);
            }}
            disabled={isMmpayEnabled}
            className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border transition-all text-left ${
              isMmpayEnabled
                ? 'bg-gray-100/80 border-gray-200 opacity-60 cursor-not-allowed text-gray-400'
                : 'bg-gray-50 border-gray-100 hover:bg-gray-100 text-gray-700'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            <span className="text-sm font-medium truncate flex-1">
              {currentCurrency
                ? <><span className="font-bold">{currentCurrency.code}</span> — {currentCurrency.name} ({currentCurrency.symbol})</>
                : <span className="text-gray-400 italic">MMK — Myanmar Kyat (default)</span>
              }
            </span>
            {isMmpayEnabled ? (
              <Lock className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            )}
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
            <p className="text-[10px] text-gray-500">Banner images for your public shop (3:1 or 16:9, max 5)</p>
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
                ref={bioTextareaRef}
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
                        if (option !== 'Link') {
                          updateContentMutation.mutate({ key: 'order_button_name', data: { label: option, type: 'text', url: '' } });
                          setShowOrderBtnPopup(false);
                        }
                      }}
                      disabled={updateContentMutation.isPending}
                      className={`px-3 py-2 rounded-xl font-bold text-xs whitespace-nowrap transition-all active:scale-[0.97] ${
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

              {orderButtonLabel === 'Link' && (
                <div className="mt-3.5 p-3.5 bg-gray-50 rounded-2xl border border-gray-100 space-y-2.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-gray-800">
                    <Link className="w-4 h-4 text-indigo-600" />
                    <span>Redirect Link (URL)</span>
                  </div>
                  <p className="text-[10px] text-gray-500 leading-normal">
                    Enter the URL to redirect customers when they click the order button (e.g. website, Telegram channel, Shopee).
                  </p>
                  <input
                    type="url"
                    value={orderButtonUrl}
                    onChange={(e) => setOrderButtonUrl(e.target.value)}
                    placeholder="https://example.com or https://t.me/username"
                    className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                  />
                  <button
                    onClick={() => {
                      const finalUrl = orderButtonUrl.trim();
                      if (!finalUrl) {
                        addToast('Please enter a valid URL', 'error');
                        return;
                      }
                      updateContentMutation.mutate({
                        key: 'order_button_name',
                        data: { label: 'Link', type: 'link', url: finalUrl }
                      });
                      setShowOrderBtnPopup(false);
                    }}
                    disabled={updateContentMutation.isPending}
                    className="w-full py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-xs hover:bg-indigo-700 transition-all shadow-sm disabled:opacity-40"
                  >
                    Save Redirect Link
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick Question Modal */}
      <AnimatePresence>
        {showQuickQuestionModal && (
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
              onClick={() => { setShowQuickQuestionModal(false); resetQuestionForm(); }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white rounded-3xl shadow-2xl p-6 max-w-md w-full mx-auto space-y-4 z-10"
            >
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h3 className="text-base font-bold text-gray-900">
                  {editingQuestion ? 'Edit Quick Question' : 'Add Quick Question'}
                </h3>
                <button
                  type="button"
                  onClick={() => { setShowQuickQuestionModal(false); resetQuestionForm(); }}
                  className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-gray-700 mb-1 block">Question Text</label>
                  <input
                    type="text"
                    value={questionText}
                    onChange={(e) => setQuestionText(e.target.value)}
                    placeholder="e.g. What are your delivery fees?"
                    className="w-full text-sm border border-gray-200 rounded-xl px-3.5 py-2.5 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 mb-1.5 block">Response Type</label>
                  <div className="grid grid-cols-2 gap-2 bg-gray-100 p-1 rounded-2xl">
                    <button
                      type="button"
                      onClick={() => setResponseType('preset')}
                      className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                        responseType === 'preset' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <span>Preset Message</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setResponseType('ai')}
                      className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                        responseType === 'ai' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <span>AI Answer</span>
                    </button>
                  </div>
                </div>

                {responseType === 'preset' && (
                  <div>
                    <label className="text-xs font-bold text-gray-700 mb-1 block">Preset Answer Message</label>
                    <textarea
                      value={presetAnswerText}
                      onChange={(e) => setPresetAnswerText(e.target.value)}
                      placeholder="Type the exact answer to display when tapped..."
                      rows={3}
                      className="w-full text-sm border border-gray-200 rounded-xl px-3.5 py-2.5 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                    />
                  </div>
                )}

                {responseType === 'ai' && (
                  <div className="p-3 rounded-xl bg-purple-50 border border-purple-100 text-purple-800 text-xs leading-relaxed">
                    🤖 When the customer taps this question, the AI Agent will generate a smart answer based on your shop's products and context.
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowQuickQuestionModal(false); resetQuestionForm(); }}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-600 font-bold rounded-xl text-sm hover:bg-gray-200 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!questionText.trim()) return addToast('Please enter question text', 'error');
                    if (responseType === 'preset' && !presetAnswerText.trim()) return addToast('Please enter preset answer', 'error');

                    if (editingQuestion) {
                      updateQuestionMutation.mutate({
                        id: editingQuestion.id,
                        question: questionText.trim(),
                        response_type: responseType,
                        preset_answer: presetAnswerText.trim(),
                        is_active: editingQuestion.is_active,
                      });
                    } else {
                      createQuestionMutation.mutate({
                        bot_id: selectedBotId,
                        question: questionText.trim(),
                        response_type: responseType,
                        preset_answer: presetAnswerText.trim(),
                      });
                    }
                  }}
                  disabled={createQuestionMutation.isPending || updateQuestionMutation.isPending}
                  className="flex-1 py-2.5 bg-cyan-500 text-white font-bold rounded-xl text-sm hover:bg-cyan-600 transition-all flex items-center justify-center gap-1.5"
                >
                  {(createQuestionMutation.isPending || updateQuestionMutation.isPending) && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{editingQuestion ? 'Save Changes' : 'Create Question'}</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Currency Modal */}
      <AnimatePresence>
        {showCurrencyModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex flex-col bg-white"
          >
            <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b border-gray-100 shrink-0">
              <div>
                <h3 className="text-base font-bold text-gray-900">Select Currency</h3>
                <p className="text-[10px] text-gray-400">Choose the currency for prices across your bot & shop</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setShowCurrencyModal(false); setCurrencySearch(''); }}
                  className="px-3 py-1.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-all active:scale-[0.98] text-sm"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="px-4 py-3 border-b border-gray-100 shrink-0">
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={currencySearch}
                  onChange={e => setCurrencySearch(e.target.value)}
                  placeholder="Search currency by code, name, or country..."
                  className="w-full text-sm border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 bg-gray-50 text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {filteredCurrencies.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-sm">No currencies match your search.</div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {filteredCurrencies.map(c => {
                    const isSelected = bot?.currency === c.code || (!bot?.currency && c.code === 'MMK');
                    return (
                      <button
                        key={c.code}
                        onClick={() => {
                          updateBotMutation.mutate({ currency: c.code });
                          setShowCurrencyModal(false);
                          setCurrencySearch('');
                        }}
                        disabled={updateBotMutation.isPending}
                        className={`w-full flex items-center gap-3 px-5 py-3 text-left transition-all hover:bg-gray-50 active:scale-[0.99] ${
                          isSelected ? 'bg-indigo-50/50' : ''
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                          isSelected
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {c.symbol}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-bold ${isSelected ? 'text-indigo-700' : 'text-gray-900'}`}>
                              {c.code}
                            </span>
                            {isSelected && (
                              <CheckCircle2 className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-gray-500 truncate">{c.name}</p>
                          <p className="text-[10px] text-gray-400 truncate">{c.countries}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

const ORDER_BUTTON_OPTIONS = [
  'Order Now', 'Shop Now', 'Buy Now', 'Enroll Now', 'Book Now', 'Get Now', 'Grab Now', 'Link',
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

const PLATFORMS_CONFIG = [
  { id: 'phone', label: 'Phone', imgSrc: '/social-icons/Phone.png', color: 'bg-emerald-50 text-emerald-600 border-emerald-200', placeholder: 'e.g. 09123456789 (digits only)' },
  { id: 'facebook', label: 'Facebook', imgSrc: '/social-icons/Facebook.png', color: 'bg-blue-50 text-blue-600 border-blue-200', placeholder: 'e.g. https://facebook.com/yourpage' },
  { id: 'telegram', label: 'Telegram', imgSrc: '/social-icons/Telegram.png', color: 'bg-sky-50 text-sky-600 border-sky-200', placeholder: 'e.g. https://t.me/yourchannel' },
  { id: 'tiktok', label: 'TikTok', imgSrc: '/social-icons/TikTok.png', color: 'bg-neutral-100 text-neutral-800 border-neutral-200', placeholder: 'e.g. https://tiktok.com/@yourprofile' },
  { id: 'viber', label: 'Viber', imgSrc: '/social-icons/Viber.png', color: 'bg-purple-50 text-purple-600 border-purple-200', placeholder: 'e.g. 09123456789 (digits only)' },
  { id: 'whatsapp', label: 'WhatsApp', imgSrc: '/social-icons/Whatsapp.png', color: 'bg-emerald-50 text-emerald-600 border-emerald-200', placeholder: 'e.g. 09123456789 (phone number only)' },
  { id: 'youtube', label: 'YouTube', imgSrc: '/social-icons/YouTube.png', color: 'bg-red-50 text-red-600 border-red-200', placeholder: 'e.g. https://youtube.com/@yourchannel' },
  { id: 'email', label: 'Email', imgSrc: '/social-icons/mail.png', color: 'bg-amber-50 text-amber-600 border-amber-200', placeholder: 'e.g. support@shop.com' },
  { id: 'custom', label: 'Custom Link', imgSrc: '/social-icons/Website.png', color: 'bg-indigo-50 text-indigo-600 border-indigo-200', placeholder: 'e.g. https://yourwebsite.com' },
];

function validateSocialLink(platform, value) {
  const val = (value || '').trim();
  if (!val) return 'Value cannot be empty';

  if (platform === 'phone' || platform === 'viber' || platform === 'whatsapp') {
    const digitsOnly = val.replace(/[^0-9+]/g, '');
    if (digitsOnly.length < 5) {
      return `Please enter a valid phone number (digits only)`;
    }
    return null;
  }

  if (platform === 'facebook') {
    const lower = val.toLowerCase();
    if (!lower.includes('facebook.com') && !lower.includes('fb.com') && !lower.includes('fb.watch') && !lower.includes('fb.me')) {
      return 'Must be a valid Facebook URL (e.g. facebook.com/yourpage)';
    }
    return null;
  }

  if (platform === 'telegram') {
    const lower = val.toLowerCase();
    if (!lower.includes('t.me') && !lower.includes('telegram.me') && !lower.includes('telegram.dog')) {
      return 'Must be a valid Telegram link (e.g. t.me/yourchannel)';
    }
    return null;
  }

  if (platform === 'tiktok') {
    const lower = val.toLowerCase();
    if (!lower.includes('tiktok.com')) {
      return 'Must be a valid TikTok link (e.g. tiktok.com/@yourprofile)';
    }
    return null;
  }

  if (platform === 'youtube') {
    const lower = val.toLowerCase();
    if (!lower.includes('youtube.com') && !lower.includes('youtu.be')) {
      return 'Must be a valid YouTube link (e.g. youtube.com/@channel)';
    }
    return null;
  }

  if (platform === 'email') {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(val)) {
      return 'Please enter a valid email (e.g. support@domain.com)';
    }
    return null;
  }

  if (platform === 'custom') {
    if (!val.includes('.') && !val.startsWith('http')) {
      return 'Please enter a valid URL (e.g. https://yourwebsite.com)';
    }
    return null;
  }

  return null;
}

function SocialLinksEditor({ contentBlocks, planName, onSave, isPending }) {
  const { addToast } = useToastStore();
  const block = contentBlocks?.find((b) => b.key === 'social_links');
  let initialLinks = [];
  if (block?.content_data) {
    const cd = block.content_data;
    if (Array.isArray(cd)) initialLinks = cd;
    else if (typeof cd === 'object' && Array.isArray(cd.links)) initialLinks = cd.links;
  }

  const [links, setLinks] = useState(() => initialLinks);
  const [activeTab, setActiveTab] = useState('phone');
  const [errors, setErrors] = useState({});

  const checkPlanAccess = () => {
    if (!isFeatureAllowed(planName, 'social_links')) {
      addToast("Your plan now allowed to use this featuer, Please Upgrade!", "warning");
      return false;
    }
    return true;
  };

  useEffect(() => {
    if (block?.content_data) {
      const cd = block.content_data;
      if (Array.isArray(cd)) setLinks(cd);
      else if (typeof cd === 'object' && Array.isArray(cd.links)) setLinks(cd.links);
    }
  }, [block?.content_data]);

  const getLinksForPlatform = (platformId) => links.filter((l) => l.platform === platformId);

  const addLink = (platformId) => {
    if (!checkPlanAccess()) return;
    const existing = getLinksForPlatform(platformId);
    if (existing.length >= 3) return;
    const newLink = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 4),
      platform: platformId,
      label: `${PLATFORMS_CONFIG.find(p => p.id === platformId)?.label || 'Link'} ${existing.length + 1}`,
      value: '',
    };
    setLinks([...links, newLink]);
  };

  const updateLink = (id, field, value) => {
    setLinks(links.map((l) => (l.id === id ? { ...l, [field]: value } : l)));
    if (errors[id]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  };

  const removeLink = (id) => {
    setLinks(links.filter((l) => l.id !== id));
    if (errors[id]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  };

  const handleSave = () => {
    if (!checkPlanAccess()) return;
    const newErrors = {};
    for (const item of links) {
      const err = validateSocialLink(item.platform, item.value);
      if (err) {
        newErrors[item.id] = err;
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      const firstErrId = Object.keys(newErrors)[0];
      const firstErrItem = links.find((l) => l.id === firstErrId);
      if (firstErrItem) {
        setActiveTab(firstErrItem.platform);
      }
      addToast('Please fix the link format errors before saving', 'error');
      return;
    }

    setErrors({});
    onSave({ links });
  };

  const activeConfig = PLATFORMS_CONFIG.find((p) => p.id === activeTab) || PLATFORMS_CONFIG[0];
  const activeItems = getLinksForPlatform(activeTab);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar scroll-smooth">
        {PLATFORMS_CONFIG.map((p) => {
          const platformItems = getLinksForPlatform(p.id);
          const count = platformItems.length;
          const hasErr = platformItems.some((item) => !!errors[item.id]);
          const isActive = activeTab === p.id;
          return (
            <button
              key={p.id}
              onClick={() => setActiveTab(p.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                hasErr
                  ? 'bg-rose-50 text-rose-600 border border-rose-300'
                  : isActive
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <img src={p.imgSrc} alt="" className="w-4 h-4 object-contain" />
              <span>{p.label}</span>
              {count > 0 && (
                <span className={`px-1.5 py-0.5 text-[10px] rounded-full font-bold ${
                  hasErr ? 'bg-rose-600 text-white' : isActive ? 'bg-white text-indigo-600' : 'bg-gray-200 text-gray-700'
                }`}>
                  {count}/3
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="bg-gray-50 rounded-2xl p-3 border border-gray-100 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`p-1.5 rounded-lg border text-xs font-bold ${activeConfig.color}`}>
              {activeConfig.label}
            </span>
            <span className="text-xs text-gray-500 font-medium">({activeItems.length}/3 entries)</span>
          </div>
          <button
            onClick={() => addLink(activeTab)}
            disabled={activeItems.length >= 3}
            className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Add {activeConfig.label}
          </button>
        </div>

        {activeItems.length === 0 ? (
          <p className="text-xs text-gray-400 italic text-center py-4">No links added for {activeConfig.label} yet (Max 3)</p>
        ) : (
          <div className="space-y-2">
            {activeItems.map((item) => {
              const err = errors[item.id];
              return (
                <div key={item.id} className="space-y-1">
                  <div className={`bg-white rounded-xl p-2.5 border transition-colors flex flex-col sm:flex-row items-stretch sm:items-center gap-2 ${
                    err ? 'border-rose-400 bg-rose-50/20' : 'border-gray-200'
                  }`}>
                    <input
                      type="text"
                      value={item.label || ''}
                      onChange={(e) => updateLink(item.id, 'label', e.target.value)}
                      placeholder="Title (e.g. Main Office)"
                      className="w-full sm:w-1/3 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold text-gray-900 focus:outline-none focus:border-indigo-500"
                    />
                    <div className="w-full sm:flex-1 relative">
                      <input
                        type="text"
                        value={item.value || ''}
                        onChange={(e) => updateLink(item.id, 'value', e.target.value)}
                        placeholder={activeConfig.placeholder}
                        className={`w-full px-3 py-1.5 bg-gray-50 border rounded-lg text-xs text-gray-900 focus:outline-none ${
                          err ? 'border-rose-400 focus:border-rose-500' : 'border-gray-200 focus:border-indigo-500'
                        }`}
                      />
                      {activeTab === 'whatsapp' && (
                        <p className="text-[10px] text-emerald-600 font-medium mt-0.5 ml-1">
                          System will auto-prefix: <span className="font-mono">https://wa.me/{item.value.replace(/[^0-9]/g, '') || '...' }</span>
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => removeLink(item.id)}
                      title="Remove link"
                      className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer self-end sm:self-center"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  {err && (
                    <p className="text-[11px] text-rose-500 font-semibold px-2">⚠️ {err}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <button
        onClick={handleSave}
        disabled={isPending}
        className="w-full px-4 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 text-sm cursor-pointer shadow-xs"
      >
        {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        Save Social & Contact Links
      </button>
    </div>
  );
}
