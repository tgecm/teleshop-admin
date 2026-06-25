import client from './client';

export const getQRMenuItems = (botId) =>
  client.get(`/qr-menu/${botId}`).then(res => res.data);

export const createQRMenuItem = (data) =>
  client.post('/qr-menu', data).then(res => res.data);

export const updateQRMenuItem = (id, data) =>
  client.put(`/qr-menu/${id}`, data).then(res => res.data);

export const deleteQRMenuItem = (id) =>
  client.delete(`/qr-menu/${id}`).then(res => res.data);

export const getQRMenuCategories = (botId) =>
  client.get(`/qr-menu/${botId}/categories`).then(res => res.data);

export const createQRMenuCategory = (data) =>
  client.post('/qr-menu/categories', data).then(res => res.data);

export const updateQRMenuCategory = (id, data) =>
  client.put(`/qr-menu/categories/${id}`, data).then(res => res.data);

export const deleteQRMenuCategory = (id) =>
  client.delete(`/qr-menu/categories/${id}`).then(res => res.data);

// ── Customer ID / Points / Coupons ──

export const identifyCustomer = (phone, botId, name) =>
  client.post('/public/qr-menu/customer/identify', { phone, bot_id: botId, name }).then(r => r.data);

export const redeemPoints = (customerId, pointsToUse, orderTotal, botId) =>
  client.post('/public/qr-menu/customer/redeem-points', {
    customer_id: customerId, points_to_use: pointsToUse, order_total: orderTotal, bot_id: botId,
  }).then(r => r.data);

export const validateCoupon = (code, orderTotal, botId) =>
  client.post('/public/qr-menu/coupon/validate', { code, order_total: orderTotal, bot_id: botId }).then(r => r.data);

export const getCustomers = (botId, search = '') =>
  client.get(`/admin/qr-menu/customers`, { params: { bot_id: botId, search } }).then(r => r.data);

export const getCustomerDetail = (customerId, botId) =>
  client.get(`/admin/qr-menu/customers/${customerId}`, { params: { bot_id: botId } }).then(r => r.data);

export const adjustCustomerPoints = (customerId, botId, points, reason) =>
  client.post(`/admin/qr-menu/customers/${customerId}/adjust-points`, { bot_id: botId, points, reason }).then(r => r.data);

export const getCoupons = (botId) =>
  client.get('/admin/qr-menu/coupons', { params: { bot_id: botId } }).then(r => r.data);

export const createCoupon = (data) =>
  client.post('/admin/qr-menu/coupons', data).then(r => r.data);

export const deleteCoupon = (couponId, botId) =>
  client.delete(`/admin/qr-menu/coupons/${couponId}`, { params: { bot_id: botId } }).then(r => r.data);

export const getQRMenuStats = ({ bot_id, days, start_date, end_date }) =>
  client.get(`/qr-menu/${bot_id}/stats`, { params: { days, start_date, end_date } }).then(r => r.data);
