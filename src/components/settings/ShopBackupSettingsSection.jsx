import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useBotStore } from '../../store/botStore';
import { useToastStore } from '../../store/toastStore';
import client from '../../api/client';
import { Download, Send, Clock, ShieldCheck, Loader2, Database } from 'lucide-react';

export default function ShopBackupSettingsSection() {
  const { selectedBotId } = useBotStore();
  const { addToast } = useToastStore();
  const queryClient = useQueryClient();
  const [isBackupRunning, setIsBackupRunning] = useState(false);

  const { data: backupSettings, isLoading } = useQuery({
    queryKey: ['backupSettings', selectedBotId],
    queryFn: async () => {
      const res = await client.get(`/backup/settings/${selectedBotId}`);
      return res.data;
    },
    enabled: !!selectedBotId,
  });

  const toggleMutation = useMutation({
    mutationFn: async (enabled) => {
      const res = await client.post(`/backup/toggle/${selectedBotId}`, { daily_backup_enabled: enabled });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['backupSettings', selectedBotId], (old) => ({
        ...old,
        daily_backup_enabled: data.daily_backup_enabled,
      }));
      addToast(
        data.daily_backup_enabled
          ? '✅ Daily 12:00 AM Auto-Backup enabled! Backup ZIP will be sent to Bot Owner on Telegram.'
          : 'Daily Auto-Backup disabled.',
        'success'
      );
    },
    onError: (err) => {
      addToast(err.response?.data?.detail || 'Failed to update backup settings', 'error');
    },
  });

  const handleManualBackup = async () => {
    setIsBackupRunning(true);
    try {
      await client.post(`/backup/trigger-manual/${selectedBotId}`);
      addToast('✅ Full shop backup ZIP generated and sent directly to Bot Owner on Telegram!', 'success');
      queryClient.invalidateQueries(['backupSettings', selectedBotId]);
    } catch (err) {
      addToast(err.response?.data?.detail || 'Failed to send backup file', 'error');
    } finally {
      setIsBackupRunning(false);
    }
  };

  const isEnabled = Boolean(backupSettings?.daily_backup_enabled);
  const lastBackupAt = backupSettings?.last_daily_backup_at;

  return (
    <div className="bg-gradient-to-br from-white via-indigo-50/20 to-purple-50/20 p-5 rounded-2xl shadow-sm border border-indigo-100/80 mb-6 transition-all hover:shadow-md">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-700 to-purple-600 text-white shadow-md shadow-indigo-200 flex items-center justify-center shrink-0 mt-0.5">
            <Database className="w-5.5 h-5.5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-gray-900">Automatic & Manual Shop Data Backup</h3>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/80">
                <ShieldCheck className="w-3 h-3 text-indigo-600" />
                Telegram Owner Delivery
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1 max-w-xl leading-relaxed">
              Backup your shop products, orders, customers, and chat history directly to the Telegram bot owner.
            </p>
          </div>
        </div>

        {/* Optimized Backup Now Button */}
        <button
          onClick={handleManualBackup}
          disabled={isBackupRunning || !selectedBotId}
          className="inline-flex items-center justify-center gap-2.5 px-5 py-3 bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-600 hover:from-indigo-700 hover:to-purple-700 active:scale-[0.98] disabled:opacity-60 disabled:pointer-events-none text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-200 hover:shadow-lg transition-all shrink-0 cursor-pointer border border-indigo-500/20"
        >
          {isBackupRunning ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-white" />
              <span>Generating & Sending...</span>
            </>
          ) : (
            <>
              <Send className="w-4 h-4 text-indigo-100 group-hover:translate-x-0.5 transition-transform" />
              <span>Backup Now</span>
            </>
          )}
        </button>
      </div>

      <hr className="my-4 border-indigo-100/60" />

      {/* Auto Backup Toggle & Status Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/80 backdrop-blur-sm p-4 rounded-xl border border-indigo-100/70 shadow-2xs">
        <div className="flex items-center gap-3.5">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${isEnabled ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
            <Clock className="w-4.5 h-4.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-900">Daily Auto-Backup at 12:00 AM (Midnight)</span>
              {isEnabled ? (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Active
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-medium rounded-full bg-gray-100 text-gray-500">
                  Off
                </span>
              )}
            </div>
            <div className="text-[11px] text-gray-500 mt-0.5">
              {lastBackupAt ? (
                <span>Last delivered: <strong className="text-gray-700 font-semibold">{new Date(lastBackupAt).toLocaleString()}</strong></span>
              ) : (
                <span>Sends today's full backup ZIP file every midnight at 12:00 AM to the Bot Owner.</span>
              )}
            </div>
          </div>
        </div>

        {/* Premium iOS-Style Toggle Switch */}
        <div className="flex items-center gap-3 self-end sm:self-auto">
          <span className="text-xs font-bold text-gray-600 select-none">
            {isEnabled ? 'Enabled' : 'Disabled'}
          </span>
          <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={isEnabled}
              disabled={isLoading || toggleMutation.isPending}
              onChange={(e) => toggleMutation.mutate(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-12 h-6.5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-5.5 peer-checked:after:border-white after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all after:shadow-xs peer-checked:bg-gradient-to-r peer-checked:from-indigo-600 peer-checked:to-purple-600 peer-checked:shadow-sm"></div>
          </label>
        </div>
      </div>
    </div>
  );
}
