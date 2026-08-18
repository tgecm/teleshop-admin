import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { useToastStore } from '../store/toastStore';

const TOAST_KEY = 'ota_show_updated_toast';

export default function AppVersionCheck() {
  const addToast = useToastStore(state => state.addToast);

  useEffect(() => {
    // Disable in web browsers — ONLY run on native Android/iOS Capacitor app
    if (!Capacitor.isNativePlatform()) {
      localStorage.removeItem(TOAST_KEY);
      return;
    }

    // Show ONLY ONCE after a live OTA update has been applied on native app
    if (localStorage.getItem(TOAST_KEY) === 'true') {
      localStorage.removeItem(TOAST_KEY);
      addToast('Your app is up to date!', 'success');
    }
  }, [addToast]);

  return null;
}
