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
