import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAllBots, getGlobalSettings, updateGlobalSetting, getPlanPayments, createPlanPayment, updatePlanPayment, deletePlanPayment } from '../api/superadmin';
import { getStats, getOrdersByDay } from '../api/stats';
import { getOrders } from '../api/orders';
import { getBot, updateBot, deleteBot, getAiSettings, updateAiSettings } from '../api/bots';
import { getUsers } from '../api/customers';
import { getLoginAudit } from '../api/auth';
import { getContentBlocks, updateContentBlock } from '../api/contentBlocks';
import { useAuthStore } from '../store/authStore';
import { useBotStore } from '../store/botStore';
import { useToastStore } from '../store/toastStore';
import { downloadText } from '../utils/download';
import StatCard from '../components/shared/StatCard';
import LoadingSkeleton from '../components/shared/LoadingSkeleton';
import StatusBadge from '../components/shared/StatusBadge';
import SuperadminBroadcast from './SuperadminBroadcast';
import SuperadminOrders from './SuperadminOrders';
import SuperadminKeys from './SuperadminKeys';
import SuperadminBenchmarks from './SuperadminBenchmarks';
import SuperadminSearch from './SuperadminSearch';
import {
  Bot, Users, ShoppingBag, DollarSign, Clock, ShieldAlert,
  Search, X, ChevronRight, ExternalLink, Trash2, Power,
  Loader2, CheckCircle2, AlertTriangle, Plus, Crown, Star,
  Zap, Key, Package, RefreshCw, TrendingUp, Activity,
  Settings as SettingsIcon, CreditCard, MessageSquare,
  ShieldCheck, Calendar, Send, BarChart3, Target, Radio,
  Brain, FileText, Globe, Download, HelpCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { differenceInDays, subDays } from 'date-fns';
import { myanmarFormat } from '../utils/date';
import { formatPrice } from '../utils/formatPrice';

// ─── Plan Config ──────────────────────────────────────────────
const PLANS = [
  { key: 'free', name: 'Free', icon: Zap, color: 'text-gray-500', bg: 'bg-gray-50', border: 'border-gray-200', badge: 'bg-gray-100 text-gray-600' },
  { key: 'basic', name: 'Basic', icon: Star, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', badge: 'bg-blue-100 text-blue-600' },
  { key: 'standard', name: 'Standard', icon: Crown, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', badge: 'bg-emerald-100 text-emerald-600' },
  { key: 'pro', name: 'Pro', icon: Key, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200', badge: 'bg-purple-100 text-purple-600' },
  { key: 'business', name: 'Business', icon: Crown, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', badge: 'bg-amber-100 text-amber-600' },
];

function getPlanStyle(planName) {
  const p = PLANS.find(p => p.key === (planName || 'free').toLowerCase()) || PLANS[0];
  return p;
}

// ─── Utility ──────────────────────────────────────────────────
function safeFormat(dateStr, fmt = 'MMM d, yyyy') {
  try { return myanmarFormat(dateStr, fmt); }
  catch { return dateStr || '—'; }
}

// ─── Admin Activity Log (frontend-tracked) ────────────────────
let activityListeners = [];
let adminActivities = [];

export function addAdminActivity(action, detail) {
  const entry = { id: Date.now(), action, detail, timestamp: new Date().toISOString(), user: 'superadmin' };
  adminActivities = [entry, ...adminActivities].slice(0, 100);
  activityListeners.forEach(fn => fn(adminActivities));
}

export function useAdminActivities() {
  const [activities, setActivities] = useState(adminActivities);
  useEffect(() => {
    const fn = (a) => setActivities([...a]);
    activityListeners.push(fn);
    return () => { activityListeners = activityListeners.filter(f => f !== fn); };
  }, []);
  return activities;
}

// ─── Main Export ──────────────────────────────────────────────
export default function SuperadminDashboard() {
  const { user } = useAuthStore();
  const { setSelectedBot } = useBotStore();
  const { addToast } = useToastStore();
  const queryClient = useQueryClient();
  const [activeSection, setActiveSection] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [detailBotId, setDetailBotId] = useState(null);

  // ── Queries ──
  const { data: allBots, isLoading: botsLoading } = useQuery({
    queryKey: ['superadmin', 'all-bots'],
    queryFn: getAllBots,
    refetchInterval: 30000,
  });

  const { data: globalStats, isLoading: statsLoading } = useQuery({
    queryKey: ['superadmin', 'global-stats'],
    queryFn: () => getStats({ bot_id: null }),
    refetchInterval: 30000,
  });

  const { data: recentOrders, isLoading: ordersLoading } = useQuery({
    queryKey: ['superadmin', 'recent-orders'],
    queryFn: () => getOrders({ limit: 20, sort: 'created_at', order: 'desc' }),
    refetchInterval: 15000,
  });

  const { data: globalSettings } = useQuery({
    queryKey: ['global-settings'],
    queryFn: getGlobalSettings,
  });

  const { data: planPayments } = useQuery({
    queryKey: ['plan-payments'],
    queryFn: getPlanPayments,
    refetchInterval: 30000,
  });

  const { data: loginLogs } = useQuery({
    queryKey: ['login-audit'],
    queryFn: getLoginAudit,
    refetchInterval: 30000,
  });

  // Bot detail queries
  const { data: detailBot, isLoading: detailLoading } = useQuery({
    queryKey: ['superadmin', 'bot-detail', detailBotId],
    queryFn: () => getBot(detailBotId),
    enabled: !!detailBotId,
  });

  const { data: detailStats } = useQuery({
    queryKey: ['superadmin', 'bot-stats', detailBotId],
    queryFn: () => getStats({ bot_id: Number(detailBotId) }),
    enabled: !!detailBotId,
  });

  const { data: detailAiSettings } = useQuery({
    queryKey: ['superadmin', 'bot-ai', detailBotId],
    queryFn: () => getAiSettings(detailBotId),
    enabled: !!detailBotId,
  });

  const { data: detailContentBlocks } = useQuery({
    queryKey: ['superadmin', 'bot-content', detailBotId],
    queryFn: () => getContentBlocks({ bot_id: Number(detailBotId) }),
    enabled: !!detailBotId,
  });

  // ── Mutations ──
  const updateBotMutation = useMutation({
    mutationFn: ({ id, data }) => updateBot(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin', 'all-bots'] });
      queryClient.invalidateQueries({ queryKey: ['superadmin', 'bot-detail', detailBotId] });
      queryClient.invalidateQueries({ queryKey: ['superadmin', 'global-stats'] });
      addAdminActivity('update_bot', `Updated bot #${detailBotId}`);
      addToast('Bot updated successfully');
    },
    onError: (err) => addToast(err.response?.data?.detail || 'Failed to update bot', 'error'),
  });

  const deleteBotMutation = useMutation({
    mutationFn: (id) => deleteBot(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin', 'all-bots'] });
      queryClient.invalidateQueries({ queryKey: ['superadmin', 'global-stats'] });
      setDetailBotId(null);
      addAdminActivity('delete_bot', `Deleted bot #${detailBotId}`);
      addToast('Bot deleted successfully');
    },
    onError: (err) => addToast(err.response?.data?.detail || 'Failed to delete bot', 'error'),
  });

  const updateGlobalMutation = useMutation({
    mutationFn: ({ key, value }) => updateGlobalSetting(key, value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['global-settings'] });
      addAdminActivity('global_setting', `Updated setting ${key}`);
      addToast('Global setting updated');
    },
  });

  const updateAiMutation = useMutation({
    mutationFn: ({ botId, data }) => updateAiSettings(botId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin', 'bot-ai', detailBotId] });
      addAdminActivity('update_ai', `Updated AI settings for bot #${detailBotId}`);
      addToast('AI settings updated');
    },
    onError: () => addToast('Failed to update AI settings', 'error'),
  });

  const updateContentMutation = useMutation({
    mutationFn: ({ key, data }) => updateContentBlock(detailBotId, key, data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['superadmin', 'bot-content', detailBotId] });
      addAdminActivity('update_content', `Updated ${variables.key} for bot #${detailBotId}`);
      addToast(variables.key === 'shop_theme' ? 'Theme applied' : 'Content updated');
    },
    onError: () => addToast('Failed to update content', 'error'),
  });

  // ── Filtered bots ──
  const filteredBots = useMemo(() => {
    if (!allBots) return [];
    return allBots.filter(b => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = !q
        || (b.bot_username || '').toLowerCase().includes(q)
        || (b.bot_full_name || '').toLowerCase().includes(q)
        || String(b.id).includes(q);
      const matchesStatus = statusFilter === 'all'
        || (statusFilter === 'active' && b.is_active !== false)
        || (statusFilter === 'inactive' && b.is_active === false);
      return matchesSearch && matchesStatus;
    });
  }, [allBots, searchQuery, statusFilter]);

  const activeBots = allBots?.filter(b => b.is_active !== false).length || 0;
  const totalBots = allBots?.length || 0;

  // ── Sections ──
  const sections = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'bots', label: 'All Bots', icon: Bot },
    { id: 'orders', label: 'Orders', icon: ShoppingBag },
    { id: 'broadcast', label: 'Broadcast', icon: Send },
    { id: 'keys', label: 'Keys', icon: Key },
    { id: 'benchmarks', label: 'Benchmarks', icon: BarChart3 },
    { id: 'search', label: 'Search', icon: Search },
    { id: 'plans', label: 'Plans', icon: Crown },
    { id: 'audit', label: 'Audit', icon: ShieldCheck },
    { id: 'messages', label: 'Send Message', icon: Mail },
  ];

  return (
    <div className="space-y-5 sm:space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900 flex items-center gap-2.5">
            <ShieldAlert className="w-6 h-6 text-indigo-600" />
            Superadmin Control
          </h1>
          <p className="text-gray-500 text-xs sm:text-sm mt-0.5">
            Full platform overview and management across all bots.
          </p>
        </div>
        <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-xs font-bold text-gray-500">{activeBots}/{totalBots} bots active</span>
          </div>
        </div>
      </div>

      {/* Section tabs */}
      <div className="flex bg-white p-0.5 rounded-xl shadow-sm border border-gray-100 self-start w-full overflow-x-auto scrollbar-hide">
        {sections.map(s => (
          <button key={s.id} onClick={() => setActiveSection(s.id)}
            className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 text-[11px] sm:text-xs font-bold rounded-[10px] sm:rounded-xl transition-all flex items-center justify-center gap-1 whitespace-nowrap ${
              activeSection === s.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-gray-500 hover:bg-gray-50'
            }`}>
            <s.icon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            {s.label}
          </button>
        ))}
      </div>

      {/* Tab panels */}
      {activeSection === 'overview' && (
        <OverviewTab
          globalStats={globalStats}
          statsLoading={statsLoading}
          allBots={allBots}
          botsLoading={botsLoading}
          recentOrders={recentOrders}
          ordersLoading={ordersLoading}
          planPayments={planPayments}
          allBotsCount={totalBots}
          activeBotsCount={activeBots}
          updateGlobalMutation={updateGlobalMutation}
          globalSettings={globalSettings}
        />
      )}

      {activeSection === 'broadcast' && <SuperadminBroadcast />}
      {activeSection === 'orders' && <SuperadminOrders />}
      {activeSection === 'keys' && <SuperadminKeys />}
      {activeSection === 'benchmarks' && <SuperadminBenchmarks />}
      {activeSection === 'search' && <SuperadminSearch />}

      {activeSection === 'bots' && (
        <BotsTab
          filteredBots={filteredBots}
          allBots={allBots}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          detailBotId={detailBotId}
          setDetailBotId={setDetailBotId}
          setSelectedBot={setSelectedBot}
          updateBotMutation={updateBotMutation}
          deleteBotMutation={deleteBotMutation}
          detailBot={detailBot}
          detailStats={detailStats}
          detailLoading={detailLoading}
          detailAiSettings={detailAiSettings}
          detailContentBlocks={detailContentBlocks}
          updateAiMutation={updateAiMutation}
          updateContentMutation={updateContentMutation}
        />
      )}

      {activeSection === 'plans' && <PlansTab planPayments={planPayments} allBots={allBots} />}
      {activeSection === 'audit' && <AuditTab loginLogs={loginLogs} />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  OVERVIEW TAB
// ═══════════════════════════════════════════════════════════════
function OverviewTab({ globalStats, statsLoading, allBots, botsLoading, recentOrders, ordersLoading, planPayments, allBotsCount, activeBotsCount, updateGlobalMutation, globalSettings }) {
  const { addToast } = useToastStore();
  const navigate = useNavigate();
  const freeBots = allBots?.filter(b => !b.plan_name || b.plan_name.toLowerCase() === 'free').length || 0;
  const paidBots = allBotsCount - freeBots;

  // Analytics export
  const [exporting, setExporting] = useState(false);

  const exportAnalytics = () => {
    if (!allBots) return;
    setExporting(true);
    setTimeout(async () => {
      try {
        const rows = [['Bot ID', 'Username', 'Name', 'Plan', 'Status', 'Plan Expiry']];
        allBots.forEach(b => {
          rows.push([
            b.id, b.bot_username || '', b.bot_full_name || '',
            b.plan_name || 'Free', b.is_active !== false ? 'Active' : 'Inactive',
            b.plan_expiry || ''
          ]);
        });
        const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
        await downloadText('﻿' + csv,
          `bots-export-${myanmarFormat(new Date(), 'yyyy-MM-dd')}.csv`,
          'text/csv;charset=utf-8');
        addToast('Bots CSV exported');
      } catch (e) {
        addToast('Export failed', 'error');
      }
      setExporting(false);
    }, 500);
  };

  const planDist = useMemo(() => {
    if (!allBots) return [];
    const counts = {};
    allBots.forEach(b => { const p = (b.plan_name || 'free').toLowerCase(); counts[p] = (counts[p] || 0) + 1; });
    return Object.entries(counts).map(([key, count]) => {
      const plan = PLANS.find(p => p.key === key) || PLANS[0];
      return { key, count, ...plan };
    }).sort((a, b) => b.count - a.count);
  }, [allBots]);

  const recent7 = recentOrders?.slice(0, 7) || [];

  return (
    <div className="space-y-5">
      {/* Global stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        {statsLoading
          ? Array(4).fill(0).map((_, i) => <LoadingSkeleton key={i} className="h-28" />)
          : [
            { title: 'Total Revenue', value: formatPrice(globalStats?.total_revenue || 0, 'MMK'), icon: DollarSign, color: 'indigo' },
            { title: 'Total Orders', value: (globalStats?.total_orders || 0).toLocaleString(), icon: ShoppingBag, color: 'emerald' },
            { title: 'Total Users', value: (globalStats?.total_users || 0).toLocaleString(), icon: Users, color: 'rose' },
            { title: 'Pending Orders', value: (globalStats?.pending_orders || 0).toLocaleString(), icon: Clock, color: 'amber' },
          ].map((card, i) => <StatCard key={i} {...card} />)}
      </div>

      {/* Secondary stats + export */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        {[
          { label: 'Total Bots', value: allBotsCount, sub: `${activeBotsCount} active`, icon: Bot, color: 'indigo' },
          { label: 'Paid Plans', value: paidBots, sub: `${freeBots} on free`, icon: Crown, color: 'purple' },
          { label: "Today's Revenue", value: formatPrice(globalStats?.today_revenue || 0, 'MMK'), icon: TrendingUp, color: 'emerald' },
          { label: 'Monthly Revenue', value: formatPrice(globalStats?.monthly_revenue || 0, 'MMK'), icon: CreditCard, color: 'amber' },
        ].map((s, i) => (
          <div key={i} className="bg-white p-3.5 sm:p-4 rounded-xl border border-gray-100 shadow-sm">
            <div className="flex items-center gap-2.5 mb-1.5">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                s.color === 'indigo' ? 'bg-indigo-50 text-indigo-600' :
                s.color === 'purple' ? 'bg-purple-50 text-purple-600' :
                s.color === 'emerald' ? 'bg-emerald-50 text-emerald-600' :
                'bg-amber-50 text-amber-600'
              }`}>
                <s.icon className="w-3.5 h-3.5" />
              </div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{s.label}</span>
            </div>
            <p className="text-lg font-bold text-gray-900 leading-tight">{s.value}</p>
            {s.sub && <p className="text-[10px] text-gray-400 mt-0.5">{s.sub}</p>}
          </div>
        ))}
      </div>

      {/* Actions row */}
      <div className="flex flex-wrap gap-2">
        <button onClick={exportAnalytics} disabled={exporting || !allBots}
          className="flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-50 transition-all text-xs disabled:opacity-50">
          {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
          Export Bots CSV
        </button>
        <button onClick={() => navigate('/faqs')}
          className="flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-50 transition-all text-xs">
          <HelpCircle className="w-3.5 h-3.5" />
          Create FAQs
        </button>
        {globalSettings && Object.entries(globalSettings).slice(0, 4).map(([key, value]) => (
          <button key={key} onClick={() => updateGlobalMutation.mutate({ key, value: !value })}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
              value ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-gray-50 border-gray-200 text-gray-500'
            }`}>
            {value ? <CheckCircle2 className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
            {key.replace(/_/g, ' ')}: {value ? 'ON' : 'OFF'}
          </button>
        ))}
      </div>

      {/* Plan distribution + Recent orders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Crown className="w-4 h-4 text-amber-500" />
            Plan Distribution
          </h3>
          {botsLoading ? <LoadingSkeleton className="h-48" />
          : planDist.length === 0 ? (
            <div className="text-center py-8"><Bot className="w-8 h-8 text-gray-200 mx-auto mb-2" /><p className="text-sm text-gray-400">No bots yet</p></div>
          ) : (
            <div className="space-y-3">
              {planDist.map(p => {
                const pct = allBotsCount > 0 ? (p.count / allBotsCount) * 100 : 0;
                return (
                  <div key={p.key} className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg ${p.bg} ${p.color} flex items-center justify-center flex-shrink-0`}>
                      {React.createElement(p.icon, { className: 'w-4 h-4' })}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-bold text-gray-900">{p.name}</span>
                        <span className="text-xs font-bold text-gray-500">{p.count} bots</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${pct}%`, backgroundColor: p.key === 'free' ? '#9ca3af' : p.key === 'basic' ? '#3b82f6' : p.key === 'standard' ? '#10b981' : p.key === 'pro' ? '#8b5cf6' : '#f59e0b' }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Package className="w-4 h-4 text-indigo-500" />
            Recent Orders (All Bots)
          </h3>
          {ordersLoading ? <LoadingSkeleton className="h-48" />
          : recent7.length === 0 ? (
            <div className="text-center py-8"><ShoppingBag className="w-8 h-8 text-gray-200 mx-auto mb-2" /><p className="text-sm text-gray-400">No recent orders</p></div>
          ) : (
            <div className="space-y-2">
              {recent7.map(o => (
                <div key={o.id} className="flex items-center justify-between p-2.5 rounded-xl hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-[10px] flex-shrink-0">#{String(o.id).slice(-4)}</div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-gray-900 truncate">{o.first_name || 'Anonymous'}</p>
                      <p className="text-[10px] text-gray-400 truncate">{o.items?.[0]?.name || formatPrice(o.total || o.amount || 0, 'MMK')}</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    <StatusBadge status={o.status} />
                    <p className="text-[10px] text-gray-400 mt-0.5">{safeFormat(o.created_at, 'MMM d')}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  BOTS TAB — Full Management Table + Detail Panel
// ═══════════════════════════════════════════════════════════════
function BotsTab({
  filteredBots, allBots, searchQuery, setSearchQuery, statusFilter, setStatusFilter,
  detailBotId, setDetailBotId, setSelectedBot, updateBotMutation, deleteBotMutation,
  detailBot, detailStats, detailLoading, detailAiSettings, detailContentBlocks,
  updateAiMutation, updateContentMutation,
}) {
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  const handleSwitchToBot = (botId) => {
    setSelectedBot(botId);
    window.location.href = '/dashboard';
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
      <div className={`${detailBotId ? 'hidden xl:block' : ''} space-y-4`}>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search bots by name, username, or ID..."
              className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
            {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X className="w-3.5 h-3.5" /></button>}
          </div>
          <div className="flex bg-white p-0.5 rounded-xl border border-gray-200 self-start">
            {['all', 'active', 'inactive'].map(f => (
              <button key={f} onClick={() => setStatusFilter(f)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${statusFilter === f ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {!allBots ? (
          <div className="space-y-2">{[1,2,3].map(i => <LoadingSkeleton key={i} className="h-20" />)}</div>
        ) : filteredBots.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
            <Bot className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">{searchQuery ? 'No bots match your search' : 'No bots found'}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredBots.map((b, i) => {
              const plan = getPlanStyle(b.plan_name);
              const isSelected = detailBotId === b.id;
              const daysLeft = b.plan_expiry ? differenceInDays(new Date(b.plan_expiry), new Date()) : null;
              const isExpired = daysLeft !== null && daysLeft <= 0;
              const isExpiring = daysLeft !== null && daysLeft > 0 && daysLeft <= 7;
              return (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} key={b.id}
                  className={`bg-white rounded-xl border transition-all cursor-pointer ${isSelected ? 'border-indigo-400 ring-2 ring-indigo-50 shadow-md' : 'border-gray-100 hover:border-gray-200 hover:shadow-sm'}`}
                  onClick={() => setDetailBotId(isSelected ? null : b.id)}>
                  <div className="p-3.5 flex items-center gap-3.5">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${b.is_active !== false ? plan.bg : 'bg-gray-100'} ${b.is_active !== false ? plan.color : 'text-gray-400'}`}>
                      {React.createElement(plan.icon, { className: 'w-5 h-5' })}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-bold text-gray-900 truncate">{b.bot_full_name || b.bot_username || `Bot #${b.id}`}</p>
                        <span className={`px-1.5 py-0.5 text-[9px] font-bold uppercase rounded-md ${plan.badge}`}>{plan.name}</span>
                        {/* Status indicator dot */}
                        <span className={`w-1.5 h-1.5 rounded-full ${b.is_active === false ? 'bg-gray-300' : isExpired ? 'bg-rose-500' : isExpiring ? 'bg-amber-500' : 'bg-emerald-500'}`} title={b.is_active === false ? 'Inactive' : isExpired ? 'Expired' : isExpiring ? 'Expiring soon' : 'Healthy'} />
                      </div>
                      <p className="text-[11px] text-gray-500 truncate mt-0.5">
                        @{b.bot_username || 'no_username'} · ID: {b.id}
                        {daysLeft !== null && (daysLeft > 0 ? ` · ${daysLeft}d left` : ` · EXPIRED`)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {deleteConfirmId === b.id ? (
                        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                          <button onClick={() => { deleteBotMutation.mutate(b.id); setDeleteConfirmId(null); }}
                            className="p-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700"><Trash2 className="w-3.5 h-3.5" /></button>
                          <button onClick={() => setDeleteConfirmId(null)} className="p-1.5 bg-gray-100 text-gray-500 rounded-lg hover:bg-gray-200">✕</button>
                        </div>
                      ) : (
                        <>
                          <button onClick={e => { e.stopPropagation(); handleSwitchToBot(b.id); }}
                            className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg" title="Switch to this bot">
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={e => { e.stopPropagation(); setDeleteConfirmId(b.id); }}
                            className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg" title="Delete bot">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <ChevronRight className={`w-4 h-4 text-gray-300 transition-transform ${isSelected ? 'rotate-90' : ''}`} />
                        </>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail panel (desktop) */}
      <AnimatePresence>
        {detailBotId && (
          <motion.div initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }}
            transition={{ type: 'spring', damping: 25, stiffness: 250 }} className="xl:col-span-2">
            <BotDetailPanel
              botId={detailBotId} bot={detailBot} stats={detailStats} loading={detailLoading}
              aiSettings={detailAiSettings} contentBlocks={detailContentBlocks}
              onClose={() => setDetailBotId(null)} onSwitch={handleSwitchToBot}
              updateBotMutation={updateBotMutation} deleteBotMutation={deleteBotMutation}
              updateAiMutation={updateAiMutation} updateContentMutation={updateContentMutation}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Detail panel (mobile) */}
      <AnimatePresence>
        {detailBotId && (
          <div className="fixed inset-0 z-50 xl:hidden">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setDetailBotId(null)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[28px] shadow-2xl max-h-[85vh] overflow-y-auto"
              style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
              <div className="flex justify-center pt-3 pb-1"><div className="w-9 h-1 bg-gray-200 rounded-full" /></div>
              <BotDetailPanel
                botId={detailBotId} bot={detailBot} stats={detailStats} loading={detailLoading}
                aiSettings={detailAiSettings} contentBlocks={detailContentBlocks}
                onClose={() => setDetailBotId(null)} onSwitch={handleSwitchToBot}
                updateBotMutation={updateBotMutation} deleteBotMutation={deleteBotMutation}
                updateAiMutation={updateAiMutation} updateContentMutation={updateContentMutation}
                mobile />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  BOT DETAIL PANEL (with AI Settings & Content Editor)
// ═══════════════════════════════════════════════════════════════
function BotDetailPanel({ botId, bot, stats, loading, aiSettings, contentBlocks, onClose, onSwitch,
  updateBotMutation, deleteBotMutation, updateAiMutation, updateContentMutation, mobile }) {
  const { addToast } = useToastStore();
  const queryClient = useQueryClient();
  const [detailTab, setDetailTab] = useState('overview');

  const [aiPrompt, setAiPrompt] = useState('');
  const [aiEnabled, setAiEnabled] = useState(false);
  const [aiApiKey, setAiApiKey] = useState('');
  const [showAiApiKeyInput, setShowAiApiKeyInput] = useState(false);
  const [aiWebsiteContext, setAiWebsiteContext] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [websiteEnabled, setWebsiteEnabled] = useState(false);

  useEffect(() => {
    if (aiSettings) {
      setAiPrompt(aiSettings.system_prompt || aiSettings.prompt || '');
      setAiEnabled(aiSettings.enabled !== false);
      setAiApiKey(aiSettings.api_key || '');
      setAiWebsiteContext(aiSettings.website_system_context || '');
    }
    if (contentBlocks) {
      const web = contentBlocks.find(b => b.key === 'website_link');
      if (web) {
        setWebsiteUrl(web.content_data?.url || '');
        setWebsiteEnabled(web.content_data?.enabled !== false);
      }
    }
  }, [aiSettings, contentBlocks]);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
        <LoadingSkeleton className="h-8 w-48" /><LoadingSkeleton className="h-24" /><LoadingSkeleton className="h-32" />
      </div>
    );
  }
  if (!bot) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
        <AlertTriangle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 font-medium">Bot not found</p>
      </div>
    );
  }

  const plan = getPlanStyle(bot.plan_name);
  const daysLeft = bot.plan_expiry ? differenceInDays(new Date(bot.plan_expiry), new Date()) : null;
  const isActive = bot.is_active !== false;

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Bot },
    { id: 'ai', label: 'AI Agent', icon: Brain },
    { id: 'content', label: 'Content', icon: FileText },
  ];

  const containerClass = mobile ? 'px-5 pb-8 space-y-5' : 'bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5';

  return (
    <div className={containerClass}>
      {!mobile && (
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-gray-900">Bot Management</h3>
          <button onClick={onClose} className="w-7 h-7 bg-gray-100 rounded-lg flex items-center justify-center hover:bg-gray-200"><X className="w-3.5 h-3.5 text-gray-500" /></button>
        </div>
      )}

      {/* Sub-tabs */}
      <div className="flex bg-gray-100 p-0.5 rounded-xl">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setDetailTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold rounded-lg transition-all ${detailTab === t.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {React.createElement(t.icon, { className: 'w-3.5 h-3.5' })}
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab: Overview */}
      {detailTab === 'overview' && (
        <div className="space-y-5">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl ${plan.bg} ${plan.color} flex items-center justify-center shadow-sm flex-shrink-0`}>
              {React.createElement(plan.icon, { className: 'w-7 h-7' })}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-gray-900 truncate">{bot.bot_full_name || bot.bot_username || `Bot #${bot.id}`}</h2>
              <p className="text-sm text-gray-500">@{bot.bot_username || 'no_username'}</p>
              <div className="flex items-center gap-2 mt-1.5">
                <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-md ${plan.badge}`}>{plan.name}</span>
                <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-md ${isActive ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-gray-50 text-gray-500 border border-gray-100'}`}>{isActive ? 'Active' : 'Inactive'}</span>
                {bot.is_main && <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-md bg-amber-50 text-amber-600 border border-amber-100">Main</span>}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {[
              { label: 'Total Revenue', value: stats ? formatPrice(stats.total_revenue || 0, 'MMK') : '—' },
              { label: 'Total Orders', value: stats ? (stats.total_orders || 0).toLocaleString() : '—' },
              { label: 'Total Users', value: stats ? (stats.total_users || 0).toLocaleString() : '—' },
              { label: 'Pending Orders', value: stats ? (stats.pending_orders || 0).toLocaleString() : '—' },
              { label: "Today's Revenue", value: stats ? formatPrice(stats.today_revenue || 0, 'MMK') : '—' },
              { label: 'Monthly Revenue', value: stats ? formatPrice(stats.monthly_revenue || 0, 'MMK') : '—' },
            ].map((s, i) => (
              <div key={i} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">{s.label}</p>
                <p className="text-sm font-bold text-gray-900 mt-0.5">{s.value}</p>
              </div>
            ))}
          </div>

          <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Plan & Expiry</p>
                <p className="text-sm font-bold text-gray-900 mt-0.5">{plan.name} Plan</p>
                {bot.plan_expiry ? (
                  <p className={`text-xs mt-0.5 ${daysLeft > 0 ? 'text-gray-500' : 'text-rose-500 font-medium'}`}>
                    {daysLeft > 0 ? `Expires ${safeFormat(bot.plan_expiry)} · ${daysLeft} days remaining` : 'EXPIRED'}
                  </p>
                ) : <p className="text-xs text-gray-400 mt-0.5">Never expires (free plan)</p>}
              </div>
              {bot.plan_expiry && (
                <div className={`text-center px-4 py-2 rounded-xl ${daysLeft > 0 ? 'bg-emerald-50' : 'bg-rose-50'}`}>
                  <p className={`text-2xl font-bold ${daysLeft > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{Math.max(0, daysLeft)}</p>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">days</p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2.5">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Actions</p>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => updateBotMutation.mutate({ id: botId, data: { is_active: !isActive } })}
                disabled={updateBotMutation.isPending}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl font-bold text-sm border transition-all active:scale-[0.98] disabled:opacity-50 ${isActive ? 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100' : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'}`}>
                {updateBotMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Power className="w-4 h-4" />}
                {isActive ? 'Deactivate' : 'Activate'}
              </button>
              <button onClick={() => onSwitch(botId)}
                className="flex items-center justify-center gap-2 p-3 rounded-xl font-bold text-sm bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 transition-all active:scale-[0.98]">
                <ExternalLink className="w-4 h-4" /> Manage Bot
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab: AI Settings */}
      {detailTab === 'ai' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center"><Brain className="w-5 h-5" /></div>
            <div><h3 className="text-sm font-bold text-gray-900">AI Agent Settings</h3><p className="text-[10px] text-gray-500">Configure the AI agent for this bot</p></div>
          </div>

          <label className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
            <div><p className="text-sm font-bold text-gray-900">AI Enabled</p><p className="text-[10px] text-gray-400">Let AI handle customer queries</p></div>
            <button onClick={() => updateAiMutation.mutate({ botId, data: { enabled: !aiEnabled } })}
              className={`w-11 h-6 rounded-full transition-colors relative ${aiEnabled ? 'bg-indigo-600' : 'bg-gray-300'}`}>
              <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all shadow-sm ${aiEnabled ? 'left-5.5' : 'left-0.5'}`} />
            </button>
          </label>

          <div>
            <label className="text-xs font-bold text-gray-500 mb-1.5 block">API Key</label>
            {showAiApiKeyInput ? (
              <input type="password" value={aiApiKey} onChange={e => setAiApiKey(e.target.value)}
                placeholder="sk-... or AIza... or sk-or-..."
                className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-500 mb-2" autoFocus />
            ) : (
              <div className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-100 mb-2">
                <span className="text-sm font-mono text-gray-700 truncate">
                  {aiApiKey ? (
                    <span>{aiApiKey.substring(0, 4)}<span className="text-gray-300">{'•'.repeat(Math.min(aiApiKey.length - 4, 20))}</span></span>
                  ) : (
                    <span className="text-gray-400 italic">No API key set</span>
                  )}
                </span>
                <button onClick={() => setShowAiApiKeyInput(true)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-purple-600 hover:bg-purple-50 transition-all text-xs font-semibold">
                  Edit
                </button>
              </div>
            )}
            {showAiApiKeyInput && (
              <div className="flex gap-2 mb-2">
                <button onClick={() => { setShowAiApiKeyInput(false); setAiApiKey(aiSettings?.api_key || ''); }}
                  className="px-3 py-1.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-all text-xs">
                  Cancel
                </button>
                <button onClick={() => { setShowAiApiKeyInput(false); updateAiMutation.mutate({ botId, data: { api_key: aiApiKey } }); }}
                  disabled={updateAiMutation.isPending || !aiApiKey.trim()}
                  className="px-3 py-1.5 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 transition-all disabled:opacity-50 text-xs">
                  Save Key
                </button>
              </div>
            )}
          </div>

          <div>
            <p className="text-xs font-bold text-gray-500 mb-1.5">System Prompt</p>
            <textarea value={aiPrompt} onChange={e => setAiPrompt(e.target.value)}
              rows={6}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-500 resize-none font-medium"
              placeholder="Enter AI system prompt..." />
            <button onClick={() => updateAiMutation.mutate({ botId, data: { system_prompt: aiPrompt, prompt: aiPrompt } })}
              disabled={updateAiMutation.isPending}
              className="mt-2 px-4 py-2 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 transition-all text-xs disabled:opacity-50 flex items-center gap-1.5">
              {updateAiMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              Save Prompt
            </button>
          </div>

          <div>
            <p className="text-xs font-bold text-gray-500 mb-1.5">Website System Prompt</p>
            <textarea value={aiWebsiteContext} onChange={e => setAiWebsiteContext(e.target.value)}
              rows={6}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-500 resize-none font-medium"
              placeholder="Enter website AI system prompt..." />
            <button onClick={() => updateAiMutation.mutate({ botId, data: { website_system_context: aiWebsiteContext } })}
              disabled={updateAiMutation.isPending}
              className="mt-2 px-4 py-2 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 transition-all text-xs disabled:opacity-50 flex items-center gap-1.5">
              {updateAiMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              Save Website Prompt
            </button>
          </div>
        </div>
      )}

      {/* Tab: Content Editor */}
      {detailTab === 'content' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center"><FileText className="w-5 h-5" /></div>
            <div><h3 className="text-sm font-bold text-gray-900">Content Blocks</h3><p className="text-[10px] text-gray-500">Edit website link and content blocks</p></div>
          </div>

          {/* Website link */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2"><Globe className="w-4 h-4 text-blue-500" /><span className="text-sm font-bold text-gray-900">Website Link</span></div>
              <button onClick={() => {
                const newVal = !websiteEnabled;
                setWebsiteEnabled(newVal);
                if (!newVal) updateContentMutation.mutate({ key: 'website_link', data: { url: websiteUrl, enabled: false } });
              }} className={`w-11 h-6 rounded-full transition-colors relative ${websiteEnabled ? 'bg-emerald-500' : 'bg-gray-300'}`}>
                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all shadow-sm ${websiteEnabled ? 'left-5.5' : 'left-0.5'}`} />
              </button>
            </div>
            {websiteEnabled && (
              <div className="flex gap-2">
                <input type="url" value={websiteUrl} onChange={e => setWebsiteUrl(e.target.value)}
                  className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="https://..." />
                <button onClick={() => updateContentMutation.mutate({ key: 'website_link', data: { url: websiteUrl, enabled: true } })}
                  disabled={updateContentMutation.isPending}
                  className="px-3 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-all text-xs disabled:opacity-50">
                  Save
                </button>
              </div>
            )}
            {!websiteEnabled && <p className="text-xs text-gray-400 text-center py-2">Website button is hidden</p>}
          </div>

          {/* Other content blocks */}
          {contentBlocks?.filter(b => b.key !== 'website_link' && b.key !== 'shop_settings').slice(0, 5).map(block => (
            <div key={block.key} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
              <p className="text-xs font-bold text-gray-900 capitalize mb-1">{block.key.replace(/_/g, ' ')}</p>
              <p className="text-[11px] text-gray-500 truncate">{block.content_data ? JSON.stringify(block.content_data).slice(0, 80) : 'No content'}</p>
            </div>
          ))}

          {(!contentBlocks || contentBlocks.length === 0) && (
            <div className="text-center py-6 text-xs text-gray-400">No content blocks available</div>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  PLANS TAB
// ═══════════════════════════════════════════════════════════════
function PlansTab({ planPayments, allBots }) {
  const { addToast } = useToastStore();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newPayment, setNewPayment] = useState({ bot_id: '', plan: 'basic', amount: '', notes: '' });

  const createMutation = useMutation({
    mutationFn: (data) => createPlanPayment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plan-payments'] });
      setShowCreate(false); setNewPayment({ bot_id: '', plan: 'basic', amount: '', notes: '' });
      addAdminActivity('create_payment', 'Created plan payment');
      addToast('Plan payment created');
    },
    onError: (err) => addToast(err.response?.data?.detail || 'Failed to create payment', 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => deletePlanPayment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plan-payments'] });
      addToast('Payment record deleted');
    },
  });

  const planTotals = useMemo(() => {
    if (!planPayments) return {};
    const totals = {};
    planPayments.forEach(p => { const plan = (p.plan || 'free').toLowerCase(); totals[plan] = (totals[plan] || 0) + Number(p.amount || 0); });
    return totals;
  }, [planPayments]);
  const totalCollected = planPayments?.reduce((s, p) => s + Number(p.amount || 0), 0) || 0;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {PLANS.filter(p => p.key !== 'free').map(p => (
          <div key={p.key} className={`bg-white rounded-xl border ${p.border} p-4 shadow-sm`}>
            <div className={`w-8 h-8 rounded-lg ${p.bg} ${p.color} flex items-center justify-center mb-2`}>{React.createElement(p.icon, { className: 'w-4 h-4' })}</div>
            <p className="text-sm font-bold text-gray-900">{p.name}</p>
            <p className="text-lg font-bold mt-0.5">{formatPrice(planTotals[p.key] || 0, 'MMK')}</p>
          </div>
        ))}
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center mb-2"><DollarSign className="w-4 h-4" /></div>
          <p className="text-sm font-bold text-gray-900">Total Collected</p>
          <p className="text-lg font-bold mt-0.5">{formatPrice(totalCollected, 'MMK')}</p>
        </div>
      </div>

      <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center"><CreditCard className="w-5 h-5" /></div>
            <div><h3 className="text-lg font-bold text-gray-900">Plan Payments</h3><p className="text-xs text-gray-500">{planPayments?.length || 0} records</p></div>
          </div>
          <button onClick={() => setShowCreate(!showCreate)}
            className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all text-xs active:scale-95">
            <Plus className="w-3.5 h-3.5" /> Add Payment
          </button>
        </div>
        {showCreate && (
          <div className="p-5 bg-indigo-50 border-b border-indigo-100">
            <h4 className="text-sm font-bold text-indigo-900 mb-3">New Plan Payment</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Bot</label>
                <select value={newPayment.bot_id} onChange={e => setNewPayment(p => ({ ...p, bot_id: e.target.value }))}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">Select...</option>{allBots?.map(b => <option key={b.id} value={b.id}>{b.bot_username || `Bot #${b.id}`}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Plan</label>
                <select value={newPayment.plan} onChange={e => setNewPayment(p => ({ ...p, plan: e.target.value }))}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500">
                  {PLANS.filter(p => p.key !== 'free').map(p => <option key={p.key} value={p.key}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Amount</label>
                <input type="number" value={newPayment.amount} onChange={e => setNewPayment(p => ({ ...p, amount: e.target.value }))}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Notes</label>
                <input type="text" value={newPayment.notes} onChange={e => setNewPayment(p => ({ ...p, notes: e.target.value }))}
                  placeholder="Optional" className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div className="flex items-end gap-2">
                <button onClick={() => createMutation.mutate(newPayment)} disabled={!newPayment.bot_id || !newPayment.amount || createMutation.isPending}
                  className="flex-1 px-3 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 text-sm disabled:opacity-50 active:scale-95 flex items-center justify-center gap-1.5">
                  {createMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />} Create
                </button>
                <button onClick={() => setShowCreate(false)} className="px-3 py-2 bg-white border border-gray-200 text-gray-500 font-bold rounded-xl hover:bg-gray-50 text-sm">Cancel</button>
              </div>
            </div>
          </div>
        )}
        {!planPayments || planPayments.length === 0 ? (
          <div className="p-12 text-center"><CreditCard className="w-12 h-12 text-gray-200 mx-auto mb-3" /><p className="text-gray-500 font-medium">No payment records</p></div>
        ) : (
          <div className="divide-y divide-gray-50 max-h-[500px] overflow-y-auto">
            {planPayments.map(p => (
              <div key={p.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${getPlanStyle(p.plan).bg} ${getPlanStyle(p.plan).color}`}>
                  {React.createElement(getPlanStyle(p.plan).icon, { className: 'w-4 h-4' })}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900">{p.bot_username || `Bot #${p.bot_id}`}</p>
                  <p className="text-[11px] text-gray-500">{getPlanStyle(p.plan).name}{p.notes ? ` · ${p.notes}` : ''}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-gray-900">{formatPrice(p.amount || 0, 'MMK')}</p>
                  <p className="text-[10px] text-gray-400">{safeFormat(p.created_at, 'MMM d, yyyy')}</p>
                </div>
                <button onClick={() => { if (confirm('Delete?')) deleteMutation.mutate(p.id); }}
                  className="p-1.5 text-gray-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  MESSAGES TAB (Superadmin Send Message)
