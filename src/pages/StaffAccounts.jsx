import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { useBotStore } from '../store/botStore';
import { useToastStore } from '../store/toastStore';
import { getStaffActivityLogs, downloadStaffActivityLogs } from '../api/superadmin';
import { format } from 'date-fns';
import { tz } from '@date-fns/tz';
import { myanmarFormat } from '../utils/date';
import { downloadBlob } from '../utils/download';
import client from '../api/client';

const myTZ = tz('Asia/Yangon');
import {
  Users, Plus, X, Loader2, Trash2, ShieldCheck, Key, User, Eye, EyeOff,
  FileText, Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function StaffAccounts() {
  const { user } = useAuthStore();
  const { bots, selectedBotId } = useBotStore();
  const selectedBot = (bots || []).find(b => b.id?.toString() === selectedBotId?.toString());
  const { addToast } = useToastStore();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', username: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [ownerPassword, setOwnerPassword] = useState('');
  const [step, setStep] = useState('form');
  const [loginToken, setLoginToken] = useState('');
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [saving, setSaving] = useState(false);
  const [changePw, setChangePw] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [showLogs, setShowLogs] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState(null);
  const [showPerms, setShowPerms] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [dateFilter, setDateFilter] = useState('all');
  const [staffPerms, setStaffPerms] = useState({});
  const [savingPerms, setSavingPerms] = useState(false);

  const PERM_GROUPS = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'profit', label: 'Profit' },
    { id: 'orders', label: 'Orders' },
    { id: 'products', label: 'Products' },
    { id: 'customers', label: 'Customers' },
    { id: 'chats', label: 'Chats' },
    { id: 'newsfeed', label: 'Newsfeed' },
    { id: 'payments', label: 'Payments' },
    { id: 'subscription', label: 'Subscription' },
    { id: 'customize', label: 'Customize' },
    { id: 'ai_agent', label: 'AI Agent' },
    { id: 'profile', label: 'Profile' },
    { id: 'qr_menu', label: 'QR Menu', subs: [
      { id: 'qr_dashboard', label: 'QR Dashboard' },
      { id: 'qr_menu_items', label: 'QR Menu' },
      { id: 'qr_tables', label: 'QR Tables' },
      { id: 'qr_orders', label: 'QR Orders' },
    ]},
    { id: 'faqs', label: 'FAQs' },
    { id: 'telegram', label: 'Telegram', subs: [
      { id: 'telegram_broadcast', label: 'Broadcast' },
      { id: 'telegram_command', label: 'Telegram Command' },
      { id: 'telegram_bot', label: 'Bot Customization' },
    ]},
    { id: 'settings', label: 'Settings' },
  ];

  const { data: staffList, isLoading } = useQuery({
    queryKey: ['staff-list', selectedBotId],
    queryFn: () => client.get('/staff/list', { params: { bot_id: selectedBotId } }).then(r => r.data),
    enabled: !!selectedBotId,
  });

  const createStaff = async () => {
    if (!form.name.trim() || !form.username.trim() || !form.password.trim()) return;
    setSaving(true);
    try {
      const res = await client.post('/staff/create', { ...form, bot_id: selectedBotId });
      const loginTokenRes = res.data;
      // After creation, simulate 2FA - but for now just refresh
      queryClient.invalidateQueries({ queryKey: ['staff-list', selectedBotId] });
      setShowCreate(false);
      setForm({ name: '', username: '', password: '' });
      addToast('Staff account created');
    } catch (err) {
      addToast(err.response?.data?.detail || 'Failed to create staff', 'error');
    } finally {
      setSaving(false);
    }
  };

  const deleteStaff = async (id) => {
    try {
      await client.delete(`/staff/${id}`);
      queryClient.invalidateQueries({ queryKey: ['staff-list', selectedBotId] });
      addToast('Staff account deleted');
    } catch (err) {
      addToast(err.response?.data?.detail || 'Failed to delete', 'error');
    }
  };

  const getDateRange = (filter) => {
    const now = new Date();
    const y = now.getUTCFullYear();
    const m = String(now.getUTCMonth() + 1).padStart(2, '0');
    const d = String(now.getUTCDate()).padStart(2, '0');
    switch (filter) {
      case 'today': return { startDate: `${y}-${m}-${d}` };
      case 'week': {
        const day = now.getUTCDay();
        const diff = day === 0 ? 6 : day - 1;
        const mon = new Date(now);
        mon.setUTCDate(now.getUTCDate() - diff);
        const my = mon.getUTCFullYear();
        const mm = String(mon.getUTCMonth() + 1).padStart(2, '0');
        const md = String(mon.getUTCDate()).padStart(2, '0');
        return { startDate: `${my}-${mm}-${md}` };
      }
      case 'month': return { startDate: `${y}-${m}-01` };
      default: return {};
    }
  };

  const { data: activityLogs, isLoading: logsLoading } = useQuery({
    queryKey: ['staff-activity-logs', selectedBotId, selectedStaffId, dateFilter],
    queryFn: () => {
      const range = getDateRange(dateFilter);
      return getStaffActivityLogs(selectedBotId, selectedStaffId, range.startDate, range.endDate);
    },
    enabled: !!selectedBotId && !!selectedStaffId && showLogs,
  });

  useEffect(() => {
    if (showPerms && selectedStaff) {
      client.get(`/staff/${selectedStaff.id}/permissions`).then(r => {
        const perms = r.data?.permissions || {};
        const defaults = {};
        const defaultEnabled = new Set(['orders', 'products', 'chats']);
        PERM_GROUPS.forEach(g => {
          if (!(g.id in perms)) defaults[g.id] = defaultEnabled.has(g.id);
          if (g.subs) g.subs.forEach(s => { if (!(s.id in perms)) defaults[s.id] = defaultEnabled.has(s.id); });
        });
        setStaffPerms({ ...defaults, ...perms });
      }).catch(() => {
        const defaults = {};
        const defaultEnabled = new Set(['orders', 'products', 'chats']);
        PERM_GROUPS.forEach(g => {
          defaults[g.id] = defaultEnabled.has(g.id);
          if (g.subs) g.subs.forEach(s => { defaults[s.id] = defaultEnabled.has(s.id); });
        });
        setStaffPerms(defaults);
      });
    }
  }, [showPerms, selectedStaff]);

  const downloadLogs = async () => {
    if (!selectedBotId || !selectedStaffId) return;
    try {
      const range = getDateRange(dateFilter);
      const blob = await downloadStaffActivityLogs(selectedBotId, selectedStaffId, range.startDate, range.endDate);
      const staffName = staffList?.find(s => s.id === selectedStaffId)?.name || 'staff';
      await downloadBlob(blob, `${staffName.replace(/\s+/g, '_')}_activity_logs.txt`);
      addToast('Logs downloaded');
    } catch {
      addToast('Failed to download logs', 'error');
    }
  };

  const changePassword = async () => {
    if (!changePw || !changePw.newPassword || changePw.newPassword.length < 4) return;
    try {
      await client.post('/staff/change-password', { staff_id: changePw.id, new_password: changePw.newPassword });
      queryClient.invalidateQueries({ queryKey: ['staff-list', selectedBotId] });
      setChangePw(null);
      addToast('Password changed');
    } catch (err) {
      addToast(err.response?.data?.detail || 'Failed', 'error');
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg sm:text-2xl font-bold text-gray-900">Staff Accounts</h1>
            <p className="text-xs text-gray-500">Manage staff who can access this dashboard</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={() => setShowLogs(true)}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-2 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-all text-xs sm:text-sm active:scale-95 whitespace-nowrap">
            <Clock className="w-4 h-4" /> Activity Logs
          </button>
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all text-xs sm:text-sm active:scale-95 whitespace-nowrap">
            <Plus className="w-4 h-4" /> Add Staff
          </button>
        </div>
      </div>

      {selectedBot && (
        <div className="flex items-center justify-between bg-gradient-to-r from-indigo-50/80 via-purple-50/50 to-white border border-indigo-100 p-3.5 rounded-2xl shadow-sm">
          <div className="flex items-center gap-3">
            {selectedBot.profile_picture ? (
              <img src={selectedBot.profile_picture} alt="" className="w-9 h-9 rounded-xl object-cover border border-indigo-200 shadow-xs" />
            ) : (
              <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white font-bold flex items-center justify-center text-sm shadow-xs">
                {(selectedBot.bot_full_name || selectedBot.bot_username || 'S')[0].toUpperCase()}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-100/70 px-2 py-0.5 rounded-md">Selected Shop</span>
                <span className="text-[10px] text-gray-500 font-medium">
                  ID: {selectedBot.id}
                </span>
              </div>
              <h3 className="font-bold text-gray-900 text-sm mt-0.5">
                {selectedBot.bot_full_name || selectedBot.bot_username}
                {selectedBot.bot_username && <span className="text-gray-400 font-normal text-xs ml-1.5 font-mono">(@{selectedBot.bot_username})</span>}
              </h3>
            </div>
          </div>
          <span className="text-xs text-indigo-600 bg-white border border-indigo-100 px-3 py-1 rounded-xl font-medium shadow-2xs hidden sm:inline-block">
            Staff accounts list for this shop
          </span>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>
      ) : !staffList || staffList.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 shadow-sm">
          <Users className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No staff accounts yet</p>
          <p className="text-xs text-gray-400 mt-1">Create accounts so staff can log in with username + password.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {staffList.map(s => (
            <div key={s.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm">
                    {s.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">{s.name}</p>
                    <p className="text-[11px] text-gray-500">@{s.username} · {s.role}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => { setSelectedStaff(s); setShowPerms(true); }}
                    className="p-2 rounded-lg text-gray-400 hover:text-emerald-500 hover:bg-emerald-50 transition-all">
                    <ShieldCheck className="w-4 h-4" />
                  </button>
                  <button onClick={() => setChangePw({ id: s.id, name: s.name, newPassword: '' })}
                    className="p-2 rounded-lg text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 transition-all">
                    <Key className="w-4 h-4" />
                  </button>
                  <button onClick={() => setDeleteConfirm(s.id)}
                    className="p-2 rounded-lg text-gray-400 hover:text-rose-500 hover:bg-rose-50 transition-all">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              {!s.is_active && <span className="text-[10px] font-bold text-rose-500 mt-2 inline-block">Inactive</span>}
            </div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {showCreate && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowCreate(false)} />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white rounded-3xl shadow-2xl p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-500" />
                  Add Staff
                </h2>
                <button onClick={() => setShowCreate(false)} className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block">Name</label>
                  <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Staff name" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block">Username</label>
                  <input type="text" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value.replace(/\s/g, '') }))}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500" placeholder="username" />
                  {form.username.length > 0 && (form.username.length < 5 || form.username.length > 25) && (
                    <p className="text-[10px] text-rose-500 mt-1">{form.username.length}/5-25 characters</p>
                  )}
                  {form.username.length >= 5 && form.username.length <= 25 && (
                    <p className="text-[10px] text-emerald-500 mt-1">{form.username.length} characters</p>
                  )}
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block">Password</label>
                  <div className="relative">
                    <input type={showPw ? 'text' : 'password'} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                      className="w-full pr-12 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500" placeholder="" />
                    <button type="button" onClick={() => setShowPw(!showPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1">
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowCreate(false)}
                  className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-2xl hover:bg-gray-200 transition-all text-sm">
                  Cancel
                </button>
                <button onClick={createStaff} disabled={saving || !form.name.trim() || form.username.trim().length < 5 || form.username.trim().length > 25 || !form.password.trim()}
                  className="flex-[2] py-3 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 transition-all text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                  Create Staff
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {changePw && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setChangePw(null)} />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white rounded-3xl shadow-2xl p-6 w-full max-w-sm">
              <h3 className="text-lg font-bold text-gray-900 mb-1">Change Password</h3>
              <p className="text-sm text-gray-500 mb-4">For {changePw.name}</p>
              <input type="password" value={changePw.newPassword} onChange={e => setChangePw(p => ({ ...p, newPassword: e.target.value }))}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 mb-4" placeholder="New password (min 4 chars)" />
              <div className="flex gap-3">
                <button onClick={() => setChangePw(null)}
                  className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-2xl hover:bg-gray-200 transition-all text-sm">Cancel</button>
                <button onClick={changePassword}
                  className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 transition-all text-sm disabled:opacity-50">Save</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)} />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white rounded-3xl shadow-2xl p-6 w-full max-w-sm text-center">
              <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-6 h-6 text-rose-500" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">Delete Staff Account</h3>
              <p className="text-sm text-gray-500 mb-6">Are you sure you want to delete this staff account?</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteConfirm(null)}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-2xl hover:bg-gray-200 transition-all text-sm">
                  Cancel
                </button>
                <button onClick={() => { deleteStaff(deleteConfirm); setDeleteConfirm(null); }}
                  className="flex-1 py-2.5 bg-rose-500 text-white font-bold rounded-2xl hover:bg-rose-600 transition-all text-sm flex items-center justify-center gap-1.5">
                  <Trash2 className="w-4 h-4" /> Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Permissions Modal */}
      <AnimatePresence>
        {showPerms && selectedStaff && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={() => setShowPerms(false)} />
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed z-50 flex items-center justify-center inset-0 top-10 bottom-[68px] md:top-0 md:bottom-0">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-white rounded-3xl shadow-2xl w-full h-full md:max-w-sm md:max-h-[80vh] flex flex-col mx-4 md:mx-0 md:p-6"
            >
              <div className="flex items-center justify-between px-6 md:px-0 pt-6 md:pt-0 pb-4">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-500" />
                  Permissions
                </h2>
                <button onClick={() => setShowPerms(false)} className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
              <p className="text-sm text-gray-500 mb-4 px-6 md:px-0">Set permissions for <span className="font-bold text-gray-900">{selectedStaff.name}</span></p>
              <div className="flex-1 overflow-y-auto space-y-3 px-6 md:px-0 pb-4">
                <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl cursor-pointer hover:bg-gray-100 transition-all">
                  <input type="checkbox" checked={PERM_GROUPS.every(g => staffPerms[g.id] === true) && PERM_GROUPS.filter(g => g.subs).every(g => g.subs.every(s => staffPerms[s.id] === true))}
                    onChange={(e) => {
                      const v = e.target.checked;
                      const p = {};
                      PERM_GROUPS.forEach(g => {
                        p[g.id] = v;
                        if (g.subs) g.subs.forEach(s => { p[s.id] = v; });
                      });
                      setStaffPerms({ ...staffPerms, ...p });
                    }}
                    className="w-4 h-4 accent-emerald-600" />
                  <span className="text-sm font-bold text-gray-900">ALL</span>
                </label>
                <div className="border-t border-gray-100 pt-2" />
                {PERM_GROUPS.map(group => (
                  <div key={group.id}>
                    <label className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 cursor-pointer transition-all">
                      <input type="checkbox"
                        checked={staffPerms[group.id] === true}
                        onChange={(e) => {
                          const v = e.target.checked;
                          const p = { [group.id]: v };
                          if (group.subs) group.subs.forEach(s => { p[s.id] = v; });
                          setStaffPerms({ ...staffPerms, ...p });
                        }}
                        className="w-4 h-4 accent-emerald-600" />
                      <span className="text-sm font-medium text-gray-700">{group.label}</span>
                    </label>
                    {group.subs && (
                      <div className="ml-7 space-y-1 mb-1">
                        {group.subs.map(sub => (
                          <label key={sub.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-all">
                            <input type="checkbox"
                              checked={staffPerms[sub.id] === true}
                              onChange={(e) => setStaffPerms(p => ({ ...p, [sub.id]: e.target.checked }))}
                              className="w-3.5 h-3.5 accent-emerald-600" />
                            <span className="text-xs text-gray-500">{sub.label}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex gap-3 px-6 md:px-0 py-4 border-t border-gray-100">
                <button onClick={() => setShowPerms(false)}
                  className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-2xl hover:bg-gray-200 transition-all text-sm">
                  Cancel
                </button>
                <button onClick={async () => {
                  setSavingPerms(true);
                  try {
                    const fullPerms = {};
                    PERM_GROUPS.forEach(g => {
                      fullPerms[g.id] = staffPerms[g.id] ?? true;
                      if (g.subs) g.subs.forEach(s => { fullPerms[s.id] = staffPerms[s.id] ?? true; });
                    });
                    await client.put(`/staff/${selectedStaff.id}/permissions`, { permissions: fullPerms });
                    queryClient.invalidateQueries({ queryKey: ['staff-permissions'] });
                    addToast('Permissions saved');
                    setShowPerms(false);
                  } catch (err) {
                    addToast(err.response?.data?.detail || 'Failed to save permissions', 'error');
                  } finally { setSavingPerms(false); }
                }} disabled={savingPerms}
                  className="flex-1 py-3 bg-emerald-600 text-white font-bold rounded-2xl hover:bg-emerald-700 transition-all text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                  {savingPerms ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Save
                </button>
              </div>
            </motion.div>
          </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showLogs && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setShowLogs(false); setSelectedStaffId(null); }} />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white rounded-3xl shadow-2xl p-6 w-full max-w-lg max-h-[80vh] flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-indigo-500" />
                  Activity Logs
                </h2>
                <button onClick={() => { setShowLogs(false); setSelectedStaffId(null); }}
                  className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>

              {!selectedStaffId ? (
                <div className="space-y-2 flex-1 overflow-y-auto">
                  <p className="text-sm text-gray-500 mb-3">Select a staff member to view their activity:</p>
                  {staffList?.filter(s => s.is_active !== false).map(s => (
                    <button key={s.id} onClick={() => setSelectedStaffId(s.id)}
                      className="w-full flex items-center gap-3 p-3.5 bg-gray-50 rounded-2xl hover:bg-indigo-50 transition-all text-left active:scale-[0.98]">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm">
                        {s.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-gray-900">{s.name}</p>
                        <p className="text-[11px] text-gray-500">@{s.username}</p>
                      </div>
                    </button>
                  ))}
                  {(!staffList || staffList.length === 0) && (
                    <p className="text-sm text-gray-400 text-center py-8">No staff accounts found</p>
                  )}
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto min-h-0">
                  {selectedStaffId && (
                    <div className="flex items-center justify-between mb-3">
                      <button onClick={() => setSelectedStaffId(null)}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-700">
                        ← Back to staff list
                      </button>
                      <button onClick={downloadLogs}
                        className="flex items-center gap-1 text-xs font-bold text-gray-600 hover:text-gray-900 px-3 py-1.5 bg-gray-100 rounded-xl hover:bg-gray-200 transition-all">
                        <FileText className="w-3.5 h-3.5" /> Download .txt
                      </button>
                    </div>
                  )}
                  <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1">
                    {[
                      { key: 'all', label: 'All Time' },
                      { key: 'today', label: 'Today' },
                      { key: 'week', label: 'This Week' },
                      { key: 'month', label: 'This Month' },
                    ].map(f => (
                      <button key={f.key} onClick={() => setDateFilter(f.key)}
                        className={`px-3 py-1.5 text-xs font-bold rounded-xl whitespace-nowrap transition-all ${
                          dateFilter === f.key
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}>
                        {f.label}
                      </button>
                    ))}
                  </div>
                  {logsLoading ? (
                    <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>
                  ) : !activityLogs || activityLogs.length === 0 ? (
                    <div className="text-center py-12">
                      <Clock className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">No activity recorded yet</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {activityLogs.map(log => (
                        <div key={log.id} className="bg-gray-50 rounded-2xl p-3.5 border border-gray-100">
                          <p className="text-[11px] font-bold text-indigo-500 mb-1">
                            {myanmarFormat(log.created_at, 'yyyy-MM-dd HH:mm:ss')}
                          </p>
                          <p className="text-sm text-gray-800">{log.action_text}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
