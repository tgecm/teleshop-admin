import client from './client';

const API_BASE = 'https://api.telegramecommerce.shop';

export const getUsers = (params) =>
  client.get('/users', { params }).then(res => res.data);

export const updateUser = (id, data) =>
  client.patch(`/users/${id}`, data).then(res => res.data);

export const syncWebCustomer = (data) =>
  fetch(`${API_BASE}/website-customers/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }).then(res => {
    if (!res.ok) throw new Error('Sync failed');
    return res.json();
  });

export const getWebCustomers = (botId) =>
  client.get(`/website-customers/${botId}`).then(res => res.data);
