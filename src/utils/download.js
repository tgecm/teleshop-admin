function hasAndroidBridge() {
  return typeof window !== 'undefined' &&
    window.AndroidBridge &&
    typeof window.AndroidBridge.downloadBase64 === 'function';
}

export async function downloadBlob(blob, filename) {
  if (hasAndroidBridge()) {
    const reader = new FileReader();
    const base64 = await new Promise((resolve, reject) => {
      reader.onloadend = () => resolve(reader.result.split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    const mime = (blob.type || '').split(';')[0].trim() || 'application/octet-stream';
    window.AndroidBridge.downloadBase64(base64, mime, `filename="${filename}"`);
    return;
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function downloadText(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  return downloadBlob(blob, filename);
}

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
