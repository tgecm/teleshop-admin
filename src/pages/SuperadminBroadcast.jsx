import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAllBots } from '../api/superadmin';
import { createBroadcast } from '../api/broadcasts';
import { useToastStore } from '../store/toastStore';
import { myanmarFormat } from '../utils/date';
import {
  Send, Bot, Loader2, CheckCircle2, Users, MessageSquare,
  Search, X, ChevronDown,
} from 'lucide-react';
import { motion } from 'motion/react';

export default function SuperadminBroadcast() {
  const { addToast } = useToastStore();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState('');
  const [selectedBotIds, setSelectedBotIds] = useState([]);
  const [selectAll, setSelectAll] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: allBots } = useQuery({
    queryKey: ['superadmin', 'all-bots'],
    queryFn: getAllBots,
  });

  const filteredBots = useMemo(() => {
    if (!allBots) return [];
    const q = searchQuery.toLowerCase();
    return allBots.filter(b =>
      !q || b.bot_username?.toLowerCase().includes(q) || b.bot_full_name?.toLowerCase().includes(q)
    );
  }, [allBots, searchQuery]);

  const toggleBot = (id) => {
    setSelectedBotIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
    setSelectAll(false);
  };

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedBotIds([]);
      setSelectAll(false);
    } else {
      setSelectedBotIds(allBots?.map(b => b.id) || []);
      setSelectAll(true);
    }
  };

  const broadcastMutation = useMutation({
    mutationFn: ({ botIds, msg }) => {
      // Send broadcast to each selected bot sequentially
      return Promise.allSettled(
        botIds.map(botId => createBroadcast({ bot_id: botId, message: msg }))
      );
    },
    onSuccess: (results) => {
      const succeeded = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      queryClient.invalidateQueries({ queryKey: ['broadcasts'] });
      setMessage('');
      addToast(`Broadcast sent to ${succeeded} bot${succeeded !== 1 ? 's' : ''}${failed ? ` (${failed} failed)` : ''}`);
    },
    onError: () => addToast('Failed to send broadcast', 'error'),
  });

  const selectedCount = selectAll ? (allBots?.length || 0) : selectedBotIds.length;
  const canSend = message.trim().length >= 3 && selectedCount > 0;

  const handleSendAll = async () => {
    if (!canSend) return;
    const botIds = selectAll ? (allBots?.map(b => b.id) || []) : selectedBotIds;
    broadcastMutation.mutate({ botIds, msg: message.trim() });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
      {/* Compose panel */}
      <div className="lg:col-span-3 space-y-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Mass Broadcast</h3>
              <p className="text-xs text-gray-500">Send a message to all customers across selected bots</p>
            </div>
          </div>

          <textarea value={message} onChange={e => setMessage(e.target.value)}
            placeholder="Type your broadcast message to all selected bots' customers..."
            rows={6}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium resize-none" />

          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400">{message.length} characters</span>
            <span className="text-gray-400">{selectedCount} bot{selectedCount !== 1 ? 's' : ''} selected</span>
          </div>

          <button onClick={handleSendAll} disabled={!canSend || broadcastMutation.isPending}
            className="w-full py-3.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all disabled:opacity-50 active:scale-[0.98] flex items-center justify-center gap-2 text-sm shadow-lg shadow-indigo-100">
            {broadcastMutation.isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
            {broadcastMutation.isPending
              ? `Sending to ${selectedCount} bot${selectedCount !== 1 ? 's' : ''}...`
              : `Send to ${selectedCount} bot${selectedCount !== 1 ? 's' : ''}`}
          </button>

          {broadcastMutation.isPending && (
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs text-amber-700 flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Broadcasting in progress. This may take a moment for multiple bots.
            </div>
          )}
        </div>

        {/* Recent broadcasts section */}
        <RecentBroadcasts />
      </div>

      {/* Bot selector */}
      <div className="lg:col-span-2">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden sticky top-4">
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-bold text-gray-900">Target Bots</span>
              </div>
              <label className="flex items-center gap-2 text-xs font-bold text-gray-500 cursor-pointer">
                <input type="checkbox" checked={selectAll} onChange={toggleSelectAll} className="accent-indigo-600 w-3.5 h-3.5" />
                All bots
              </label>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search bots..."
                className="w-full pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>
          <div className="max-h-[400px] overflow-y-auto divide-y divide-gray-50">
            {filteredBots.map(b => {
              const isSelected = selectAll || selectedBotIds.includes(b.id);
              return (
                <label key={b.id}
                  className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${isSelected ? 'bg-indigo-50/50' : 'hover:bg-gray-50'}`}>
                  <input type="checkbox" checked={isSelected}
                    onChange={() => toggleBot(b.id)}
                    className="accent-indigo-600 w-4 h-4 flex-shrink-0" />
                  <div className="w-7 h-7 rounded-lg bg-gray-100 text-gray-600 flex items-center justify-center font-bold text-xs flex-shrink-0">
                    {b.bot_username?.[0]?.toUpperCase() || 'B'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-gray-900 truncate">{b.bot_full_name || b.bot_username || `Bot #${b.id}`}</p>
                    <p className="text-[10px] text-gray-400">@{b.bot_username || 'no_username'}</p>
                  </div>
                  {b.plan_name && (
                    <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-md ${
                      b.plan_name.toLowerCase() === 'free' ? 'bg-gray-100 text-gray-500' :
                      b.plan_name.toLowerCase() === 'basic' ? 'bg-blue-100 text-blue-600' :
                      b.plan_name.toLowerCase() === 'standard' ? 'bg-emerald-100 text-emerald-600' :
                      b.plan_name.toLowerCase() === 'pro' ? 'bg-purple-100 text-purple-600' :
                      'bg-amber-100 text-amber-600'
                    }`}>{b.plan_name}</span>
                  )}
                </label>
              );
            })}
          </div>
          <div className="p-3 border-t border-gray-100 bg-gray-50 text-center text-[11px] text-gray-400 font-medium">
            {selectedCount} of {allBots?.length || 0} bots selected
          </div>
        </div>
      </div>
    </div>
  );
}

function RecentBroadcasts() {
  const { data: broadcasts } = useQuery({
    queryKey: ['broadcasts'],
    queryFn: () => import('../api/broadcasts').then(m => m.getBroadcasts({ limit: 5 })),
  });

  if (!broadcasts || broadcasts.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
      <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
        <MessageSquare className="w-3.5 h-3.5" /> Recent Broadcasts
      </h4>
      <div className="space-y-2">
        {broadcasts.slice(0, 5).map(b => (
          <div key={b.id} className="flex items-start gap-2.5 text-xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-gray-700 truncate">{b.message}</p>
              <p className="text-[10px] text-gray-400">{b.target_count || 0} recipients · {b.created_at ? myanmarFormat(b.created_at, 'MMM d, yyyy') : ''}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
