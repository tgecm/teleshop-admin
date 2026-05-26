import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { useBotStore } from '../store/botStore';
import { useToastStore } from '../store/toastStore';
import { updateBot, getBot, getAiSettings, updateAiSettings, deleteBot } from '../api/bots';
import { getContentBlocks, updateContentBlock } from '../api/contentBlocks';
import { getUsers, updateUser } from '../api/customers';
import {
  getGlobalSettings,
  updateGlobalSetting,
  getPlanPayments,
  createPlanPayment,
  updatePlanPayment,
  deletePlanPayment,
  getAllBots
} from '../api/superadmin';
import { getStats } from '../api/stats';
import { uploadImage } from '../api/products';
import { getBotPublicSlug, generateBotSlug, listBotDomains, addBotDomain, verifyBotDomainItem, toggleBotDomainItem, deleteBotDomainItem } from '../api/public';
import LoadingSkeleton from '../components/shared/LoadingSkeleton';
import ConfirmDialog from '../components/shared/ConfirmDialog';
import {
  Settings as SettingsIcon,
  ShieldCheck,
  ShieldAlert,
  Globe,
  Mail,
  MessageSquare,
  Bot,
  Users,
  AlertTriangle,
  Trash2,
  Plus,
  Edit2,
  QrCode,
  Save,
  Loader2,
  CheckCircle2,
  Zap,
  Star,
  Crown,
  Key,
  Calendar,
  TrendingUp,
  Power,
  CreditCard,
  X,
  Search,
  Copy,
  RefreshCw,
  ExternalLink,
  UserCircle,
  Camera,
  ImageUp,
  Palette,
  ChevronDown,
  ChevronRight,
  HelpCircle,
  Brain,
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { THEMES, DEFAULT_THEME } from '../themes/themes';

export default function Settings() {
  const { isSuperadmin, user } = useAuthStore();
  const { selectedBotId, bots, setBots } = useBotStore();
  const { addToast } = useToastStore();
  const [activeTab, setActiveTab] = useState('shop');
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

  const { data: admins } = useQuery({
    queryKey: ['users', 'admins', selectedBotId],
    queryFn: () => getUsers({ bot_id: Number(selectedBotId), is_admin: true }),
    enabled: !!selectedBotId,
  });

  const { data: allUsers } = useQuery({
    queryKey: ['users', 'all', selectedBotId],
    queryFn: () => getUsers({ bot_id: Number(selectedBotId), limit: 500 }),
    enabled: !!selectedBotId,
  });

  const { data: aiSettings } = useQuery({
    queryKey: ['ai-settings', selectedBotId],
    queryFn: () => getAiSettings(selectedBotId),
    enabled: !!selectedBotId,
  });

  const { data: globalSettings } = useQuery({
    queryKey: ['global-settings'],
    queryFn: getGlobalSettings,
    enabled: isSuperadmin,
  });

  const { data: allBots } = useQuery({
    queryKey: ['superadmin', 'all-bots'],
    queryFn: getAllBots,
    enabled: isSuperadmin,
  });

  const { data: planPayments } = useQuery({
    queryKey: ['plan-payments'],
    queryFn: getPlanPayments,
    enabled: isSuperadmin,
  });

  const { data: globalStats } = useQuery({
    queryKey: ['global-stats'],
    queryFn: () => getStats({ bot_id: null }),
    enabled: isSuperadmin,
  });

  const updateBotMutation = useMutation({
    mutationFn: (data) => updateBot(selectedBotId, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['bots', selectedBotId]);
      addToast('Settings updated successfully');
    },
    onError: () => addToast('Failed to update settings', 'error'),
  });

  const updateContentMutation = useMutation({
    mutationFn: ({ key, data }) => updateContentBlock(selectedBotId, key, data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries(['content-blocks', selectedBotId]);
      addToast(variables.key === 'shop_theme' ? 'Theme applied' : 'Content updated successfully');
    },
    onError: () => addToast('Failed to update content', 'error'),
  });

  const removeAdminMutation = useMutation({
    mutationFn: (id) => updateUser(id, { is_admin: false }),
    onSuccess: () => {
      queryClient.invalidateQueries(['users', 'admins', selectedBotId]);
      addToast('Admin removed');
    },
  });

  const addAdminMutation = useMutation({
    mutationFn: (id) => updateUser(id, { is_admin: true }),
    onSuccess: () => {
      queryClient.invalidateQueries(['users', 'admins', selectedBotId]);
      queryClient.invalidateQueries(['users', 'all', selectedBotId]);
      addToast('Admin added');
      setAdminSearch('');
    },
    onError: () => addToast('Failed to add admin', 'error'),
  });

  const updateAiMutation = useMutation({
    mutationFn: (data) => updateAiSettings(selectedBotId, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['ai-settings', selectedBotId]);
      addToast('AI settings updated');
    },
  });

  const updateGlobalMutation = useMutation({
    mutationFn: ({ key, value }) => updateGlobalSetting(key, value),
    onSuccess: () => {
      queryClient.invalidateQueries(['global-settings']);
      addToast('Global setting updated');
    },
  });

  const deleteBotMutation = useMutation({
    mutationFn: (botId) => deleteBot(botId),
    onSuccess: () => {
      queryClient.invalidateQueries(['superadmin', 'all-bots']);
      addToast('Bot deleted successfully');
    },
    onError: (err) => {
      addToast(err.response?.data?.detail || 'Failed to delete bot', 'error');
    },
  });

  const { data: publicSlug } = useQuery({
    queryKey: ['public-slug', selectedBotId],
    queryFn: () => getBotPublicSlug(selectedBotId),
    enabled: !!selectedBotId,
  });

  const generateSlugMutation = useMutation({
    mutationFn: () => generateBotSlug(selectedBotId),
    onSuccess: () => {
      queryClient.invalidateQueries(['public-slug', selectedBotId]);
      addToast('Public shop URL generated successfully');
    },
    onError: () => addToast('Failed to generate public URL', 'error'),
  });

  const { data: domains = [] } = useQuery({
    queryKey: ['bot-domains', selectedBotId],
    queryFn: () => listBotDomains(selectedBotId),
    enabled: !!selectedBotId,
  });

  const [showAddInput, setShowAddInput] = useState(false);
  const [addDomainInput, setAddDomainInput] = useState('');
  const [deletingDomainId, setDeletingDomainId] = useState(null);

  const customDomainEnabled = domains.some(d => d.verified && d.enabled);
  const hasUnverifiedDomain = domains.some(d => !d.verified);

  const guideDomain = domains.find(d => !d.verified) || domains[0];
  const guideName = (() => {
    if (!guideDomain?.domain) return 'shop';
    const parts = guideDomain.domain.split('.');
    return parts.length <= 2 ? '@' : parts.slice(0, -2).join('.');
  })();
  const guideRootDomain = (() => {
    if (!guideDomain?.domain) return 'yourdomain.com';
    const parts = guideDomain.domain.split('.');
    return parts.slice(-2).join('.');
  })();

  const addDomainMutation = useMutation({
    mutationFn: (domain) => addBotDomain(selectedBotId, domain),
    onSuccess: () => {
      queryClient.invalidateQueries(['bot-domains', selectedBotId]);
      setShowAddInput(false);
      setAddDomainInput('');
      addToast('Custom domain added');
    },
    onError: (err) => addToast(err.response?.data?.detail || 'Failed to add domain', 'error'),
  });

  const verifyDomainMutation = useMutation({
    mutationFn: (domainId) => verifyBotDomainItem(selectedBotId, domainId),
    onSuccess: (data) => {
      queryClient.invalidateQueries(['bot-domains', selectedBotId]);
      if (data.verified) {
        addToast('Domain verified successfully');
      } else {
        addToast('Domain does not point to server IP yet. Make sure your DNS A record points to 139.180.156.116', 'error');
      }
    },
    onError: () => addToast('Verification failed', 'error'),
  });

  const toggleDomainMutation = useMutation({
    mutationFn: ({ domainId, enabled }) => toggleBotDomainItem(selectedBotId, domainId, enabled),
    onSuccess: (data) => {
      queryClient.invalidateQueries(['bot-domains', selectedBotId]);
      addToast(data.enabled ? 'Domain enabled' : 'Domain disabled');
    },
    onError: () => addToast('Failed to toggle domain', 'error'),
  });

  const deleteDomainMutation = useMutation({
    mutationFn: (domainId) => deleteBotDomainItem(selectedBotId, domainId),
    onSuccess: () => {
      queryClient.invalidateQueries(['bot-domains', selectedBotId]);
      addToast('Domain removed');
    },
    onError: () => addToast('Failed to remove domain', 'error'),
  });

  const [email, setEmail] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [websiteEnabled, setWebsiteEnabled] = useState(false);
  const [shopOpen, setShopOpen] = useState(true);
  const [aiApiKey, setAiApiKey] = useState('');
  const [aiContext, setAiContext] = useState('');
  const [aiIsEnabled, setAiIsEnabled] = useState(false);
  const [adminSearch, setAdminSearch] = useState('');
  const [profilePicture, setProfilePicture] = useState('');
  const [uploading, setUploading] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState(DEFAULT_THEME);
  const [showThemeConfirm, setShowThemeConfirm] = useState(false);
  const [pendingTheme, setPendingTheme] = useState(null);

  const [showDomainGuide, setShowDomainGuide] = useState(false);
  const fileInputRef = React.useRef(null);

  React.useEffect(() => {
    if (bot?.profile_picture) setProfilePicture(bot.profile_picture);
  }, [bot?.profile_picture]);

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

  React.useEffect(() => {
    if (bot) setEmail(bot.admin_notification_email || '');
    if (contentBlocks) {
      const web = contentBlocks.find(b => b.key === 'website_link');
      if (web) {
        setWebsiteUrl(web.content_data?.url || '');
        setWebsiteEnabled(web.content_data?.enabled !== false);
      }
      const shop = contentBlocks.find(b => b.key === 'shop_settings');
      if (shop) {
        setShopOpen(shop.content_data?.is_open !== false);
      }
      const themeBlock = contentBlocks.find(b => b.key === 'shop_theme');
      if (themeBlock?.content_data?.theme) {
        setSelectedTheme(themeBlock.content_data.theme);
      } else {
        setSelectedTheme(DEFAULT_THEME);
      }
    }
    if (aiSettings) {
      setAiApiKey(aiSettings.api_key || '');
      setAiContext(aiSettings.system_context || '');
      setAiIsEnabled(aiSettings.is_enabled !== false);
    }
  }, [bot, contentBlocks, aiSettings]);

  const tabs = [
    { id: 'shop', label: 'Shop', icon: SettingsIcon },
    { id: 'subscription', label: 'Plan', icon: ShieldCheck },
    ...(isSuperadmin ? [{ id: 'superadmin', label: 'Admin', icon: ShieldAlert }] : []),
    ...(isSuperadmin ? [{ id: 'bots', label: 'Bots', icon: Bot }] : []),
  ];

  if (botLoading) return <LoadingSkeleton type="list" count={5} />;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-lg sm:text-2xl font-bold text-gray-900">Settings</h1>
        <div className="flex bg-white p-0.5 rounded-xl shadow-sm border border-gray-100 self-start w-full sm:w-auto overflow-x-auto scrollbar-hide">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 sm:flex-none px-4 sm:px-6 py-2 text-xs sm:text-sm font-bold rounded-[10px] sm:rounded-xl transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              <tab.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-6">
        {activeTab === 'shop' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            <section className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${shopOpen ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                    <Power className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900">Shop Status</h3>
                    <p className="text-[10px] text-gray-500">Control your bot's availability</p>
                  </div>
                </div>
                <button
                  onClick={() => updateContentMutation.mutate({ key: 'shop_settings', data: { is_open: !shopOpen, auto_mode: false, open_time: null, close_time: null } })}
                  className={`w-12 h-6 rounded-full transition-colors relative ${shopOpen ? 'bg-emerald-500' : 'bg-rose-500'}`}
                >
                  <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all shadow-sm ${shopOpen ? 'left-6.5' : 'left-0.5'}`} />
                </button>
              </div>
              <p className={`text-xs font-bold text-center py-2 rounded-xl ${shopOpen ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                {shopOpen ? 'SHOP OPEN' : 'SHOP CLOSED'}
              </p>
            </section>


            <section className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Email Notifications</h3>
                  <p className="text-[10px] text-gray-500">Receive order alerts via email</p>
                </div>
              </div>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium"
                  placeholder="email@example.com"
                />
                <button
                  onClick={() => updateBotMutation.mutate({ admin_notification_email: email })}
                  className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all active:scale-[0.98] text-sm"
                >
                  Save
                </button>
              </div>
            </section>


            <section className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Globe className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900">Website Link</h3>
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
                    className="flex-1 px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium"
                    placeholder="https://..."
                  />
                  <button
                    onClick={() => updateContentMutation.mutate({ key: 'website_link', data: { url: websiteUrl, enabled: websiteEnabled } })}
                    className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all active:scale-[0.98] text-sm"
                  >
                    Save
                  </button>
                </div>
              )}
              {!websiteEnabled && (
                <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 text-center">
                  <p className="text-xs text-gray-400">Website button is hidden</p>
                </div>
              )}
            </section>


            <section className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Public Shop Page</h3>
                  <p className="text-[10px] text-gray-500">Your public-facing ecommerce page</p>
                </div>
              </div>

              <div className={`${customDomainEnabled ? 'opacity-40 pointer-events-none select-none' : ''} transition-all duration-300`}>
                {publicSlug?.slug ? (
                  <div className="space-y-2.5">
                    <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                      <p className="text-[10px] text-gray-500 font-medium mb-0.5">Your public shop URL</p>
                      <a
                        href={`https://telegramecommerce.shop/${publicSlug.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1.5 break-all"
                      >
                        telegramecommerce.shop/{publicSlug.slug}
                        <ExternalLink className="w-3 h-3 flex-shrink-0" />
                      </a>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(`https://telegramecommerce.shop/${publicSlug.slug}`);
                          addToast('URL copied to clipboard');
                        }}
                        className="flex-1 px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl hover:bg-gray-100 transition-all font-bold text-xs flex items-center justify-center gap-1.5"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        Copy URL
                      </button>
                    </div>
                  </div>
                ) : (
                <div className="space-y-2.5">
                  <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 text-center">
                    <p className="text-xs text-gray-400">No public URL generated yet</p>
                  </div>
                  <button
                    onClick={() => generateSlugMutation.mutate()}
                    disabled={generateSlugMutation.isPending}
                    className="w-full px-3 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 text-xs"
                  >
                    {generateSlugMutation.isPending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3.5 h-3.5" />
                    )}
                    Generate Public URL
                  </button>
                </div>
              )}
                </div>
            </section>

            <section className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-9 h-9 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                  <Globe className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-bold text-gray-900">Custom Domains</h3>
                  <p className="text-[10px] text-gray-500">Use up to 3 custom domains for the public shop</p>
                </div>
                {hasUnverifiedDomain && (
                  <button
                    onClick={() => setShowDomainGuide(true)}
                    className="w-10 h-10 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-500 hover:text-indigo-700 flex items-center justify-center transition-all flex-shrink-0 font-bold text-lg shadow-sm"
                    title="Setup guide"
                  >
                    <HelpCircle className="w-5 h-5" />
                  </button>
                )}
              </div>

              <div className="space-y-2.5">
                {domains.map(domain => (
                  <div key={domain.id} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900 flex items-center gap-1.5 break-all">
                          {domain.domain}
                          {domain.verified ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                          ) : (
                            <HelpCircle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                          )}
                        </p>
                        <p className={`text-[10px] mt-0.5 ${domain.verified ? 'text-emerald-600' : 'text-amber-600'}`}>
                          {domain.verified ? 'Verified' : 'Not verified'} · {domain.enabled ? 'Enabled' : 'Disabled'}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
                        {!domain.verified && (
                          <button
                            onClick={() => verifyDomainMutation.mutate(domain.id)}
                            disabled={verifyDomainMutation.isPending}
                            className="px-2.5 py-1.5 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 transition-all text-[11px] disabled:opacity-50 flex items-center gap-1"
                          >
                            {verifyDomainMutation.isPending ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <CheckCircle2 className="w-3 h-3" />
                            )}
                            Verify
                          </button>
                        )}
                        {domain.verified && (
                          <button
                            onClick={() => toggleDomainMutation.mutate({ domainId: domain.id, enabled: !domain.enabled })}
                            disabled={toggleDomainMutation.isPending}
                            className={`px-2.5 py-1.5 rounded-lg font-bold transition-all text-[11px] disabled:opacity-50 flex items-center gap-1 ${
                              domain.enabled
                                ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                                : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                            }`}
                          >
                            <Power className="w-3 h-3" />
                            {domain.enabled ? 'Disable' : 'Enable'}
                          </button>
                        )}
                        {deletingDomainId === domain.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => { deleteDomainMutation.mutate(domain.id); setDeletingDomainId(null); }}
                              disabled={deleteDomainMutation.isPending}
                              className="px-2 py-1.5 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-all text-[11px]"
                            >
                              {deleteDomainMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Delete'}
                            </button>
                            <button
                              onClick={() => setDeletingDomainId(null)}
                              className="px-2 py-1.5 bg-gray-200 text-gray-600 font-bold rounded-lg hover:bg-gray-300 transition-all text-[11px]"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeletingDomainId(domain.id)}
                            className="w-7 h-7 rounded-lg bg-red-50 hover:bg-red-100 text-red-400 hover:text-red-600 flex items-center justify-center transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                    {!domain.verified && (
                      <div className="mt-2 pt-2 border-t border-gray-200">
                        <p className="text-[10px] text-amber-600">
                          Add A record: <strong className="break-all">{domain.domain}</strong> → <strong>139.180.156.116</strong>
                        </p>
                      </div>
                    )}
                    {domain.verified && domain.enabled && (
                      <div className="mt-2 pt-2 border-t border-gray-200">
                        <a
                          href={`https://${domain.domain}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-emerald-600 font-medium hover:underline flex items-center gap-1"
                        >
                          <ExternalLink className="w-3 h-3" />
                          https://{domain.domain}
                        </a>
                      </div>
                    )}
                  </div>
                ))}

                {domains.length < 3 && !hasUnverifiedDomain && (
                  showAddInput ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={addDomainInput}
                        onChange={(e) => setAddDomainInput(e.target.value)}
                        className="flex-1 px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium"
                        placeholder="shop.yourdomain.com"
                        autoFocus
                      />
                      <button
                        onClick={() => addDomainMutation.mutate(addDomainInput)}
                        disabled={!addDomainInput || addDomainMutation.isPending}
                        className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all active:scale-[0.98] text-sm disabled:opacity-50"
                      >
                        {addDomainMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          'Save'
                        )}
                      </button>
                      <button
                        onClick={() => { setShowAddInput(false); setAddDomainInput(''); }}
                        className="px-3 py-2 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-all text-sm"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowAddInput(true)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl hover:bg-gray-100 hover:border-gray-300 transition-all text-sm font-bold text-gray-500"
                    >
                      <Plus className="w-4 h-4" />
                      Add New Domain
                    </button>
                  )
                )}

                {domains.length === 0 && !showAddInput && (
                  <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 text-center">
                    <p className="text-xs text-gray-400">Add up to 3 custom domains for your public shop</p>
                  </div>
                )}
              </div>
            </section>

            <AnimatePresence>
              {showDomainGuide && (
                <>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setShowDomainGuide(false)}
                    className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
                  />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:max-w-lg md:w-full z-[60] bg-white rounded-3xl shadow-2xl overflow-y-auto max-h-[85vh]"
                  >
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-gray-900">Custom Domain Setup Guide</h3>
                        <button
                          onClick={() => setShowDomainGuide(false)}
                          className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                        >
                          <X className="w-4 h-4 text-gray-500" />
                        </button>
                      </div>

                      <div className="space-y-5">
                        <div className="flex gap-3">
                          <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm flex-shrink-0">1</div>
                          <div>
                            <p className="text-sm font-bold text-gray-900">Buy a Domain</p>
                            <p className="text-xs text-gray-500 mt-0.5">Buy a domain if you don't have one. If you already have one, you're ready to connect. You can also use the free default shop URL for your public shop.</p>
                          </div>
                        </div>

                        <div className="flex gap-3">
                          <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm flex-shrink-0">2</div>
                          <div>
                            <p className="text-sm font-bold text-gray-900">Add to Cloudflare (Free)</p>
                            <p className="text-xs text-gray-500 mt-0.5">Add your domain to Cloudflare's free DNS. Follow their instructions to update your nameservers at your registrar.</p>
                          </div>
                        </div>

                        <div className="flex gap-3">
                          <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm flex-shrink-0">3</div>
                          <div>
                            <p className="text-sm font-bold text-gray-900">Add DNS Record(s)</p>
                            <p className="text-xs text-gray-500 mt-0.5">Add record and fill exactly like this</p>
                            <div className="mt-2 bg-white rounded-xl border-2 border-gray-200 overflow-hidden text-xs">
                              <div className="divide-y divide-gray-100">
                                <div className="flex items-center px-4 py-2.5">
                                  <span className="w-24 text-gray-400 font-medium">Type</span>
                                  <div className="flex items-center gap-2">
                                    <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center">
                                      <svg className="w-3 h-3 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7"/></svg>
                                    </div>
                                    <span className="font-bold text-gray-900">A</span>
                                  </div>
                                </div>
                                <div className="flex items-center px-4 py-2.5 gap-2">
                                  <span className="w-24 text-gray-400 font-medium">Name</span>
                                  <div className="flex-1 flex items-center gap-2">
                                    <span className="text-gray-900 font-bold">{guideName}</span>
                                    <button
                                      onClick={() => { navigator.clipboard.writeText(guideName); addToast('Copied'); }}
                                      className="w-6 h-6 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-700 flex items-center justify-center transition-colors"
                                    >
                                      <Copy className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                                <div className="flex items-center px-4 py-2.5">
                                  <span className="w-24 text-gray-400 font-medium">IPv4 address</span>
                                  <div className="flex-1 flex items-center gap-2">
                                    <span className="text-gray-900 font-mono font-bold">139.180.156.116</span>
                                    <button
                                      onClick={() => { navigator.clipboard.writeText('139.180.156.116'); addToast('Copied'); }}
                                      className="w-6 h-6 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-700 flex items-center justify-center transition-colors"
                                    >
                                      <Copy className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                                <div className="flex items-center px-4 py-2.5">
                                  <span className="w-24 text-gray-400 font-medium">Proxy status</span>
                                  <div className="flex items-center gap-2">
                                    <div className="w-10 h-6 rounded-full bg-orange-400 relative flex items-center justify-end px-1">
                                      <div className="w-4 h-4 bg-white rounded-full shadow-sm" />
                                    </div>
                                    <span className="text-orange-500 font-bold text-[11px]">Proxied</span>
                                  </div>
                                </div>
                                <div className="flex items-center px-4 py-2.5">
                                  <span className="w-24 text-gray-400 font-medium">TTL</span>
                                  <span className="text-gray-900 font-medium">Auto</span>
                                </div>
                              </div>
                            </div>
                            <p className="text-[11px] text-gray-400 mt-1">Use <span className="font-bold">@</span> for root domain ({guideRootDomain}) or a subdomain like <span className="font-bold">shop</span>, <span className="font-bold">www</span>, <span className="font-bold">support</span>, etc. (no spaces)</p>
                          </div>
                        </div>

                        <div className="flex gap-3">
                          <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm flex-shrink-0">4</div>
                          <div>
                            <p className="text-sm font-bold text-gray-900">Save Domain in Settings</p>
                            <p className="text-xs text-gray-500 mt-0.5">Enter your domain in the input above (e.g. shop.yourdomain.com) and click Save.</p>
                          </div>
                        </div>

                        <div className="flex gap-3">
                          <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm flex-shrink-0">5</div>
                          <div>
                            <p className="text-sm font-bold text-gray-900">Click Verify</p>
                            <p className="text-xs text-gray-500 mt-0.5">Come back here and click "Verify" to confirm your DNS is set up correctly.</p>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => setShowDomainGuide(false)}
                        className="w-full mt-6 px-4 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all active:scale-[0.98]"
                      >
                        Got it
                      </button>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>

            <section className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-9 h-9 rounded-lg bg-pink-50 text-pink-600 flex items-center justify-center">
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
                      className="flex flex-col items-center gap-1.5 group"
                    >
                      <div
                        className={`w-full aspect-square rounded-xl transition-all ${isActive ? 'ring-2 ring-offset-2 ring-indigo-600 scale-105' : 'group-hover:scale-105'}`}
                        style={{ background: theme.preview }}
                      />
                      <span className={`text-[10px] font-medium text-center leading-tight ${isActive ? 'text-indigo-600 font-bold' : 'text-gray-600'}`}>
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

            <section className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                  <UserCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Update Logo</h3>
                  <p className="text-[10px] text-gray-500">Upload bot logo for receipt (1:1, max 512×512)</p>
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
                  {uploading ? 'Uploading...' : 'Update'}
                </button>
              </div>
            </section>

            <section className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 lg:col-span-2">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Manage Admins</h3>
                  <p className="text-[10px] text-gray-500">Add or remove bot administrators</p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Current Admins</label>
                  <div className="mt-1.5 space-y-1.5">
                    {admins?.length === 0 ? (
                      <p className="text-xs text-gray-400 py-2 text-center bg-gray-50 rounded-xl">No admins found</p>
                    ) : (
                      admins?.map(admin => (
                        <div key={admin.id} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl border border-gray-100">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs flex-shrink-0">
                              {admin.first_name?.[0] || '?'}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-gray-900 truncate">{admin.first_name}</p>
                              <p className="text-[10px] text-gray-500 truncate">@{admin.username || 'no_username'}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => removeAdminMutation.mutate(admin.id)}
                            className="p-1.5 bg-white rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-all flex-shrink-0"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-100">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Add Admin</label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                    <input
                      type="text"
                      value={adminSearch}
                      onChange={(e) => setAdminSearch(e.target.value)}
                      placeholder="Search users..."
                      className="w-full pl-8 pr-3 py-2 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                    />
                  </div>
                  {adminSearch.trim() && (
                    <div className="mt-1.5 max-h-40 overflow-y-auto space-y-1">
                      {allUsers?.filter(u =>
                        !u.is_admin &&
                        (u.first_name?.toLowerCase().includes(adminSearch.toLowerCase()) ||
                         u.username?.toLowerCase().includes(adminSearch.toLowerCase()))
                      ).slice(0, 10).map(user => (
                        <button
                          key={user.id}
                          onClick={() => addAdminMutation.mutate(user.id)}
                          disabled={addAdminMutation.isPending}
                          className="w-full flex items-center gap-2.5 p-2.5 bg-gray-50 hover:bg-indigo-50 rounded-xl transition-all text-left"
                        >
                          <div className="w-7 h-7 rounded-lg bg-gray-200 text-gray-600 flex items-center justify-center font-bold text-[10px] flex-shrink-0">
                            {user.first_name?.[0] || '?'}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-gray-900 truncate">{user.first_name}</p>
                            <p className="text-[10px] text-gray-500 truncate">@{user.username || 'no_username'}</p>
                          </div>
                          <span className="text-[10px] font-bold text-indigo-600 flex-shrink-0">Add</span>
                        </button>
                      ))}
                      {allUsers?.filter(u => !u.is_admin &&
                        (u.first_name?.toLowerCase().includes(adminSearch.toLowerCase()) ||
                         u.username?.toLowerCase().includes(adminSearch.toLowerCase()))
                      ).length === 0 && (
                        <p className="text-xs text-gray-400 py-2 text-center">No users found</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </section>

            <section className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-9 h-9 rounded-lg bg-cyan-50 text-cyan-600 flex items-center justify-center">
                  <Brain className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">AI Agent</h3>
                  <p className="text-[10px] text-gray-500">Let AI answer customer questions on your shop</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Enable AI Agent</span>
                  <button
                    onClick={() => {
                      const newVal = !aiIsEnabled;
                      setAiIsEnabled(newVal);
                      updateAiMutation.mutate({ is_enabled: newVal, api_key: aiApiKey, system_context: aiContext });
                    }}
                    className={`w-12 h-6 rounded-full transition-colors relative ${aiIsEnabled ? 'bg-cyan-500' : 'bg-gray-300'}`}
                  >
                    <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${aiIsEnabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
                  </button>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">API Key (DeepSeek)</label>
                  <input
                    type="password"
                    value={aiApiKey}
                    onChange={(e) => setAiApiKey(e.target.value)}
                    placeholder="sk-..."
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-cyan-500 outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">System Context</label>
                  <textarea
                    value={aiContext}
                    onChange={(e) => setAiContext(e.target.value)}
                    rows={4}
                    placeholder="Instructions for the AI assistant..."
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-cyan-500 outline-none text-sm resize-none"
                  />
                </div>
                <button
                  onClick={() => updateAiMutation.mutate({ api_key: aiApiKey, system_context: aiContext, is_enabled: aiIsEnabled })}
                  disabled={updateAiMutation.isPending || !aiApiKey.trim()}
                  className="w-full px-4 py-2 bg-cyan-500 text-white font-bold rounded-xl hover:bg-cyan-600 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
                >
                  {updateAiMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save AI Settings
                </button>
              </div>
            </section>
          </div>
        )}

        {activeTab === 'shop' && (
          <>
          <section className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-2.5 mb-4">
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

          <section className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-2.5 mb-4">
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
            />
          </section>
          </>)}

        {activeTab === 'bots' && isSuperadmin && (
          <ManageBots 
            allBots={allBots} 
            deleteBotMutation={deleteBotMutation}
            selectedBotId={selectedBotId}
          />
        )}
      </div>
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

              <div className="flex items-center justify-between mb-4">
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
        className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200 transition-all active:scale-[0.99]"
      >
        <div className="w-9 h-9 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
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
            <div className="flex-1 overflow-y-auto p-5 pt-4">
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
                className="w-full px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl transition-all active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center justify-center gap-2"
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

function ManageBots({ allBots, deleteBotMutation, selectedBotId }) {
  const [confirmBot, setConfirmBot] = useState(null);
  const [confirmText, setConfirmText] = useState('');

  const handleDelete = (bot) => {
    if (confirmBot?.id === bot.id) {
      if (confirmText === 'DELETE') {
        deleteBotMutation.mutate(bot.id);
        setConfirmBot(null);
        setConfirmText('');
      }
    } else {
      setConfirmBot(bot);
      setConfirmText('');
    }
  };

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Manage Bots</h3>
              <p className="text-xs text-gray-500">View and manage all registered bots</p>
            </div>
          </div>
        </div>

        {!allBots || allBots.length === 0 ? (
          <div className="p-12 text-center">
            <Bot className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No bots found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {allBots.map(b => (
              <div key={b.id} className="p-4 sm:p-5 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm ${
                    b.id.toString() === selectedBotId?.toString()
                      ? 'bg-indigo-100 text-indigo-600 ring-2 ring-indigo-200'
                      : 'bg-gray-100 text-gray-500'
                  }`}>
                    <Bot className="w-6 h-6" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-gray-900 truncate">{b.bot_full_name || b.bot_username || `Bot #${b.id}`}</p>
                      {b.id.toString() === selectedBotId?.toString() && (
                        <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[10px] font-bold uppercase rounded-lg border border-indigo-100">
                          Current
                        </span>
                      )}
                      {b.is_main && (
                        <span className="px-2 py-0.5 bg-amber-50 text-amber-600 text-[10px] font-bold uppercase rounded-lg border border-amber-100">
                          Main
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 truncate mt-0.5">
                      @{b.bot_username || 'no_username'} · ID: {b.id}
                    </p>
                    {b.plan_name && (
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-1">
                        Plan: {b.plan_name}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {b.is_active !== undefined && (
                      <span className={`w-2.5 h-2.5 rounded-full ${b.is_active ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                    )}
                    
                    
                    {b.id.toString() !== selectedBotId?.toString() && (
                      <button
                        onClick={() => handleDelete(b)}
                        className={`p-2.5 rounded-xl transition-all active:scale-90 ${
                          confirmBot?.id === b.id
                            ? 'bg-rose-100 text-rose-600 border border-rose-200'
                            : 'bg-gray-50 text-gray-400 hover:bg-rose-50 hover:text-rose-500 border border-transparent'
                        }`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                
                <AnimatePresence>
                  {confirmBot?.id === b.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-4 p-4 bg-rose-50 rounded-2xl border border-rose-100">
                        <div className="flex items-start gap-3 mb-3">
                          <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-bold text-rose-900">Delete this bot?</p>
                            <p className="text-xs text-rose-600 mt-0.5">
                              This will permanently delete <strong>@{b.bot_username}</strong> and all its data. This cannot be undone.
                            </p>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <p className="text-xs text-rose-600 font-medium">Type <strong>DELETE</strong> to confirm:</p>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={confirmText}
                              onChange={(e) => setConfirmText(e.target.value)}
                              placeholder="Type DELETE"
                              className="flex-1 px-3 py-2 bg-white border border-rose-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-rose-500 outline-none"
                              autoFocus
                            />
                            <button
                              onClick={() => handleDelete(b)}
                              disabled={confirmText !== 'DELETE' || deleteBotMutation.isPending}
                              className="px-4 py-2 bg-rose-600 text-white text-sm font-bold rounded-xl disabled:opacity-40 disabled:cursor-not-allowed hover:bg-rose-700 transition-all active:scale-95 flex items-center gap-2"
                            >
                              {deleteBotMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                              Delete
                            </button>
                          </div>
                          <button
                            onClick={() => { setConfirmBot(null); setConfirmText(''); }}
                            className="text-xs text-gray-500 hover:text-gray-700 font-medium mt-1"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
