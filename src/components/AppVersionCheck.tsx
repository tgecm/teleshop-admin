import { useEffect } from 'react';

const VERSION_KEY = 'app_build_version';

export default function AppVersionCheck() {
  useEffect(() => {
    fetch('/build-version.json?' + Date.now(), { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data?.version) return;
        const stored = localStorage.getItem(VERSION_KEY);
        if (stored && stored !== data.version) {
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
