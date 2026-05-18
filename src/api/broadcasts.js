import client from './client';

export const getBroadcasts = (params) => 
  client.get('/broadcasts', { params }).then(res => res.data);

export const getGiveaways = (params) => 
  client.get('/giveaways', { params }).then(res => res.data);

export const getGiveawayParticipants = (id) => 
  client.get(`/giveaways/${id}/participants`).then(res => res.data);

export const createBroadcast = (data) => 
  client.post('/broadcasts', data).then(res => res.data);

export const createGiveaway = (data) => 
  client.post('/giveaways', data).then(res => res.data);
