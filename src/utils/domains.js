export const DEFAULT_DOMAINS = [
  { name: 'telegramecommerce.shop', url: 'https://telegramecommerce.shop' },
  { name: 'crossmart.shop', url: 'https://crossmart.shop' },
];

export function isMainDomain(hostname) {
  return hostname === 'www.telegramecommerce.shop'
    || hostname === 'telegramecommerce.shop'
    || hostname === 'www.crossmart.shop'
    || hostname === 'crossmart.shop';
}

export function getGoogleAuthRedirectUrl(params) {
  return `https://www.telegramecommerce.shop/#/auth/google/proxy?${params}`;
}
