import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { useBotStore } from '../store/botStore';
import { useToastStore } from '../store/toastStore';
import { updateBot, getBot, deleteBot } from '../api/bots';
import { getContentBlocks, updateContentBlock } from '../api/contentBlocks';
import { getUsers, updateUser } from '../api/customers';
import {
  getGlobalSettings,
  updateGlobalSetting,
  getPlanPayments,
  createPlanPayment,
  updatePlanPayment,
  deletePlanPayment,
  getAllBots,
  getSubscriptionDiscounts,
  createSubscriptionDiscount,
  updateSubscriptionDiscount,
  deleteSubscriptionDiscount,
  triggerApkUpdate,
} from '../api/superadmin';
import { getStats } from '../api/stats';
import { getBotPublicSlug, generateBotSlug, listBotDomains, addBotDomain, verifyBotDomainItem, toggleBotDomainItem, deleteBotDomainItem } from '../api/public';
import LoadingSkeleton from '../components/shared/LoadingSkeleton';
import ErrorBoundary from '../components/shared/ErrorBoundary';
import client from '../api/client';
import {
  Settings as SettingsIcon,
  ShieldCheck,
  ShieldAlert,
  Globe,
  Mail,
  Bot,
  Users,
  AlertTriangle,
  Trash2,
  Plus,
  QrCode,
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
  HelpCircle,
  Edit2,
  Volume2,
  User,
  Lock,
  Eye,
  EyeOff,
  Percent,
  ArrowLeftRight,
  TabletSmartphone,
  Download,
  Palette,
  Image,
  Type,
} from 'lucide-react';
import { differenceInDays } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { requireFeature } from '../utils/plans';
import Subscription from './Subscription';
import { Capacitor } from '@capacitor/core';
import { registerFCMToken } from '../lib/pushNotifications';

