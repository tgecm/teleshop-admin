import React from 'react';
import { useBotStore } from '../../store/botStore';
import { useAuthStore } from '../../store/authStore';
import { ChevronDown, Bot } from 'lucide-react';

export default function BotSwitcher() {
  const { bots, selectedBotId, setSelectedBot } = useBotStore();
  const { isSuperadmin } = useAuthStore();
  
  React.useEffect(() => {
    if (!selectedBotId && bots.length > 0) {
      setSelectedBot(bots[0].id);
    }
  }, [bots, selectedBotId, setSelectedBot]);

  const selectedBot = bots.find(b => b.id.toString() === selectedBotId?.toString());

  return (
    <div className="relative inline-block text-left w-full max-w-[200px] sm:max-w-xs">
      <div className="flex items-center gap-2 px-3 py-2 bg-white/10 rounded-2xl cursor-pointer hover:bg-white/20 transition-colors border border-white/20">
        <Bot className="w-4 h-4 text-white flex-shrink-0" />
        <div className="flex-1 min-w-0 relative">
          <select 
            value={selectedBotId || ''} 
            onChange={(e) => setSelectedBot(e.target.value)}
            className="w-full bg-transparent text-white text-xs sm:text-sm font-bold focus:outline-none appearance-none pr-6 cursor-pointer truncate"
          >
            {!selectedBotId && <option value="" disabled>Select Bot</option>}
            {bots.map(bot => (
              <option key={bot.id} value={bot.id} className="text-gray-900">
                {bot.bot_username || bot.bot_full_name}
              </option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-white absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>
    </div>
  );
}
