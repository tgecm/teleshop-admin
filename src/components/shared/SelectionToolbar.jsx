import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Copy } from 'lucide-react';

export default function SelectionToolbar() {
  const [state, setState] = useState({ show: false, x: 0, y: 0, hasSelection: false });
  const barRef = useRef(null);

  useEffect(() => {
    const handle = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !sel.toString().trim()) {
        setState(s => s.show ? { show: false, x: 0, y: 0, hasSelection: false } : s);
        return;
      }

      const el = sel.anchorNode;
      // Only show for inputs, textareas, contenteditable
      const isEditable = el && (
        el.nodeType === 1
          ? ['INPUT', 'TEXTAREA'].includes(el.tagName) || el.closest?.('input, textarea, [contenteditable]')
          : el.parentElement?.closest?.('input, textarea, [contenteditable]')
      );
      if (!isEditable) return;

      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      let x = rect.left + rect.width / 2;
      let y = rect.top - 12;

      // Clamp to viewport
      if (barRef.current) {
        const bw = barRef.current.offsetWidth;
        x = Math.max(16, Math.min(x, window.innerWidth - bw - 16));
      }
      y = Math.max(16, y);

      setState({ show: true, x, y, hasSelection: true });
    };

    document.addEventListener('selectionchange', handle);
    document.addEventListener('scroll', handle, true);
    return () => {
      document.removeEventListener('selectionchange', handle);
      document.removeEventListener('scroll', handle, true);
    };
  }, []);

  const doAction = async (action) => {
    try {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) return;
      const text = sel.toString();

      switch (action) {
        case 'copy':
          await navigator.clipboard.writeText(text);
          break;
        case 'cut':
          if (sel.anchorNode?.parentElement?.closest?.('input, textarea, [contenteditable]')) {
            await navigator.clipboard.writeText(text);
            document.execCommand('cut');
          }
          break;
        case 'selectAll':
          const el = sel.anchorNode?.parentElement?.closest?.('input, textarea, [contenteditable]');
          if (el) {
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
              el.select();
            } else {
              document.execCommand('selectAll', false, null);
            }
          }
          break;
      }
    } catch (e) {
      // Fallback for older browsers
      try {
        if (action === 'copy') document.execCommand('copy');
        if (action === 'cut') document.execCommand('cut');
        if (action === 'selectAll') document.execCommand('selectAll');
      } catch {}
    }
    // Brief flash feedback
    setTimeout(() => {
      window.getSelection()?.removeAllRanges();
      setState({ show: false, x: 0, y: 0, hasSelection: false });
    }, 100);
  };

  if (!state.show) return null;

  return (
    <AnimatePresence>
      {state.show && (
        <motion.div
          ref={barRef}
          initial={{ opacity: 0, scale: 0.85, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.85, y: 8 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          style={{
            position: 'fixed',
            left: state.x,
            top: state.y,
            zIndex: 99999,
            transform: 'translateX(-50%) translateY(-100%)',
          }}
          className="flex items-center gap-1 px-2 py-1.5 bg-gray-900/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/10"
        >
          <button
            onClick={() => doAction('copy')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-white/90 hover:text-white hover:bg-white/10 active:scale-90 transition-all"
          >
            <Copy className="w-4 h-4" />
            <span className="text-xs font-bold">Copy</span>
          </button>
          <div className="w-px h-5 bg-white/10" />
          <button
            onClick={() => doAction('selectAll')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-white/90 hover:text-white hover:bg-white/10 active:scale-90 transition-all"
          >
            <span className="text-xs font-bold">Select All</span>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
