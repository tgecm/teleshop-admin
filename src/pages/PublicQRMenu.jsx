import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'motion/react';
import { THEMES, DEFAULT_THEME, BUSINESS_THEMES } from '../themes/themes';
import { identifyCustomer, redeemPoints, validateCoupon } from '../api/qrMenu';
import { createInstantMmpayOrder } from '../api/public';
import QRCustomerDashboard from './QRCustomerDashboard';
import QRSignInModal from '../components/QRMenu/QRSignInModal';
import { isQRAuthenticated, clearQRLogin } from '../lib/qrAuth';

import { API_BASE } from '../api/config';
import ZoomableQrModal from '../components/ZoomableQrModal';
import InstantMmpayQrModal from '../components/InstantMmpayQrModal';
import PreCheckoutMmpayConfirmModal from '../components/PreCheckoutMmpayConfirmModal';
import { linkifyText } from '../utils/linkify';
import { formatPrice } from '../utils/formatPrice';

const CAT_EMOJIS = ['🍽️','🍚','🍜','🍲','🔥','🥗','🥤','🍮','🥩','🌯','🥟','🍕','🥪','🧆','🫘','🥘','🫕','🥫','🍱'];

function getItemImageUrls(image_url, botId) {
  if (!image_url) return [];
  try {
    const parsed = JSON.parse(image_url);
    if (Array.isArray(parsed)) {
      return parsed.map(m => `${API_BASE}/telegram/file/${encodeURIComponent(m.file_id)}?bot_id=${botId}`);
    }
  } catch {}
  return [`${API_BASE}/telegram/file/${encodeURIComponent(image_url)}?bot_id=${botId}`];
}

const BADGE_STYLES = {
  popular:{cls:'badge-popular',label:'⭐ Popular'},
  spicy:{cls:'badge-spicy',label:'🌶️ Spicy'},
  vegetarian:{cls:'badge-veg',label:'🥬 Veg'},
  vegan:{cls:'badge-veg',label:'🌱 Vegan'},
  'gluten-free':{cls:'badge-gf',label:'🌾 GF'},
  new:{cls:'badge-new',label:'🆕 New'},
  hot:{cls:'badge-hot',label:'☕ Hot'},
  iced:{cls:'badge-iced',label:'🧊 Iced'},
  seasonal:{cls:'badge-seasonal',label:'🍂 Seasonal'},
  fresh:{cls:'badge-fresh',label:'🔥 Fresh'},
  limited:{cls:'badge-limited',label:'⏳ Limited'},
  sale:{cls:'badge-sale',label:'🔥 Sale'},
  express:{cls:'badge-express',label:'⚡ Express'},
  relaxing:{cls:'badge-relaxing',label:'💆 Relaxing'},
  premium:{cls:'badge-premium',label:'👑 Premium'},
};

function getCartKey(item, variants, addons) {
  const v = variants && Object.keys(variants).length > 0 ? JSON.stringify(variants) : '';
  const a = addons && addons.length > 0 ? JSON.stringify(addons) : '';
  if (!v && !a) return String(item.id);
  return `${item.id}_${v}_${a}`;
}

function calcItemPrice(item, variants, addons) {
  const base = Number(item.price) || 0;
  const vExt = variants ? Object.values(variants).reduce((s, v) => s + (Number(v.price_add) || 0), 0) : 0;
  const aExt = addons ? addons.reduce((s, a) => s + (Number(a.price_add) || 0), 0) : 0;
  return base + vExt + aExt;
}

function hasVariants(item) {
  return item.data?.variants?.length > 0;
}

function hasAddons(item) {
  return item.data?.addons?.length > 0;
}

