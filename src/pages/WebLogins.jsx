import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAllBots, getWebLogins, provisionWebLogin } from '../api/superadmin';
import { Key, Search, Sparkles, Check, Copy, Shield, Bot, Mail, Lock, Plus, X } from 'lucide-react';
import { useToastStore } from '../store/toastStore';

export default function WebLogins() {
  const addToast = useToastStore((state) => state.addToast);
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBotId, setSelectedBotId] = useState('');
  const [botSearchTerm, setBotSearchTerm] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [copiedText, setCopiedText] = useState(false);
  const [lastProvisioned, setLastProvisioned] = useState(null);

  const { data: rawBots, isLoading: isLoadingBots } = useQuery({
    queryKey: ['superadmin-bots'],
    queryFn: getAllBots,
  });

  const bots = Array.isArray(rawBots)
    ? rawBots
    : (rawBots?.bots || rawBots?.data || []);

  const { data: rawWebLogins, isLoading: isLoadingLogins } = useQuery({
    queryKey: ['superadmin-web-logins'],
    queryFn: getWebLogins,
  });

  const webLogins = Array.isArray(rawWebLogins)
    ? rawWebLogins
    : (rawWebLogins?.logins || rawWebLogins?.data || []);

  const provisionMutation = useMutation({
    mutationFn: provisionWebLogin,
    onSuccess: (data) => {
      addToast(data.message || 'Web login provisioned successfully!', 'success');
      queryClient.invalidateQueries({ queryKey: ['superadmin-web-logins'] });
      const selBot = bots.find(b => b.id === Number(selectedBotId));
      const botName = selBot ? (selBot.bot_full_name || selBot.bot_username || `Bot #${selectedBotId}`) : `Bot #${selectedBotId}`;
      
      setLastProvisioned({
        botName,
        email: data.email,
        password: password,
        loginUrl: `${window.location.origin}/login`
      });
      
      setIsModalOpen(false);
      setEmail('');
      setPassword('');
      setSelectedBotId('');
    },
    onError: (err) => {
      addToast(err?.response?.data?.detail || err.message || 'Failed to provision web login', 'error');
    }
  });

  const generateRandomPassword = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let pwd = '';
    for (let i = 0; i < 10; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(pwd);
  };

  const filteredBots = bots.filter(b => {
    const term = botSearchTerm.toLowerCase();
    const name = (b.bot_full_name || '').toLowerCase();
    const uname = (b.bot_username || '').toLowerCase();
    const id = String(b.id);
    return name.includes(term) || uname.includes(term) || id.includes(term);
  });

  const handleSave = (e) => {
    e.preventDefault();
    if (!selectedBotId) {
      addToast('Please select a shop / bot', 'error');
      return;
    }
    if (!email || !email.includes('@')) {
      addToast('Please enter a valid email address', 'error');
      return;
    }
    if (!password || password.length < 6) {
      addToast('Password must be at least 6 characters', 'error');
      return;
    }

    provisionMutation.mutate({
      bot_id: Number(selectedBotId),
      email: email.trim(),
      password: password.trim()
    });
  };

  const copyCredentials = (info) => {
    const text = `🔑 Web Panel Admin Access\n\n🌐 URL: ${info.loginUrl}\n📧 Email: ${info.email}\n🔒 Temp Password: ${info.password}\n\n(Please change your password after logging in)`;
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    addToast('Credentials copied to clipboard!', 'success');
    setTimeout(() => setCopiedText(false), 2000);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-semibold text-lg">
            <Key className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Superadmin Web Logins</h1>
            <p className="text-sm text-gray-500">Manually provision & manage shop owner web panel credentials</p>
          </div>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-xl shadow-sm transition-colors text-sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Web Login
        </button>
      </div>

      {/* Success Banner if recently provisioned */}
      {lastProvisioned && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 sm:p-5 text-emerald-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1 text-sm">
            <div className="font-bold text-emerald-800 flex items-center">
              <Check className="w-4 h-4 mr-1.5 text-emerald-600" />
              Credentials Created for {lastProvisioned.botName}!
            </div>
            <div><span className="font-medium text-emerald-700">Email:</span> {lastProvisioned.email}</div>
            <div><span className="font-medium text-emerald-700">Temp Password:</span> <code className="bg-emerald-100 px-2 py-0.5 rounded text-emerald-900 font-mono">{lastProvisioned.password}</code></div>
          </div>
          <button
            onClick={() => copyCredentials(lastProvisioned)}
            className="inline-flex items-center justify-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs rounded-xl shadow-sm transition-colors self-start sm:self-center shrink-0"
          >
            {copiedText ? <Check className="w-3.5 h-3.5 mr-1.5" /> : <Copy className="w-3.5 h-3.5 mr-1.5" />}
            {copiedText ? 'Copied!' : 'Copy Info for Telegram'}
          </button>
        </div>
      )}

      {/* Active Logins List */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-bold text-gray-900 text-base">Provisioned Accounts ({webLogins.length})</h2>
        </div>

        {isLoadingLogins ? (
          <div className="p-8 text-center text-gray-400">Loading web panel accounts...</div>
        ) : webLogins.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No web panel logins provisioned yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                <tr>
                  <th className="py-3 px-4">Bot / Shop Name</th>
                  <th className="py-3 px-4">Web Panel Email</th>
                  <th className="py-3 px-4">Created Date</th>
                  <th className="py-3 px-4">Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(Array.isArray(webLogins) ? webLogins : []).map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-3.5 px-4 font-medium text-gray-900">
                      {row.bot_full_name || row.public_slug || `Bot #${row.web_panel_bot_id}`}
                      {row.bot_username && (
                        <span className="text-gray-400 text-xs ml-1.5">(@{row.bot_username})</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-purple-700">{row.web_panel_email}</td>
                    <td className="py-3.5 px-4 text-xs text-gray-400">
                      {row.created_at ? new Date(row.created_at).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        Shop Admin
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-5 border border-gray-100 relative">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-lg font-bold text-gray-900 flex items-center">
                <Shield className="w-5 h-5 text-purple-600 mr-2" />
                Create Web Panel Login
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              {/* Bot Selector */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Select Shop / Bot
                </label>
                <input
                  type="text"
                  placeholder="Filter bot name or username..."
                  value={botSearchTerm}
                  onChange={(e) => setBotSearchTerm(e.target.value)}
                  className="w-full text-xs px-3 py-1.5 border border-gray-200 rounded-lg mb-1.5 focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
                <select
                  value={selectedBotId}
                  onChange={(e) => setSelectedBotId(e.target.value)}
                  className="w-full text-sm px-3.5 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 bg-white"
                  required
                >
                  <option value="">-- Choose a Bot --</option>
                  {filteredBots.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.bot_full_name || b.public_slug || `Bot #${b.id}`} {b.bot_username ? `(@${b.bot_username})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Web Panel Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    placeholder="shop_owner@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full text-sm pl-10 pr-3.5 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Temporary Password
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      placeholder="Temp password..."
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full text-sm pl-10 pr-3.5 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-mono"
                      required
                    />
                  </div>
                  <button
                    type="button"
                    onClick={generateRandomPassword}
                    className="px-3 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl transition-colors flex items-center shrink-0"
                  >
                    <Sparkles className="w-3.5 h-3.5 mr-1 text-purple-600" />
                    Generate
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={provisionMutation.isLoading}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium text-sm rounded-xl shadow-sm transition-colors disabled:opacity-50"
                >
                  {provisionMutation.isLoading ? 'Saving...' : 'Save & Provision'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
