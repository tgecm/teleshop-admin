import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';

/**
 * Opens a URL in the standalone system browser app (e.g. Chrome on Android) on native mobile platforms,
 * or in a new browser tab on the web.
 */
export async function openExternalUrl(url, e) {
  if (e && typeof e.preventDefault === 'function') {
    e.preventDefault();
    e.stopPropagation();
  }
  if (!url) return;
  try {
    if (Capacitor.isNativePlatform()) {
      // windowName: '_system' forces Capacitor to open the URL in the standalone system browser app (Chrome)
      await Browser.open({ url, windowName: '_system' });
    } else {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  } catch (err) {
    console.error('Failed to open URL with Capacitor Browser, falling back to window.open:', err);
    try {
      window.open(url, '_system', 'noopener,noreferrer');
    } catch {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }
}
