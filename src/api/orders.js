import client from './client';

export const getOrders = (params) => 
  client.get('/orders', { params }).then(res => res.data);

export const updateOrder = (id, data) => 
  client.patch(`/orders/${id}/status`, data).then(res => res.data);
