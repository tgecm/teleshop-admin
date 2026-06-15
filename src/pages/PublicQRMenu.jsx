import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'motion/react';
import { THEMES, DEFAULT_THEME } from '../themes/themes';

const API_BASE = 'https://api.telegramecommerce.shop';

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
};

function formatPrice(n) { if (n == null || isNaN(n)) return '0'; return Number(n).toLocaleString(); }

function DetailModal({ item, shop, orderItems, onAddToOrder, onClose }) {
  const [qty, setQty] = useState(1);
  const [imgIdx, setImgIdx] = useState(0);
  const images = getItemImageUrls(item.image_url, shop?.id);
  const badges = item.badges || [];
  const existing = orderItems.find(oi => oi.item.id === item.id);
  const existingQty = existing ? existing.qty : 0;

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

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
          {item.description && <p className="modal-desc">{item.description}</p>}
          <div className="modal-price">{formatPrice(item.price)} <span>K</span></div>
          {existingQty > 0 && (
            <div className="modal-in-cart">× {existingQty} in your order</div>
          )}
          <div className="modal-qty-row">
            <span className="modal-qty-label">Quantity</span>
            <div className="modal-qty-ctrl">
              <button className="modal-qty-btn" onClick={() => { if (qty > 1) setQty(q => q - 1); }}>−</button>
              <span className="modal-qty-num">{qty}</span>
              <button className="modal-qty-btn" onClick={() => setQty(q => q + 1)}>+</button>
            </div>
          </div>
          <button className="modal-add-btn" onClick={() => onAddToOrder(item, qty)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg>
            <span>{existingQty > 0 ? `Add ${qty} more` : 'Add to order'} · {formatPrice(Number(item.price) * qty)} K</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function CartSheet({ orderItems, orderCount, orderTotal, shop, onUpdateQty, onRemoveItem, onClearAll, onClose, paymentMode, onProceed }) {
  return (
    <div className="cart-sheet-wrap">
      <div className="cart-sheet-bg" onClick={() => { if (orderCount === 0) onClose(); }}></div>
      <div className="cart-sheet-panel">
        <div className="cart-sheet-header">
          <h2 className="cart-sheet-title">🧾 Your Order</h2>
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
            return (
              <div key={oi.item.id} className="cart-sheet-item">
                <div className="cart-item-thumb">
                  {imgs[0] ? <img src={imgs[0]} alt={oi.item.name} /> : '🍽️'}
                </div>
                <div className="cart-item-info">
                  <div className="cart-item-name">{oi.item.name}</div>
                  <div className="cart-item-price">{formatPrice(oi.item.price)} K each</div>
                </div>
                <div className="cart-item-qty">
                  <button className="ciq-btn" onClick={() => onUpdateQty(oi.item.id, oi.qty - 1)}>−</button>
                  <span className="ciq-num">{oi.qty}</span>
                  <button className="ciq-btn" onClick={() => onUpdateQty(oi.item.id, oi.qty + 1)}>+</button>
                </div>
              </div>
            );
          })}
        </div>
        {orderItems.length > 0 && (
          <div className="cart-sheet-footer">
            <div className="cart-sheet-total">
              <span>Total</span>
              <span>{formatPrice(orderTotal)} K</span>
            </div>
            <div className="cart-sheet-actions">
              <button className="cs-btn cs-btn-secondary" onClick={onClearAll}>Clear</button>
              {paymentMode === 'prepaid' ? (
                <button className="cs-btn cs-btn-primary" onClick={onProceed}>
                  Proceed
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </button>
              ) : (
                <button className="cs-btn cs-btn-primary" onClick={onClose}>Done</button>
              )}
            </div>
            <p className="cart-sheet-hint">Share this list with the restaurant staff</p>
          </div>
        )}
      </div>
    </div>
  );
}

