import React, { useState } from 'react';
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
  Calendar
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { motion } from 'motion/react';

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
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Dashboard Overview</h1>
          <p className="text-gray-500 text-xs sm:text-sm mt-0.5">Real-time performance metrics for your bot.</p>
        </div>
        <div className="flex items-center bg-white p-1 rounded-xl shadow-sm border border-gray-100 self-start">
          {[7, 30].map(d => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-4 py-2 text-sm font-bold rounded-lg transition-all active:scale-95 ${days === d ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              {d} Days
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        {statsLoading ? (
          Array(4).fill(0).map((_, i) => <LoadingSkeleton key={i} className="h-28" />)
        ) : (
          <>
            <StatCard 
              title="Total Revenue" 
              value={`${stats?.total_revenue?.toLocaleString() || 0} MMK`} 
              icon={DollarSign} 
              color="indigo"
            />
            <StatCard 
              title="Total Orders" 
              value={stats?.total_orders || 0} 
              icon={ShoppingBag} 
              color="emerald"
            />
            <StatCard 
              title="Total Users" 
              value={stats?.total_users || 0} 
              icon={Users} 
              color="rose"
            />
            <StatCard 
              title="Pending Orders" 
              value={stats?.pending_orders || 0} 
              icon={Clock} 
              color="amber"
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-600" />
              Sales Performance
            </h3>
          </div>
          <div className="h-[300px] w-full">
            {chartLoading ? (
              <LoadingSkeleton className="w-full h-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData || []}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis 
                    dataKey="day" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 12, fill: '#9ca3af' }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 12, fill: '#9ca3af' }}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#4f46e5" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorRevenue)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-6">
            <Trophy className="w-5 h-5 text-amber-500" />
            Top Products
          </h3>
          <div className="space-y-4">
            {productsLoading ? (
              Array(5).fill(0).map((_, i) => <LoadingSkeleton key={i} className="h-16" />)
            ) : (
              topProducts?.map((product, index) => (
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  key={index} 
                  className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  <div className="relative w-10 h-10 flex-shrink-0">
                    {product.image_url ? (
                      <img
                        src={getImageUrl(product.image_url, selectedBotId)}
                        alt={product.name}
                        className="w-10 h-10 rounded-lg object-cover"
                        onError={(e) => { 
                          console.warn(`[Dashboard] Image failed for "${product.name}":`, getImageUrl(product.image_url, selectedBotId));
                          e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; 
                        }}
                      />
                    ) : null}
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm ${
                      index === 0 ? 'bg-amber-100 text-amber-600' : 
                      index === 1 ? 'bg-slate-100 text-slate-600' :
                      index === 2 ? 'bg-orange-100 text-orange-600' :
                      'bg-gray-100 text-gray-600'
                    } ${product.image_url ? 'hidden' : 'flex'}`}
                      style={{ display: product.image_url ? 'none' : 'flex' }}
                    >
                      {index + 1}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">{product.name}</p>
                    <p className="text-xs text-gray-500">{product.order_count} orders</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-indigo-600">{product.total_revenue?.toLocaleString()} MMK</p>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
