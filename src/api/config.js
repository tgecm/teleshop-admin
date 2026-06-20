export const API_BASE = import.meta.env.VITE_API_BASE || 'https://api.telegramecommerce.shop';

export const fileUrl = (fileId, botId) =>
  `${API_BASE}/telegram/file/${encodeURIComponent(fileId)}?bot_id=${botId}`;
