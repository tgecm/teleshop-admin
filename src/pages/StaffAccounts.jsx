import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { useBotStore } from '../store/botStore';
import { useToastStore } from '../store/toastStore';
import { getStaffActivityLogs, downloadStaffActivityLogs } from '../api/superadmin';
import { myanmarFormat } from '../utils/date';
import client from '../api/client';
import {
  Users, Plus, X, Loader2, Trash2, ShieldCheck, Key, User, Eye, EyeOff,
  FileText, Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function StaffAccounts() {
  const { user } = useAuthStore();
  const { selectedBotId } = useBotStore();
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
  const [staffPerms, setStaffPerms] = useState({});
  const [savingPerms, setSavingPerms] = useState(false);

  const PERM_GROUPS = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'orders', label: 'Orders' },
    { id: 'products', label: 'Products' },
    { id: 'customers', label: 'Customers' },
    { id: 'chats', label: 'Chats' },
    { id: 'newsfeed', label: 'Newsfeed' },
    { id: 'payments', label: 'Payments' },
    { id: 'subscription', label: 'Subscription' },
    { id: 'customize', label: 'Customize' },
    { id: 'qr_menu', label: 'QR Menu System' },
    { id: 'faqs', label: 'FAQs' },
    { id: 'telegram', label: 'Telegram', subs: [
      { id: 'telegram_broadcast', label: 'Broadcast' },
      { id: 'telegram_command', label: 'Telegram Command' },
      { id: 'telegram_bot', label: 'Bot Customization' },
    ]},
    { id: 'settings', label: 'Settings', subs: [
      { id: 'settings_general', label: 'General Settings' },
      { id: 'settings_payment', label: 'Payment Methods' },
      { id: 'settings_notification', label: 'Notifications' },
    ]},
  ];

  const { data: staffList, isLoading } = useQuery({
    queryKey: ['staff-list', selectedBotId],
    queryFn: () => client.get('/staff/list').then(r => r.data),
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

  const { data: activityLogs, isLoading: logsLoading } = useQuery({
    queryKey: ['staff-activity-logs', selectedBotId, selectedStaffId],
    queryFn: () => getStaffActivityLogs(selectedBotId, selectedStaffId),
    enabled: !!selectedBotId && !!selectedStaffId && showLogs,
  });

  useEffect(() => {
    if (showPerms && selectedStaff) {
      client.get(`/staff/${selectedStaff.id}/permissions`).then(r => {
        const perms = r.data?.permissions || {};
        const defaults = {};
        PERM_GROUPS.forEach(g => {
          if (!(g.id in perms)) defaults[g.id] = true;
          if (g.subs) g.subs.forEach(s => { if (!(s.id in perms)) defaults[s.id] = true; });
        });
        setStaffPerms({ ...defaults, ...perms });
      }).catch(() => {
        const defaults = {};
        PERM_GROUPS.forEach(g => {
          defaults[g.id] = true;
          if (g.subs) g.subs.forEach(s => { defaults[s.id] = true; });
        });
        setStaffPerms(defaults);
      });
    }
  }, [showPerms, selectedStaff]);

  const downloadLogs = async () => {
    if (!selectedBotId || !selectedStaffId) return;
    try {
      const blob = await downloadStaffActivityLogs(selectedBotId, selectedStaffId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const staffName = staffList?.find(s => s.id === selectedStaffId)?.name || 'staff';
      a.download = `${staffName.replace(/\s+/g, '_')}_activity_logs.txt`;
      a.click();
      URL.revokeObjectURL(url);
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg sm:text-2xl font-bold text-gray-900">Staff Accounts</h1>
            <p className="text-xs text-gray-500">Manage staff who can access this dashboard</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowLogs(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-all text-sm active:scale-95">
            <Clock className="w-4 h-4" /> Activity Logs
          </button>
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all text-sm active:scale-95">
            <Plus className="w-4 h-4" /> Add Staff
          </button>
        </div>
      </div>

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
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowPerms(false)} />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white rounded-3xl shadow-2xl p-6 w-full max-w-sm max-h-[80vh] flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-500" />
                  Permissions
                </h2>
                <button onClick={() => setShowPerms(false)} className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
              <p className="text-sm text-gray-500 mb-4">Set permissions for <span className="font-bold text-gray-900">{selectedStaff.name}</span></p>
              <div className="flex-1 overflow-y-auto space-y-3 min-h-0">
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
              <div className="flex gap-3 mt-4 pt-3 border-t border-gray-100">
                <button onClick={() => setShowPerms(false)}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-2xl hover:bg-gray-200 transition-all text-sm">
                  Cancel
                </button>
                <button onClick={async () => {
                  setSavingPerms(true);
                  try {
                    // Build complete permissions — fill any missing with false
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
                  className="flex-1 py-2.5 bg-emerald-600 text-white font-bold rounded-2xl hover:bg-emerald-700 transition-all text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                  {savingPerms ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Save
                </button>
              </div>
            </motion.div>
          </motion.div>
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
