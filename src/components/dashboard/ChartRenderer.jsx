import { useRef, useMemo, useCallback, useState } from 'react';
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
} from 'recharts';
import { parseISO, subDays, addDays, differenceInDays } from 'date-fns';
import { myanmarFormat } from '../../utils/date';
import { formatPrice } from '../../utils/formatPrice';
import { useSelectedBot } from '../../hooks/useSelectedBot';
import LoadingSkeleton from '../shared/LoadingSkeleton';

const CHART_COLORS = ['#4f46e5', '#34d399', '#f43f5e', '#f59e0b', '#8b5cf6', '#06b6d4'];
const METRIC_CONFIG = {
  revenue: { label: 'Revenue', color: '#4f46e5', gradient: 'revGrad' },
  orders: { label: 'Orders', color: '#34d399', gradient: 'ordGrad' },
  users: { label: 'Users', color: '#f43f5e', gradient: 'usersGrad' },
  profit: { label: 'Profit', color: '#22c55e', gradient: 'profitGrad' },
};

function ChartTooltip({ active, payload, label, currency }) {
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
            {entry.name === 'Revenue' || entry.name === 'Profit'
              ? formatPrice(entry.value, currency)
              : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function ChartRenderer({
  chartType,
  visibleMetrics,
  mergedChartData,
  pieData,
  chartLoading,
}) {
  const { selectedBot } = useSelectedBot();
  const currency = selectedBot?.currency || 'MMK';
  const chartWrapperRef = useRef(null);
  const [cursorXY, setCursorXY] = useState(null);

  const handleChartPointerMove = useCallback((e) => {
    const el = chartWrapperRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setCursorXY({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }, []);

  const handleChartPointerLeave = useCallback(() => setCursorXY(null), []);

  const tooltipPosition = useMemo(() => {
    if (!cursorXY || !chartWrapperRef.current) return undefined;
    const { width } = chartWrapperRef.current.getBoundingClientRect();
    const isRightHalf = cursorXY.x > width / 2;
    return {
      x: isRightHalf ? Math.max(2, cursorXY.x - 180) : cursorXY.x + 15,
      y: Math.max(5, cursorXY.y - 100),
    };
  }, [cursorXY]);

  const quickStats = useMemo(() => {
    if (!mergedChartData?.length) return null;
    const revenues = mergedChartData.map((d) => Number(d.revenue) || 0);
    const totalRev = revenues.reduce((a, b) => a + b, 0);
    const avgDaily = totalRev / revenues.length;
    const maxRev = Math.max(...revenues);
    const bestDay = mergedChartData.find((d) => Number(d.revenue) === maxRev)?.day;
    const halfSize = Math.floor(revenues.length / 2);
    const firstHalf = halfSize > 0 ? revenues.slice(0, halfSize).reduce((a, b) => a + b, 0) : 0;
    const secondHalf = halfSize > 0 ? revenues.slice(revenues.length - halfSize).reduce((a, b) => a + b, 0) : 0;
    const growth = halfSize > 1 && firstHalf > 0 ? ((secondHalf - firstHalf) / firstHalf) * 100 : null;
    return { avgDailyRevenue: avgDaily, maxRevenue: maxRev, bestDay, growthRate: growth };
  }, [mergedChartData]);

  return (
    <>
      <div ref={chartWrapperRef} className="h-[220px] sm:h-[280px] lg:h-[360px] w-full min-w-0" onMouseMove={handleChartPointerMove} onMouseLeave={handleChartPointerLeave}>
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
              <Tooltip content={<ChartTooltip currency={currency} />} isAnimationActive={false} wrapperStyle={{ background: 'transparent', border: 'none', boxShadow: 'none', pointerEvents: 'none' }} />
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
                  <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af' }} dy={10}
                  tickFormatter={(v) => { try { return myanmarFormat(parseISO(v), 'd MMM'); } catch { return v; } }} />
                <YAxis yAxisId="left" orientation="left" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} width={35} domain={[0, 'auto']}
                  tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)} />
                <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} width={30} domain={[0, 'auto']} />
                <Tooltip content={<ChartTooltip currency={currency} />} cursor={{ stroke: '#e5e7eb', strokeDasharray: '4 4' }} position={tooltipPosition} isAnimationActive={false} wrapperStyle={{ background: 'transparent', border: 'none', boxShadow: 'none', pointerEvents: 'none' }} />
                {visibleMetrics.revenue && <Area yAxisId="left" type="monotone" dataKey="revenue" name="Revenue" stroke="#4f46e5" strokeWidth={2.5} fillOpacity={1} fill="url(#revGrad)" animationDuration={0} />}
                {visibleMetrics.orders && <Area yAxisId="right" type="monotone" dataKey="count" name="Orders" stroke="#34d399" strokeWidth={2} fillOpacity={1} fill="url(#ordGrad)" animationDuration={0} />}
                {visibleMetrics.users && <Area yAxisId="right" type="monotone" dataKey="users" name="Users" stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#usersGrad)" animationDuration={0} />}
                {visibleMetrics.profit && <Area yAxisId="left" type="monotone" dataKey="profit" name="Profit" stroke="#22c55e" strokeWidth={2.5} fillOpacity={1} fill="url(#profitGrad)" animationDuration={0} />}
              </AreaChart>
            ) : chartType === 'bar' ? (
              <BarChart data={mergedChartData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af' }} dy={10}
                  tickFormatter={(v) => { try { return myanmarFormat(parseISO(v), 'd MMM'); } catch { return v; } }} />
                <YAxis yAxisId="left" orientation="left" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} width={35} domain={[0, 'auto']}
                  tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)} />
                <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} width={30} domain={[0, 'auto']} />
                <Tooltip content={<ChartTooltip currency={currency} />} cursor={{ fill: '#f9fafb' }} position={tooltipPosition} isAnimationActive={false} wrapperStyle={{ background: 'transparent', border: 'none', boxShadow: 'none', pointerEvents: 'none' }} />
                {visibleMetrics.revenue && <Bar yAxisId="left" dataKey="revenue" name="Revenue" fill="#4f46e5" radius={[4, 4, 0, 0]} animationDuration={0} />}
                {visibleMetrics.orders && <Bar yAxisId="right" dataKey="count" name="Orders" fill="#34d399" radius={[4, 4, 0, 0]} animationDuration={0} />}
                {visibleMetrics.users && <Bar yAxisId="right" dataKey="users" name="Users" fill="#f43f5e" radius={[4, 4, 0, 0]} animationDuration={0} />}
                {visibleMetrics.profit && <Bar yAxisId="left" dataKey="profit" name="Profit" fill="#22c55e" radius={[4, 4, 0, 0]} animationDuration={0} />}
              </BarChart>
            ) : (
              <LineChart data={mergedChartData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af' }} dy={10}
                  tickFormatter={(v) => { try { return myanmarFormat(parseISO(v), 'd MMM'); } catch { return v; } }} />
                <YAxis yAxisId="left" orientation="left" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} width={35} domain={[0, 'auto']}
                  tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)} />
                <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} width={30} domain={[0, 'auto']} />
                <Tooltip content={<ChartTooltip currency={currency} />} cursor={{ stroke: '#e5e7eb', strokeDasharray: '4 4' }} position={tooltipPosition} isAnimationActive={false} wrapperStyle={{ background: 'transparent', border: 'none', boxShadow: 'none', pointerEvents: 'none' }} />
                {visibleMetrics.revenue && <Line yAxisId="left" type="monotone" dataKey="revenue" name="Revenue" stroke="#4f46e5" strokeWidth={2.5} dot={false} animationDuration={0} />}
                {visibleMetrics.orders && <Line yAxisId="right" type="monotone" dataKey="count" name="Orders" stroke="#34d399" strokeWidth={2} dot={false} animationDuration={0} />}
                {visibleMetrics.users && <Line yAxisId="right" type="monotone" dataKey="users" name="Users" stroke="#f43f5e" strokeWidth={2} dot={false} animationDuration={0} />}
                {visibleMetrics.profit && <Line yAxisId="left" type="monotone" dataKey="profit" name="Profit" stroke="#22c55e" strokeWidth={2.5} dot={false} animationDuration={0} />}
              </LineChart>
            )}
          </ResponsiveContainer>
        )}
      </div>

      {quickStats && (
        <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-gray-100">
          <div className="text-center">
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Best Day</p>
            <p className="text-sm font-bold text-gray-900 mt-0.5">
              {quickStats.bestDay ? (() => { try { return myanmarFormat(parseISO(quickStats.bestDay), 'd MMM'); } catch { return quickStats.bestDay; } })() : '—'}
            </p>
            <p className="text-[10px] text-indigo-600 font-semibold">{formatPrice(quickStats.maxRevenue, currency)}</p>
          </div>
          <div className="text-center border-x border-gray-100">
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Avg Daily</p>
            <p className="text-sm font-bold text-gray-900 mt-0.5">{formatPrice(Math.round(quickStats.avgDailyRevenue), currency)}</p>
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
    </>
  );
}
