import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getBroadcasts, createBroadcast, getGiveaways, createGiveaway, getGiveawayParticipants } from '../api/broadcasts';
import { useBotStore } from '../store/botStore';
import { useToastStore } from '../store/toastStore';
import LoadingSkeleton from '../components/shared/LoadingSkeleton';
import StatusBadge from '../components/shared/StatusBadge';
import { 
  Send, 
  Gift, 
  Plus, 
  Search, 
  Users, 
  Calendar, 
  Clock, 
  ChevronRight, 
  X, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  MessageSquare,
  Trophy,
  User
} from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';

export default function Broadcast() {
  const { selectedBotId } = useBotStore();
  const { addToast } = useToastStore();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('broadcasts');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedGiveaway, setSelectedGiveaway] = useState(null);

  const { data: broadcasts, isLoading: broadcastsLoading } = useQuery({
    queryKey: ['broadcasts', selectedBotId],
    queryFn: () => getBroadcasts({ bot_id: Number(selectedBotId) }),
    enabled: !!selectedBotId,
  });

  const { data: giveaways, isLoading: giveawaysLoading } = useQuery({
    queryKey: ['giveaways', selectedBotId],
    queryFn: () => getGiveaways({ bot_id: Number(selectedBotId) }),
    enabled: !!selectedBotId,
  });

  const createBroadcastMutation = useMutation({
    mutationFn: (data) => createBroadcast({ ...data, bot_id: Number(selectedBotId) }),
    onSuccess: () => {
      queryClient.invalidateQueries(['broadcasts', selectedBotId]);
      addToast('Broadcast sent successfully');
      setIsModalOpen(false);
    },
    onError: () => addToast('Failed to send broadcast', 'error'),
  });

  const createGiveawayMutation = useMutation({
    mutationFn: (data) => createGiveaway({ ...data, bot_id: Number(selectedBotId) }),
    onSuccess: () => {
      queryClient.invalidateQueries(['giveaways', selectedBotId]);
      addToast('Giveaway created successfully');
      setIsModalOpen(false);
    },
    onError: () => addToast('Failed to create giveaway', 'error'),
  });

  if (broadcastsLoading || giveawaysLoading) return <LoadingSkeleton type="list" count={5} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Engagement</h1>
        <div className="flex bg-white p-1 rounded-2xl shadow-sm border border-gray-100 self-start w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('broadcasts')}
            className={`flex-1 sm:flex-none px-6 py-2.5 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${activeTab === 'broadcasts' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            <Send className="w-4 h-4" />
            Broadcasts
          </button>
          <button
            onClick={() => setActiveTab('giveaways')}
            className={`flex-1 sm:flex-none px-6 py-2.5 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${activeTab === 'giveaways' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            <Gift className="w-4 h-4" />
            Giveaways
          </button>
        </div>
      </div>

      <div className="text-center md:hidden">
        <p className="text-[10px] text-gray-400 italic">Pull down to refresh</p>
      </div>

      <div className="grid gap-4">
        {activeTab === 'broadcasts' ? (
          <>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="w-full p-4 bg-indigo-600 text-white font-bold rounded-2xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              <Plus className="w-5 h-5" />
              New Broadcast
            </button>
            {broadcasts?.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-gray-200">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Send className="w-8 h-8 text-gray-300" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">No broadcasts sent</h3>
                <p className="text-sm text-gray-500 max-w-xs mx-auto mt-1">
                  Send messages to all your customers at once.
                </p>
              </div>
            ) : (
              broadcasts?.map(b => (
                <div key={b.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 hover:border-indigo-100 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 flex-shrink-0">
                        <MessageSquare className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-gray-900 line-clamp-2">{b.message}</p>
                        <p className="text-[10px] text-gray-500 mt-1.5 flex items-center gap-1 font-bold uppercase tracking-wider">
                          <Calendar className="w-3 h-3" /> {format(new Date(b.created_at), 'MMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider mb-1">{b.target_count || 0} Sent</p>
                      <StatusBadge status="delivered" />
                    </div>
                  </div>
                </div>
              ))
            )}
          </>
        ) : (
          <>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="w-full p-4 bg-indigo-600 text-white font-bold rounded-2xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              <Plus className="w-5 h-5" />
              New Giveaway
            </button>
            {giveaways?.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-gray-200">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Gift className="w-8 h-8 text-gray-300" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">No giveaways found</h3>
                <p className="text-sm text-gray-500 max-w-xs mx-auto mt-1">
                  Create giveaways to engage your customers and grow your shop.
                </p>
              </div>
            ) : (
              giveaways?.map(g => (
                <div 
                  key={g.id} 
                  onClick={() => setSelectedGiveaway(g)}
                  className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 hover:border-indigo-200 transition-all cursor-pointer active:scale-[0.98]"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 flex-shrink-0 shadow-sm">
                        <Trophy className="w-6 h-6" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-gray-900 truncate">{g.title}</p>
                        <p className="text-[10px] text-gray-500 flex items-center gap-1 font-bold uppercase tracking-wider mt-0.5">
                          <Users className="w-3 h-3" /> {g.participant_count || 0} Joined
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Ends on</p>
                      <p className="text-xs font-bold text-gray-900">{format(new Date(g.end_date), 'MMM d')}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300 hidden sm:block" />
                  </div>
                </div>
              ))
            )}
          </>
        )}
      </div>

      {/* Giveaway Detail Modal */}
      <AnimatePresence>
        {selectedGiveaway && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedGiveaway(null)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
            />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[32px] z-50 max-h-[90vh] overflow-y-auto md:max-w-lg md:mx-auto md:bottom-10 md:rounded-[32px] md:shadow-2xl"
            >
              <div className="p-6 pb-12">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900">Giveaway Details</h2>
                  <button onClick={() => setSelectedGiveaway(null)} className="p-2 bg-gray-100 rounded-full active:scale-90 transition-transform">
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="bg-amber-50 p-6 rounded-3xl border border-amber-100 text-center">
                    <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-amber-600 mx-auto mb-4 shadow-md">
                      <Trophy className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">{selectedGiveaway.title}</h3>
                    <p className="text-sm text-gray-500 mt-1">{selectedGiveaway.description}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 text-center">
                      <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Participants</p>
                      <p className="text-xl font-bold text-indigo-600">{selectedGiveaway.participant_count || 0}</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 text-center">
                      <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Ends In</p>
                      <p className="text-sm font-bold text-gray-900">{format(new Date(selectedGiveaway.end_date), 'MMM d, yyyy')}</p>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                    <h4 className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <Trophy className="w-3 h-3" /> Winner Info
                    </h4>
                    <p className="text-sm text-indigo-900 font-medium">Winner will be selected automatically when the giveaway ends.</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      
      {/* Create Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
            />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[32px] z-50 max-h-[90vh] overflow-y-auto md:max-w-lg md:mx-auto md:bottom-10 md:rounded-[32px] md:shadow-2xl"
            >
              <div className="p-6 pb-12">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900">
                    {activeTab === 'broadcasts' ? 'New Broadcast' : 'New Giveaway'}
                  </h2>
                  <button onClick={() => setIsModalOpen(false)} className="p-2 bg-gray-100 rounded-full">
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
                
                {activeTab === 'broadcasts' ? (
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    createBroadcastMutation.mutate({ message: e.target.message.value });
                  }} className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700 ml-1">Message</label>
                      <textarea
                        required
                        name="message"
                        rows={6}
                        placeholder="Type your message to all users..."
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium resize-none"
                      />
                    </div>
                    <button
                      disabled={createBroadcastMutation.isPending}
                      type="submit"
                      className="w-full px-6 py-4 bg-indigo-600 text-white font-bold rounded-2xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                    >
                      {createBroadcastMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                      Send Broadcast
                    </button>
                  </form>
                ) : (
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    createGiveawayMutation.mutate({
                      title: e.target.title.value,
                      description: e.target.description.value,
                      end_date: e.target.end_date.value,
                    });
                  }} className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700 ml-1">Title</label>
                      <input
                        required
                        name="title"
                        type="text"
                        placeholder="e.g. Weekly Lucky Draw"
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700 ml-1">Description</label>
                      <textarea
                        required
                        name="description"
                        rows={3}
                        placeholder="Describe the prizes and rules..."
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium resize-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700 ml-1">End Date</label>
                      <input
                        required
                        name="end_date"
                        type="date"
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
                      />
                    </div>
                    <button
                      disabled={createGiveawayMutation.isPending}
                      type="submit"
                      className="w-full px-6 py-4 bg-indigo-600 text-white font-bold rounded-2xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                    >
                      {createGiveawayMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Gift className="w-5 h-5" />}
                      Create Giveaway
                    </button>
                  </form>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
