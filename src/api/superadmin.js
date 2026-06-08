import client from './client';

export const getAllBots = () =>
  client.get('/superadmin/bots').then(res => res.data);

export const getGlobalSettings = () =>
  client.get('/settings').then(res => res.data);

export const updateGlobalSetting = (key, value) =>
  client.put(`/settings/${key}`, { value }).then(res => res.data);

export const getPlanPayments = () =>
  client.get('/plan-payments').then(res => res.data);

export const createPlanPayment = (data) =>
  client.post('/plan-payments', data).then(res => res.data);

export const updatePlanPayment = (id, data) =>
  client.patch(`/plan-payments/${id}`, data).then(res => res.data);

export const deletePlanPayment = (id) =>
  client.delete(`/plan-payments/${id}`).then(res => res.data);

export const sendSuperadminMessage = (botId, message) =>
  client.post('/superadmin/send-message', { bot_id: botId, message }).then(res => res.data);

export const getSuperadminMessages = () =>
  client.get('/superadmin/messages').then(res => res.data);

export const getAdminMessages = () =>
  client.get('/admin/messages').then(res => res.data);

export const getAdminUnreadMessagesCount = () =>
  client.get('/admin/messages/unread-count').then(res => res.data);

export const markAdminMessagesRead = () =>
  client.post('/admin/messages/read').then(res => res.data);

export const getSupportConversations = () =>
  client.get('/superadmin/support/conversations').then(res => res.data);

export const getSupportMessages = (botId) =>
  client.get(`/superadmin/support/messages/${botId}`).then(res => res.data);

export const replySupport = (botId, message) =>
  client.post(`/superadmin/support/reply/${botId}`, { message }).then(res => res.data);

export const deleteAdminMessage = (messageId) =>
  client.delete(`/admin/messages/${messageId}`).then(res => res.data);
