import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getStats, getOrdersByDay, getTopProducts, getUsersByDay } from '../api/stats';
import { getImageUrl, getProducts } from '../api/products';
import { getOrders } from '../api/orders';
import { getUsers } from '../api/customers';
import { useSelectedBot } from '../hooks/useSelectedBot';
import StatCard from '../components/shared/StatCard';
import LoadingSkeleton from '../components/shared/LoadingSkeleton';
import {
  DollarSign, ShoppingBag, Users, Clock, TrendingUp, Trophy, Sparkles, Zap, Package,
  BarChart3, PieChart as PieChartIcon, Download, Calendar, ChevronDown, X, Loader2, ArrowLeftRight,
} from 'lucide-react';
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
} from 'recharts';
import { motion } from 'motion/react';
import { parseISO, differenceInDays, subDays, addDays } from 'date-fns';
import { myanmarFormat } from '../utils/date';
import { useToastStore } from '../store/toastStore';
import InstallPrompt from '../components/InstallPrompt';

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', damping: 22, stiffness: 200 } },
};

const CHART_COLORS = ['#4f46e5', '#34d399', '#f43f5e', '#f59e0b', '#8b5cf6', '#06b6d4'];
const METRIC_CONFIG = {
  revenue: { label: 'Revenue', color: '#4f46e5', gradient: 'revGrad' },
  orders: { label: 'Orders', color: '#34d399', gradient: 'ordGrad' },
  users: { label: 'Users', color: '#f43f5e', gradient: 'usersGrad' },
};

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const formatted = (() => {
    try { return myanmarFormat(parseISO(label), 'MMM d, yyyy'); }
    catch { return label; }
  })();
  return (
    <div className="bg-white rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.15)] px-3 py-2 border border-gray-50/50">
      <p className="text-[10px] font-semibold text-gray-400 mb-1">{formatted}</p>
      {payload.map((entry, idx) => (
        <div key={idx} className="flex items-center justify-between gap-2 py-[1px]">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
            <span className="text-[11px] font-medium text-gray-500">{entry.name}</span>
          </div>
          <span className="text-[11px] font-bold text-gray-800 tabular-nums">
            {entry.name === 'Revenue'
              ? `${Number(entry.value).toLocaleString()} MMK`
              : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

function MiniMetric({ icon: Icon, label, value, sub, color = 'indigo', period, onPeriodChange }) {
  const colors = {
    indigo: 'text-indigo-600 bg-indigo-50', emerald: 'text-emerald-600 bg-emerald-50',
    amber: 'text-amber-600 bg-amber-50', rose: 'text-rose-600 bg-rose-50',
    purple: 'text-purple-600 bg-purple-50',
  };
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const periods = ['total', 'daily', 'weekly', 'monthly'];
  const labels = { total: 'Total', daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly' };

  const showDropdown = !!onPeriodChange;

  return (
    <motion.div variants={itemVariants} className="bg-white rounded-xl md:rounded-2xl border border-gray-100 p-3 sm:p-4 md:p-5 shadow-sm relative" ref={ref}>
      <div className="flex items-center gap-2.5 mb-2 md:mb-3">
        <div className={`w-7 h-7 md:w-9 md:h-9 rounded-lg md:rounded-xl ${colors[color]} flex items-center justify-center`}>
          <Icon className="w-3.5 h-3.5 md:w-4 md:h-4" />
        </div>
        <span className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-wider">{label}</span>
        {showDropdown && (
          <div className="relative ml-auto">
            <button onClick={() => setOpen(!open)}
              className="text-[9px] font-bold text-gray-400 bg-gray-100 hover:bg-gray-200 rounded-md px-1.5 py-0.5 flex items-center gap-0.5 transition-all">
              {labels[period] || 'Total'}
              <ChevronDown className="w-2.5 h-2.5" />
            </button>
            {open && (
              <div className="absolute right-0 top-full mt-1 bg-white border border-gray-100 rounded-lg shadow-lg z-50 min-w-[80px]">
                {periods.map((p) => (
                  <button key={p} onClick={() => { onPeriodChange(p); setOpen(false); }}
                    className={`block w-full text-left px-3 py-1.5 text-[10px] font-bold transition-all hover:bg-gray-50 ${period === p ? 'text-indigo-600' : 'text-gray-500'}`}>
                    {labels[p]}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      <p className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 leading-tight">{value}</p>
      {sub && <p className="text-[10px] md:text-xs text-gray-400 mt-0.5">{sub}</p>}
    </motion.div>
  );
}

export default function Dashboard() {
  const { selectedBotId } = useSelectedBot();
  const { addToast } = useToastStore();

  // Chart state
  const [chartType, setChartType] = useState('area');
  const [visibleMetrics, setVisibleMetrics] = useState({ revenue: true, orders: true, users: false });
  const [datePreset, setDatePreset] = useState('30');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [itemsPeriod, setItemsPeriod] = useState('total');
  const [productsPeriod, setProductsPeriod] = useState('total');
  const [showRevenue, setShowRevenue] = useState(true);

  // Products for total stock value
  const { data: allProducts } = useQuery({
    queryKey: ['products', selectedBotId],
    queryFn: () => getProducts({ bot_id: Number(selectedBotId) }),
    enabled: !!selectedBotId,
    select: (data) => {
      const products = Array.isArray(data) ? data : data?.products || data?.data || [];
      const totalValue = products.reduce((sum, p) => {
        const qty = p.stock_quantity;
        if (qty === null || qty === undefined || qty <= 0) return sum;
        return sum + (Number(p.price) || 0) * qty;
      }, 0);
      return { products, totalStockValue: totalValue };
    },
  });
  const totalStockValue = allProducts?.totalStockValue || 0;

  // Tooltip smart positioning
  const chartWrapperRef = useRef(null);
  const [cursorXY, setCursorXY] = useState(null);

  const handleChartPointerMove = useCallback((e) => {
    const el = chartWrapperRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setCursorXY({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }, []);

  const handleChartPointerLeave = useCallback(() => setCursorXY(null), []);

  // Compute tooltip position based on cursor side
  const tooltipPosition = useMemo(() => {
    if (!cursorXY || !chartWrapperRef.current) return undefined;
    const { width } = chartWrapperRef.current.getBoundingClientRect();
    const isRightHalf = cursorXY.x > width / 2;
    return {
      x: isRightHalf ? Math.max(2, cursorXY.x - 180) : cursorXY.x + 15,
      y: Math.max(5, cursorXY.y - 100),
    };
  }, [cursorXY]);

  // Export modal state
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportOpts, setExportOpts] = useState({
    datePreset: '30',
    customStart: '',
    customEnd: '',
    status: '',
    sections: { orders: true, daily: true, products: false, customers: false, stats: false },
    filename: '',
  });
  const [exportLoading, setExportLoading] = useState(false);

  const toggleMetric = (key) => {
    setVisibleMetrics((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Effective period
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

  // Stats query with period filter from date preset
  const statsParams = useMemo(() => {
    const p = { bot_id: Number(selectedBotId) };
    if (datePreset === 'custom' && customStart && customEnd) {
      p.start_date = customStart;
      p.end_date = customEnd;
    } else {
      p.days = effectiveDays;
    }
    return p;
  }, [selectedBotId, datePreset, customStart, customEnd, effectiveDays]);

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['stats', selectedBotId, datePreset, customStart, customEnd],
    queryFn: () => getStats(statsParams),
    enabled: !!selectedBotId,
  });

  // Separate period stats — only fetches items_sold / products_sold by period
  const periodParams = useMemo(() => {
    if (itemsPeriod === 'total' && productsPeriod === 'total') return null;
    const p = { bot_id: Number(selectedBotId) };
    if (itemsPeriod !== 'total') p.items_period = itemsPeriod;
    if (productsPeriod !== 'total') p.products_period = productsPeriod;
    return p;
  }, [selectedBotId, itemsPeriod, productsPeriod]);
  const { data: periodStats } = useQuery({
    queryKey: ['stats', 'period', periodParams],
    queryFn: () => getStats(periodParams),
    enabled: !!periodParams,
    placeholderData: { items_sold: stats?.items_sold || 0, products_sold: stats?.products_sold || 0 },
  });

  const { data: chartData, isLoading: chartLoading } = useQuery({
    queryKey: ['stats', 'orders-by-day', queryParams],
    queryFn: () => getOrdersByDay(queryParams),
    enabled: !!selectedBotId,
  });

  const { data: usersByDay } = useQuery({
    queryKey: ['stats', 'users-by-day', queryParams],
    queryFn: () => getUsersByDay(queryParams),
    enabled: !!selectedBotId && visibleMetrics.users,
    placeholderData: [],
  });

  const { data: topProducts, isLoading: productsLoading } = useQuery({
    queryKey: ['stats', 'top-products', selectedBotId],
    queryFn: () => getTopProducts({ bot_id: Number(selectedBotId), limit: 10 }),
    enabled: !!selectedBotId,
  });


  // Aggregates
  const totalRevenue = stats?.total_revenue || 0;
  const totalOrders = stats?.total_orders || 0;
  const totalUsers = stats?.total_users || 0;
  const pendingOrders = stats?.pending_orders || 0;
  const effectiveItemsSold = periodStats?.items_sold ?? stats?.items_sold ?? 0;
  const todayRevenue = stats?.today_revenue || 0;
  const monthlyRevenue = stats?.monthly_revenue || 0;
  const effectiveProductsSold = periodStats?.products_sold ?? stats?.products_sold ?? 0;
  const itemsSold = effectiveItemsSold;
  const productsSold = effectiveProductsSold;

  // Top products with percentages
  const topProductsWithPct = useMemo(() => {
    if (!topProducts?.length) return [];
    const maxRevenue = Math.max(...topProducts.map((p) => Number(p.total_revenue) || 0));
    return topProducts.map((p) => ({
      ...p,
      pct: maxRevenue > 0 ? (Number(p.total_revenue) / maxRevenue) * 100 : 0,
      share: totalRevenue > 0 ? ((Number(p.total_revenue) / totalRevenue) * 100).toFixed(1) : '0',
    }));
  }, [topProducts, totalRevenue]);

  // Merge chart data with users and fill missing dates
  const mergedChartData = useMemo(() => {
    const base = chartData || [];
    if (!base.length) return [];
    const usersMap = usersByDay ? new Map(usersByDay.map((u) => [u.day, u.count])) : new Map();
    const dataMap = new Map(base.map((d) => [d.day, d]));
    // Generate continuous date range
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
        users: usersMap.get(key) || 0,
      });
    }
    return result;
  }, [chartData, usersByDay, datePreset, customStart, customEnd, effectiveDays]);

  // Pie chart data
  const pieData = useMemo(() => {
    return (topProducts || []).map((p) => ({ name: p.name, value: Number(p.total_revenue) || 0 }));
  }, [topProducts]);

  // Quick stats
  const quickStats = useMemo(() => {
    if (!mergedChartData?.length) return null;
    const revenues = mergedChartData.map((d) => Number(d.revenue) || 0);
    const totalRev = revenues.reduce((a, b) => a + b, 0);
    const avgDaily = totalRev / revenues.length;
    const maxRev = Math.max(...revenues);
    const bestDay = mergedChartData.find((d) => Number(d.revenue) === maxRev)?.day;
    // Compare equal-sized first vs second half
    const halfSize = Math.floor(revenues.length / 2);
    const firstHalf = halfSize > 0 ? revenues.slice(0, halfSize).reduce((a, b) => a + b, 0) : 0;
    const secondHalf = halfSize > 0 ? revenues.slice(revenues.length - halfSize).reduce((a, b) => a + b, 0) : 0;
    const growth = halfSize > 1 && firstHalf > 0 ? ((secondHalf - firstHalf) / firstHalf) * 100 : null;
    return { avgDailyRevenue: avgDaily, maxRevenue: maxRev, bestDay, growthRate: growth };
  }, [mergedChartData]);

  // Generate CSV
  const generateCSV = useCallback(async () => {
    setExportLoading(true);
    try {
      const { datePreset, customStart, customEnd, status, sections, filename } = exportOpts;
      const startDate = datePreset === 'custom' && customStart ? customStart : myanmarFormat(subDays(new Date(), datePreset === '365' ? 365 : Number(datePreset)), 'yyyy-MM-dd');
      const endDate = datePreset === 'custom' && customEnd ? customEnd : myanmarFormat(new Date(), 'yyyy-MM-dd');
      const parts = [];

      // 1. Order Details
      if (sections.orders) {
        const params = { bot_id: Number(selectedBotId), limit: 10000 };
        if (status) params.status = status;
        const orders = await getOrders(params).catch(() => []);
        const filtered = orders.filter(o => {
          const d = o.created_at?.split('T')[0];
          return d >= startDate && d <= endDate;
        });
        parts.push('=== Order Details ===');
        parts.push('Order ID,Product/Web ID,Product Name,Variant,Price,Quantity,Customer,Status,Date');
        filtered.forEach(o => {
          const items = o.items || [];
          if (items.length) {
            items.forEach(item => {
              parts.push([
                o.id,
                item.product_id || '',
                `"${(item.name || '').replace(/"/g, '""')}"`,
                `"${(item.variant || '').replace(/"/g, '""')}"`,
                item.price || '',
                item.quantity || 1,
                `"${(o.first_name || '').replace(/"/g, '""')}"`,
                o.status || '',
                o.created_at ? o.created_at.split('T')[0] : '',
              ].join(','));
            });
          } else {
            parts.push([
              o.id, '', '', '', o.total || o.amount || '', 1,
              `"${(o.first_name || '').replace(/"/g, '""')}"`,
              o.status || '', o.created_at ? o.created_at.split('T')[0] : '',
            ].join(','));
          }
        });
        parts.push('');
      }

      // 2. Daily Summary
      if (sections.daily && mergedChartData?.length) {
        parts.push('=== Daily Summary ===');
        parts.push('Date,Revenue,Orders,Users');
        mergedChartData.forEach(d => parts.push(`${d.day},${d.revenue || 0},${d.count || 0},${d.users || 0}`));
        parts.push('');
      }

      // 3. Top Products
      if (sections.products && topProductsWithPct?.length) {
        parts.push('=== Top Products ===');
        parts.push('Product Name,Total Revenue,Quantity Sold,Times Ordered');
        topProductsWithPct.forEach(p => parts.push([
          `"${(p.name || '').replace(/"/g, '""')}"`,
          p.total_revenue || 0,
          p.order_count || 0,
        ].join(',')));
        parts.push('');
      }

      // 4. Customers
      if (sections.customers) {
        const users = await getUsers({ bot_id: Number(selectedBotId) }).catch(() => []);
        parts.push('=== Customers ===');
        parts.push('Customer ID,Name,Username,Email,Phone,Total Orders');
        users.forEach(u => parts.push([
          u.id,
          `"${(u.first_name || '').replace(/"/g, '""')}"`,
          u.username || '',
          u.email || '',
          u.phone_number || '',
          u.order_count || 0,
        ].join(',')));
        parts.push('');
      }

      // 5. Stats Snapshot
      if (sections.stats) {
        parts.push('=== Stats Snapshot ===');
        parts.push('Metric,Value');
        parts.push(`Total Revenue,${totalRevenue}`);
        parts.push(`Total Orders,${totalOrders}`);
        parts.push(`Total Users,${totalUsers}`);
        parts.push(`Items Sold,${itemsSold}`);
        parts.push(`Products Sold,${productsSold}`);
        parts.push(`Pending Orders,${pendingOrders}`);
        parts.push(`Today's Revenue,${todayRevenue}`);
        parts.push(`Monthly Revenue,${monthlyRevenue}`);
        if (quickStats) {
          parts.push(`Avg Daily Revenue,${Math.round(quickStats.avgDailyRevenue)}`);
          parts.push(`Growth Rate,${quickStats.growthRate !== null ? quickStats.growthRate.toFixed(1) : 'N/A'}%`);
        }
        parts.push('');
      }

      const csv = parts.join('\n');
      const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename || `export-${myanmarFormat(new Date(), 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      addToast('CSV exported successfully');
      setShowExportModal(false);
    } catch (err) {
      addToast(err.message || 'Export failed', 'error');
    } finally {
      setExportLoading(false);
    }
  }, [exportOpts, selectedBotId, mergedChartData, topProductsWithPct, totalRevenue, totalOrders, totalUsers, itemsSold, productsSold, pendingOrders, todayRevenue, monthlyRevenue, quickStats, addToast]);

  if (!selectedBotId) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center p-6">
        <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
          <ShoppingBag className="w-10 h-10 text-indigo-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">No Bot Selected</h2>
        <p className="text-gray-500 mt-2 max-w-xs">Please select a bot from the switcher above to view your dashboard.</p>
      </div>
    );
  }

  return (
    <motion.div className="space-y-4 sm:space-y-6 lg:space-y-8" variants={containerVariants} initial="hidden" animate="show">
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-2xl lg:text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-[11px] sm:text-sm lg:text-base mt-0.5 hidden sm:block">Real-time performance metrics for your bot.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Date presets */}
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
          {/* CSV export */}
          <button onClick={() => setShowExportModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border border-gray-100 bg-white text-gray-500 hover:bg-gray-50 transition-all">
            <Download className="w-3.5 h-3.5" /> Export
          </button>
        </div>
      </motion.div>

      {/* Custom date picker */}
      {datePreset === 'custom' && (
        <motion.div variants={itemVariants} className="flex items-center gap-3 bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
          <label className="text-xs font-medium text-gray-500">From:</label>
          <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-indigo-500" />
          <label className="text-xs font-medium text-gray-500">To:</label>
          <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-indigo-500" />
        </motion.div>
      )}

      {/* Stat cards */}
      <motion.div variants={containerVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 md:gap-6 lg:gap-8">
        {statsLoading
          ? Array(4).fill(0).map((_, i) => (<motion.div key={i} variants={itemVariants}><LoadingSkeleton className="h-28 md:h-32" /></motion.div>))
          : [
              { title: 'Total Revenue', value: `${totalRevenue.toLocaleString()} MMK`, icon: DollarSign, color: 'indigo' },
              { title: 'Total Orders', value: totalOrders, icon: ShoppingBag, color: 'emerald' },
              { title: 'Total Users', value: totalUsers, icon: Users, color: 'rose' },
              { title: 'Pending Orders', value: pendingOrders, icon: Clock, color: 'amber' },
            ].map((card, i) => i === 0 ? (
              <motion.div key={i} variants={itemVariants}>
                <div className="bg-white p-3.5 sm:p-5 md:p-6 rounded-2xl sm:rounded-3xl shadow-sm border border-gray-100 flex items-center gap-3 sm:gap-4 md:gap-5 h-full">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-100 flex-shrink-0">
                    {showRevenue ? <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7" /> : <Package className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      <p className="text-[9px] sm:text-xs md:text-sm font-bold text-gray-400 uppercase tracking-wider truncate">
                        {showRevenue ? 'Total Revenue' : 'Total Stock Value'}
                      </p>
                      <button onClick={() => setShowRevenue(!showRevenue)}
                        className="p-1 rounded hover:bg-gray-100 text-gray-300 hover:text-indigo-600 transition-all active:scale-90 flex-shrink-0">
                        <ArrowLeftRight className="w-3 h-3" />
                      </button>
                    </div>
                    <h3 className="text-xs sm:text-lg md:text-2xl lg:text-3xl font-bold text-gray-900 leading-tight mt-0.5">
                      {showRevenue ? `${totalRevenue.toLocaleString()} MMK` : `${totalStockValue.toLocaleString()} MMK`}
                    </h3>
                  </div>
                </div>
              </motion.div>
            ) : (<motion.div key={i} variants={itemVariants}><StatCard {...card} /></motion.div>))}
      </motion.div>

      {/* Mini metrics */}
      <motion.div variants={containerVariants} className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 md:gap-6 lg:gap-8">
        <MiniMetric icon={ShoppingBag} label="Items Sold" value={itemsSold} color="indigo" period={itemsPeriod} onPeriodChange={setItemsPeriod} />
        <MiniMetric icon={Zap} label="Today's Revenue" value={`${todayRevenue.toLocaleString()} MMK`} color="emerald" />
        <MiniMetric icon={TrendingUp} label="Monthly Revenue" value={`${monthlyRevenue.toLocaleString()} MMK`} sub={`${totalRevenue.toLocaleString()} MMK total`} color="amber" />
        <MiniMetric icon={Package} label="Products Sold" value={productsSold} sub={`${totalOrders} orders`} color="purple" period={productsPeriod} onPeriodChange={setProductsPeriod} />
      </motion.div>

      {/* Chart + Top Products */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
        <motion.div variants={itemVariants} className="lg:col-span-2 bg-white p-4 sm:p-6 lg:p-8 rounded-2xl shadow-sm border border-gray-100">
          {/* Chart controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 lg:mb-6">
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-lg lg:text-xl font-bold text-gray-900">Sales</h3>
              <div className="flex bg-gray-100 p-0.5 rounded-lg">
                {[
                  { key: 'area', icon: TrendingUp },
                  { key: 'bar', icon: BarChart3 },
                  { key: 'line', icon: TrendingUp },
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
                  Top 10 Products
                </span>
              )}
            </div>
          </div>

          {/* Chart area */}
          <div ref={chartWrapperRef} className="h-[220px] sm:h-[280px] lg:h-[360px] w-full" onMouseMove={handleChartPointerMove} onMouseLeave={handleChartPointerLeave}>
            {chartLoading ? (
              <LoadingSkeleton className="w-full h-full" />
            ) : chartType === 'pie' ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100}
                    paddingAngle={3} dataKey="value" animationDuration={600}>
                    {pieData.map((_, idx) => (
                      <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} isAnimationActive={false} wrapperStyle={{ background: 'transparent', border: 'none', boxShadow: 'none', pointerEvents: 'none' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                {chartType === 'area' ? (
                  <AreaChart data={mergedChartData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="ordGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#34d399" stopOpacity={0.08} />
                        <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="usersGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.1} />
                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af' }} dy={10}
                      tickFormatter={(v) => { try { return myanmarFormat(parseISO(v), 'd MMM'); } catch { return v; } }} />
                    <YAxis yAxisId="left" orientation="left" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} width={35} domain={[0, 'auto']}
                      tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)} />
                    <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} width={30} domain={[0, 'auto']} />
                    <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#e5e7eb', strokeDasharray: '4 4' }} position={tooltipPosition} isAnimationActive={false} wrapperStyle={{ background: 'transparent', border: 'none', boxShadow: 'none', pointerEvents: 'none' }} />
                    {visibleMetrics.revenue && <Area yAxisId="left" type="monotone" dataKey="revenue" name="Revenue" stroke="#4f46e5" strokeWidth={2.5} fillOpacity={1} fill="url(#revGrad)" animationDuration={800} animationEasing="ease-out" />}
                    {visibleMetrics.orders && <Area yAxisId="right" type="monotone" dataKey="count" name="Orders" stroke="#34d399" strokeWidth={2} fillOpacity={1} fill="url(#ordGrad)" animationDuration={800} animationEasing="ease-out" animationBegin={200} />}
                    {visibleMetrics.users && <Area yAxisId="right" type="monotone" dataKey="users" name="Users" stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#usersGrad)" animationDuration={800} animationEasing="ease-out" animationBegin={400} />}
                  </AreaChart>
                ) : chartType === 'bar' ? (
                  <BarChart data={mergedChartData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af' }} dy={10}
                      tickFormatter={(v) => { try { return myanmarFormat(parseISO(v), 'd MMM'); } catch { return v; } }} />
                    <YAxis yAxisId="left" orientation="left" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} width={35} domain={[0, 'auto']}
                      tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)} />
                    <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} width={30} domain={[0, 'auto']} />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: '#f9fafb' }} position={tooltipPosition} isAnimationActive={false} wrapperStyle={{ background: 'transparent', border: 'none', boxShadow: 'none', pointerEvents: 'none' }} />
                    {visibleMetrics.revenue && <Bar yAxisId="left" dataKey="revenue" name="Revenue" fill="#4f46e5" radius={[4, 4, 0, 0]} animationDuration={600} />}
                    {visibleMetrics.orders && <Bar yAxisId="right" dataKey="count" name="Orders" fill="#34d399" radius={[4, 4, 0, 0]} animationDuration={600} animationBegin={150} />}
                    {visibleMetrics.users && <Bar yAxisId="right" dataKey="users" name="Users" fill="#f43f5e" radius={[4, 4, 0, 0]} animationDuration={600} animationBegin={300} />}
                  </BarChart>
                ) : (
                  <LineChart data={mergedChartData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af' }} dy={10}
                      tickFormatter={(v) => { try { return myanmarFormat(parseISO(v), 'd MMM'); } catch { return v; } }} />
                    <YAxis yAxisId="left" orientation="left" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} width={35} domain={[0, 'auto']}
                      tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)} />
                    <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} width={30} domain={[0, 'auto']} />
                    <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#e5e7eb', strokeDasharray: '4 4' }} position={tooltipPosition} isAnimationActive={false} wrapperStyle={{ background: 'transparent', border: 'none', boxShadow: 'none', pointerEvents: 'none' }} />
                    {visibleMetrics.revenue && <Line yAxisId="left" type="monotone" dataKey="revenue" name="Revenue" stroke="#4f46e5" strokeWidth={2.5} dot={false} animationDuration={800} />}
                    {visibleMetrics.orders && <Line yAxisId="right" type="monotone" dataKey="count" name="Orders" stroke="#34d399" strokeWidth={2} dot={false} animationDuration={800} animationBegin={200} />}
                    {visibleMetrics.users && <Line yAxisId="right" type="monotone" dataKey="users" name="Users" stroke="#f43f5e" strokeWidth={2} dot={false} animationDuration={800} animationBegin={400} />}
                  </LineChart>
                )}
              </ResponsiveContainer>
            )}
          </div>

          {/* Quick stats */}
          {quickStats && (
            <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-gray-100">
              <div className="text-center">
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Best Day</p>
                <p className="text-sm font-bold text-gray-900 mt-0.5">
                  {quickStats.bestDay ? (() => { try { return myanmarFormat(parseISO(quickStats.bestDay), 'd MMM'); } catch { return quickStats.bestDay; } })() : '—'}
                </p>
                <p className="text-[10px] text-indigo-600 font-semibold">{quickStats.maxRevenue.toLocaleString()} MMK</p>
              </div>
              <div className="text-center border-x border-gray-100">
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Avg Daily</p>
                <p className="text-sm font-bold text-gray-900 mt-0.5">{Math.round(quickStats.avgDailyRevenue).toLocaleString()} MMK</p>
              </div>
              <div className="text-center">
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Growth</p>
                {quickStats.growthRate !== null ? (
                  <p className={`text-sm font-bold mt-0.5 ${quickStats.growthRate >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {quickStats.growthRate >= 0 ? '+' : ''}{quickStats.growthRate.toFixed(1)}%
                  </p>
                ) : (
                  <p className="text-sm font-bold mt-0.5 text-gray-300">—</p>
                )}
              </div>
            </div>
          )}
        </motion.div>

        {/* Top Products */}
        <motion.div variants={itemVariants} className="bg-white pt-5 pb-2 px-5 lg:pt-6 lg:px-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-sm sm:text-lg font-bold text-gray-900 flex items-center gap-2 mb-5">
            <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />
            Top Products
          </h3>
          <div className="space-y-1">
            {productsLoading
              ? Array(5).fill(0).map((_, i) => <LoadingSkeleton key={i} className="h-16" />)
              : topProducts?.length
                ? topProductsWithPct.map((product, index) => (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.08, type: 'spring', damping: 22 }}
                      key={index} className="group">
                      <div className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition-colors">
                        <div className="relative w-9 h-9 sm:w-10 sm:h-10 flex-shrink-0">
                          {product.image_url
                            ? <img src={getImageUrl(product.image_url, selectedBotId)} alt={product.name}
                                className="w-full h-full rounded-lg object-cover"
                                onError={(e) => { e.target.style.display = 'none'; e.target.nextElementSibling.style.display = 'flex'; }} />
                            : null}
                          <div className={`w-full h-full rounded-lg flex items-center justify-center font-bold text-xs sm:text-sm ${index === 0 ? 'bg-amber-100 text-amber-600' : index === 1 ? 'bg-slate-100 text-slate-600' : index === 2 ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-500'} ${product.image_url ? 'hidden' : 'flex'}`}
                            style={{ display: product.image_url ? 'none' : 'flex' }}>
                            {index + 1}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-gray-900 truncate leading-tight">{product.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[11px] text-gray-500 font-medium">{product.order_count} orders</span>
                            <span className="text-[10px] text-gray-300">·</span>
                            <span className="text-[11px] text-indigo-600 font-semibold">{product.share}%</span>
                          </div>
                          <div className="mt-1.5 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <motion.div initial={{ width: 0 }} animate={{ width: `${Math.max(product.pct, 2)}%` }}
                              transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 + index * 0.08 }}
                              className={`h-full rounded-full ${index === 0 ? 'bg-amber-400' : index === 1 ? 'bg-slate-400' : index === 2 ? 'bg-orange-400' : 'bg-gray-300'}`} />
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0 ml-1">
                          <p className="text-xs sm:text-sm font-bold text-gray-900 leading-tight">{product.total_revenue?.toLocaleString()}</p>
                          <p className="text-[9px] sm:text-[10px] text-gray-400 font-medium">MMK</p>
                        </div>
                      </div>
                    </motion.div>
                  ))
                : !chartLoading && (
                    <div className="text-center py-8">
                      <Sparkles className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                      <p className="text-sm text-gray-400">No products sold yet</p>
                    </div>
                  )}
          </div>
        </motion.div>
      </div>

      {/* Export Modal */}
      {showExportModal && (
        <>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50" onClick={() => setShowExportModal(false)} />
          <div className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-[28px] shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-9 h-1 bg-gray-200 rounded-full" />
            </div>
            <div className="flex items-center justify-between px-5 pb-3 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">Export Data</h3>
              <div className="flex items-center gap-1.5">
                <button onClick={generateCSV} disabled={exportLoading || !Object.values(exportOpts.sections).some(Boolean)}
                  className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center transition-all active:scale-90 disabled:opacity-40">
                  {exportLoading ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <Download className="w-4 h-4 text-white" />}
                </button>
                <button onClick={() => setShowExportModal(false)} className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-3 space-y-4 min-h-0 pb-28">
              {/* Date range */}
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Date Range</p>
                <div className="flex items-center bg-gray-100 p-0.5 rounded-xl w-fit">
                  {['7', '30', '90', '365'].map(d => (
                    <button key={d} onClick={() => setExportOpts(p => ({ ...p, datePreset: d }))}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${exportOpts.datePreset === d ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>{d}d</button>
                  ))}
                  <button onClick={() => setExportOpts(p => ({ ...p, datePreset: 'custom' }))}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${exportOpts.datePreset === 'custom' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                    <Calendar className="w-3 h-3" /></button>
                </div>
                {exportOpts.datePreset === 'custom' && (
                  <div className="flex items-center gap-2 mt-2">
                    <input type="date" value={exportOpts.customStart} onChange={e => setExportOpts(p => ({ ...p, customStart: e.target.value }))} className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none" />
                    <span className="text-xs text-gray-400">to</span>
                    <input type="date" value={exportOpts.customEnd} onChange={e => setExportOpts(p => ({ ...p, customEnd: e.target.value }))} className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none" />
                  </div>
                )}
              </div>
              {/* Status filter */}
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Status</p>
                <div className="flex items-center bg-gray-100 p-0.5 rounded-xl w-fit">
                  {[{ value: '', label: 'All' }, { value: 'confirmed', label: 'Completed' }, { value: 'pending', label: 'Pending' }, { value: 'cancelled', label: 'Cancelled' }].map(s => (
                    <button key={s.value} onClick={() => setExportOpts(p => ({ ...p, status: s.value }))}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${exportOpts.status === s.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>{s.label}</button>
                  ))}
                </div>
              </div>
              {/* Sections */}
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Include</p>
                <div className="space-y-2">
                  {[
                    { key: 'orders', label: 'Order Details', desc: 'Items, prices & status' },
                    { key: 'daily', label: 'Daily Summary', desc: 'Revenue & orders per day' },
                    { key: 'products', label: 'Top Products', desc: 'Best selling products' },
                    { key: 'customers', label: 'Customers', desc: 'Contact & order history' },
                    { key: 'stats', label: 'Stats Snapshot', desc: 'Key metrics overview' },
                  ].map(s => (
                    <label key={s.key} className="flex items-start gap-3 p-2.5 rounded-xl border border-gray-100 cursor-pointer hover:bg-gray-50 transition-all">
                      <input type="checkbox" checked={exportOpts.sections[s.key]} onChange={() => setExportOpts(p => ({ ...p, sections: { ...p.sections, [s.key]: !p.sections[s.key] } }))} className="mt-0.5 accent-indigo-600 w-4 h-4" />
                      <div>
                        <p className="text-sm font-bold text-gray-900">{s.label}</p>
                        <p className="text-[10px] text-gray-400">{s.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              {/* Filename */}
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Filename</p>
                <input type="text" value={exportOpts.filename} onChange={e => setExportOpts(p => ({ ...p, filename: e.target.value }))}
                  placeholder={`export-${myanmarFormat(new Date(), 'yyyy-MM-dd')}.csv`}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>
          </div>
        </>
      )}

      <InstallPrompt />
    </motion.div>
  );
}
