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

export const getFaqs = () =>
  client.get('/faqs').then(res => res.data);

export const createFaq = (question, answer) =>
  client.post('/faqs', { question, answer }).then(res => res.data);

export const deleteFaq = (id) =>
  client.delete(`/faqs/${id}`).then(res => res.data);

export const updateFaq = (id, question, answer) =>
  client.put(`/faqs/${id}`, { question, answer }).then(res => res.data);

export const reorderFaqs = (items) =>
  client.put('/faqs/reorder', { items }).then(res => res.data);

export const getStaffActivityLogs = (botId, staffId, startDate, endDate) =>
  client.get('/staff/activity-logs', { params: { bot_id: botId, staff_id: staffId, start_date: startDate, end_date: endDate } }).then(res => res.data);

export const downloadStaffActivityLogs = (botId, staffId, startDate, endDate) =>
  client.get('/staff/activity-logs/download', { params: { bot_id: botId, staff_id: staffId, start_date: startDate, end_date: endDate }, responseType: 'blob' }).then(res => res.data);

// ── Subscription Discount Codes ──────────────────────────────────

export const getSubscriptionDiscounts = () =>
  client.get('/superadmin/subscription-discounts').then(res => res.data);

export const createSubscriptionDiscount = (data) =>
  client.post('/superadmin/subscription-discounts', data).then(res => res.data);

export const updateSubscriptionDiscount = (id, data) =>
  client.put(`/superadmin/subscription-discounts/${id}`, data).then(res => res.data);

export const deleteSubscriptionDiscount = (id) =>
  client.delete(`/superadmin/subscription-discounts/${id}`).then(res => res.data);

export const validateSubscriptionDiscount = (code) =>
  client.post('/public/validate-subscription-discount', { code }).then(res => res.data);

export const triggerApkUpdate = () =>
  client.post('/superadmin/update-apk').then(res => res.data);

export const getSubscribers = () =>
  client.get('/superadmin/subscribers').then(res => res.data);
