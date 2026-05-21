import { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Download, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { useToastStore } from '../../store/toastStore';
import { normalizeText } from '../../utils/normalizeText';

const RECEIPT_W = 800;
const MAIN_BLUE = '#003366';
const ACCENT_LINE = '#007bff';
const TEXT_DARK = '#333';
const TEXT_MUTED = '#666';
const BORDER_LIGHT = '#ddd';
const LIGHT_BLUE = '#e0f2f7';

const s = {
  wrap: {
    width: RECEIPT_W,
    minHeight: 1000,
    background: '#ffffff',
    fontFamily: "'Open Sans', system-ui, -apple-system, sans-serif",
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
  },
  receiptBlock: { textAlign: 'right' },
  receiptHeading: {
    fontFamily: 'Roboto, system-ui, sans-serif',
    fontSize: 42,
    fontWeight: 700,
    color: MAIN_BLUE,
    lineHeight: 1,
  },
  thankYou: {
    fontFamily: "'Dancing Script', cursive",
    fontSize: 15,
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
  thProduct: { flex: 1, padding: '10px 15px' },
  thQty: { width: 80, padding: '10px 15px', textAlign: 'center' },
  thPrice: { width: 120, padding: '10px 15px', textAlign: 'right' },
  thTotal: { width: 120, padding: '10px 15px', textAlign: 'right' },
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
  },
  tdQty: {
    width: 80,
    padding: '12px 15px',
    textAlign: 'center',
    color: TEXT_DARK,
  },
  tdUnit: {
    width: 120,
    padding: '12px 15px',
    textAlign: 'right',
    color: TEXT_DARK,
  },
  tdTotal: {
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
  footerCursive: {
    fontFamily: "'Dancing Script', cursive",
    fontSize: 28,
    color: MAIN_BLUE,
    flexShrink: 0,
    paddingRight: 25,
    borderRight: `1px solid ${BORDER_LIGHT}`,
  },
  footerMsg: { flexGrow: 1, fontSize: 11, color: TEXT_MUTED },
  footerMsgStrong: { color: TEXT_DARK, fontWeight: 600, display: 'block', marginBottom: 3 },
  footerBadge: {
    width: 50,
    height: 50,
    border: `2px solid ${MAIN_BLUE}`,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 20,
    color: MAIN_BLUE,
    flexShrink: 0,
    backgroundColor: LIGHT_BLUE,
  },
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

function buildSvgData(order, bot, botName, items, subtotal, total, orderDate, paymentMethod, minRows) {
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

  const orderNum = esc(order.order_number || `#${order.id}`);
  const cName = esc(order.buyer_snapshot?.full_name || order.customer?.first_name || '—');
  const phone = esc(order.buyer_snapshot?.phone || '—');
  const email = esc(order.buyer_snapshot?.email || '—');
  const addr = esc(order.buyer_snapshot?.address || '—');
  const cAddr = esc(order.buyer_snapshot?.address || '……………………………………');
  const cPhone = esc(order.buyer_snapshot?.phone || '……………………………………');
  const cEmail = esc(order.buyer_snapshot?.email || '……………………………………');
  const tg = esc(bot?.bot_username ? `@${bot.bot_username}` : '……………………………………');
  const uid = esc(order.customer?.telegram_id || order.customer?.id || '—');
  const note = esc(order.notes || '—');
  const initial = esc(botName.charAt(0).toUpperCase());
  const sName = esc(botName);
  const fmtDate = format(orderDate, 'MMM dd, yyyy');
  const payM = esc(paymentMethod);
  const sub = `MMK ${(subtotal || 0).toFixed(2)}`;
  const tot = `MMK ${(total || 0).toFixed(2)}`;

  const HDR_Y = 40;
  const HDR_H = 150;
  const MID_Y = HDR_Y + HDR_H + 5;
  const MID_END = MID_Y + 12 + 118 + 6 + 12;
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
      const ln = `MMK ${((item.price||0)*(item.quantity||0)).toFixed(2)}`;
      const pn = esc(item.product_name || item.name || '—');
      cells = `
        <text x="55" y="${ry+19}" fill="${MB}" font-weight="600" font-size="12">${i+1}</text>
        <text x="100" y="${ry+19}" fill="${TD}" font-size="12">${pn}</text>
        <text x="550" y="${ry+19}" text-anchor="middle" fill="${TD}" font-size="12">${item.quantity||'—'}</text>
        <text x="645" y="${ry+19}" text-anchor="end" fill="${TD}" font-size="12">MMK ${(item.price||0).toFixed(2)}</text>
        <text x="760" y="${ry+19}" text-anchor="end" fill="${TD}" font-size="12">${ln}</text>`;
    } else {
      cells = `
        <text x="55" y="${ry+19}" fill="${FS}" font-weight="600" font-size="12">${i+1}</text>
        <text x="100" y="${ry+19}" fill="${FS}" font-size="12">${'·'.repeat(30)}</text>
        <text x="550" y="${ry+19}" text-anchor="middle" fill="${FS}" font-size="12">${'·'.repeat(4)}</text>
        <text x="645" y="${ry+19}" text-anchor="end" fill="${FS}" font-size="12">${'·'.repeat(10)}</text>
        <text x="760" y="${ry+19}" text-anchor="end" fill="${FS}" font-size="12">${'·'.repeat(10)}</text>`;
    }
    tableRows += `<g>
      <line x1="40" y1="${ry+ROW_H-1}" x2="760" y2="${ry+ROW_H-1}" stroke="${BL}" stroke-width="1"/>
      ${cells}
    </g>`;
  }

  const totalLines = [
    { l: 'Subtotal', v: sub },
    { l: 'Discount', v: `- ${sub}` },
    { l: 'Tax', v: `+ MMK 0.00` },
    { l: 'Shipping', v: `+ MMK 0.00` },
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
    text{font-family:'Open Sans',system-ui,-apple-system,sans-serif;font-size:12px}
    .r{font-family:'Roboto',system-ui,sans-serif}
    .dc{font-family:'Dancing Script',cursive}
    .w{fill:#fff}
  </style>
  </defs>
  <rect width="${W}" height="${TOTAL_H}" fill="#fff"/>
  <!-- TOP BAR -->
  <rect width="${W}" height="10" fill="${MB}"/>

  <!-- ============ HEADER (y=${HDR_Y}) ============ -->
  <g transform="translate(${PAD}, ${HDR_Y})">
    <!-- Logo -->
    <circle cx="50" cy="50" r="50" fill="#fff" stroke="${MB}" stroke-width="2"/>
    <text x="50" y="56" text-anchor="middle" fill="${MB}" font-size="16" font-weight="600" class="r">${initial}</text>

    <!-- Shop info -->
    <text x="140" y="22" fill="${MB}" font-size="24" font-weight="700" class="r">${sName}</text>
    <text x="140" y="44" fill="${TM}" font-size="13">Your Trusted Online Store</text>

    <!-- Contacts -->
    <text x="140" y="68" fill="${TM}" font-size="12">📍</text>
    <text x="160" y="68" fill="${TM}" font-size="12">${cAddr}</text>
    <line x1="160" y1="74" x2="350" y2="74" stroke="${BL}" stroke-width="1"/>

    <text x="140" y="90" fill="${TM}" font-size="12">📞</text>
    <text x="160" y="90" fill="${TM}" font-size="12">${cPhone}</text>
    <line x1="160" y1="96" x2="350" y2="96" stroke="${BL}" stroke-width="1"/>

    <text x="140" y="112" fill="${TM}" font-size="12">✉️</text>
    <text x="160" y="112" fill="${TM}" font-size="12">${cEmail}</text>
    <line x1="160" y1="118" x2="350" y2="118" stroke="${BL}" stroke-width="1"/>

    <text x="140" y="134" fill="${TM}" font-size="12">🌐</text>
    <text x="160" y="134" fill="${TM}" font-size="12">${tg}</text>
    <line x1="160" y1="140" x2="350" y2="140" stroke="${BL}" stroke-width="1"/>

    <!-- RECEIPT heading (right) -->
    <text x="720" y="22" text-anchor="end" fill="${MB}" font-size="44" font-weight="700" class="r">RECEIPT</text>
    <text x="720" y="46" text-anchor="end" fill="${AL}" font-size="15" class="dc">Thank you for your purchase!</text>
    <line x1="550" y1="54" x2="720" y2="54" stroke="${AL}" stroke-width="2"/>

    <!-- Meta rows (labels aligned, colons fixed at x=605) -->
    <g transform="translate(0, 0)">
      <text x="510" y="80" fill="${TD}" font-size="13" font-weight="600">Receipt No.</text>
      <text x="605" y="80" fill="${TM}" font-size="13">:</text>
      <text x="620" y="80" fill="${TM}" font-size="13">${orderNum}</text>
      <line x1="620" y1="86" x2="720" y2="86" stroke="${BL}" stroke-width="1"/>
    </g>
    <g transform="translate(0, 0)">
      <text x="510" y="102" fill="${TD}" font-size="13" font-weight="600">Date</text>
      <text x="605" y="102" fill="${TM}" font-size="13">:</text>
      <text x="620" y="102" fill="${TM}" font-size="13">${fmtDate}</text>
      <line x1="620" y1="108" x2="720" y2="108" stroke="${BL}" stroke-width="1"/>
    </g>
    <g transform="translate(0, 0)">
      <text x="510" y="124" fill="${TD}" font-size="13" font-weight="600">Order ID</text>
      <text x="605" y="124" fill="${TM}" font-size="13">:</text>
      <text x="620" y="124" fill="${TM}" font-size="13">${orderNum}</text>
      <line x1="620" y1="130" x2="720" y2="130" stroke="${BL}" stroke-width="1"/>
    </g>
  </g>
  <line x1="${PAD}" y1="${HDR_Y+HDR_H}" x2="${W-PAD}" y2="${HDR_Y+HDR_H}" stroke="${BL}" stroke-width="1"/>

  <!-- ============ MID SECTION (y=${MID_Y}) ============ -->
  <!-- Bill To -->
  <g transform="translate(${PAD}, ${MID_Y+12})">
    <rect x="0" y="0" width="115" height="28" rx="5" fill="${MB}"/>
    <text x="12" y="19" fill="#fff" font-size="13" font-weight="500" class="r">👤 BUYER INFO</text>
    <text x="0" y="52" fill="${TD}" font-size="12" font-weight="600">Name</text>
    <text x="60" y="52" fill="${TM}" font-size="12">:</text>
    <text x="70" y="52" fill="${TM}" font-size="12">${cName}</text>
    <line x1="70" y1="58" x2="350" y2="58" stroke="${BL}" stroke-width="1"/>

    <text x="0" y="74" fill="${TD}" font-size="12" font-weight="600">Phone</text>
    <text x="60" y="74" fill="${TM}" font-size="12">:</text>
    <text x="70" y="74" fill="${TM}" font-size="12">${phone}</text>
    <line x1="70" y1="80" x2="350" y2="80" stroke="${BL}" stroke-width="1"/>

    <text x="0" y="96" fill="${TD}" font-size="12" font-weight="600">Email</text>
    <text x="60" y="96" fill="${TM}" font-size="12">:</text>
    <text x="70" y="96" fill="${TM}" font-size="12">${email}</text>
    <line x1="70" y1="102" x2="350" y2="102" stroke="${BL}" stroke-width="1"/>

    <text x="0" y="118" fill="${TD}" font-size="12" font-weight="600">Address</text>
    <text x="60" y="118" fill="${TM}" font-size="12">:</text>
    <text x="70" y="118" fill="${TM}" font-size="12">${addr}</text>
    <line x1="70" y1="124" x2="350" y2="124" stroke="${BL}" stroke-width="1"/>
  </g>

  <!-- Vertical divider -->
  <line x1="400" y1="${MID_Y+12}" x2="400" y2="${MID_END-5}" stroke="${BL}" stroke-width="1"/>

  <!-- Order Details -->
  <g transform="translate(415, ${MID_Y+12})">
    <rect x="0" y="0" width="150" height="28" rx="5" fill="${MB}"/>
    <text x="12" y="19" fill="#fff" font-size="13" font-weight="500" class="r">🧾 ORDER DETAILS</text>
    <text x="0" y="52" fill="${TD}" font-size="12" font-weight="600">User ID</text>
    <text x="70" y="52" fill="${TM}" font-size="12">:</text>
    <text x="80" y="52" fill="${TM}" font-size="12">${uid}</text>
    <line x1="80" y1="58" x2="345" y2="58" stroke="${BL}" stroke-width="1"/>

    <text x="0" y="74" fill="${TD}" font-size="12" font-weight="600">Date</text>
    <text x="70" y="74" fill="${TM}" font-size="12">:</text>
    <text x="80" y="74" fill="${TM}" font-size="12">${fmtDate}</text>
    <line x1="80" y1="80" x2="345" y2="80" stroke="${BL}" stroke-width="1"/>

    <text x="0" y="96" fill="${TD}" font-size="12" font-weight="600">Payment</text>
    <text x="70" y="96" fill="${TM}" font-size="12">:</text>
    <text x="80" y="96" fill="${TM}" font-size="12">${payM}</text>
    <line x1="80" y1="102" x2="345" y2="102" stroke="${BL}" stroke-width="1"/>

    <text x="0" y="118" fill="${TD}" font-size="12" font-weight="600">Notes</text>
    <text x="70" y="118" fill="${TM}" font-size="12">:</text>
    <text x="80" y="118" fill="${TM}" font-size="12">${note}</text>
    <line x1="80" y1="124" x2="345" y2="124" stroke="${BL}" stroke-width="1"/>
  </g>
  <line x1="${PAD}" y1="${MID_END}" x2="${W-PAD}" y2="${MID_END}" stroke="${BL}" stroke-width="1"/>

  <!-- ============ TABLE (bar y=${TBL_BAR}) ============ -->
  <rect x="${PAD}" y="${TBL_BAR}" width="${CW}" height="${TBL_H}" rx="5" fill="${MB}"/>
  <text x="55" y="${TBL_BAR+19}" fill="#fff" font-size="12" font-weight="600" class="r">#</text>
  <text x="100" y="${TBL_BAR+19}" fill="#fff" font-size="12" font-weight="600" class="r">PRODUCTS</text>
  <text x="550" y="${TBL_BAR+19}" text-anchor="middle" fill="#fff" font-size="12" font-weight="600" class="r">QTY</text>
  <text x="645" y="${TBL_BAR+19}" text-anchor="end" fill="#fff" font-size="12" font-weight="600" class="r">UNIT PRICE</text>
  <text x="760" y="${TBL_BAR+19}" text-anchor="end" fill="#fff" font-size="12" font-weight="600" class="r">TOTAL PRICE</text>
  ${tableRows}

  <!-- ============ BOTTOM (y=${BOT_Y}) ============ -->
  <g transform="translate(${PAD}, ${BOT_Y})">
    <!-- LEFT: Payment -->
    <rect x="0" y="0" width="290" height="50" rx="8" fill="#fff" stroke="${BL}" stroke-width="1"/>
    <text x="15" y="20" fill="${MB}" font-size="13" font-weight="500" class="r">💳 PAYMENT METHOD</text>
    <text x="15" y="42" fill="${TM}" font-size="12">${payM}</text>

    <rect x="0" y="65" width="290" height="70" rx="8" fill="#fff" stroke="${BL}" stroke-width="1"/>
    <text x="15" y="85" fill="${MB}" font-size="13" font-weight="500" class="r">💰 AMOUNT PAID</text>
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
    <text x="0" y="38" fill="${MB}" font-size="28" class="dc">Thank You!</text>
    <line x1="130" y1="10" x2="130" y2="52" stroke="${BL}" stroke-width="1"/>
    <text x="150" y="28" fill="${TD}" font-size="12" font-weight="600">We appreciate your business.</text>
    <text x="150" y="46" fill="${TM}" font-size="11">If you have any questions, please contact us.</text>
    <circle cx="${CW-25}" cy="30" r="24" fill="${LB}" stroke="${MB}" stroke-width="2"/>
    <text x="${CW-25}" y="36" text-anchor="middle" fill="${MB}" font-size="16">❤️</text>
  </g>

  <!-- ============ WEBSITE BAR ============ -->
  <rect x="0" y="${WEB_Y}" width="${W}" height="${WEB_H}" fill="${MB}"/>
  <text x="400" y="${WEB_Y+18}" text-anchor="middle" fill="rgba(255,255,255,0.85)" font-size="11">Powered by ${sName}</text>
</svg>`;
}

export default function Receipt({ order, bot, open, onClose }) {
  const receiptRef = useRef(null);
  const [generating, setGenerating] = useState(false);
  const [scale, setScale] = useState(1);
  const { addToast } = useToastStore();

  useEffect(() => {
    if (!open) return;
    const calc = () => {
      const vw = window.innerWidth - 32;
      setScale(Math.min(1, vw / RECEIPT_W));
    };
    calc();
    window.addEventListener('resize', calc);
    return () => window.removeEventListener('resize', calc);
  }, [open]);

  if (!order) return null;

  const botName = bot ? normalizeText(bot.bot_full_name || bot.bot_username || 'Shop') : 'Shop';
  const items = order.items || [];
  const subtotal = items.reduce((s, it) => s + ((it.price || 0) * (it.quantity || 0)), 0);
  const total = subtotal;
  const orderDate = order.created_at ? new Date(order.created_at) : new Date();
  const paymentMethod = order.payment_method || 'Cash';

  const minTableRows = Math.max(5, items.length);

  const handleDownload = async () => {
    setGenerating(true);
    try {
      const svg = buildSvgData(order, bot, botName, items, subtotal, total, orderDate, paymentMethod, minTableRows);
      const blob = new Blob([svg], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);

      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = url;
      });

      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      URL.revokeObjectURL(url);

      let logoUrl = bot?.profile_picture || '';
      if (logoUrl) logoUrl = logoUrl.replace('/static/uploads/profile_pictures/', '/serve/profile-picture/');
      if (logoUrl) {
        try {
          const resp = await fetch(logoUrl);
          const blob = await resp.blob();
          const dataUrl = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.readAsDataURL(blob);
          });
          const logoImg = new Image();
          await new Promise((resolve, reject) => {
            logoImg.onload = resolve;
            logoImg.onerror = reject;
            logoImg.src = dataUrl;
          });

          const scale = img.naturalWidth / 800;
          const cx = (40 + 50) * scale;
          const cy = (40 + 50) * scale;
          const r = 50 * scale;

          ctx.save();
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.clip();
          ctx.drawImage(logoImg, cx - r, cy - r, r * 2, r * 2);
          ctx.restore();

          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.strokeStyle = '#003366';
          ctx.lineWidth = 2 * scale;
          ctx.stroke();
        } catch (e) {
          console.warn('Logo overlay failed:', e);
        }
      }

      const link = document.createElement('a');
      link.download = `receipt-${order.order_number || order.id}.png`;
      link.href = canvas.toDataURL('image/png');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      addToast('Receipt downloaded successfully');
    } catch (err) {
      console.error('Receipt export failed:', err);
      addToast('Failed to generate receipt image', 'error');
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
              <h2 className="text-lg font-bold text-gray-900">Receipt</h2>
              <div className="flex items-center gap-2">
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

            <div className="flex-1 overflow-y-auto px-4 pb-6">
              <div className="flex justify-center" style={{ minHeight: RECEIPT_W * 1.2 }}>
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
                          <div style={s.tagline}>Your Trusted Online Store</div>
                          <div style={s.contactRow}>
                            <span style={s.contactIcon}>📍</span>
                            <span style={s.contactValue}>{order.buyer_snapshot?.address || '……………………………………'}</span>
                          </div>
                          <div style={s.contactRow}>
                            <span style={s.contactIcon}>📞</span>
                            <span style={s.contactValue}>{order.buyer_snapshot?.phone || '……………………………………'}</span>
                          </div>
                          <div style={s.contactRow}>
                            <span style={s.contactIcon}>✉️</span>
                            <span style={s.contactValue}>{order.buyer_snapshot?.email || '……………………………………'}</span>
                          </div>
                          <div style={s.contactRow}>
                            <span style={s.contactIcon}>🌐</span>
                            <span style={s.contactValue}>{bot?.bot_username ? `@${bot.bot_username}` : '……………………………………'}</span>
                          </div>
                        </div>
                      </div>

                      <div style={s.receiptBlock}>
                        <div style={s.receiptHeading}>RECEIPT</div>
                        <div style={s.thankYou}>Thank you for your purchase!</div>
                        <div style={s.metaRight}>
                          <span style={s.metaLabel}>Receipt No.</span>
                          <span style={s.metaColon}>:</span>
                          <span style={s.metaValue}>{order.order_number || `#${order.id}`}</span>
                        </div>
                        <div style={s.metaRight}>
                          <span style={s.metaLabel}>Date</span>
                          <span style={s.metaColon}>:</span>
                          <span style={s.metaValue}>{format(orderDate, 'MMM dd, yyyy')}</span>
                        </div>
                        <div style={s.metaRight}>
                          <span style={s.metaLabel}>Order ID</span>
                          <span style={s.metaColon}>:</span>
                          <span style={s.metaValue}>{order.order_number || `#${order.id}`}</span>
                        </div>
                      </div>
                    </div>

                    {/* Bill To / Order Details */}
                    <div style={s.mid}>
                      <div style={s.midColBorder}>
                        <div style={s.sectionTitle}><span>👤</span> BUYER INFO</div>
                        <div style={s.fieldItem}>
                          <span style={s.fieldLabel}>Name</span><span style={s.fieldSep}>:</span><span style={s.fieldValue}>{order.buyer_snapshot?.full_name || order.customer?.first_name || '—'}</span>
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
                      </div>
                      <div style={s.midCol}>
                        <div style={s.sectionTitle}><span>🧾</span> ORDER DETAILS</div>
                        <div style={{ ...s.fieldItem, ...{ '--label-w': '120px' } }}>
                          <span style={s.fieldLabelWide}>User ID</span><span style={s.fieldSep}>:</span><span style={s.fieldValue}>{order.customer?.telegram_id || order.customer?.id || '—'}</span>
                        </div>
                        <div style={s.fieldItem}>
                          <span style={s.fieldLabelWide}>Date</span><span style={s.fieldSep}>:</span><span style={s.fieldValue}>{format(orderDate, 'MMM dd, yyyy')}</span>
                        </div>
                        <div style={s.fieldItem}>
                          <span style={s.fieldLabelWide}>Payment Method</span><span style={s.fieldSep}>:</span><span style={s.fieldValue}>{paymentMethod}</span>
                        </div>
                        <div style={s.fieldItem}>
                          <span style={s.fieldLabelWide}>Notes</span><span style={s.fieldSep}>:</span><span style={s.fieldValue}>{order.notes || '—'}</span>
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
                        <div style={s.thPrice}>UNIT PRICE</div>
                        <div style={s.thTotal}>TOTAL PRICE</div>
                      </div>
                      {/* Data rows */}
                      {Array.from({ length: minTableRows }).map((_, i) => {
                        const item = items[i];
                        if (item) {
                          const lineTotal = (item.price || 0) * (item.quantity || 0);
                          return (
                            <div key={i} style={s.tableRow}>
                              <div style={s.tdId}>{i + 1}</div>
                              <div style={s.tdProduct}>{item.product_name || item.name || '—'}</div>
                              <div style={s.tdQty}>{item.quantity || '—'}</div>
                              <div style={s.tdUnit}>MMK {(item.price || 0).toFixed(2)}</div>
                              <div style={s.tdTotal}>MMK {lineTotal.toFixed(2)}</div>
                            </div>
                          );
                        }
                        return (
                          <div key={`empty-${i}`} style={s.tableRow}>
                            <div style={s.tdId}>{i + 1}</div>
                            <div style={s.tdProduct}>{'·'.repeat(30)}</div>
                            <div style={s.tdQty}>{'·'.repeat(4)}</div>
                            <div style={s.tdUnit}>{'·'.repeat(8)}</div>
                            <div style={s.tdTotal}>{'·'.repeat(8)}</div>
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
                          <div style={s.payTitle}>💰 AMOUNT PAID</div>
                          <div style={s.amountValue}>MMK {total.toFixed(2)}</div>
                        </div>
                      </div>

                      <div style={s.totalsCol}>
                        <div style={s.totalsRow}>
                          <span style={s.totalLabel}>Subtotal</span><span style={s.totalColon}>:</span><span style={s.totalValue}>MMK {subtotal.toFixed(2)}</span>
                        </div>
                        <div style={s.totalsRow}>
                          <span style={s.totalLabel}>Discount</span><span style={s.totalColon}>:</span><span style={s.totalValue}>- MMK 0.00</span>
                        </div>
                        <div style={s.totalsRow}>
                          <span style={s.totalLabel}>Tax</span><span style={s.totalColon}>:</span><span style={s.totalValue}>+ MMK 0.00</span>
                        </div>
                        <div style={s.totalsRow}>
                          <span style={s.totalLabel}>Shipping</span><span style={s.totalColon}>:</span><span style={s.totalValue}>+ MMK 0.00</span>
                        </div>
                        <div style={s.grandTotal}>
                          <span style={{ fontWeight: 700, color: '#fff', fontFamily: "'Roboto', system-ui, sans-serif" }}>TOTAL</span>
                          <span style={{ color: '#fff' }}>:</span>
                          <span style={s.grandTotalValue}>MMK {total.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Footer */}
                    <div style={s.footer}>
                      <div style={s.footerCursive}>Thank You!</div>
                      <div style={s.footerMsg}>
                        <strong style={s.footerMsgStrong}>We appreciate your business.</strong>
                        <span>If you have any questions, please contact us.</span>
                      </div>
                      <div style={s.footerBadge}>❤️</div>
                    </div>

                    <div style={s.websiteBar}>
                      <span>Powered by {botName}</span>
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
