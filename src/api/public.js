import client from './client';

export const getPublicShop = (slug) =>
  client.get(`/public/shop/${slug}`).then(res => res.data);

export const getBotPublicSlug = (botId) =>
  client.get(`/bots/${botId}/public-slug`).then(res => res.data);

export const generateBotSlug = (botId) =>
  client.post(`/bots/${botId}/generate-slug`).then(res => res.data);
