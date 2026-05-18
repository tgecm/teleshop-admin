import client from './client';

export const getContentBlocks = (params) =>
  client.get('/content-blocks', { params }).then(res => res.data);

export const updateContentBlock = (bot_id, key, data) =>
  client.put(`/content-blocks/${bot_id}/${key}`, data).then(res => res.data);
