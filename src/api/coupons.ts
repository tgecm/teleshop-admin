import client from './client';

export function createCoupon(data: {
  bot_id: number;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  end_date: string;
  total_coupons: number;
  min_spend: number;
}) {
  return client.post('/coupons/create', data).then(r => r.data);
}

export function getCoupons(botId: number) {
  return client.get('/coupons/list', { params: { bot_id: botId } }).then(r => r.data);
}

export function deleteCoupon(id: number) {
  return client.post('/coupons/delete', { id }).then(r => r.data);
}

export function validateCoupon(botId: number, code: string, cartTotal: number) {
  return client.post('/public/coupon/validate', {
    bot_id: botId,
    code,
    cart_total: cartTotal,
  }).then(r => r.data);
}
