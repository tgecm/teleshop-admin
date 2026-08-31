const getApiBase = () => {
  if (import.meta.env.VITE_API_BASE) {
    return import.meta.env.VITE_API_BASE;
  }
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1' || host.startsWith('192.168.')) {
      return 'http://139.180.156.116:8001';
    }
  }
  return 'https://api.telegramecommerce.shop';
};

export const API_BASE = getApiBase();

export const fileUrl = (fileId, botId) =>
  `${API_BASE}/telegram/file/${encodeURIComponent(fileId)}?bot_id=${botId}`;