export default function Settings() {
  const { isSuperadmin, user, isStaff } = useAuthStore();
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
      if (variables.key === 'mode_order' && variables._mode) {
        const labels = { telegram: 'Telegram Mode', ecommerce: 'Website Mode', guest: 'Guest Mode' };
        addToast(`${labels[variables._mode] || variables._mode} has been ${variables._action}`);
      } else if (variables.key === 'shop_theme') {
        addToast('Theme applied');
      } else {
        addToast('Content updated successfully');
      }
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

  const apkUpdateMutation = useMutation({
    mutationFn: triggerApkUpdate,
    onSuccess: () => addToast('APK update triggered successfully'),
    onError: (err) => addToast(err.response?.data?.detail || 'Failed to update APK', 'error'),
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
  const [shopOpen, setShopOpen] = useState(true);
  const [adminSearch, setAdminSearch] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem('soundEnabled') !== 'false');
  const [lowStockThreshold, setLowStockThreshold] = useState('');
  const [lowStockEnabled, setLowStockEnabled] = useState(false);
  const [editingLowStock, setEditingLowStock] = useState(false);
  const [editingEmail, setEditingEmail] = useState(false);

  const [showDomainGuide, setShowDomainGuide] = useState(false);
  const [modeOrder, setModeOrder] = useState([]);
  const [modeEnabled, setModeEnabled] = useState({ telegram: true, ecommerce: true, guest: true });
  const [cpOldPw, setCpOldPw] = useState('');
  const [cpNewPw, setCpNewPw] = useState('');
  const [cpConfirmPw, setCpConfirmPw] = useState('');
  const [cpShowOld, setCpShowOld] = useState(false);
  const [cpShowNew, setCpShowNew] = useState(false);
  const [cpLoading, setCpLoading] = useState(false);
  const [fpOpen, setFpOpen] = useState(false);
  const [fpEmail, setFpEmail] = useState('');
  const [fpCode, setFpCode] = useState('');
  const [fpNewPw, setFpNewPw] = useState('');
  const [fpConfirmPw, setFpConfirmPw] = useState('');
  const [fpStep, setFpStep] = useState('email'); // email | code
  const [fpLoading, setFpLoading] = useState(false);
  const [staffPwToken, setStaffPwToken] = useState('');
  const [staffPwCode, setStaffPwCode] = useState('');
  const [staffPwStep, setStaffPwStep] = useState('form'); // form | code
  const [staffPwLoading, setStaffPwLoading] = useState(false);
  const [staffFpToken, setStaffFpToken] = useState('');
  const [staffFpCode, setStaffFpCode] = useState('');
  const [staffFpStep, setStaffFpStep] = useState('idle'); // idle | code
  const [staffFpLoading, setStaffFpLoading] = useState(false);

  React.useEffect(() => {
    // Reset per-bot state when switching bots
    setModeOrder(['telegram', 'ecommerce', 'guest']);
    setModeEnabled({ telegram: true, ecommerce: true, guest: true });

    if (bot) {
      setEmail(bot.admin_notification_email || '');
      const threshold = bot.low_stock_threshold;
      setLowStockThreshold(threshold != null ? String(threshold) : '');
      setLowStockEnabled(threshold !== null && threshold > 0);
    }
    if (contentBlocks) {
      const shop = contentBlocks.find(b => b.key === 'shop_settings');
      if (shop) {
        setShopOpen(shop.content_data?.is_open !== false);
      }
      const mo = contentBlocks.find(b => b.key === 'mode_order');
      if (mo?.content_data?.order?.length) {
        setModeOrder(mo.content_data.order);
        if (mo.content_data.enabled) {
          setModeEnabled(mo.content_data.enabled);
        }
      }
    }
  }, [bot, contentBlocks, selectedBotId]);

  const handleChangePw = async () => {
    if (!cpOldPw) return addToast('Enter your current password', 'error');
    if (cpNewPw.length < 8) return addToast('New password must be at least 8 characters', 'error');
    if (!/[A-Z]/.test(cpNewPw)) return addToast('New password must contain at least one uppercase letter', 'error');
    if (!/[0-9]/.test(cpNewPw)) return addToast('New password must contain at least one number', 'error');
    if (cpNewPw !== cpConfirmPw) return addToast('New passwords do not match', 'error');
    setCpLoading(true);
    try {
      await client.post('/auth/change-password', { old_password: cpOldPw, new_password: cpNewPw });
      addToast('Password changed successfully');
      setCpOldPw('');
      setCpNewPw('');
      setCpConfirmPw('');
    } catch (err) {
      addToast(err.response?.data?.detail || err.response?.data?.message || 'Failed to change password', 'error');
    }
    setCpLoading(false);
  };

  const fpSendCode = async () => {
    if (!fpEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fpEmail)) return addToast('Enter a valid email address', 'error');
    setFpLoading(true);
    try {
      await client.post('/api/webpanel/send-code', { email: fpEmail, flow: 'forgot' });
      addToast('Reset code sent to your Telegram bot');
      setFpStep('code');
    } catch (err) {
      addToast(err.response?.data?.detail || err.response?.data?.message || 'Failed to send reset code', 'error');
    }
    setFpLoading(false);
  };

  const fpResetPw = async () => {
    if (fpCode.length !== 6) return addToast('Enter the 6-digit code from Telegram', 'error');
    if (fpNewPw.length < 8) return addToast('New password must be at least 8 characters', 'error');
    if (!/[A-Z]/.test(fpNewPw)) return addToast('New password must contain at least one uppercase letter', 'error');
    if (!/[0-9]/.test(fpNewPw)) return addToast('New password must contain at least one number', 'error');
    if (fpNewPw !== fpConfirmPw) return addToast('Passwords do not match', 'error');
    setFpLoading(true);
    try {
      await client.post('/api/webpanel/reset-password', { email: fpEmail, code: fpCode, new_password: fpNewPw });
      addToast('Password reset successfully');
      setFpOpen(false);
      setFpEmail('');
      setFpCode('');
      setFpNewPw('');
      setFpConfirmPw('');
      setFpStep('email');
    } catch (err) {
      addToast(err.response?.data?.detail || err.response?.data?.message || 'Reset failed', 'error');
    }
    setFpLoading(false);
  };

  const handleStaffSendCode = async () => {
    setStaffPwLoading(true);
    try {
      const res = await client.post('/auth/staff-send-pw-code');
      setStaffPwToken(res.data.token);
      setStaffPwStep('code');
      addToast('Verification code sent to your Telegram bot');
    } catch (err) {
      addToast(err.response?.data?.detail || 'Failed to send code', 'error');
    }
    setStaffPwLoading(false);
  };

  const handleStaffChangePw = async () => {
    if (cpNewPw.length < 4) return addToast('New password must be at least 4 characters', 'error');
    if (cpNewPw !== cpConfirmPw) return addToast('New passwords do not match', 'error');
    if (!staffPwCode) return addToast('Enter the verification code', 'error');
    setStaffPwLoading(true);
    try {
      await client.post('/auth/staff-change-password', {
        code_token: staffPwToken,
        code: staffPwCode,
        old_password: cpOldPw,
        new_password: cpNewPw,
      });
      addToast('Password changed successfully');
      setCpOldPw(''); setCpNewPw(''); setCpConfirmPw('');
      setStaffPwCode(''); setStaffPwToken(''); setStaffPwStep('form');
    } catch (err) {
      addToast(err.response?.data?.detail || 'Failed to change password', 'error');
    }
    setStaffPwLoading(false);
  };

  const handleStaffFpSendCode = async () => {
    setStaffFpLoading(true);
    try {
      const res = await client.post('/auth/staff-forgot-password', { step: 'send' });
      setStaffFpToken(res.data.token);
      setStaffFpStep('code');
      addToast('Reset code sent to your Telegram bot');
    } catch (err) {
      addToast(err.response?.data?.detail || 'Failed to send reset code', 'error');
    }
    setStaffFpLoading(false);
  };

  const handleStaffFpReset = async () => {
    if (!staffFpCode) return addToast('Enter the verification code', 'error');
    if (fpNewPw.length < 4) return addToast('New password must be at least 4 characters', 'error');
    if (fpNewPw !== fpConfirmPw) return addToast('Passwords do not match', 'error');
    setStaffFpLoading(true);
    try {
      await client.post('/auth/staff-forgot-password', {
        step: 'reset',
        code_token: staffFpToken,
        code: staffFpCode,
        new_password: fpNewPw,
      });
      addToast('Password reset successfully');
      setFpNewPw(''); setFpConfirmPw('');
      setStaffFpCode(''); setStaffFpToken(''); setStaffFpStep('idle');
    } catch (err) {
      addToast(err.response?.data?.detail || 'Failed to reset password', 'error');
    }
    setStaffFpLoading(false);
  };

  const isNativeApp = typeof window !== 'undefined' && window.Capacitor?.isNativePlatform();

  const tabs = [
    { id: 'shop', label: 'Shop', icon: SettingsIcon },
    { id: 'account', label: 'Account', icon: User },
    ...(isNativeApp ? [{ id: 'app', label: 'App', icon: TabletSmartphone }] : []),
    ...(isStaff ? [] : [{ id: 'subscription', label: 'Plan', icon: ShieldCheck }]),
    ...(isSuperadmin ? [{ id: 'superadmin', label: 'Admin', icon: ShieldAlert }] : []),
    ...(isSuperadmin ? [{ id: 'bots', label: 'Bots', icon: Bot }] : []),
  ];

  if (botLoading) return <LoadingSkeleton type="list" count={5} />;

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-lg sm:text-2xl lg:text-3xl font-bold text-gray-900">Settings</h1>
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-6">

            <section className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${shopOpen ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                    <Power className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">Shop Status</h3>
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


            <section className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Email Notifications</h3>
                  <p className="text-[10px] text-gray-500">Receive order alerts via email</p>
                </div>
              </div>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={!editingEmail}
                  className="flex-1 px-3 py-2 border border-gray-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium disabled:bg-gray-100 disabled:cursor-not-allowed enabled:bg-white"
                  placeholder="email@example.com"
                />
                {editingEmail ? (
                  <button
                    onClick={() => {
                      updateBotMutation.mutate({ admin_notification_email: email });
                      setEditingEmail(false);
                    }}
                    className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all active:scale-[0.98] text-sm"
                  >
                    Save
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      if (!requireFeature(bot?.plan_name, 'new_order_email_notification', addToast)) return;
                      setEditingEmail(true);
                    }}
                    className="px-4 py-2 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-all active:scale-[0.98] text-sm"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </section>

            <section className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">Low Stock Alert</h3>
                    <p className="text-[10px] text-gray-500">Auto-notify via E-commerce Support</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    const next = !lowStockEnabled;
                    setLowStockEnabled(next);
                    if (!next) {
                      updateBotMutation.mutate({ low_stock_threshold: null });
                      setLowStockThreshold('');
                    }
                  }}
                  className={`w-12 h-6 rounded-full transition-colors relative flex-shrink-0 ${lowStockEnabled ? 'bg-amber-500' : 'bg-gray-300'}`}
                >
                  <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all shadow-sm ${lowStockEnabled ? 'left-6.5' : 'left-0.5'}`} />
                </button>
              </div>
              {lowStockEnabled && (
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="1"
                    max="999"
                    value={lowStockThreshold}
                    onChange={(e) => {
                      const raw = e.target.value;
                      setLowStockThreshold(raw === '' || raw === '0' ? '' : raw.replace(/^0+/, ''));
                    }}
                    disabled={!editingLowStock}
                    className="flex-1 w-20 px-3 py-2 border border-gray-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium disabled:bg-gray-100 disabled:cursor-not-allowed enabled:bg-white"
                    placeholder="e.g. 5"
                  />
                  {editingLowStock ? (
                    <button
                      onClick={() => {
                        updateBotMutation.mutate({ low_stock_threshold: Number(lowStockThreshold) });
                        setEditingLowStock(false);
                      }}
                      disabled={!lowStockThreshold || Number(lowStockThreshold) < 1}
                      className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all active:scale-[0.98] text-sm disabled:opacity-40"
                    >
                      Save
                    </button>
                  ) : (
                    <button
                      onClick={() => setEditingLowStock(true)}
                      className="px-4 py-2 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-all active:scale-[0.98] text-sm"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}
              <p className="text-[10px] text-gray-400 mt-2">
                When product stock drops to this number, an alert will be sent to your Support chat.
              </p>
            </section>

            <section className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center">
                    <Volume2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">Sound Effects</h3>
                    <p className="text-[10px] text-gray-500">Play sounds on clicks and notifications</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    const next = !soundEnabled;
                    setSoundEnabled(next);
                    localStorage.setItem('soundEnabled', next);
                  }}
                  className={`w-12 h-6 rounded-full transition-colors relative flex-shrink-0 ${soundEnabled ? 'bg-emerald-500' : 'bg-gray-300'}`}
                >
                  <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all shadow-sm ${soundEnabled ? 'left-6.5' : 'left-0.5'}`} />
                </button>
              </div>
            </section>


            <section className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Globe className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Public Shop Page</h3>
                  <p className="text-[10px] text-gray-500">Your public-facing ecommerce page</p>
                </div>
              </div>

              <div className="transition-all duration-300">
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

                    <div className="border-t border-gray-100 pt-2.5 mt-2.5">
                      <p className="text-[10px] text-gray-500 font-medium mb-2">Dedicated mode pages</p>
                      <div className="space-y-1.5">
                        {[
                          { label: 'Telegram', suffix: '/telegram', icon: '💬' },
                          { label: 'Website', suffix: '/ecommerce', icon: '🛒' },
                          { label: 'Guest', suffix: '/guest', icon: '👤' },
                        ].map(mode => (
                          <div key={mode.suffix} className="flex items-center gap-1.5">
                            <a
                              href={`https://telegramecommerce.shop/${publicSlug.slug}${mode.suffix}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 break-all"
                            >
                              <span className="text-[10px]">{mode.icon}</span>
                              .../{publicSlug.slug}{mode.suffix}
                              <ExternalLink className="w-2.5 h-2.5 flex-shrink-0" />
                            </a>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(`https://telegramecommerce.shop/${publicSlug.slug}${mode.suffix}`);
                                addToast(`${mode.label} URL copied`);
                              }}
                              className="p-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-400 hover:text-indigo-600 transition-all flex-shrink-0"
                              title={`Copy ${mode.label} URL`}
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                <div className="space-y-2.5">
                  <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 text-center">
                    <p className="text-xs text-gray-400">No public URL generated yet</p>
                  </div>
                  <button
                    onClick={() => {
                      if (!requireFeature(bot?.plan_name, 'ecommerce_website', addToast)) return;
                      generateSlugMutation.mutate();
                    }}
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

            <section className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
                  <ArrowLeftRight className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Shop Mode Buttons</h3>
                  <p className="text-[10px] text-gray-500">Reorder and toggle mode buttons</p>
                </div>
              </div>
              <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-100">
                <p className="text-[10px] text-gray-500 font-medium mb-2">Drag to reorder — toggle to show/hide</p>
                <div className="grid grid-cols-3 gap-2">
                  {modeOrder.map((key, idx) => {
                    const labels = { telegram: 'Telegram', ecommerce: 'Website', guest: 'Guest' };
                    const isFirst = idx === 0;
                    const isLast = idx === modeOrder.length - 1;
                    const on = modeEnabled[key] !== false;
                    return (
                      <div key={key} className="flex flex-col items-center gap-1.5 p-2 rounded-xl bg-white border border-gray-200">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              if (isFirst) return;
                              const newOrder = [...modeOrder];
                              [newOrder[idx-1], newOrder[idx]] = [newOrder[idx], newOrder[idx-1]];
                              setModeOrder(newOrder);
                              updateContentMutation.mutate({ key: 'mode_order', data: { order: newOrder, enabled: modeEnabled } });
                            }}
                            disabled={isFirst}
                            className={`w-4 h-4 flex items-center justify-center rounded text-[8px] transition-colors ${isFirst ? 'text-gray-200 cursor-not-allowed' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-200'}`}
                          >◀</button>
                          <span className="text-[9px] text-gray-400 font-medium tabular-nums">{idx + 1}</span>
                          <button
                            onClick={() => {
                              if (isLast) return;
                              const newOrder = [...modeOrder];
                              [newOrder[idx], newOrder[idx+1]] = [newOrder[idx+1], newOrder[idx]];
                              setModeOrder(newOrder);
                              updateContentMutation.mutate({ key: 'mode_order', data: { order: newOrder, enabled: modeEnabled } });
                            }}
                            disabled={isLast}
                            className={`w-4 h-4 flex items-center justify-center rounded text-[8px] transition-colors ${isLast ? 'text-gray-200 cursor-not-allowed' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-200'}`}
                          >▶</button>
                        </div>
                        <span className="text-[11px] font-semibold text-gray-700 text-center leading-tight">{labels[key]}</span>
                        <button
                          onClick={() => {
                            if (on) {
                              const activeCount = Object.values(modeEnabled).filter(Boolean).length;
                              if (activeCount <= 1) return;
                            }
                            const next = { ...modeEnabled, [key]: !on };
                            setModeEnabled(next);
                            updateContentMutation.mutate({ key: 'mode_order', data: { order: modeOrder, enabled: next }, _mode: key, _action: on ? 'hidden' : 'shown' });
                          }}
                          className={`w-8 h-5 rounded-full transition-all relative flex-shrink-0 ${on ? 'bg-indigo-500 shadow-sm' : 'bg-gray-200'}`}
                        >
                          <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-md transition-transform ${on ? 'translate-x-3' : 'translate-x-0'}`} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            <section className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                  <Globe className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-gray-900">Custom Domains</h3>
                  <p className="text-[10px] text-gray-500">Use up to 3 custom domains for the public shop</p>
                </div>
                <button
                  onClick={() => setShowDomainGuide(true)}
                  className="w-10 h-10 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-500 hover:text-indigo-700 flex items-center justify-center transition-all flex-shrink-0 font-bold text-lg shadow-sm"
                  title="Setup guide"
                >
                  <HelpCircle className="w-5 h-5" />
                </button>
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
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {[
                            { label: 'Telegram', suffix: '/telegram', icon: '💬' },
                            { label: 'Website', suffix: '/ecommerce', icon: '🛒' },
                            { label: 'Guest', suffix: '/guest', icon: '👤' },
                          ].map(m => (
                            <div key={m.suffix} className="flex items-center gap-0.5">
                              <a
                                href={`https://${domain.domain}${m.suffix}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[9px] text-gray-500 hover:text-indigo-600 font-medium flex items-center gap-1 bg-gray-100 hover:bg-indigo-50 px-1.5 py-0.5 rounded-l-md transition-all"
                              >
                                {m.icon} /{m.label.toLowerCase()}
                              </a>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(`https://${domain.domain}${m.suffix}`);
                                  addToast(`${m.label} URL copied`);
                                }}
                                className="p-1 bg-gray-100 hover:bg-indigo-50 text-gray-400 hover:text-indigo-600 rounded-r-md transition-all"
                                title={`Copy ${m.label} URL`}
                              >
                                <Copy className="w-2.5 h-2.5" />
                              </button>
                            </div>))}
                        </div>
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
                      onClick={() => {
                        if (!requireFeature(bot?.plan_name, 'custom_domain', addToast)) return;
                        setShowAddInput(true);
                      }}
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



            {!isStaff && (
            <section className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 lg:col-span-2">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Manage Admins</h3>
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
            )}
          </div>
        )}

        {activeTab === 'account' && (
          <div className="max-w-lg">
            {isStaff ? (
              <>
                {/* Staff: Change Password with code */}
                <section className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-6">
                  <div className="flex items-center gap-2.5 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                      <Lock className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-gray-900">Change Password</h3>
                      <p className="text-[10px] text-gray-500">A code will be sent to your Telegram bot</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {staffPwStep === 'form' ? (
                      <>
                        <button
                          onClick={handleStaffSendCode}
                          disabled={staffPwLoading}
                          className="w-full px-4 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all active:scale-[0.98] text-sm flex items-center justify-center gap-2"
                        >
                          {staffPwLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                          Send Code to Telegram
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="bg-amber-50 rounded-xl p-3 border border-amber-100">
                          <p className="text-xs text-amber-700 font-medium">
                            A verification code was sent to your Telegram bot. Enter it below to proceed.
                          </p>
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-gray-700">Verification Code</label>
                          <input
                            type="text"
                            value={staffPwCode}
                            onChange={e => setStaffPwCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            className="w-full mt-1 px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm text-center tracking-widest font-bold"
                            placeholder="000000"
                            maxLength={6}
                            inputMode="numeric"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-gray-700">Current Password</label>
                          <div className="relative mt-1">
                            <input
                              type={cpShowOld ? 'text' : 'password'}
                              value={cpOldPw}
                              onChange={e => setCpOldPw(e.target.value)}
                              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm pr-10"
                              placeholder="Enter current password"
                            />
                            <button
                              type="button"
                              onClick={() => setCpShowOld(!cpShowOld)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                              tabIndex={-1}
                            >
                              {cpShowOld ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-gray-700">New Password</label>
                          <div className="relative mt-1">
                            <input
                              type={cpShowNew ? 'text' : 'password'}
                              value={cpNewPw}
                              onChange={e => setCpNewPw(e.target.value)}
                              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm pr-10"
                              placeholder="Min 4 characters"
                            />
                            <button
                              type="button"
                              onClick={() => setCpShowNew(!cpShowNew)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                              tabIndex={-1}
                            >
                              {cpShowNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-gray-700">Confirm New Password</label>
                          <input
                            type="password"
                            value={cpConfirmPw}
                            onChange={e => setCpConfirmPw(e.target.value)}
                            className="w-full mt-1 px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                            placeholder="Repeat new password"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => { setStaffPwStep('form'); setStaffPwCode(''); setStaffPwToken(''); }}
                            className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-all active:scale-[0.98] text-sm"
                          >
                            Back
                          </button>
                          <button
                            onClick={handleStaffChangePw}
                            disabled={staffPwLoading || !staffPwCode || !cpOldPw || !cpNewPw || !cpConfirmPw}
                            className="flex-[2] px-4 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all active:scale-[0.98] text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                          >
                            {staffPwLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                            Update Password
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </section>

                {/* Staff: Forgot Password (no email needed) */}
                <section className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                  <div className="flex items-center gap-2.5 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-gray-900">Forgot Password</h3>
                      <p className="text-[10px] text-gray-500">Reset without current password</p>
                    </div>
                  </div>

                  {staffFpStep === 'idle' ? (
                    <button
                      onClick={handleStaffFpSendCode}
                      disabled={staffFpLoading}
                      className="w-full px-4 py-3 bg-amber-600 text-white font-bold rounded-xl hover:bg-amber-700 transition-all active:scale-[0.98] text-sm flex items-center justify-center gap-2"
                    >
                      {staffFpLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                      Send Reset Code to Telegram
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <div className="bg-amber-50 rounded-xl p-3 border border-amber-100">
                        <p className="text-xs text-amber-700 font-medium">
                          A reset code was sent to your Telegram bot. Enter it below to set a new password.
                        </p>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-700">Code from Telegram</label>
                        <input
                          type="text"
                          value={staffFpCode}
                          onChange={e => setStaffFpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          className="w-full mt-1 px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm text-center tracking-widest font-bold"
                          placeholder="000000"
                          maxLength={6}
                          inputMode="numeric"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-700">New Password</label>
                        <input
                          type="password"
                          value={fpNewPw}
                          onChange={e => setFpNewPw(e.target.value)}
                          className="w-full mt-1 px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                          placeholder="Min 4 characters"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-700">Confirm New Password</label>
                        <input
                          type="password"
                          value={fpConfirmPw}
                          onChange={e => setFpConfirmPw(e.target.value)}
                          className="w-full mt-1 px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                          placeholder="Repeat new password"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => { setStaffFpStep('idle'); setStaffFpCode(''); setStaffFpToken(''); setFpNewPw(''); setFpConfirmPw(''); }}
                          className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-all active:scale-[0.98] text-sm"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleStaffFpReset}
                          disabled={staffFpLoading || !staffFpCode || !fpNewPw || !fpConfirmPw}
                          className="flex-[2] px-4 py-2.5 bg-amber-600 text-white font-bold rounded-xl hover:bg-amber-700 transition-all active:scale-[0.98] text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          {staffFpLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                          Reset Password
                        </button>
                      </div>
                    </div>
                  )}
                </section>
              </>
            ) : (
              /* Owner: existing change password + forgot password */
              <section className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">Change Password</h3>
                    <p className="text-[10px] text-gray-500">Update your account password</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-700">Current Password</label>
                    <div className="relative mt-1">
                      <input
                        type={cpShowOld ? 'text' : 'password'}
                        value={cpOldPw}
                        onChange={e => setCpOldPw(e.target.value)}
                        className="w-full px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm pr-10"
                        placeholder="Enter current password"
                      />
                      <button
                        type="button"
                        onClick={() => setCpShowOld(!cpShowOld)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        tabIndex={-1}
                      >
                        {cpShowOld ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-700">New Password</label>
                    <div className="relative mt-1">
                      <input
                        type={cpShowNew ? 'text' : 'password'}
                        value={cpNewPw}
                        onChange={e => setCpNewPw(e.target.value)}
                        className="w-full px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm pr-10"
                        placeholder="Min 8 chars, uppercase, number"
                      />
                      <button
                        type="button"
                        onClick={() => setCpShowNew(!cpShowNew)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        tabIndex={-1}
                      >
                        {cpShowNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-700">Confirm New Password</label>
                    <div className="relative mt-1">
                      <input
                        type="password"
                        value={cpConfirmPw}
                        onChange={e => setCpConfirmPw(e.target.value)}
                        className="w-full px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                        placeholder="Repeat new password"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleChangePw}
                    disabled={cpLoading || !cpOldPw || !cpNewPw || !cpConfirmPw}
                    className="w-full px-4 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all active:scale-[0.98] text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {cpLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                    Update Password
                  </button>

                  <div className="pt-3 border-t border-gray-100">
                    <button
                      onClick={() => setFpOpen(!fpOpen)}
                      className="w-full text-center text-xs text-gray-500 hover:text-indigo-600 font-medium transition-colors"
                    >
                      {fpOpen ? '▾ Forgot password?' : '▸ Forgot your password? Reset via Telegram'}
                    </button>

                    {fpOpen && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-xl border border-gray-100 space-y-3">
                        {fpStep === 'email' ? (
                          <>
                            <div>
                              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Registered Email</label>
                              <input
                                type="email"
                                value={fpEmail}
                                onChange={e => setFpEmail(e.target.value)}
                                className="w-full mt-1 px-3 py-2 bg-white border border-gray-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                                placeholder="Your registered email"
                              />
                            </div>
                            <button
                              onClick={fpSendCode}
                              disabled={fpLoading || !fpEmail}
                              className="w-full px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all active:scale-[0.98] text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                              {fpLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                              Send Reset Code to Telegram
                            </button>
                          </>
                        ) : (
                          <>
                            <p className="text-xs text-gray-600">
                              A reset code was sent to <strong>your Telegram bot</strong> for <strong>{fpEmail}</strong>.
                              Check your bot's messages in Telegram.
                            </p>
                            <div>
                              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Code from Telegram</label>
                              <input
                                type="text"
                                value={fpCode}
                                onChange={e => setFpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                className="w-full mt-1 px-3 py-2 bg-white border border-gray-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm text-center tracking-widest font-bold"
                                placeholder="000000"
                                maxLength={6}
                                inputMode="numeric"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">New Password</label>
                              <input
                                type="password"
                                value={fpNewPw}
                                onChange={e => setFpNewPw(e.target.value)}
                                className="w-full mt-1 px-3 py-2 bg-white border border-gray-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                                placeholder="Min 8 chars, uppercase, number"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Confirm New Password</label>
                              <input
                                type="password"
                                value={fpConfirmPw}
                                onChange={e => setFpConfirmPw(e.target.value)}
                                className="w-full mt-1 px-3 py-2 bg-white border border-gray-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                                placeholder="Repeat new password"
                              />
                            </div>
                            <button
                              onClick={fpResetPw}
                              disabled={fpLoading || fpCode.length !== 6 || !fpNewPw || !fpConfirmPw}
                              className="w-full px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all active:scale-[0.98] text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                              {fpLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                              Reset Password
                            </button>
                            <button
                              onClick={() => { setFpStep('email'); setFpCode(''); setFpNewPw(''); setFpConfirmPw(''); }}
                              className="w-full text-center text-[11px] text-gray-400 hover:text-gray-600 font-medium transition-colors"
                            >
                              ← Use different email
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </section>
            )}
          </div>
        )}

        {!isNativeApp && (
          <section className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Download className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">Android App</h3>
                <p className="text-[10px] text-gray-500">Download the latest APK</p>
              </div>
            </div>
            <a
              href="http://dl.telegramecommerce.shop/"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all active:scale-[0.98] text-sm"
            >
              <Download className="w-4 h-4" />
              Download Android App
            </a>
          </section>
        )}

        {activeTab === 'app' && (
          <AppSettings />
        )}

        {activeTab === 'superadmin' && isSuperadmin && (
          <>
            <section className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
                  <Download className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">APK Update</h3>
                  <p className="text-[10px] text-gray-500">Download latest APK from GitHub to VPS</p>
                </div>
              </div>
              <button
                onClick={() => apkUpdateMutation.mutate()}
                disabled={apkUpdateMutation.isPending}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-orange-600 hover:bg-orange-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all active:scale-[0.98] text-sm"
              >
                {apkUpdateMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                Release Update
              </button>
            </section>
            <ErrorBoundary>
              <DiscountsManager />
            </ErrorBoundary>
          </>
        )}

        {activeTab === 'shop' && (
          <>
          </>)}

        {activeTab === 'subscription' && (
          <Subscription />
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

// ── App Settings ───────────────────────────────────────────────
function AppSettings() {
  const { addToast } = useToastStore();
  const [logo, setLogo] = useState(
    () => localStorage.getItem('splash_logo') || '',
  );
  const [bgColor, setBgColor] = useState(
    () => localStorage.getItem('splash_bg_color') || '#4f46e5',
  );
  const [tagline, setTagline] = useState(
    () => localStorage.getItem('splash_tagline') || '',
  );

  const handleLogoPick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result;
        setLogo(dataUrl);
        localStorage.setItem('splash_logo', dataUrl);
        addToast('Logo saved');
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const removeLogo = () => {
    setLogo('');
    localStorage.removeItem('splash_logo');
    addToast('Logo removed');
  };

  const handleBgColorChange = (e) => {
    const val = e.target.value;
    setBgColor(val);
    localStorage.setItem('splash_bg_color', val);
  };

  const handleTaglineChange = (e) => {
    const val = e.target.value;
    setTagline(val);
    localStorage.setItem('splash_tagline', val);
  };

  return (
    <div className="max-w-lg space-y-4">
      {/* Splash Screen Settings */}
      <section className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
            <Palette className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">Splash Screen</h3>
            <p className="text-[10px] text-gray-500">Customize app startup screen</p>
          </div>
        </div>

        {/* Logo */}
        <div className="mb-3">
          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Logo</label>
          {logo ? (
            <div className="flex items-center gap-3 mb-2">
              <img src={logo} alt="Splash logo" className="w-16 h-16 rounded-2xl object-cover border border-gray-200" />
              <button onClick={removeLogo} className="px-3 py-1.5 bg-rose-50 text-rose-600 font-bold rounded-xl hover:bg-rose-100 transition-all text-xs">
                Remove
              </button>
            </div>
          ) : (
            <button onClick={handleLogoPick} className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl hover:bg-gray-100 transition-all text-sm font-bold text-gray-500 w-full">
              <Image className="w-4 h-4" />
              Choose from Gallery
            </button>
          )}
        </div>

        {/* Background Color */}
        <div className="mb-3">
          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Background Color</label>
          <div className="flex items-center gap-3">
            <input type="color" value={bgColor} onChange={handleBgColorChange}
              className="w-10 h-10 rounded-xl border border-gray-200 cursor-pointer" />
            <span className="text-sm font-mono text-gray-600">{bgColor}</span>
          </div>
        </div>

        {/* Tagline */}
        <div>
          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Tagline (optional)</label>
          <input type="text" value={tagline} onChange={handleTaglineChange}
            placeholder="e.g. Myanmar's Best E-commerce"
            className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm" />
        </div>
      </section>

      {/* Download Latest Version */}
      <section className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 rounded-lg bg-green-50 text-green-600 flex items-center justify-center">
            <Download className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">Update</h3>
            <p className="text-[10px] text-gray-500">Download the latest APK</p>
          </div>
        </div>
        <a
          href="http://dl.telegramecommerce.shop/"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all active:scale-[0.98] text-sm"
        >
          <Download className="w-4 h-4" />
          Download Latest Version
        </a>
      </section>

    </div>
  );
}

// ── Discount Codes Manager ──────────────────────────────────────
function DiscountsManager() {
  const { addToast } = useToastStore();
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
    setForm(f => ({ ...f, code }));
  };

  const copyCode = async (code) => {
    try {
      await navigator.clipboard.writeText(code);
      addToast('Code copied');
    } catch { addToast('Failed to copy', 'error'); }
  };

  const [form, setForm] = useState({
    code: '', discount_percent: '', duration_days: '', total_cards: '',
    is_unlimited: false, chat_id: '', is_free: false,
  });

  const { data: discounts, isLoading, refetch } = useQuery({
    queryKey: ['subscription-discounts'],
    queryFn: getSubscriptionDiscounts,
    refetchInterval: 30000,
  });

  const createMutation = useMutation({
    mutationFn: (data) => createSubscriptionDiscount(data),
    onSuccess: (res) => {
      refetch();
      resetForm();
      addToast(`Discount code "${res.code}" created`);
    },
    onError: (err) => {
      const d = err.response?.data?.detail;
      const msg = Array.isArray(d) ? d[0]?.msg || 'Validation error' : (d || 'Failed to create');
      addToast(msg, 'error');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateSubscriptionDiscount(id, data),
    onSuccess: () => {
      refetch();
      resetForm();
      addToast('Discount code updated');
    },
    onError: (err) => {
      const d = err.response?.data?.detail;
      const msg = Array.isArray(d) ? d[0]?.msg || 'Validation error' : (d || 'Failed to update');
      addToast(msg, 'error');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => deleteSubscriptionDiscount(id),
    onSuccess: () => {
      refetch();
      addToast('Discount code deleted');
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }) => updateSubscriptionDiscount(id, { is_active }),
    onSuccess: () => {
      refetch();
    },
  });

  const resetForm = () => {
    setShowCreate(false);
    setEditingId(null);
    setForm({ code: '', discount_percent: '', duration_days: '', total_cards: '', is_unlimited: false, chat_id: '', is_free: false });
  };

  const openEdit = (d) => {
    setEditingId(d.id);
    setForm({
      code: d.code || '',
      discount_percent: String(d.discount_percent || ''),
      duration_days: String(d.duration_days || ''),
      total_cards: d.total_cards != null ? String(d.total_cards) : '',
      is_unlimited: d.total_cards == null,
      chat_id: d.chat_id ? String(d.chat_id) : '',
      is_free: d.discount_percent === 100,
    });
    setShowCreate(true);
  };

  const handleSubmit = () => {
    const isFree = form.is_free;
    const percent = isFree ? 100 : parseInt(form.discount_percent);
    if (!isFree && (!percent || percent < 1 || percent > 100)) return addToast('Discount must be 1-100', 'error');

    const payload = {
      code: form.code.trim().toUpperCase(),
      discount_percent: percent,
      duration_days: form.duration_days ? parseInt(form.duration_days) : null,
      total_cards: form.is_unlimited ? null : (parseInt(form.total_cards) || null),
      chat_id: form.chat_id ? parseInt(form.chat_id) : null,
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Percent className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Subscription Discount Codes</h3>
            <p className="text-xs text-gray-500">{discounts?.length || 0} codes</p>
          </div>
        </div>
        <button onClick={() => { resetForm(); setShowCreate(true); }}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all text-xs active:scale-95">
          <Plus className="w-4 h-4" /> Create
        </button>
      </div>

      <AnimatePresence>
        {showCreate && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={() => { if (!createMutation.isPending && !updateMutation.isPending) resetForm(); }}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-4 sm:p-6 space-y-4 sm:space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900">{editingId ? 'Edit' : 'Create'} Discount Code</h3>
                <button onClick={resetForm} className="w-7 h-7 bg-gray-100 rounded-lg flex items-center justify-center hover:bg-gray-200">
                  <X className="w-3.5 h-3.5 text-gray-500" />
                </button>
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Code</label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input type="text" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                    placeholder="e.g. SAVE50"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 uppercase" />
                  <button onClick={generateCode} type="button"
                    className="w-full sm:w-auto px-3 py-2 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-all text-xs flex items-center justify-center gap-1.5 active:scale-95">
                    <RefreshCw className="w-3.5 h-3.5" /> Generate
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">
                  Duration (days) <span className="text-gray-300 normal-case font-normal">(optional)</span>
                </label>
                <input type="number" min="1" value={form.duration_days} onChange={e => setForm(f => ({ ...f, duration_days: e.target.value.replace(/\D/g, '') }))}
                  placeholder="Leave empty to use the plan's duration"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Discount Type</label>
                <div className="flex bg-gray-100 rounded-xl p-0.5">
                  <button type="button" onClick={() => setForm(f => ({ ...f, is_free: false, discount_percent: f.discount_percent || '' }))}
                    className={`flex-1 py-2 text-xs font-bold rounded-[10px] transition-all ${!form.is_free ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                    Percentage
                  </button>
                  <button type="button" onClick={() => setForm(f => ({ ...f, is_free: true, discount_percent: '100' }))}
                    className={`flex-1 py-2 text-xs font-bold rounded-[10px] transition-all ${form.is_free ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                    Free
                  </button>
                </div>
                {form.is_free ? (
                  <div className="mt-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-sm font-bold text-emerald-700 flex items-center gap-2">
                    <Zap className="w-4 h-4" /> Free — 100% off, no payment gateway
                  </div>
                ) : (
                  <input type="number" min="1" max="100" value={form.discount_percent} onChange={e => {
                    const v = e.target.value.replace(/\D/g, '');
                    if (parseInt(v) > 100) return;
                    setForm(f => ({ ...f, discount_percent: v }));
                  }}
                    placeholder="e.g. 10"
                    className="mt-2 w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                )}
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">
                  Total Cards <span className="text-gray-300 normal-case">(number of uses)</span>
                </label>
                <div className="flex items-center gap-3">
                  <input type="number" min="1" value={form.total_cards} onChange={e => setForm(f => ({ ...f, total_cards: e.target.value.replace(/\D/g, '') }))}
                    disabled={form.is_unlimited}
                    placeholder="e.g. 5"
                    className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed" />
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <button onClick={() => setForm(f => ({ ...f, is_unlimited: !f.is_unlimited }))}
                      className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 ${form.is_unlimited ? 'bg-indigo-600' : 'bg-gray-300'}`}>
                      <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all shadow-sm ${form.is_unlimited ? 'left-5.5' : 'left-0.5'}`} />
                    </button>
                    <span className="text-xs font-bold text-gray-500">Unlimited</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">
                  Telegram Chat ID <span className="text-gray-300 normal-case">(referral notification)</span>
                </label>
                <input type="number" value={form.chat_id} onChange={e => setForm(f => ({ ...f, chat_id: e.target.value.replace(/\D/g, '') }))}
                  placeholder="e.g. 7552675526"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>

              <div className="flex gap-2 pt-2">
                <button onClick={handleSubmit}
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="flex-1 px-4 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all text-sm disabled:opacity-50 flex items-center justify-center gap-1.5">
                  {(createMutation.isPending || updateMutation.isPending) ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  {editingId ? 'Update' : 'Create'} Code
                </button>
                <button onClick={resetForm} className="px-4 py-2.5 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-all text-sm">
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {confirmDelete && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={() => setConfirmDelete(null)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
              <div className="w-14 h-14 rounded-full bg-rose-50 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-7 h-7 text-rose-500" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Discount Code?</h3>
              <p className="text-sm text-gray-500 mb-6">
                Are you sure you want to delete <span className="font-bold text-gray-700">"{confirmDelete.code}"</span>? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setConfirmDelete(null)}
                  className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-all text-sm">
                  Cancel
                </button>
                <button onClick={() => { deleteMutation.mutate(confirmDelete.id); setConfirmDelete(null); }}
                  disabled={deleteMutation.isPending}
                  className="flex-1 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all text-sm flex items-center justify-center gap-1.5">
                  {deleteMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="p-8 space-y-3">{[1,2,3].map(i => <LoadingSkeleton key={i} className="h-12" />)}</div>
        ) : !discounts || discounts.length === 0 ? (
          <div className="p-12 text-center">
            <Percent className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No discount codes yet</p>
            <p className="text-xs text-gray-400 mt-1">Click Create to make your first subscription discount code.</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="text-left px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Code</th>
                    <th className="text-left px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Discount</th>
                    <th className="text-left px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Duration</th>
                    <th className="text-left px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Uses</th>
                    <th className="text-left px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Chat ID</th>
                    <th className="text-left px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="text-right px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {discounts.map(d => (
                    <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 font-mono font-bold text-gray-900 text-xs bg-gray-100 px-2 py-0.5 rounded-lg">
                          {d.code}
                          <button onClick={() => copyCode(d.code)} className="text-gray-400 hover:text-indigo-600 transition-colors">
                            <Copy className="w-3 h-3" />
                          </button>
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-bold text-emerald-600">{d.discount_percent === 100 ? 'Free' : `${d.discount_percent}%`}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{d.duration_days ? `${d.duration_days}d` : '—'}</td>
                      <td className="px-4 py-3">
                        <span className="text-gray-600">{d.used_count}{d.total_cards != null ? `/${d.total_cards}` : '/∞'}</span>
                      </td>
                      <td className="px-4 py-3">
                        {d.chat_id ? (
                          <span className="font-mono text-xs text-indigo-600">{d.chat_id}</span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => toggleMutation.mutate({ id: d.id, is_active: !d.is_active })}
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition-all ${
                            d.is_active
                              ? 'bg-emerald-50 border-emerald-100 text-emerald-600'
                              : 'bg-gray-50 border-gray-100 text-gray-400'
                          }`}>
                          {d.is_active ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openEdit(d)}
                            className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg">
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => setConfirmDelete(d)}
                            className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-gray-50">
              {discounts.map(d => (
                <div key={d.id} className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 font-mono font-bold text-gray-900 text-xs bg-gray-100 px-2 py-0.5 rounded-lg">
                      {d.code}
                      <button onClick={() => copyCode(d.code)} className="text-gray-400 hover:text-indigo-600 transition-colors">
                        <Copy className="w-3 h-3" />
                      </button>
                    </span>
                    <button onClick={() => toggleMutation.mutate({ id: d.id, is_active: !d.is_active })}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition-all ${
                        d.is_active
                          ? 'bg-emerald-50 border-emerald-100 text-emerald-600'
                          : 'bg-gray-50 border-gray-100 text-gray-400'
                      }`}>
                      {d.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-[10px] text-gray-400 block">Discount</span>
                      <span className="font-bold text-emerald-600">{d.discount_percent === 100 ? 'Free' : `${d.discount_percent}%`}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 block">Duration</span>
                      <span className="text-gray-700 font-medium">{d.duration_days ? `${d.duration_days}d` : '—'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 block">Uses</span>
                      <span className="text-gray-700 font-medium">{d.used_count}{d.total_cards != null ? `/${d.total_cards}` : '/∞'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 block">Chat ID</span>
                      {d.chat_id ? (
                        <span className="font-mono text-xs text-indigo-600">{d.chat_id}</span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => openEdit(d)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-50 text-indigo-600 font-bold rounded-xl hover:bg-indigo-100 transition-all text-xs active:scale-95">
                      <Edit2 className="w-3.5 h-3.5" /> Edit
                    </button>
                    <button onClick={() => setConfirmDelete(d)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-rose-50 text-rose-600 font-bold rounded-xl hover:bg-rose-100 transition-all text-xs active:scale-95">
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
