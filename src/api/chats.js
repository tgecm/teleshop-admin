import client from './client';

export const getChats = (botId) =>
  client.get('/chats', { params: { bot_id: botId } }).then(res => res.data);

export const getChatMessages = (userId, botId) =>
  client.get(`/chats/${userId}/messages`, { params: { bot_id: botId } }).then(res => res.data);

export const sendChatMessage = (userId, botId, message, fileId, fileType) =>
  client.post(`/chats/${userId}/send`, { bot_id: botId, message, file_id: fileId, file_type: fileType }).then(res => res.data);

export const deleteChat = (userId, botId) =>
  client.delete(`/chats/${userId}`, { params: { bot_id: botId } }).then(res => res.data);

export const markChatRead = (userId, botId) =>
  client.post(`/chats/${userId}/mark-read`, { bot_id: botId }).then(res => res.data);

export const markChatUnread = (userId, botId) =>
  client.post(`/chats/${userId}/mark-unread`, { bot_id: botId }).then(res => res.data);

export const getWebVisitors = (botId) =>
  client.get(`/web-visitors/${botId}`).then(res => res.data);

export const getWebVisitorMessages = (visitorId, botId) =>
  client.get(`/web-visitors/${visitorId}/messages`, { params: { bot_id: botId } }).then(res => res.data);

export const sendWebVisitorMessage = (visitorId, botId, message, fileId, fileType) =>
  client.post(`/web-visitors/${visitorId}/send`, { bot_id: botId, message, file_id: fileId, file_type: fileType }).then(res => res.data);

export const deleteWebVisitor = (visitorId, botId) =>
  client.delete(`/web-visitors/${visitorId}`, { params: { bot_id: botId } }).then(res => res.data);

export const toggleWebVisitorAI = (visitorId, botId, aiDisabled) =>
  client.patch(`/web-visitors/${visitorId}/ai-toggle`, { bot_id: botId, ai_disabled: aiDisabled }).then(res => res.data);

export const markWebVisitorRead = (visitorId, botId) =>
  client.post(`/web-visitors/${visitorId}/mark-read`, { bot_id: botId }).then(res => res.data);

export const markWebVisitorUnread = (visitorId, botId) =>
  client.post(`/web-visitors/${visitorId}/mark-unread`, { bot_id: botId }).then(res => res.data);

export const getUnreadCount = (botId) =>
  client.get('/chats/unread-count', { params: { bot_id: botId } }).then(res => res.data);

export const initiateWebVisitorChat = (botId, payload) =>
  client.post('/web-visitors/initiate', { bot_id: botId, ...payload }).then(res => res.data);

export const getWebsiteCustomersForChat = (botId) =>
  client.get(`/website-customers/${botId}`).then(res => res.data);

