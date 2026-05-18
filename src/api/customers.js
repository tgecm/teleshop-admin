import client from './client';

export const getUsers = (params) => 
  client.get('/users', { params }).then(res => res.data);

export const updateUser = (id, data) => 
  client.patch(`/users/${id}`, data).then(res => res.data);
