import React, { useState, useCallback, useReducer } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { getUsers, updateUser, getWebCustomers } from '../api/customers';
import { initiateWebVisitorChat } from '../api/chats';
import { getOrders } from '../api/orders';
import { useBotStore } from '../store/botStore';
import { useToastStore } from '../store/toastStore';
import { useSelectedBot } from '../hooks/useSelectedBot';
import { formatPrice } from '../utils/formatPrice';
import LoadingSkeleton from '../components/shared/LoadingSkeleton';
import ConfirmDialog from '../components/shared/ConfirmDialog';
import PullToRefresh from '../components/shared/PullToRefresh';
import {
  Search, User, ShoppingBag, Ban, MessageSquare, Clock,
  ShieldAlert, ShieldCheck, Loader2, Phone, Mail, MapPin, X,
  Package, Hash, DollarSign, ChevronDown, Globe, Smartphone,
  AtSign, MessageCircle, FileText, Copy, Award, Star, Crown, Sparkles, Trophy
} from 'lucide-react';
import { myanmarFormat } from '../utils/date';
import { motion, AnimatePresence } from 'motion/react';

import { API_BASE } from '../api/config';

function GoogleIcon({ className = "w-3 h-3" }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
    </svg>
  );
}

function TelegramIcon({ className = "w-3 h-3 text-[#2AABEE]" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  );
}

