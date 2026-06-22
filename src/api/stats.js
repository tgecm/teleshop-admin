import client from './client';

export const getStats = (params) => 
  client.get('/stats', { params }).then(res => res.data);

export const getOrdersByDay = (params) => 
  client.get('/stats/orders-by-day', { params }).then(res => res.data);

export const getTopProducts = (params) =>
  client.get('/stats/top-products', { params }).then(res => res.data);

export const getUsersByDay = (params) =>
  client.get('/stats/users-by-day', { params }).then(res => res.data);

export const getProfitSummary = (params) =>
  client.get('/stats/profit-summary', { params }).then(res => res.data);
