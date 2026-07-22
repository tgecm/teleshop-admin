export const DEFAULT_DOMAINS = [
  { name: 'crossmart.shop', url: 'https://crossmart.shop' },
];

export function isMainDomain(hostname) {
  return hostname === 'www.telegramecommerce.shop'
    || hostname === 'telegramecommerce.shop';
}

export function getGoogleAuthRedirectUrl(params) {
  return `https://www.telegramecommerce.shop/#/auth/google/proxy?${params}`;
}
