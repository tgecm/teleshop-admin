import { create } from 'zustand';

export const useBotStore = create((set) => ({
  bots: [],
  botsLoaded: false,
  selectedBotId: localStorage.getItem('selectedBotId') || null,
  setBots: (bots) => set({ bots, botsLoaded: true }),
  setSelectedBot: (botId) => {
    localStorage.setItem('selectedBotId', botId);
    set({ selectedBotId: botId });
  },
}));
