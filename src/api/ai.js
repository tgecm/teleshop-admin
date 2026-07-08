import client from './client';

export const getGuidePrompt = (botId) =>
  client.get(`/ai/guide-prompt/${botId}`).then(res => res.data);

export const updateGuidePrompt = (botId, prompt) =>
  client.put(`/ai/guide-prompt/${botId}`, { guide_prompt: prompt }).then(res => res.data);

export const sendAdminAiChat = (botId, message) =>
  client.post('/ai/admin-chat', { bot_id: botId, message }).then(res => res.data);
