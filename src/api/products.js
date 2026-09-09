import { API_BASE } from './config';
import client from './client';

export const getProducts = (params) => 
  client.get('/products', { params }).then(res => res.data);

export const getCategories = (params) => 
  client.get('/categories', { params }).then(res => res.data);

export const createProduct = (data) => 
  client.post('/products', data).then(res => res.data);

export const updateProduct = (id, data) => 
  client.patch(`/products/${id}`, data).then(res => res.data);

export const deleteProduct = (id) =>
  client.delete(`/products/${id}`).then(res => res.data);

export const createCategory = (data) =>
  client.post('/categories', data).then(res => res.data);

export const uploadImage = (file, bot_id, silent = false) => {
  const formData = new FormData();
  formData.append('file', file);
  const silentQuery = silent ? '&silent=true' : '';
  return client.post(`/upload/image?bot_id=${bot_id}${silentQuery}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }).then(res => res.data);
};

export const uploadTempImage = (file, bot_id) => {
  return uploadImage(file, bot_id, true);
};

export const updateProductSortOrder = (botId, items) =>
  client.put('/products/sort-order', { bot_id: Number(botId), items }).then(res => res.data);

export const updateCategory = (id, data) =>
  client.patch(`/categories/${id}`, data).then(res => res.data);

export const deleteCategory = (id) =>
  client.delete(`/categories/${id}`).then(res => res.data);

export const getImageUrl = (image_url, bot_id) => {
  if (!image_url) return null;
  if (image_url.startsWith('http')) return image_url;

  let file_id = image_url;
  try {
    const parsed = JSON.parse(image_url);
    if (Array.isArray(parsed) && parsed.length > 0) {
      const photo = parsed.find(m => m.type === 'photo') || parsed[0];
      file_id = photo.file_id;
    }
  } catch (e) {}

  const token = localStorage.getItem('auth-storage') 
    ? JSON.parse(localStorage.getItem('auth-storage'))?.state?.token 
    : null;
    
  let url = `${API_BASE}/telegram/file/${encodeURIComponent(file_id)}?bot_id=${bot_id}`;
  if (token) {
    url += `&token=${token}`;
  }
  return url;
};
