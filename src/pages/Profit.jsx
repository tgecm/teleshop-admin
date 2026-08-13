import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { getProfitSummary, getSalesLog, getProfitPeriod, updateProfitPeriod } from '../api/stats';
import { useSelectedBot } from '../hooks/useSelectedBot';
import { motion } from 'motion/react';
import { TrendingUp, ArrowLeftRight, AlertTriangle, X, Calendar, Zap, Search, ChevronDown, Download, RefreshCw } from 'lucide-react';
import LoadingSkeleton from '../components/shared/LoadingSkeleton';
import { downloadText } from '../utils/download';
import { formatPrice } from '../utils/formatPrice';

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', damping: 22, stiffness: 200 } },
};

function SummaryCard({ icon: Icon, label, value, sub, color }) {
  const colors = {
    emerald: 'from-emerald-500 to-teal-600 shadow-emerald-100 text-emerald-600 bg-emerald-50',
    indigo: 'from-indigo-500 to-purple-600 shadow-indigo-100 text-indigo-600 bg-indigo-50',
    amber: 'from-amber-500 to-orange-600 shadow-amber-100 text-amber-600 bg-amber-50',
    rose: 'from-rose-500 to-pink-600 shadow-rose-100 text-rose-600 bg-rose-50',
    blue: 'from-blue-500 to-cyan-600 shadow-blue-100 text-blue-600 bg-blue-50',
  };
  const c = colors[color] || colors.indigo;

  return (
    <motion.div variants={itemVariants}
      className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100"
    >
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${c.split(' ')[0]} ${c.split(' ')[1]} flex items-center justify-center text-white shadow-lg flex-shrink-0`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{label}</p>
          <h3 className="text-sm sm:text-base md:text-lg font-bold text-gray-900 leading-tight mt-0.5">{value}</h3>
          {sub && <p className="text-xs font-medium text-gray-400 mt-0.5">{sub}</p>}
        </div>
      </div>
    </motion.div>
  );
}

export default function Profit() {
  const { selectedBotId, selectedBot } = useSelectedBot();

  const today = new Date().toISOString().split('T')[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const getDatesForPreset = (preset) => {
    const t = new Date().toISOString().split('T')[0];
    if (preset === 'weekly') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      return { start: d.toISOString().split('T')[0], end: t };
    }
    if (preset === 'monthly') {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      return { start: d.toISOString().split('T')[0], end: t };
    }
    return { start: t, end: t };
  };

  const [productPeriod, setProductPeriod] = useState(() => {
    return localStorage.getItem('profit_product_period') || 'today';
  });

  const [salesLogPeriod, setSalesLogPeriod] = useState(() => {
    return localStorage.getItem('profit_sales_period') || 'today';
  });

  const initialProductDates = getDatesForPreset(productPeriod);
  const initialSalesDates = getDatesForPreset(salesLogPeriod);

  const [startDate, setStartDate] = useState(initialProductDates.start);
  const [endDate, setEndDate] = useState(initialProductDates.end);
  const [salesLogStartDate, setSalesLogStartDate] = useState(initialSalesDates.start);
  const [salesLogEndDate, setSalesLogEndDate] = useState(initialSalesDates.end);

  // Fetch profit period preference from DB
  const { data: dbPeriod } = useQuery({
    queryKey: ['profitPeriod', selectedBotId],
    queryFn: () => getProfitPeriod(selectedBotId),
    enabled: !!selectedBotId
  });

  const periodMutation = useMutation({
    mutationFn: (data) => updateProfitPeriod(selectedBotId, data)
  });

  useEffect(() => {
    if (dbPeriod) {
      if (dbPeriod.profit_product_period) {
        setProductPeriod(dbPeriod.profit_product_period);
        localStorage.setItem('profit_product_period', dbPeriod.profit_product_period);
        const { start, end } = getDatesForPreset(dbPeriod.profit_product_period);
        setStartDate(start);
        setEndDate(end);
      }
      if (dbPeriod.profit_sales_period) {
        setSalesLogPeriod(dbPeriod.profit_sales_period);
        localStorage.setItem('profit_sales_period', dbPeriod.profit_sales_period);
        const { start, end } = getDatesForPreset(dbPeriod.profit_sales_period);
        setSalesLogStartDate(start);
        setSalesLogEndDate(end);
      }
    }
  }, [dbPeriod]);

  const handleProductPeriodChange = (val) => {
    setProductPeriod(val);
    localStorage.setItem('profit_product_period', val);
    const { start, end } = getDatesForPreset(val);
    setStartDate(start);
    setEndDate(end);
    if (selectedBotId) {
      periodMutation.mutate({ profit_product_period: val });
    }
  };

  const handleSalesLogPeriodChange = (val) => {
    setSalesLogPeriod(val);
    localStorage.setItem('profit_sales_period', val);
    const { start, end } = getDatesForPreset(val);
    setSalesLogStartDate(start);
    setSalesLogEndDate(end);
    if (selectedBotId) {
      periodMutation.mutate({ profit_sales_period: val });
    }
  };

  const params = { bot_id: Number(selectedBotId) };
  if (startDate && endDate) {
    params.start_date = startDate;
    params.end_date = endDate;
  }

  const { data, isLoading } = useQuery({
    queryKey: ['stats', 'profit-summary', selectedBotId, startDate, endDate],
    queryFn: () => getProfitSummary(params),
    enabled: !!selectedBotId,
    placeholderData: (prev) => prev,
  });

  const { data: salesLog, isLoading: salesLogLoading } = useQuery({
    queryKey: ['stats', 'sales-log', selectedBotId, salesLogStartDate, salesLogEndDate],
    queryFn: () => getSalesLog({ bot_id: Number(selectedBotId), start_date: salesLogStartDate, end_date: salesLogEndDate }),
    enabled: !!selectedBotId,
  });

  const totalRevenue = data?.total_revenue || 0;
  const totalCost = data?.total_cost || 0;
  const totalProfit = data?.total_profit || 0;
  const marginPct = data?.margin_pct || 0;
  const todayProfit = data?.today_profit || 0;
  const untrackedCount = data?.untracked_count || 0;
  const products = data?.products || [];
  const categories = data?.categories || [];

  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('top_sold');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredProducts = useMemo(() => {
    let result = [...products];

    // Category filter
    if (categoryFilter !== 'all') {
      const catId = Number(categoryFilter);
      result = result.filter(p => p.category_id === catId);
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(p => p.name.toLowerCase().includes(q));
    }

    // Sort
    switch (sortBy) {
      case 'top_sold':
        result.sort((a, b) => b.units_sold - a.units_sold);
        break;
      case 'less_sold':
        result.sort((a, b) => a.units_sold - b.units_sold);
        break;
      case 'name_asc':
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'name_desc':
        result.sort((a, b) => b.name.localeCompare(a.name));
        break;
      default:
        break;
    }

    return result;
  }, [products, categoryFilter, sortBy, searchQuery]);

  const [dismissWarning, setDismissWarning] = useState(false);

  const hasUntracked = untrackedCount > 0;

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-4 sm:space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h1 className="text-xl sm:text-2xl font-black text-gray-900 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-500" />
            Profit
          </h1>
        </div>

        {/* Date filter */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              className="text-xs sm:text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
          </div>
          <span className="text-gray-400 text-xs">—</span>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
              className="text-xs sm:text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
          </div>
          {(startDate !== thirtyDaysAgo || endDate !== today) && (
            <button onClick={() => { setStartDate(thirtyDaysAgo); setEndDate(today); }}
              className="text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors">
              Reset
            </button>
          )}
        </div>

        {/* Summary cards */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            {[...Array(3)].map((_, i) => <LoadingSkeleton key={i} className="h-24 rounded-2xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <SummaryCard icon={ArrowLeftRight} label="Cost" value={formatPrice(totalCost, selectedBot?.currency || 'MMK')} color="rose" />
            <SummaryCard icon={TrendingUp} label="Net Profit" value={formatPrice(totalProfit, selectedBot?.currency || 'MMK')}
              sub={`${marginPct}% margin`} color="indigo" />
            <SummaryCard icon={Zap} label="Today's Net Profit" value={formatPrice(todayProfit, selectedBot?.currency || 'MMK')}
              sub="from completed orders" color="emerald" />
          </div>
        )}

        {/* Untracked warning */}
        {hasUntracked && !dismissWarning && (
          <motion.div variants={itemVariants}
            className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl shadow-sm">
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-amber-800">
                {untrackedCount} product{untrackedCount > 1 ? 's' : ''} ha{untrackedCount === 1 ? 's' : 've'} no cost price set
              </p>
              <p className="text-xs text-amber-600 mt-0.5">Set cost price to see complete profit data for these products</p>
              <button onClick={() => window.location.href = '/products?no_cost_price=1'}
                className="mt-2 px-3 py-1.5 text-xs font-bold bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-all active:scale-95">
                Set Now →
              </button>
            </div>
            <button onClick={() => setDismissWarning(true)}
              className="p-1 rounded-lg hover:bg-amber-100 text-amber-400 transition-all flex-shrink-0">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}

        {/* Product profit table */}
        <motion.div variants={itemVariants}
          className="bg-white rounded-2xl shadow-sm border border-gray-100">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-100 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-gray-900">Product Breakdown</h2>
              <div className="flex items-center gap-1">
                <select
                  value={productPeriod}
                  onChange={e => handleProductPeriodChange(e.target.value)}
                  className="text-[10px] border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 cursor-pointer"
                >
                  <option value="today">Today</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
                {products.length > 0 && (
                <button onClick={() => {
                  const rows = filteredProducts.map(p => [
                    p.name, p.price, p.cost_price ?? '', p.units_sold, p.revenue, p.net_profit ?? '', p.margin_pct ?? '',
                  ]);
                  const header = 'Product,Price,Cost Price,Units Sold,Revenue,Net Profit,Margin %';
                  const csv = [header, ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
                  downloadText(csv, `profit-${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
                }}
                  className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2 py-1.5 rounded-lg transition-all active:scale-95 whitespace-nowrap">
                  <Download className="w-3 h-3" />
                  CSV
                </button>
              )}
              </div>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3 h-3 text-gray-400" />
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                  className="text-[10px] border border-gray-200 rounded-lg px-1.5 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 w-auto" />
              </div>
              <span className="text-gray-400 text-[10px]">—</span>
              <div className="flex items-center gap-1.5">
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                  className="text-[10px] border border-gray-200 rounded-lg px-1.5 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 w-auto" />
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="px-4 sm:px-6 py-3 border-b border-gray-50">
            <div className="flex flex-wrap items-center gap-2">
              {/* Category filter */}
              <div className="relative">
                <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
                  className="appearance-none text-xs border border-gray-200 rounded-lg px-3 py-1.5 pr-8 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 cursor-pointer">
                  <option value="all">All Categories</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <ChevronDown className="w-3 h-3 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* Sort filter */}
              <div className="relative">
                <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                  className="appearance-none text-xs border border-gray-200 rounded-lg px-3 py-1.5 pr-8 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 cursor-pointer">
                  <option value="top_sold">Top Sold</option>
                  <option value="less_sold">Less Sold</option>
                  <option value="name_asc">Name A-Z</option>
                  <option value="name_desc">Name Z-A</option>
                </select>
                <ChevronDown className="w-3 h-3 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* Search */}
              <div className="relative flex-1 min-w-[140px] max-w-[220px]">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search product..."
                  className="w-full text-xs border border-gray-200 rounded-lg pl-8 pr-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
              </div>

              {filteredProducts.length < products.length && (
                <span className="text-[10px] text-gray-400 ml-auto">
                  Showing {filteredProducts.length} of {products.length}
                </span>
              )}
            </div>
          </div>

          {isLoading ? (
            <div className="p-6 space-y-3">
              {[...Array(5)].map((_, i) => <LoadingSkeleton key={i} className="h-10 w-full rounded-xl" />)}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="p-6 text-center text-gray-400 text-sm">
              {products.length === 0
                ? `No completed orders found${startDate && endDate ? ' in this date range' : ''}.`
                : 'No products match your filters.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="text-left px-3 sm:px-6 py-3 font-bold text-gray-500 uppercase tracking-wider">Product</th>
                    <th className="text-right px-3 sm:px-6 py-3 font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Price</th>
                    <th className="text-right px-3 sm:px-6 py-3 font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Cost</th>
                    <th className="text-right px-3 sm:px-6 py-3 font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Sold</th>
                    <th className="text-right px-3 sm:px-6 py-3 font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Revenue</th>
                    <th className="text-right px-3 sm:px-6 py-3 font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Net Profit</th>
                    <th className="text-right px-3 sm:px-6 py-3 font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Margin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredProducts.map((p) => {
                    const hasCost = p.cost_price !== null && p.cost_price !== undefined;
                    return (
                      <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-3 sm:px-6 py-3 font-medium text-gray-900 max-w-[120px] sm:max-w-[200px] truncate">
                          {!hasCost && <AlertTriangle className="w-3 h-3 text-amber-400 inline mr-1 flex-shrink-0" />}
                          {p.name}
                        </td>
                        <td className="px-3 sm:px-6 py-3 text-right text-gray-600 whitespace-nowrap">{p.price.toLocaleString()}</td>
                        <td className="px-3 sm:px-6 py-3 text-right whitespace-nowrap">
                          {hasCost ? (
                            <span className="text-gray-600">{p.cost_price.toLocaleString()}</span>
                          ) : (
                            <span className="text-amber-400 text-[10px] font-bold">—</span>
                          )}
                        </td>
                        <td className="px-3 sm:px-6 py-3 text-right text-gray-600 whitespace-nowrap">{p.units_sold}</td>
                        <td className="px-3 sm:px-6 py-3 text-right text-gray-900 font-medium whitespace-nowrap">{p.revenue.toLocaleString()}</td>
                        <td className="px-3 sm:px-6 py-3 text-right whitespace-nowrap font-medium">
                          {hasCost ? (
                            <span className={p.net_profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                              {p.net_profit >= 0 ? '+' : ''}{p.net_profit.toLocaleString()}
                            </span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        <td className="px-3 sm:px-6 py-3 text-right whitespace-nowrap">
                          {hasCost ? (
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              p.margin_pct >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                            }`}>
                              {p.margin_pct}%
                            </span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>

        {/* Sales Log */}
        <motion.div variants={itemVariants}
          className="bg-white rounded-2xl shadow-sm border border-gray-100">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-100 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-gray-900">Sales Log</h2>
              <div className="flex items-center gap-1">
                <select
                  value={salesLogPeriod}
                  onChange={e => handleSalesLogPeriodChange(e.target.value)}
                  className="text-[10px] border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 cursor-pointer"
                >
                  <option value="today">Today</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
                {salesLog && salesLog.length > 0 && (
                <button onClick={() => {
                  const rows = salesLog.map(r => [
                    r.category_name || '', r.product_name, r.quantity, r.price,
                    ((r.price - (r.cost_price || 0)) * r.quantity),
                    r.cost_price ? Math.round(((r.price - r.cost_price) / r.price) * 100) + '%' : '',
                    r.created_at?.split('T')[1]?.split('.')[0] || '',
                  ]);
                  const header = 'Category,Name,Qty,Price,Net Profit,Margin,Time';
                  const csv = [header, ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
                  downloadText(csv, `sales-log-${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
                }}
                  className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2 py-1.5 rounded-lg transition-all active:scale-95 whitespace-nowrap">
                  <Download className="w-3 h-3" />
                  CSV
                </button>
              )}
              </div>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3 h-3 text-gray-400" />
                <input type="date" value={salesLogStartDate} onChange={e => setSalesLogStartDate(e.target.value)}
                  className="text-[10px] border border-gray-200 rounded-lg px-1.5 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 w-auto" />
              </div>
              <span className="text-gray-400 text-[10px]">—</span>
              <div className="flex items-center gap-1.5">
                <input type="date" value={salesLogEndDate} onChange={e => setSalesLogEndDate(e.target.value)}
                  className="text-[10px] border border-gray-200 rounded-lg px-1.5 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 w-auto" />
              </div>
            </div>
          </div>

          {salesLog && salesLog.length > 0 && (
            <div className="px-4 sm:px-6 py-3 border-b border-gray-50 flex items-center gap-4 text-xs text-gray-500">
              <span className="font-medium">{salesLog.length} item{salesLog.length !== 1 ? 's' : ''}</span>
              <span className="font-medium">
                Revenue: {salesLog.reduce((s, r) => s + r.price * r.quantity, 0).toLocaleString()} KS
              </span>
              <span className="font-medium">
                Profit: {salesLog.reduce((s, r) => s + (r.price - (r.cost_price || 0)) * r.quantity, 0) >= 0 ? '+' : ''}
                {salesLog.reduce((s, r) => s + (r.price - (r.cost_price || 0)) * r.quantity, 0).toLocaleString()} KS
              </span>
            </div>
          )}

          {salesLogLoading ? (
            <div className="p-6 space-y-3">
              {[...Array(5)].map((_, i) => <LoadingSkeleton key={i} className="h-10 w-full rounded-xl" />)}
            </div>
          ) : !salesLog || salesLog.length === 0 ? (
            <div className="p-6 text-center text-gray-400 text-sm">
              No sales found for this date.
            </div>
          ) : (
            <div className="overflow-x-auto px-4 sm:px-6">
              <table className="text-xs w-full min-w-[650px]">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="text-left px-2 sm:px-3 py-2.5 font-bold text-gray-500 uppercase tracking-wider text-[10px]">Category</th>
                    <th className="text-left px-2 sm:px-3 py-2.5 font-bold text-gray-500 uppercase tracking-wider text-[10px]">Name</th>
                    <th className="text-right px-2 sm:px-3 py-2.5 font-bold text-gray-500 uppercase tracking-wider text-[10px] whitespace-nowrap">Qty</th>
                    <th className="text-right px-2 sm:px-3 py-2.5 font-bold text-gray-500 uppercase tracking-wider text-[10px] whitespace-nowrap">Price</th>
                    <th className="text-right px-2 sm:px-3 py-2.5 font-bold text-gray-500 uppercase tracking-wider text-[10px] whitespace-nowrap">Net Profit</th>
                    <th className="text-right px-2 sm:px-3 py-2.5 font-bold text-gray-500 uppercase tracking-wider text-[10px] whitespace-nowrap">Margin</th>
                    <th className="text-right px-2 sm:px-3 py-2.5 font-bold text-gray-500 uppercase tracking-wider text-[10px] whitespace-nowrap">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {salesLog.map((row, idx) => {
                    const netProfit = (row.price - (row.cost_price || 0)) * row.quantity;
                    const marginPct = row.cost_price ? Math.round(((row.price - row.cost_price) / row.price) * 100) : null;
                    const timeStr = row.created_at?.split('T')[1]?.split('.')[0] || '';
                    return (
                      <tr key={`${row.order_id}-${row.product_id}-${idx}`} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-2 sm:px-3 py-2 text-gray-600 truncate max-w-[100px]">{row.category_name || '—'}</td>
                        <td className="px-2 sm:px-3 py-2 font-medium text-gray-900 truncate max-w-[140px]">{row.product_name}</td>
                        <td className="px-2 sm:px-3 py-2 text-right text-gray-600 whitespace-nowrap">{row.quantity}</td>
                        <td className="px-2 sm:px-3 py-2 text-right text-gray-900 whitespace-nowrap">{row.price.toLocaleString()}</td>
                        <td className="px-2 sm:px-3 py-2 text-right whitespace-nowrap font-medium text-[11px]">
                          <span className={netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                            {netProfit >= 0 ? '+' : ''}{netProfit.toLocaleString()}
                          </span>
                        </td>
                        <td className="px-2 sm:px-3 py-2 text-right whitespace-nowrap">
                          {marginPct !== null ? (
                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
                              marginPct >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                            }`}>
                              {marginPct}%
                            </span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        <td className="px-2 sm:px-3 py-2 text-right text-gray-400 whitespace-nowrap text-[10px]">{timeStr}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>

      </motion.div>
    </div>
  );
}