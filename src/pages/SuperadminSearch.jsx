import React, { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAllBots } from '../api/superadmin';
import { getOrders } from '../api/orders';
import { getUsers } from '../api/customers';
import { getProducts } from '../api/products';
import { useBotStore } from '../store/botStore';
import LoadingSkeleton from '../components/shared/LoadingSkeleton';
import StatusBadge from '../components/shared/StatusBadge';
import {
  Search as SearchIcon, X, Bot, Package, ShoppingBag, Users,
  ExternalLink, ChevronRight, Loader2, Clock,
} from 'lucide-react';
import { motion } from 'motion/react';
import { format } from 'date-fns';

const SEARCH_TABS = [
  { key: 'all', label: 'All', icon: SearchIcon },
  { key: 'bots', label: 'Bots', icon: Bot },
  { key: 'orders', label: 'Orders', icon: ShoppingBag },
  { key: 'products', label: 'Products', icon: Package },
  { key: 'customers', label: 'Customers', icon: Users },
];

export default function SuperadminSearch() {
  const { setSelectedBot } = useBotStore();
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Debounce search
  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  const searchTerm = debouncedQuery.trim().toLowerCase();
  const enabled = searchTerm.length >= 2;

  // Queries only fire when search is active
  const { data: allBots } = useQuery({
    queryKey: ['superadmin', 'all-bots'],
    queryFn: getAllBots,
    enabled,
  });

  const { data: allOrders, isLoading: ordersLoading } = useQuery({
    queryKey: ['superadmin', 'all-orders'],
    queryFn: () => getOrders({ limit: 200, sort: 'created_at', order: 'desc' }),
    enabled: enabled && (activeTab === 'all' || activeTab === 'orders'),
  });

  const { data: allUsers } = useQuery({
    queryKey: ['superadmin', 'all-users'],
    queryFn: () => getUsers({ limit: 500 }),
    enabled: enabled && (activeTab === 'all' || activeTab === 'customers'),
  });

  // Memoized search results
  const results = useMemo(() => {
    if (!searchTerm) return { bots: [], orders: [], products: [], customers: [] };

    const bots = (allBots || []).filter(b =>
      b.bot_username?.toLowerCase().includes(searchTerm) ||
      b.bot_full_name?.toLowerCase().includes(searchTerm) ||
      String(b.id) === searchTerm
    ).slice(0, 10);

    const orders = (allOrders || []).filter(o =>
      o.customer?.first_name?.toLowerCase().includes(searchTerm) ||
      o.customer?.username?.toLowerCase().includes(searchTerm) ||
      o.buyer_snapshot?.name?.toLowerCase().includes(searchTerm) ||
      o.buyer_snapshot?.phone?.includes(searchTerm) ||
      String(o.id) === searchTerm
    ).slice(0, 10);

    const customers = (allUsers || []).filter(u =>
      u.first_name?.toLowerCase().includes(searchTerm) ||
      u.username?.toLowerCase().includes(searchTerm) ||
      u.phone_number?.includes(searchTerm)
    ).slice(0, 10);

    // Products - search within each bot's products (limited)
    // Since there's no global products endpoint, we search from cached data

    return { bots, orders, products: [], customers };
  }, [searchTerm, allBots, allOrders, allUsers]);

  const totalResults = results.bots.length + results.orders.length + results.customers.length;

  const handleOpenBot = (botId) => {
    setSelectedBot(botId);
    window.location.href = '/dashboard';
  };

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <div className="relative">
          <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search bots, orders, customers across the entire platform..."
            autoFocus
            className="w-full pl-11 pr-10 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-base outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
          />
          {query && (
            <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Tab filters */}
        {enabled && (
          <div className="flex gap-1 mt-3 bg-gray-100 p-0.5 rounded-xl">
            {SEARCH_TABS.map(t => (
              <button key={t.key} onClick={() => setActiveTab(t.key)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold rounded-lg transition-all ${
                  activeTab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}>
                <t.icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Results */}
      {!enabled && query.length > 0 && (
        <div className="text-center py-8 text-sm text-gray-400">Type at least 2 characters to search</div>
      )}

      {!query && (
        <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
          <SearchIcon className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Search across all bots</p>
          <p className="text-xs text-gray-400 mt-1">Find bots, orders, customers from the entire platform</p>
        </div>
      )}

      {enabled && (
        <div className="space-y-4">
          {totalResults === 0 && (
            <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
              <SearchIcon className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No results for "{searchTerm}"</p>
              <p className="text-xs text-gray-400 mt-1">Try a different search term</p>
            </div>
          )}

          {/* Bots */}
          {(activeTab === 'all' || activeTab === 'bots') && results.bots.length > 0 && (
            <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2"><Bot className="w-4 h-4 text-gray-500" /><span className="text-sm font-bold text-gray-900">Bots</span></div>
                <span className="text-xs text-gray-400">{results.bots.length} found</span>
              </div>
              {results.bots.map(b => (
                <div key={b.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer border-b border-gray-50 last:border-0"
                  onClick={() => handleOpenBot(b.id)}>
                  <div className="w-9 h-9 rounded-xl bg-gray-100 text-gray-600 flex items-center justify-center font-bold text-sm flex-shrink-0">
                    {b.bot_username?.[0]?.toUpperCase() || 'B'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900">{b.bot_full_name || b.bot_username || `Bot #${b.id}`}</p>
                    <p className="text-[11px] text-gray-500">@{b.bot_username || 'no_username'} · ID: {b.id} · {b.plan_name || 'Free'} plan</p>
                  </div>
                  <ExternalLink className="w-4 h-4 text-gray-300 flex-shrink-0" />
                </div>
              ))}
            </section>
          )}

          {/* Orders */}
          {(activeTab === 'all' || activeTab === 'orders') && results.orders.length > 0 && (
            <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2"><ShoppingBag className="w-4 h-4 text-gray-500" /><span className="text-sm font-bold text-gray-900">Orders</span></div>
                <span className="text-xs text-gray-400">{results.orders.length} found</span>
              </div>
              {results.orders.map(o => (
                <div key={o.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0">
                  <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs flex-shrink-0">
                    #{String(o.id).slice(-4)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-gray-900">{o.buyer_snapshot?.name || o.customer?.first_name || 'Customer'}</span>
                      <StatusBadge status={o.status} />
                    </div>
                    <p className="text-[11px] text-gray-500">{(o.total_amount || o.amount || 0).toLocaleString()} MMK · {o.created_at ? format(new Date(o.created_at), 'MMM d, yyyy') : ''}</p>
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0">#{o.id}</span>
                </div>
              ))}
            </section>
          )}

          {/* Customers */}
          {(activeTab === 'all' || activeTab === 'customers') && results.customers.length > 0 && (
            <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2"><Users className="w-4 h-4 text-gray-500" /><span className="text-sm font-bold text-gray-900">Customers</span></div>
                <span className="text-xs text-gray-400">{results.customers.length} found</span>
              </div>
              {results.customers.map(u => (
                <div key={u.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0">
                  <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold text-sm flex-shrink-0">
                    {u.first_name?.[0] || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900">{u.first_name || 'Unknown'}{u.last_name ? ` ${u.last_name}` : ''}</p>
                    <p className="text-[11px] text-gray-500">
                      {u.username ? `@${u.username}` : ''}
                      {u.phone_number ? ` · ${u.phone_number}` : ''}
                      {u.email ? ` · ${u.email}` : ''}
                    </p>
                  </div>
                  <span className="text-xs text-gray-400">{u.order_count || 0} orders</span>
                </div>
              ))}
            </section>
          )}
        </div>
      )}
    </div>
  );
}
