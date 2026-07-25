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
      className={`relative p-2 rounded-full transition-all active:scale-90 ${className}`}
      style={{ color: 'var(--topbar-subtext)' }}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--topbar-btn-hover)')}
      onMouseLeave={e => (e.currentTarget.style.background = '')}
      title="Refresh data"
    >
      <RefreshCw className={`w-[18px] h-[18px] ${spinning ? 'animate-spin' : ''}`} />
    </button>
  );
}
