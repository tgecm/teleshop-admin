import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Printer, Download, Settings as SettingsIcon, FileText } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { formatPrice } from '../../utils/formatPrice';
import { myanmarFormat } from '../../utils/date';
import { useToastStore } from '../../store/toastStore';
import { generateReceiptPdfBlob } from './Receipt';
import { downloadBlob } from '../../utils/download';

export const LABEL_PRESETS = [
  { id: '4x6', name: '4" × 6" Thermal Waybill', widthMm: 100, heightMm: 150, desc: 'Standard Courier Sticker (J&T, KEX, Royal Express)', category: 'sticker' },
  { id: '4x4', name: '4" × 4" Square Sticker', widthMm: 100, heightMm: 100, desc: 'Medium Box Sticker', category: 'sticker' },
  { id: '3x2', name: '3" × 2" Small Tag', widthMm: 76, heightMm: 51, desc: 'Compact Parcel Sticker', category: 'sticker' },
  { id: '80mm', name: '80mm Thermal Roll', widthMm: 80, heightMm: 160, desc: '3" Counter Thermal Receipt Printer', category: 'roll' },
  { id: '58mm', name: '58mm Thermal Roll', widthMm: 58, heightMm: 140, desc: '2" Mini Bluetooth Printer', category: 'roll' },
  { id: 'a4', name: 'A4 Paper', widthMm: 210, heightMm: 297, desc: 'Standard Office Paper (Full Page / Multi-label)', category: 'sheet' },
  { id: 'a5', name: 'A5 Paper', widthMm: 148, heightMm: 210, desc: 'Half Page Sheet', category: 'sheet' },
  { id: 'a6', name: 'A6 Postcard / Sheet', widthMm: 105, heightMm: 148, desc: 'Quarter Page Sheet', category: 'sheet' },
  { id: 'custom', name: 'Custom Dimensions', widthMm: 100, heightMm: 150, desc: 'User-defined Width & Height in mm', category: 'custom' }
];

export const DEFAULT_LABEL_SETTINGS = {
  presetId: '4x6',
  orientation: 'portrait',
  showQrCode: true,
  showItems: true,
  showLogo: true,
  showShopContact: true,
  customWidthMm: 100,
  customHeightMm: 150,
};

