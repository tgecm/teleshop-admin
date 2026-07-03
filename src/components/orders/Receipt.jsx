import { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Download, Loader2, FileText } from 'lucide-react';
import { myanmarFormat } from '../../utils/date';
import { useToastStore } from '../../store/toastStore';
import { normalizeText } from '../../utils/normalizeText';
import { formatPrice } from '../../utils/formatPrice';
import { isInAppBrowser, downloadViaNative, downloadBlob } from '../../utils/download';
import { generateInvoiceNumber } from '../../api/orders';
import client from '../../api/client';
import jsPDF from 'jspdf';

const RECEIPT_W = 800;
const MAIN_BLUE = '#003366';
const ACCENT_LINE = '#007bff';
const TEXT_DARK = '#333';
const TEXT_MUTED = '#666';
const BORDER_LIGHT = '#ddd';
const LIGHT_BLUE = '#e0f2f7';
const SVG_FF = "'Open Sans','Noto Sans Myanmar','Myanmar Text','TharLon','Padauk',system-ui,-apple-system,sans-serif";

const s = {
  wrap: {
    width: RECEIPT_W,
    minHeight: 1000,
    background: '#ffffff',
    fontFamily: "'Open Sans', 'Noto Sans Myanmar', 'Myanmar Text', 'TharLon', 'Padauk', system-ui, -apple-system, sans-serif",
    color: TEXT_DARK,
    border: '1px solid #ccc',
    display: 'flex',
    flexDirection: 'column',
    fontSize: '14px',
  },
  topLine: { height: 10, backgroundColor: MAIN_BLUE },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: '30px 40px',
    borderBottom: `1px solid ${BORDER_LIGHT}`,
  },
  shopInfo: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 25,
  },
  logoCircle: {
    width: 100,
    height: 100,
    border: `2px solid ${MAIN_BLUE}`,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'Roboto, system-ui, sans-serif',
    fontSize: 16,
    fontWeight: 500,
    color: MAIN_BLUE,
    textTransform: 'uppercase',
    flexShrink: 0,
    background: '#fff',
    overflow: 'hidden',
  },
  shopDetails: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    gap: 5,
  },
  shopName: {
    fontFamily: 'Roboto, system-ui, sans-serif',
    fontSize: 22,
    fontWeight: 700,
    color: MAIN_BLUE,
    marginBottom: 3,
  },
  tagline: {
    fontSize: 13,
    color: TEXT_MUTED,
    marginBottom: 8,
  },
  contactRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    fontSize: 12,
    color: TEXT_MUTED,
  },
  contactIcon: {
    color: ACCENT_LINE,
    width: 20,
    textAlign: 'center',
  },
  contactValue: {
    borderBottom: `1px solid ${BORDER_LIGHT}`,
    paddingBottom: 1,
    minWidth: 150,
    flexGrow: 1,
    lineHeight: 1.4,
  },
  receiptBlock: { textAlign: 'right' },
  receiptHeading: {
    fontFamily: 'Roboto, system-ui, sans-serif',
    fontSize: 48,
    fontWeight: 700,
    color: MAIN_BLUE,
    lineHeight: 1,
  },
  invoiceHeading: {
    fontFamily: 'Roboto, system-ui, sans-serif',
    fontSize: 42,
    fontWeight: 700,
    color: MAIN_BLUE,
    lineHeight: 1,
  },
  thankYou: {
    fontFamily: "'Dancing Script', cursive",
    fontSize: 17,
    color: ACCENT_LINE,
    marginTop: 5,
    marginBottom: 15,
  },
  metaRight: {
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 10,
    fontSize: 13,
    color: TEXT_MUTED,
    lineHeight: 2,
  },
  metaLabel: { fontWeight: 600, color: TEXT_DARK, minWidth: 80, textAlign: 'left' },
  metaColon: { color: TEXT_MUTED },
  metaValue: {
    borderBottom: `1px solid ${BORDER_LIGHT}`,
    minWidth: 140,
    paddingBottom: 1,
    textAlign: 'left',
  },
  mid: {
    display: 'flex',
    borderBottom: `1px solid ${BORDER_LIGHT}`,
  },
  midCol: { padding: '25px 40px', flex: 1 },
  midColBorder: {
    padding: '25px 40px',
    flex: 1,
    borderRight: `1px solid ${BORDER_LIGHT}`,
  },
  sectionTitle: {
    backgroundColor: MAIN_BLUE,
    color: '#fff',
    fontFamily: 'Roboto, system-ui, sans-serif',
    fontSize: 13,
    fontWeight: 500,
    padding: '8px 15px',
    borderRadius: 5,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 15,
  },
  fieldItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    fontSize: 12,
    color: TEXT_MUTED,
    lineHeight: 2,
  },
  fieldLabel: { fontWeight: 500, color: TEXT_DARK, minWidth: 80 },
  fieldSep: { color: TEXT_MUTED },
  fieldValue: {
    borderBottom: `1px solid ${BORDER_LIGHT}`,
    flexGrow: 1,
    paddingBottom: 1,
  },
  fieldLabelWide: { fontWeight: 500, color: TEXT_DARK, minWidth: 120 },
  tableWrap: {
    flex: 1,
    padding: '0 40px 25px',
  },
  tableHeader: {
    display: 'flex',
    backgroundColor: MAIN_BLUE,
    color: '#fff',
    fontFamily: 'Roboto, system-ui, sans-serif',
    fontWeight: 500,
    fontSize: 12,
    borderRadius: 4,
    overflow: 'hidden',
  },
  thId: { width: 50, padding: '10px 15px' },
  thProduct: { flex: 1, padding: '10px 15px', maxWidth: 280 },
  thQty: { width: 80, padding: '10px 15px', textAlign: 'center' },
  thPrice: { width: 145, padding: '10px 15px', textAlign: 'right' },
  thTotal: { width: 145, padding: '10px 15px', textAlign: 'right' },
  thPriceInv: { width: 120, padding: '10px 15px', textAlign: 'right' },
  thTotalInv: { width: 120, padding: '10px 15px', textAlign: 'right' },
  tableRow: {
    display: 'flex',
    alignItems: 'center',
    fontSize: 12,
    borderBottom: `1px solid ${BORDER_LIGHT}`,
  },
  tdId: {
    width: 50,
    padding: '12px 15px',
    color: MAIN_BLUE,
    fontWeight: 600,
  },
  tdProduct: {
    flex: 1,
    padding: '12px 15px',
    color: TEXT_DARK,
    maxWidth: 280,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  tdQty: {
    width: 80,
    padding: '12px 15px',
    textAlign: 'center',
    color: TEXT_DARK,
  },
  tdUnit: {
    width: 145,
    padding: '12px 15px',
    textAlign: 'right',
    color: TEXT_DARK,
  },
  tdTotal: {
    width: 145,
    padding: '12px 15px',
    textAlign: 'right',
    color: TEXT_DARK,
  },
  tdUnitInv: {
    width: 120,
    padding: '12px 15px',
    textAlign: 'right',
    color: TEXT_DARK,
  },
  tdTotalInv: {
    width: 120,
    padding: '12px 15px',
    textAlign: 'right',
    color: TEXT_DARK,
  },
  bottom: {
    display: 'flex',
    padding: '25px 40px',
    borderTop: `1px solid ${BORDER_LIGHT}`,
    gap: 30,
  },
  paymentBlock: { display: 'flex', flexDirection: 'column', gap: 20, flex: 1.5 },
  payBox: {
    border: `1px solid ${BORDER_LIGHT}`,
    borderRadius: 8,
    padding: 15,
  },
  payTitle: {
    fontFamily: 'Roboto, system-ui, sans-serif',
    fontSize: 13,
    fontWeight: 500,
    color: MAIN_BLUE,
    marginBottom: 8,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  payValue: {
    fontSize: 12,
    color: TEXT_MUTED,
    borderBottom: `1px solid ${BORDER_LIGHT}`,
    paddingBottom: 4,
    minWidth: 200,
  },
  amountPaid: { marginTop: 15 },
  amountValue: {
    fontSize: 15,
    fontWeight: 700,
    color: MAIN_BLUE,
    display: 'inline-block',
    paddingBottom: 5,
    borderBottom: `2px solid ${ACCENT_LINE}`,
    marginTop: 5,
  },
  totalsCol: { display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', flex: 1 },
  totalsRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: 13,
    color: TEXT_DARK,
    padding: '5px 0',
    borderBottom: `1px solid ${BORDER_LIGHT}`,
  },
  totalLabel: { fontWeight: 500, color: TEXT_DARK, minWidth: 100 },
  totalColon: { color: TEXT_MUTED },
  totalValue: { textAlign: 'right', minWidth: 80, color: TEXT_MUTED },
  grandTotal: {
    backgroundColor: MAIN_BLUE,
    color: '#fff',
    fontFamily: 'Roboto, system-ui, sans-serif',
    fontSize: 17,
    fontWeight: 700,
    padding: '12px 18px',
    borderRadius: 5,
    marginTop: 15,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    letterSpacing: '0.5px',
  },
  grandTotalValue: { color: '#fff' },
  footer: {
    borderTop: `1px solid ${BORDER_LIGHT}`,
    padding: '20px 40px',
    display: 'flex',
    alignItems: 'center',
    gap: 25,
  },
  footerNotes: { fontSize: 10, color: TEXT_MUTED, lineHeight: 1.5 },
  websiteBar: {
    backgroundColor: MAIN_BLUE,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    fontSize: 11,
    padding: '8px 0',
    letterSpacing: 1,
  },
};

function esc(str) {
  if (str == null) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

const _ER = [
  [0x1F000, 0x1FFFF], [0x2600, 0x27BF], [0x2300, 0x23FF],
  [0x2700, 0x27BF], [0xFE00, 0xFE0F], [0x200D, 0x200D],
  [0x1F600, 0x1F64F], [0x1F300, 0x1F5FF], [0x1F680, 0x1F6FF],
  [0x1F900, 0x1F9FF], [0x1FA00, 0x1FAFF], [0x1FB00, 0x1FBFF],
];
function _ie(c) { return _ER.some(([l,h]) => c >= l && c <= h); }
function _he(s) {
  if (!s) return false;
  for (let i = 0; i < s.length; i++) { const c = s.codePointAt(i); if (c && _ie(c)) return true; if (c && c > 0xFFFF) i++; }
  return false;
}
function _se(text) {
  if (!text) return [];
  const segments = []; let buf = '';
  for (let i = 0; i < text.length; i++) {
    const cp = text.codePointAt(i); if (!cp) continue;
    const cl = cp > 0xFFFF ? 2 : 1;
    if (_ie(cp)) { if (buf) { segments.push({t:buf,e:false}); buf=''; } segments.push({t:String.fromCodePoint(cp),e:true}); }
    else { buf += String.fromCodePoint(cp); }
    if (cl > 1) i++;
  }
  if (buf) segments.push({t:buf,e:false});
  return segments;
}
function _isSimpleText(text) {
  for (let i = 0; i < text.length; i++) {
    const cp = text.codePointAt(i); if (!cp) continue;
    if (_ie(cp)) continue;
    if (cp <= 0x024F) continue; // Basic Latin + Latin-1 Supplement + Latin Extended-A/B
    if (cp >= 0x1E00 && cp <= 0x1EFF) continue; // Latin Extended Additional
    return false; // Contains non-Latin, non-emoji character → needs SVG text element
  }
  return true;
}
function _rte(text, fontSize, fontFamily, color) {
  try {
    const dpr = 2;
    const c = document.createElement('canvas');
    const ctx = c.getContext('2d');
    if (!ctx) return null;
    // Canvas 2D might not resolve font fallback per-character, so put a
    // Myanmar-capable font first (covers Latin + Myanmar). Emoji fallback
    // is handled by the system's sans-serif via Noto Color Emoji / Apple Color Emoji.
    const canvasFont = `'Noto Sans Myanmar','Myanmar Text','TharLon','Padauk','Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif`;
    ctx.font = `${fontSize}px ${canvasFont}`;
    const m = ctx.measureText(text);
    const w = Math.ceil(m.width) + 4;
    const h = Math.ceil(fontSize * 1.4);
    c.width = Math.ceil(w * dpr);
    c.height = Math.ceil(h * dpr);
    ctx.scale(dpr, dpr);
    ctx.font = `${fontSize}px ${canvasFont}`;
    ctx.fillStyle = color;
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(text, 2, h - 4);
    return { url: c.toDataURL(), w, h };
  } catch { return null; }
}
function _st(raw, x, y, fs, fill, ff, attrs) {
  if (!raw) return '';
  if (!_he(raw)) return `<text x="${x}" y="${y}" fill="${fill}" font-size="${fs}"${attrs}>${esc(raw)}</text>`;
  // Text with only Latin + emoji: use canvas rendering (good for emoji-only content)
  if (_isSimpleText(raw)) {
    const ri = _rte(raw, fs, ff, fill);
    if (ri) return `<image href="${ri.url}" x="${x}" y="${y - ri.h + 4}" width="${ri.w}" height="${ri.h}"/>`;
  }
  // Mixed text (Burmese + emoji etc): segment and render separately
  // Non-emoji parts use SVG <text> (server renders via Noto Sans Myanmar),
  // emoji parts use canvas-rendered images
  const segs = _se(raw); let r=''; let cx=x;
  for (const s of segs) {
    if (s.e) { const u=renderEmoji(s.t,fs); if(u) r+=`<image href="${u}" x="${cx}" y="${y-fs+2}" width="${fs}" height="${fs}"/>`; cx+=fs; }
    else { r+=`<text x="${cx}" y="${y}" fill="${fill}" font-size="${fs}"${attrs}>${esc(s.t)}</text>`; try { const mc=document.createElement('canvas').getContext('2d'); mc.font=`${fs}px ${ff}`; cx+=mc.measureText(s.t).width; } catch { cx+=s.t.length*fs*0.6; } }
  }
  return r;
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function renderSvgTextLine(text, fontSize, fontFamily, color) {
  if (!text) return null;
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    const font = `${fontSize}px ${fontFamily}`;
    ctx.font = font;
    const metrics = ctx.measureText(text);
    const w = Math.ceil(metrics.width) + 4;
    const h = Math.ceil(fontSize * 1.5);
    canvas.width = Math.ceil(w * 2);
    canvas.height = Math.ceil(h * 2);
    ctx.scale(2, 2);
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 2, h / 2);
    return { url: canvas.toDataURL(), w, h };
  } catch {
    return null;
  }
}

function renderEmoji(emoji, size = 16) {
  try {
    const scale = 2;
    const c = document.createElement('canvas');
    c.width = size * scale;
    c.height = size * scale;
    const ctx = c.getContext('2d');
    ctx.font = `${size * scale}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, size, size);
    return c.toDataURL();
  } catch {
    return '';
  }
}

async function getBotLogoDataUrl(logoUrl) {
  if (!logoUrl) return '';
  try {
    if (logoUrl.startsWith('data:')) return logoUrl;
    if (logoUrl.startsWith('blob:')) return logoUrl;

    // For absolute HTTP URLs: use img+crossOrigin to avoid CORS issues
    if (logoUrl.startsWith('http')) {
      try {
        return await new Promise((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            const c = document.createElement('canvas');
            c.width = img.naturalWidth;
            c.height = img.naturalHeight;
            c.getContext('2d').drawImage(img, 0, 0);
            resolve(c.toDataURL('image/png'));
          };
          img.onerror = () => reject();
          img.src = logoUrl;
        });
      } catch {
        // Fallback: fetch via backend proxy
        const proxyUrl = `${client.defaults.baseURL}/proxy-image?url=${encodeURIComponent(logoUrl)}`;
        const resp = await client.get(proxyUrl, { responseType: 'blob' });
        if (!resp.data || !resp.data.size) return '';
        return await blobToDataUrl(resp.data);
      }
    }

    // For relative URLs, resolve against the API server
    const url = new URL(logoUrl, client.defaults.baseURL || window.location.origin);
    const path = `${url.pathname}${url.search}`;
    const resp = await client.get(path, { responseType: 'blob' });
    if (!resp.data || !resp.data.size) return '';
    return await blobToDataUrl(resp.data);
  } catch {
    return '';
  }
}

function buildSvgData(order, bot, botName, items, subtotal, total, orderDate, paymentMethod, minRows, invoiceNumber, receiptNumber, type = 'receipt', currency = 'MMK', receiptSettings = {}) {
  const isInvoice = type === 'invoice';
  const { tagline: shopTagline = 'Your Trusted Online Store', phone: svgPhone = 'Phone', email: svgEmail = 'Email', website: svgWebsite = 'Website', address: svgAddress = 'Address', notes: svgNotes = '', botLogo = '', emojis = {}, taglineImg = null, notesImg = null, notesImg2 = null } = receiptSettings;
  const W = 800;
  const PAD = 40;
  const CW = W - PAD * 2;
  const MB = '#003366';
  const AL = '#007bff';
  const TD = '#333';
  const TM = '#666';
  const BL = '#ddd';
  const LB = '#e0f2f7';
  const FS = '#bbb';

  const qtyX = isInvoice ? 450 : 420;
  const priceX = isInvoice ? 560 : 540;
  const totalX = isInvoice ? 690 : 670;
  const hdgSize = isInvoice ? 44 : 52;
  const subSize = isInvoice ? 15 : 16;

  const orderNum = esc(order.order_number || `#${order.id}`);
  const cNameRaw = order.buyer_snapshot?.name || order.buyer_snapshot?.full_name || order.customer?.first_name || '—';
  const phoneRaw = order.buyer_snapshot?.phone || '—';
  const emailRaw = order.buyer_snapshot?.email || '—';
  const addrRaw = order.buyer_snapshot?.address || '—';
  const cNotesRaw = order.notes || order.buyer_snapshot?.notes || order.shipping_address?.notes || '';
  const cName = esc(cNameRaw);
  const phone = esc(phoneRaw);
  const email = esc(emailRaw);
  const addr = esc(addrRaw);
  const cNotes = esc(cNotesRaw);
  const notesY = cNotes ? 140 : 0;
  const cAddr = esc(order.buyer_snapshot?.address || '……………………………………');
  const cPhone = esc(order.buyer_snapshot?.phone || '……………………………………');
  const cEmail = esc(order.buyer_snapshot?.email || '……………………………………');
  const tg = esc(bot?.bot_username ? `@${bot.bot_username}` : '……………………………………');
  const uid = esc(order.customer?.telegram_id || order.customer?.id || '—');
  const initial = esc(botName.charAt(0).toUpperCase());
  const sName = esc(botName);
  const fmtDate = myanmarFormat(orderDate, 'MMM dd, yyyy');
  const payM = esc(paymentMethod);
  const sub = formatPrice(subtotal || 0, currency);
  const tot = formatPrice(total || 0, currency);

  const HDR_Y = 40;
  const HDR_H = 170;
  const MID_Y = HDR_Y + HDR_H + 5;
  const MID_END = MID_Y + 12 + (cNotes ? 140 : 118) + 6 + 12;
  const TBL_BAR = MID_END + 6;
  const TBL_H = 28;
  const ROW_H = 30;
  const TBL_BODY = TBL_BAR + TBL_H + 6;
  const TBL_END = TBL_BODY + minRows * ROW_H;
  const BOT_Y = TBL_END + 22;
  const BOT_H = 155;
  const FTR_Y = BOT_Y + BOT_H + 10;
  const FTR_H = 65;
  const WEB_Y = FTR_Y + FTR_H + 5;
  const WEB_H = 28;
  const TOTAL_H = WEB_Y + WEB_H + 20;

  let tableRows = '';
  for (let i = 0; i < minRows; i++) {
    const item = items[i];
    const ry = TBL_BODY + i * ROW_H;
    let cells;
    if (item) {
      const ln = formatPrice((item.price||0)*(item.quantity||0), currency);
      const pn = esc(item.product_name || item.name || '—');
      const vl = item.variant_label ? esc(` [${item.variant_label}]`) : '';
      const pnRaw = item.product_name || item.name || '—';
      const pnFullRaw = item.variant_label ? `${pnRaw} [${item.variant_label}]` : pnRaw;
      cells = `
        <text x="55" y="${ry+19}" fill="${MB}" font-weight="600" font-size="12">${i+1}</text>
        ${_st(pnFullRaw, 100, ry+19, 12, TD, SVG_FF, '')}
        <text x="${qtyX}" y="${ry+19}" text-anchor="middle" fill="${TD}" font-size="12">${item.quantity||'—'}</text>
        <text x="${priceX}" y="${ry+19}" text-anchor="end" fill="${TD}" font-size="12">${formatPrice(item.price||0, currency)}</text>
        <text x="${totalX}" y="${ry+19}" text-anchor="end" fill="${TD}" font-size="12">${ln}</text>`;
    } else {
      cells = `
        <text x="55" y="${ry+19}" fill="${FS}" font-weight="600" font-size="12">${i+1}</text>
        <text x="100" y="${ry+19}" fill="${FS}" font-size="12">${'·'.repeat(30)}</text>
        <text x="${qtyX}" y="${ry+19}" text-anchor="middle" fill="${FS}" font-size="12">${'·'.repeat(4)}</text>
        <text x="${priceX}" y="${ry+19}" text-anchor="end" fill="${FS}" font-size="12">${'·'.repeat(10)}</text>
        <text x="${totalX}" y="${ry+19}" text-anchor="end" fill="${FS}" font-size="12">${'·'.repeat(10)}</text>`;
    }
    tableRows += `<g>
      <line x1="40" y1="${ry+ROW_H-1}" x2="760" y2="${ry+ROW_H-1}" stroke="${BL}" stroke-width="1"/>
      ${cells}
    </g>`;
  }

  const deliveryFeeLine = order?.delivery_fee > 0 ? { l: 'Delivery Fee', v: `+ ${formatPrice(Number(order.delivery_fee), currency)}` } : null;
  const totalLines = [
    { l: 'Subtotal', v: sub },
    ...(deliveryFeeLine ? [deliveryFeeLine] : []),
  ];
  let totalsSvg = '';
  totalLines.forEach((t, i) => {
    const ty = i * 22;
    totalsSvg += `
      <text x="0" y="${ty+15}" fill="${TD}" font-size="13" font-weight="500">${t.l}</text>
      <text x="85" y="${ty+15}" fill="${TM}" font-size="13">:</text>
      <text x="100" y="${ty+15}" fill="${TM}" font-size="13">${t.v}</text>`;
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W*2}" height="${TOTAL_H*2}" viewBox="0 0 ${W} ${TOTAL_H}">
  <defs><style>
    text{font-family:'Open Sans','Noto Sans Myanmar','Myanmar Text','TharLon','Padauk',system-ui,-apple-system,sans-serif;font-size:12px}
    .r{font-family:'Roboto','Noto Sans Myanmar','Myanmar Text','TharLon','Padauk',system-ui,sans-serif}
    .dc{font-family:'Dancing Script',cursive}
    .w{fill:#fff}
  </style>
  </defs>
  <rect width="${W}" height="${TOTAL_H}" fill="#fff"/>
  <!-- TOP BAR -->
  <rect width="${W}" height="10" fill="${MB}"/>

  <!-- ============ HEADER (y=${HDR_Y}) ============ -->
  <defs>
    <clipPath id="logoClip">
      <circle cx="50" cy="50" r="50"/>
    </clipPath>
  </defs>
  <g transform="translate(${PAD}, ${HDR_Y})">
    <!-- Logo -->
    <circle cx="50" cy="50" r="50" fill="#fff" stroke="${MB}" stroke-width="2"/>
    ${botLogo ? `<image href="${esc(botLogo)}" x="0" y="0" width="100" height="100" preserveAspectRatio="xMidYMid slice" clip-path="url(#logoClip)"/>` : `<text x="50" y="56" text-anchor="middle" fill="${MB}" font-size="16" font-weight="600" class="r">${initial}</text>`}

    <!-- Shop info -->
    ${_st(botName, 140, 22, 24, MB, SVG_FF, ' font-weight="700" class="r"')}
    ${taglineImg ? `<image href="${esc(taglineImg.url)}" x="140" y="${44 - taglineImg.h + 4}" width="${taglineImg.w}" height="${taglineImg.h}"/>` : `<text x="140" y="44" fill="${TM}" font-size="13">${esc(shopTagline)}</text>`}

    <!-- Contacts -->
    ${emojis.phone ? `<image href="${esc(emojis.phone)}" x="132" y="56" width="16" height="16"/>` : `<text x="140" y="68" fill="${TM}" font-size="12">📞</text>`}
    ${_st(svgPhone, 152, 68, 12, TM, SVG_FF, '')}

    ${emojis.email ? `<image href="${esc(emojis.email)}" x="132" y="78" width="16" height="16"/>` : `<text x="140" y="90" fill="${TM}" font-size="12">✉️</text>`}
    ${_st(svgEmail, 152, 90, 12, TM, SVG_FF, '')}

    ${emojis.globe ? `<image href="${esc(emojis.globe)}" x="132" y="100" width="16" height="16"/>` : `<text x="140" y="112" fill="${TM}" font-size="12">🌐</text>`}
    ${_st(svgWebsite, 152, 112, 12, TM, SVG_FF, '')}

    ${emojis.pin ? `<image href="${esc(emojis.pin)}" x="132" y="122" width="16" height="16"/>` : `<text x="140" y="134" fill="${TM}" font-size="12">📍</text>`}
    ${_st(svgAddress.slice(0, 40), 152, 134, 12, TM, SVG_FF, '')}
    ${svgAddress.length > 40 ? _st(svgAddress.slice(40, 80), 152, 152, 12, TM, SVG_FF, '') : ''}

    ${isInvoice ? `<!-- INVOICE heading (right) -->
    <text x="720" y="22" text-anchor="end" fill="${MB}" font-size="44" font-weight="700" class="r">INVOICE</text>
    <text x="720" y="46" text-anchor="end" fill="${AL}" font-size="15" class="dc">Thank you for your purchase!</text>
    <line x1="550" y1="54" x2="720" y2="54" stroke="${AL}" stroke-width="2"/>

    <!-- Meta rows -->
    <g transform="translate(0, 0)">
      <text x="460" y="80" fill="${TD}" font-size="13" font-weight="600">Invoice No.</text>
      <text x="565" y="80" fill="${TM}" font-size="13">:</text>
      <text x="580" y="80" fill="${TM}" font-size="13">${esc(invoiceNumber)}</text>
    </g>
    <g transform="translate(0, 0)">
      <text x="460" y="102" fill="${TD}" font-size="13" font-weight="600">Date</text>
      <text x="565" y="102" fill="${TM}" font-size="13">:</text>
      <text x="580" y="102" fill="${TM}" font-size="13">${fmtDate}</text>
    </g>
    <g transform="translate(0, 0)">
      <text x="460" y="124" fill="${TD}" font-size="13" font-weight="600">Order ID</text>
      <text x="565" y="124" fill="${TM}" font-size="13">:</text>
      <text x="580" y="124" fill="${TM}" font-size="13">${orderNum}</text>
    </g>
    <g transform="translate(0, 0)">
      <text x="460" y="146" fill="${TD}" font-size="13" font-weight="600">Payment Status</text>
      <text x="565" y="146" fill="${TM}" font-size="13">:</text>
      <text x="580" y="146" fill="${TM}" font-size="13">Pending</text>
    </g>` : `<!-- RECEIPT heading (right) -->
    <text x="720" y="22" text-anchor="end" fill="${MB}" font-size="52" font-weight="700" class="r">RECEIPT</text>
    <text x="720" y="48" text-anchor="end" fill="${AL}" font-size="16" class="dc">Thank you for your purchase!</text>
    <line x1="550" y1="56" x2="720" y2="56" stroke="${AL}" stroke-width="2"/>

    <!-- Meta rows -->
    <g transform="translate(0, 0)">
      <text x="460" y="80" fill="${TD}" font-size="13" font-weight="600">Invoice No.</text>
      <text x="565" y="80" fill="${TM}" font-size="13">:</text>
      <text x="580" y="80" fill="${TM}" font-size="13">${esc(invoiceNumber)}</text>
    </g>
    <g transform="translate(0, 0)">
      <text x="460" y="102" fill="${TD}" font-size="13" font-weight="600">Receipt No.</text>
      <text x="565" y="102" fill="${TM}" font-size="13">:</text>
      <text x="580" y="102" fill="${TM}" font-size="13">${esc(receiptNumber)}</text>
    </g>
    <g transform="translate(0, 0)">
      <text x="460" y="124" fill="${TD}" font-size="13" font-weight="600">Payment Status</text>
      <text x="565" y="124" fill="${TM}" font-size="13">:</text>
      <text x="580" y="124" fill="${TM}" font-size="13">Paid</text>
    </g>`}
  </g>
  <line x1="${PAD}" y1="${HDR_Y+HDR_H}" x2="${W-PAD}" y2="${HDR_Y+HDR_H}" stroke="${BL}" stroke-width="1"/>

  <!-- ============ MID SECTION (y=${MID_Y}) ============ -->
  <!-- ${isInvoice ? 'Bill To' : 'Received From'} -->
  <g transform="translate(${PAD}, ${MID_Y+12})">
    <rect x="0" y="0" width="${isInvoice ? 115 : 150}" height="28" rx="5" fill="${MB}"/>
    ${emojis.person ? `<image href="${esc(emojis.person)}" x="8" y="6" width="16" height="16"/>` : ''}
    <text x="${emojis.person ? 28 : 12}" y="19" fill="#fff" font-size="13" font-weight="500" class="r">${isInvoice ? 'Bill To' : 'Received From'}</text>
    <text x="0" y="52" fill="${TD}" font-size="12" font-weight="600">Name</text>
    <text x="60" y="52" fill="${TM}" font-size="12">:</text>
    ${_st(cNameRaw, 70, 52, 12, TM, SVG_FF, '')}

    <text x="0" y="74" fill="${TD}" font-size="12" font-weight="600">Phone</text>
    <text x="60" y="74" fill="${TM}" font-size="12">:</text>
    ${_st(phoneRaw, 70, 74, 12, TM, SVG_FF, '')}

    <text x="0" y="96" fill="${TD}" font-size="12" font-weight="600">Email</text>
    <text x="60" y="96" fill="${TM}" font-size="12">:</text>
    ${_st(emailRaw, 70, 96, 12, TM, SVG_FF, '')}

    <text x="0" y="118" fill="${TD}" font-size="12" font-weight="600">Address</text>
    <text x="60" y="118" fill="${TM}" font-size="12">:</text>
    ${_st(addrRaw, 70, 118, 12, TM, SVG_FF, '')}
    ${cNotes ? `
    <text x="0" y="140" fill="${TD}" font-size="12" font-weight="600">Notes</text>
    <text x="60" y="140" fill="${TM}" font-size="12">:</text>
    ${_st(cNotesRaw, 70, 140, 12, TM, SVG_FF, '')}` : ''}
  </g>

  <!-- Vertical divider -->
  <line x1="400" y1="${MID_Y+12}" x2="400" y2="${MID_END-5}" stroke="${BL}" stroke-width="1"/>

  <!-- ${isInvoice ? 'Order Details' : 'Payment Details'} -->
  <g transform="translate(415, ${MID_Y+12})">
    <rect x="0" y="0" width="${isInvoice ? 170 : 200}" height="28" rx="5" fill="${MB}"/>
    ${emojis.receipt ? `<image href="${esc(emojis.receipt)}" x="8" y="6" width="16" height="16"/><text x="28" y="19" fill="#fff" font-size="13" font-weight="500" class="r">${isInvoice ? 'ORDER DETAILS' : 'PAYMENT DETAILS'}</text>` : `<text x="12" y="19" fill="#fff" font-size="13" font-weight="500" class="r">🧾 ${isInvoice ? 'ORDER DETAILS' : 'PAYMENT DETAILS'}</text>`}
    <text x="0" y="52" fill="${TD}" font-size="12" font-weight="600">${isInvoice ? 'Amount to pay' : 'Amount Paid'}</text>
    <text x="85" y="52" fill="${TM}" font-size="12">:</text>
    <text x="95" y="52" fill="${TM}" font-size="12">${tot}</text>

    <text x="0" y="74" fill="${TD}" font-size="12" font-weight="600">Payment</text>
    <text x="85" y="74" fill="${TM}" font-size="12">:</text>
    <text x="95" y="74" fill="${TM}" font-size="12">${payM}</text>

    <text x="0" y="96" fill="${TD}" font-size="12" font-weight="600">Date</text>
    <text x="85" y="96" fill="${TM}" font-size="12">:</text>
    <text x="95" y="96" fill="${TM}" font-size="12">${fmtDate}</text>

  </g>
  <line x1="${PAD}" y1="${MID_END}" x2="${W-PAD}" y2="${MID_END}" stroke="${BL}" stroke-width="1"/>

  <!-- ============ TABLE (bar y=${TBL_BAR}) ============ -->
  <rect x="${PAD}" y="${TBL_BAR}" width="${CW}" height="${TBL_H}" rx="5" fill="${MB}"/>
  <text x="55" y="${TBL_BAR+19}" fill="#fff" font-size="12" font-weight="600" class="r">#</text>
  <text x="100" y="${TBL_BAR+19}" fill="#fff" font-size="12" font-weight="600" class="r">PRODUCTS</text>
  <text x="${qtyX}" y="${TBL_BAR+19}" text-anchor="middle" fill="#fff" font-size="12" font-weight="600" class="r">QTY</text>
  <text x="${priceX}" y="${TBL_BAR+19}" text-anchor="end" fill="#fff" font-size="12" font-weight="600" class="r">UNIT PRICE</text>
  <text x="${totalX}" y="${TBL_BAR+19}" text-anchor="end" fill="#fff" font-size="12" font-weight="600" class="r">TOTAL PRICE</text>
  ${tableRows}

  <!-- ============ BOTTOM (y=${BOT_Y}) ============ -->
  <g transform="translate(${PAD}, ${BOT_Y})">
    <rect x="0" y="0" width="290" height="50" rx="8" fill="#fff" stroke="${BL}" stroke-width="1"/>
    ${emojis.card ? `<image href="${esc(emojis.card)}" x="13" y="2" width="16" height="16"/>` : ''}
    <text x="${emojis.card ? 33 : 15}" y="20" fill="${MB}" font-size="13" font-weight="500" class="r">PAYMENT METHOD</text>
    <text x="15" y="42" fill="${TM}" font-size="12">${payM}</text>

    <rect x="0" y="65" width="290" height="70" rx="8" fill="#fff" stroke="${BL}" stroke-width="1"/>
    ${emojis.money ? `<image href="${esc(emojis.money)}" x="13" y="67" width="16" height="16"/>` : ''}
    <text x="${emojis.money ? 33 : 15}" y="85" fill="${MB}" font-size="13" font-weight="500" class="r">${isInvoice ? 'AMOUNT TO PAY' : 'AMOUNT PAID'}</text>
    <text x="15" y="115" fill="${MB}" font-size="16" font-weight="700">${tot}</text>
    <line x1="15" y1="122" x2="130" y2="122" stroke="${AL}" stroke-width="2"/>

    <!-- RIGHT: Totals -->
    <g transform="translate(340, 0)">
      ${totalsSvg}
      <rect x="0" y="97" width="380" height="38" rx="5" fill="${MB}"/>
      <text x="15" y="121" fill="#fff" font-size="17" font-weight="700" class="r">TOTAL</text>
      <text x="365" y="121" text-anchor="end" fill="#fff" font-size="17" font-weight="700" class="r">${tot}</text>
    </g>
  </g>

  <!-- ============ FOOTER (y=${FTR_Y}) ============ -->
  <g transform="translate(${PAD}, ${FTR_Y})">
    <line x1="0" y1="0" x2="${CW}" y2="0" stroke="${BL}" stroke-width="1"/>
    ${svgNotes && notesImg ? `<image href="${esc(notesImg.url)}" x="0" y="${24 - notesImg.h + 4}" width="${notesImg.w}" height="${notesImg.h}"/>${svgNotes.length > 100 && notesImg2 ? `<image href="${esc(notesImg2.url)}" x="0" y="${38 - notesImg2.h + 4}" width="${notesImg2.w}" height="${notesImg2.h}"/>` : svgNotes.length > 100 ? `<text x="0" y="38" fill="${TM}" font-size="10">${esc(svgNotes.slice(100))}</text>` : ''}` : svgNotes ? `<text x="0" y="24" fill="${TM}" font-size="10">${esc(svgNotes.slice(0, 100))}</text>${svgNotes.length > 100 ? `<text x="0" y="38" fill="${TM}" font-size="10">${esc(svgNotes.slice(100))}</text>` : ''}` : ''}
  </g>

  <!-- ============ WEBSITE BAR ============ -->
  <rect x="0" y="${WEB_Y}" width="${W}" height="${WEB_H}" fill="${MB}"/>
  <text x="400" y="${WEB_Y+18}" text-anchor="middle" fill="rgba(255,255,255,0.85)" font-size="11">${sName}</text>
</svg>`;
}

export default function Receipt({ order, bot, open, onClose, receiptType = 'receipt', receiptSettings = {} }) {
  const receiptRef = useRef(null);
  const [generating, setGenerating] = useState(false);
  const [scale, setScale] = useState(1);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const { addToast } = useToastStore();

  useEffect(() => {
    if (!open || !order) return;
    if (order.invoice_number) {
      setInvoiceNumber(order.invoice_number);
    } else {
      setInvoiceNumber('');
      generateInvoiceNumber(order.id).then(res => {
        setInvoiceNumber(res.invoice_number);
      }).catch(() => {});
    }
    const calc = () => {
      const vw = window.innerWidth - 32;
      setScale(Math.min(1, vw / RECEIPT_W));
    };
    calc();
    window.addEventListener('resize', calc);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('resize', calc);
      document.body.style.overflow = '';
    };
  }, [open, order]);

  if (!order) return null;

  const botName = bot ? normalizeText(bot.bot_full_name || bot.bot_username || 'Shop') : 'Shop';
  const items = order.items || [];
  const subtotal = items.reduce((s, it) => s + ((it.price || 0) * (it.quantity || 0)), 0);
  const deliveryFee = Number(order.delivery_fee) || 0;
  const total = subtotal + deliveryFee;
  const orderDate = order.created_at ? new Date(order.created_at) : new Date();
  const paymentMethod = order.payment_method || 'Cash';
  const currency = bot?.currency || 'MMK';

  const initials = botName.split(' ').map(w => w.charAt(0).toUpperCase()).join('');
  const receiptNumber = order.receipt_no || `${initials}-ECM-${myanmarFormat(orderDate, 'yyyyMMdd')}-${(order.order_number || String(order.id)).slice(-3)}`;

  const minTableRows = Math.max(5, items.length);

  const isInv = receiptType === 'invoice';

  const {
    tagline = 'Your Trusted Online Store',
    phone: shopPhone = 'Phone',
    email: shopEmail = bot?.admin_notification_email || 'Email',
    website: shopWebsite = 'Website',
    address: shopAddress = 'Address',
    notes: shopNotes = '',
  } = receiptSettings;

  const handleDownload = async () => {
    setGenerating(true);
    try {
      const botLogo = await getBotLogoDataUrl(bot?.profile_picture || '');
      const emojis = {
        phone: renderEmoji('\u{1F4DE}'), email: renderEmoji('✉️'), globe: renderEmoji('\u{1F310}'),
        pin: renderEmoji('\u{1F4CD}'), person: renderEmoji('\u{1F464}'), receipt: renderEmoji('\u{1F9FE}'),
        card: renderEmoji('\u{1F4B3}'), money: renderEmoji('\u{1F4B0}'),
      };
      const taglineImg = tagline ? renderSvgTextLine(tagline, 13, "'Open Sans', system-ui, -apple-system, sans-serif", '#666') : null;
      const notesImg = shopNotes ? renderSvgTextLine(shopNotes.slice(0, 100), 10, "'Open Sans', system-ui, -apple-system, sans-serif", '#666') : null;
      const notesImg2 = shopNotes && shopNotes.length > 100 ? renderSvgTextLine(shopNotes.slice(100, 200), 10, "'Open Sans', system-ui, -apple-system, sans-serif", '#666') : null;
      const svg = buildSvgData(order, bot, botName, items, subtotal, total, orderDate, paymentMethod, minTableRows, invoiceNumber, receiptNumber, receiptType, currency, { tagline, phone: shopPhone, email: shopEmail, website: shopWebsite, address: shopAddress, notes: shopNotes, botLogo, emojis, taglineImg, notesImg, notesImg2 });
      const fileName = `${receiptType}-${order.order_number || order.id}`;

      // Client-side SVG to PNG (uses browser fonts for all languages)
      const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);
      const img = await new Promise((resolve, reject) => {
        const i = new Image();
        i.onload = () => { URL.revokeObjectURL(url); resolve(i); };
        i.onerror = () => { URL.revokeObjectURL(url); reject(new Error('SVG image failed to load')); };
        i.src = url;
      });
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext('2d').drawImage(img, 0, 0);
      const pngBlob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      await downloadBlob(pngBlob, `${fileName}.png`);

      addToast('Receipt downloaded successfully');
    } catch (err) {
      console.error('Receipt export failed:', err);
      addToast('Failed to generate receipt image', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadPdf = async () => {
    setGenerating(true);
    try {
      const botLogo = await getBotLogoDataUrl(bot?.profile_picture || '');
      const emojis = {
        phone: renderEmoji('\u{1F4DE}'), email: renderEmoji('✉️'), globe: renderEmoji('\u{1F310}'),
        pin: renderEmoji('\u{1F4CD}'), person: renderEmoji('\u{1F464}'), receipt: renderEmoji('\u{1F9FE}'),
        card: renderEmoji('\u{1F4B3}'), money: renderEmoji('\u{1F4B0}'),
      };
      const taglineImg = tagline ? renderSvgTextLine(tagline, 13, "'Open Sans', system-ui, -apple-system, sans-serif", '#666') : null;
      const notesImg = shopNotes ? renderSvgTextLine(shopNotes.slice(0, 100), 10, "'Open Sans', system-ui, -apple-system, sans-serif", '#666') : null;
      const notesImg2 = shopNotes && shopNotes.length > 100 ? renderSvgTextLine(shopNotes.slice(100, 200), 10, "'Open Sans', system-ui, -apple-system, sans-serif", '#666') : null;
      const svg = buildSvgData(order, bot, botName, items, subtotal, total, orderDate, paymentMethod, minTableRows, invoiceNumber, receiptNumber, receiptType, currency, { tagline, phone: shopPhone, email: shopEmail, website: shopWebsite, address: shopAddress, notes: shopNotes, botLogo, taglineImg, notesImg, notesImg2 });

      const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);
      const img = await new Promise((resolve, reject) => {
        const i = new Image();
        i.onload = () => { URL.revokeObjectURL(url); resolve(i); };
        i.onerror = () => { URL.revokeObjectURL(url); reject(new Error('SVG image failed to load')); };
        i.src = url;
      });

      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = (canvas.height * pdfW) / canvas.width;
      const pageH = pdf.internal.pageSize.getHeight();
      let heightLeft = pdfH;
      let position = 0;
      pdf.addImage(imgData, 'PNG', 0, position, pdfW, pdfH);
      heightLeft -= pageH;
      while (heightLeft > 0) {
        position -= pageH;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfW, pdfH);
        heightLeft -= pageH;
      }

      const fileName = `${receiptType}-${order.order_number || order.id}.pdf`;
      pdf.save(fileName);
      addToast('PDF downloaded successfully');
    } catch (err) {
      console.error('PDF export failed:', err);
      addToast('Failed to generate PDF', 'error');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 z-[60] bg-gray-100 rounded-t-[32px] md:rounded-[32px] md:shadow-2xl max-h-[90dvh] flex flex-col md:max-w-2xl md:mx-auto md:bottom-10"
          >
            <div className="sticky top-0 bg-gray-100 z-10 rounded-t-[32px] pt-4 pb-2 flex flex-col items-center">
              <div className="w-10 h-1 bg-gray-200 rounded-full" />
            </div>

            <div className="flex items-center justify-between px-4 pb-3 flex-shrink-0">
              <h2 className="text-lg font-bold text-gray-900">{receiptType === 'invoice' ? 'Invoice' : 'Receipt'}</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadPdf}
                  disabled={generating}
                  className="px-4 py-2 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center gap-1.5 text-sm"
                >
                  {generating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <FileText className="w-4 h-4" />
                  )}
                  {generating ? 'Generating...' : 'Download PDF'}
                </button>
                <button
                  onClick={handleDownload}
                  disabled={generating}
                  className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center gap-1.5 text-sm"
                >
                  {generating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  {generating ? 'Generating...' : 'Download PNG'}
                </button>
                <button onClick={onClose} className="p-2 bg-white rounded-full shadow-sm active:scale-90 transition-transform">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-hidden px-4 pb-6">
              <div className="flex justify-center">
                <div style={{ transform: `scale(${scale})`, transformOrigin: 'top center' }}>
                  <div ref={receiptRef} style={s.wrap}>
                    <div style={s.topLine} />

                    {/* Header */}
                    <div style={s.header}>
                      <div style={s.shopInfo}>
                        <div style={s.logoCircle}>
                          {bot?.profile_picture ? (
                            <img src={bot.profile_picture} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                          ) : (
                            botName.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div style={s.shopDetails}>
                          <div style={s.shopName}>{botName}</div>
                          <div style={s.tagline}>{tagline}</div>
                          <div style={s.contactRow}>
                            <span style={s.contactIcon}>📞</span>
                            <span style={s.contactValue}>{shopPhone}</span>
                          </div>
                          <div style={s.contactRow}>
                            <span style={s.contactIcon}>✉️</span>
                            <span style={s.contactValue}>{shopEmail}</span>
                          </div>
                          <div style={s.contactRow}>
                            <span style={s.contactIcon}>🌐</span>
                            <span style={s.contactValue}>{shopWebsite}</span>
                          </div>
                          <div style={s.contactRow}>
                            <span style={s.contactIcon}>📍</span>
                            <span style={s.contactValue}>
                              {shopAddress.slice(0, 40)}
                              {shopAddress.length > 40 && <><br/>{shopAddress.slice(40, 80)}</>}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div style={s.receiptBlock}>
                        <div style={isInv ? s.invoiceHeading : s.receiptHeading}>{isInv ? 'INVOICE' : 'RECEIPT'}</div>
                        <div style={s.thankYou}>Thank you for your purchase!</div>
                        <div style={s.metaRight}>
                          <span style={s.metaLabel}>Invoice No.</span>
                          <span style={s.metaColon}>:</span>
                          <span style={s.metaValue}>{invoiceNumber || '...'}</span>
                        </div>
                        {isInv ? (
                          <>
                            <div style={s.metaRight}>
                              <span style={s.metaLabel}>Date</span>
                              <span style={s.metaColon}>:</span>
                              <span style={s.metaValue}>{myanmarFormat(orderDate, 'MMM dd, yyyy')}</span>
                            </div>
                            <div style={s.metaRight}>
                              <span style={s.metaLabel}>Order ID</span>
                              <span style={s.metaColon}>:</span>
                              <span style={s.metaValue}>{order.order_number || `#${order.id}`}</span>
                            </div>
                            <div style={s.metaRight}>
                              <span style={s.metaLabel}>Payment Status</span>
                              <span style={s.metaColon}>:</span>
                              <span style={s.metaValue}>Pending</span>
                            </div>
                          </>
                        ) : (
                          <>
                            <div style={s.metaRight}>
                              <span style={s.metaLabel}>Receipt No.</span>
                              <span style={s.metaColon}>:</span>
                              <span style={s.metaValue}>{receiptNumber}</span>
                            </div>
                            <div style={s.metaRight}>
                              <span style={s.metaLabel}>Payment Status</span>
                              <span style={s.metaColon}>:</span>
                              <span style={s.metaValue}>Paid</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Bill To / Received From */}
                    <div style={s.mid}>
                      <div style={s.midColBorder}>
                        <div style={s.sectionTitle}><span>👤</span> {isInv ? 'Bill To' : 'Received From'}</div>
                        <div style={s.fieldItem}>
                          <span style={s.fieldLabel}>Name</span><span style={s.fieldSep}>:</span><span style={s.fieldValue}>{order.buyer_snapshot?.name || order.buyer_snapshot?.full_name || order.customer?.first_name || '—'}</span>
                        </div>
                        <div style={s.fieldItem}>
                          <span style={s.fieldLabel}>Phone</span><span style={s.fieldSep}>:</span><span style={s.fieldValue}>{order.buyer_snapshot?.phone || '—'}</span>
                        </div>
                        <div style={s.fieldItem}>
                          <span style={s.fieldLabel}>Email</span><span style={s.fieldSep}>:</span><span style={s.fieldValue}>{order.buyer_snapshot?.email || '—'}</span>
                        </div>
                        <div style={s.fieldItem}>
                          <span style={s.fieldLabel}>Address</span><span style={s.fieldSep}>:</span><span style={s.fieldValue}>{order.buyer_snapshot?.address || '—'}</span>
                        </div>
                        {order.buyer_snapshot?.notes ? (
                        <div style={s.fieldItem}>
                          <span style={s.fieldLabel}>Notes</span><span style={s.fieldSep}>:</span><span style={s.fieldValue}>{order.buyer_snapshot.notes}</span>
                        </div>
                        ) : null}
                      </div>
                      <div style={s.midCol}>
                        <div style={s.sectionTitle}><span>🧾</span> {isInv ? 'ORDER DETAILS' : 'PAYMENT DETAILS'}</div>
                        <div style={{ ...s.fieldItem, ...{ '--label-w': '120px' } }}>
                          <span style={s.fieldLabelWide}>{isInv ? 'Amount to pay' : 'Amount Paid'}</span><span style={s.fieldSep}>:</span><span style={s.fieldValue}>{formatPrice(total, currency)}</span>
                        </div>
                        <div style={s.fieldItem}>
                          <span style={s.fieldLabelWide}>Payment</span><span style={s.fieldSep}>:</span><span style={s.fieldValue}>{paymentMethod}</span>
                        </div>
                        <div style={s.fieldItem}>
                          <span style={s.fieldLabelWide}>Date</span><span style={s.fieldSep}>:</span><span style={s.fieldValue}>{myanmarFormat(orderDate, 'MMM dd, yyyy')}</span>
                        </div>
                      </div>
                    </div>

                    {/* Products Table */}
                    <div style={s.tableWrap}>
                      {/* Header row */}
                      <div style={s.tableHeader}>
                        <div style={s.thId}>#</div>
                        <div style={s.thProduct}>PRODUCTS</div>
                        <div style={s.thQty}>QTY</div>
                        <div style={isInv ? s.thPriceInv : s.thPrice}>UNIT PRICE</div>
                        <div style={isInv ? s.thTotalInv : s.thTotal}>TOTAL PRICE</div>
                      </div>
                      {/* Data rows */}
                      {Array.from({ length: minTableRows }).map((_, i) => {
                        const item = items[i];
                        if (item) {
                          const lineTotal = (item.price || 0) * (item.quantity || 0);
                          return (
                            <div key={i} style={s.tableRow}>
                              <div style={s.tdId}>{i + 1}</div>
                              <div style={s.tdProduct}>{item.product_name || item.name || '—'}{item.variant_label ? <span style={{color:'#9ca3af',fontSize:10}}> [{item.variant_label}]</span> : null}</div>
                              <div style={s.tdQty}>{item.quantity || '—'}</div>
                              <div style={isInv ? s.tdUnitInv : s.tdUnit}>{formatPrice(item.price || 0, currency)}</div>
                              <div style={isInv ? s.tdTotalInv : s.tdTotal}>{formatPrice(lineTotal, currency)}</div>
                            </div>
                          );
                        }
                        return (
                          <div key={`empty-${i}`} style={s.tableRow}>
                            <div style={s.tdId}>{i + 1}</div>
                            <div style={s.tdProduct}>{'·'.repeat(30)}</div>
                            <div style={s.tdQty}>{'·'.repeat(4)}</div>
                            <div style={isInv ? s.tdUnitInv : s.tdUnit}>{'·'.repeat(8)}</div>
                            <div style={isInv ? s.tdTotalInv : s.tdTotal}>{'·'.repeat(8)}</div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Bottom Section */}
                    <div style={s.bottom}>
                      <div style={s.paymentBlock}>
                        <div style={s.payBox}>
                          <div style={s.payTitle}>💳 PAYMENT METHOD</div>
                          <div style={s.payValue}>{paymentMethod}</div>
                        </div>
                        <div style={{ ...s.payBox, ...s.amountPaid }}>
                          <div style={s.payTitle}>💰 {isInv ? 'AMOUNT TO PAY' : 'AMOUNT PAID'}</div>
                          <div style={s.amountValue}>{formatPrice(total, currency)}</div>
                        </div>
                      </div>

                      <div style={s.totalsCol}>
                        <div style={s.totalsRow}>
                          <span style={s.totalLabel}>Subtotal</span><span style={s.totalColon}>:</span><span style={s.totalValue}>{formatPrice(subtotal, currency)}</span>
                        </div>
                        {deliveryFee > 0 && (
                          <div style={s.totalsRow}>
                            <span style={s.totalLabel}>Delivery Fee</span><span style={s.totalColon}>:</span><span style={s.totalValue}>+ {formatPrice(deliveryFee, currency)}</span>
                          </div>
                        )}
                        <div style={s.grandTotal}>
                          <span style={{ fontWeight: 700, color: '#fff', fontFamily: "'Roboto', system-ui, sans-serif" }}>TOTAL</span>
                          <span style={{ color: '#fff' }}>:</span>
                          <span style={s.grandTotalValue}>{formatPrice(total, currency)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Footer */}
                    <div style={s.footer}>
                      {shopNotes ? (
                        <div style={s.footerNotes}>
                          {shopNotes.slice(0, 100)}
                          {shopNotes.length > 100 && <><br/>{shopNotes.slice(100)}</>}
                        </div>
                      ) : null}
                    </div>

                    <div style={s.websiteBar}>
                      <span>{botName}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
