import client from './client';

export const getCustomCommands = (params) =>
  client.get('/custom-commands', { params }).then(res => res.data);

export const createCustomCommand = (data) =>
  client.post('/custom-commands', data).then(res => res.data);

export const deleteCustomCommand = (id) =>
  client.delete(`/custom-commands/${id}`).then(res => res.data);
