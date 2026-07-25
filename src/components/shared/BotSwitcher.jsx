import React from 'react';
import { useBotStore } from '../../store/botStore';
import { useAuthStore } from '../../store/authStore';
import { ChevronDown, Bot } from 'lucide-react';

export default function BotSwitcher({ light }) {
  const { bots, selectedBotId, setSelectedBot } = useBotStore();
  const { isSuperadmin } = useAuthStore();
  
  React.useEffect(() => {
    if (!selectedBotId && bots.length > 0) {
      setSelectedBot(bots[0].id);
    }
  }, [bots, selectedBotId, setSelectedBot]);

  const selectedBot = bots.find(b => b.id.toString() === selectedBotId?.toString());

  return (
    <div className="relative inline-block text-left w-full">
      <div className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl cursor-pointer transition-all border ${
        light ? 'bg-indigo-50 border-indigo-200 hover:bg-indigo-100' : 'bg-white/10 border-white/20 hover:bg-white/20'
      }`}>
        <Bot className={`w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0 ${light ? 'text-indigo-600' : 'text-white'}`} />
        <div className="flex-1 min-w-0 relative">
          <select
            value={selectedBotId || ''}
            onChange={(e) => setSelectedBot(e.target.value)}
            className={`w-full bg-transparent text-[11px] sm:text-sm font-bold focus:outline-none appearance-none pr-5 sm:pr-6 cursor-pointer truncate ${light ? 'text-gray-900' : 'text-white'}`}
          >
            {!selectedBotId && <option value="" disabled>Select Bot</option>}
            {bots.map(bot => (
              <option
                key={bot.id}
                value={bot.id}
                style={{ background: 'var(--bg-surface, #121218)', color: 'var(--text-primary, #f8fafc)' }}
              >
                {bot.bot_username || bot.bot_full_name}
              </option>
            ))}
          </select>
          <ChevronDown className={`w-3 h-3 sm:w-3.5 sm:h-3.5 absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none ${
            light ? 'text-gray-400' : 'text-white'
          }`} />
        </div>
      </div>
    </div>
  );
}
