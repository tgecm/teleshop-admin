import client from './client';

export const getPublicShop = (slug) =>
  client.get(`/public/shop/${slug}`).then(res => res.data);

export const getBotPublicSlug = (botId) =>
  client.get(`/bots/${botId}/public-slug`).then(res => res.data);

export const generateBotSlug = (botId) =>
  client.post(`/bots/${botId}/generate-slug`).then(res => res.data);

export const setBotDomain = (botId, domain) =>
  client.post(`/bots/${botId}/set-domain`, { domain }).then(res => res.data);

export const getBotDomainStatus = (botId) =>
  client.get(`/bots/${botId}/domain-status`).then(res => res.data);

export const verifyBotDomain = (botId) =>
  client.post(`/bots/${botId}/verify-domain`).then(res => res.data);

export const toggleBotDomain = (botId, enabled) =>
  client.post(`/bots/${botId}/toggle-domain`, null, { params: { enabled } }).then(res => res.data);

export const deleteBotDomain = (botId) =>
  client.delete(`/bots/${botId}/domain`).then(res => res.data);

export const listBotDomains = (botId) =>
  client.get(`/bots/${botId}/domains`).then(res => res.data);

export const addBotDomain = (botId, domain) =>
  client.post(`/bots/${botId}/domains`, { domain }).then(res => res.data);

export const verifyBotDomainItem = (botId, domainId) =>
  client.post(`/bots/${botId}/domains/${domainId}/verify`).then(res => res.data);

export const toggleBotDomainItem = (botId, domainId, enabled) =>
  client.post(`/bots/${botId}/domains/${domainId}/toggle`, null, { params: { enabled } }).then(res => res.data);

export const deleteBotDomainItem = (botId, domainId) =>
  client.delete(`/bots/${botId}/domains/${domainId}`).then(res => res.data);

export const getPublicShopByDomain = () =>
  fetch('/public/shop-by-domain').then(res => {
    if (!res.ok) throw new Error('Shop not found for this domain');
    return res.json();
  });

export const resolveBotForProductForm = (username, code) => {
  const base = 'https://api.telegramecommerce.shop';
  return fetch(`${base}/public/bot-resolve/${encodeURIComponent(username)}/${encodeURIComponent(code)}`)
    .then(res => {
      if (!res.ok) throw new Error('Invalid link');
      return res.json();
    });
};

export const createPublicProduct = (data) => {
  const base = 'https://api.telegramecommerce.shop';
  return fetch(`${base}/public/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }).then(res => {
    if (!res.ok) return res.json().then(e => { throw new Error(e.detail || 'Failed to create product'); });
    return res.json();
  });
};
