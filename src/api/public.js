import { API_BASE } from './config';
import client from './client';

export const getPublicShop = (slug) =>
  client.get(`/public/shop/${slug}`).then(res => res.data);

export const getPublicTopProducts = (slug, limit = 10) =>
  client.get(`/public/shop/${slug}/top-products`, { params: { limit } }).then(res => res.data);

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
  fetch(window.location.origin + '/public/shop-by-domain').then(res => {
    if (!res.ok) throw new Error('Shop not found for this domain');
    return res.json();
  });

export const getShopBio = async (botId) => {
  const base = API_BASE;
  try {
    const res = await fetch(`${base}/public/shop-bio/${botId}`);
    if (!res.ok) return '';
    const data = await res.json();
    return data?.text || '';
  } catch {
    return '';
  }
};

export const resolveBotForProductForm = (username, code) => {
  const base = API_BASE;
  return fetch(`${base}/public/bot-resolve/${encodeURIComponent(username)}/${encodeURIComponent(code)}`)
    .then(res => {
      if (!res.ok) throw new Error('Invalid link');
      return res.json();
    });
};

export const createPublicProduct = (data) => {
  const base = API_BASE;
  return fetch(`${base}/public/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }).then(res => {
    if (!res.ok) return res.json().then(e => { throw new Error(e.detail || 'Failed to create product'); });
    return res.json();
  });
};

export const getPublicNewsfeed = (botId, visitorId, limit = 10, offset = 0, topic = '') =>
  client.get(`/public/newsfeed/${botId}`, { params: { visitor_id: visitorId, limit, offset, topic } }).then(res => res.data || []);

export const getPublicNewsfeedComments = (postId) =>
  client.get(`/public/newsfeed/${postId}/comments`).then(res => res.data);

export const toggleNewsfeedLike = (postId, visitorId) =>
  client.post(`/public/newsfeed/${postId}/like`, { visitor_id: visitorId }).then(res => res.data);

export const addNewsfeedComment = (postId, visitorId, content, visitorName) =>
  client.post(`/public/newsfeed/${postId}/comment`, { visitor_id: visitorId, content, visitor_name: visitorName }).then(res => res.data);

export const editNewsfeedComment = (postId, commentId, visitorId, content) =>
  client.patch(`/public/newsfeed/${postId}/comment/${commentId}`, { visitor_id: visitorId, content }).then(res => res.data);

export const deleteNewsfeedComment = (postId, commentId, visitorId) =>
  client.delete(`/public/newsfeed/${postId}/comment/${commentId}?visitor_id=${visitorId}`).then(res => res.data);

export const createPlanOrder = (botId, planName, planType, discountCode) =>
  client.post('/public/create-plan-order', {
    bot_id: botId,
    plan_name: planName,
    plan_type: planType,
    ...(discountCode ? { discount_code: discountCode } : {}),
  }).then(res => res.data);

export const validateSubscriptionDiscount = (code) =>
  client.post('/public/validate-subscription-discount', { code }).then(res => res.data);

export const trackOrder = (search, botId) =>
  client.post('/public/track-order', { search, bot_id: botId }).then(res => res.data);
