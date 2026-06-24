import { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Download, Loader2 } from 'lucide-react';
import { myanmarFormat } from '../../utils/date';
import { useToastStore } from '../../store/toastStore';
import { useAuthStore } from '../../store/authStore';
import { normalizeText } from '../../utils/normalizeText';
import { API_BASE } from '../../api/config';
import html2canvas from 'html2canvas';

import { generateInvoiceNumber } from '../../api/orders';

const RECEIPT_W = 800;
const MAIN_BLUE = '#003366';
const ACCENT_LINE = '#007bff';
const TEXT_DARK = '#333';
const TEXT_MUTED = '#666';
const BORDER_LIGHT = '#ddd';
const LIGHT_BLUE = '#e0f2f7';

const getAuthToken = () => {
  const stateToken = useAuthStore.getState().token;
  if (stateToken) return stateToken;
  try {
    return JSON.parse(localStorage.getItem('auth-storage'))?.state?.token || null;
  } catch {
    return null;
  }
};

const toAbsoluteUrl = (url) => {
  if (!url || url.startsWith('data:') || url.startsWith('blob:')) return url;
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith('/')) return `${API_BASE}${url}`;
  return url;
};

const getBotLogoUrl = (bot) => {
  const rawLogo = bot?.profile_picture || bot?.logo || bot?.logo_url || bot?.avatar_url;
  if (!rawLogo) return null;
  if (/^(data:|blob:|https?:\/\/|\/)/i.test(rawLogo)) return toAbsoluteUrl(rawLogo);

  const token = getAuthToken();
  const params = new URLSearchParams({ bot_id: String(bot.id) });
  if (token) params.set('token', token);
  return `${API_BASE}/telegram/file/${encodeURIComponent(rawLogo)}?${params.toString()}`;
};

const blobToDataUrl = (blob) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = reject;
  reader.readAsDataURL(blob);
});

