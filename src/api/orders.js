import client from './client';

export const getOrders = (params) => 
  client.get('/orders', { params }).then(res => res.data);

export const updateOrder = (id, data) =>
  client.patch(`/orders/${id}/status`, data).then(res => res.data);

export const getPendingOrderCount = (botId) =>
  client.get('/orders/pending-count', { params: { bot_id: botId } }).then(res => res.data);

export const generateInvoiceNumber = (orderId) =>
  client.post(`/orders/${orderId}/invoice-number`).then(res => res.data);
