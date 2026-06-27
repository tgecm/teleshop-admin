import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getQRMenuStats } from '../api/qrMenu';
import { useSelectedBot } from '../hooks/useSelectedBot';
import StatCard from '../components/shared/StatCard';
import LoadingSkeleton from '../components/shared/LoadingSkeleton';
import {
  DollarSign, ShoppingBag, Users, Clock, TrendingUp, Activity, Zap,
  BarChart3, PieChart as PieChartIcon, Calendar, Utensils, Trophy, Sparkles,
} from 'lucide-react';
import { motion } from 'motion/react';
import { parseISO, differenceInDays, subDays, addDays } from 'date-fns';
const ChartRenderer = React.lazy(() => import('../components/dashboard/ChartRenderer'));
import { myanmarFormat } from '../utils/date';

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', damping: 22, stiffness: 200 } },
};

const METRIC_CONFIG = {
  revenue: { label: 'Revenue', color: '#4f46e5', gradient: 'revGrad' },
  orders: { label: 'Orders', color: '#34d399', gradient: 'ordGrad' },
};

function MiniMetric({ icon: Icon, label, value, sub, color = 'indigo' }) {
  const colors = {
    indigo: 'text-indigo-600 bg-indigo-50', emerald: 'text-emerald-600 bg-emerald-50',
    amber: 'text-amber-600 bg-amber-50', rose: 'text-rose-600 bg-rose-50',
    purple: 'text-purple-600 bg-purple-50',
  };
  return (
    <motion.div variants={itemVariants} className="bg-white rounded-xl md:rounded-2xl border border-gray-100 p-3 sm:p-4 md:p-5 shadow-sm">
      <div className="flex items-center gap-2.5 mb-2 md:mb-3">
        <div className={`w-6 h-6 md:w-8 md:h-8 rounded-lg md:rounded-xl ${colors[color]} flex items-center justify-center`}>
          <Icon className="w-3 h-3 md:w-3.5 md:h-3.5" />
        </div>
        <span className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-wider break-words">{label}</span>
      </div>
      <p className="text-sm sm:text-base md:text-lg font-bold text-gray-900 leading-tight break-words">{value}</p>
      {sub && <p className="text-[10px] md:text-xs text-gray-400 mt-0.5 break-words">{sub}</p>}
    </motion.div>
  );
}