export default function Customers() {
  const navigate = useNavigate();
  const { selectedBotId } = useBotStore();
  const { selectedBot } = useSelectedBot();
  const { addToast } = useToastStore();
  const queryClient = useQueryClient();
  const [section, setSection] = useState('telegram');
  const [loyalSort, setLoyalSort] = useState('spent'); // 'spent' | 'orders'
  const [loyalLimit, setLoyalLimit] = useState(25);
  const [search, setSearch] = useState('');
  const [filterTab, setFilterTab] = useState('all');
  const [webFilterTab, setWebFilterTab] = useState('all');
  const [confirmCustomer, setConfirmCustomer] = useState(null);
  const [detailCustomer, setDetailCustomer] = useState(null);
  const [brokenImages, addBrokenImage] = useReducer((state, id) => state.add(id) && state, new Set());

  const { data: customers, isLoading: customersLoading, refetch: refetchCustomers } = useQuery({
    queryKey: ['users', 'customers', selectedBotId],
    queryFn: () => getUsers({ bot_id: Number(selectedBotId) }),
    enabled: !!selectedBotId && (section === 'telegram' || section === 'loyal'),
    refetchInterval: 10000,
    placeholderData: (prev) => prev,
  });

  const { data: webCustomers, isLoading: webLoading, refetch: refetchWeb } = useQuery({
    queryKey: ['web-customers', selectedBotId],
    queryFn: () => getWebCustomers(Number(selectedBotId)),
    enabled: !!selectedBotId,
    placeholderData: (prev) => prev,
  });

  const handleRefresh = useCallback(async () => {
    if (section === 'telegram') {
      await refetchCustomers();
      queryClient.invalidateQueries({ queryKey: ['orders', selectedBotId] });
    } else {
      await refetchWeb();
    }
  }, [section, refetchCustomers, refetchWeb, queryClient, selectedBotId]);

  const { data: orders } = useQuery({
    queryKey: ['orders', selectedBotId, 'all_loyal'],
    queryFn: () => getOrders({ bot_id: Number(selectedBotId), limit: 1000 }),
    enabled: !!selectedBotId,
    placeholderData: (prev) => prev,
  });

  const toggleBlockMutation = useMutation({
    mutationFn: ({ id, is_blocked }) => updateUser(id, { is_support_blocked: is_blocked }),
    onSuccess: (_, variables) => {
      queryClient.setQueryData(['users', 'customers', selectedBotId], (old) => {
        if (!old) return old;
        return old.map(c => c.id === variables.id ? { ...c, is_blocked: variables.is_blocked } : c);
      });
      addToast(variables.is_blocked ? 'Customer blocked' : 'Customer unblocked');
    },
    onError: () => addToast('Failed to update customer status', 'error'),
  });

  const getCustomerOrders = (customer) => {
    if (!orders || !customer) return [];
    if (customer.ordersList && Array.isArray(customer.ordersList) && customer.ordersList.length > 0) {
      return customer.ordersList;
    }
    const custEmail = (customer.email || '').trim().toLowerCase();
    const custTgId = customer.telegram_id ? String(customer.telegram_id) : '';
    const rawFb = (customer.firebase_uid || customer.conversation_id_web || customer.uid || '').trim();
    const cleanFb = rawFb.replace(/^web_tg_/, '').replace(/^web_/, '').replace(/^tg_/, '');
    const altTgId = custTgId || (cleanFb && /^\d+$/.test(cleanFb) ? cleanFb : '');

    return orders.filter(o => {
      const bs = o.buyer_snapshot || {};
      const orderEmail = (bs.email || o.email || '').trim().toLowerCase();
      if (custEmail && orderEmail && orderEmail === custEmail) return true;

      const orderTgId = String(bs.telegram_id || o.user_id || '').trim();
      if (altTgId && orderTgId && orderTgId === altTgId) return true;

      const orderFb = String(bs.firebase_uid || o.visitor_id || '').trim();
      const cleanOrderFb = orderFb.replace(/^web_tg_/, '').replace(/^web_/, '').replace(/^tg_/, '');
      if (cleanFb && cleanOrderFb && cleanFb === cleanOrderFb) return true;

      return false;
    });
  };

  const getCustomerOrderCount = (customer) => getCustomerOrders(customer).length;

  // Combine and rank Loyal Customers across Telegram and Website
  const loyalCustomersList = React.useMemo(() => {
    if (!orders) return [];

    const map = new Map();

    const getEntry = (key, initialObj) => {
      if (!map.has(key)) {
        map.set(key, {
          ...initialObj,
          totalSpent: 0,
          totalOrders: 0,
          ordersList: [],
        });
      }
      return map.get(key);
    };

    const getCustomerKey = (c) => {
      const email = c.email ? String(c.email).trim().toLowerCase() : '';
      if (email) return `email_${email}`;
      if (c.telegram_id) return `tg_${c.telegram_id}`;
      if (c.firebase_uid) return `fb_${c.firebase_uid}`;
      return `id_${c.id}`;
    };

    const tgList = customers || [];
    const webList = webCustomers || [];

    // Map Telegram customers
    tgList.forEach(c => {
      const key = getCustomerKey(c);
      getEntry(key, {
        id: c.id,
        telegram_id: c.telegram_id,
        firebase_uid: c.firebase_uid,
        name: c.display_name || c.first_name || (c.username ? `@${c.username}` : 'Telegram User'),
        display_name: c.display_name || c.first_name || 'Telegram User',
        username: c.username,
        email: c.email,
        phone: c.phone || c.phone_number,
        photo_url: c.photo_url,
        channel: 'telegram',
        raw: c,
        totalSpent: Number(c.total_spent || 0),
        totalOrders: Number(c.total_orders || 0),
      });
    });

    // Map Website customers
    webList.forEach(c => {
      const key = getCustomerKey(c);

      if (map.has(key)) {
        const existing = map.get(key);
        if (c.display_name && (existing.name === 'Telegram User' || existing.name === 'Website User' || !existing.name)) {
          existing.name = c.display_name;
        }
        if (!existing.email && c.email) existing.email = c.email;
        if (!existing.firebase_uid && c.firebase_uid) existing.firebase_uid = c.firebase_uid;
        if (Number(c.total_spent || 0) > existing.totalSpent) existing.totalSpent = Number(c.total_spent || 0);
        if (Number(c.total_orders || 0) > existing.totalOrders) existing.totalOrders = Number(c.total_orders || 0);
      } else {
        getEntry(key, {
          id: c.id,
          firebase_uid: c.firebase_uid,
          telegram_id: c.telegram_id,
          name: c.display_name || (c.email ? c.email.split('@')[0] : 'Website User'),
          display_name: c.display_name || 'Website User',
          email: c.email,
          phone: c.phone,
          photo_url: c.photo_url,
          channel: c.telegram_id ? 'telegram' : 'website',
          raw: c,
          totalSpent: Number(c.total_spent || 0),
          totalOrders: Number(c.total_orders || 0),
        });
      }
    });

    // Sum totals from non-cancelled orders
    orders.forEach(o => {
      if (o.status === 'cancelled' || o.status === 'rejected' || o.status === 'payment_failed') return;
      const bs = o.buyer_snapshot || {};
      const email = (bs.email || o.email || '').trim().toLowerCase();
      const tgId = bs.telegram_id || o.user_id;
      const fbUid = bs.firebase_uid;

      let matchedKey = null;

      if (email && map.has(`email_${email}`)) {
        matchedKey = `email_${email}`;
      } else if (tgId && map.has(`tg_${tgId}`)) {
        matchedKey = `tg_${tgId}`;
      } else if (fbUid && map.has(`fb_${fbUid}`)) {
        matchedKey = `fb_${fbUid}`;
      }

      if (matchedKey) {
        const entry = map.get(matchedKey);
        const amount = Number(o.final_amount || o.total_amount || 0);
        entry.ordersList.push(o);
        // Recalculate from orders if orders list exists
        if (entry.ordersList.length === 1 && (entry.totalSpent === 0 || entry.totalOrders === 0)) {
          entry.totalSpent = amount;
          entry.totalOrders = 1;
        } else {
          // Check if dynamically summing orders gives larger total than static field
          const orderSum = entry.ordersList.reduce((s, ord) => s + Number(ord.final_amount || ord.total_amount || 0), 0);
          if (orderSum > entry.totalSpent) {
            entry.totalSpent = orderSum;
          }
          if (entry.ordersList.length > entry.totalOrders) {
            entry.totalOrders = entry.ordersList.length;
          }
        }
      } else if (bs.name || bs.full_name || email || tgId) {
        const anonKey = email ? `email_${email}` : tgId ? `tg_${tgId}` : fbUid ? `fb_${fbUid}` : `anon_${o.id}`;
        const entry = getEntry(anonKey, {
          id: o.id,
          telegram_id: tgId,
          firebase_uid: fbUid,
          name: bs.full_name || bs.name || (email ? email.split('@')[0] : 'Customer'),
          display_name: bs.full_name || bs.name || 'Customer',
          email: email,
          phone: bs.phone,
          channel: tgId ? 'telegram' : 'website',
          raw: o,
        });
        const amount = Number(o.final_amount || o.total_amount || 0);
        entry.totalSpent += amount;
        entry.totalOrders += 1;
        entry.ordersList.push(o);
      }
    });

    let result = Array.from(map.values()).filter(c => c.totalOrders > 0 || c.totalSpent > 0);

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(c =>
        (c.name && c.name.toLowerCase().includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.username && c.username.toLowerCase().includes(q)) ||
        (c.phone && c.phone.includes(q))
      );
    }

    if (loyalSort === 'orders') {
      result.sort((a, b) => b.totalOrders - a.totalOrders || b.totalSpent - a.totalSpent);
    } else {
      result.sort((a, b) => b.totalSpent - a.totalSpent || b.totalOrders - a.totalOrders);
    }

    return result.slice(0, loyalLimit);
  }, [customers, webCustomers, orders, loyalSort, loyalLimit, search]);

  const profileUid = detailCustomer?.telegram_id
    ? String(detailCustomer.telegram_id)
    : detailCustomer?.firebase_uid || detailCustomer?.uid || detailCustomer?.email || '';

  const { data: customerProfile } = useQuery({
    queryKey: ['customer-profile', selectedBotId, profileUid],
    queryFn: () =>
      fetch(`${API_BASE}/api/customer-profile?bot_id=${selectedBotId}&uid=${encodeURIComponent(profileUid)}`)
        .then(r => r.ok ? r.json() : null),
    enabled: !!selectedBotId && !!profileUid && !!detailCustomer,
    staleTime: 30000,
  });

  const handleCopyProfile = () => {
    if (!detailCustomer) return;
    const c = detailCustomer;
    const p = customerProfile;
    const lines = [
      `Name: ${p?.display_name || c.display_name || c.first_name || '—'}`,
      `Phone: ${p?.phone || c.phone || c.phone_number || '—'}`,
      `Email: ${p?.email || c.email || '—'}`,
      `Telegram: ${p?.telegram_username || c.telegram_username || c.username || '—'}`,
      `Viber: ${p?.viber_number || c.viber_number || '—'}`,
      `Address: ${p?.address || c.address || '—'}`,
      `Notes: ${p?.notes || c.notes || '—'}`,
    ];
    if (c.telegram_id) lines.unshift(`Telegram ID: ${c.telegram_id}`);
    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      addToast('Profile copied to clipboard');
    }).catch(() => {
      addToast('Failed to copy', 'error');
    });
  };

  const hiddenIds = [];
  const filteredCustomers = customers?.filter(c => {
    if (filterTab === 'blocked' && !c.is_blocked) return false;
    const term = search.toLowerCase();
    return (
      c.first_name?.toLowerCase().includes(term) ||
      c.username?.toLowerCase().includes(term) ||
      c.telegram_id?.toString().includes(term)
    );
  }) || [];

  const googleCount = webCustomers?.filter(c => !c.telegram_id && !(c.firebase_uid || '').startsWith('web_tg_') && !(c.firebase_uid || '').startsWith('tg_')).length || 0;
  const telegramWebCount = webCustomers?.filter(c => !!c.telegram_id || (c.firebase_uid || '').startsWith('web_tg_') || (c.firebase_uid || '').startsWith('tg_')).length || 0;

  const filteredWebCustomers = webCustomers?.filter(c => {
    const isTg = !!c.telegram_id || (c.firebase_uid || '').startsWith('web_tg_') || (c.firebase_uid || '').startsWith('tg_');
    if (webFilterTab === 'google' && isTg) return false;
    if (webFilterTab === 'telegram' && !isTg) return false;

    const term = search.toLowerCase();
    return (
      c.display_name?.toLowerCase().includes(term) ||
      c.email?.toLowerCase().includes(term) ||
      c.firebase_uid?.toLowerCase().includes(term)
    );
  }) || [];

  const isLoading = section === 'telegram' ? customersLoading : webLoading;

  if (isLoading && section === 'telegram') return <LoadingSkeleton type="list" count={6} />;

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-lg sm:text-2xl lg:text-3xl font-bold text-gray-900">Customers</h1>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search customers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm transition-all text-sm"
          />
        </div>
      </div>

      {/* Section Tabs */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-2xl p-1 w-full sm:w-fit mb-3 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setSection('telegram')}
          className={`flex items-center justify-center gap-1 px-2.5 sm:px-4 py-1.5 sm:py-2 text-[11px] sm:text-xs font-bold rounded-xl transition-all whitespace-nowrap flex-1 sm:flex-initial ${
            section === 'telegram'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Smartphone className="w-3.5 h-3.5 flex-shrink-0" />
          <span>Telegram ({customers?.filter(c => !hiddenIds.includes(Number(c.telegram_id))).length || 0})</span>
        </button>
        <button
          onClick={() => setSection('website')}
          className={`flex items-center justify-center gap-1 px-2.5 sm:px-4 py-1.5 sm:py-2 text-[11px] sm:text-xs font-bold rounded-xl transition-all whitespace-nowrap flex-1 sm:flex-initial ${
            section === 'website'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Globe className="w-3.5 h-3.5 flex-shrink-0" />
          <span>Website ({webCustomers?.length || 0})</span>
        </button>
        <button
          onClick={() => setSection('loyal')}
          className={`flex items-center justify-center gap-1 px-2.5 sm:px-4 py-1.5 sm:py-2 text-[11px] sm:text-xs font-bold rounded-xl transition-all whitespace-nowrap flex-1 sm:flex-initial ${
            section === 'loyal'
              ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-sm ring-1 ring-amber-400'
              : 'text-amber-700 hover:text-amber-800 hover:bg-amber-50'
          }`}
        >
          <span>👑 Loyal Customers</span>
        </button>
      </div>

      {/* Telegram filter tabs */}
      {section === 'telegram' && (
        <div className="flex gap-1 bg-gray-100 rounded-xl p-0.5 w-fit -mt-2 mb-3">
          <button
            onClick={() => setFilterTab('all')}
            className={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all ${
              filterTab === 'all'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            All ({customers?.length || 0})
          </button>
          <button
            onClick={() => setFilterTab('blocked')}
            className={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all flex items-center gap-1 ${
              filterTab === 'blocked'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Ban className="w-3 h-3" />
            Blocked ({customers?.filter(c => !hiddenIds.includes(Number(c.telegram_id)) && c.is_blocked)?.length || 0})
          </button>
        </div>
      )}

      {/* Telegram Customers */}
      {section === 'telegram' && (
        <PullToRefresh onRefresh={handleRefresh}>
        {filteredCustomers.length === 0 ? (
          <div className="bg-white rounded-[32px] p-12 text-center border border-dashed border-gray-200">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="w-8 h-8 text-gray-300" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">No customers found</h3>
            <p className="text-sm text-gray-500 max-w-xs mx-auto mt-1">
              {search ? "Try a different search term." : "Customers will appear here once they interact with your bot."}
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {filteredCustomers.map(customer => (
              <motion.div
                layout
                key={customer.id}
                className={`contain-content bg-white p-4 rounded-2xl shadow-sm border transition-all ${customer.is_blocked ? 'border-rose-100 bg-rose-50/30' : 'border-gray-100'}`}
              >
                <button
                  onClick={() => setDetailCustomer(customer)}
                  className="w-full text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center font-bold text-base sm:text-lg flex-shrink-0 shadow-sm ${customer.is_blocked ? 'bg-rose-100 text-rose-600' : 'bg-indigo-100 text-indigo-600'}`}>
                      {customer.first_name?.[0] || '?'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-bold text-gray-900 truncate max-w-[160px] sm:max-w-none">{customer.first_name}</p>
                        {customer.is_blocked && (
                          <span className="px-1.5 py-0.5 bg-rose-100 text-rose-600 text-[8px] font-bold uppercase rounded-md flex items-center gap-1 border border-rose-200">
                            <Ban className="w-2 h-2" /> Blocked
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span className="truncate">@{customer.username || 'no_username'}</span>
                        <span className="text-gray-300">·</span>
                        <span className="flex items-center gap-1 whitespace-nowrap">
                          <ShoppingBag className="w-3 h-3 text-indigo-600" />
                          {getCustomerOrderCount(customer)} orders
                        </span>
                      </div>
                    </div>
                    <ChevronDown className="w-4 h-4 text-gray-300 flex-shrink-0" />
                  </div>
                </button>
              </motion.div>
            ))}
          </div>
        )}
        </PullToRefresh>
      )}

      {/* Website Customers */}
      {section === 'website' && (
        <PullToRefresh onRefresh={handleRefresh}>
          {/* Website Sub-filter tabs */}
          <div className="flex gap-1 bg-gray-100 rounded-xl p-0.5 w-fit -mt-2 mb-3">
            <button
              onClick={() => setWebFilterTab('all')}
              className={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all ${
                webFilterTab === 'all'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              All ({webCustomers?.length || 0})
            </button>
            <button
              onClick={() => setWebFilterTab('google')}
              className={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                webFilterTab === 'google'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <GoogleIcon className="w-3 h-3" /> Google ({googleCount})
            </button>
            <button
              onClick={() => setWebFilterTab('telegram')}
              className={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                webFilterTab === 'telegram'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <TelegramIcon className="w-3 h-3 text-[#2AABEE]" /> Telegram ({telegramWebCount})
            </button>
          </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
          </div>
        ) : filteredWebCustomers.length === 0 ? (
          <div className="bg-white rounded-[32px] p-12 text-center border border-dashed border-gray-200">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Globe className="w-8 h-8 text-gray-300" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">No website customers yet</h3>
            <p className="text-sm text-gray-500 max-w-xs mx-auto mt-1">
              {search ? "Try a different search term." : "Customers who sign up on your website will appear here."}
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {filteredWebCustomers.map(customer => {
              const isTg = !!customer.telegram_id || (customer.firebase_uid || '').startsWith('web_tg_') || (customer.firebase_uid || '').startsWith('tg_');
              return (
                <motion.div
                  layout
                  key={customer.id}
                  className="contain-content bg-white p-4 rounded-2xl shadow-sm border border-gray-100"
                >
                  <button
                    onClick={() => setDetailCustomer(customer)}
                    className="w-full text-left"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center font-bold text-base sm:text-lg flex-shrink-0 shadow-sm bg-gradient-to-br from-emerald-100 to-teal-100 text-emerald-600 overflow-hidden">
                        {customer.photo_url && !brokenImages.has(customer.id) ? (
                          <img src={customer.photo_url} alt="" onError={() => addBrokenImage(customer.id)} className="w-full h-full object-cover" />
                        ) : (
                          customer.display_name?.[0]?.toUpperCase() || 'W'
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-bold text-gray-900 truncate max-w-[160px] sm:max-w-none">{customer.display_name || 'Website User'}</p>
                          {isTg ? (
                            <span className="px-2 py-0.5 bg-sky-50 text-sky-700 text-[10px] font-bold rounded-md flex items-center gap-1 border border-sky-200/60">
                              <TelegramIcon className="w-3 h-3 text-[#2AABEE]" /> Telegram
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-gray-50 text-gray-700 text-[10px] font-bold rounded-md flex items-center gap-1 border border-gray-200">
                              <GoogleIcon className="w-3 h-3" /> Google
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500 flex-wrap">
                          {customer.email && <span className="truncate">{customer.email}</span>}
                          <span className="text-gray-300">·</span>
                          <span className="font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60">
                            {customer.points_balance || 0} Points
                          </span>
                          {customer.created_at && (
                            <>
                              <span className="text-gray-300">·</span>
                              <span className="whitespace-nowrap">Joined {myanmarFormat(customer.created_at, 'MMM d')}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <ChevronDown className="w-4 h-4 text-gray-300 flex-shrink-0" />
                    </div>
                  </button>
                </motion.div>
              );
            })}
          </div>
        )}
        </PullToRefresh>
      )}

      {/* Loyal Customers Leaderboard */}
      {section === 'loyal' && (
        <PullToRefresh onRefresh={handleRefresh}>
          {/* Sub-filter Controls */}
          <div className="flex items-center justify-between gap-3 bg-gradient-to-r from-amber-50/90 to-amber-100/60 border border-amber-200/80 rounded-2xl p-3 mb-4 shadow-xs">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-amber-900 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Sort By:
              </span>
              <div className="flex bg-white/90 rounded-xl p-0.5 border border-amber-200/60 shadow-xs">
                <button
                  onClick={() => setLoyalSort('spent')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                    loyalSort === 'spent'
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  💰 Spent
                </button>
                <button
                  onClick={() => setLoyalSort('orders')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                    loyalSort === 'orders'
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  📦 Frequent
                </button>
              </div>
            </div>
          </div>

          {/* Leaderboard Cards */}
          {loyalCustomersList.length === 0 ? (
            <div className="bg-white rounded-[32px] p-12 text-center border border-dashed border-amber-200/80">
              <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Crown className="w-8 h-8 text-amber-400" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">No Loyal Customers found yet</h3>
              <p className="text-sm text-gray-500 max-w-xs mx-auto mt-1">
                {search ? "Try a different search term." : "Customers will appear here automatically as they place completed orders."}
              </p>
            </div>
          ) : (
            <div className="grid gap-3">
              {loyalCustomersList.map((customer, index) => {
                const rank = index + 1;
                const isTop1 = rank === 1;
                const isTop2 = rank === 2;
                const isTop3 = rank === 3;

                return (
                  <motion.div
                    layout
                    key={customer.id || index}
                    onClick={() => setDetailCustomer(customer)}
                    className={`bg-white rounded-2xl p-4 border transition-all duration-200 hover:shadow-md cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isTop1
                        ? 'border-amber-300 bg-gradient-to-r from-amber-50/50 via-white to-amber-50/20 ring-1 ring-amber-300/60 shadow-xs'
                        : isTop2
                        ? 'border-slate-300 bg-slate-50/30'
                        : isTop3
                        ? 'border-amber-700/20 bg-amber-900/5'
                        : 'border-gray-100 hover:border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      {/* Rank Icon */}
                      <div className="flex-shrink-0 flex items-center justify-center">
                        {isTop1 ? (
                          <div className="w-9 h-9 rounded-2xl bg-amber-400 text-white flex items-center justify-center font-black text-sm shadow-md ring-2 ring-amber-200">
                            👑
                          </div>
                        ) : isTop2 ? (
                          <div className="w-9 h-9 rounded-2xl bg-slate-300 text-slate-800 flex items-center justify-center font-black text-xs shadow-xs">
                            🥈
                          </div>
                        ) : isTop3 ? (
                          <div className="w-9 h-9 rounded-2xl bg-amber-700/80 text-white flex items-center justify-center font-black text-xs shadow-xs">
                            🥉
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-xl bg-gray-100 text-gray-500 flex items-center justify-center font-bold text-xs">
                            #{rank}
                          </div>
                        )}
                      </div>

                      {/* Customer Avatar */}
                      <div className="flex-shrink-0">
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold text-sm flex items-center justify-center shadow-xs overflow-hidden">
                          {customer.photo_url ? (
                            <img src={customer.photo_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span>{(customer.name || 'C')[0].toUpperCase()}</span>
                          )}
                        </div>
                      </div>

                      {/* Info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-bold text-gray-900 truncate max-w-[200px] sm:max-w-[320px]">
                            {customer.name}
                          </h4>
                          {isTop1 && (
                            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 bg-amber-400 text-amber-950 rounded-full shadow-xs">
                              👑 Royal VIP #1
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500 flex-wrap mt-0.5">
                          {customer.email && <span className="truncate max-w-[220px] sm:max-w-[320px]">{customer.email}</span>}
                          {customer.username && <span className="truncate text-sky-600">@{customer.username}</span>}
                          {customer.phone && <span className="truncate">{customer.phone}</span>}
                        </div>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-3 sm:gap-5 justify-between sm:justify-end border-t sm:border-t-0 pt-2.5 sm:pt-0 border-gray-100 flex-shrink-0">
                      <div className="text-left sm:text-right">
                        <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Total Spent</p>
                        <p className="text-sm font-black text-indigo-600">
                          {formatPrice(customer.totalSpent, selectedBot?.currency || 'MMK')}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Orders</p>
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200/60">
                          <ShoppingBag className="w-3 h-3 text-amber-500" />
                          {customer.totalOrders} order{customer.totalOrders !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </PullToRefresh>
      )}

      <ConfirmDialog
        open={!!confirmCustomer}
        onClose={() => setConfirmCustomer(null)}
        onConfirm={() => {
          if (confirmCustomer) {
            toggleBlockMutation.mutate({ id: confirmCustomer.id, is_blocked: !confirmCustomer.is_blocked });
            setConfirmCustomer(null);
          }
        }}
        title={confirmCustomer?.is_blocked ? 'Unblock Customer' : 'Block Customer'}
        message={`Are you sure you want to ${confirmCustomer?.is_blocked ? 'unblock' : 'block'} this customer?`}
        confirmText={confirmCustomer?.is_blocked ? 'Unblock' : 'Block'}
        variant={confirmCustomer?.is_blocked ? 'warning' : 'danger'}
        loading={toggleBlockMutation.isPending}
      />

      <AnimatePresence>
        {detailCustomer && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setDetailCustomer(null)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[70]"
            />
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300, mass: 1 }}
              className="fixed bottom-0 left-0 right-0 z-[80] bg-white rounded-t-[28px] shadow-2xl max-h-[85vh] flex flex-col md:max-w-xl md:mx-auto md:top-1/2 md:-translate-y-1/2 md:bottom-auto md:max-h-[90vh] md:rounded-[32px]"
            >
              <div className="flex justify-center pt-3 pb-1 md:hidden">
                <div className="w-9 h-1 bg-gray-200 rounded-full" />
              </div>

              <div className="flex items-center justify-between px-6 pb-3 border-b border-gray-100 gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg shadow-sm overflow-hidden shrink-0 ${
                    detailCustomer.telegram_id
                      ? detailCustomer.is_blocked ? 'bg-rose-100 text-rose-600' : 'bg-indigo-100 text-indigo-600'
                      : 'bg-gradient-to-br from-emerald-100 to-teal-100 text-emerald-600'
                  }`}>
                    {detailCustomer.photo_url || customerProfile?.photo_url ? (
                      <img src={detailCustomer.photo_url || customerProfile?.photo_url} alt="" onError={() => addBrokenImage(detailCustomer.id)} className="w-full h-full object-cover" />
                    ) : (customerProfile?.display_name && customerProfile.display_name.trim()) ? (
                      customerProfile.display_name[0]?.toUpperCase()
                    ) : (detailCustomer.name || detailCustomer.display_name || detailCustomer.first_name) ? (
                      (detailCustomer.name || detailCustomer.display_name || detailCustomer.first_name)[0]?.toUpperCase()
                    ) : (
                      '?'
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-lg font-bold text-gray-900 truncate">
                      {(customerProfile?.display_name && customerProfile.display_name.trim() && customerProfile.display_name.trim() !== 'User')
                        ? customerProfile.display_name.trim()
                        : (detailCustomer.name || detailCustomer.display_name || detailCustomer.first_name || 'User')}
                    </h3>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={async () => {
                      const tgId = detailCustomer.telegram_id || detailCustomer.user_id;
                      const isWebSection = section === 'website' || (section === 'loyal' && detailCustomer.channel === 'website');

                      if (tgId) {
                        const custName = (customerProfile?.display_name && customerProfile.display_name.trim()) || detailCustomer.name || detailCustomer.display_name || detailCustomer.first_name || 'Customer';
                        navigate('/chats', { state: { conversationId: `tg_${tgId}`, userId: Number(tgId), name: custName, tab: 'telegram' } });
                        setDetailCustomer(null);
                        return;
                      }

                      try {
                        const targetUid = detailCustomer.conversation_id_web || detailCustomer.firebase_uid || detailCustomer.visitor_id || detailCustomer.uid || (detailCustomer.telegram_id ? `web_tg_${detailCustomer.telegram_id}` : '') || String(detailCustomer.id || '');
                        const targetName = (customerProfile?.display_name && customerProfile.display_name.trim()) || detailCustomer.display_name || detailCustomer.name || detailCustomer.first_name || 'Website Customer';
                        const res = await initiateWebVisitorChat(selectedBotId, {
                          firebaseUid: targetUid,
                          visitorId: targetUid,
                          name: targetName,
                          phone: detailCustomer.phone || detailCustomer.phone_number || '',
                          email: detailCustomer.email || '',
                        });
                        const finalVisitorId = res.visitor_id || targetUid;
                        const convId = String(finalVisitorId).startsWith('web_') ? String(finalVisitorId) : `web_${finalVisitorId}`;
                        navigate('/chats', { state: { conversationId: convId, visitorId: finalVisitorId, name: targetName, tab: 'web' } });
                        setDetailCustomer(null);
                      } catch (err) {
                        addToast('Failed to open chat with customer', 'error');
                      }
                    }}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[11px] font-bold flex items-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    Send Message
                  </button>
                  <button onClick={handleCopyProfile}
                    className="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-xl text-[11px] font-bold flex items-center gap-1.5 hover:bg-indigo-100 transition-all active:scale-95">
                    <Copy className="w-3.5 h-3.5" />
                    Copy Info
                  </button>
                  <button onClick={() => setDetailCustomer(null)}
                    className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center active:scale-90 transition-transform"
                  >
                    <X className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
                <div className="bg-gray-50 rounded-2xl p-4 space-y-4">
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Profile Details</p>
                  {detailCustomer.telegram_id && (
                    <DetailRow icon={Hash} label="Telegram ID" value={detailCustomer.telegram_id.toString()} />
                  )}
                  <DetailRow icon={User} label="Full Name" value={
                    (customerProfile?.display_name && customerProfile.display_name.trim() && customerProfile.display_name.trim() !== 'User')
                      ? customerProfile.display_name.trim()
                      : (detailCustomer.name || detailCustomer.display_name || detailCustomer.first_name || null)
                  } />
                  <DetailRow icon={Phone} label="Phone" value={
                    (customerProfile?.phone && customerProfile.phone.trim())
                      ? customerProfile.phone.trim()
                      : (detailCustomer.phone || detailCustomer.phone_number || null)
                  } />
                  <DetailRow icon={Mail} label="Email" value={
                    (customerProfile?.email && customerProfile.email.trim())
                      ? customerProfile.email.trim()
                      : (detailCustomer.email || null)
                  } />
                  <DetailRow icon={AtSign} label="Telegram Username" value={
                    customerProfile?.telegram_username || detailCustomer.telegram_username || detailCustomer.username || null
                  } />
                  <DetailRow icon={MessageCircle} label="Viber Number" value={
                    customerProfile?.viber_number || detailCustomer.viber_number || null
                  } />
                  <DetailRow icon={MapPin} label="Address" value={
                    customerProfile?.address || detailCustomer.address || null
                  } />
                  {(section === 'website' || detailCustomer.channel === 'website') && (
                    <>
                      <DetailRow icon={Award} label="Points Balance" value={`${customerProfile?.points_balance ?? detailCustomer?.points_balance ?? 0} Points`} />
                      <DetailRow icon={Star} label="Total Points Earned" value={`${customerProfile?.total_points_earned ?? detailCustomer?.total_points_earned ?? 0} Points`} />
                    </>
                  )}
                  <DetailRow icon={FileText} label="Notes" value={
                    customerProfile?.notes || detailCustomer.notes || null
                  } />
                  {(section === 'website' || (section === 'loyal' && detailCustomer.channel === 'website')) ? (
                    <div className="space-y-2 mt-2">
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const targetUid = detailCustomer.conversation_id_web || detailCustomer.firebase_uid || detailCustomer.visitor_id || detailCustomer.uid || (detailCustomer.telegram_id ? `web_tg_${detailCustomer.telegram_id}` : '') || String(detailCustomer.id || '');
                            const targetName = detailCustomer.display_name || detailCustomer.name || detailCustomer.first_name || 'Website Customer';
                            const res = await initiateWebVisitorChat(selectedBotId, {
                              firebaseUid: targetUid,
                              visitorId: targetUid,
                              name: targetName,
                              phone: detailCustomer.phone || detailCustomer.phone_number || '',
                              email: detailCustomer.email || '',
                            });
                            const finalVisitorId = res.visitor_id || targetUid;
                            const convId = String(finalVisitorId).startsWith('web_') ? String(finalVisitorId) : `web_${finalVisitorId}`;
                            navigate('/chats', { state: { conversationId: convId, visitorId: finalVisitorId, name: targetName, tab: 'web' } });
                            setDetailCustomer(null);
                          } catch (err) {
                            addToast('Failed to open chat with customer', 'error');
                          }
                        }}
                        className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs transition-colors cursor-pointer shadow-xs active:scale-95"
                      >
                        <MessageCircle className="w-4 h-4" />
                        Contact Customer on Website Chat
                      </button>
                      {(detailCustomer.telegram_id || detailCustomer.user_id) && (
                        <button
                          type="button"
                          onClick={() => {
                            const tgId = detailCustomer.telegram_id || detailCustomer.user_id;
                            const custName = customerProfile?.display_name || detailCustomer.display_name || detailCustomer.first_name || 'Customer';
                            navigate('/chats', { state: { conversationId: `tg_${tgId}`, userId: Number(tgId), name: custName, tab: 'telegram' } });
                            setDetailCustomer(null);
                          }}
                          className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-sky-50 hover:bg-sky-100 text-sky-700 rounded-xl font-semibold text-xs border border-sky-200 transition-colors cursor-pointer active:scale-95"
                        >
                          <Smartphone className="w-3.5 h-3.5" />
                          Contact Customer on Telegram Chat
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2 mt-2">
                      <button
                        type="button"
                        onClick={() => {
                          const tgId = detailCustomer.telegram_id || detailCustomer.user_id;
                          const custName = customerProfile?.display_name || detailCustomer.display_name || detailCustomer.first_name || 'Customer';
                          navigate('/chats', { state: { conversationId: `tg_${tgId}`, userId: Number(tgId), name: custName, tab: 'telegram' } });
                          setDetailCustomer(null);
                        }}
                        className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs transition-colors cursor-pointer shadow-xs active:scale-95"
                      >
                        <MessageCircle className="w-4 h-4" />
                        Contact Customer on Telegram Chat
                      </button>
                      {(detailCustomer.firebase_uid || detailCustomer.conversation_id_web) && (
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              const targetUid = detailCustomer.conversation_id_web || detailCustomer.firebase_uid || detailCustomer.visitor_id || detailCustomer.uid || (detailCustomer.telegram_id ? `web_tg_${detailCustomer.telegram_id}` : '') || String(detailCustomer.id || '');
                              const targetName = detailCustomer.display_name || detailCustomer.name || 'Website Customer';
                              const res = await initiateWebVisitorChat(selectedBotId, {
                                firebaseUid: targetUid,
                                visitorId: targetUid,
                                name: targetName,
                              });
                              const finalVisitorId = res.visitor_id || targetUid;
                              const convId = String(finalVisitorId).startsWith('web_') ? String(finalVisitorId) : `web_${finalVisitorId}`;
                              navigate('/chats', { state: { conversationId: convId, visitorId: finalVisitorId, name: targetName, tab: 'web' } });
                              setDetailCustomer(null);
                            } catch (err) {
                              addToast('Failed to open chat with customer', 'error');
                            }
                          }}
                          className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl font-semibold text-xs border border-emerald-200 transition-colors cursor-pointer active:scale-95"
                        >
                          <Globe className="w-3.5 h-3.5" />
                          Contact Customer on Website Chat
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Package className="w-4 h-4 text-indigo-600" />
                    <h4 className="text-sm font-bold text-gray-900">
                      Orders ({getCustomerOrderCount(detailCustomer)})
                    </h4>
                  </div>
                  {getCustomerOrders(detailCustomer).length === 0 ? (
                    <div className="bg-gray-50 rounded-2xl p-6 text-center">
                      <ShoppingBag className="w-6 h-6 text-gray-300 mx-auto mb-2" />
                      <p className="text-xs text-gray-400">No orders yet</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {getCustomerOrders(detailCustomer).slice(0, 3).map(order => {
                        const items = Array.isArray(order.items) ? order.items : [];
                        return (
                        <div key={order.id} className="bg-gray-50 rounded-2xl p-3.5 border border-gray-100">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-bold text-gray-900">#{order.order_number || order.id}</span>
                            <span className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded-lg ${
                              order.status === 'completed' || order.status === 'paid' || order.status === 'delivered'
                                ? 'bg-emerald-100 text-emerald-700'
                                : order.status === 'cancelled' || order.status === 'rejected'
                                ? 'bg-rose-100 text-rose-700'
                                : 'bg-amber-100 text-amber-700'
                            }`}>
                              {order.status || 'pending'}
                            </span>
                          </div>
                          <div className="space-y-1">
                            {items.slice(0, 3).map((item, idx) => (
                              <div key={idx} className="flex items-center justify-between text-[11px]">
                                <span className="text-gray-700 truncate mr-2">{item.name || 'Product'}</span>
                                <span className="text-gray-900 font-bold shrink-0">
                                  {item.quantity ? `x${item.quantity}` : ''} {item.price ? formatPrice(Number(item.price), selectedBot?.currency || 'MMK') : ''}
                                </span>
                              </div>
                            ))}
                          </div>
                          <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-gray-200/50">
                            <span className="text-[10px] text-gray-400">
                              {order.created_at ? myanmarFormat(order.created_at, 'MMM d, HH:mm') : ''}
                            </span>
                            <span className="text-xs font-black text-gray-900">
                              {order.final_amount || order.total || order.amount ? formatPrice(Number(order.final_amount || order.total || order.amount), selectedBot?.currency || 'MMK') : ''}
                            </span>
                          </div>
                        </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {detailCustomer.telegram_id && (
                <div className="px-6 py-4 border-t border-gray-100 pb-sheet">
                  <button
                    onClick={() => {
                      setConfirmCustomer(detailCustomer);
                      setDetailCustomer(null);
                    }}
                    className={`w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
                      detailCustomer.is_blocked
                        ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                        : 'bg-rose-600 text-white hover:bg-rose-700'
                    }`}
                  >
                    {detailCustomer.is_blocked ? (
                      <><ShieldCheck className="w-4 h-4" /> Unblock Customer</>
                    ) : (
                      <><Ban className="w-4 h-4" /> Block Customer</>
                    )}
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function DetailRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center flex-shrink-0 shadow-sm">
        <Icon className="w-4 h-4 text-indigo-600" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">{label}</p>
        {value ? (
          <p className="text-sm font-bold text-gray-900 truncate">{value}</p>
        ) : (
          <p className="text-sm text-gray-300 italic">Not Added Yet</p>
        )}
      </div>
    </div>
  );
}
