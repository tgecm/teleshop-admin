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
import { getBotPublicSlug, generateBotSlug } from '../api/public';
import LoadingSkeleton from '../components/shared/LoadingSkeleton';
import ConfirmDialog from '../components/shared/ConfirmDialog';
import InstallButton from '../components/shared/InstallButton';
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
  Camera
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';

export default function Settings() {
  const { isSuperadmin, user } = useAuthStore();
  const { selectedBotId } = useBotStore();
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
    onSuccess: () => {
      queryClient.invalidateQueries(['content-blocks', selectedBotId]);
      addToast('Content updated successfully');
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

  const [email, setEmail] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [aiApiKey, setAiApiKey] = useState('');
  const [aiContext, setAiContext] = useState('');
  const [adminSearch, setAdminSearch] = useState('');
  const [profilePicture, setProfilePicture] = useState(user?.profile_picture || '');
  const [uploading, setUploading] = useState(false);
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);
  const fileInputRef = React.useRef(null);

  React.useEffect(() => {
    if (user?.profile_picture) setProfilePicture(user.profile_picture);
  }, [user?.profile_picture]);

  const handleProfileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      addToast('Please select an image file', 'error');
      return;
    }
    // Client-side dimension check
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
      const res = await fetch('https://api.telegramecommerce.shop/upload/profile-picture', {
        method: 'POST',
        headers: { Authorization: `Bearer ${useAuthStore.getState().token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Upload failed');
      setProfilePicture(data.url);
      addToast('Profile picture updated');
    } catch (err) {
      addToast(err.message || 'Failed to upload profile picture', 'error');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  React.useEffect(() => {
    if (bot) setEmail(bot.notification_email || '');
    if (contentBlocks) {
      const web = contentBlocks.find(b => b.key === 'website_url');
      if (web) setWebsiteUrl(web.content_data?.url || '');
    }
    if (aiSettings) {
      setAiApiKey(aiSettings.api_key || '');
      setAiContext(aiSettings.system_context || '');
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            <section className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${bot?.is_active ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                    <Power className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Shop Status</h3>
                    <p className="text-xs text-gray-500">Control your bot's availability</p>
                  </div>
                </div>
                <button 
                  onClick={() => updateBotMutation.mutate({ is_active: !bot?.is_active })}
                  className={`w-14 h-7 rounded-full transition-colors relative ${bot?.is_active ? 'bg-emerald-500' : 'bg-rose-500'}`}
                >
                  <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all shadow-sm ${bot?.is_active ? 'left-8' : 'left-1'}`} />
                </button>
              </div>
              <p className={`text-sm font-bold text-center py-2.5 rounded-xl ${bot?.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                {bot?.is_active ? 'SHOP OPEN' : 'SHOP CLOSED'}
              </p>
            </section>

            
            <section className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Mail className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Email Notifications</h3>
                  <p className="text-xs text-gray-500">Receive order alerts via email</p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <input 
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                  placeholder="email@example.com"
                />
                <button 
                  onClick={() => updateBotMutation.mutate({ notification_email: email })}
                  className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 transition-all active:scale-[0.98]"
                >
                  Save
                </button>
              </div>
            </section>

            
            <section className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Globe className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Website Link</h3>
                  <p className="text-xs text-gray-500">Link to your external website</p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="url"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  className="flex-1 px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                  placeholder="https://..."
                />
                <button
                  onClick={() => updateContentMutation.mutate({ key: 'website_url', data: { url: websiteUrl } })}
                  className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 transition-all active:scale-[0.98]"
                >
                  Save
                </button>
              </div>
            </section>


            <section className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Globe className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Public Shop Page</h3>
                  <p className="text-xs text-gray-500">Your public-facing ecommerce page</p>
                </div>
              </div>

              {publicSlug?.slug ? (
                <div className="space-y-3">
                  <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                    <p className="text-xs text-gray-500 font-medium mb-1">Your public shop URL</p>
                    <a
                      href={`https://telegramecommerce.shop/${publicSlug.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1.5 break-all"
                    >
                      telegramecommerce.shop/{publicSlug.slug}
                      <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                    </a>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`https://telegramecommerce.shop/${publicSlug.slug}`);
                        addToast('URL copied to clipboard');
                      }}
                      className="flex-1 px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl hover:bg-gray-100 transition-all font-bold text-sm flex items-center justify-center gap-2"
                    >
                      <Copy className="w-4 h-4" />
                      Copy URL
                    </button>
                    <button
                      onClick={() => setShowRevokeConfirm(true)}
                      disabled={generateSlugMutation.isPending}
                      className="flex-1 px-4 py-3 bg-rose-600 text-white font-bold rounded-2xl hover:bg-rose-700 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
                    >
                      {generateSlugMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4" />
                      )}
                      Revoke URL
                    </button>
                  </div>

                  <ConfirmDialog
                    open={showRevokeConfirm}
                    onClose={() => setShowRevokeConfirm(false)}
                    onConfirm={() => {
                      setShowRevokeConfirm(false);
                      generateSlugMutation.mutate();
                    }}
                    title="Revoke Public URL?"
                    message="The current public shop link will stop working immediately. A new URL will be generated. Are you sure?"
                    confirmText="Revoke"
                    variant="danger"
                    loading={generateSlugMutation.isPending}
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 text-center">
                    <p className="text-sm text-gray-400">No public URL generated yet</p>
                  </div>
                  <button
                    onClick={() => generateSlugMutation.mutate()}
                    disabled={generateSlugMutation.isPending}
                    className="w-full px-4 py-3 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {generateSlugMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                    Generate Public URL
                  </button>
                </div>
              )}
            </section>


            <section className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <UserCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Profile Picture</h3>
                  <p className="text-xs text-gray-500">Upload your profile photo (1:1, max 512x512)</p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0 border-2 border-gray-200">
                  {profilePicture ? (
                    <img src={profilePicture} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <UserCircle className="w-10 h-10 text-gray-400" />
                  )}
                </div>
                <div className="flex-1 text-center sm:text-left">
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
                    className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center gap-2 mx-auto sm:mx-0"
                  >
                    {uploading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Camera className="w-4 h-4" />
                    )}
                    {uploading ? 'Uploading...' : 'Update Profile'}
                  </button>
                </div>
              </div>
            </section>


            <InstallButton />


            <section className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 lg:col-span-2">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Manage Admins</h3>
                  <p className="text-xs text-gray-500">Add or remove bot administrators</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Current Admins</label>
                  <div className="mt-2 space-y-2">
                    {admins?.length === 0 ? (
                      <p className="text-sm text-gray-400 py-3 text-center bg-gray-50 rounded-2xl">No admins found</p>
                    ) : (
                      admins?.map(admin => (
                        <div key={admin.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl border border-gray-100">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm flex-shrink-0">
                              {admin.first_name?.[0] || '?'}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-gray-900 truncate">{admin.first_name}</p>
                              <p className="text-xs text-gray-500 truncate">@{admin.username || 'no_username'}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => removeAdminMutation.mutate(admin.id)}
                            className="p-2 bg-white rounded-xl text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-all flex-shrink-0"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-100">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Add Admin</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <input
                      type="text"
                      value={adminSearch}
                      onChange={(e) => setAdminSearch(e.target.value)}
                      placeholder="Search users by name or username..."
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                    />
                  </div>
                  {adminSearch.trim() && (
                    <div className="mt-2 max-h-48 overflow-y-auto space-y-1">
                      {allUsers?.filter(u =>
                        !u.is_admin &&
                        (u.first_name?.toLowerCase().includes(adminSearch.toLowerCase()) ||
                         u.username?.toLowerCase().includes(adminSearch.toLowerCase()))
                      ).slice(0, 10).map(user => (
                        <button
                          key={user.id}
                          onClick={() => addAdminMutation.mutate(user.id)}
                          disabled={addAdminMutation.isPending}
                          className="w-full flex items-center gap-3 p-3 bg-gray-50 hover:bg-indigo-50 rounded-xl transition-all text-left"
                        >
                          <div className="w-8 h-8 rounded-lg bg-gray-200 text-gray-600 flex items-center justify-center font-bold text-xs flex-shrink-0">
                            {user.first_name?.[0] || '?'}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-gray-900 truncate">{user.first_name}</p>
                            <p className="text-xs text-gray-500 truncate">@{user.username || 'no_username'}</p>
                          </div>
                          <span className="text-xs font-bold text-indigo-600 flex-shrink-0">Add</span>
                        </button>
                      ))}
                      {allUsers?.filter(u => !u.is_admin &&
                        (u.first_name?.toLowerCase().includes(adminSearch.toLowerCase()) ||
                         u.username?.toLowerCase().includes(adminSearch.toLowerCase()))
                      ).length === 0 && (
                        <p className="text-sm text-gray-400 py-3 text-center">No users found</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>
        )}

        {activeTab === 'shop' && (
          <SectionHeader icon={MessageSquare} title="Bot Captions" subtitle="Edit text shown to users in your bot" />
        )}

        {activeTab === 'shop' && (
          <div className="grid grid-cols-1 gap-4">
            {[
              { key: 'welcome_caption', label: 'Welcome Caption' },
              { key: 'browse_categories_caption', label: 'Shopping Caption' },
              { key: 'search_caption', label: 'Search Caption' },
              { key: 'cart_caption_title', label: 'View Cart Caption' },
              { key: 'my_orders_caption', label: 'My Order Caption' },
              { key: 'settings_caption', label: 'Setting Caption' },
              { key: 'support_caption', label: 'Support Caption' },
              { key: 'about_menu_caption', label: 'About Caption' },
              { key: 'order_confirmation_message', label: 'Order Confirmation' },
            ].map(({ key, label }) => (
              <CaptionCard
                key={key}
                label={label}
                captionKey={key}
                contentBlocks={contentBlocks}
                onSave={(data) => updateContentMutation.mutate({ key, data })}
                isPending={updateContentMutation.isPending}
              />
            ))}
          </div>
        )}

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

function SectionHeader({ icon: Icon, title, subtitle }) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <h3 className="text-lg font-bold text-gray-900">{title}</h3>
        <p className="text-xs text-gray-500">{subtitle}</p>
      </div>
    </div>
  );
}

function CaptionCard({ label, captionKey, contentBlocks, onSave, isPending }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');

  const block = contentBlocks?.find(b => b.key === captionKey);
  const currentText = block?.content_data?.content || block?.content_data?.text || '';

  React.useEffect(() => {
    if (editing) setText(currentText);
  }, [currentText, editing]);

  const handleSave = () => {
    onSave({ source: 'text', content: text.trim() });
    setEditing(false);
  };

  return (
    <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-gray-100">
      <div className="flex items-center justify-between gap-4 mb-3">
        <div>
          <h4 className="text-sm font-bold text-gray-900">{label}</h4>
          <p className="text-[10px] text-gray-400 font-mono">/{captionKey}</p>
        </div>
        <button
          onClick={() => editing ? handleSave() : setEditing(true)}
          className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 transition-all flex items-center gap-1.5 active:scale-95"
        >
          {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : editing ? <Save className="w-3.5 h-3.5" /> : <Edit2 className="w-3.5 h-3.5" />}
          {editing ? 'Save' : 'Edit'}
        </button>
      </div>
      {editing ? (
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm resize-none"
          autoFocus
        />
      ) : (
        <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
          <p className="text-sm text-gray-700 whitespace-pre-wrap line-clamp-3">{currentText || <span className="text-gray-400 italic">No caption set — default bot text will be used.</span>}</p>
        </div>
      )}
      <div className="flex items-center justify-between mt-2">
        {editing && (
          <button
            onClick={() => setEditing(false)}
            className="text-xs text-gray-500 hover:text-gray-700 font-medium"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
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
