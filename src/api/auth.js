import client from './client';

export const login = (email, password) => 
  client.post('/auth/login', { email, password }).then(res => res.data);

export const getMe = () => 
  client.get('/me').then(res => res.data);