export function getLabelSettings(dbSettings = {}) {
  const merged = { ...DEFAULT_LABEL_SETTINGS, ...dbSettings };
  try {
    const saved = localStorage.getItem('teleshop_label_settings');
    if (saved && !dbSettings?.presetId) {
      return { ...merged, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.error('Failed to parse label settings', e);
  }
  return merged;
}

export function saveLabelSettings(settings) {
  try {
    localStorage.setItem('teleshop_label_settings', JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save label settings', e);
  }
}

export default function PrintLabelConfirmModal({
  open,
  onClose,
  order,
  bot,
  receiptType = 'invoice',
  invoiceNumber = '',
  receiptNumber = '',
  receiptSettings = {},
  onOpenSettings
}) {
  const addToast = useToastStore(state => state.addToast);
  const [settings, setSettings] = useState(() => getLabelSettings(receiptSettings));
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const exportRef = useRef(null);

  useEffect(() => {
    if (open) {
      setSettings(getLabelSettings(receiptSettings));
    }
  }, [open, receiptSettings]);

  if (!open || !order) return null;

  const currentPreset = LABEL_PRESETS.find(p => p.id === settings.presetId) || LABEL_PRESETS[0];
  const widthMm = settings.presetId === 'custom' ? (Number(settings.customWidthMm) || 100) : currentPreset.widthMm;
  const heightMm = settings.presetId === 'custom' ? (Number(settings.customHeightMm) || 150) : currentPreset.heightMm;

  // Real Shop Information
  const realShopName = bot?.title || bot?.name || bot?.bot_full_name || bot?.bot_username || 'Rino Shop';
  const shopPhone = receiptSettings.phone || bot?.phone || '09780380475b';
  const shopEmail = receiptSettings.email || bot?.email || bot?.admin_notification_email || '';
  const shopWebsite = receiptSettings.website || '';
  const shopAddress = receiptSettings.address || '';
  const shopTagline = receiptSettings.tagline || 'Thank You! We appreciate your business!';
  const shopNotes = receiptSettings.notes || 'Thank You! We appreciate your business!';

  // Customer Information
  const buyerName = order.buyer_snapshot?.name || order.customer?.first_name || 'Valued Customer';
  const buyerPhone = order.buyer_snapshot?.phone || order.customer?.phone || 'N/A';
  const buyerEmail = order.buyer_snapshot?.email || order.customer?.email || '';
  const buyerAddress = order.buyer_snapshot?.address || 'No address provided';
  const buyerTownship = order.buyer_snapshot?.township ? `${order.buyer_snapshot.township}, ` : '';
  const buyerCity = order.buyer_snapshot?.city || '';
  const fullLocation = `${buyerAddress}${buyerTownship || buyerCity ? ` (${buyerTownship}${buyerCity})` : ''}`;
  const buyerNotes = order.notes || order.buyer_snapshot?.notes || '';

  // Order & Financial Info
  const items = order.items || order.order_items || [];
  const currency = bot?.currency || 'MMK';
  const subtotal = order.subtotal || items.reduce((sum, i) => sum + (Number(i.price || 0) * Number(i.quantity || 1)), 0);
  const deliveryFee = Number(order.delivery_fee || 0);
  const totalAmount = Number(order.total_amount || (subtotal + deliveryFee));

  const subtotalFormatted = formatPrice(subtotal, currency);
  const deliveryFeeFormatted = formatPrice(deliveryFee, currency);
  const totalAmountFormatted = formatPrice(totalAmount, currency);

  const isInvoice = receiptType === 'invoice';
  const docTitle = isInvoice ? 'INVOICE' : 'RECEIPT';
  
  // Exact Document Metadata Format
  const orderIdShort = String(order.id).slice(-8).toUpperCase();
  const invNo = invoiceNumber || order.invoice_number || `INV-${order.id}-E21A343B`;
  const orderDateObj = order.created_at ? new Date(order.created_at) : new Date();
  const dateFormattedStr = myanmarFormat(orderDateObj, 'yyyyMMdd');
  const recNo = receiptNumber || order.receipt_no || `RS-ECM-${dateFormattedStr}-${String(order.id).padStart(3, '0')}`;
  
  const rawStatus = String(order.status || 'Pending').toLowerCase();
  const paymentStatus = (['paid', 'delivered', 'confirmed'].includes(rawStatus) || order.payment_status === 'paid') ? 'Paid' : (order.status || 'Pending');
  const paymentMethod = order.payment_method || 'COD';

  // Safe 1-to-1 Image Canvas Print via Hidden Iframe (Matches PDF Download 100%)
  const handlePrint = async () => {
    try {
      addToast('Preparing print document...', 'info');

      const { pngDataUrl, pdfH } = await generateReceiptPdfBlob({
        order,
        bot,
        isInvoice,
        docTitle,
        invoiceNumber,
        receiptNumber,
        receiptSettings: settings,
        targetWidthMm: widthMm,
        targetHeightMm: heightMm,
        orientation: settings.orientation
      });

      // Remove existing hidden print iframe if any
      const existingIframe = document.getElementById('teleshop-print-iframe');
      if (existingIframe) {
        existingIframe.remove();
      }

      // Create hidden print iframe for PNG image
      const iframe = document.createElement('iframe');
      iframe.id = 'teleshop-print-iframe';
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.style.visibility = 'hidden';
      document.body.appendChild(iframe);

      const isRollOrCustom = ['80mm', '58mm', 'custom'].includes(settings.presetId);
      const printH = isRollOrCustom ? (pdfH || heightMm) : heightMm;
      const pageSizeCss = isRollOrCustom
        ? `${widthMm}mm ${printH}mm`
        : `${widthMm}mm ${heightMm}mm ${settings.orientation}`;

      const doc = iframe.contentWindow.document;
      doc.open();
      doc.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>${docTitle} - #${orderIdShort}</title>
          <style>
            @page {
              size: ${pageSizeCss};
              margin: 0;
            }
            * { box-sizing: border-box; margin: 0; padding: 0; }
            html, body {
              width: 100%;
              height: 100%;
              margin: 0;
              padding: 0;
              background: #fff;
            }
            img {
              width: 100%;
              height: auto;
              display: block;
              page-break-inside: avoid;
            }
          </style>
        </head>
        <body>
          <img src="${pngDataUrl}" />
        </body>
        </html>
      `);
      doc.close();

      setTimeout(() => {
        try {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
        } catch (e) {
          console.error('Iframe print error', e);
        } finally {
          setTimeout(() => {
            const el = document.getElementById('teleshop-print-iframe');
            if (el) el.remove();
          }, 3000);
        }
      }, 300);

      addToast('Opening print dialog...', 'success');
    } catch (err) {
      console.error('Print initialization failed', err);
      addToast('Failed to open print dialog', 'error');
    }
  };

  // Bulletproof 1-to-1 PDF Generator using generateReceiptPdfBlob
  const handleDownloadPdf = async () => {
    try {
      setIsGeneratingPdf(true);
      const { pdf } = await generateReceiptPdfBlob({
        order,
        bot,
        receiptType,
        invoiceNumber,
        receiptNumber,
        receiptSettings,
        targetWidthMm: widthMm,
        targetHeightMm: heightMm,
        orientation: settings.orientation
      });

      const pdfBlob = pdf.output('blob');
      const fileName = `${isInvoice ? 'Invoice' : 'Receipt'}_${orderIdShort}_${widthMm}x${heightMm}mm.pdf`;
      await downloadBlob(pdfBlob, fileName);
      addToast(`${docTitle} PDF downloaded successfully!`, 'success');
    } catch (err) {
      console.error('PDF generation error', err);
      addToast('Failed to generate PDF', 'error');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const botLogoUrl = bot?.profile_picture || bot?.bot_logo || '';

  // Shared Document Template JSX
  const renderDocumentBody = () => (
    <div className="w-full bg-white border-2 border-[#003366] rounded-xl p-5 text-[#333] flex flex-col justify-between shadow-sm min-h-[680px] relative overflow-hidden">
      {/* Centered Background Logo Watermark (Circle Shape, 5% Transparency) */}
      {botLogoUrl && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
          <img
            src={botLogoUrl}
            alt=""
            className="w-72 h-72 object-cover rounded-full opacity-5 filter grayscale brightness-90 border-4 border-gray-100/30"
          />
        </div>
      )}

      <div className="relative z-10 space-y-4 flex-1 flex flex-col justify-between">
        <div>
          {/* Top Header */}
          <div className="flex justify-between items-start border-b border-gray-200 pb-4 mb-4 gap-4">
            {/* Shop Details (Far Left) */}
            <div className="max-w-[62%] space-y-1">
              <div className="text-2xl font-black text-[#003366] leading-tight truncate">{realShopName}</div>
              <div className="text-xs text-gray-500 font-medium">{shopTagline}</div>
              {shopPhone && <div className="text-xs text-gray-600">📞 {shopPhone}</div>}
              {shopEmail && <div className="text-xs text-gray-600">✉️ {shopEmail}</div>}
              {shopWebsite && <div className="text-xs text-gray-600">🌐 {shopWebsite}</div>}
              {shopAddress && <div className="text-xs text-gray-600 leading-tight">📍 {shopAddress}</div>}
            </div>

          {/* Document Metadata (Right) */}
          <div className="text-right space-y-1">
            <div className="text-3xl font-black text-[#003366] uppercase tracking-wide leading-none">{docTitle}</div>
            <div className="text-xs font-serif italic text-[#007bff] mb-2">Thank you for your purchase!</div>
            
            <div className="text-xs text-gray-600 space-y-1.5 pt-1">
              <div className="flex justify-end gap-2 items-center">
                <span className="font-semibold text-gray-800 w-24 text-left">Invoice No.</span>
                <span>:</span>
                <span className="font-mono text-gray-900 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-200">{invNo}</span>
              </div>
              <div className="flex justify-end gap-2 items-center">
                <span className="font-semibold text-gray-800 w-24 text-left">Receipt No.</span>
                <span>:</span>
                <span className="font-mono text-gray-900 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-200">{recNo}</span>
              </div>
              <div className="flex justify-end gap-2 items-center">
                <span className="font-semibold text-gray-800 w-24 text-left">Payment Status</span>
                <span>:</span>
                <span className={`font-bold px-2 py-0.5 rounded text-[11px] ${paymentStatus === 'Paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                  {paymentStatus}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Customer & Payment Details Grid */}
        <div className="grid grid-cols-2 gap-4 mb-5">
          {/* Received From / Bill To */}
          <div className="border border-gray-200 rounded-xl overflow-hidden bg-gray-50/50">
            <div className="bg-[#003366] text-white text-xs font-bold px-3 py-1.5 uppercase tracking-wider">
              {isInvoice ? 'BILL TO' : 'RECEIVED FROM'}
            </div>
            <div className="p-3 text-xs space-y-1.5">
              <div className="flex"><span className="font-semibold text-gray-700 w-16">Name</span><span className="mr-1">:</span><span className="font-bold text-gray-900">{buyerName}</span></div>
              <div className="flex"><span className="font-semibold text-gray-700 w-16">Phone</span><span className="mr-1">:</span><span className="font-medium text-gray-900">{buyerPhone}</span></div>
              {buyerEmail && <div className="flex"><span className="font-semibold text-gray-700 w-16">Email</span><span className="mr-1">:</span><span className="text-gray-800">{buyerEmail}</span></div>}
              <div className="flex"><span className="font-semibold text-gray-700 w-16">Address</span><span className="mr-1">:</span><span className="text-gray-800 leading-tight">{fullLocation}</span></div>
              {buyerNotes && <div className="flex"><span className="font-semibold text-gray-700 w-16">Notes</span><span className="mr-1">:</span><span className="text-gray-800">{buyerNotes}</span></div>}
            </div>
          </div>

          {/* Payment / Order Details */}
          <div className="border border-gray-200 rounded-xl overflow-hidden bg-gray-50/50">
            <div className="bg-[#003366] text-white text-xs font-bold px-3 py-1.5 uppercase tracking-wider">
              {isInvoice ? 'ORDER DETAILS' : 'PAYMENT DETAILS'}
            </div>
            <div className="p-3 text-xs space-y-1.5">
              <div className="flex"><span className="font-semibold text-gray-700 w-24">Amount Paid</span><span className="mr-1">:</span><span className="font-bold text-[#003366]">{totalAmountFormatted}</span></div>
              <div className="flex"><span className="font-semibold text-gray-700 w-24">Payment</span><span className="mr-1">:</span><span className="font-semibold text-gray-900">{paymentMethod}</span></div>
              <div className="flex"><span className="font-semibold text-gray-700 w-24">Date</span><span className="mr-1">:</span><span className="text-gray-900">{myanmarFormat(orderDateObj, 'MMM d, yyyy')}</span></div>
            </div>
          </div>
        </div>

        {/* Itemized Products Table */}
        <div className="border border-gray-200 rounded-xl overflow-hidden mb-4">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#003366] text-white font-bold text-[11px] uppercase tracking-wider">
                <th className="py-2.5 px-3 w-10 text-center">#</th>
                <th className="py-2.5 px-3">Products</th>
                <th className="py-2.5 px-3 text-center w-16">QTY</th>
                <th className="py-2.5 px-3 text-right w-28">Unit Price</th>
                <th className="py-2.5 px-3 text-right w-32">Total Price</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((it, idx) => (
                <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                  <td className="py-2 px-3 text-center text-gray-500 font-medium">{idx + 1}</td>
                  <td className="py-2 px-3 font-semibold text-gray-900">{it.product_name || it.name || 'Product'}</td>
                  <td className="py-2 px-3 text-center font-bold text-gray-800">{it.quantity || 1}</td>
                  <td className="py-2 px-3 text-right text-gray-700">{formatPrice(it.price || 0, currency)}</td>
                  <td className="py-2 px-3 text-right font-bold text-[#003366]">{formatPrice((it.price || 0) * (it.quantity || 1), currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        {/* Totals Breakdown */}
        <div className="flex justify-between items-end pt-3 border-t border-gray-200 mb-3">
          <div className="text-xs text-gray-500 space-y-1">
            <div>Payment Method: <span className="font-bold text-gray-800">{paymentMethod}</span></div>
            <div>Order ID: <span className="font-mono text-gray-800">#{orderIdShort}</span></div>
          </div>
          <div className="text-right text-xs space-y-1 w-64">
            <div className="flex justify-between py-0.5 text-gray-600">
              <span>Subtotal:</span>
              <span className="font-semibold text-gray-800">{subtotalFormatted}</span>
            </div>
            {deliveryFee > 0 && (
              <div className="flex justify-between py-0.5 text-gray-600">
                <span>Delivery Fee:</span>
                <span className="font-semibold text-gray-800">+ {deliveryFeeFormatted}</span>
              </div>
            )}
            <div className="flex justify-between items-center bg-[#003366] text-white p-2.5 rounded-lg font-bold text-sm mt-1 shadow-sm">
              <span>TOTAL:</span>
              <span className="text-base">{totalAmountFormatted}</span>
            </div>
          </div>
        </div>

        {/* Footer Notes */}
        <div className="pt-2 border-t border-gray-200 text-center text-[11px] text-gray-500 font-medium">
          <div>{shopNotes}</div>
          <div className="text-[10px] text-gray-400 mt-0.5">Powered by TeleShop • {realShopName}</div>
        </div>
      </div>
    </div>
  </div>
);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        {/* Hidden Export Element for html2canvas & Printing */}
        <div className="fixed -top-[9999px] -left-[9999px] pointer-events-none">
          <div ref={exportRef} style={{ width: '800px', backgroundColor: '#ffffff', padding: '16px' }}>
            {renderDocumentBody()}
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Modal Header */}
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-indigo-50/50 to-purple-50/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-200">
                <Printer className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900">Print {docTitle}</h2>
                <p className="text-xs text-gray-500">Order #{orderIdShort} • {realShopName}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-6 overflow-y-auto space-y-4 flex-1">
            {/* Live On-Screen Document Preview */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Live Document Preview</span>
              </div>
              <div className="bg-gray-100 p-4 rounded-2xl flex justify-center items-start border border-gray-200 overflow-y-auto max-h-[380px]">
                <div
                  className="transition-all shadow-md rounded-xl overflow-hidden bg-white relative flex justify-center items-start border border-gray-200"
                  style={{
                    width: '320px',
                    height: `${Math.min(340, Math.round((heightMm / widthMm) * 320))}px`,
                  }}
                >
                  <div
                    className="flex-shrink-0"
                    style={{
                      transform: 'scale(0.38)',
                      transformOrigin: 'top center',
                      width: '800px',
                      marginTop: '4px',
                    }}
                  >
                    {renderDocumentBody()}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Modal Action Footer */}
          <div className="p-4 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row gap-2.5">
            <button
              onClick={handlePrint}
              className="flex-1 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-2xl shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              <Printer className="w-4 h-4" />
              Print {isInvoice ? 'Invoice' : 'Receipt'}
            </button>
            <button
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="flex-1 py-3.5 bg-white hover:bg-gray-100 text-gray-800 font-bold text-sm rounded-2xl border border-gray-200 shadow-sm transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50"
            >
              <Download className="w-4 h-4 text-gray-600" />
              {isGeneratingPdf ? 'Generating PDF...' : 'Download PDF'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
