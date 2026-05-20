import { useState, useRef, useCallback } from 'react';

const THRESHOLD = 50;
const MAX_PULL = 100;

export default function PullToRefresh({ onRefresh, children }) {
  const [state, setState] = useState('idle');
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef(0);
  const pulling = useRef(false);

  const handleTouchStart = useCallback((e) => {
    const main = document.querySelector('main');
    if (main && main.scrollTop <= 0) {
      startY.current = e.touches[0].clientY;
      pulling.current = false;
    }
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (state === 'refreshing') return;
    const main = document.querySelector('main');
    if (main && main.scrollTop > 0) return;

    const diff = e.touches[0].clientY - startY.current;
    if (diff > 0) {
      pulling.current = true;
      const distance = Math.min(diff * 0.35, MAX_PULL);
      setPullDistance(distance);
      setState(distance >= THRESHOLD ? 'ready' : 'pulling');
    }
  }, [state]);

  const handleTouchEnd = useCallback(async () => {
    if (!pulling.current) return;
    pulling.current = false;

    if (pullDistance >= THRESHOLD && state !== 'refreshing') {
      setState('refreshing');
      setPullDistance(24);
      try {
        await onRefresh?.();
      } catch {
        // ignore
      } finally {
        setState('idle');
        setPullDistance(0);
      }
    } else {
      setState('idle');
      setPullDistance(0);
    }
  }, [pullDistance, state, onRefresh]);

  const rotation = pullDistance * 2.5;

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      <div
        className="flex justify-center items-center overflow-hidden"
        style={{
          height: state === 'refreshing' ? 48 : pullDistance,
          transition: state === 'pulling' ? 'none' : 'height 0.3s ease-out',
        }}
      >
        <div
          className="flex items-center justify-center"
          style={{
            opacity: state === 'refreshing' ? 1 : Math.min(pullDistance / THRESHOLD, 1),
          }}
        >
          {state === 'refreshing' ? (
            <svg className="w-6 h-6 text-indigo-600 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg
              className="w-7 h-7 transition-colors"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              style={{
                color: pullDistance >= THRESHOLD ? '#4f46e5' : '#d1d5db',
                transform: `rotate(${rotation}deg)`,
              }}
            >
              <path d="M12 5v14M5 12l7 7 7-7" />
            </svg>
          )}
        </div>
      </div>

      {/* Content */}
      <div
        style={{
          transform: state === 'refreshing' ? 'translateY(0)' : `translateY(${Math.max(0, pullDistance - 28)}px)`,
          transition: state === 'pulling' ? 'none' : 'transform 0.3s ease-out',
        }}
      >
        {children}
      </div>
    </div>
  );
}
