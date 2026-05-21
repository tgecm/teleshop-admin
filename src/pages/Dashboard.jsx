import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getStats, getOrdersByDay, getTopProducts } from '../api/stats';
import { getImageUrl } from '../api/products';
import { useSelectedBot } from '../hooks/useSelectedBot';
import StatCard from '../components/shared/StatCard';
import LoadingSkeleton from '../components/shared/LoadingSkeleton';
import {
  DollarSign,
  ShoppingBag,
  Users,
  Clock,
  TrendingUp,
  Trophy,
  Sparkles,
  Zap,
  Package,
} from 'lucide-react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import { motion } from 'motion/react';
import { format, parseISO } from 'date-fns';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.07 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', damping: 22, stiffness: 200 },
  },
};

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const formatted = (() => {
    try {
      return format(parseISO(label), 'MMM d, yyyy');
    } catch {
      return label;
    }
  })();
  return (
    <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-100 p-4 min-w-[180px]">
      <p className="text-xs font-bold text-gray-400 mb-2">{formatted}</p>
      {payload.map((entry, idx) => (
        <div key={idx} className="flex items-center justify-between gap-4 py-0.5">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-xs font-medium text-gray-600">{entry.name}</span>
          </div>
          <span className="text-xs font-bold text-gray-900">
            {entry.name === 'Revenue'
              ? `${Number(entry.value).toLocaleString()} MMK`
              : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

function MiniMetric({ icon: Icon, label, value, sub, color = 'indigo' }) {
  const colors = {
    indigo: 'text-indigo-600 bg-indigo-50',
    emerald: 'text-emerald-600 bg-emerald-50',
    amber: 'text-amber-600 bg-amber-50',
    rose: 'text-rose-600 bg-rose-50',
    purple: 'text-purple-600 bg-purple-50',
  };
  return (
    <motion.div
      variants={itemVariants}
      className="bg-white rounded-xl border border-gray-100 p-3 sm:p-4 shadow-sm"
    >
      <div className="flex items-center gap-2.5 mb-2">
        <div className={`w-7 h-7 rounded-lg ${colors[color]} flex items-center justify-center`}>
          <Icon className="w-3.5 h-3.5" />
        </div>
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-lg sm:text-xl font-bold text-gray-900 leading-tight">{value}</p>
      {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
    </motion.div>
  );
}

export default function Dashboard() {
  const { selectedBotId } = useSelectedBot();
  const [days, setDays] = useState(30);

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['stats', selectedBotId],
    queryFn: () => getStats({ bot_id: Number(selectedBotId) }),
    enabled: !!selectedBotId,
  });

  const { data: chartData, isLoading: chartLoading } = useQuery({
    queryKey: ['stats', 'orders-by-day', selectedBotId, days],
    queryFn: () => getOrdersByDay({ bot_id: Number(selectedBotId), days }),
    enabled: !!selectedBotId,
  });

  const { data: topProducts, isLoading: productsLoading } = useQuery({
    queryKey: ['stats', 'top-products', selectedBotId],
    queryFn: () => getTopProducts({ bot_id: Number(selectedBotId), limit: 5 }),
    enabled: !!selectedBotId,
  });

  const totalRevenue = stats?.total_revenue || 0;
  const totalOrders = stats?.total_orders || 0;
  const totalUsers = stats?.total_users || 0;
  const pendingOrders = stats?.pending_orders || 0;
  const itemsSold = stats?.items_sold || 0;
  const todayRevenue = stats?.today_revenue || 0;
  const monthlyRevenue = stats?.monthly_revenue || 0;
  const productsSold = stats?.products_sold || 0;

  const topProductsWithPct = useMemo(() => {
    if (!topProducts?.length) return [];
    const maxRevenue = Math.max(...topProducts.map((p) => Number(p.total_revenue) || 0));
    return topProducts.map((p) => ({
      ...p,
      pct: maxRevenue > 0 ? (Number(p.total_revenue) / maxRevenue) * 100 : 0,
      share:
        totalRevenue > 0 ? ((Number(p.total_revenue) / totalRevenue) * 100).toFixed(1) : '0',
    }));
  }, [topProducts, totalRevenue]);

  if (!selectedBotId) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center p-6">
        <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
          <ShoppingBag className="w-10 h-10 text-indigo-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">No Bot Selected</h2>
        <p className="text-gray-500 mt-2 max-w-xs">
          Please select a bot from the switcher above to view your dashboard.
        </p>
      </div>
    );
  }

  return (
    <motion.div
      className="space-y-4 sm:space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      <motion.div variants={itemVariants} className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-[11px] sm:text-sm mt-0.5 hidden sm:block">
            Real-time performance metrics for your bot.
          </p>
        </div>
        <div className="flex items-center bg-white p-0.5 rounded-xl shadow-sm border border-gray-100 flex-shrink-0">
          {[7, 30].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-bold rounded-lg transition-all active:scale-95 ${
                days === d
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100'
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </motion.div>

      <motion.div
        variants={containerVariants}
        className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-6"
      >
        {statsLoading
          ? Array(4)
              .fill(0)
              .map((_, i) => (
                <motion.div key={i} variants={itemVariants}>
                  <LoadingSkeleton className="h-28" />
                </motion.div>
              ))
          : [
              { title: 'Total Revenue', value: `${totalRevenue.toLocaleString()} MMK`, icon: DollarSign, color: 'indigo' },
              { title: 'Total Orders', value: totalOrders, icon: ShoppingBag, color: 'emerald' },
              { title: 'Total Users', value: totalUsers, icon: Users, color: 'rose' },
              { title: 'Pending Orders', value: pendingOrders, icon: Clock, color: 'amber' },
            ].map((card, i) => (
              <motion.div key={i} variants={itemVariants}>
                <StatCard {...card} />
              </motion.div>
            ))}
      </motion.div>

      <motion.div
        variants={containerVariants}
        className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 md:gap-6"
      >
        <MiniMetric
          icon={ShoppingBag}
          label="Items Sold"
          value={itemsSold}
          color="indigo"
        />
        <MiniMetric
          icon={Zap}
          label="Today's Revenue"
          value={`${todayRevenue.toLocaleString()} MMK`}
          color="emerald"
        />
        <MiniMetric
          icon={TrendingUp}
          label="Monthly Revenue"
          value={`${monthlyRevenue.toLocaleString()} MMK`}
          sub={`${totalRevenue.toLocaleString()} MMK total`}
          color="amber"
        />
        <MiniMetric
          icon={Package}
          label="Products Sold"
          value={productsSold}
          sub={`${totalOrders} orders`}
          color="purple"
        />
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <motion.div
          variants={itemVariants}
          className="lg:col-span-2 bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-100"
        >
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h3 className="text-sm sm:text-lg font-bold text-gray-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />
              Sales
            </h3>
            <div className="flex items-center gap-3 text-[10px] sm:text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm bg-indigo-500" />
                <span className="text-gray-500 font-medium">Revenue</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm bg-emerald-400" />
                <span className="text-gray-500 font-medium">Orders</span>
              </div>
            </div>
          </div>
          <div className="h-[220px] sm:h-[280px] w-full">
            {chartLoading ? (
              <LoadingSkeleton className="w-full h-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={chartData || []}
                  margin={{ top: 5, right: 5, left: -10, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="ordGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#34d399" stopOpacity={0.08} />
                      <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#f3f4f6"
                  />
                  <XAxis
                    dataKey="day"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: '#9ca3af' }}
                    dy={10}
                    tickFormatter={(v) => {
                      try {
                        return format(parseISO(v), 'd MMM');
                      } catch {
                        return v;
                      }
                    }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: '#9ca3af' }}
                    tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
                  />
                  <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#e5e7eb', strokeDasharray: '4 4' }} />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    name="Revenue"
                    stroke="#4f46e5"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#revGrad)"
                    animationDuration={800}
                    animationEasing="ease-out"
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    name="Orders"
                    stroke="#34d399"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#ordGrad)"
                    animationDuration={800}
                    animationEasing="ease-out"
                    animationBegin={200}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="bg-white pt-5 pb-2 px-5 rounded-2xl shadow-sm border border-gray-100"
        >
          <h3 className="text-sm sm:text-lg font-bold text-gray-900 flex items-center gap-2 mb-5">
            <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />
            Top Products
          </h3>
          <div className="space-y-1">
            {productsLoading
              ? Array(5)
                  .fill(0)
                  .map((_, i) => <LoadingSkeleton key={i} className="h-16" />)
              : topProducts?.length
                ? topProductsWithPct.map((product, index) => (
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.08, type: 'spring', damping: 22 }}
                      key={index}
                      className="group"
                    >
                      <div className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition-colors">
                        <div className="relative w-9 h-9 sm:w-10 sm:h-10 flex-shrink-0">
                          {product.image_url ? (
                            <img
                              src={getImageUrl(product.image_url, selectedBotId)}
                              alt={product.name}
                              className="w-full h-full rounded-lg object-cover"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextElementSibling.style.display = 'flex';
                              }}
                            />
                          ) : null}
                          <div
                            className={`w-full h-full rounded-lg flex items-center justify-center font-bold text-xs sm:text-sm ${
                              index === 0
                                ? 'bg-amber-100 text-amber-600'
                                : index === 1
                                  ? 'bg-slate-100 text-slate-600'
                                  : index === 2
                                    ? 'bg-orange-100 text-orange-600'
                                    : 'bg-gray-100 text-gray-500'
                            } ${product.image_url ? 'hidden' : 'flex'}`}
                            style={{ display: product.image_url ? 'none' : 'flex' }}
                          >
                            {index + 1}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-gray-900 truncate leading-tight">
                            {product.name}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[11px] text-gray-500 font-medium">
                              {product.order_count} orders
                            </span>
                            <span className="text-[10px] text-gray-300">·</span>
                            <span className="text-[11px] text-indigo-600 font-semibold">
                              {product.share}%
                            </span>
                          </div>
                          <div className="mt-1.5 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.max(product.pct, 2)}%` }}
                              transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 + index * 0.08 }}
                              className={`h-full rounded-full ${
                                index === 0
                                  ? 'bg-amber-400'
                                  : index === 1
                                    ? 'bg-slate-400'
                                    : index === 2
                                      ? 'bg-orange-400'
                                      : 'bg-gray-300'
                              }`}
                            />
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0 ml-1">
                          <p className="text-xs sm:text-sm font-bold text-gray-900 leading-tight">
                            {product.total_revenue?.toLocaleString()}
                          </p>
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
    </motion.div>
  );
}
