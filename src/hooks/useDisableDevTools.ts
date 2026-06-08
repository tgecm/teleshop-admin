import { useEffect } from 'react';
import { clickSound } from '../utils/sound';

function removeMenu(menu: HTMLDivElement | null) {
  if (menu && menu.parentNode) {
    menu.parentNode.removeChild(menu);
  }
}

function navigateTo(path: string) {
  window.history.pushState(null, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export function useDisableDevTools() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && ['I', 'J'].includes(e.key)) ||
        (e.ctrlKey && e.key === 'U')
      ) {
        e.preventDefault();
      }
    };

    let menu: HTMLDivElement | null = null;

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();

      // Don't show global menu on pages that have their own context menus
      const path = window.location.pathname;
      if (path === '/chats' || path.startsWith('/chats/')) return;

      clickSound();
      removeMenu(menu);

      menu = document.createElement('div');
      menu.style.cssText = [
        'position: fixed',
        'z-index: 99999',
        'background: #fff',
        'border-radius: 14px',
        'box-shadow: 0 8px 40px rgba(0,0,0,.18)',
        'padding: 6px',
        'min-width: 190px',
        'border: 1px solid #e5e7eb',
        'overflow: hidden',
      ].join(';');

      const x = Math.min(e.clientX, window.innerWidth - 210);
      const y = Math.min(e.clientY, window.innerHeight - 140);
      menu.style.left = `${x}px`;
      menu.style.top = `${y}px`;

      const items = [
        { icon: '＋', label: 'Add New Product', path: '/products' },
        { icon: '📝', label: 'Create Post', path: '/newsfeed' },
      ];

      items.forEach((item) => {
        const btn = document.createElement('button');
        btn.innerHTML = `<span style="margin-right:8px">${item.icon}</span>${item.label}`;
        btn.style.cssText = [
          'display:flex',
          'align-items:center',
          'width:100%',
          'padding:10px 14px',
          'text-align:left',
          'background:none',
          'border:none',
          'border-radius:10px',
          'font-size:14px',
          'font-weight:500',
          'color:#374151',
          'cursor:pointer',
          'line-height:1.4',
        ].join(';');
        btn.addEventListener('mouseenter', () => { btn.style.background = '#f3f4f6'; });
        btn.addEventListener('mouseleave', () => { btn.style.background = 'none'; });
        btn.addEventListener('click', () => {
          removeMenu(menu);
          navigateTo(item.path);
        });
        menu.appendChild(btn);
      });

      document.body.appendChild(menu);

      const close = (ev: MouseEvent) => {
        if (menu && !menu.contains(ev.target as Node)) {
          removeMenu(menu);
          document.removeEventListener('click', close, true);
        }
      };
      setTimeout(() => document.addEventListener('click', close, true), 0);
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('contextmenu', handleContextMenu);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('contextmenu', handleContextMenu);
      removeMenu(menu);
    };
  }, []);
}
