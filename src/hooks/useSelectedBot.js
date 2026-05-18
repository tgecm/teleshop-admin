import { useBotStore } from '../store/botStore';

export const useSelectedBot = () => {
  const selectedBotId = useBotStore((state) => state.selectedBotId);
  const bots = useBotStore((state) => state.bots);
  const selectedBot = bots.find(b => b.id.toString() === selectedBotId?.toString());
  
  return { selectedBotId, selectedBot };
};
