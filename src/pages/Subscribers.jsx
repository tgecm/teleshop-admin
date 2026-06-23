import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { getSubscribers } from '../api/superadmin';
import { Users, Search, Loader2, Calendar } from 'lucide-react';
import { useState, useMemo } from 'react';

const FILTERS = ['All', 'Paid', 'Free', 'Basic', 'Standard', 'Pro', 'Business'];

export default function Subscribers() {
  const { user } = useAuthStore();
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('Paid');

  const { data: subscribers, isLoading } = useQuery({
    queryKey: ['superadmin', 'subscribers'],
    queryFn: getSubscribers,
    enabled: user?.is_superadmin,
    refetchInterval: 30000,
  });

  const filtered = useMemo(() => {
    if (!subscribers) return [];
    const q = search.toLowerCase();
    return subscribers.filter(s => {
      // Plan filter
      const plan = s.plan_name || 'Free';
      if (planFilter === 'Paid' && plan === 'Free') return false;
      if (planFilter !== 'All' && planFilter !== 'Paid' && plan !== planFilter) return false;
      // Search filter
      return !q
        || (s.shop_name || '').toLowerCase().includes(q)
        || (s.owner_username || '').toLowerCase().includes(q)
        || (s.bot_username || '').toLowerCase().includes(q)
        || plan.toLowerCase().includes(q);
    });
  }, [subscribers, search, planFilter]);

  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const activeCount = subscribers?.filter(s => s.is_active !== false).length || 0;

  return (
    <div className="p-3 sm:p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-lg sm:text-xl font-black text-gray-900">Subscribers</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            {isLoading ? 'Loading...' : `${filtered.length} shown · ${subscribers?.length || 0} total · ${activeCount} active`}
          </p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search subscribers..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
          />
        </div>
      </div>

      {/* Plan filter tabs */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setPlanFilter(f)}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              planFilter === f
                ? f === 'Free'
                  ? 'bg-gray-200 text-gray-800 shadow-sm'
                  : f === 'Paid'
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'bg-indigo-500 text-white shadow-sm'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Table - desktop */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
        </div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="sm:hidden space-y-2">
            {filtered.length === 0 ? (
              <div className="py-12 text-center text-gray-400">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm font-medium">No subscribers found</p>
              </div>
            ) : filtered.map((s, i) => (
              <div key={s.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-3">
                <div className="flex items-start justify-between mb-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-gray-900 truncate">{s.shop_name || '—'}</p>
                    <p className="text-xs text-gray-500 truncate">{s.owner_username ? `@${s.owner_username}` : '—'}</p>
                  </div>
                  <div className="flex items-center gap-1.5 ml-2 shrink-0">
                    <span className={`inline-block px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase ${
                      s.plan_name === 'Free'
                        ? 'bg-gray-100 text-gray-500'
                        : s.plan_name === 'Basic'
                        ? 'bg-blue-50 text-blue-600'
                        : s.plan_name === 'Standard'
                        ? 'bg-indigo-50 text-indigo-600'
                        : s.plan_name === 'Pro'
                        ? 'bg-violet-50 text-violet-600'
                        : s.plan_name === 'Business'
                        ? 'bg-amber-50 text-amber-600'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {s.plan_name || 'Free'}
                    </span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      s.is_active !== false ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${s.is_active !== false ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                      {s.is_active !== false ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  {s.bot_username && <span className="text-indigo-600">@{s.bot_username}</span>}
                  <span className="flex items-center gap-1 ml-auto">
                    <Calendar className="w-3 h-3 text-gray-400" />
                    {formatDate(s.plan_start_date)} – {formatDate(s.plan_expiry)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden sm:block bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">#</th>
                    <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Shop Name</th>
                    <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Username</th>
                    <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Bot Username</th>
                    <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Plan</th>
                    <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Start Date</th>
                    <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">End Date</th>
                    <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                        <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm font-medium">No subscribers found</p>
                      </td>
                    </tr>
                  ) : filtered.map((s, i) => (
                    <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3 text-gray-400 text-xs font-mono">{i + 1}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{s.shop_name || '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{s.owner_username ? `@${s.owner_username}` : '—'}</td>
                      <td className="px-4 py-3">
                        {s.bot_username ? (
                          <span className="text-indigo-600">@{s.bot_username}</span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase ${
                          s.plan_name === 'Free'
                            ? 'bg-gray-100 text-gray-500'
                            : s.plan_name === 'Basic'
                            ? 'bg-blue-50 text-blue-600'
                            : s.plan_name === 'Standard'
                            ? 'bg-indigo-50 text-indigo-600'
                            : s.plan_name === 'Pro'
                            ? 'bg-violet-50 text-violet-600'
                            : s.plan_name === 'Business'
                            ? 'bg-amber-50 text-amber-600'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {s.plan_name || 'Free'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3 h-3 text-gray-400" />
                          {formatDate(s.plan_start_date)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs">
                        {s.plan_expiry ? (
                          <span className={`flex items-center gap-1.5 ${new Date(s.plan_expiry) < new Date() ? 'text-rose-600' : ''}`}>
                            <Calendar className="w-3 h-3" />
                            {formatDate(s.plan_expiry)}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                          s.is_active !== false
                            ? 'bg-emerald-50 text-emerald-600'
                            : 'bg-rose-50 text-rose-600'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            s.is_active !== false ? 'bg-emerald-500' : 'bg-rose-500'
                          }`} />
                          {s.is_active !== false ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
