import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAllBots } from '../api/superadmin';
import { getStats, getOrdersByDay } from '../api/stats';
import LoadingSkeleton from '../components/shared/LoadingSkeleton';
import {
  TrendingUp, TrendingDown, Trophy, Bot, Users, ShoppingBag,
  DollarSign, Crown, Star, Zap, AlertTriangle, CheckCircle2,
  Clock, Activity, ArrowUp, ArrowDown, BarChart3, Target,
} from 'lucide-react';
import { differenceInDays } from 'date-fns';

// Rank medals
const MEDALS = ['🥇', '🥈', '🥉'];

function useBotStats(botIds) {
  const queries = useMemo(() => {
    if (!botIds?.length) return [];
    return botIds.map(botId => ({
      queryKey: ['superadmin', 'bot-benchmark', botId],
      queryFn: () => getStats({ bot_id: Number(botId) }),
    }));
  }, [botIds]);

  const results = {};
  // We can't dynamically call useQuery in a loop, so fetch all bots' stats
  // via a single endpoint or use the existing data
  return {};
}

export default function SuperadminBenchmarks() {
  const { data: allBots, isLoading } = useQuery({
    queryKey: ['superadmin', 'all-bots'],
    queryFn: getAllBots,
  });

  // Fetch stats for each bot (limited approach - fetch first batch)
  const botIdsForStats = useMemo(() => {
    return allBots?.slice(0, 20).map(b => b.id) || [];
  }, [allBots]);

  // Use the global stats for aggregate
  const { data: globalStats } = useQuery({
    queryKey: ['superadmin', 'global-stats'],
    queryFn: () => getStats({ bot_id: null }),
  });

  // Compute benchmarks from available data
  const benchmarks = useMemo(() => {
    if (!allBots) return null;

    const active = allBots.filter(b => b.is_active !== false);
    const inactive = allBots.filter(b => b.is_active === false);
    const expired = allBots.filter(b =>
      b.is_active !== false &&
      b.plan_expiry &&
      differenceInDays(new Date(b.plan_expiry), new Date()) <= 0
    );
    const expiringSoon = allBots.filter(b =>
      b.is_active !== false &&
      b.plan_expiry &&
      differenceInDays(new Date(b.plan_expiry), new Date()) > 0 &&
      differenceInDays(new Date(b.plan_expiry), new Date()) <= 7
    );

    // Plan distribution
    const byPlan = {};
    allBots.forEach(b => {
      const p = (b.plan_name || 'free').toLowerCase();
      byPlan[p] = (byPlan[p] || 0) + 1;
    });

    // Bot rankings (by revenue potential using plan as proxy)
    const ranked = [...allBots].sort((a, b) => {
      const planOrder = { business: 5, pro: 4, standard: 3, basic: 2, free: 1 };
      return (planOrder[b.plan_name?.toLowerCase()] || 0) - (planOrder[a.plan_name?.toLowerCase()] || 0);
    });

    return {
      total: allBots.length,
      active: active.length,
      inactive: inactive.length,
      expired: expired.length,
      expiringSoon: expiringSoon.length,
      byPlan,
      rankedBots: ranked.slice(0, 10),
      healthScore: active.length > 0 ? Math.round((active.length - expired.length - expiringSoon.length * 0.5) / allBots.length * 100) : 0,
    };
  }, [allBots]);

  if (isLoading) return <LoadingSkeleton className="h-96" />;

  if (!benchmarks) return null;

  return (
    <div className="space-y-5">
      {/* Health Score */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
              benchmarks.healthScore >= 80 ? 'bg-emerald-50' : benchmarks.healthScore >= 50 ? 'bg-amber-50' : 'bg-rose-50'
            }`}>
              <Activity className={`w-6 h-6 ${
                benchmarks.healthScore >= 80 ? 'text-emerald-600' : benchmarks.healthScore >= 50 ? 'text-amber-600' : 'text-rose-600'
              }`} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Platform Health</h3>
              <p className="text-xs text-gray-500">Overall bot ecosystem status</p>
            </div>
          </div>
          <div className="text-right">
            <p className={`text-3xl font-bold ${
              benchmarks.healthScore >= 80 ? 'text-emerald-600' : benchmarks.healthScore >= 50 ? 'text-amber-600' : 'text-rose-600'
            }`}>{benchmarks.healthScore}%</p>
            <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Health Score</p>
          </div>
        </div>
      </div>

      {/* Quick status grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Bots', value: benchmarks.total, icon: Bot, color: 'indigo', sub: `${benchmarks.active} active` },
          { label: 'Active', value: benchmarks.active, icon: CheckCircle2, color: 'emerald', sub: `${benchmarks.inactive} inactive` },
          { label: 'Expired', value: benchmarks.expired, icon: AlertTriangle, color: 'rose', sub: 'plan expired' },
          { label: 'Expiring ≤7d', value: benchmarks.expiringSoon, icon: Clock, color: 'amber', sub: 'needs renewal' },
        ].map((s, i) => {
          const colors = { indigo: 'bg-indigo-50 text-indigo-600', emerald: 'bg-emerald-50 text-emerald-600', rose: 'bg-rose-50 text-rose-600', amber: 'bg-amber-50 text-amber-600' };
          return (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-3.5 shadow-sm">
              <div className="flex items-center gap-2 mb-1.5">
                <div className={`w-7 h-7 rounded-lg ${colors[s.color]} flex items-center justify-center`}>
                  <s.icon className="w-3.5 h-3.5" />
                </div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{s.label}</span>
              </div>
              <p className="text-xl font-bold text-gray-900">{s.value}</p>
              <p className="text-[10px] text-gray-400">{s.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Plan distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-indigo-500" />
            Plan Distribution
          </h3>
          <div className="space-y-3">
            {Object.entries(benchmarks.byPlan).map(([plan, count]) => {
              const pct = benchmarks.total > 0 ? (count / benchmarks.total) * 100 : 0;
              const planStyle = {
                free: { label: 'Free', color: '#9ca3af', bg: 'bg-gray-100' },
                basic: { label: 'Basic', color: '#3b82f6', bg: 'bg-blue-100' },
                standard: { label: 'Standard', color: '#10b981', bg: 'bg-emerald-100' },
                pro: { label: 'Pro', color: '#8b5cf6', bg: 'bg-purple-100' },
                business: { label: 'Business', color: '#f59e0b', bg: 'bg-amber-100' },
              }[plan] || { label: plan, color: '#6b7280', bg: 'bg-gray-100' };
              return (
                <div key={plan} className="flex items-center gap-3">
                  <span className="w-16 text-xs font-bold text-gray-600">{planStyle.label}</span>
                  <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700 flex items-center justify-end px-2"
                      style={{ width: `${pct}%`, backgroundColor: planStyle.color, minWidth: count > 0 ? '20px' : '0' }}>
                      {pct >= 15 && <span className="text-[9px] font-bold text-white">{Math.round(pct)}%</span>}
                    </div>
                  </div>
                  <span className="w-8 text-xs font-bold text-gray-900 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bot ranking */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-500" />
            Bot Rankings
          </h3>
          <div className="space-y-2">
            {benchmarks.rankedBots.map((b, i) => {
              const planColors = {
                free: 'text-gray-500', basic: 'text-blue-600', standard: 'text-emerald-600',
                pro: 'text-purple-600', business: 'text-amber-600',
              };
              return (
                <div key={b.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 transition-colors">
                  <span className="w-6 text-center font-bold text-sm">
                    {i < 3 ? MEDALS[i] : `#${i + 1}`}
                  </span>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                    i === 0 ? 'bg-amber-100 text-amber-600' :
                    i === 1 ? 'bg-slate-100 text-slate-600' :
                    i === 2 ? 'bg-orange-100 text-orange-600' :
                    'bg-gray-100 text-gray-500'
                  }`}>
                    {b.bot_username?.[0]?.toUpperCase() || 'B'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">{b.bot_full_name || b.bot_username || `Bot #${b.id}`}</p>
                    <p className="text-[10px] text-gray-400">@{b.bot_username || 'no_username'}</p>
                  </div>
                  <span className={`text-xs font-bold ${planColors[b.plan_name?.toLowerCase()] || 'text-gray-500'}`}>
                    {(b.plan_name || 'Free')}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Status indicators */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <Target className="w-4 h-4 text-indigo-500" />
            All Bots Status Overview
          </h3>
        </div>
        <div className="divide-y divide-gray-50 max-h-[400px] overflow-y-auto">
          {allBots.map(b => {
            const isActive = b.is_active !== false;
            const daysLeft = b.plan_expiry ? differenceInDays(new Date(b.plan_expiry), new Date()) : null;
            const isExpired = daysLeft !== null && daysLeft <= 0;
            const isExpiring = daysLeft !== null && daysLeft > 0 && daysLeft <= 7;

            let statusColor = 'bg-emerald-500'; // healthy
            let statusLabel = 'Healthy';
            if (!isActive) { statusColor = 'bg-gray-300'; statusLabel = 'Inactive'; }
            else if (isExpired) { statusColor = 'bg-rose-500'; statusLabel = 'Expired'; }
            else if (isExpiring) { statusColor = 'bg-amber-500'; statusLabel = `Expiring (${daysLeft}d)`; }

            return (
              <div key={b.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${statusColor}`} title={statusLabel} />
                <div className="w-8 h-8 rounded-lg bg-gray-100 text-gray-600 flex items-center justify-center font-bold text-xs flex-shrink-0">
                  {b.bot_username?.[0]?.toUpperCase() || 'B'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 truncate">{b.bot_full_name || b.bot_username || `Bot #${b.id}`}</p>
                  <p className="text-[10px] text-gray-400">@{b.bot_username || 'no_username'}</p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                  statusLabel === 'Healthy' ? 'bg-emerald-50 text-emerald-600' :
                  statusLabel === 'Inactive' ? 'bg-gray-100 text-gray-500' :
                  statusLabel === 'Expired' ? 'bg-rose-50 text-rose-600' :
                  'bg-amber-50 text-amber-600'
                }`}>{statusLabel}</span>
                <span className={`text-[10px] font-bold ${
                  b.plan_name?.toLowerCase() === 'free' ? 'text-gray-400' :
                  b.plan_name?.toLowerCase() === 'basic' ? 'text-blue-500' :
                  b.plan_name?.toLowerCase() === 'standard' ? 'text-emerald-500' :
                  b.plan_name?.toLowerCase() === 'pro' ? 'text-purple-500' :
                  'text-amber-500'
                }`}>{b.plan_name || 'Free'}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
