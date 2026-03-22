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

export const uploadImage = (file, bot_id) => {
  const formData = new FormData();
  formData.append('file', file);
  return client.post(`/upload/image?bot_id=${bot_id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }).then(res => res.data);
};

export const getImageUrl = (image_url, bot_id) => {
  if (!image_url) return null;
  if (image_url.startsWith('http')) return image_url;
  return `https://api.telegramecommerce.shop/telegram/file/${image_url}?bot_id=${bot_id}`;
};
