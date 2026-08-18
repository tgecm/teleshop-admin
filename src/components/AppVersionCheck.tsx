import { useEffect } from 'react';
import { useToastStore } from '../store/toastStore';

const VERSION_KEY = 'app_build_version';
const TOAST_KEY = 'ota_show_updated_toast';

export default function AppVersionCheck() {
  const addToast = useToastStore(state => state.addToast);

  useEffect(() => {
    // Check if an OTA update was just applied
    if (localStorage.getItem(TOAST_KEY) === 'true') {
      localStorage.removeItem(TOAST_KEY);
      addToast('Your app is up to date!', 'success');
    }

    fetch('/build-version.json?' + Date.now(), { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(async data => {
        if (!data?.version) return;
        const stored = localStorage.getItem(VERSION_KEY);
        if (stored && stored !== data.version) {
          if ('serviceWorker' in navigator) {
            const reg = await navigator.serviceWorker.ready;
            if (reg?.waiting) reg.waiting.postMessage('SKIP_WAITING');
          }
          localStorage.setItem(VERSION_KEY, data.version);
          if (!localStorage.getItem(TOAST_KEY)) {
            addToast('Your app is up to date!', 'success');
          }
        } else if (!stored) {
          localStorage.setItem(VERSION_KEY, data.version);
        }
      })
      .catch(() => {});
  }, [addToast]);

  return null;
}
