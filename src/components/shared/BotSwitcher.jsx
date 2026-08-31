import React, { useState, useRef, useEffect } from 'react';
import { useBotStore } from '../../store/botStore';
import { useAuthStore } from '../../store/authStore';
import { ChevronDown, Bot, Check, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function BotSwitcher({ light }) {
  const { bots, selectedBotId, setSelectedBot } = useBotStore();
  const { isSuperadmin } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (!selectedBotId && bots.length > 0) {
      setSelectedBot(bots[0].id);
    }
  }, [bots, selectedBotId, setSelectedBot]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedBot = bots.find(b => b.id.toString() === selectedBotId?.toString());
  const filteredBots = bots.filter(b => 
    (b.bot_username || b.bot_full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (b.id || '').toString().includes(searchTerm)
  );

  return (
    <div className="relative inline-block text-left w-full max-w-[220px]" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl sm:rounded-2xl border transition-all active:scale-[0.98] ${
          light 
            ? 'bg-indigo-50 border-indigo-200 hover:bg-indigo-100 text-gray-900' 
            : 'bg-white/10 border-white/20 hover:bg-white/20 text-white'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Bot className={`w-4 h-4 flex-shrink-0 ${light ? 'text-indigo-600' : 'text-white'}`} />
          <span className="text-xs sm:text-sm font-bold truncate">
            {selectedBot ? (selectedBot.bot_username || selectedBot.bot_full_name) : 'Select Bot'}
          </span>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 flex-shrink-0 ${isOpen ? 'rotate-180' : ''} ${
          light ? 'text-gray-400' : 'text-white/80'
        }`} />
      </button>

      {/* Custom Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 right-0 top-full mt-2 z-50 bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl overflow-hidden p-1.5 min-w-[220px]"
          >
            {/* Search Input if > 5 bots */}
            {bots.length > 5 && (
              <div className="p-1.5 mb-1 relative">
                <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search bot..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-gray-800 text-white text-xs pl-8 pr-3 py-1.5 rounded-xl border border-gray-700 focus:outline-none focus:border-indigo-500 placeholder-gray-500"
                  autoFocus
                />
              </div>
            )}

            {/* Bot List */}
            <div className="max-h-60 overflow-y-auto space-y-0.5 custom-scrollbar">
              {filteredBots.length === 0 ? (
                <div className="p-3 text-center text-xs text-gray-400">No bots found</div>
              ) : (
                filteredBots.map(bot => {
                  const isSelected = bot.id.toString() === selectedBotId?.toString();
                  return (
                    <button
                      key={bot.id}
                      type="button"
                      onClick={() => {
                        setSelectedBot(bot.id);
                        setIsOpen(false);
                      }}
                      className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-left transition-all text-xs font-semibold ${
                        isSelected 
                          ? 'bg-indigo-600 text-white' 
                          : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                      }`}
                    >
                      <span className="truncate">@{bot.bot_username || bot.bot_full_name}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 flex-shrink-0" />}
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
