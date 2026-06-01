import client from './client';

export function fetchCart(botId: number, firebaseUid: string): Promise<any[]> {
  return client.get(`/public/cart/${botId}`, { params: { firebase_uid: firebaseUid } })
    .then(res => res.data || [])
    .catch(() => []);
}

export function syncCart(botId: number, firebaseUid: string, items: any[]): Promise<boolean> {
  return client.post('/public/cart/sync', { bot_id: botId, firebase_uid: firebaseUid, items })
    .then(res => res.data?.success === true)
    .catch(() => false);
}

export function clearServerCart(botId: number, firebaseUid: string): Promise<boolean> {
  return client.delete(`/public/cart/${botId}`, { data: { firebase_uid: firebaseUid } })
    .then(res => res.data?.success === true)
    .catch(() => false);
}
