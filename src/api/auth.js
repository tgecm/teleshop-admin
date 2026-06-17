import client from './client';

export const login = (email, password) =>
  client.post('/auth/login', { email, password }).then(res => res.data);

export const verifyLoginCode = (loginToken, code) =>
  client.post('/auth/login/verify', { login_token: loginToken, code }).then(res => res.data);

export const getMe = () =>
  client.get('/me').then(res => res.data);

export const pollLoginApproval = (loginToken) =>
  client.get('/auth/login/poll', { params: { login_token: loginToken } }).then(res => res.data);

export const getLoginAudit = () =>
  client.get('/api/audit/logins').then(res => res.data);
