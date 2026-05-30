import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createPlanPayment, getPlanPayments } from '../api/superadmin';
import { getAllBots } from '../api/superadmin';
import { useToastStore } from '../store/toastStore';
import {
  Key, Copy, CheckCircle2, Loader2, Plus, X, Crown,
  Star, Zap, Bot, Calendar, Clock, ChevronDown,
} from 'lucide-react';
import { motion } from 'motion/react';
import { format, addDays } from 'date-fns';

const PLANS = [
  { key: 'basic', name: 'Basic', price: '135,000 MMK/yr', icon: Star, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', days: 365 },
  { key: 'standard', name: 'Standard', price: '225,000 MMK/yr', icon: Crown, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', days: 365 },
  { key: 'pro', name: 'Pro', price: '350,000 MMK/yr', icon: Key, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200', days: 365 },
  { key: 'business', name: 'Business', price: '600,000 MMK/yr', icon: Crown, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', days: 365 },
];

function generateKey() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const segments = [4, 4, 4, 4];
  return segments.map(len =>
    Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  ).join('-');
}

export default function SuperadminKeys() {
  const { addToast } = useToastStore();
  const queryClient = useQueryClient();

  const [plan, setPlan] = useState('basic');
  const [durationDays, setDurationDays] = useState(365);
  const [quantity, setQuantity] = useState(1);
  const [generatedKeys, setGeneratedKeys] = useState([]);

  const { data: allBots } = useQuery({
    queryKey: ['superadmin', 'all-bots'],
    queryFn: getAllBots,
  });

  const { data: planPayments } = useQuery({
    queryKey: ['plan-payments'],
    queryFn: getPlanPayments,
  });

  const createPaymentMutation = useMutation({
    mutationFn: (data) => createPlanPayment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plan-payments'] });
      addToast('Payment record created');
    },
    onError: (err) => addToast(err.response?.data?.detail || 'Failed to create payment', 'error'),
  });

  const handleGenerate = () => {
    const keys = Array.from({ length: quantity }, () => ({
      key: generateKey(),
      plan,
      durationDays,
      createdAt: new Date().toISOString(),
      expiresAt: addDays(new Date(), durationDays).toISOString(),
    }));
    setGeneratedKeys(keys);
  };

  const copyAll = () => {
    const text = generatedKeys.map(k =>
      `${k.key} | ${PLANS.find(p => p.key === k.plan)?.name} | Expires: ${format(new Date(k.expiresAt), 'MMM d, yyyy')}`
    ).join('\n');
    navigator.clipboard.writeText(text);
    addToast(`${generatedKeys.length} key${generatedKeys.length !== 1 ? 's' : ''} copied`);
  };

  const applyToBot = (botId, key) => {
    const planObj = PLANS.find(p => p.key === plan);
    createPaymentMutation.mutate({
      bot_id: botId,
      plan: key.plan,
      amount: planObj?.price.replace(/[^0-9]/g, '') || '0',
      notes: `Key: ${key.key} (generated ${format(new Date(key.createdAt), 'MMM d')})`,
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
      {/* Generator */}
      <div className="lg:col-span-3 space-y-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Subscription Key Generator</h3>
              <p className="text-xs text-gray-500">Generate redeemable plan keys for bot owners</p>
            </div>
          </div>

          {/* Plan selection */}
          <div>
            <p className="text-xs font-bold text-gray-500 mb-2">Plan</p>
            <div className="grid grid-cols-4 gap-2">
              {PLANS.map(p => (
                <button key={p.key} onClick={() => setPlan(p.key)}
                  className={`p-3 rounded-xl border-2 text-center transition-all ${plan === p.key ? `${p.border} ${p.bg}` : 'border-gray-100 hover:border-gray-200'}`}>
                  <p.icon className={`w-5 h-5 mx-auto mb-1 ${p.color}`} />
                  <p className={`text-xs font-bold ${p.color}`}>{p.name}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Duration */}
          <div>
            <p className="text-xs font-bold text-gray-500 mb-2">Duration</p>
            <div className="flex gap-2">
              {[
                { label: '30 days', value: 30 },
                { label: '90 days', value: 90 },
                { label: '6 months', value: 180 },
                { label: '1 year', value: 365 },
                { label: 'Lifetime', value: 9999 },
              ].map(d => (
                <button key={d.value} onClick={() => setDurationDays(d.value)}
                  className={`flex-1 px-3 py-2 rounded-xl text-xs font-bold border-2 transition-all ${durationDays === d.value ? 'border-indigo-400 bg-indigo-50 text-indigo-600' : 'border-gray-100 text-gray-500 hover:border-gray-200'}`}>
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Quantity */}
          <div>
            <p className="text-xs font-bold text-gray-500 mb-2">Quantity</p>
            <div className="flex items-center gap-3">
              <button onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-9 h-9 rounded-xl bg-gray-100 text-gray-600 font-bold hover:bg-gray-200 transition-all text-lg">−</button>
              <span className="text-2xl font-bold text-gray-900 w-12 text-center">{quantity}</span>
              <button onClick={() => setQuantity(Math.min(50, quantity + 1))}
                className="w-9 h-9 rounded-xl bg-gray-100 text-gray-600 font-bold hover:bg-gray-200 transition-all text-lg">+</button>
              <span className="text-xs text-gray-400 ml-2">keys (max 50)</span>
            </div>
          </div>

          <button onClick={handleGenerate}
            className="w-full py-3.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-indigo-100">
            <Key className="w-5 h-5" />
            Generate {quantity} Key{quantity !== 1 ? 's' : ''}
          </button>
        </div>

        {/* Generated keys */}
        {generatedKeys.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h4 className="text-sm font-bold text-gray-900">Generated Keys ({generatedKeys.length})</h4>
              <button onClick={copyAll}
                className="px-3 py-1.5 bg-gray-100 text-gray-600 font-bold rounded-lg hover:bg-gray-200 transition-all text-xs flex items-center gap-1.5">
                <Copy className="w-3 h-3" /> Copy All
              </button>
            </div>
            <div className="divide-y divide-gray-50">
              {generatedKeys.map((k, i) => (
                <div key={i} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${PLANS.find(p => p.key === k.plan)?.bg || 'bg-gray-100'}`}>
                        {React.createElement(PLANS.find(p => p.key === k.plan)?.icon || Zap, { className: `w-4 h-4 ${PLANS.find(p => p.key === k.plan)?.color || 'text-gray-500'}` })}
                      </div>
                      <div>
                        <code className="text-sm font-mono font-bold text-gray-900 tracking-wider">{k.key}</code>
                        <p className="text-[10px] text-gray-400">
                          {PLANS.find(p => p.key === k.plan)?.name} · Expires {format(new Date(k.expiresAt), 'MMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                    <button onClick={() => { navigator.clipboard.writeText(k.key); addToast('Key copied'); }}
                      className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all">
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Quick apply to bot */}
      <div className="lg:col-span-2">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden sticky top-4">
          <div className="p-4 border-b border-gray-100">
            <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Bot className="w-4 h-4 text-gray-500" />
              Apply to Bot
            </h4>
            <p className="text-xs text-gray-400 mt-0.5">Select a bot to apply the last generated key</p>
          </div>
          <div className="max-h-[400px] overflow-y-auto divide-y divide-gray-50">
            {(!allBots || allBots.length === 0) ? (
              <div className="p-6 text-center text-xs text-gray-400">No bots available</div>
            ) : (
              allBots.map(b => (
                <div key={b.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-gray-100 text-gray-600 flex items-center justify-center font-bold text-xs flex-shrink-0">
                    {b.bot_username?.[0]?.toUpperCase() || 'B'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">{b.bot_full_name || b.bot_username || `Bot #${b.id}`}</p>
                    <p className="text-[10px] text-gray-400">{b.plan_name ? `Current: ${b.plan_name}` : 'No plan'}</p>
                  </div>
                  <button onClick={() => {
                    if (generatedKeys.length === 0) { addToast('Generate keys first', 'error'); return; }
                    applyToBot(b.id, generatedKeys[0]);
                  }}
                    disabled={createPaymentMutation.isPending || generatedKeys.length === 0}
                    className="px-2.5 py-1.5 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-all text-[10px] disabled:opacity-50 flex items-center gap-1">
                    {createPaymentMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                    Apply
                  </button>
                </div>
              ))
            )}
          </div>
          <div className="p-3 border-t border-gray-100 bg-gray-50 text-center text-[10px] text-gray-400">
            Creates a payment record with the generated key as note
          </div>
        </div>

        {/* Recent payments */}
        {planPayments && planPayments.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mt-4 p-4">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Recent Payments</h4>
            <div className="space-y-2">
              {planPayments.slice(0, 5).map(p => (
                <div key={p.id} className="flex items-center justify-between text-xs">
                  <span className="font-bold text-gray-900 truncate max-w-[120px]">{p.bot_username || `Bot #${p.bot_id}`}</span>
                  <span className="text-gray-500">{Number(p.amount || 0).toLocaleString()} MMK</span>
                  <span className="text-gray-400">{p.created_at ? format(new Date(p.created_at), 'MMM d') : ''}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