const loadLogoDataUrl = async (url) => {
  if (!url || url.startsWith('data:')) return url;
  if (url.startsWith('blob:')) return url;

  const token = getAuthToken();
  const res = await fetch(url, {
    mode: 'cors',
    credentials: 'omit',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!res.ok) throw new Error('Logo request failed');
  const blob = await res.blob();
  return blobToDataUrl(blob);
};

const waitForImages = async (node) => {
  const images = Array.from(node.querySelectorAll('img'));
  await Promise.all(images.map(async (img) => {
    if (img.complete && img.naturalWidth > 0) return;
    if (typeof img.decode === 'function') {
      try {
        await img.decode();
        return;
      } catch {}
    }
    await new Promise((resolve) => {
      img.onload = resolve;
      img.onerror = resolve;
    });
  }));
};

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


export default function Receipt({ order, bot, open, onClose, receiptType = 'receipt', receiptSettings = {} }) {
  const receiptRef = useRef(null);
  const [generating, setGenerating] = useState(false);
  const [scale, setScale] = useState(1);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [logoSrc, setLogoSrc] = useState(null);
  const [logoError, setLogoError] = useState(false);
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

    // Fetch the logo as a blob-backed data URL so html2canvas can export it without CORS tainting.
    let cancelled = false;
    setLogoError(false);
    setLogoSrc(null);
    const logoUrl = getBotLogoUrl(bot);
    if (logoUrl) {
      loadLogoDataUrl(logoUrl)
        .then((dataUrl) => {
          if (!cancelled) setLogoSrc(dataUrl);
        })
        .catch(() => {
          if (!cancelled) setLogoError(true);
        });
    }

    const calc = () => {
      const vw = window.innerWidth - 32;
      setScale(Math.min(1, vw / RECEIPT_W));
    };
    calc();
    window.addEventListener('resize', calc);
    document.body.style.overflow = 'hidden';
    return () => {
      cancelled = true;
      window.removeEventListener('resize', calc);
      document.body.style.overflow = '';
    };
  }, [open, order, bot?.id, bot?.profile_picture, bot?.logo, bot?.logo_url, bot?.avatar_url]);

  if (!order) return null;

  const botName = bot ? normalizeText(bot.bot_full_name || bot.bot_username || 'Shop') : 'Shop';
  const items = order.items || [];
  const subtotal = items.reduce((s, it) => s + ((it.price || 0) * (it.quantity || 0)), 0);
  const deliveryFee = Number(order.delivery_fee) || 0;
  const total = subtotal + deliveryFee;
  const orderDate = order.created_at ? new Date(order.created_at) : new Date();
  const paymentMethod = order.payment_method || 'Cash';

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
      if (!receiptRef.current) throw new Error('Receipt element not found');

      const fileName = `${receiptType}-${order.order_number || order.id}.png`;
      const node = receiptRef.current;
      await waitForImages(node);

      // Temporarily pause the CSS transform scale so html2canvas reads native dimensions
      const origTransform = node.parentElement?.style.transform || '';
      const origOrigin = node.parentElement?.style.transformOrigin || '';
      if (node.parentElement) {
        node.parentElement.style.transform = 'none';
        node.parentElement.style.transformOrigin = '';
      }

      try {
        const canvas = await html2canvas(node, {
          width: RECEIPT_W,
          height: node.scrollHeight || 1200,
          scale: 2,
          useCORS: true,
          allowTaint: false,
          backgroundColor: '#ffffff',
          logging: false,
        });

        // Restore transform
        if (node.parentElement) {
          node.parentElement.style.transform = origTransform;
          node.parentElement.style.transformOrigin = origOrigin;
        }

        const dataUrl = canvas.toDataURL('image/png');

        if (window.AndroidBridge && typeof window.AndroidBridge.downloadBase64 === 'function') {
          const base64 = dataUrl.split(',')[1];
          window.AndroidBridge.downloadBase64(base64, 'image/png', `filename="${fileName}"`);
        } else {
          const link = document.createElement('a');
          link.download = fileName;
          link.href = dataUrl;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
        addToast('Receipt downloaded successfully');
      } catch (err) {
        // Restore transform if not done yet
        if (node.parentElement) {
          node.parentElement.style.transform = origTransform;
          node.parentElement.style.transformOrigin = origOrigin;
        }
        throw err;
      }
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
              <h2 className="text-lg font-bold text-gray-900">{receiptType === 'invoice' ? 'Invoice' : 'Receipt'}</h2>
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

            <div className="flex-1 overflow-y-hidden px-4 pb-6">
              <div className="flex justify-center">
                <div style={{ transform: `scale(${scale})`, transformOrigin: 'top center' }}>
                  <div ref={receiptRef} style={s.wrap}>
                    <div style={s.topLine} />

                    {/* Header */}
                    <div style={s.header}>
                      <div style={s.shopInfo}>
                        <div style={s.logoCircle}>
                          {logoSrc ? (
                            <img src={logoSrc} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                          ) : (
                            <span style={logoError ? {} : { opacity: 0.5 }}>{botName.charAt(0).toUpperCase()}</span>
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
                      </div>
                      <div style={s.midCol}>
                        <div style={s.sectionTitle}><span>🧾</span> {isInv ? 'ORDER DETAILS' : 'PAYMENT DETAILS'}</div>
                        <div style={{ ...s.fieldItem, ...{ '--label-w': '120px' } }}>
                          <span style={s.fieldLabelWide}>{isInv ? 'Amount to pay' : 'Amount Paid'}</span><span style={s.fieldSep}>:</span><span style={s.fieldValue}>{total.toFixed(2)} MMK</span>
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
                              <div style={isInv ? s.tdUnitInv : s.tdUnit}>{(item.price || 0).toFixed(2)} MMK</div>
                              <div style={isInv ? s.tdTotalInv : s.tdTotal}>{lineTotal.toFixed(2)} MMK</div>
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
                          <div style={s.amountValue}>{total.toFixed(2)} MMK</div>
                        </div>
                      </div>

                      <div style={s.totalsCol}>
                        <div style={s.totalsRow}>
                          <span style={s.totalLabel}>Subtotal</span><span style={s.totalColon}>:</span><span style={s.totalValue}>{subtotal.toFixed(2)} MMK</span>
                        </div>
                        <div style={s.totalsRow}>
                          <span style={s.totalLabel}>Discount</span><span style={s.totalColon}>:</span><span style={s.totalValue}>- 0.00 MMK</span>
                        </div>
                        <div style={s.totalsRow}>
                          <span style={s.totalLabel}>Tax</span><span style={s.totalColon}>:</span><span style={s.totalValue}>+ 0.00 MMK</span>
                        </div>
                        {deliveryFee > 0 && (
                          <div style={s.totalsRow}>
                            <span style={s.totalLabel}>Delivery Fee</span><span style={s.totalColon}>:</span><span style={s.totalValue}>+ {deliveryFee.toFixed(2)} MMK</span>
                          </div>
                        )}
                        <div style={s.grandTotal}>
                          <span style={{ fontWeight: 700, color: '#fff', fontFamily: "'Roboto', system-ui, sans-serif" }}>TOTAL</span>
                          <span style={{ color: '#fff' }}>:</span>
                          <span style={s.grandTotalValue}>{total.toFixed(2)} MMK</span>
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
