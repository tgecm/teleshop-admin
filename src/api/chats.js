import client from './client';

export const getChats = (botId) =>
  client.get('/chats', { params: { bot_id: botId } }).then(res => res.data);

export const getChatMessages = (userId, botId) =>
  client.get(`/chats/${userId}/messages`, { params: { bot_id: botId } }).then(res => res.data);

export const sendChatMessage = (userId, botId, message) =>
  client.post(`/chats/${userId}/send`, { bot_id: botId, message }).then(res => res.data);

export const deleteChat = (userId, botId) =>
  client.delete(`/chats/${userId}`, { params: { bot_id: botId } }).then(res => res.data);

export const markChatRead = (userId, botId) =>
  client.post(`/chats/${userId}/mark-read`, { bot_id: botId }).then(res => res.data);

export const markChatUnread = (userId, botId) =>
  client.post(`/chats/${userId}/mark-unread`, { bot_id: botId }).then(res => res.data);
