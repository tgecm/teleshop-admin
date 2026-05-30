export function isInAppBrowser() {
  return typeof window !== 'undefined' && typeof window.ReactNativeWebView?.postMessage === 'function';
}

export function downloadViaNative(dataUrl, filename) {
  if (!isInAppBrowser()) return false;
  window.ReactNativeWebView.postMessage(JSON.stringify({
    type: 'DOWNLOAD',
    data: dataUrl,
    filename,
  }));
  return true;
}
