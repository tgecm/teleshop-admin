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
      className={`p-2 text-white hover:bg-white/10 active:bg-white/15 rounded-xl transition-all active:scale-90 ${className}`}
      title="Refresh data"
    >
      <RefreshCw className={`w-[18px] h-[18px] ${spinning ? 'animate-spin' : ''}`} />
    </button>
  );
}
