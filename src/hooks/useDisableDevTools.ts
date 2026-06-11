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
      // Let native context menu work on inputs/textareas (copy/paste on mobile)
      const target = e.target as HTMLElement;
      if (target?.tagName === 'TEXTAREA' || target?.tagName === 'INPUT' || target?.closest('textarea') || target?.closest('input')) return;

      e.preventDefault();

      // Only show custom menu inside admin dashboard
      const path = window.location.pathname.replace(/^\//, '').split('/')[0];
      const ADMIN_ROUTES = new Set(['dashboard', 'orders', 'products', 'customers', 'broadcast', 'commands', 'payments', 'subscription', 'settings', 'chats', 'more', 'customization', 'bot-customization', 'newsfeed', 'superadmin', 'send-message', 'faqs', 'staff-accounts']);
      if (!ADMIN_ROUTES.has(path)) return;

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
    const preventCtx = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target?.tagName === 'TEXTAREA' || target?.tagName === 'INPUT' || target?.closest('textarea') || target?.closest('input')) return;
      e.preventDefault();
    };
    window.addEventListener('contextmenu', preventCtx, { capture: true });
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('contextmenu', preventCtx, { capture: true });
      removeMenu(menu);
    };
  }, []);
}