export default function QRMenuDashboard() {
  const { selectedBotId } = useSelectedBot();

  const [chartType, setChartType] = useState('line');
  const [visibleMetrics, setVisibleMetrics] = useState({ revenue: true, orders: true });
  const [datePreset, setDatePreset] = useState('30');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const toggleMetric = (key) => {
    setVisibleMetrics((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const effectiveDays = useMemo(() => {
    if (datePreset !== 'custom') return Number(datePreset);
    if (customStart && customEnd) return differenceInDays(parseISO(customEnd), parseISO(customStart)) + 1;
    return 30;
  }, [datePreset, customStart, customEnd]);

  const queryParams = useMemo(() => {
    const p = { bot_id: Number(selectedBotId) };
    if (datePreset === 'custom' && customStart && customEnd) {
      p.start_date = customStart;
      p.end_date = customEnd;
    } else {
      p.days = effectiveDays;
    }
    return p;
  }, [selectedBotId, datePreset, customStart, customEnd, effectiveDays]);

  const { data: stats, isLoading } = useQuery({
    queryKey: ['qr-menu-stats', selectedBotId, datePreset, customStart, customEnd],
    queryFn: () => getQRMenuStats(queryParams),
    enabled: !!selectedBotId,
    placeholderData: (prev) => prev,
  });

  const totalRevenue = stats?.total_revenue || 0;
  const totalOrders = stats?.total_orders || 0;
  const pendingOrders = stats?.pending_orders || 0;
  const todayRevenue = stats?.today_revenue || 0;
  const monthlyRevenue = stats?.monthly_revenue || 0;
  const itemsSold = stats?.items_sold || 0;
  const ordersByDay = stats?.orders_by_day || [];
  const topItems = stats?.top_items || [];

  const mergedChartData = useMemo(() => {
    if (!ordersByDay.length) return [];
    const dataMap = new Map(ordersByDay.map((d) => [d.day, d]));
    const days = datePreset === 'custom' && customStart && customEnd
      ? differenceInDays(parseISO(customEnd), parseISO(customStart)) + 1
      : effectiveDays;
    const endDate = datePreset === 'custom' && customEnd ? parseISO(customEnd) : new Date();
    const startDate = subDays(endDate, days - 1);
    const result = [];
    for (let d = startDate; d <= endDate; d = addDays(d, 1)) {
      const key = myanmarFormat(d, 'yyyy-MM-dd');
      const entry = dataMap.get(key);
      result.push({
        day: key,
        revenue: entry ? Number(entry.revenue) : 0,
        count: entry ? entry.count : 0,
      });
    }
    return result;
  }, [ordersByDay, datePreset, customStart, customEnd, effectiveDays]);

  const pieData = useMemo(() => {
    return (topItems || []).map((p) => ({ name: p.name, value: Number(p.total_revenue) || 0 }));
  }, [topItems]);

  const topItemsWithPct = useMemo(() => {
    if (!topItems?.length) return [];
    const maxRevenue = Math.max(...topItems.map((p) => Number(p.total_revenue) || 0));
    return topItems.map((p) => ({
      ...p,
      pct: maxRevenue > 0 ? (Number(p.total_revenue) / maxRevenue) * 100 : 0,
      share: totalRevenue > 0 ? ((Number(p.total_revenue) / totalRevenue) * 100).toFixed(1) : '0',
    }));
  }, [topItems, totalRevenue]);

  if (!selectedBotId) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center p-6">
        <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
          <Utensils className="w-10 h-10 text-indigo-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">No Bot Selected</h2>
        <p className="text-gray-500 mt-2 max-w-xs">Please select a bot to view QR Menu dashboard.</p>
      </div>
    );
  }

  return (
    <motion.div className="space-y-4 sm:space-y-6 lg:space-y-8" variants={containerVariants} initial="hidden" animate="show">
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-2xl lg:text-3xl font-bold text-gray-900">QR Dashboard</h1>
          <p className="text-gray-500 text-[11px] sm:text-sm lg:text-base mt-0.5 hidden sm:block">QR Menu performance metrics.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-white p-0.5 rounded-xl shadow-sm border border-gray-100">
            {['7', '30', '90', '365'].map((d) => (
              <button key={d} onClick={() => setDatePreset(d)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all active:scale-95 ${datePreset === d ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' : 'text-gray-500 hover:bg-gray-50'}`}>
                {d}d
              </button>
            ))}
            <button onClick={() => setDatePreset('custom')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1 ${datePreset === 'custom' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' : 'text-gray-500 hover:bg-gray-50'}`}>
              <Calendar className="w-3 h-3" />
            </button>
          </div>
        </div>
      </motion.div>

      {datePreset === 'custom' && (
        <motion.div variants={itemVariants} className="flex items-center gap-3 bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
          <label className="text-xs font-medium text-gray-500">From:</label>
          <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-indigo-500" />
          <label className="text-xs font-medium text-gray-500">To:</label>
          <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-indigo-500" />
        </motion.div>
      )}

      <motion.div variants={containerVariants} className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 md:gap-6 lg:gap-8">
        {isLoading
          ? Array(3).fill(0).map((_, i) => (<motion.div key={i} variants={itemVariants}><LoadingSkeleton className="h-28 md:h-32" /></motion.div>))
          : [
              { title: 'QR Revenue', value: `${totalRevenue.toLocaleString()} MMK`, icon: DollarSign, color: 'indigo' },
              { title: 'QR Orders', value: totalOrders, icon: ShoppingBag, color: 'emerald' },
              { title: 'Pending QR', value: pendingOrders, icon: Clock, color: 'amber' },
            ].map((card) => (
              <motion.div key={card.title} variants={itemVariants}><StatCard {...card} /></motion.div>
            ))}
      </motion.div>

      <motion.div variants={containerVariants} className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4 md:gap-6 lg:gap-8">
        <MiniMetric icon={ShoppingBag} label="Items Sold" value={itemsSold} color="indigo" />
        <MiniMetric icon={Zap} label="Today's Revenue" value={`${todayRevenue.toLocaleString()} MMK`} color="emerald" />
        <MiniMetric icon={TrendingUp} label="Monthly Revenue" value={`${monthlyRevenue.toLocaleString()} MMK`} sub={`${totalRevenue.toLocaleString()} MMK total`} color="amber" />
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
        <motion.div variants={itemVariants} className="lg:col-span-2 bg-white p-4 sm:p-6 lg:p-8 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 lg:mb-6">
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-lg lg:text-xl font-bold text-gray-900">Sales</h3>
              <div className="flex bg-gray-100 p-0.5 rounded-lg">
                {[
                  { key: 'bar', icon: BarChart3 },
                  { key: 'line', icon: Activity },
                  { key: 'pie', icon: PieChartIcon },
                ].map(({ key, icon: Icon }) => (
                  <button key={key} onClick={() => setChartType(key)}
                    className={`p-1.5 md:p-2 rounded-md transition-all ${chartType === key ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>
                    <Icon className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {Object.entries(METRIC_CONFIG).map(([key, cfg]) => (
                <button key={key} onClick={() => toggleMetric(key)}
                  className={`px-2.5 py-1 md:px-3 md:py-1.5 text-[10px] md:text-xs font-bold rounded-lg border transition-all ${
                    visibleMetrics[key]
                      ? 'bg-white text-gray-800 border-gray-200 shadow-sm'
                      : 'bg-gray-50 text-gray-300 border-transparent'
                  }`}>
                  <span className="inline-block w-1.5 h-1.5 rounded-full mr-1" style={{ backgroundColor: cfg.color }} />
                  {cfg.label}
                </button>
              ))}
              {chartType === 'pie' && (
                <span className="px-2.5 py-1 text-[10px] font-bold rounded-lg border border-gray-200 bg-white text-gray-500">
                  Top 10 Items
                </span>
              )}
            </div>
          </div>
          <ChartRenderer
            chartType={chartType}
            visibleMetrics={visibleMetrics}
            mergedChartData={mergedChartData}
            pieData={pieData}
            chartLoading={isLoading}
          />
        </motion.div>

        <motion.div variants={itemVariants} className="bg-white pt-5 pb-2 px-5 lg:pt-6 lg:px-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-sm sm:text-lg font-bold text-gray-900 flex items-center gap-2 mb-5">
            <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />
            Popular Items
          </h3>
          <div className="space-y-1">
            {isLoading
              ? Array(5).fill(0).map((_, i) => <LoadingSkeleton key={i} className="h-16" />)
              : topItemsWithPct.length
                ? topItemsWithPct.map((item, index) => (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.08, type: 'spring', damping: 22 }}
                      key={index} className="group">
                      <div className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition-colors">
                        <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center font-bold text-xs sm:text-sm flex-shrink-0 ${
                          index === 0 ? 'bg-amber-100 text-amber-600' : index === 1 ? 'bg-slate-100 text-slate-600' : index === 2 ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-gray-900 truncate leading-tight">{item.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[11px] text-gray-500 font-medium">{item.order_count} orders</span>
                            <span className="text-[10px] text-gray-300">·</span>
                            <span className="text-[11px] text-indigo-600 font-semibold">{item.share}%</span>
                          </div>
                          <div className="mt-1.5 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <motion.div initial={{ width: 0 }} animate={{ width: `${Math.max(item.pct, 2)}%` }}
                              transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 + index * 0.08 }}
                              className={`h-full rounded-full ${index === 0 ? 'bg-amber-400' : index === 1 ? 'bg-slate-400' : index === 2 ? 'bg-orange-400' : 'bg-gray-300'}`} />
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0 ml-1">
                          <p className="text-xs sm:text-sm font-bold text-gray-900 leading-tight">{item.total_revenue?.toLocaleString()}</p>
                          <p className="text-[9px] sm:text-[10px] text-gray-400 font-medium">MMK</p>
                        </div>
                      </div>
                    </motion.div>
                  ))
                : !isLoading && (
                    <div className="text-center py-8">
                      <Sparkles className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                      <p className="text-sm text-gray-400">No items sold yet</p>
                    </div>
                  )}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
