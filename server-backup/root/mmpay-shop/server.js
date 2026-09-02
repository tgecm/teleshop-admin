require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const crypto = require('crypto');
const axios = require('axios');
const MMPaySDKModule = require('mmpay-node-sdk');
const MMPaySDK = MMPaySDKModule.MMPaySDK || MMPaySDKModule;

const app = express();
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf ? buf.toString('utf8') : '';
  }
}));
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 3002;
const HOST = process.env.HOST || '0.0.0.0';
const MMPAY_API_BASE = process.env.MMPAY_API_BASE || 'https://ezapi.myanmyanpay.com';
const WEBHOOK_URL = process.env.MMPAY_SHOP_WEBHOOK_URL || 'https://api.crossmart.shop/mmpay';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:merikolenndb@localhost:5432/telegram_market',
});

const encKey = process.env.MMPAY_SHOP_ENC_KEY ? Buffer.from(process.env.MMPAY_SHOP_ENC_KEY, 'hex') : null;

function decryptSecret(stored) {
  const [ivHex, tagHex, dataHex] = String(stored).split(':');
  const decipher = crypto.createDecipheriv('aes-256-gcm', encKey, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  return Buffer.concat([decipher.update(Buffer.from(dataHex, 'hex')), decipher.final()]).toString('utf8');
}

const merchantSDKs = new Map();

function parseOrderId(orderId) {
  if (typeof orderId !== 'string' || !orderId.startsWith('SH-')) return null;
  const parts = orderId.split('-');
  if (parts.length !== 3) return null;
  const botId = parseInt(parts[1], 10);
  const orderIdInt = parseInt(parts[2], 10);
  if (!Number.isInteger(botId) || !Number.isInteger(orderIdInt) || botId <= 0 || orderIdInt <= 0) return null;
  return { botId, orderIdInt };
}

async function getMerchantSDK(botId) {
  if (merchantSDKs.has(botId)) return merchantSDKs.get(botId);
  const { rows } = await pool.query(
    'SELECT id, bot_id, app_id, publishable_key, secret_key, enabled FROM shop_payment_merchants WHERE bot_id = $1 AND enabled = TRUE AND shop_enabled = TRUE',
    [botId]
  );
  const row = rows[0];
  if (!row || !row.enabled) return null;
  const sdk = new MMPaySDK({
    appId: decryptSecret(row.app_id),
    publishableKey: decryptSecret(row.publishable_key),
    secretKey: decryptSecret(row.secret_key),
    apiBaseUrl: MMPAY_API_BASE,
  });
  sdk.onTxSuccess((tx) => handleCallback(botId, tx));
  sdk.onTxFail((tx) => handleCallback(botId, tx));
  sdk.onTxRefund((tx) => handleCallback(botId, tx));
  sdk.onTxExpire((tx) => handleCallback(botId, tx));
  sdk.onTxCancel((tx) => handleCallback(botId, tx));
  sdk.on('error', (err) => console.error('[mmpay-shop] sdk error', botId, err.message));
  const entry = { sdk, row };
  merchantSDKs.set(botId, entry);
  return entry;
}

async function handleCallback(botId, tx) {
  const parsed = parseOrderId(tx.orderId);
  if (!parsed || parsed.botId !== botId) return;
  let status;
  if (tx.status === 'SUCCESS') status = 'confirmed';
  else if (tx.status === 'FAILED') status = 'payment_failed';
  else if (['CANCELLED', 'EXPIRED', 'REFUNDED'].includes(tx.status)) status = 'expired';
  else return;
  const { rows } = await pool.query(
    "UPDATE orders SET status = $1::varchar, confirmed_at = CASE WHEN $1::text = 'confirmed' THEN NOW() ELSE confirmed_at END, updated_at = NOW() WHERE id = $2 AND bot_id = $3 AND status IN ('pending', 'pending_payment') RETURNING id, order_number, total_amount, final_amount, shipping_address, items, buyer_snapshot, source",
    [status, parsed.orderIdInt, botId]
  );
  if (rows.length) {
    notifyOwner(botId, rows[0], tx, status);
    console.log(`[mmpay-shop] order ${rows[0].order_number} -> ${status} tx=${tx.transactionRefId || ''}`);
  }
}

async function notifyOwner(botId, order, tx, status) {
  try {
    const port = String(process.env.PORT || '');
    const apiPort = port === '3001' ? '8000' : '8001';
    await axios.post('http://127.0.0.1:' + apiPort + '/api/public/mmpay-status-notify', {
      bot_id: Number(botId),
      order_id: Number(order.id),
      status: status
    }, { timeout: 10000 }).catch(() => {
      return axios.post('http://127.0.0.1:' + apiPort + '/public/mmpay-status-notify', {
        bot_id: Number(botId),
        order_id: Number(order.id),
        status: status
      }, { timeout: 10000 });
    });
  } catch (e) {
    console.error('[mmpay-shop] notify Python API failed:', e.message);
  }
}


app.post('/reload-merchant', async (req, res) => {
  const { bot_id } = req.body || {};
  if (bot_id) {
    merchantSDKs.delete(Number(bot_id));
    console.log('[mmpay-shop] cleared merchant SDK cache for bot ' + bot_id);
  } else {
    merchantSDKs.clear();
    console.log('[mmpay-shop] cleared all merchant SDK cache');
  }
  res.json({ success: true });
});

app.get('/health', (req, res) => res.json({ ok: true }));

app.post('/create-shop-order', async (req, res) => {
  try {
    const { bot_id, order_id, amount, items, custom_message } = req.body || {};
    if (!bot_id || !order_id || !(Number(amount) > 0)) {
      return res.status(400).json({ error: 'bot_id, order_id and positive amount are required' });
    }
    const entry = await getMerchantSDK(Number(bot_id));
    if (!entry) return res.status(400).json({ error: 'No active MMPay merchant configured for this bot' });
    const orderId = `SH-${Number(bot_id)}-${Number(order_id)}`;
    if (orderId.length > 30) return res.status(400).json({ error: 'Order ID too long' });
    const payload = {
      orderId,
      amount: Number(amount),
      items: Array.isArray(items) && items.length ? items : [{ name: 'Order', amount: Number(amount), quantity: 1 }],
      callbackUrl: WEBHOOK_URL,
    };
    if (custom_message) payload.customMessage = String(custom_message).slice(0, 150);
    const result = await entry.sdk.pay(payload);
    res.json(result);
  } catch (e) {
    const detail = e.response && e.response.data ? e.response.data : e.message;
    console.error('[mmpay-shop] create-shop-order error', typeof detail === 'object' ? JSON.stringify(detail) : detail);
    res.status(500).json({ error: 'Payment server error', detail });
  }
});

app.post('/mmpay', async (req, res) => {
  try {
    const payload = req.rawBody || JSON.stringify(req.body);
    const nonce = req.headers['x-mmpay-nonce'];
    const signature = req.headers['x-mmpay-signature'];
    if (!nonce || !signature) return res.status(400).json({ error: 'Missing nonce or signature' });
    const parsed = parseOrderId(req.body && req.body.orderId);
    if (!parsed) return res.status(400).json({ error: 'Invalid orderId' });
    const entry = await getMerchantSDK(parsed.botId);
    if (!entry) return res.status(400).json({ error: 'Merchant not found' });
    const valid = await entry.sdk.verifyCb(payload, nonce, signature);
    if (!valid) return res.status(403).json({ error: 'Invalid signature' });
    await entry.sdk.listen(payload, nonce, signature);
    res.status(200).json({ received: true });
  } catch (e) {
    console.error('[mmpay-shop] webhook error', e.message);
    res.status(400).json({ error: 'Verification failed' });
  }
});

app.post('/get-payment', async (req, res) => {
  try {
    const orderId = (req.body || {}).orderId;
    const parsed = parseOrderId(orderId);
    if (!parsed) return res.status(400).json({ error: 'Invalid orderId' });
    const entry = await getMerchantSDK(parsed.botId);
    if (!entry) return res.status(400).json({ error: 'Merchant not found' });
    const result = await entry.sdk.get({ orderId });
    res.json(result);
  } catch (e) {
    console.error('[mmpay-shop] get-payment error', e.message);
    res.status(500).json({ error: 'Payment server error' });
  }
});

app.post('/cancel-payment', async (req, res) => {
  try {
    const orderId = (req.body || {}).orderId;
    const parsed = parseOrderId(orderId);
    if (!parsed) return res.status(400).json({ error: 'Invalid orderId' });
    const entry = await getMerchantSDK(parsed.botId);
    if (!entry) return res.status(400).json({ error: 'Merchant not found' });
    const result = await entry.sdk.cancel({ orderId });
    res.json(result);
  } catch (e) {
    console.error('[mmpay-shop] cancel-payment error', e.message);
    res.status(500).json({ error: 'Payment server error' });
  }
});

async function init() {
  if (!encKey || encKey.length !== 32) {
    console.error('[mmpay-shop] MMPAY_SHOP_ENC_KEY must be a 32-byte hex key');
    process.exit(1);
  }
  await pool.query(`CREATE TABLE IF NOT EXISTS shop_payment_merchants (
    id SERIAL PRIMARY KEY,
    bot_id INTEGER NOT NULL UNIQUE,
    app_id TEXT NOT NULL,
    publishable_key TEXT NOT NULL,
    secret_key TEXT NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);
  app.listen(PORT, HOST, () => console.log(`[mmpay-shop] running on ${HOST}:${PORT}`));
}

init().catch((e) => {
  console.error('[mmpay-shop] init failed', e.message);
  process.exit(1);
});
