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
