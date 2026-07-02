import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getProfitSummary } from '../api/stats';
import { useSelectedBot } from '../hooks/useSelectedBot';
import { motion } from 'motion/react';
import { TrendingUp, ArrowLeftRight, AlertTriangle, X, Calendar, Zap, Search, ChevronDown, Download } from 'lucide-react';
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
  const [startDate, setStartDate] = useState(thirtyDaysAgo);
  const [endDate, setEndDate] = useState(today);

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
          <div className="px-4 sm:px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-900">Product Breakdown</h2>
            {products.length > 0 && (
              <button onClick={() => {
                const rows = filteredProducts.map(p => [
                  p.name,
                  p.price,
                  p.cost_price ?? '',
                  p.units_sold,
                  p.revenue,
                  p.net_profit ?? '',
                  p.margin_pct ?? '',
                ]);
                const header = 'Product,Price,Cost Price,Units Sold,Revenue,Net Profit,Margin %';
                const csv = [header, ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
                const date = new Date().toISOString().split('T')[0];
                downloadText(csv, `profit-${date}.csv`, 'text/csv');
              }}
                className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-all active:scale-95">
                <Download className="w-3.5 h-3.5" />
                CSV
              </button>
            )}
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

      </motion.div>
    </div>
  );
}