export const isMainDomain = (): boolean => {
  const hostname = window.location.hostname;
  return hostname === 'telegramecommerce.shop'
    || hostname === 'www.telegramecommerce.shop'
    || hostname === 'localhost';
};

export const buildProxyUrl = (shopSlug: string): string => {
  const redirectUri = window.location.origin;
  const params = new URLSearchParams({
    shop_slug: shopSlug,
    redirect_uri: redirectUri,
  });
  // Use hash-based URL to bypass GitHub Pages 404.html rewrite
  return `https://www.telegramecommerce.shop/#/auth/google/proxy?${params}`;
};

/** Read proxy params from URL hash (avoids 404.html rewrite on GitHub Pages). */
export function getProxyParamsFromHash(): { shopSlug: string; redirectUri: string } | null {
  const hash = window.location.hash.replace(/^#/, '');
  if (!hash.startsWith('/auth/google/proxy')) return null;
  const qs = hash.includes('?') ? hash.split('?')[1] : '';
  if (!qs) return null;
  try {
    const params = new URLSearchParams(qs);
    const shopSlug = params.get('shop_slug');
    const redirectUri = params.get('redirect_uri');
    if (shopSlug && redirectUri) return { shopSlug, redirectUri };
  } catch { /* ignore */ }
  return null;
}

export const readAuthTokenFromUrl = (): {
  token: string | null;
  status: string | null;
  user: object | null;
} => {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('auth_token');
  const status = params.get('auth_status');
  const userRaw = params.get('auth_user');
  let user: object | null = null;
  if (userRaw) {
    try {
      user = JSON.parse(decodeURIComponent(userRaw));
    } catch {
      user = null;
    }
  }
  return { token, status, user };
};

export const clearAuthParamsFromUrl = (): void => {
  const url = new URL(window.location.href);
  url.searchParams.delete('auth_token');
  url.searchParams.delete('auth_status');
  url.searchParams.delete('auth_user');
  window.history.replaceState({}, '', url.toString());
};

/** GitHub Pages 404.html redirects unknown paths to /?p=/path&q=originalQuery.
 *  This reverses the encoding to restore the original URL params. */
export function restoreProxyParamsFromQ(): Record<string, string> | null {
  const p = new URLSearchParams(window.location.search).get('p');
  if (p !== '/auth/google/proxy') return null;

  const raw = new URLSearchParams(window.location.search).get('q');
  if (!raw) return null;

  const decoded = raw.replace(/~and~/g, '&');
  const params = new URLSearchParams(decoded);
  const result: Record<string, string> = {};
  params.forEach((value, key) => { result[key] = value; });
  return result;
}
