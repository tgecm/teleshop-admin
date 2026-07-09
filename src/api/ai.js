import client from './client';

export const getGuidePrompt = () =>
  client.get('/ai/guide-prompt/global').then(res => res.data);

export const updateGuidePrompt = (prompt) =>
  client.put('/ai/guide-prompt/global', { guide_prompt: prompt }).then(res => res.data);

export const sendAdminAiChat = (botId, message) =>
  client.post('/ai/admin-chat', { bot_id: botId, message }).then(res => res.data);
