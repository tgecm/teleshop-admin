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
<<<<<<< HEAD
  return `https://api.telegramecommerce.shop/telegram/file/${image_url}?bot_id=${bot_id}`;
=======

  // Handle JSON array format: [{"type": "photo", "file_id": "..."}]
  let file_id = image_url;
  try {
    const parsed = JSON.parse(image_url);
    if (Array.isArray(parsed) && parsed.length > 0) {
      // Prefer photo over video or other types
      const photo = parsed.find(m => m.type === 'photo') || parsed[0];
      file_id = photo.file_id;
    }
  } catch (e) {
    // Not JSON, use as-is (plain file_id string)
  }

  const token = localStorage.getItem('auth-storage') 
    ? JSON.parse(localStorage.getItem('auth-storage'))?.state?.token 
    : null;
    
  let url = `https://api.telegramecommerce.shop/telegram/file/${encodeURIComponent(file_id)}?bot_id=${bot_id}`;
  if (token) {
    url += `&token=${token}`;
  }
  return url;
>>>>>>> 6180183a10797ece4076f056bc98d10405791db7
};
