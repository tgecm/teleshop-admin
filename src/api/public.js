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

export const getPublicShopByDomain = () =>
  fetch('/public/shop-by-domain').then(res => {
    if (!res.ok) throw new Error('Shop not found for this domain');
    return res.json();
  });
