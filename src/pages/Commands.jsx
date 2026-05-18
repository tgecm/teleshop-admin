import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCustomCommands, createCustomCommand, deleteCustomCommand } from '../api/commands';
import { useBotStore } from '../store/botStore';
import { useToastStore } from '../store/toastStore';
import LoadingSkeleton from '../components/shared/LoadingSkeleton';
import {
  Plus,
  Search,
  Trash2,
  X,
  Terminal,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Commands() {
  const { selectedBotId } = useBotStore();
  const { addToast } = useToastStore();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [commandName, setCommandName] = useState('');

  const sanitizeCommandName = (value) => {
    return value.replace(/[^a-z0-9]/g, '').toLowerCase();
  };

  const { data: commands, isLoading } = useQuery({
    queryKey: ['custom-commands', selectedBotId],
    queryFn: () => getCustomCommands({ bot_id: Number(selectedBotId) }),
    enabled: !!selectedBotId,
  });

  const createMutation = useMutation({
    mutationFn: (data) => createCustomCommand({
      ...data,
      bot_id: Number(selectedBotId),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['custom-commands', selectedBotId]);
      addToast('Command created');
      setCommandName('');
      setIsModalOpen(false);
    },
    onError: (err) => addToast(err.response?.data?.detail || 'Failed to create command', 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => deleteCustomCommand(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['custom-commands', selectedBotId]);
      addToast('Command deleted');
      setDeleteConfirm(null);
    },
    onError: () => addToast('Failed to delete command', 'error'),
  });

  const filteredCommands = commands?.filter(c =>
    c.command_name?.toLowerCase().includes(search.toLowerCase())
  ) || [];

  if (isLoading) return <LoadingSkeleton type="list" count={5} />;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-lg sm:text-2xl font-bold text-gray-900">Commands</h1>
        <div className="flex gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search commands..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm transition-all text-sm"
            />
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2.5 bg-indigo-600 text-white font-bold rounded-2xl shadow-lg hover:bg-indigo-700 transition-all flex items-center gap-2 active:scale-95"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">New Command</span>
          </button>
        </div>
      </div>

      <div className="text-center md:hidden">
        <p className="text-[10px] text-gray-400 italic">Pull down to refresh</p>
      </div>

      <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-amber-800">
          <p className="font-bold">Text commands only here.</p>
          <p className="text-amber-700 mt-0.5">To add media (photos, videos) to your commands, use the Telegram Panel.</p>
        </div>
      </div>

      {filteredCommands.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-gray-200">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Terminal className="w-8 h-8 text-gray-300" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">No commands found</h3>
          <p className="text-sm text-gray-500 max-w-xs mx-auto mt-1">
            {search ? "Try a different search term." : "Create custom commands for users to interact with your bot."}
          </p>
        </div>
      ) : (
        <div className="grid gap-2">
          {filteredCommands.map(cmd => (
            <motion.div
              layout
              key={cmd.id}
              className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-mono font-bold flex-shrink-0 shadow-sm">
                  /
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-gray-900 font-mono">/{cmd.command_name}</p>
                  <p className="text-xs text-gray-500 truncate mt-0.5">
                    {cmd.content_data?.text || cmd.content_data?.content || 'No content'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDeleteConfirm(cmd.id === deleteConfirm ? null : cmd.id)}
                className={`p-2.5 rounded-xl transition-all active:scale-90 flex-shrink-0 ${
                  deleteConfirm === cmd.id
                    ? 'bg-rose-100 text-rose-600 border border-rose-200'
                    : 'bg-gray-50 text-gray-400 hover:bg-rose-50 hover:text-rose-500 border border-transparent'
                }`}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </div>
      )}


      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center justify-between"
          >
            <p className="text-sm font-bold text-rose-800">Delete this command?</p>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 bg-white text-gray-700 text-sm font-bold rounded-xl border border-gray-200 hover:bg-gray-50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteMutation.mutate(deleteConfirm)}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 bg-rose-600 text-white text-sm font-bold rounded-xl hover:bg-rose-700 disabled:opacity-50 transition-all flex items-center gap-2"
              >
                {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Delete
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>


      <AnimatePresence>
        {isModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setIsModalOpen(false); setCommandName(''); }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              onAnimationComplete={(def) => { if (def === 'exit') setCommandName(''); }}
              className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[32px] z-50 max-h-[85svh] overflow-y-auto md:max-w-lg md:mx-auto md:bottom-10 md:rounded-[32px] md:shadow-2xl"
            >
              <div className="p-6 pb-12">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900">New Command</h2>
                  <button onClick={() => { setIsModalOpen(false); setCommandName(''); }} className="p-2 bg-gray-100 rounded-full active:scale-90 transition-transform">
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!commandName) return;
                    createMutation.mutate({
                      command_name: commandName,
                      content_data: { text: e.target.content.value.trim() },
                      is_active: true,
                    });
                  }}
                  className="space-y-5"
                >
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 ml-1">Command Name</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-mono font-bold text-lg">/</span>
                      <input
                        required
                        name="command_name"
                        type="text"
                        placeholder="help"
                        value={commandName}
                        onChange={(e) => setCommandName(sanitizeCommandName(e.target.value))}
                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-mono font-medium"
                      />
                    </div>
                    <p className="text-[10px] text-gray-400 ml-1">Lowercase letters and numbers only. No spaces or symbols. (e.g. /help)</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 ml-1">Response Text</label>
                    <textarea
                      required
                      name="content"
                      rows={5}
                      placeholder="Enter the response message..."
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium resize-none"
                    />
                    <p className="text-[10px] text-gray-400 ml-1">To add media, go to Telegram Panel</p>
                  </div>

                  <button
                    disabled={createMutation.isPending}
                    type="submit"
                    className="w-full py-4 bg-indigo-600 text-white font-bold rounded-2xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                  >
                    {createMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                    Create Command
                  </button>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