function CheckoutFlow({ orderItems, orderTotal, shop, paymentMethods, onBack, onSubmitOrder }) {
  const [step, setStep] = useState('form');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [proofFile, setProofFile] = useState(null);
  const [proofPreview, setProofPreview] = useState('');
  const [uploadingProof, setUploadingProof] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(null);
  const [copied, setCopied] = useState(false);

  const [showDoneDetail, setShowDoneDetail] = useState(false);

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
    if (!proofFile) { setError('Payment proof screenshot is required'); return; }
    setSubmitting(true);
    setError('');
    try {
      let paymentProof = '';
      setUploadingProof(true);
      const fd = new FormData();
      fd.append('file', proofFile);
      fd.append('bot_id', shop.id);
      const uploadRes = await fetch('https://api.telegramecommerce.shop/public/upload/photo', {
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
        price: oi.item.price,
        quantity: oi.qty,
      }));

      const res = await fetch('https://api.telegramecommerce.shop/public/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bot_id: shop.id,
          customer_name: 'Walk-in Customer',
          phone: '-',
          items,
          total_amount: orderTotal,
          payment_proof: paymentProof,
          payment_method: selectedPayment.name || 'prepaid',
          notes: 'QR Menu - Prepaid',
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
          <p style={{fontSize:14,color:'#888',marginBottom:16}}>Order #{done.order_number}</p>

          <div onClick={() => setShowDoneDetail(!showDoneDetail)} style={{cursor:'pointer',background:'#f9fafb',borderRadius:16,padding:'12px 16px',marginBottom:16,textAlign:'left'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
              <span style={{fontSize:14,fontWeight:700,color:'#374151'}}>Order Summary</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{color:'#9ca3af',transform:showDoneDetail?'rotate(180deg)':'none',transition:'transform 0.2s'}}><path d="M6 9l6 6 6-6"/></svg>
            </div>
            {doneItems.slice(0, showDoneDetail ? doneItems.length : 2).map((item, i) => (
              <div key={i} style={{display:'flex',justifyContent:'space-between',fontSize:13,color:'#6b7280',padding:'3px 0'}}>
                <span>{item.name || 'Item'} <span style={{color:'#9ca3af'}}>x{item.quantity || 1}</span></span>
                <span>{formatPrice((item.price || 0) * (item.quantity || 1))} K</span>
              </div>
            ))}
            {!showDoneDetail && doneItems.length > 2 && (
              <p style={{fontSize:12,color:'#9ca3af',textAlign:'center',marginTop:4}}>+{doneItems.length - 2} more items</p>
            )}
            <div style={{borderTop:'1px solid #e5e7eb',marginTop:8,paddingTop:8,display:'flex',justifyContent:'space-between',fontSize:15,fontWeight:800,color:'#111827'}}>
              <span>Total</span>
              <span>{formatPrice(done.final_amount || done.total_amount || orderTotal)} K</span>
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
                {paymentMethods.map(pm => (
                  <button key={pm.id} onClick={() => setSelectedPayment(pm)}
                    className={`checkout-pm-btn ${selectedPayment?.id === pm.id ? 'active' : ''}`}>
                    <div className="checkout-pm-name">{pm.name}</div>
                    {pm.account_name && <div className="checkout-pm-acct">{pm.account_name}</div>}
                  </button>
                ))}
                {paymentMethods.length === 0 && <p className="text-sm text-gray-400 col-span-2 text-center py-4">No payment methods available</p>}
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
                {getPaymentQrUrl(selectedPayment) && (
                  <img src={getPaymentQrUrl(selectedPayment)} alt="Payment QR" className="checkout-qr" />
                )}
              </div>
              <div className="checkout-total-row">
                <span>Total Amount</span>
                <span className="font-bold">{formatPrice(orderTotal)} K</span>
              </div>
              <p style={{fontSize:13,color:'#6b7280',margin:'8px 0 12px',lineHeight:1.5}}>
                Please transfer {formatPrice(orderTotal)} MMK to {selectedPayment?.name || ''} {selectedPayment?.payment_number || ''} and upload screenshot
              </p>
              <div className="checkout-field">
                <label>Payment Proof (screenshot) <span className="text-rose-500">*</span></label>
                <button className="checkout-upload-btn" onClick={() => document.getElementById('proof-input')?.click()}>
                  {proofPreview ? 'Change Screenshot' : 'Upload Screenshot'}
                </button>
                <input id="proof-input" type="file" accept="image/*" className="hidden" onChange={handleProofFile} />
                {proofPreview && <img src={proofPreview} alt="Preview" className="checkout-preview" />}
                {uploadingProof && <p className="text-xs text-gray-400 mt-1">Uploading...</p>}
              </div>
              {error && <div className="checkout-error">{error}</div>}
              <div className="checkout-action-row">
                <button className="checkout-back-btn" onClick={() => setStep('form')} disabled={submitting}>Back</button>
                <button className="checkout-order-btn" onClick={handleSubmit} disabled={submitting || !proofFile}>
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

export default function PublicQRMenu({ slug }) {
  const [activeCat, setActiveCat] = useState('all');
  const [searchQ, setSearchQ] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [showCart, setShowCart] = useState(false);
  const [viewMode, setViewMode] = useState('list');
  const [showCheckout, setShowCheckout] = useState(false);
  const [orderItems, setOrderItems] = useState([]);
  const [bannerSlide, setBannerSlide] = useState(0);
  const bannerTouchRef = useRef(null);
  const searchRef = useRef(null);
  const catScrollRef = useRef(null);
  const catDrag = useRef({ isDown: false, startX: 0, scrollLeft: 0 });

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
    enabled: !!slug, retry: 2, staleTime: 30000,
  });

  const shop = data?.shop;
  const items = data?.items || [];
  const categories = data?.categories || [];
  const paymentMethods = data?.payment_methods || [];
  const paymentMode = data?.payment_mode || 'postpaid';
  const themeName = data?.theme || DEFAULT_THEME;
  const theme = THEMES[themeName] || THEMES[DEFAULT_THEME];

  useEffect(() => {
    document.title = shop?.bot_full_name || 'Menu';
    const icon = document.querySelector('link[rel="icon"]');
    if (icon && shop?.profile_picture) icon.setAttribute('href', shop.profile_picture);
    return () => { document.title = 'E-commerce Myanmar'; };
  }, [shop]);

  // Banner slideshow
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
  const orderTotal = useMemo(() => orderItems.reduce((s, oi) => s + oi.qty * Number(oi.item.price), 0), [orderItems]);

  const addToOrder = useCallback((item, qty) => {
    setOrderItems(prev => {
      const ex = prev.find(oi => oi.item.id === item.id);
      if (ex) return prev.map(oi => oi.item.id === item.id ? { ...oi, qty: oi.qty + qty } : oi);
      return [...prev, { item, qty }];
    });
    setSelectedItem(null);
  }, []);

  const updateQty = useCallback((id, qty) => {
    if (qty <= 0) { setOrderItems(prev => prev.filter(oi => oi.item.id !== id)); return; }
    setOrderItems(prev => prev.map(oi => oi.item.id === id ? { ...oi, qty } : oi));
  }, []);

  const removeItem = useCallback((id) => setOrderItems(prev => prev.filter(oi => oi.item.id !== id)), []);
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

  if (data?.is_open === false) {
    return (
      <div className="qr-page">
        <div className="qr-empty" style={{background:'#f7f5f0'}}>
          <div className="qr-empty-inner">
            <div style={{fontSize:56,marginBottom:12}}>🕐</div>
            <p className="qr-closed-label">{shop.bot_full_name}</p>
            <h2>Currently Closed</h2>
            <p>The restaurant is currently closed. Please check back later.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="qr-page" style={theme.css}>
      <div className="qr-container">
        {/* Hero */}
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
            <button className={`qr-hero-orders-btn ${orderCount > 0 ? 'visible' : ''}`} onClick={() => setShowCart(true)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg>
              <span>{orderCount > 0 ? `${formatPrice(orderTotal)} K` : 'Orders'}</span>
              {orderCount > 0 && <span className="qr-hero-order-count">{orderCount}</span>}
            </button>
          </div>
          <div className="qr-hero-content">
            <div className="qr-hero-meta">
              {shop.location && <span className="qr-hero-badge"><i className="ti ti-map-pin"></i> {shop.location}</span>}
              {shop.description && <span className="qr-hero-badge"><i className="ti ti-info-circle"></i> Dine in & Takeaway</span>}
            </div>
          </div>
        </div>

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
                        <div className="qr-featured-price">{formatPrice(item.price)} <span>K</span></div>
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
            <span className="qr-section-title">{searchQ ? `Results for "${searchQ}"` : activeCat === 'all' ? 'All Items' : catById[activeCat]?.name || 'Items'}</span>
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
                const inOrder = orderItems.find(oi => oi.item.id === item.id);
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
                        <div className="qr-item-price">{formatPrice(item.price)} <span>K</span></div>
                        {inOrder && <span className="qr-item-in-cart">× {inOrder.qty}</span>}
                      </div>
                    </div>
                    {inOrder ? (
                      <div className="qr-item-qty-ctrl">
                        <button className="qr-item-qty-btn" onClick={(e) => { e.stopPropagation(); updateQty(item.id, inOrder.qty - 1); }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14"/></svg>
                        </button>
                        <span className="qr-item-qty-num">{inOrder.qty}</span>
                        <button className="qr-item-qty-btn" onClick={(e) => { e.stopPropagation(); addToOrder(item, 1); }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
                        </button>
                      </div>
                    ) : (
                      <button className="qr-item-add" onClick={(e) => { e.stopPropagation(); addToOrder(item, 1); }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
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
                const inOrder = orderItems.find(oi => oi.item.id === item.id);
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
                        <div className="qr-grid-price">{formatPrice(item.price)} <span>K</span></div>
                        <div onClick={(e) => e.stopPropagation()}>
                          {inOrder ? (
                            <div className="qr-grid-qty-ctrl">
                              <button className="qr-grid-qty-btn" onClick={(e) => { e.stopPropagation(); updateQty(item.id, inOrder.qty - 1); }}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14"/></svg>
                              </button>
                              <span className="qr-grid-qty-num">{inOrder.qty}</span>
                              <button className="qr-grid-qty-btn" onClick={(e) => { e.stopPropagation(); addToOrder(item, 1); }}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
                              </button>
                            </div>
                          ) : (
                            <button className="qr-grid-add" onClick={(e) => { e.stopPropagation(); addToOrder(item, 1); }}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
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

      {/* Modals */}
      <AnimatePresence>
        {selectedItem && (
          <DetailModal item={selectedItem} shop={shop} orderItems={orderItems} onAddToOrder={addToOrder} onClose={() => setSelectedItem(null)} />
        )}
      </AnimatePresence>

<AnimatePresence>
        {showCart && (
          <CartSheet orderItems={orderItems} orderCount={orderCount} orderTotal={orderTotal} shop={shop}
            onUpdateQty={updateQty} onRemoveItem={removeItem} onClearAll={clearAll}
            onClose={() => setShowCart(false)} paymentMode={paymentMode}
            onProceed={() => { setShowCart(false); setShowCheckout(true); }} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCheckout && (
          <CheckoutFlow orderItems={orderItems} orderTotal={orderTotal} shop={shop}
            paymentMethods={paymentMethods}
            onBack={() => { setShowCheckout(false); setShowCart(true); }}
            onSubmitOrder={() => { setShowCheckout(false); setOrderItems([]); }} />
        )}
      </AnimatePresence>

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
