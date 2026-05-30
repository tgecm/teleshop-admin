import client from './client';

export const getNewsfeedPosts = (botId) =>
  client.get('/newsfeed/posts', { params: { bot_id: botId } }).then(res => res.data);

export const createNewsfeedPost = (data) =>
  client.post('/newsfeed/posts', data).then(res => res.data);

export const updateNewsfeedPost = (postId, data) =>
  client.patch(`/newsfeed/posts/${postId}`, data).then(res => res.data);

export const deleteNewsfeedPost = (postId) =>
  client.delete(`/newsfeed/posts/${postId}`).then(res => res.data);
