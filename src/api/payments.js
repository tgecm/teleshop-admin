import client from './client';

export const getPaymentMethods = (params) => 
  client.get('/payment-methods', { params }).then(res => res.data);

export const createPayment = (data) => 
  client.post('/payment-methods', data).then(res => res.data);

export const updatePayment = (id, data) => 
  client.patch(`/payment-methods/${id}`, data).then(res => res.data);

export const deletePayment = (id) => 
  client.delete(`/payment-methods/${id}`).then(res => res.data);
