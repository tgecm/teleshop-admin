import { useMemo } from 'react';
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
} from 'recharts';
import { parseISO } from 'date-fns';
import { myanmarFormat } from '../../utils/date';
import { formatPrice } from '../../utils/formatPrice';
import { useSelectedBot } from '../../hooks/useSelectedBot';
import LoadingSkeleton from '../shared/LoadingSkeleton';

const CHART_COLORS = [
  '#9333ea', '#0d9488', '#f43f5e', '#059669', '#3b82f6',
  '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899', '#6366f1'
];

function formatCompactNumber(val) {
  if (val === null || val === undefined || isNaN(val)) return '0';
  const num = Number(val);
  if (num >= 1_000_000) {
    const formatted = (num / 1_000_000).toFixed(2).replace(/\.?0+$/, '');
    return `${formatted}M`;
  }
  if (num >= 1_000) {
    const formatted = (num / 1_000).toFixed(1).replace(/\.0$/, '');
    return `${formatted}k`;
  }
  return num.toString();
}

function ChartTooltip({ active, payload, label, currency, isPie, totalPieValue }) {
  if (!active || !payload?.length) return null;

  if (isPie) {
    const item = payload[0];
    const pct = totalPieValue > 0 ? ((item.value / totalPieValue) * 100).toFixed(1) : '0';
    return (
      <div className="bg-[#0f172a] text-white rounded-xl shadow-2xl p-2.5 min-w-[160px] max-w-[240px] z-50 border border-slate-700/60 backdrop-blur-md">
        <p className="text-[11px] font-bold text-slate-300 truncate mb-1 border-b border-slate-700/60 pb-1">
          {item.name}
        </p>
        <div className="flex items-center justify-between gap-3 text-xs pt-0.5">
          <span className="font-bold text-purple-400">{formatPrice(item.value, currency)}</span>
          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded">
            {pct}%
          </span>
        </div>
      </div>
    );
  }

  const formattedDate = (() => {
    try { return myanmarFormat(parseISO(label), 'MMM d, yyyy'); }
    catch { return label; }
  })();

  return (
    <div className="bg-[#0f172a] text-white rounded-xl shadow-2xl p-2.5 min-w-[155px] z-50 border border-slate-700/60 backdrop-blur-md">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 border-b border-slate-700/60 pb-1">
        {formattedDate}
      </p>
      <div className="space-y-1">
        {payload.map((entry, idx) => (
          <div key={idx} className="flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <span
                className="w-2 h-2 rounded-full flex-shrink-0 shadow-sm"
                style={{ backgroundColor: entry.color }}
              />
              <span className="font-medium text-slate-300">{entry.name}</span>
            </div>
            <span className="font-bold tabular-nums" style={{ color: entry.color }}>
              {entry.name === 'Revenue' || entry.name === 'Profit'
                ? formatPrice(entry.value, currency)
                : entry.value?.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
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

  const totalPieValue = useMemo(() => {
    if (!pieData?.length) return 0;
    return pieData.reduce((acc, curr) => acc + (Number(curr.value) || 0), 0);
  }, [pieData]);

  const leftPieItems = useMemo(() => (pieData ? pieData.slice(0, 5) : []), [pieData]);
  const rightPieItems = useMemo(() => (pieData ? pieData.slice(5, 10) : []), [pieData]);

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

  const hasRightAxis = visibleMetrics.orders || visibleMetrics.users;

  return (
    <>
      <div
        className="h-[240px] sm:h-[300px] lg:h-[360px] w-full min-w-0 rounded-2xl px-0.5 sm:px-2 py-2 relative overflow-hidden transition-all border border-gray-100/60 shadow-inner"
        style={{
          backgroundColor: '#fafbfc',
          backgroundImage: `
            linear-gradient(to right, rgba(147, 51, 234, 0.04) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(147, 51, 234, 0.04) 1px, transparent 1px)
          `,
          backgroundSize: '24px 24px',
        }}
      >
        {chartLoading ? (
          <LoadingSkeleton className="w-full h-full rounded-2xl" />
        ) : chartType === 'pie' ? (
          <div className="w-full h-full flex items-center justify-between gap-3 p-1">
            {/* Desktop Left Side: Top 1–5 Products */}
            <div className="hidden md:flex flex-col flex-1 h-full overflow-y-auto justify-center space-y-1.5 pr-2 custom-scrollbar">
              {leftPieItems.map((item, idx) => {
                const color = CHART_COLORS[idx % CHART_COLORS.length];
                const pct = totalPieValue > 0 ? ((item.value / totalPieValue) * 100).toFixed(1) : '0';
                return (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded-xl bg-white/80 border border-gray-100/80 hover:bg-white transition-all shadow-2xs"
                  >
                    <div className="flex items-center gap-2 min-w-0 pr-1">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-sm" style={{ backgroundColor: color }} />
                      <span className="text-xs font-semibold text-gray-800 truncate" title={item.name}>
                        {item.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0 text-right">
                      <span className="text-xs font-bold text-gray-900 tabular-nums">
                        {formatPrice(item.value, currency)}
                      </span>
                      <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded-md min-w-[36px] text-center">
                        {pct}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Mobile / Shared Pie Center */}
            <div className="flex-1 md:flex-initial h-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius="50%"
                    outerRadius="78%"
                    paddingAngle={3}
                    dataKey="value"
                    animationDuration={300}
                  >
                    {pieData?.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={CHART_COLORS[index % CHART_COLORS.length]}
                        stroke="#fff"
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip currency={currency} isPie totalPieValue={totalPieValue} />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total</span>
                <span className="text-xs sm:text-sm font-extrabold text-gray-900">
                  {formatCompactNumber(totalPieValue)}
                </span>
              </div>
            </div>

            {/* Desktop Right Side: Top 6–10 Products */}
            <div className="hidden md:flex flex-col flex-1 h-full overflow-y-auto justify-center space-y-1.5 pl-2 custom-scrollbar">
              {rightPieItems.map((item, idx) => {
                const colorIndex = idx + 5;
                const color = CHART_COLORS[colorIndex % CHART_COLORS.length];
                const pct = totalPieValue > 0 ? ((item.value / totalPieValue) * 100).toFixed(1) : '0';
                return (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded-xl bg-white/80 border border-gray-100/80 hover:bg-white transition-all shadow-2xs"
                  >
                    <div className="flex items-center gap-2 min-w-0 pr-1">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-sm" style={{ backgroundColor: color }} />
                      <span className="text-xs font-semibold text-gray-800 truncate" title={item.name}>
                        {item.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0 text-right">
                      <span className="text-xs font-bold text-gray-900 tabular-nums">
                        {formatPrice(item.value, currency)}
                      </span>
                      <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded-md min-w-[36px] text-center">
                        {pct}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : chartType === 'bar' ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={mergedChartData}
              margin={{ top: 10, right: hasRightAxis ? 2 : 5, left: 0, bottom: 0 }}
              barCategoryGap="22%"
              barGap={4}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={true} stroke="rgba(147, 51, 234, 0.06)" />
              <XAxis
                dataKey="day"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 500 }}
                dy={10}
                tickFormatter={(v) => { try { return myanmarFormat(parseISO(v), 'd MMM'); } catch { return v; } }}
              />
              <YAxis
                yAxisId="left"
                orientation="left"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }}
                width={45}
                tickFormatter={formatCompactNumber}
              />
              {hasRightAxis && (
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: '#0d9488', fontWeight: 600 }}
                  width={26}
                  tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(1).replace(/\.0$/, '')}k` : v)}
                />
              )}
              <Tooltip
                content={<ChartTooltip currency={currency} />}
                cursor={{ fill: '#f8fafc' }}
                wrapperStyle={{ background: 'transparent', border: 'none', boxShadow: 'none', pointerEvents: 'none' }}
              />
              {visibleMetrics.revenue && (
                <Bar
                  yAxisId="left"
                  dataKey="revenue"
                  name="Revenue"
                  fill="#9333ea"
                  maxBarSize={28}
                  radius={[6, 6, 0, 0]}
                  animationDuration={300}
                />
              )}
              {visibleMetrics.orders && (
                <Bar
                  yAxisId="right"
                  dataKey="count"
                  name="Orders"
                  fill="#0d9488"
                  maxBarSize={28}
                  radius={[6, 6, 0, 0]}
                  animationDuration={300}
                />
              )}
              {visibleMetrics.users && (
                <Bar
                  yAxisId="right"
                  dataKey="users"
                  name="Users"
                  fill="#f43f5e"
                  maxBarSize={28}
                  radius={[6, 6, 0, 0]}
                  animationDuration={300}
                />
              )}
              {visibleMetrics.profit && (
                <Bar
                  yAxisId="left"
                  dataKey="profit"
                  name="Profit"
                  fill="#059669"
                  maxBarSize={28}
                  radius={[6, 6, 0, 0]}
                  animationDuration={300}
                />
              )}
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={mergedChartData} margin={{ top: 10, right: hasRightAxis ? 2 : 5, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#9333ea" stopOpacity={0.42} />
                  <stop offset="60%" stopColor="#c084fc" stopOpacity={0.12} />
                  <stop offset="100%" stopColor="#a855f7" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="ordGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0d9488" stopOpacity={0.38} />
                  <stop offset="60%" stopColor="#2dd4bf" stopOpacity={0.10} />
                  <stop offset="100%" stopColor="#14b8a6" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="usersGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.35} />
                  <stop offset="60%" stopColor="#fb7185" stopOpacity={0.10} />
                  <stop offset="100%" stopColor="#f43f5e" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#059669" stopOpacity={0.40} />
                  <stop offset="60%" stopColor="#34d399" stopOpacity={0.10} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={true} stroke="rgba(147, 51, 234, 0.06)" />
              <XAxis
                dataKey="day"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 500 }}
                dy={10}
                tickFormatter={(v) => { try { return myanmarFormat(parseISO(v), 'd MMM'); } catch { return v; } }}
              />
              <YAxis
                yAxisId="left"
                orientation="left"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }}
                width={45}
                tickFormatter={formatCompactNumber}
              />
              {hasRightAxis && (
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: '#0d9488', fontWeight: 600 }}
                  width={26}
                  tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(1).replace(/\.0$/, '')}k` : v)}
                />
              )}
              <Tooltip
                content={<ChartTooltip currency={currency} />}
                cursor={{ stroke: '#cbd5e1', strokeDasharray: '4 4' }}
                wrapperStyle={{ background: 'transparent', border: 'none', boxShadow: 'none', pointerEvents: 'none' }}
              />
              {visibleMetrics.revenue && (
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="revenue"
                  name="Revenue"
                  stroke="#9333ea"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#revGrad)"
                  activeDot={{ r: 6, fill: '#9333ea', stroke: '#fff', strokeWidth: 2 }}
                  animationDuration={300}
                />
              )}
              {visibleMetrics.orders && (
                <Area
                  yAxisId="right"
                  type="monotone"
                  dataKey="count"
                  name="Orders"
                  stroke="#0d9488"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#ordGrad)"
                  activeDot={{ r: 5, fill: '#0d9488', stroke: '#fff', strokeWidth: 2 }}
                  animationDuration={300}
                />
              )}
              {visibleMetrics.users && (
                <Area
                  yAxisId="right"
                  type="monotone"
                  dataKey="users"
                  name="Users"
                  stroke="#f43f5e"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#usersGrad)"
                  activeDot={{ r: 5, fill: '#f43f5e', stroke: '#fff', strokeWidth: 2 }}
                  animationDuration={300}
                />
              )}
              {visibleMetrics.profit && (
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="profit"
                  name="Profit"
                  stroke="#059669"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#profitGrad)"
                  activeDot={{ r: 6, fill: '#059669', stroke: '#fff', strokeWidth: 2 }}
                  animationDuration={300}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {quickStats && chartType !== 'pie' && (
        <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-gray-100 bg-gray-50/50 rounded-xl p-3">
          <div className="text-center">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Best Day</p>
            <p className="text-xs sm:text-sm font-bold text-gray-900 mt-0.5">
              {quickStats.bestDay ? (() => { try { return myanmarFormat(parseISO(quickStats.bestDay), 'd MMM'); } catch { return quickStats.bestDay; } })() : '—'}
            </p>
            <p className="text-[10px] text-purple-600 font-semibold">{formatPrice(quickStats.maxRevenue, currency)}</p>
          </div>
          <div className="text-center border-x border-gray-200/60 px-1">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Avg Daily</p>
            <p className="text-xs sm:text-sm font-bold text-gray-900 mt-0.5">{formatPrice(Math.round(quickStats.avgDailyRevenue), currency)}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Growth</p>
            {quickStats.growthRate !== null ? (
              <p className={`text-xs sm:text-sm font-bold mt-0.5 ${quickStats.growthRate >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {quickStats.growthRate >= 0 ? '+' : ''}{quickStats.growthRate.toFixed(1)}%
              </p>
            ) : (
              <p className="text-xs sm:text-sm font-bold mt-0.5 text-gray-300">—</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
