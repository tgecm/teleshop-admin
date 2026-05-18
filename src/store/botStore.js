import { create } from 'zustand';

export const useBotStore = create((set) => ({
  bots: [],
  selectedBotId: localStorage.getItem('selectedBotId') || null,
  setBots: (bots) => set({ bots }),
  setSelectedBot: (botId) => {
    localStorage.setItem('selectedBotId', botId);
    set({ selectedBotId: botId });
  },
}));
