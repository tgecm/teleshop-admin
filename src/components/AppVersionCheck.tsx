import { useEffect } from 'react';

const VERSION_KEY = 'app_build_version';

export default function AppVersionCheck() {
  useEffect(() => {
    fetch('/build-version.json?' + Date.now(), { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(async data => {
        if (!data?.version) return;
        const stored = localStorage.getItem(VERSION_KEY);
        if (stored && stored !== data.version) {
          if ('serviceWorker' in navigator) {
            const reg = await navigator.serviceWorker.ready;
            if (reg.waiting) reg.waiting.postMessage('SKIP_WAITING');
          }
          localStorage.setItem(VERSION_KEY, data.version);
          window.location.reload();
        } else if (!stored) {
          localStorage.setItem(VERSION_KEY, data.version);
        }
      })
      .catch(() => {});
  }, []);

  return null;
}
