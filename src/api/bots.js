import client from './client';

export const getBots = () => 
  client.get('/bots').then(res => res.data);

export const getBot = (id) => 
  client.get(`/bots/${id}`).then(res => res.data);

export const updateBot = (id, data) =>
  client.patch(`/bots/${id}`, data).then(res => res.data);

export const deleteBot = (id) =>
  client.delete(`/bots/${id}`).then(res => res.data);

export const getAiSettings = (bot_id) =>
  client.get(`/bots/${bot_id}/ai-settings`).then(res => res.data);

export const updateAiSettings = (bot_id, data) =>
  client.put(`/bots/${bot_id}/ai-settings`, data).then(res => res.data);

export const testAiFollowup = (bot_id) =>
  client.post(`/bots/${bot_id}/test-followup`).then(res => res.data);

export const getSalesDisplay = (bot_id) =>
  client.get(`/bots/${bot_id}/sales-display`).then(res => res.data);

export const updateSalesDisplay = (bot_id, choice) =>
  client.put(`/bots/${bot_id}/sales-display`, { sales_display: choice }).then(res => res.data);

