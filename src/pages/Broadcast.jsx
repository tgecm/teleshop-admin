import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getBroadcasts, createBroadcast, getGiveaways, createGiveaway, getGiveawayParticipants, drawGiveawayWinner, getGiveawayWinners } from '../api/broadcasts';
import { useBotStore } from '../store/botStore';
import { useToastStore } from '../store/toastStore';
import LoadingSkeleton from '../components/shared/LoadingSkeleton';
import StatusBadge from '../components/shared/StatusBadge';
import {
  Send,
  Gift,
  Plus,
  Users,
  Calendar,
  ChevronRight,
  X,
  Loader2,
  MessageSquare,
  Trophy,
  RefreshCw,
  Crown,
  Shuffle
} from 'lucide-react';
import { myanmarFormat } from '../utils/date';
import { motion, AnimatePresence } from 'motion/react';

export default function Broadcast() {
  const { selectedBotId } = useBotStore();
  const { addToast } = useToastStore();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('broadcasts');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedGiveaway, setSelectedGiveaway] = useState(null);
  const [drawMethod, setDrawMethod] = useState('weighted');
  const [drawCount, setDrawCount] = useState(1);
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinnerName, setSpinnerName] = useState('');
  const [drawResult, setDrawResult] = useState(null);
  const [selectedDrawGw, setSelectedDrawGw] = useState(null);
  const [showWinners, setShowWinners] = useState(false);

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

  const activeGwId = selectedGiveaway?.id || selectedDrawGw?.id;
  const { data: participants } = useQuery({
    queryKey: ['giveaway-participants', activeGwId],
    queryFn: () => getGiveawayParticipants(activeGwId),
    enabled: !!activeGwId,
  });

  const drawMutation = useMutation({
    mutationFn: (data) => drawGiveawayWinner((selectedDrawGw || selectedGiveaway).id, data),
    onSuccess: (result) => {
      setDrawResult(result);
      setIsSpinning(false);
      queryClient.invalidateQueries(['giveaway-winners', activeGwId]);
    },
    onError: () => {
      addToast('Failed to draw winner', 'error');
      setIsSpinning(false);
    },
  });

  const { data: pastWinners } = useQuery({
    queryKey: ['giveaway-winners', activeGwId],
    queryFn: () => getGiveawayWinners(activeGwId),
    enabled: !!activeGwId,
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

  const startSpin = () => {
    if (!participants?.length) {
      addToast('No participants in this giveaway', 'error');
      return;
    }
    setDrawResult(null);
    setIsSpinning(true);

    // Cycle names for visual effect then call API
    let frame = 0;
    const totalFrames = 20 + Math.floor(Math.random() * 15);
    let speed = 60;

    const cycle = () => {
      const p = participants[Math.floor(Math.random() * participants.length)];
      setSpinnerName(p.first_name || p.username || `User ${p.telegram_id}`);
      frame++;
      speed = 60 + (frame / totalFrames) * 250;
      if (frame < totalFrames) {
        setTimeout(cycle, speed);
      } else {
        drawMutation.mutate({ method: drawMethod, count: drawCount });
      }
    };
    cycle();
  };

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-lg sm:text-2xl lg:text-3xl font-bold text-gray-900">Engagement</h1>
        <div className="flex bg-white p-0.5 rounded-xl shadow-sm border border-gray-100 self-start w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('broadcasts')}
            className={`flex-1 sm:flex-none px-4 sm:px-6 py-2 text-xs sm:text-sm font-bold rounded-[10px] sm:rounded-xl transition-all flex items-center justify-center gap-1.5 ${activeTab === 'broadcasts' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="sm:hidden">Sends</span>
            <span className="hidden sm:inline">Broadcasts</span>
          </button>
          <button
            onClick={() => setActiveTab('giveaways')}
            className={`flex-1 sm:flex-none px-4 sm:px-6 py-2 text-xs sm:text-sm font-bold rounded-[10px] sm:rounded-xl transition-all flex items-center justify-center gap-1.5 ${activeTab === 'giveaways' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            <Gift className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            Giveaways
          </button>
          <button
            onClick={() => setActiveTab('draw')}
            className={`flex-1 sm:flex-none px-4 sm:px-6 py-2 text-xs sm:text-sm font-bold rounded-[10px] sm:rounded-xl transition-all flex items-center justify-center gap-1.5 ${activeTab === 'draw' ? 'bg-amber-600 text-white shadow-lg shadow-amber-100' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            🎲 Draw
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
                          <Calendar className="w-3 h-3" /> {myanmarFormat(b.sent_at || b.created_at, 'MMM d, yyyy')}
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
        ) : activeTab === 'giveaways' ? (
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
                      <p className="text-xs font-bold text-gray-900">{myanmarFormat(g.end_date, 'MMM d')}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300 hidden sm:block" />
                  </div>
                </div>
              ))
            )}
          </>
        ) : activeTab === 'draw' ? (
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-100 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Crown className="w-5 h-5 text-amber-500" />
              Draw Winner
            </h2>

            {/* Giveaway selector */}
            <div className="space-y-2 mb-5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Select Giveaway</label>
              {giveaways?.length === 0 ? (
                <p className="text-sm text-gray-400 italic">No giveaways yet. Create one first.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {giveaways?.map(g => (
                    <button
                      key={g.id}
                      onClick={() => { setSelectedDrawGw(g); setDrawResult(null); setShowWinners(false); }}
                      className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-all ${
                        selectedDrawGw?.id === g.id
                          ? 'bg-amber-500 text-white shadow-md'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      🎁 {g.title}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedDrawGw && (
              <>
                {/* Method + count */}
                <div className="flex gap-1.5 mb-4">
                  <button
                    onClick={() => setDrawMethod('weighted')}
                    className={`flex-1 px-3 py-2 text-xs font-bold rounded-xl transition-all ${
                      drawMethod === 'weighted'
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'bg-gray-100 text-gray-600 border border-gray-200'
                    }`}
                  >
                    🎟️ By Tickets
                  </button>
                  <button
                    onClick={() => setDrawMethod('equal')}
                    className={`flex-1 px-3 py-2 text-xs font-bold rounded-xl transition-all ${
                      drawMethod === 'equal'
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'bg-gray-100 text-gray-600 border border-gray-200'
                    }`}
                  >
                    👤 Equal
                  </button>
                </div>

                <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-2.5 border border-gray-200 mb-5">
                  <span className="text-xs font-bold text-gray-700">Number of Winners</span>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setDrawCount(Math.max(1, drawCount - 1))}
                      disabled={drawCount <= 1}
                      className="w-7 h-7 rounded-lg bg-gray-200 text-gray-700 font-bold flex items-center justify-center disabled:opacity-30"
                    >−</button>
                    <span className="text-sm font-bold text-gray-900 w-4 text-center">{drawCount}</span>
                    <button
                      onClick={() => setDrawCount(Math.min(5, drawCount + 1))}
                      disabled={drawCount >= 5}
                      className="w-7 h-7 rounded-lg bg-gray-200 text-gray-700 font-bold flex items-center justify-center disabled:opacity-30"
                    >+</button>
                  </div>
                </div>

                {/* Pick button (idle) */}
                {!isSpinning && !drawResult && (
                  <button
                    onClick={startSpin}
                    className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-2xl shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-base"
                  >
                    <Shuffle className="w-5 h-5" />
                    🎲 Pick Winner
                  </button>
                )}

                {/* Spinner */}
                {isSpinning && (
                  <div className="text-center py-8">
                    <div className="relative mx-auto w-full max-w-xs h-16 mb-4 overflow-hidden rounded-xl bg-gradient-to-r from-indigo-900 via-purple-800 to-indigo-900 border-2 border-amber-400 shadow-inner">
                      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/5 to-transparent" />
                      <div className="flex items-center justify-center h-full">
                        <p className="text-white font-bold text-xl tracking-wider tabular-nums slot-text">
                          {spinnerName}
                        </p>
                      </div>
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-amber-400 to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-amber-400 to-transparent" />
                    </div>
                    <p className="text-xs text-gray-500 font-bold animate-pulse">Picking winner...</p>
                  </div>
                )}

                {/* Winner result with animation */}
                {drawResult && !isSpinning && (
                  <div className="space-y-4">
                    <div className="text-center">
                      <motion.p
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', damping: 10, stiffness: 200 }}
                        className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-2"
                      >
                        🎉 Winner{drawResult.winners?.length > 1 ? 's' : ''} 🎉
                      </motion.p>
                    </div>
                    <AnimatePresence>
                      {drawResult.winners?.map((w, i) => (
                        <motion.div
                          key={w.telegram_id}
                          initial={{ opacity: 0, y: 40, scale: 0.9 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          transition={{ delay: i * 0.15, type: 'spring', damping: 20, stiffness: 200 }}
                          className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-4 border border-amber-200"
                        >
                          <div className="flex items-center gap-4">
                            <motion.div
                              initial={{ rotate: -180, scale: 0 }}
                              animate={{ rotate: 0, scale: 1 }}
                              transition={{ delay: i * 0.15 + 0.2, type: 'spring', damping: 10, stiffness: 150 }}
                              className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold text-lg shadow-md flex-shrink-0"
                            >
                              {i === 0 ? <Crown className="w-6 h-6" /> : `#${i + 1}`}
                            </motion.div>
                            <motion.div
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.15 + 0.35 }}
                            >
                              <p className="text-base font-bold text-gray-900">{w.name}</p>
                              <p className="text-sm text-gray-500">
                                {w.username ? `@${w.username}` : 'No username'} · {w.tickets} ticket{w.tickets > 1 ? 's' : ''}
                              </p>
                            </motion.div>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>

                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: drawResult.winners?.length * 0.15 + 0.5 }}
                      className="flex gap-3 pt-2"
                    >
                      <button
                        onClick={startSpin}
                        className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 text-sm"
                      >
                        <RefreshCw className="w-4 h-4" /> Draw Again
                      </button>
                      <button
                        onClick={() => { setDrawResult(null); setSelectedDrawGw(null); }}
                        className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 active:scale-[0.98] transition-all text-sm"
                      >
                        Reset
                      </button>
                    </motion.div>
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: drawResult.winners?.length * 0.15 + 0.6 }}
                      className="text-[10px] text-gray-400 text-center italic"
                    >
                      Prize: {drawResult.prize_name || selectedDrawGw.title}
                    </motion.p>
                  </div>
                )}

                {/* Past Winners */}
                {selectedDrawGw && pastWinners?.winners?.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-gray-100">
                    <button
                      onClick={() => setShowWinners(!showWinners)}
                      className="flex items-center justify-between w-full text-sm font-bold text-gray-700"
                    >
                      <span className="flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-amber-500" />
                        Past Winners ({pastWinners.winners.length})
                      </span>
                      <motion.span animate={{ rotate: showWinners ? 180 : 0 }}>
                        <ChevronRight className="w-4 h-4" />
                      </motion.span>
                    </button>
                    <AnimatePresence>
                      {showWinners && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="pt-3 space-y-2">
                            {pastWinners.winners.map((w, i) => (
                              <motion.div
                                key={w.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.05 }}
                                className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl"
                              >
                                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600 flex-shrink-0">
                                  #{i + 1}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-bold text-gray-900 truncate">{w.name}</p>
                                  <p className="text-[10px] text-gray-400">
                                    {w.username && `@${w.username}`} · {myanmarFormat(w.drawn_at, 'MMM d, yyyy')}
                                  </p>
                                </div>
                                <span className="text-[10px] font-bold text-indigo-600">{w.tickets} ticket{w.tickets > 1 ? 's' : ''}</span>
                              </motion.div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </>
            )}
          </div>
        ) : null}
      </div>


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
              className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[32px] z-[60] max-h-[90vh] overflow-y-auto md:max-w-lg md:mx-auto md:bottom-10 md:rounded-[32px] md:shadow-2xl"
            >
              <div className="p-6 pb-20 md:pb-12">
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
                      <p className="text-sm font-bold text-gray-900">{myanmarFormat(selectedGiveaway.end_date, 'MMM d, yyyy')}</p>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                    <h4 className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <Crown className="w-3 h-3" /> Winner Info
                    </h4>
                    <p className="text-sm text-indigo-900 font-medium">Winner will be selected automatically when the giveaway ends.</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      
      
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
              className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[32px] z-[60] max-h-[90vh] overflow-y-auto md:max-w-lg md:mx-auto md:bottom-10 md:rounded-[32px] md:shadow-2xl"
            >
              <div className="p-6 pb-20 md:pb-12">
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