function DetailModal({ item, shop, orderItems, onAddToOrder, onClose, addToOrderLabel, isBrowseOnly, shopPhone }) {
  const [qty, setQty] = useState(1);
  const [imgIdx, setImgIdx] = useState(0);
  const [selectedVariants, setSelectedVariants] = useState({});
  const [selectedAddons, setSelectedAddons] = useState([]);
  const images = getItemImageUrls(item.image_url, shop?.id);
  const badges = item.badges || [];
  const variants = item.data?.variants || [];
  const addons = item.data?.addons || [];
  const hasExtras = variants.length > 0 || addons.length > 0;

  const unitPrice = useMemo(() => calcItemPrice(item, selectedVariants, selectedAddons), [item, selectedVariants, selectedAddons]);
  const lineTotal = unitPrice * qty;

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const toggleAddon = (addon) => {
    setSelectedAddons(prev => {
      const ex = prev.find(a => a.label === addon.label);
      if (ex) return prev.filter(a => a.label !== addon.label);
      return [...prev, addon];
    });
  };

  const handleAdd = () => {
    if (qty < 1) return;
    onAddToOrder(item, qty, selectedVariants, selectedAddons);
  };

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-sheet">
        <button className="modal-close" onClick={onClose}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
        <div className="modal-image">
          {images.length > 0 ? (
            <>
              {images.length > 1 && (
                <button className="modal-nav modal-nav-prev" onClick={(e) => { e.stopPropagation(); setImgIdx(prev => prev === 0 ? images.length - 1 : prev - 1); }}>
                  ‹
                </button>
              )}
              <img src={images[imgIdx]} alt={item.name} />
              {images.length > 1 && (
                <>
                  <button className="modal-nav modal-nav-next" onClick={(e) => { e.stopPropagation(); setImgIdx(prev => (prev + 1) % images.length); }}>
                    ›
                  </button>
                  <div className="modal-dots">
                    {images.map((_, i) => (
                      <button key={i} onClick={(e) => { e.stopPropagation(); setImgIdx(i); }}
                        className={`modal-dot ${imgIdx === i ? 'active' : ''}`} />
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            <span style={{fontSize:70}}>🍽️</span>
          )}
        </div>
        <div className="modal-body">
          {badges.length > 0 && (
            <div className="modal-badges">
              {badges.map(b => {
                const cfg = BADGE_STYLES[b];
                return cfg ? <span key={b} className={`modal-badge ${cfg.cls}`}>{cfg.label}</span> : null;
              })}
            </div>
          )}
          <h2 className="modal-name">{item.name}</h2>
          {item.description && <p className="modal-desc select-text product-description cursor-text">{linkifyText(item.description)}</p>}

          {/* Variant groups */}
          {variants.map((vg, gi) => (
            <div key={gi} className="modal-extras-section">
              <div className="modal-extras-label">{vg.name}{vg.required ? ' *' : ''}</div>
              <div className="modal-variant-options">
                {vg.options.map((opt, oi) => {
                  const isSelected = selectedVariants[vg.name]?.label === opt.label;
                  return (
                    <button key={oi}
                      className={`modal-extras-btn ${isSelected ? 'active' : ''}`}
                      onClick={() => setSelectedVariants(prev => ({ ...prev, [vg.name]: opt }))}>
                      <span className="modal-extras-btn-label">{opt.label}</span>
                      {Number(opt.price_add) > 0 && <span className="modal-extras-btn-price">+{formatPrice(opt.price_add, shop?.currency || 'MMK')}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Addons */}
          {addons.length > 0 && (
            <div className="modal-extras-section">
              <div className="modal-extras-label">Add-ons</div>
              <div className="modal-variant-options">
                {addons.map((addon, i) => {
                  const isSelected = selectedAddons.some(a => a.label === addon.label);
                  return (
                    <button key={i}
                      className={`modal-extras-btn ${isSelected ? 'active' : ''}`}
                      onClick={() => toggleAddon(addon)}>
                      <span className="modal-extras-btn-label">
                        {isSelected ? <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg> : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="4"/></svg>}
                        {addon.label}
                      </span>
                      {Number(addon.price_add) > 0 && <span className="modal-extras-btn-price">+{formatPrice(addon.price_add, shop?.currency || 'MMK')}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="modal-price">{formatPrice(unitPrice, shop?.currency || 'MMK')}</div>
          {hasExtras && unitPrice !== Number(item.price) && (
            <div className="modal-price-breakdown">
              Base {formatPrice(item.price, shop?.currency || 'MMK')}
              {Object.values(selectedVariants).filter(v => Number(v.price_add) > 0).map((v, i) => (
                <span key={i}> + {v.label} {formatPrice(v.price_add, shop?.currency || 'MMK')}</span>
              ))}
              {selectedAddons.filter(a => Number(a.price_add) > 0).map((a, i) => (
                <span key={i}> + {a.label} {formatPrice(a.price_add, shop?.currency || 'MMK')}</span>
              ))}
            </div>
          )}

          {!isBrowseOnly && (
            <>
              <div className="modal-qty-row">
                <span className="modal-qty-label">Quantity</span>
                <div className="modal-qty-ctrl">
                  <button className="modal-qty-btn" onClick={() => { if (qty > 1) setQty(q => q - 1); }}>−</button>
                  <span className="modal-qty-num">{qty}</span>
                  <button className="modal-qty-btn" onClick={() => setQty(q => q + 1)}>+</button>
                </div>
              </div>
              <button className="modal-add-btn" onClick={handleAdd}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg>
                <span>{addToOrderLabel || 'Add to order'} · {formatPrice(lineTotal, shop?.currency || 'MMK')}</span>
              </button>
            </>
          )}
          {isBrowseOnly && (
            <a href={`tel:${shopPhone || ''}`} className="modal-add-btn" style={{textDecoration:'none',marginTop:16}}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/></svg>
              <span>{shopPhone ? `Call ${shopPhone}` : 'Call to Order'}</span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function CartSheet({ orderItems, orderCount, orderTotal, shop, onUpdateQty, onRemoveItem, onClearAll, onClose, paymentMode, onProceed, cartTitle, checkoutHint, orderFlowMode }) {
  return (
    <div className="cart-sheet-wrap">
      <div className="cart-sheet-bg" onClick={() => { if (orderCount === 0) onClose(); }}></div>
      <div className="cart-sheet-panel">
        <div className="cart-sheet-header">
          <h2 className="cart-sheet-title">{cartTitle || 'Your Order'}</h2>
          <button onClick={onClose} className="cart-sheet-x">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <div className="cart-sheet-list">
          {orderItems.length === 0 ? (
            <div className="cart-sheet-empty">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ddd" strokeWidth="1.5" style={{display:'block',margin:'0 auto 10px'}}><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg>
              Nothing here yet!
            </div>
          ) : orderItems.map(oi => {
            const imgs = getItemImageUrls(oi.item.image_url, shop?.id);
            const itemUnitPrice = calcItemPrice(oi.item, oi.variants, oi.addons);
            return (
              <div key={oi.cartKey || oi.item.id} className="cart-sheet-item">
                <div className="cart-item-thumb">
                  {imgs[0] ? <img src={imgs[0]} alt={oi.item.name} /> : '🍽️'}
                </div>
                <div className="cart-item-info">
                  <div className="cart-item-name">{oi.item.name}</div>
                  {oi.variants && Object.keys(oi.variants).length > 0 && (
                    <div className="cart-item-extras">
                      {Object.entries(oi.variants).map(([groupName, opt]) => (
                        <span key={groupName} className="cart-item-extra">{groupName}: {opt.label}</span>
                      ))}
                    </div>
                  )}
                  {oi.addons && oi.addons.length > 0 && (
                    <div className="cart-item-extras">
                      {oi.addons.map(a => (
                        <span key={a.label} className="cart-item-extra">+ {a.label}{Number(a.price_add) > 0 ? ` (${formatPrice(a.price_add, shop?.currency || 'MMK')})` : ''}</span>
                      ))}
                    </div>
                  )}
                  <div className="cart-item-price">{formatPrice(itemUnitPrice, shop?.currency || 'MMK')} each</div>
                </div>
                <div className="cart-item-qty">
                  <button className="ciq-btn" onClick={() => onUpdateQty(oi.cartKey || oi.item.id, oi.qty - 1)}>−</button>
                  <span className="ciq-num">{oi.qty}</span>
                  <button className="ciq-btn" onClick={() => onUpdateQty(oi.cartKey || oi.item.id, oi.qty + 1)}>+</button>
                </div>
              </div>
            );
          })}
        </div>
        {orderItems.length > 0 && (
          <div className="cart-sheet-footer">
            <div className="cart-sheet-total">
              <span>Total</span>
              <span>{formatPrice(orderTotal, shop?.currency || 'MMK')}</span>
            </div>
            <div className="cart-sheet-actions">
              <button className="cs-btn cs-btn-secondary" onClick={onClearAll}>Clear</button>
              {(orderFlowMode || paymentMode) === 'prepaid' ? (
                <button className="cs-btn cs-btn-primary" onClick={onProceed}>
                  Proceed
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </button>
              ) : (
                <button className="cs-btn cs-btn-primary" onClick={onClose}>Done</button>
              )}
            </div>
            <p className="cart-sheet-hint">{checkoutHint || 'Share this list with the restaurant staff'}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function CheckoutFlow({ orderItems, orderTotal, shop, paymentMethods, onBack, onSubmitOrder, tableProp, customerId, customerPoints, pointsSettings, netTotal, couponDiscount, pointsDiscount, appliedCoupon, couponInput, setCouponInput, handleApplyCoupon, checkingCoupon, pointsToRedeem, setPointsToRedeem, handleRedeemPoints, redeemingPoints, tokenNumber, couponAttempts, couponLockUntil, hasInstantMmpay }) {
  const [step, setStep] = useState('form');
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [mmpayData, setMmpayData] = useState(null);
  const [isMmpayModalOpen, setIsMmpayModalOpen] = useState(false);
  const [isMmpayPreConfirmOpen, setIsMmpayPreConfirmOpen] = useState(false);
  const [pendingMmpayParams, setPendingMmpayParams] = useState(null);
  const [proofFile, setProofFile] = useState(null);
  const [proofPreview, setProofPreview] = useState('');
  const [uploadingProof, setUploadingProof] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(null);
  const [copied, setCopied] = useState(false);

  const [showDoneDetail, setShowDoneDetail] = useState(false);

  const [couponCountdown, setCouponCountdown] = useState(0);
  useEffect(() => {
    if (!couponLockUntil || Date.now() >= couponLockUntil) { setCouponCountdown(0); return; }
    setCouponCountdown(Math.ceil((couponLockUntil - Date.now()) / 1000));
    const id = setInterval(() => {
      const left = Math.ceil((couponLockUntil - Date.now()) / 1000);
      if (left <= 0) { setCouponCountdown(0); clearInterval(id); }
      else setCouponCountdown(left);
    }, 1000);
    return () => clearInterval(id);
  }, [couponLockUntil]);

  function getPaymentQrUrl(pm) {
    if (!pm?.qr_code_url) return null;
    if (pm.qr_code_url.startsWith('http')) return pm.qr_code_url;
    return `${API_BASE}/telegram/file/${encodeURIComponent(pm.qr_code_url)}?bot_id=${shop.id}`;
  }

  const copyNumber = (num) => {
    navigator.clipboard.writeText(num);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleProofFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.src = reader.result;
      img.onload = () => {
        let w = img.naturalWidth, h = img.naturalHeight;
        const MAX = 854;
        if (w > MAX || h > MAX * 0.75) {
          if (w > h) { h = (h / w) * MAX; w = MAX; }
          else { w = (w / h) * (MAX * 0.75); h = MAX * 0.75; }
        }
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        const ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        c.toBlob(blob => {
          setProofFile(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }));
          setProofPreview(c.toDataURL('image/jpeg', 0.85));
        }, 'image/jpeg', 0.85);
      };
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!selectedPayment) { setError('Please select a payment method'); return; }

    if (selectedPayment?.id === 'mmpay') {
      const items = orderItems.map(oi => ({
        product_id: oi.item.id,
        name: oi.item.name,
        price: calcItemPrice(oi.item, oi.variants, oi.addons),
        quantity: oi.qty
      }));
      setPendingMmpayParams({
        bot_id: shop.id,
        customer_name: name.trim() || 'Walk-in Customer',
        phone: phone.trim() || '-',
        address: tableProp ? `Table ${tableProp}` : 'QR Menu',
        township: 'QR Menu',
        notes: tokenNumber ? `Token #${tokenNumber}` : 'QR Menu - MMQR',
        total_amount: netTotal,
        items
      });
      setIsMmpayPreConfirmOpen(true);
      return;
    }

    if (!proofFile) { setError('Payment proof screenshot is required'); return; }
    setSubmitting(true);
    setError('');
    try {
      let paymentProof = '';
      setUploadingProof(true);
      const fd = new FormData();
      fd.append('file', proofFile);
      fd.append('bot_id', shop.id);
      const uploadRes = await fetch(`${API_BASE}/public/upload/photo`, {
        method: 'POST', body: fd,
      });
      if (uploadRes.ok) {
        const uploadData = await uploadRes.json();
        paymentProof = uploadData.file_id || '';
      }
      setUploadingProof(false);

      const items = orderItems.map(oi => ({
        item_id: oi.item.id,
        name: oi.item.name,
        price: calcItemPrice(oi.item, oi.variants, oi.addons),
        quantity: oi.qty,
        variants: oi.variants || {},
        addons: oi.addons || [],
      }));

      const res = await fetch(`${API_BASE}/public/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bot_id: shop.id,
          customer_name: 'Walk-in Customer',
          phone: '-',
          items,
          order_total: orderTotal, // pre-discount total — backend must apply discounts
          payment_proof: paymentProof,
          payment_method: selectedPayment.name || 'prepaid',
          notes: tableProp ? `Table ${tableProp}` : tokenNumber ? `Token #${tokenNumber}` : 'QR Menu - Prepaid',
          customer_id: customerId || undefined,
          points_to_redeem: pointsToRedeem || 0,
          coupon_code: appliedCoupon?.code || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to place order');
      setDone(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
      setUploadingProof(false);
    }
  };

  if (done) {
    const doneItems = (() => {
      try { return typeof done.items === 'string' ? JSON.parse(done.items) : done.items || []; }
      catch { return []; }
    })();
    return (
      <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onSubmitOrder(); }}>
        <div className="modal-sheet" style={{padding: '32px 20px 24px', textAlign: 'center'}}>
          <div className="checkout-done-icon">✅</div>
          <h2 style={{fontSize:22,fontWeight:800,margin:'12px 0 4px'}}>Order Placed!</h2>
          <p style={{fontSize:14,color:'#888',marginBottom:8}}>Order #{done.order_number}</p>
          {customerId && pointsSettings?.enabled && (
            <p style={{fontSize:13,color:'#059669',fontWeight:600,marginBottom:16}}>
              ⭐ +{Math.max(1, Math.floor(netTotal / (Number(pointsSettings.earn_per) || 1000) * (Number(pointsSettings.earn_rate) || 1)))} points earned!
            </p>
          )}


          <div onClick={() => setShowDoneDetail(!showDoneDetail)} style={{cursor:'pointer',background:'#f9fafb',borderRadius:16,padding:'12px 16px',marginBottom:16,textAlign:'left'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
              <span style={{fontSize:14,fontWeight:700,color:'#374151'}}>Order Summary</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{color:'#9ca3af',transform:showDoneDetail?'rotate(180deg)':'none',transition:'transform 0.2s'}}><path d="M6 9l6 6 6-6"/></svg>
            </div>
            {doneItems.slice(0, showDoneDetail ? doneItems.length : 2).map((item, i) => (
              <div key={i} style={{display:'flex',justifyContent:'space-between',fontSize:13,color:'#6b7280',padding:'3px 0'}}>
                <span>{item.name || 'Item'} <span style={{color:'#9ca3af'}}>x{item.quantity || 1}</span></span>
                <span>{formatPrice((item.price || 0) * (item.quantity || 1), shop?.currency || 'MMK')}</span>
              </div>
            ))}
            {!showDoneDetail && doneItems.length > 2 && (
              <p style={{fontSize:12,color:'#9ca3af',textAlign:'center',marginTop:4}}>+{doneItems.length - 2} more items</p>
            )}
            <div style={{borderTop:'1px solid #e5e7eb',marginTop:8,paddingTop:8,display:'flex',justifyContent:'space-between',fontSize:15,fontWeight:800,color:'#111827'}}>
              <span>Total</span>
              <span>{formatPrice(done.final_amount || done.total_amount || orderTotal, shop?.currency || 'MMK')}</span>
            </div>
          </div>

          <p style={{fontSize:13,color:'#aaa',marginBottom:20}}>Share order number with restaurant staff</p>
          <button className="modal-add-btn" onClick={() => { onSubmitOrder(); }}>
            Back to Menu
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget && !submitting) onBack(); }}>
      <div className="modal-sheet checkout-sheet">
        <button className="modal-close" onClick={onBack}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg></button>

        {step === 'form' && (
          <>
            <div className="checkout-header">
              <div className="checkout-step-badge active">1</div>
              <span className="checkout-step-label">Payment Method</span>
            </div>
            <div className="checkout-body">
              <label className="checkout-pm-label">Choose Payment Method</label>
              <div className="checkout-pm-grid">
                {hasInstantMmpay && (
                  <button onClick={() => setSelectedPayment({ id: 'mmpay', name: 'MMQR Myan Myan Pay' })}
                    className={`checkout-pm-btn ${selectedPayment?.id === 'mmpay' ? 'active' : ''}`}>
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-white p-1 flex items-center justify-center border border-gray-200 shadow-xs">
                        <img src="/share-icons/mmqr.png" alt="MMQR" className="w-full h-full object-contain" />
                      </div>
                      <span className="font-bold text-sm text-gray-900">MMQR Myan Myan Pay</span>
                    </div>
                  </button>
                )}
                {!hasInstantMmpay && paymentMethods.map(pm => (
                  <button key={pm.id} onClick={() => setSelectedPayment(pm)}
                    className={`checkout-pm-btn ${selectedPayment?.id === pm.id ? 'active' : ''}`}>
                    <div className="checkout-pm-name">{pm.name}</div>
                    {pm.account_name && <div className="checkout-pm-acct">{pm.account_name}</div>}
                  </button>
                ))}
                {!hasInstantMmpay && paymentMethods.length === 0 && <p className="text-sm text-gray-400 col-span-2 text-center py-4">No payment methods available</p>}
              </div>
              {error && <div className="checkout-error">{error}</div>}
              <button className="checkout-next-btn" disabled={!selectedPayment} onClick={() => setStep('review')}>
                Next
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </button>
            </div>
          </>
        )}

        {step === 'review' && (
          <>
            <div className="checkout-header">
              <div className="checkout-step-badge active">2</div>
              <span className="checkout-step-label">Payment Confirmation</span>
            </div>
            <div className="checkout-body">
              <div className="checkout-review-info">
                <div className="checkout-info-row"><span>Payment</span><span>{selectedPayment?.name}</span></div>
              </div>
              {selectedPayment?.id === 'mmpay' ? (
                <div className="bg-gradient-to-br from-purple-900 via-indigo-900 to-purple-950 p-4 rounded-2xl text-white space-y-2 mb-4 text-left border border-purple-800/50">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-white p-1 flex items-center justify-center">
                      <img src="/share-icons/mmqr.png" alt="MMQR" className="w-full h-full object-contain" />
                    </div>
                    <span className="font-bold text-sm text-white">MMQR Myan Myan Pay</span>
                  </div>
                  <p className="text-xs text-purple-200 leading-relaxed">
                    ⚡ Dynamic MMQR code will be generated for <strong>{formatPrice(netTotal, shop?.currency || 'MMK')}</strong>. Scan & pay via KBZPay or WavePay for instant automated verification.
                  </p>
                </div>
              ) : (
                <div className="checkout-payment-detail">
                  <p className="checkout-pd-title">Transfer to:</p>
                  <div className="checkout-pd-row"><span>Account</span><span className="font-bold">{selectedPayment?.account_name || 'N/A'}</span></div>
                  <div className="checkout-pd-row">
                    <span>Number</span>
                    <span className="font-bold" style={{display:'flex',alignItems:'center',gap:6}}>
                      {selectedPayment?.payment_number || 'N/A'}
                      {selectedPayment?.payment_number && (
                        <button onClick={() => copyNumber(selectedPayment.payment_number)}
                          style={{border:'none',background:'#f3f4f6',padding:'4px 8px',borderRadius:8,cursor:'pointer',fontSize:12,color:'#6b7280',display:'flex',alignItems:'center',gap:3}}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                          {copied ? 'Copied!' : 'Copy'}
                        </button>
                      )}
                    </span>
                  </div>
                  {selectedPayment?.description && <p className="checkout-pd-desc">{selectedPayment.description}</p>}
                  {selectedPayment?.notes && <p className="checkout-pd-desc" style={{color:'#e67e22'}}>📌 {selectedPayment.notes}</p>}
                  {getPaymentQrUrl(selectedPayment) && (() => {
                    const qrUrl = getPaymentQrUrl(selectedPayment);
                    const dlUrl = qrUrl + (qrUrl.includes('?') ? '&' : '?') + 'download=payment.jpg';
                  return (
                    <div className="flex flex-col items-center gap-2.5 my-3">
                      <div
                        onClick={() => setQrModalOpen(true)}
                        className="relative flex justify-center bg-white rounded-2xl p-3 shadow-sm border border-gray-200 cursor-zoom-in group transition-all duration-200 hover:scale-[1.02] hover:shadow-md"
                      >
                        <img src={qrUrl} alt="Payment QR" className="w-48 h-48 sm:w-56 sm:h-56 object-contain rounded-xl" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl flex items-center justify-center gap-1.5 text-white font-semibold text-xs backdrop-blur-[2px]">
                          <span>Tap to Enlarge</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setQrModalOpen(true)}
                          style={{fontSize:11,color:'#6366f1',fontWeight:600,background:'#e0e7ff',padding:'3px 12px',borderRadius:20,border:'none',cursor:'pointer'}}
                        >
                          Full Screen & Zoom
                        </button>
                        <a href={dlUrl} style={{fontSize:11,color:'#6b7280',textDecoration:'underline',cursor:'pointer'}}>
                          Download QR
                        </a>
                      </div>
                      <ZoomableQrModal
                        isOpen={qrModalOpen}
                        onClose={() => setQrModalOpen(false)}
                        imgUrl={qrUrl}
                        title={`Pay via ${selectedPayment?.name || 'QR'}`}
                        accountName={selectedPayment?.account_name}
                        accountNumber={selectedPayment?.payment_number}
                      />
                    </div>
                    );
                  })()}
                </div>
              )}
              {couponCountdown > 0 && (
                <div style={{background:'#fef2f2',borderRadius:10,padding:'10px 12px',margin:'12px 0',fontSize:13,color:'#dc2626',fontWeight:500,textAlign:'center'}}>
                  Too many attempts. Try again in {couponCountdown}s...
                </div>
              )}
              {/* Coupon */}
              {!appliedCoupon?.code && !appliedCoupon?.error && (
                <details style={{margin:'12px 0'}}>
                  <summary style={{fontSize:13,color:'#6b7280',cursor:'pointer',fontWeight:600}}>🎟️ Have a coupon?</summary>
                  <div style={{display:'flex',gap:8,marginTop:8}}>
                    <input
                      type="text"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                      onKeyDown={(e) => e.key === 'Enter' && handleApplyCoupon()}
                      placeholder="Enter code"
                      style={{flex:1,padding:'10px 12px',border:'2px solid #e5e7eb',borderRadius:10,fontSize:13,outline:'none'}}
                    />
                    <button
                      onClick={handleApplyCoupon}
                      disabled={checkingCoupon || !couponInput.trim() || couponCountdown > 0}
                      style={{
                        padding:'10px 16px',border:'none',borderRadius:10,
                        background:'var(--theme-primary, #4f46e5)',color:'#fff',
                        fontSize:13,fontWeight:700,cursor:'pointer',
                        opacity: checkingCoupon || !couponInput.trim() || couponCountdown > 0 ? 0.5 : 1,
                      }}
                    >
                      {checkingCoupon ? '...' : couponCountdown > 0 ? `${couponCountdown}s` : 'Apply'}
                    </button>
                  </div>
                </details>
              )}
              {appliedCoupon?.code && (
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',background:'#ecfdf5',borderRadius:10,padding:'10px 12px',margin:'12px 0'}}>
                  <span style={{fontSize:13,fontWeight:600,color:'#059669'}}>🎟️ {appliedCoupon.code}</span>
                  <span style={{fontSize:13,fontWeight:700,color:'#059669'}}>-{formatPrice(couponDiscount, shop?.currency || 'MMK')}</span>
                </div>
              )}
              {appliedCoupon?.error && (
                <div style={{background:'#fef2f2',borderRadius:10,padding:'10px 12px',margin:'12px 0',fontSize:13,color:'#dc2626',fontWeight:500}}>
                  {appliedCoupon.error}
                </div>
              )}

              {/* Points */}
              {customerId && pointsSettings?.enabled && customerPoints > 0 && !pointsDiscount > 0 && (
                <div style={{background:'#fffbeb',borderRadius:10,padding:'12px',margin:'12px 0'}}>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
                    <span style={{fontSize:13,fontWeight:600,color:'#92400e'}}>⭐ Points Balance: {customerPoints} pts</span>
                  </div>
                  <div style={{display:'flex',gap:8}}>
                    <input
                      type="number"
                      value={pointsToRedeem || ''}
                      onChange={(e) => setPointsToRedeem(Math.min(Number(e.target.value) || 0, customerPoints))}
                      placeholder="Points to use"
                      style={{flex:1,padding:'10px 12px',border:'2px solid #e5e7eb',borderRadius:10,fontSize:13,outline:'none'}}
                    />
                    <button
                      onClick={handleRedeemPoints}
                      disabled={redeemingPoints || !pointsToRedeem || pointsToRedeem < (Number(pointsSettings.min_redeem) || 50)}
                      style={{
                        padding:'10px 16px',border:'none',borderRadius:10,
                        background:'#f59e0b',color:'#fff',
                        fontSize:13,fontWeight:700,cursor:'pointer',whiteSpace:'nowrap',
                        opacity: redeemingPoints || !pointsToRedeem || pointsToRedeem < (Number(pointsSettings.min_redeem) || 50) ? 0.5 : 1,
                      }}
                    >
                      {redeemingPoints ? '...' : 'Use Points'}
                    </button>
                  </div>
                  {pointsToRedeem > 0 && pointsToRedeem < (Number(pointsSettings.min_redeem) || 50) && (
                    <p style={{fontSize:11,color:'#dc2626',marginTop:4}}>Minimum {Number(pointsSettings.min_redeem) || 50} points to redeem</p>
                  )}
                </div>
              )}

              {/* Discounted total */}
              <div style={{borderTop:'1px solid #e5e7eb',paddingTop:12,marginTop:12}}>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:14,color:'#6b7280',marginBottom:4}}>
                  <span>Subtotal</span>
                  <span>{formatPrice(orderTotal, shop?.currency || 'MMK')}</span>
                </div>
                {couponDiscount > 0 && (
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:13,color:'#059669',marginBottom:4}}>
                    <span>Coupon Discount</span>
                    <span>-{formatPrice(couponDiscount, shop?.currency || 'MMK')}</span>
                  </div>
                )}
                {pointsDiscount > 0 && (
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:13,color:'#f59e0b',marginBottom:4}}>
                    <span>Points Discount</span>
                    <span>-{formatPrice(pointsDiscount, shop?.currency || 'MMK')}</span>
                  </div>
                )}
                <div className="checkout-total-row" style={{marginTop:4}}>
                  <span>Total Amount</span>
                  <span className="font-bold">{formatPrice(netTotal, shop?.currency || 'MMK')}</span>
                </div>
              </div>

                {selectedPayment?.id !== 'mmpay' && (
                <>
                  <p style={{fontSize:13,color:'#6b7280',margin:'8px 0 12px',lineHeight:1.5}}>
                    Please transfer {formatPrice(netTotal, shop?.currency || 'MMK')} to {selectedPayment?.name || ''} {selectedPayment?.payment_number || ''} and upload screenshot
                  </p>
                  <div className="checkout-field">
                    <label>Payment Proof (screenshot) <span className="text-rose-500">*</span></label>
                    <button className="checkout-upload-btn" onClick={() => document.getElementById('proof-input')?.click()}>
                      {proofPreview ? 'Change Screenshot' : 'Upload Screenshot'}
                    </button>
                    <input id="proof-input" type="file" accept="image/*" className="hidden" onChange={handleProofFile} />
                    {proofPreview && (
                      <div style={{marginTop:8,borderRadius:8,overflow:'hidden',maxWidth:180,border:'1px solid #e5e7eb'}}>
                        <img src={proofPreview} alt="Proof" style={{width:'100%',height:120,objectFit:'cover'}} />
                      </div>
                    )}
                  </div>
                </>
              )}

              {error && <div className="checkout-error">{error}</div>}
              <div className="checkout-action-row">
                <button className="checkout-back-btn" onClick={() => setStep('form')} disabled={submitting}>Back</button>
                <button className="checkout-order-btn" onClick={handleSubmit} disabled={submitting || (selectedPayment?.id !== 'mmpay' && !proofFile)}>
                  {submitting ? 'Placing Order...' : 'Done, Order now'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function PublicQRMenu({ slug, table: tableProp, forceDashboard }) {
  const [activeCat, setActiveCat] = useState('all');
  const [searchQ, setSearchQ] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [showCart, setShowCart] = useState(false);
  const [viewMode, setViewMode] = useState('list');
  const [showCheckout, setShowCheckout] = useState(false);
  const [orderItems, setOrderItems] = useState([]);
  const [bannerSlide, setBannerSlide] = useState(0);
  const [wasEverOpen, setWasEverOpen] = useState(false);
  const [userDismissedWelcome, setUserDismissedWelcome] = useState(false);
  const [tokenMode, setTokenMode] = useState(false);
  const [tokenNumber, setTokenNumber] = useState(null);
  const [showTokenCard, setShowTokenCard] = useState(false);
  const [assigningToken, setAssigningToken] = useState(false);
  const [showQRDashboard, setShowQRDashboard] = useState(false);
  const [showQRSignIn, setShowQRSignIn] = useState(false);
  const [customerId, setCustomerId] = useState(null);
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerPoints, setCustomerPoints] = useState(0);
  const [showPhonePrompt, setShowPhonePrompt] = useState(false);
  const [phoneInput, setPhoneInput] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [identifyingPhone, setIdentifyingPhone] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponInput, setCouponInput] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [checkingCoupon, setCheckingCoupon] = useState(false);
  const [pointsToRedeem, setPointsToRedeem] = useState(0);
  const [pointsDiscount, setPointsDiscount] = useState(0);
  const [redeemingPoints, setRedeemingPoints] = useState(false);
  const [couponAttempts, setCouponAttempts] = useState(() => Number(sessionStorage.getItem('coupon_attempts') || 0));
  const [couponLockUntil, setCouponLockUntil] = useState(() => Number(sessionStorage.getItem('coupon_lock_until') || 0));

  const isValidMyanmarPhone = (phone) => {
    const cleaned = phone.trim();
    if (cleaned.length > 15) return false;
    return /^(\+959|09|9)\d{7,12}$/.test(cleaned);
  };
  const bannerTouchRef = useRef(null);
  const searchRef = useRef(null);
  const catScrollRef = useRef(null);
  const catDrag = useRef({ isDown: false, startX: 0, scrollLeft: 0 });

  const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const qParamStr = urlParams.get('q') || '';
  const qParams = qParamStr ? new URLSearchParams(qParamStr) : new URLSearchParams();
  const isTokenUrlMode = urlParams.get('mode') === 'token' || qParams.get('mode') === 'token';

  const handleCatMouseDown = (e) => {
    catDrag.current.isDown = true;
    catDrag.current.startX = e.pageX - catScrollRef.current.offsetLeft;
    catDrag.current.scrollLeft = catScrollRef.current.scrollLeft;
    catScrollRef.current.style.cursor = 'grabbing';
  };

  const handleCatMouseMove = (e) => {
    if (!catDrag.current.isDown) return;
    e.preventDefault();
    const x = e.pageX - catScrollRef.current.offsetLeft;
    const walk = (x - catDrag.current.startX) * 1.5;
    catScrollRef.current.scrollLeft = catDrag.current.scrollLeft - walk;
  };

  const handleCatMouseUp = () => {
    catDrag.current.isDown = false;
    if (catScrollRef.current) catScrollRef.current.style.cursor = 'grab';
  };

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['public-qr-menu', slug],
    queryFn: () => fetch(API_BASE + '/public/qr-menu/' + slug).then(res => { if (!res.ok) throw new Error('Not found'); return res.json(); }),
    enabled: !!slug, retry: 2, staleTime: 30000, refetchInterval: 60000,
  });

  const shop = data?.shop;
  const items = data?.items || [];
  const categories = data?.categories || [];
  const paymentMethods = data?.payment_methods || [];
  const paymentMode = data?.payment_mode || 'postpaid';
  const themeName = data?.theme || DEFAULT_THEME;
  const theme = THEMES[themeName] || THEMES[DEFAULT_THEME];
  const isOpen = data?.is_open !== false;
  const closedWhileBrowsing = wasEverOpen && !isOpen;

  useEffect(() => {
    document.title = shop?.bot_full_name || 'Menu';
    const icon = document.querySelector('link[rel="icon"]');
    if (icon && shop?.profile_picture) icon.setAttribute('href', shop.profile_picture);
    return () => { document.title = 'E-commerce Myanmar'; };
  }, [shop]);

  useEffect(() => {
    if (data && isOpen) setWasEverOpen(true);
  }, [data, isOpen]);

  const businessMode = data?.business_mode || 'restaurant';
  const qrLabels = data?.qr_labels || {};
  const dualModeEnabled = data?.dual_mode_enabled || false;
  const orderFlowMode = data?.order_flow_mode || 'postpaid';
  const qrLanding = data?.qr_landing || {};
  const isBrowseOnly = orderFlowMode === 'browse_only';
  const showWelcome = !forceDashboard && !showQRDashboard && dualModeEnabled && !tableProp && isTokenUrlMode && !!data && !isLoading && !error && !userDismissedWelcome;

  const qrTheme = data?.qr_theme;
  const qrThemeColors = data?.qr_theme_colors || {};
  const pointsSettings = data?.points_settings || {};

  // Build CSS from business theme if set
  const activeBusinessTheme = BUSINESS_THEMES[qrTheme] || null;
  let businessCss = {};
  if (activeBusinessTheme) {
    const c = { ...activeBusinessTheme, ...qrThemeColors };
    businessCss = {
      '--theme-primary': c.primary,
      '--theme-primary-light': c.primary + '22',
      '--theme-primary-shadow': c.primary + '33',
      '--theme-primary-shadow-lg': c.primary + '44',
      '--theme-header': `linear-gradient(135deg, ${c.primary}, ${c.secondary})`,
      '--theme-btn': `linear-gradient(to right, ${c.primary}, ${c.secondary})`,
      '--theme-btn-hover': `linear-gradient(to right, ${c.primary}dd, ${c.secondary}dd)`,
      '--theme-btn-text': '#ffffff',
      '--theme-price': c.primary,
      '--theme-filter-active': c.primary,
      '--theme-card-bg': c.card || '#ffffff',
      '--theme-card-border': '#f3f4f6',
      '--theme-bg': c.background || '#f9fafb',
      '--theme-header-text': '#ffffff',
      '--theme-header-muted': 'rgba(255,255,255,0.8)',
      '--theme-accent-amber': c.accent,
      '--theme-accent-rose': '#f43f5e',
      '--theme-accent-emerald': '#10b981',
    };
  }
  const finalThemeCss = { ...(theme?.css || {}), ...businessCss };

  // Auto-identify returning customer from localStorage
  useEffect(() => {
    if (data && shop?.id) {
      const stored = localStorage.getItem(`qr_customer_${shop.id}`);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setCustomerId(parsed.id);
          setCustomerPoints(parsed.points || 0);
        } catch {}
      }
    }
  }, [data, shop?.id]);

  const labels = {
    section_name: qrLabels?.section_name || 'QR Menu',
    table_name: qrLabels?.table_name || 'Table',
    menu_section_title: qrLabels?.menu_section_title || 'Menu Items',
    categories_label: qrLabels?.categories_label || 'Categories',
    add_to_order: qrLabels?.add_to_order || 'Add to Order',
    cart_title: qrLabels?.cart_title || 'Your Order',
    checkout_hint: qrLabels?.checkout_hint || 'Share with staff',
    closed_message: qrLabels?.closed_message || "We're Closed",
    welcome_message: qrLanding?.welcome_message || qrLabels?.welcome_message || 'Welcome!',
  };

  async function doAssignToken() {
    if (!slug) return;
    // Return existing token if already assigned this session
    const existingToken = sessionStorage.getItem('qr_token');
    if (existingToken) {
      setTokenNumber(Number(existingToken));
      setTokenMode(true);
      setShowTokenCard(true);
      return;
    }
    // 5-second cooldown between requests
    const lastRequest = sessionStorage.getItem('last_token_request');
    if (lastRequest && Date.now() - Number(lastRequest) < 5000) {
      return;
    }
    setAssigningToken(true);
    setTokenMode(true);
    try {
      const res = await fetch(`${API_BASE}/public/qr-menu/${slug}/assign-token`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Failed to assign token');
      const data = await res.json();
      sessionStorage.setItem('qr_token', data.token_number);
      sessionStorage.setItem('last_token_request', String(Date.now()));
      setTokenNumber(data.token_number);
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error('Token error:', err);
      }
    } finally {
      setAssigningToken(false);
    }
  }

  useEffect(() => {
    if (data && !isLoading && !error) {
      if (forceDashboard) {
        setShowQRDashboard(true);
        setUserDismissedWelcome(true);
      } else if (isTokenUrlMode) {
        const dashUrl = '/' + slug + '-token-dashboard';
        if (window.location.pathname !== dashUrl) {
          window.history.replaceState(null, '', dashUrl);
        }
        setShowQRDashboard(true);
        setUserDismissedWelcome(true);
      }
    }
  }, [data, isLoading, error, isTokenUrlMode, slug, forceDashboard]);

  const dismissTokenCard = () => {
    setShowTokenCard(false);
  };

  const handleQRSignInSuccess = () => {
    setShowQRSignIn(false);
    setUserDismissedWelcome(true);
    const dashUrl = '/' + slug + '-token-dashboard';
    if (window.location.pathname !== dashUrl) {
      window.history.replaceState(null, '', dashUrl);
    }
    setShowQRDashboard(true);
  };

  const handleQRDashboardSignOut = () => {
    clearQRLogin();
    setShowQRDashboard(false);
  };

  const handleIdentifyPhone = async () => {
    setPhoneError('');
    const trimmed = phoneInput.trim();
    if (!trimmed || !shop?.id) return;
    if (!isValidMyanmarPhone(trimmed)) {
      setPhoneError('Enter a valid Myanmar phone number (e.g. 09123456789)');
      return;
    }
    setIdentifyingPhone(true);
    try {
      const result = await identifyCustomer(trimmed, shop.id, '');
      setCustomerId(result.customer_id);
      setCustomerPhone(result.phone);
      setCustomerPoints(result.points || 0);
      localStorage.setItem(`qr_customer_${shop.id}`, JSON.stringify({ id: result.customer_id, points: result.points || 0 }));
      setShowPhonePrompt(false);
    } catch {
      // silently fail — customer can still browse
    } finally {
      setIdentifyingPhone(false);
    }
  };

  const handleSkipPhone = () => {
    setShowPhonePrompt(false);
  };

  const handleApplyCoupon = async () => {
    // Check lockout — 5 failed attempts = 60s ban
    if (Date.now() < couponLockUntil) return;
    if (!couponInput.trim() || !shop?.id) return;
    setCheckingCoupon(true);
    try {
      const result = await validateCoupon(couponInput.trim(), orderTotal, shop.id);
      if (result.valid) {
        setAppliedCoupon({ code: result.coupon_code, type: result.coupon_type, discount: result.discount });
        setCouponDiscount(result.discount);
        setCouponInput('');
        setCouponAttempts(0);
        setCouponLockUntil(0);
        sessionStorage.setItem('coupon_attempts', '0');
        sessionStorage.removeItem('coupon_lock_until');
      } else {
        setAppliedCoupon({ error: result.message });
        setCouponDiscount(0);
        const newAttempts = couponAttempts + 1;
        setCouponAttempts(newAttempts);
        sessionStorage.setItem('coupon_attempts', String(newAttempts));
        if (newAttempts >= 5) {
          const lockTime = Date.now() + 60000;
          setCouponLockUntil(lockTime);
          sessionStorage.setItem('coupon_lock_until', String(lockTime));
        }
      }
    } catch {
      setAppliedCoupon({ error: 'Failed to validate coupon' });
    } finally {
      setCheckingCoupon(false);
    }
  };

  const handleRedeemPoints = async () => {
    if (!customerId || !shop?.id) return;
    setRedeemingPoints(true);
    try {
      const result = await redeemPoints(customerId, pointsToRedeem, orderTotal, shop.id);
      setPointsDiscount(result.discount);
      setPointsToRedeem(result.points_used);
    } catch {
      setPointsDiscount(0);
    } finally {
      setRedeemingPoints(false);
    }
  };

  const banners = data?.banners || [];
  useEffect(() => {
    if (banners.length <= 1) return;
    const id = setInterval(() => setBannerSlide(prev => (prev + 1) % banners.length), 5000);
    return () => clearInterval(id);
  }, [banners.length]);

  const goBanner = (dir) => {
    setBannerSlide(prev => {
      if (dir === 'next') return (prev + 1) % banners.length;
      return prev === 0 ? banners.length - 1 : prev - 1;
    });
  };

  const categoryList = useMemo(() => {
    const cat = categories.map((c, i) => ({ ...c, emoji: c.icon || CAT_EMOJIS[(i + 1) % CAT_EMOJIS.length] }));
    return [{ id: 'all', name: 'All', emoji: '🍽️' }, ...cat];
  }, [categories]);

  const filtered = useMemo(() => {
    return items.filter(item => {
      const catOk = activeCat === 'all' || item.category_id === activeCat;
      if (!catOk) return false;
      if (searchQ) {
        const q = searchQ.toLowerCase();
        return item.name?.toLowerCase().includes(q) || item.description?.toLowerCase().includes(q);
      }
      return true;
    });
  }, [items, activeCat, searchQ]);

  const popular = useMemo(() => items.filter(i => (i.badges || []).includes('popular')), [items]);

  const orderCount = useMemo(() => orderItems.reduce((s, oi) => s + oi.qty, 0), [orderItems]);
  const orderTotal = useMemo(() => orderItems.reduce((s, oi) => {
    return s + oi.qty * calcItemPrice(oi.item, oi.variants, oi.addons);
  }, 0), [orderItems]);

  // ⚠️ WARNING: netTotal is for DISPLAY ONLY
  // Backend must re-validate coupon + points and return verified_total
  // Never trust this value for actual charge amount
  const netTotal = Math.max(0, orderTotal - couponDiscount - pointsDiscount);

  const addToOrder = useCallback((item, qty, selectedVariants = {}, selectedAddons = []) => {
    if (closedWhileBrowsing) return;
    const cartKey = getCartKey(item, selectedVariants, selectedAddons);
    setOrderItems(prev => {
      const ex = prev.find(oi => oi.cartKey === cartKey);
      if (ex) return prev.map(oi => oi.cartKey === cartKey ? { ...oi, qty: oi.qty + qty } : oi);
      return [...prev, { cartKey, item, qty, variants: selectedVariants, addons: selectedAddons }];
    });
    setSelectedItem(null);
  }, [closedWhileBrowsing]);

  const updateQty = useCallback((id, qty) => {
    const key = String(id);
    if (qty <= 0) { setOrderItems(prev => prev.filter(oi => String(oi.cartKey || oi.item.id) !== key)); return; }
    setOrderItems(prev => prev.map(oi => String(oi.cartKey || oi.item.id) === key ? { ...oi, qty } : oi));
  }, []);

  const removeItem = useCallback((id) => setOrderItems(prev => prev.filter(oi => (oi.cartKey || oi.item.id) !== id)), []);
  const clearAll = useCallback(() => setOrderItems([]), []);

  const catById = useMemo(() => {
    const m = {}; categories.forEach(c => m[c.id] = c); return m;
  }, [categories]);

  if (isLoading) return <LoadingSkeleton />;

  if (error || !shop) {
    return (
      <div className="qr-page">
        <div className="qr-empty" style={{background:'#f7f5f0'}}>
          <div className="qr-empty-inner">
            <div style={{fontSize:48,marginBottom:12}}>🔍</div>
            <h2>Menu Not Found</h2>
            <p>This menu doesn't exist or is unavailable.</p>
            <button className="qr-retry-btn" onClick={() => refetch()}>Try Again</button>
          </div>
        </div>
      </div>
    );
  }

  const tokenModeDisabled = (isTokenUrlMode || forceDashboard) && !dualModeEnabled && !!data;

  if (!isOpen && !wasEverOpen || tokenModeDisabled) {
    return (
      <div className="qr-page-closed">
        <div className="qr-closed-bg-pattern" />
        <div className="qr-closed-card">
          <div className="qr-closed-icon-wrap">
            <div className="qr-closed-icon-ring">
              <svg className="qr-closed-icon-svg" viewBox="0 0 100 100" fill="none">
                <circle cx="50" cy="50" r="45" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.3" />
              </svg>
              <span className="qr-closed-icon-emoji">🕐</span>
            </div>
          </div>

          <div className="qr-closed-brand">
            {shop?.profile_picture ? (
              <img src={shop.profile_picture} alt="" className="qr-closed-avatar" />
            ) : (
              <div className="qr-closed-avatar qr-closed-avatar-fallback">🍽️</div>
            )}
            <p className="qr-closed-name">{shop.bot_full_name}</p>
          </div>

          <div className="qr-closed-divider" />

          <h2 className="qr-closed-heading">{labels.closed_message || "We're Currently Closed"}</h2>
          <p className="qr-closed-desc">We're currently closed. Please check back later during operating hours.</p>

          <div className="qr-closed-info">
            <div className="qr-closed-info-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
              <span>Opens again soon</span>
            </div>
            {shop?.location && (
              <div className="qr-closed-info-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                <span>{shop.location}</span>
              </div>
            )}
          </div>

          <div className="qr-closed-ripple">
            <div className="qr-closed-ripple-dot" />
            <div className="qr-closed-ripple-dot" />
            <div className="qr-closed-ripple-dot" />
          </div>
        </div>
        <style>{`
          *, *::before, *::after { box-sizing: border-box; }
          body { margin: 0; }
          .qr-page-closed { min-height: 100vh; background: linear-gradient(160deg, #1a1a2e 0%, #16213e 40%, #0f3460 100%); display: flex; align-items: center; justify-content: center; padding: 24px; position: relative; overflow: hidden; font-family: system-ui,-apple-system,sans-serif; }
          .qr-closed-bg-pattern { position: absolute; inset: 0; background-image: radial-gradient(circle at 25% 25%, rgba(255,255,255,0.03) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(255,255,255,0.03) 0%, transparent 50%); }
          .qr-closed-card { position: relative; background: rgba(255,255,255,0.06); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.1); border-radius: 32px; padding: 48px 36px 40px; max-width: 400px; width: 100%; text-align: center; box-shadow: 0 25px 60px rgba(0,0,0,0.3); }
          .qr-closed-icon-wrap { margin-bottom: 20px; }
          .qr-closed-icon-ring { position: relative; width: 80px; height: 80px; margin: 0 auto; display: flex; align-items: center; justify-content: center; }
          .qr-closed-icon-svg { position: absolute; inset: 0; width: 100%; height: 100%; color: rgba(255,255,255,0.25); animation: qrSpin 12s linear infinite; }
          .qr-closed-icon-emoji { font-size: 42px; line-height: 1; animation: qrPulse 2.5s ease-in-out infinite; }
          @keyframes qrSpin { to { transform: rotate(360deg); } }
          @keyframes qrPulse { 0%, 100% { transform: scale(1); opacity: 0.8; } 50% { transform: scale(1.1); opacity: 1; } }
          .qr-closed-brand { display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 16px; }
          .qr-closed-avatar { width: 36px; height: 36px; border-radius: 10px; object-fit: cover; }
          .qr-closed-avatar-fallback { background: rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center; font-size: 16px; }
          .qr-closed-name { color: rgba(255,255,255,0.5); font-size: 12px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; margin: 0; }
          .qr-closed-divider { width: 40px; height: 2px; background: rgba(255,255,255,0.15); border-radius: 1px; margin: 0 auto 20px; }
          .qr-closed-heading { font-size: 22px; font-weight: 800; color: #fff; margin: 0 0 10px; letter-spacing: -0.3px; }
          .qr-closed-desc { font-size: 14px; color: rgba(255,255,255,0.5); line-height: 1.6; margin: 0 0 24px; }
          .qr-closed-info { display: flex; flex-direction: column; gap: 8px; margin-bottom: 28px; }
          .qr-closed-info-item { display: flex; align-items: center; justify-content: center; gap: 6px; font-size: 12px; color: rgba(255,255,255,0.4); }
          .qr-closed-info-item svg { opacity: 0.5; flex-shrink: 0; }
          .qr-closed-ripple { display: flex; gap: 8px; justify-content: center; }
          .qr-closed-ripple-dot { width: 6px; height: 6px; border-radius: 50%; background: rgba(255,255,255,0.3); animation: qrRippleDot 1.8s ease-in-out infinite; }
          .qr-closed-ripple-dot:nth-child(2) { animation-delay: 0.3s; }
          .qr-closed-ripple-dot:nth-child(3) { animation-delay: 0.6s; }
          @keyframes qrRippleDot { 0%, 60%, 100% { transform: scale(1); opacity: 0.3; } 30% { transform: scale(1.6); opacity: 0.8; } }
        `}</style>
      </div>
    );
  }

  // Welcome Screen (Dual Mode)
  if (showWelcome) {
    return (
      <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="min-h-screen flex items-center justify-center p-6"
        style={{
          ...finalThemeCss,
          background: `linear-gradient(160deg, var(--theme-primary, #4f46e5) 0%, #1e1b4b 100%)`,
          fontFamily: 'system-ui,-apple-system,sans-serif',
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: 'easeOut' }}
          className="w-full max-w-sm text-center"
        >
          {/* Shop Logo */}
          <div className="flex justify-center mb-5">
            {shop?.profile_picture ? (
              <img
                src={shop.profile_picture}
                alt=""
                className="w-24 h-24 rounded-full object-cover shadow-2xl ring-4"
                style={{ borderColor: 'rgba(255,255,255,0.25)' }}
              />
            ) : (
              <div
                className="w-24 h-24 rounded-full flex items-center justify-center text-3xl shadow-2xl ring-4"
                style={{
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.2), rgba(255,255,255,0.05))',
                  borderColor: 'rgba(255,255,255,0.25)',
                }}
              >
                🏪
              </div>
            )}
          </div>

          {/* Shop Name */}
          <h1 className="text-2xl font-bold text-white mt-1 mb-2">
            {shop?.bot_full_name}
          </h1>

          {/* Welcome Message */}
          <p className="text-sm text-white/60 mb-10">
            {labels.welcome_message}
          </p>

          {/* Divider */}
          <div className="flex items-center gap-4 mb-5">
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.12)' }} />
            <span className="text-[11px] font-bold tracking-[2px] text-white/40 uppercase whitespace-nowrap">
              How would you like to order?
            </span>
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.12)' }} />
          </div>

          {/* Mode Cards */}
          <div className="flex gap-3">
            {/* Table */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                window.location.href = '/' + slug + '-qr-menu';
              }}
              className="flex-1 min-h-[160px] rounded-2xl border p-5 flex flex-col items-center justify-center transition-all duration-200 shadow-sm hover:shadow-md"
              style={{
                background: 'rgba(255,255,255,0.08)',
                borderColor: 'rgba(255,255,255,0.15)',
                backdropFilter: 'blur(8px)',
              }}
            >
              <span className="text-4xl leading-none">🪑</span>
              <span className="text-[15px] font-bold text-white mt-3">Take a {labels.table_name}</span>
              <span className="text-[11px] text-white/40 mt-1">Dine in & order</span>
            </motion.button>

            {/* Token */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                if (isQRAuthenticated()) {
                  setUserDismissedWelcome(true);
                  const dashUrl = '/' + slug + '-token-dashboard';
                  if (window.location.pathname !== dashUrl) {
                    window.history.replaceState(null, '', dashUrl);
                  }
                  setShowQRDashboard(true);
                } else {
                  setShowQRSignIn(true);
                }
              }}
              className="flex-1 min-h-[160px] rounded-2xl border p-5 flex flex-col items-center justify-center transition-all duration-200 shadow-sm hover:shadow-md"
              style={{
                background: 'rgba(255,255,255,0.08)',
                borderColor: 'rgba(255,255,255,0.15)',
                backdropFilter: 'blur(8px)',
              }}
            >
              <span className="text-4xl leading-none">🎫</span>
              <span className="text-[15px] font-bold text-white mt-3">Get a Token</span>
              <span className="text-[11px] text-white/40 mt-1">Walk-in queue</span>
            </motion.button>
          </div>

          {assigningToken && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center mt-5 text-sm text-white/60"
            >
              Getting your token...
            </motion.p>
          )}

          {tokenNumber && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="fixed inset-0 flex items-center justify-center p-6"
              style={{ background: 'rgba(0,0,0,0.55)', zIndex: 50 }}
              onClick={() => setUserDismissedWelcome(true)}
            >
              <motion.div
                initial={{ y: 100, opacity: 0, scale: 0.8 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                transition={{ type: 'spring', damping: 20, stiffness: 200 }}
                className="bg-white rounded-[28px] p-8 text-center max-w-xs w-full shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="text-5xl mb-4">🎫</div>
                <p className="text-sm font-semibold text-gray-400 uppercase tracking-[1px] mb-2">
                  Your Token Number
                </p>
                <motion.div
                  initial={{ scale: 0.3, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', damping: 8, stiffness: 120, delay: 0.15 }}
                  className="text-5xl font-black my-3 tracking-[4px] leading-none"
                  style={{ color: 'var(--theme-primary, #4f46e5)' }}
                >
                  #{String(tokenNumber).padStart(3, '0')}
                </motion.div>
                <p className="text-sm text-gray-400 mb-6">Show this number at the counter</p>
                <button
                  onClick={() => setUserDismissedWelcome(true)}
                  className="w-full py-3 px-6 rounded-xl font-bold text-white border-none cursor-pointer text-sm"
                  style={{ background: 'linear-gradient(to right, var(--theme-primary, #4f46e5), #4338ca)' }}
                >
                  Browse Menu →
                </button>
              </motion.div>
            </motion.div>
          )}
        </motion.div>
      </motion.div>
      {showQRSignIn && (
        <QRSignInModal
          slug={slug}
          botUsername={shop?.bot_username}
          onClose={() => setShowQRSignIn(false)}
          onSuccess={handleQRSignInSuccess}
        />
      )}
      </>
    );
  }

  // Phone Prompt Screen (for points/coupon identification)
  if (showPhonePrompt) {
    return (
      <div className="qr-page" style={finalThemeCss}>
        <div className="qr-welcome-wrap">
          <div className="qr-welcome-inner">
            <div className="qr-welcome-brand">
              {shop?.profile_picture ? (
                <img src={shop.profile_picture} alt="" className="qr-welcome-avatar" />
              ) : (
                <div className="qr-welcome-avatar qr-welcome-avatar-fallback">📱</div>
              )}
            </div>
            <h1 className="qr-welcome-name" style={{fontSize:20}}>{shop?.bot_full_name}</h1>
            <p className="qr-welcome-msg">Enter your phone number to earn points & use coupons</p>

            <div style={{display:'flex',flexDirection:'column',gap:12,maxWidth:300,margin:'0 auto'}}>
              <div style={{display:'flex',alignItems:'center',gap:8,background:'#fff',border:'2px solid #e5e7eb',borderRadius:14,padding:'4px 14px'}}>
                <span style={{fontSize:16,fontWeight:700,color:'#6b7280'}}>+95</span>
                <input
                  type="tel"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value.replace(/[^0-9]/g, ''))}
                  onKeyDown={(e) => e.key === 'Enter' && handleIdentifyPhone()}
                  placeholder="9XXXXXXXXX"
                  style={{flex:1,border:'none',outline:'none',fontSize:16,padding:'12px 0',background:'transparent'}}
                  autoFocus
                />
              </div>
              {phoneError && (
                <p style={{fontSize:12,color:'#dc2626',fontWeight:500,textAlign:'center',marginTop:-8}}>{phoneError}</p>
              )}
              <button
                onClick={handleIdentifyPhone}
                disabled={identifyingPhone || phoneInput.length < 6}
                style={{
                  width:'100%',padding:'14px',border:'none',borderRadius:14,
                  background:'linear-gradient(135deg, var(--theme-primary, #4f46e5), var(--theme-btn-hover, #4338ca))',
                  color:'#fff',fontSize:15,fontWeight:700,cursor:'pointer',
                  opacity: identifyingPhone || phoneInput.length < 6 ? 0.5 : 1,
                }}
              >
                {identifyingPhone ? 'Please wait...' : 'Continue'}
              </button>
              <button
                onClick={handleSkipPhone}
                style={{background:'none',border:'none',color:'#9ca3af',fontSize:13,cursor:'pointer',padding:'8px'}}
              >
                Skip (browse as guest)
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // QR Customer Dashboard
  if (showQRDashboard) {
    return (
      <QRCustomerDashboard
        slug={slug}
        shop={shop}
        onSignOut={handleQRDashboardSignOut}
      />
    );
  }

  const plan = shop?.plan_name?.toLowerCase() || 'free';
  const isWebSupported = plan === 'standard' || plan === 'pro' || plan === 'business';
  if (!isWebSupported) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full text-center border border-gray-100"
        >
          <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
            <AlertCircle className="w-8 h-8 text-amber-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Shop Unavailable</h2>
          <p className="text-gray-500 text-sm leading-relaxed">
            This shop is currently unavailable...
          </p>
        </motion.div>
      </div>
    );
  }

  const planBanner = (() => {
    const p = shop?.plan_name?.toLowerCase();
    if (p !== 'free' && p !== 'basic') return null;
    return (
      <a href="https://t.me/tg_ecommerce_official_bot?start=newbot" target="_blank" rel="noopener noreferrer"
        style={{
          display: 'block', background: '#fef3c7', borderBottom: '1px solid #f59e0b',
          padding: '5px 16px', textAlign: 'center', fontSize: '11px',
          color: '#92400e', fontWeight: 500, letterSpacing: '0.01em',
          textDecoration: 'none',
        }}>
        Want this kind of E-commerce? <span style={{textDecoration:'underline', fontWeight:600}}>Get here</span>
      </a>
    );
  })();

  return (
    <div className="qr-page" style={finalThemeCss}>
      {planBanner}
      <div className="qr-container">
        {/* Hero */}
        {closedWhileBrowsing && (
          <div className="qr-closed-banner">
            <div className="qr-closed-banner-icon">🕐</div>
            <div className="qr-closed-banner-text">
              <span className="qr-closed-banner-title">Shop is now closed</span>
              <span className="qr-closed-banner-desc">Menu viewing only — ordering is disabled</span>
            </div>
          </div>
        )}
        <div className="qr-hero">
          {banners.length > 0 && (
            <div className="qr-hero-slides"
              onTouchStart={(e) => { bannerTouchRef.current = e.touches[0].clientX; }}
              onTouchEnd={(e) => {
                if (bannerTouchRef.current === null) return;
                const diff = bannerTouchRef.current - e.changedTouches[0].clientX;
                if (Math.abs(diff) > 50) goBanner(diff > 0 ? 'next' : 'prev');
                bannerTouchRef.current = null;
              }}
            >
              {banners.map((banner, i) => {
                const url = `${API_BASE}/telegram/file/${encodeURIComponent(banner.file_id)}?bot_id=${shop?.id}`;
                return (
                  <div key={banner.file_id || i} className={`qr-hero-slide ${i === bannerSlide ? 'active' : ''}`}>
                    <img src={url} alt="" />
                  </div>
                );
              })}
              <div className="qr-hero-overlay"></div>
              {banners.length > 1 && (
                <div className="qr-hero-dots">
                  {banners.map((_, i) => (
                    <button key={i} className={`qr-hero-dot ${i === bannerSlide ? 'active' : ''}`} onClick={() => setBannerSlide(i)} />
                  ))}
                </div>
              )}
            </div>
          )}
          {banners.length === 0 && <div className="qr-hero-overlay"></div>}
          <div className="qr-hero-top">
            <div className="qr-hero-top-left">
              <div className="qr-avatar">
                {shop?.profile_picture ? <img src={shop.profile_picture} alt="" /> : '🍽️'}
              </div>
              <div className="qr-hero-top-text">
                <h1>{shop.bot_full_name}</h1>
                <span className="qr-hero-badge"><i className="ti ti-clock"></i> Open now</span>
              </div>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:6}}>
              {pointsSettings?.enabled && customerId && customerPoints > 0 && (
                <span style={{
                  display:'flex',alignItems:'center',gap:4,
                  background:'rgba(255,255,255,0.18)',backdropFilter:'blur(8px)',
                  border:'1px solid rgba(255,255,255,0.25)',
                  color:'#fff',padding:'6px 10px',borderRadius:12,
                  fontSize:12,fontWeight:600,whiteSpace:'nowrap',
                }}>
                  ⭐ {customerPoints}
                </span>
              )}
              {tokenMode && tokenNumber && (
                <span style={{
                  display:'flex',alignItems:'center',gap:4,
                  background:'rgba(255,255,255,0.18)',backdropFilter:'blur(8px)',
                  border:'1px solid rgba(255,255,255,0.25)',
                  color:'#fff',padding:'6px 10px',borderRadius:12,
                  fontSize:12,fontWeight:600,whiteSpace:'nowrap',
                }}>
                  🎫 #{String(tokenNumber).padStart(3,'0')}
                </span>
              )}
              {tableProp && !tokenMode && (
                <span style={{
                  display:'flex',alignItems:'center',gap:4,
                  background:'rgba(255,255,255,0.18)',backdropFilter:'blur(8px)',
                  border:'1px solid rgba(255,255,255,0.25)',
                  color:'#fff',padding:'6px 10px',borderRadius:12,
                  fontSize:12,fontWeight:600,whiteSpace:'nowrap',
                }}>
                  🪑 Table {tableProp}
                </span>
              )}
              <button className={`qr-hero-orders-btn ${orderCount > 0 && !isBrowseOnly ? 'visible' : ''}`} onClick={() => setShowCart(true)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg>
                <span>{orderCount > 0 ? formatPrice(orderTotal, shop?.currency || 'MMK') : 'Orders'}</span>
                {orderCount > 0 && <span className="qr-hero-order-count">{orderCount}</span>}
              </button>
              <a href={'/' + slug + '-qr-dashboard'}
                style={{
                  display:'flex',alignItems:'center',justifyContent:'center',
                  background:'rgba(255,255,255,0.18)',backdropFilter:'blur(8px)',
                  border:'1px solid rgba(255,255,255,0.25)',
                  color:'#fff',width:36,height:36,borderRadius:12,
                  fontSize:12,fontWeight:600,whiteSpace:'nowrap',
                }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              </a>
            </div>
          </div>
          <div className="qr-hero-content">
            <div className="qr-hero-meta">
              {shop.location && <span className="qr-hero-badge"><i className="ti ti-map-pin"></i> {shop.location}</span>}
              {shop.description && <span className="qr-hero-badge"><i className="ti ti-info-circle"></i> Dine in & Takeaway</span>}
              {qrLanding?.hours_enabled && (() => {
                const now = new Date();
                const day = now.getDay();
                const hh = String(now.getHours()).padStart(2, '0');
                const mm = String(now.getMinutes()).padStart(2, '0');
                const cur = `${hh}:${mm}`;
                const hoursStr = (day === 0 || day === 6) ? qrLanding.hours_weekend : qrLanding.hours_weekday;
                if (!hoursStr) return null;
                const [open, close] = hoursStr.split('-').map(s => s.trim());
                const isOpenNow = open && close && cur >= open && cur <= close;
                return (
                  <span className="qr-hero-badge" style={{color: isOpenNow ? '#4ade80' : '#f87171'}}>
                    <i className="ti ti-clock"></i>
                    {hoursStr}
                    <span style={{fontSize:10,opacity:0.7}}>({isOpenNow ? 'Open now' : 'Closed'})</span>
                  </span>
                );
              })()}
              {qrLanding?.facebook_url && (
                <a href={qrLanding.facebook_url} target="_blank" rel="noopener noreferrer" className="qr-hero-badge" style={{color:'#1877f2',textDecoration:'none'}}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                  Facebook
                </a>
              )}
              {qrLanding?.instagram_url && (
                <a href={qrLanding.instagram_url} target="_blank" rel="noopener noreferrer" className="qr-hero-badge" style={{textDecoration:'none'}}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                  Instagram
                </a>
              )}
              {qrLanding?.social_phone && (
                <a href={`tel:${qrLanding.social_phone}`} className="qr-hero-badge" style={{textDecoration:'none'}}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/></svg>
                  {qrLanding.social_phone}
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Welcome message banner */}
        {qrLanding?.welcome_message && !qrLanding?.announcement_enabled && (
          <div className="qr-announcement" style={{background:'#f0fdf4',borderBottom:'1px solid #bbf7d0'}}>
            <div className="qr-announcement-icon">👋</div>
            <div className="qr-announcement-text">{qrLanding.welcome_message}</div>
          </div>
        )}

        {/* Announcement banner */}
        {qrLanding?.announcement_enabled && qrLanding?.announcement_text && (
          <div className="qr-announcement">
            <div className="qr-announcement-icon">📢</div>
            <div className="qr-announcement-text">{qrLanding.announcement_text}</div>
          </div>
        )}

        {/* Search */}
        <div className="qr-search-wrap">
          <div className="qr-search">
            <i className="ti ti-search qr-search-icon"></i>
            <input className="qr-search-input" ref={searchRef} placeholder="Search menu items..." value={searchQ} onChange={e => setSearchQ(e.target.value)} />
            {searchQ && <button className="qr-search-clear" onClick={() => setSearchQ('')}><i className="ti ti-x" style={{fontSize:11}}></i></button>}
          </div>
        </div>

        {/* Categories */}
        <div className="qr-cats"
          ref={catScrollRef}
          onMouseDown={handleCatMouseDown}
          onMouseMove={handleCatMouseMove}
          onMouseUp={handleCatMouseUp}
          onMouseLeave={handleCatMouseUp}>
          {categoryList.map(cat => (
            <button key={cat.id} className={`qr-cat-btn ${activeCat === cat.id ? 'active' : ''}`} onClick={() => setActiveCat(cat.id)}>
              <div className="qr-cat-icon"><span>{cat.emoji}</span></div>
              <span className="qr-cat-label">{cat.name}</span>
            </button>
          ))}
        </div>

        {/* Popular picks */}
        {!searchQ && activeCat === 'all' && popular.length > 0 && (
          <>
            <div className="qr-section-header">
              <span className="qr-section-title">⭐ Popular Picks</span>
              <span className="qr-section-count">{popular.length} items</span>
            </div>
            <div className="qr-featured-scroll">
              <div className="qr-featured-list">
                {popular.map(item => {
                  const imgs = getItemImageUrls(item.image_url, shop?.id);
                  return (
                    <div key={item.id} className="qr-featured-card" onClick={() => setSelectedItem(item)}>
                      <div className="qr-featured-img">{imgs[0] ? <img src={imgs[0]} alt={item.name} /> : '⭐'}</div>
                      <div className="qr-featured-body">
                        <div className="qr-featured-name">{item.name}</div>
                        <div className="qr-featured-desc">{item.description || ''}</div>
                        <div className="qr-featured-price">{formatPrice(item.price, shop?.currency || 'MMK')}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="qr-divider"></div>
          </>
        )}

        {/* Menu items */}
        <div>
          <div className="qr-section-header">
            <span className="qr-section-title">{searchQ ? `Results for "${searchQ}"` : activeCat === 'all' ? labels.menu_section_title : catById[activeCat]?.name || 'Items'}</span>
            <div className="flex items-center gap-2">
              <span className="qr-section-count">{filtered.length} items</span>
              <div className="flex bg-gray-100 rounded-lg p-0.5 gap-0.5">
                <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>
                </button>
                <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3h7v7H3zm11 0h7v7h-7zM3 14h7v7H3zm11 0h7v7h-7z"/></svg>
                </button>
              </div>
            </div>
          </div>
          {filtered.length === 0 ? (
            <div className="qr-no-results">
              <i className="ti ti-mood-sad"></i>
              No items found
            </div>
          ) : viewMode === 'list' ? (
            <div className="qr-item-grid">
              {filtered.map(item => {
                const imgs = getItemImageUrls(item.image_url, shop?.id);
                const badges = item.badges || [];
                const inOrderTotal = orderItems.filter(oi => oi.item.id === item.id).reduce((s, oi) => s + oi.qty, 0);
                const inOrderNoVariant = hasVariants(item) ? null : orderItems.find(oi => oi.item.id === item.id && !oi.variants?.length);
                const itemUnitPrice = Number(item.price);
                return (
                  <div key={item.id} className="qr-item" onClick={() => setSelectedItem(item)}>
                    <div className="qr-item-thumb">{imgs[0] ? <img src={imgs[0]} alt={item.name} /> : '🍽️'}</div>
                    <div className="qr-item-info">
                      <div className="qr-item-name">{item.name}</div>
                      {badges.length > 0 && (
                        <div className="qr-item-badges">{badges.map(b => {
                          const cfg = BADGE_STYLES[b];
                          return cfg ? <span key={b} className={`qr-badge ${cfg.cls}`}>{cfg.label}</span> : null;
                        })}</div>
                      )}
                      {item.description && <div className="qr-item-desc">{item.description}</div>}
                      <div className="qr-item-bottom">
                        <div className="qr-item-price">{formatPrice(item.price, shop?.currency || 'MMK')}</div>
                        {inOrderTotal > 0 && <span className="qr-item-in-cart">× {inOrderTotal}</span>}
                      </div>
                    </div>
                    {inOrderTotal > 0 && !inOrderNoVariant ? (
                      <div className="qr-item-qty-ctrl" onClick={(e) => e.stopPropagation()}>
                        <button className="qr-item-qty-btn" onClick={() => { const first = orderItems.find(oi => oi.item.id === item.id); if (first) updateQty(first.cartKey || first.item.id, first.qty - 1); }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14"/></svg>
                        </button>
                        <span className="qr-item-qty-num">{inOrderTotal}</span>
                        <button className="qr-item-qty-btn" onClick={() => setSelectedItem(item)}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
                        </button>
                      </div>
                    ) : inOrderNoVariant ? (
                      <div className="qr-item-qty-ctrl" onClick={(e) => e.stopPropagation()}>
                        <button className="qr-item-qty-btn" onClick={() => updateQty(item.id, inOrderNoVariant.qty - 1)}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14"/></svg>
                        </button>
                        <span className="qr-item-qty-num">{inOrderTotal}</span>
                        <button className="qr-item-qty-btn" onClick={() => { if (hasVariants(item)) setSelectedItem(item); else addToOrder(item, 1); }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
                        </button>
                      </div>
                    ) : (
                      <button className="qr-item-add" onClick={(e) => { e.stopPropagation(); if (hasVariants(item)) setSelectedItem(item); else addToOrder(item, 1); }}>
                        {hasVariants(item) ? (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/></svg>
                        ) : (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
                        )}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="qr-grid-view">
              {filtered.map((item, index) => {
                const imgs = getItemImageUrls(item.image_url, shop?.id);
                const badges = item.badges || [];
                const inOrderTotal = orderItems.filter(oi => oi.item.id === item.id).reduce((s, oi) => s + oi.qty, 0);
                const inOrderNoVariant = hasVariants(item) ? null : orderItems.find(oi => oi.item.id === item.id && !oi.variants?.length);
                const isUnavailable = item.is_available === false;
                return (
                  <div key={item.id} className="qr-grid-card" onClick={() => setSelectedItem(item)}>
                    <div className="qr-grid-img">
                      {imgs[0] ? (
                        <img src={imgs[0]} alt={item.name} />
                      ) : (
                        <span style={{fontSize:32}}>🍽️</span>
                      )}
                      <div className="qr-grid-overlay" />
                      {imgs.length > 1 && (
                        <div className="qr-grid-img-count">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
                          {imgs.length}
                        </div>
                      )}
                      <div className={`qr-grid-status ${isUnavailable ? 'bg-rose-500/90' : 'bg-emerald-500/90'}`}>
                        {isUnavailable ? 'Unavailable' : 'Available'}
                      </div>
                      {item.category_id && catById[item.category_id] && (
                        <div className="qr-grid-cat">{catById[item.category_id].icon || '📁'} {catById[item.category_id].name}</div>
                      )}
                    </div>
                    <div className="qr-grid-body">
                      <h3 className="qr-grid-name">{item.name}</h3>
                      {item.description && <p className="qr-grid-desc">{item.description}</p>}
                      {badges.length > 0 && (
                        <div className="qr-grid-badges">{badges.map(b => {
                          const cfg = BADGE_STYLES[b];
                          return cfg ? <span key={b} className={`qr-badge ${cfg.cls}`}>{cfg.emoji || cfg.label}</span> : null;
                        })}</div>
                      )}
                      <div className="qr-grid-bottom">
                        <div className="qr-grid-price">{formatPrice(item.price, shop?.currency || 'MMK')}</div>
                        <div onClick={(e) => e.stopPropagation()}>
                          {inOrderTotal > 0 ? (
                            <div className="qr-grid-qty-ctrl">
                              <button className="qr-grid-qty-btn" onClick={() => { const first = orderItems.find(oi => oi.item.id === item.id); if (first) updateQty(first.cartKey || first.item.id, first.qty - 1); }}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14"/></svg>
                              </button>
                              <span className="qr-grid-qty-num">{inOrderTotal}</span>
                              <button className="qr-grid-qty-btn" onClick={() => { if (hasVariants(item)) setSelectedItem(item); else addToOrder(item, 1); }}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
                              </button>
                            </div>
                          ) : (
                            <button className="qr-grid-add" onClick={(e) => { if (hasVariants(item)) setSelectedItem(item); else addToOrder(item, 1); }}>
                              {hasVariants(item) ? (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/></svg>
                              ) : (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

        {/* Call staff button (browse only mode) */}
      {isBrowseOnly && (
        <div className="qr-browse-only-bar">
          <a href={`tel:${qrLanding?.social_phone || shop?.phone || ''}`} className="qr-call-staff-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/></svg>
            {qrLanding?.social_phone || shop?.phone ? `Call ${qrLanding?.social_phone || shop?.phone}` : 'Call to Order'}
          </a>
        </div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {selectedItem && (
          <DetailModal item={selectedItem} shop={shop} orderItems={orderItems} onAddToOrder={addToOrder} onClose={() => setSelectedItem(null)} addToOrderLabel={labels.add_to_order} isBrowseOnly={isBrowseOnly} shopPhone={qrLanding?.social_phone || ''} />
        )}
      </AnimatePresence>

<AnimatePresence>
        {showCart && (
          <CartSheet orderItems={orderItems} orderCount={orderCount} orderTotal={orderTotal} shop={shop}
            onUpdateQty={updateQty} onRemoveItem={removeItem} onClearAll={clearAll}
            onClose={() => setShowCart(false)} paymentMode={paymentMode} orderFlowMode={orderFlowMode}
            cartTitle={labels.cart_title} checkoutHint={labels.checkout_hint}
            onProceed={() => { setShowCart(false); setShowCheckout(true); }} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCheckout && (
          <CheckoutFlow orderItems={orderItems} orderTotal={orderTotal} shop={shop}
            paymentMethods={paymentMethods}
            tableProp={tableProp}
            customerId={customerId}
            customerPoints={customerPoints}
            pointsSettings={pointsSettings}
            netTotal={netTotal}
            couponDiscount={couponDiscount}
            pointsDiscount={pointsDiscount}
            couponAttempts={couponAttempts}
            couponLockUntil={couponLockUntil}
            appliedCoupon={appliedCoupon}
            couponInput={couponInput}
            setCouponInput={setCouponInput}
            handleApplyCoupon={handleApplyCoupon}
            checkingCoupon={checkingCoupon}
            pointsToRedeem={pointsToRedeem}
            setPointsToRedeem={setPointsToRedeem}
            handleRedeemPoints={handleRedeemPoints}
            redeemingPoints={redeemingPoints}
            tokenNumber={tokenNumber}
            hasInstantMmpay={data?.has_instant_mmpay && netTotal >= 1000}
            onBack={() => { setShowCheckout(false); setShowCart(true); }}
            onSubmitOrder={() => { setShowCheckout(false); setOrderItems([]); }} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showTokenCard && tokenNumber && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="modal-overlay"
            onClick={() => setShowTokenCard(false)}
          >
            <motion.div
              initial={{ y: 100, opacity: 0, scale: 0.8 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 100, opacity: 0, scale: 0.8 }}
              transition={{ type: 'spring', damping: 20, stiffness: 200 }}
              className="modal-sheet token-card-sheet"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="token-card-body">
                <div className="token-card-icon">🎫</div>
                <p className="token-card-label">Your Token Number</p>
                <motion.div
                  initial={{ scale: 0.3, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', damping: 8, stiffness: 120, delay: 0.15 }}
                  className="token-card-number"
                >
                  #{String(tokenNumber).padStart(3, '0')}
                </motion.div>
                <p className="token-card-hint">Show this number at the counter</p>
                <button
                  className="modal-add-btn token-card-btn"
                  onClick={() => {
                    setShowTokenCard(false);
                    if (pointsSettings?.enabled && !customerId) setShowPhonePrompt(true);
                  }}
                >
                  Browse Menu →
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {showQRSignIn && (
        <QRSignInModal
          slug={slug}
          botUsername={shop?.bot_username}
          onClose={() => setShowQRSignIn(false)}
          onSuccess={handleQRSignInSuccess}
        />
      )}

      <style>{`
        *, *::before, *::after { box-sizing: border-box; }
        body { margin: 0; }
        .qr-page { min-height: 100vh; background: var(--theme-bg, #f7f5f0); font-family: system-ui,-apple-system,sans-serif; color: #1a1a1a; }
        .qr-container { max-width: 1024px; margin: 0 auto; position: relative; }
        .qr-empty { min-height: 100vh; display: flex; align-items: center; justify-content: center; }
        .qr-empty-inner { text-align: center; padding: 40px; }
        .qr-empty-inner h2 { font-size: 20px; font-weight: 800; color: #1a1a1a; margin: 0 0 6px; }
        .qr-empty-inner p { font-size: 13px; color: #aaa; margin: 0 0 20px; }
        .qr-closed-label { font-size: 11px; font-weight: 700; color: #999; letter-spacing: 2px; text-transform: uppercase; margin: 0 0 4px; }
        .qr-retry-btn { padding: 12px 36px; background: var(--theme-primary, #1a1a2e); border: none; border-radius: 14px; color: var(--theme-btn-text, #fff); font-size: 15px; font-weight: 700; cursor: pointer; }

        /* Hero */
        .qr-closed-banner { display: flex; align-items: center; gap: 10px; padding: 10px 16px; background: #fef2f2; border-bottom: 1px solid #fecaca; position: sticky; top: 0; z-index: 50; }
        .qr-closed-banner-icon { font-size: 20px; line-height: 1; flex-shrink: 0; }
        .qr-closed-banner-text { display: flex; flex-direction: column; }
        .qr-closed-banner-title { font-size: 13px; font-weight: 700; color: #991b1b; }
        .qr-closed-banner-desc { font-size: 11px; color: #b91c1c; }
        .qr-hero { position: relative; height: 200px; overflow: hidden; background: var(--theme-header, linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)); }
        .qr-hero-slides { position: absolute; inset: 0; }
        .qr-hero-slide { position: absolute; inset: 0; opacity: 0; transition: opacity 0.7s ease; }
        .qr-hero-slide.active { opacity: 1; }
        .qr-hero-slide img { width: 100%; height: 100%; object-fit: cover; }
        .qr-hero-dots { position: absolute; bottom: 12px; left: 50%; transform: translateX(-50%); display: flex; gap: 6px; z-index: 5; }
        .qr-hero-dot { width: 8px; height: 8px; border-radius: 4px; border: none; background: rgba(255,255,255,0.4); cursor: pointer; transition: all 0.2s; }
        .qr-hero-dot.active { width: 20px; background: #fff; }
        .qr-hero-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.35); z-index: 1; pointer-events: none; }
        .qr-hero-top { position: absolute; top: 0; left: 0; right: 0; z-index: 3; display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; }
        .qr-hero-top-left { display: flex; align-items: center; gap: 12px; min-width: 0; }
        .qr-hero-top-text h1 { color: var(--theme-header-text, #fff); font-size: 18px; font-weight: 700; letter-spacing: -0.3px; margin: 0; line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .qr-hero-top-text .qr-hero-badge { color: var(--theme-header-muted, rgba(255,255,255,0.7)); font-size: 10px; margin-top: 2px; }
        .qr-hero-orders-btn { display: flex; align-items: center; gap: 6px; background: rgba(255,255,255,0.18); backdrop-filter: blur(8px); border: 1px solid rgba(255,255,255,0.25); color: var(--theme-header-text, #fff); padding: 8px 14px; border-radius: 12px; font-size: 13px; font-weight: 600; cursor: pointer; transition: opacity 0.25s; opacity: 0; pointer-events: none; flex-shrink: 0; }
        .qr-hero-orders-btn.visible { opacity: 1; pointer-events: all; }
        .qr-hero-orders-btn:active { transform: scale(0.95); }
        .qr-hero-order-count { background: var(--theme-accent-amber, #e8b44b); color: var(--theme-primary, #1a1a2e); width: 20px; height: 20px; border-radius: 6px; font-size: 11px; font-weight: 800; display: flex; align-items: center; justify-content: center; margin-left: 2px; }
        .qr-hero-content { position: relative; z-index: 3; display: flex; align-items: flex-end; padding: 14px 20px; min-height: 100%; pointer-events: none; }
        .qr-hero-content .qr-hero-meta { pointer-events: auto; }
        .qr-hero-content .qr-hero-meta { display: flex; gap: 14px; flex-wrap: wrap; }
        .qr-hero-badge { display: flex; align-items: center; gap: 4px; color: var(--theme-header-muted, rgba(255,255,255,0.8)); font-size: 11px; }
        .qr-avatar { width: 52px; height: 52px; min-width: 52px; border-radius: 14px; background: #fff; display: flex; align-items: center; justify-content: center; font-size: 22px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); overflow: hidden; }
        .qr-avatar img { width: 100%; height: 100%; object-fit: cover; }

        /* Search */
        .qr-search-wrap { padding: 0 16px; margin-top: -20px; position: relative; z-index: 10; }
        .qr-search { position: relative; max-width: 600px; margin: 0 auto; }
        .qr-search-input { width: 100%; background: #fff; border: none; border-radius: 14px; padding: 13px 44px; font-size: 14px; color: #1a1a1a; box-shadow: 0 4px 20px rgba(0,0,0,0.12); outline: none; }
        .qr-search-icon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: #aaa; font-size: 18px; }
        .qr-search-clear { position: absolute; right: 14px; top: 50%; transform: translateY(-50%); background: #eee; border: none; border-radius: 50%; width: 22px; height: 22px; cursor: pointer; display: flex; align-items: center; justify-content: center; }

        /* Categories */
        .qr-cats { display: flex; gap: 8px; padding: 16px 16px 8px; overflow-x: auto; scrollbar-width: none; cursor: grab; user-select: none; }
        .qr-cats::-webkit-scrollbar { display: none; }
        .qr-cat-btn { border: none; background: transparent; padding: 0; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 5px; min-width: 60px; }
        .qr-cat-icon { width: 54px; height: 54px; border-radius: 16px; background: #fff; display: flex; align-items: center; justify-content: center; font-size: 22px; border: 2px solid transparent; transition: all 0.2s; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
        .qr-cat-btn.active .qr-cat-icon { background: var(--theme-primary, #1a1a2e); border-color: var(--theme-primary, #1a1a2e); }
        .qr-cat-btn.active .qr-cat-label { color: var(--theme-primary, #1a1a2e); font-weight: 700; }
        .qr-cat-label { font-size: 10px; color: #888; font-weight: 500; text-align: center; line-height: 1.2; }

        /* Sections */
        .qr-section-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 16px 10px; }
        .qr-section-title { font-size: 17px; font-weight: 700; color: #1a1a1a; }
        .qr-section-count { font-size: 12px; color: #aaa; background: #eee; padding: 2px 8px; border-radius: 20px; }

        /* Featured */
        .qr-featured-scroll { overflow-x: auto; scrollbar-width: none; padding: 0 16px 16px; }
        .qr-featured-scroll::-webkit-scrollbar { display: none; }
        .qr-featured-list { display: flex; gap: 12px; min-width: max-content; }
        .qr-featured-card { width: 160px; background: #fff; border-radius: 18px; overflow: hidden; cursor: pointer; flex-shrink: 0; box-shadow: 0 2px 12px rgba(0,0,0,0.07); }
        .qr-featured-card:active { transform: scale(0.97); }
        .qr-featured-img { width: 100%; height: 110px; background: linear-gradient(135deg,#ffecd2,#fcb69f); display: flex; align-items: center; justify-content: center; font-size: 40px; overflow: hidden; }
        .qr-featured-img img { width: 100%; height: 100%; object-fit: cover; }
        .qr-featured-body { padding: 10px; }
        .qr-featured-name { font-size: 13px; font-weight: 700; color: #1a1a1a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .qr-featured-desc { font-size: 11px; color: #aaa; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .qr-featured-price { font-size: 14px; font-weight: 800; color: var(--theme-price, var(--theme-primary, #1a1a2e)); margin-top: 6px; }
        .qr-featured-price span { font-size: 10px; color: #aaa; font-weight: 500; }
        .qr-divider { height: 1px; background: #f0ede8; margin: 0 16px; }

        /* Item grid */
        .qr-item-grid { padding: 0 16px 120px; display: grid; grid-template-columns: 1fr; gap: 0; }
        .qr-item { background: #fff; border-radius: 18px; margin-bottom: 10px; display: flex; gap: 12px; padding: 12px; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.05); align-items: center; }
        .qr-item:active { transform: scale(0.98); }
        .qr-item-thumb { width: 80px; height: 80px; border-radius: 14px; flex-shrink: 0; overflow: hidden; background: linear-gradient(135deg,#ffecd2,#fcb69f); display: flex; align-items: center; justify-content: center; font-size: 32px; }
        .qr-item-thumb img { width: 100%; height: 100%; object-fit: cover; }
        .qr-item-info { flex: 1; min-width: 0; }
        .qr-item-name { font-size: 14px; font-weight: 700; color: #1a1a1a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .qr-item-badges { display: flex; gap: 4px; flex-wrap: wrap; margin-top: 4px; }
        .qr-badge { font-size: 9px; padding: 2px 6px; border-radius: 6px; font-weight: 700; }
        .badge-popular { background: #fff8e7; color: #e6a817; }
        .badge-spicy { background: #fff0f0; color: #e53e3e; }
        .badge-veg { background: #f0fff4; color: #38a169; }
        .badge-gf { background: #fefce8; color: #d97706; }
        .qr-item-desc { font-size: 11px; color: #aaa; margin-top: 3px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; line-height: 1.4; }
        .qr-item-bottom { display: flex; align-items: center; justify-content: space-between; margin-top: 8px; }
        .qr-item-price { font-size: 15px; font-weight: 800; color: var(--theme-price, var(--theme-primary, #1a1a2e)); }
        .qr-item-price span { font-size: 10px; color: #aaa; font-weight: 500; }
        .qr-item-in-cart { background: #e8f5e9; color: #38a169; font-size: 10px; font-weight: 700; padding: 4px 8px; border-radius: 8px; white-space: nowrap; }
        .qr-item-add { width: 32px; height: 32px; border-radius: 10px; background: var(--theme-primary, #1a1a2e); border: none; color: var(--theme-btn-text, #fff); cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .qr-item-add:active { transform: scale(0.9); }
        .qr-item-qty-ctrl { display: flex; align-items: center; gap: 4px; flex-shrink: 0; background: var(--theme-primary, #1a1a2e); border-radius: 10px; padding: 2px; }
        .qr-item-qty-btn { width: 28px; height: 28px; border-radius: 8px; border: none; background: transparent; color: var(--theme-btn-text, #fff); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.15s; }
        .qr-item-qty-btn:active { background: rgba(255,255,255,0.2); }
        .qr-item-qty-num { min-width: 20px; text-align: center; font-size: 13px; font-weight: 700; color: var(--theme-btn-text, #fff); }

        /* Grid view */
        .qr-grid-view { padding: 0 16px 120px; display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .qr-grid-card { background: #fff; border-radius: 18px; overflow: hidden; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
        .qr-grid-card:active { transform: scale(0.97); }
        .qr-grid-img { aspect-ratio: 1; background: linear-gradient(135deg,#ffecd2,#fcb69f); position: relative; overflow: hidden; display: flex; align-items: center; justify-content: center; }
        .qr-grid-img img { width: 100%; height: 100%; object-fit: cover; }
        .qr-grid-overlay { position: absolute; inset: 0; background: linear-gradient(180deg,transparent 50%,rgba(0,0,0,0.15)); pointer-events: none; }
        .qr-grid-img-count { position: absolute; top: 8px; right: 8px; background: rgba(255,255,255,0.9); backdrop-filter: blur(4px); padding: 3px 7px; border-radius: 8px; font-size: 10px; font-weight: 700; color: #555; display: flex; align-items: center; gap: 3px; }
        .qr-grid-status { position: absolute; bottom: 8px; left: 8px; padding: 3px 8px; border-radius: 8px; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #fff; backdrop-filter: blur(4px); }
        .qr-grid-cat { position: absolute; top: 8px; left: 8px; background: rgba(255,255,255,0.9); backdrop-filter: blur(4px); padding: 3px 7px; border-radius: 8px; font-size: 10px; font-weight: 600; color: #555; display: flex; align-items: center; gap: 3px; }
        .qr-grid-body { padding: 10px 12px 12px; }
        .qr-grid-name { font-size: 13px; font-weight: 700; color: #1a1a1a; line-height: 1.3; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .qr-grid-desc { font-size: 11px; color: #aaa; margin-top: 3px; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .qr-grid-badges { display: flex; gap: 3px; flex-wrap: wrap; margin-top: 5px; }
        .qr-grid-bottom { display: flex; align-items: center; justify-content: space-between; margin-top: 8px; gap: 8px; }
        .qr-grid-price { font-size: 14px; font-weight: 800; color: var(--theme-price, var(--theme-primary, #1a1a2e)); }
        .qr-grid-price span { font-size: 9px; color: #aaa; font-weight: 500; }
        .qr-grid-add { width: 30px; height: 30px; border-radius: 10px; background: var(--theme-primary, #1a1a2e); border: none; color: var(--theme-btn-text, #fff); cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .qr-grid-add:active { transform: scale(0.9); }
        .qr-grid-qty-ctrl { display: flex; align-items: center; gap: 2px; background: var(--theme-primary, #1a1a2e); border-radius: 10px; padding: 2px; }
        .qr-grid-qty-btn { width: 26px; height: 26px; border-radius: 8px; border: none; background: transparent; color: var(--theme-btn-text, #fff); cursor: pointer; display: flex; align-items: center; justify-content: center; }
        .qr-grid-qty-btn:active { background: rgba(255,255,255,0.2); }
        .qr-grid-qty-num { min-width: 18px; text-align: center; font-size: 12px; font-weight: 700; color: var(--theme-btn-text, #fff); }

        @media (min-width: 640px) {
          .qr-grid-view { padding: 0 32px 120px; grid-template-columns: 1fr 1fr; gap: 16px; }
          .qr-grid-name { font-size: 14px; }
          .qr-grid-price { font-size: 15px; }
        }

        @media (min-width: 1024px) {
          .qr-grid-view { padding: 0 48px 120px; grid-template-columns: 1fr 1fr 1fr; gap: 18px; }
        }

        @media (min-width: 1200px) {
          .qr-grid-view { padding: 0 52px 120px; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 20px; }
        }

        /* Modal */
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.55); z-index: 100; display: flex; align-items: flex-end; justify-content: center; }
        .modal-sheet { background: #fff; border-radius: 28px 28px 0 0; width: 100%; max-width: 480px; max-height: 88vh; overflow-y: auto; padding-bottom: 32px; }
        .modal-close { position: absolute; top: 16px; right: 16px; width: 36px; height: 36px; border-radius: 50%; background: rgba(0,0,0,0.35); border: none; color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; z-index: 200; }
        .modal-image { width: 100%; height: 220px; background: linear-gradient(135deg,#ffecd2,#fcb69f); display: flex; align-items: center; justify-content: center; font-size: 70px; border-radius: 28px 28px 0 0; overflow: hidden; position: relative; }
        .modal-image img { width: 100%; height: 100%; object-fit: cover; }
        .modal-nav { position: absolute; top: 50%; transform: translateY(-50%); z-index: 10; width: 36px; height: 36px; border-radius: 50%; border: none; background: rgba(0,0,0,0.3); color: #fff; font-size: 24px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.2s; line-height: 1; padding: 0 0 3px; }
        .modal-nav:hover { background: rgba(0,0,0,0.5); }
        .modal-nav-prev { left: 12px; }
        .modal-nav-next { right: 12px; }
        .modal-dots { position: absolute; bottom: 12px; left: 50%; transform: translateX(-50%); display: flex; gap: 5px; }
        .modal-dot { width: 18px; height: 3px; border-radius: 2px; border: none; background: rgba(255,255,255,0.35); cursor: pointer; transition: all 0.2s; padding: 0; }
        .modal-dot.active { background: #fff; }
        .modal-body { padding: 20px; }
        .modal-name { font-size: 22px; font-weight: 800; color: #1a1a1a; letter-spacing: -0.5px; margin: 0; }
        .modal-desc { font-size: 13px; color: #888; margin-top: 8px; line-height: 1.6; margin: 8px 0 0; }
        .modal-price { font-size: 26px; font-weight: 800; color: var(--theme-price, var(--theme-primary, #1a1a2e)); margin-top: 16px; }
        .modal-price span { font-size: 14px; color: #aaa; font-weight: 500; }
        .modal-badges { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 12px; }
        .modal-badge { font-size: 11px; padding: 4px 10px; border-radius: 8px; font-weight: 700; display: flex; align-items: center; gap: 4px; }
        .modal-in-cart { margin: 10px 0; padding: 10px 14px; background: #e8f5e9; border-radius: 12px; font-size: 13px; font-weight: 700; color: #38a169; }
        .modal-qty-row { display: flex; align-items: center; gap: 16px; margin: 20px 0; }
        .modal-qty-label { font-size: 13px; color: #888; font-weight: 600; flex: 1; }
        .modal-qty-ctrl { display: flex; align-items: center; gap: 14px; }
        .modal-qty-btn { width: 36px; height: 36px; border-radius: 12px; border: 1.5px solid #e0e0e0; background: #fff; font-size: 20px; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #1a1a1a; }
        .modal-qty-btn:hover { border-color: var(--theme-primary, #1a1a2e); }
        .modal-qty-num { font-size: 17px; font-weight: 800; min-width: 24px; text-align: center; }
        .modal-add-btn { width: 100%; padding: 16px; background: var(--theme-btn, var(--theme-primary, #1a1a2e)); color: var(--theme-btn-text, #fff); border: none; border-radius: 16px; font-size: 16px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; }
        .modal-add-btn:active { opacity: 0.85; }

        /* Modal extras (variants/addons) */
        .modal-extras-section { margin-top: 16px; }
        .modal-extras-label { font-size: 13px; font-weight: 700; color: #374151; margin-bottom: 8px; }
        .modal-variant-options { display: flex; flex-wrap: wrap; gap: 8px; }
        .modal-extras-btn { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 10px 14px; border: 1.5px solid #e5e7eb; border-radius: 12px; background: #fafafa; cursor: pointer; transition: all 0.15s; flex: 1; min-width: 120px; font-size: 13px; }
        .modal-extras-btn:active { transform: scale(0.97); }
        .modal-extras-btn.active { border-color: var(--theme-primary, #1a1a2e); background: var(--theme-primary-light, #eef2ff); }
        .modal-extras-btn-label { display: flex; align-items: center; gap: 6px; font-weight: 600; color: #1a1a1a; }
        .modal-extras-btn-label svg { flex-shrink: 0; }
        .modal-extras-btn-price { font-size: 12px; font-weight: 700; color: var(--theme-primary, #1a1a2e); white-space: nowrap; }
        .modal-price-breakdown { font-size: 11px; color: #9ca3af; margin-top: 2px; line-height: 1.5; }

        /* Cart item extras */
        .cart-item-extras { display: flex; flex-wrap: wrap; gap: 3px; margin-top: 3px; }
        .cart-item-extra { font-size: 11px; color: #6b7280; background: #f3f4f6; padding: 1px 6px; border-radius: 4px; }

        /* Announcement banner */
        .qr-announcement { display: flex; align-items: center; gap: 10px; padding: 10px 16px; background: #fefce8; border-bottom: 1px solid #fde68a; font-size: 13px; color: #92400e; line-height: 1.4; }
        .qr-announcement-icon { font-size: 18px; flex-shrink: 0; line-height: 1; }
        .qr-announcement-text { flex: 1; }
        @media (min-width: 640px) { .qr-announcement { padding: 10px 32px; } }
        @media (min-width: 1024px) { .qr-announcement { padding: 10px 48px; } }
        @media (min-width: 1200px) { .qr-announcement { padding: 10px 52px; } }

        /* Browse only call staff */
        .qr-browse-only-bar { position: fixed; bottom: 0; left: 0; right: 0; z-index: 50; padding: 12px 16px; background: linear-gradient(transparent, rgba(255,255,255,0.95) 30%); pointer-events: none; display: flex; justify-content: center; }
        .qr-call-staff-btn { display: flex; align-items: center; gap: 10px; padding: 16px 32px; background: var(--theme-btn, var(--theme-primary, #1a1a2e)); color: var(--theme-btn-text, #fff); border: none; border-radius: 16px; font-size: 16px; font-weight: 700; cursor: pointer; pointer-events: all; text-decoration: none; box-shadow: 0 4px 20px rgba(0,0,0,0.2); transition: transform 0.15s; }
        .qr-call-staff-btn:active { transform: scale(0.97); }

        /* Cart sheet */
        .cart-sheet-wrap { position: fixed; inset: 0; z-index: 150; display: flex; justify-content: flex-end; }
        .cart-sheet-bg { position: absolute; inset: 0; background: rgba(0,0,0,0.55); }
        .cart-sheet-panel { position: relative; background: #fff; width: 100%; max-width: 420px; height: 100vh; overflow-y: auto; padding: 24px 20px 40px; z-index: 2; box-shadow: -8px 0 32px rgba(0,0,0,0.15); }
        .cart-sheet-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
        .cart-sheet-title { font-size: 19px; font-weight: 800; margin: 0; }
        .cart-sheet-x { background: none; border: none; font-size: 22px; cursor: pointer; color: #999; padding: 4px; }
        .cart-sheet-item { display: flex; gap: 12px; align-items: center; padding: 12px 0; border-bottom: 1px solid #f0f0f0; }
        .cart-item-thumb { width: 52px; height: 52px; border-radius: 12px; background: #f7f5f0; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 22px; overflow: hidden; }
        .cart-item-thumb img { width: 100%; height: 100%; object-fit: cover; }
        .cart-item-info { flex: 1; min-width: 0; }
        .cart-item-name { font-size: 14px; font-weight: 700; }
        .cart-item-price { font-size: 13px; color: #888; margin-top: 2px; }
        .cart-item-qty { display: flex; align-items: center; gap: 8px; }
        .ciq-btn { width: 28px; height: 28px; border-radius: 8px; border: 1.5px solid #e0e0e0; background: #fff; font-size: 16px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
        .ciq-num { font-size: 13px; font-weight: 700; min-width: 20px; text-align: center; }
        .cart-sheet-footer { border-top: 1px solid #f0f0f0; padding-top: 16px; margin-top: 8px; }
        .cart-sheet-total { display: flex; justify-content: space-between; align-items: center; padding: 0 0 16px; font-size: 16px; font-weight: 700; }
        .cart-sheet-actions { display: flex; gap: 10px; }
        .cs-btn { flex: 1; padding: 14px; border-radius: 16px; font-size: 15px; font-weight: 700; cursor: pointer; border: none; display: inline-flex; align-items: center; justify-content: center; gap: 8px; }
        .cs-btn-primary { background: var(--theme-primary, #1a1a2e); color: var(--theme-btn-text, #fff); }
        .cs-btn-secondary { background: #eee; color: #666; }
        .cart-sheet-hint { text-align: center; font-size: 11px; color: #bbb; margin: 12px 0 0; }
        .cart-sheet-empty { text-align: center; padding: 40px 0; color: #ccc; font-size: 14px; }
        .qr-no-results { text-align: center; padding: 60px 20px; color: #bbb; }
        .qr-no-results i { font-size: 48px; display: block; margin-bottom: 12px; }

        /* Tablet+ */
        @media (min-width: 640px) {
          .qr-hero { height: 220px; border-radius: 0 0 24px 24px; }
          .qr-hero-top { padding: 18px 32px; }
          .qr-hero-content { padding: 20px 32px; }
          .qr-hero-top-text h1 { font-size: 20px; }
          .qr-search-wrap { padding: 0 32px; }
          .qr-cats { padding: 20px 32px 12px; }
          .qr-section-header { padding: 20px 32px 12px; }
          .qr-item-grid { padding: 0 32px 120px; grid-template-columns: 1fr 1fr; gap: 10px; }
          .qr-featured-scroll { padding: 0 32px 16px; }
          .qr-item-grid .qr-item { margin-bottom: 0; }
          .qr-divider { margin: 0 32px; }
          .modal-overlay { align-items: center; }
          .modal-sheet { border-radius: 28px; max-height: 90vh; }
        }

        @media (min-width: 1024px) {
          .qr-hero { height: 240px; }
          .qr-hero-content { padding: 32px 48px; }
          .qr-hero-top { padding: 18px 48px; }
          .qr-search-wrap { padding: 0 48px; }
          .qr-cats { padding: 24px 48px 16px; }
          .qr-cats { gap: 12px; }
          .qr-section-header { padding: 24px 48px 16px; }
          .qr-item-grid { padding: 0 48px 120px; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
          .qr-featured-scroll { padding: 0 48px 16px; }
          .qr-divider { margin: 0 48px; }
          .qr-item:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.1); }
        }

        @media (min-width: 1200px) {
          .qr-container { max-width: 1320px; }
          .qr-hero { height: 250px; }
          .qr-hero-content { padding: 36px 52px; }
          .qr-hero-top { padding: 20px 52px; }
          .qr-hero-top-text h1 { font-size: 28px; }
          .qr-search-wrap { padding: 0 52px; }
          .qr-cats { padding: 26px 52px 18px; }
          .qr-section-header { padding: 26px 52px 16px; }
          .qr-item-grid { padding: 0 52px 120px; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 14px; }
          .qr-featured-scroll { padding: 0 52px 18px; }
          .qr-divider { margin: 0 52px; }
          .qr-cat-icon { width: 58px; height: 58px; font-size: 24px; }
        }

        @media (min-width: 1600px) {
          .qr-container { max-width: 1600px; }
          .qr-hero { height: 270px; border-radius: 0 0 28px 28px; }
          .qr-hero-content { padding: 44px 60px; }
          .qr-hero-top { padding: 24px 60px; }
          .qr-hero-text h1 { font-size: 32px; }
          .qr-avatar { width: 64px; height: 64px; min-width: 64px; font-size: 28px; border-radius: 16px; }
          .qr-hero-badge { font-size: 13px; }
          .qr-search-wrap { padding: 0 60px; }
          .qr-cats { padding: 30px 60px 20px; }
          .qr-section-header { padding: 30px 60px 18px; }
          .qr-item-grid { padding: 0 60px 120px; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 16px; }
          .qr-featured-scroll { padding: 0 60px 20px; }
          .qr-divider { margin: 0 60px; }
        }

        /* Checkout flow */
        .checkout-sheet { padding-bottom: 0; }
        .checkout-header { display: flex; align-items: center; gap: 10px; padding: 20px 20px 0; }
        .checkout-step-badge { width: 26px; height: 26px; border-radius: 50%; background: var(--theme-primary, #1a1a2e); color: var(--theme-btn-text, #fff); display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 800; flex-shrink: 0; }
        .checkout-step-label { font-size: 13px; font-weight: 700; color: #1a1a1a; }
        .checkout-body { padding: 16px 20px 32px; }
        .checkout-field { margin-bottom: 14px; }
        .checkout-field label { display: block; font-size: 12px; font-weight: 700; color: #555; margin-bottom: 5px; }
        .checkout-field input { width: 100%; padding: 12px 14px; border: 1.5px solid #eee; border-radius: 12px; font-size: 14px; outline: none; transition: border 0.2s; background: #fafafa; }
        .checkout-field input:focus { border-color: var(--theme-primary, #1a1a2e); background: #fff; }
        .checkout-divider { height: 1px; background: #f0ede8; margin: 16px 0; }
        .checkout-pm-label { font-size: 12px; font-weight: 700; color: #555; margin-bottom: 8px; display: block; }
        .checkout-pm-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 16px; }
        .checkout-pm-btn { padding: 12px; border: 1.5px solid #eee; border-radius: 12px; background: #fafafa; cursor: pointer; text-align: left; transition: all 0.2s; }
        .checkout-pm-btn.active { border-color: var(--theme-primary, #1a1a2e); background: #fff; box-shadow: 0 0 0 2px rgba(0,0,0,0.04); }
        .checkout-pm-name { font-size: 13px; font-weight: 700; color: #1a1a1a; }
        .checkout-pm-acct { font-size: 11px; color: #888; margin-top: 2px; }
        .checkout-error { padding: 10px 14px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 10px; color: #dc2626; font-size: 12px; font-weight: 600; margin-bottom: 12px; }
        .checkout-next-btn { width: 100%; padding: 14px; background: var(--theme-btn, var(--theme-primary, #1a1a2e)); color: var(--theme-btn-text, #fff); border: none; border-radius: 14px; font-size: 15px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; }
        .checkout-next-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .checkout-review-info { background: #f9f9f9; border-radius: 12px; padding: 12px 14px; margin-bottom: 16px; }
        .checkout-info-row { display: flex; justify-content: space-between; font-size: 13px; padding: 4px 0; color: #555; }
        .checkout-info-row span:last-child { font-weight: 600; color: #1a1a1a; }
        .checkout-payment-detail { background: #f0fdf4; border: 1px solid #d1fae5; border-radius: 12px; padding: 14px; margin-bottom: 14px; }
        .checkout-pd-title { font-size: 12px; font-weight: 700; color: #166534; margin: 0 0 8px; }
        .checkout-pd-row { display: flex; justify-content: space-between; font-size: 13px; padding: 3px 0; color: #333; }
        .checkout-pd-desc { font-size: 12px; color: #666; margin-top: 6px; line-height: 1.5; }
        .checkout-qr { width: 120px; height: 120px; object-fit: contain; margin: 10px auto 0; display: block; border-radius: 8px; background: #fff; padding: 4px; border: 1px solid #eee; }
        .checkout-total-row { display: flex; justify-content: space-between; align-items: center; padding: 14px 0; font-size: 16px; color: #1a1a1a; border-top: 1px solid #eee; margin-bottom: 14px; }
        .checkout-upload-btn { width: 100%; padding: 12px; border: 1.5px dashed #ccc; border-radius: 12px; background: #fafafa; color: #666; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
        .checkout-upload-btn:hover { border-color: var(--theme-primary, #1a1a2e); color: var(--theme-primary, #1a1a2e); }
        .checkout-preview { width: 100%; max-height: 180px; object-fit: contain; border-radius: 10px; border: 1px solid #eee; margin-top: 8px; background: #fafafa; }
        .checkout-action-row { display: flex; gap: 10px; margin-top: 16px; }
        .checkout-back-btn { flex: 1; padding: 14px; border: 1.5px solid #ddd; border-radius: 14px; background: #fff; color: #666; font-size: 14px; font-weight: 700; cursor: pointer; }
        .checkout-order-btn { flex: 2; padding: 14px; border: none; border-radius: 14px; background: var(--theme-btn, var(--theme-primary, #1a1a2e)); color: var(--theme-btn-text, #fff); font-size: 14px; font-weight: 700; cursor: pointer; }
        .checkout-order-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .checkout-done-icon { font-size: 56px; margin-bottom: 8px; }
        .token-card-sheet { text-align: center; }
        .token-card-body { padding: 40px 20px; display: flex; flex-direction: column; align-items: center; }
        .token-card-icon { font-size: 56px; margin-bottom: 12px; animation: tokenBounce 0.6s ease-out; }
        .token-card-label { font-size: 14px; font-weight: 600; color: #888; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 1px; }
        .token-card-number { font-size: 56px; font-weight: 900; color: var(--theme-primary, #4f46e5); letter-spacing: 4px; margin: 0 0 12px; line-height: 1; }
        .token-card-hint { font-size: 13px; color: #aaa; margin: 0 0 24px; }
        .token-card-btn { max-width: 280px; margin: 0 auto; }
        @keyframes tokenBounce { 0% { transform: scale(0); } 50% { transform: scale(1.2); } 100% { transform: scale(1); } }

        /* Dynamic badge styles */
        .badge-new { background: #e0f2fe; color: #0369a1; }
        .badge-hot { background: #fee2e2; color: #b91c1c; }
        .badge-iced { background: #cffafe; color: #0e7490; }
        .badge-seasonal { background: #fef3c7; color: #b45309; }
        .badge-fresh { background: #ffedd5; color: #c2410c; }
        .badge-limited { background: #f3e8ff; color: #7e22ce; }
        .badge-sale { background: #fee2e2; color: #dc2626; }
        .badge-express { background: #fef3c7; color: #d97706; }
        .badge-relaxing { background: #e0e7ff; color: #4338ca; }
        .badge-premium { background: #f3e8ff; color: #7c3aed; }

        /* Closed page */
        .qr-page-closed { min-height: 100vh; background: linear-gradient(160deg, #1a1a2e 0%, #16213e 40%, #0f3460 100%); display: flex; align-items: center; justify-content: center; padding: 24px; position: relative; overflow: hidden; font-family: system-ui,-apple-system,sans-serif; }
        .qr-closed-bg-pattern { position: absolute; inset: 0; background-image: radial-gradient(circle at 25% 25%, rgba(255,255,255,0.03) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(255,255,255,0.03) 0%, transparent 50%); }
        .qr-closed-card { position: relative; background: rgba(255,255,255,0.06); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.1); border-radius: 32px; padding: 48px 36px 40px; max-width: 400px; width: 100%; text-align: center; box-shadow: 0 25px 60px rgba(0,0,0,0.3); }
        .qr-closed-icon-wrap { margin-bottom: 20px; }
        .qr-closed-icon-ring { position: relative; width: 80px; height: 80px; margin: 0 auto; display: flex; align-items: center; justify-content: center; }
        .qr-closed-icon-svg { position: absolute; inset: 0; width: 100%; height: 100%; color: rgba(255,255,255,0.25); animation: qrSpin 12s linear infinite; }
        .qr-closed-icon-emoji { font-size: 42px; line-height: 1; animation: qrPulse 2.5s ease-in-out infinite; }
        @keyframes qrSpin { to { transform: rotate(360deg); } }
        @keyframes qrPulse { 0%, 100% { transform: scale(1); opacity: 0.8; } 50% { transform: scale(1.1); opacity: 1; } }
        .qr-closed-brand { display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 16px; }
        .qr-closed-avatar { width: 36px; height: 36px; border-radius: 10px; object-fit: cover; }
        .qr-closed-avatar-fallback { background: rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center; font-size: 16px; }
        .qr-closed-name { color: rgba(255,255,255,0.5); font-size: 12px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; margin: 0; }
        .qr-closed-divider { width: 40px; height: 2px; background: rgba(255,255,255,0.15); border-radius: 1px; margin: 0 auto 20px; }
        .qr-closed-heading { font-size: 22px; font-weight: 800; color: #fff; margin: 0 0 10px; letter-spacing: -0.3px; }
        .qr-closed-desc { font-size: 14px; color: rgba(255,255,255,0.5); line-height: 1.6; margin: 0 0 24px; }
        .qr-closed-info { display: flex; flex-direction: column; gap: 8px; margin-bottom: 28px; }
        .qr-closed-info-item { display: flex; align-items: center; justify-content: center; gap: 6px; font-size: 12px; color: rgba(255,255,255,0.4); }
        .qr-closed-info-item svg { opacity: 0.5; flex-shrink: 0; }
        .qr-closed-ripple { display: flex; gap: 8px; justify-content: center; }
        .qr-closed-ripple-dot { width: 6px; height: 6px; border-radius: 50%; background: rgba(255,255,255,0.3); animation: qrRippleDot 1.8s ease-in-out infinite; }
        .qr-closed-ripple-dot:nth-child(2) { animation-delay: 0.3s; }
        .qr-closed-ripple-dot:nth-child(3) { animation-delay: 0.6s; }
        @keyframes qrRippleDot { 0%, 60%, 100% { transform: scale(1); opacity: 0.3; } 30% { transform: scale(1.6); opacity: 0.8; } }
      `}</style>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="qr-page" style={{background:'#f7f5f0'}}>
      <div style={{height:200,background:'linear-gradient(135deg,#1a1a2e,#16213e)'}} />
      <div style={{padding:'0 16px',marginTop:-20}}>
        <div style={{height:46,background:'#fff',borderRadius:14,boxShadow:'0 4px 20px rgba(0,0,0,0.12)'}} />
      </div>
      <div style={{display:'flex',gap:8,padding:'16px',overflow:'hidden',justifyContent:'center'}}>
        {[...Array(6)].map((_,i)=><div key={i} style={{width:54,height:74,background:'#fff',borderRadius:16,flexShrink:0}} />)}
      </div>
      <div style={{padding:'0 16px'}}>
        {[...Array(4)].map((_,i)=><div key={i} style={{height:88,background:'#fff',borderRadius:18,marginBottom:10}} />)}
      </div>
    </div>
  );
}
