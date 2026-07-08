import { useQueryClient } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import { useState, useCallback } from 'react';

export default function RefreshButton({ className = '' }) {
  const queryClient = useQueryClient();
  const [spinning, setSpinning] = useState(false);

  const handleRefresh = useCallback(() => {
    setSpinning(true);
    queryClient.invalidateQueries().then(() => {
      setTimeout(() => setSpinning(false), 400);
    });
  }, [queryClient]);

  return (
    <button
      onClick={handleRefresh}
      className={`relative p-2 text-white/80 hover:text-white bg-white/0 hover:bg-white/15 active:bg-white/25 rounded-full transition-all duration-300 hover:scale-110 active:scale-90 ${className}`}
      title="Refresh data"
    >
      <RefreshCw className={`w-[18px] h-[18px] ${spinning ? 'animate-spin' : ''}`} />
    </button>
  );
}
