import client from './client';

export const getStats = (params) => 
  client.get('/stats', { params }).then(res => res.data);

export const getOrdersByDay = (params) => 
  client.get('/stats/orders-by-day', { params }).then(res => res.data);

export const getTopProducts = (params) => 
  client.get('/stats/top-products', { params }).then(res => res.data);
