const CACHE_NAME = 'img-cache-v1';
const MAX_CONCURRENT = 6;

const inFlight = new Map();
const queue = [];
let active = 0;

function getCacheKey(url) {
  try {
    const u = new URL(url);
    u.searchParams.delete('token');
    return u.href;
  } catch {
    return url;
  }
}

function processQueue() {
  while (active < MAX_CONCURRENT && queue.length > 0) {
    const { url, key, resolve, reject } = queue.shift();
    active++;
    doFetch(url, key).then(resolve, reject).finally(() => {
      active--;
      processQueue();
    });
  }
}

async function doFetch(url, key) {
  try {
    const resp = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!resp.ok) return url;
    const cache = await caches.open(CACHE_NAME);
    const clone = resp.clone();
    cache.put(key, clone).catch(() => {});
    return URL.createObjectURL(await resp.blob());
  } catch {
    return url;
  }
}

function enqueueFetch(url, key) {
  return new Promise((resolve, reject) => {
    queue.push({ url, key, resolve, reject });
    processQueue();
  });
}

export async function getCachedImageSrc(url) {
  const key = getCacheKey(url);

  try {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(key);
    if (cached) return URL.createObjectURL(await cached.blob());
  } catch {}

  if (inFlight.has(key)) return inFlight.get(key);

  const promise = enqueueFetch(url, key);
  inFlight.set(key, promise);
  try {
    return await promise;
  } catch {
    return url;
  } finally {
    inFlight.delete(key);
  }
}

export function preloadImage(url) {
  getCachedImageSrc(url).catch(() => {});
}

export function clearImageCache() {
  return caches.delete(CACHE_NAME);
}
