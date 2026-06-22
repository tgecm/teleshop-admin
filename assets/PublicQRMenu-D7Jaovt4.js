import{a8 as n,aw as be,a0 as e,A as L,a as de}from"./index-CaCKmcev.js";import{D as xe,T as he}from"./index-2IO8qX9j.js";const ge=["🍽️","🍚","🍜","🍲","🔥","🥗","🥤","🍮","🥩","🌯","🥟","🍕","🥪","🧆","🫘","🥘","🫕","🥫","🍱"];function Y(o,h){if(!o)return[];try{const m=JSON.parse(o);if(Array.isArray(m))return m.map(q=>`${L}/telegram/file/${encodeURIComponent(q.file_id)}?bot_id=${h}`)}catch{}return[`${L}/telegram/file/${encodeURIComponent(o)}?bot_id=${h}`]}const le={popular:{cls:"badge-popular",label:"⭐ Popular"},spicy:{cls:"badge-spicy",label:"🌶️ Spicy"},vegetarian:{cls:"badge-veg",label:"🥬 Veg"},vegan:{cls:"badge-veg",label:"🌱 Vegan"},"gluten-free":{cls:"badge-gf",label:"🌾 GF"}};function S(o){return o==null||isNaN(o)?"0":Number(o).toLocaleString()}function ve({item:o,shop:h,orderItems:m,onAddToOrder:q,onClose:g}){const[w,_]=n.useState(1),[j,B]=n.useState(0),y=Y(o.image_url,h==null?void 0:h.id),f=o.badges||[],P=m.find(t=>t.item.id===o.id),O=P?P.qty:0;return n.useEffect(()=>{const t=d=>{d.key==="Escape"&&g()};return window.addEventListener("keydown",t),()=>window.removeEventListener("keydown",t)},[g]),e.jsx("div",{className:"modal-overlay",onClick:t=>{t.target===t.currentTarget&&g()},children:e.jsxs("div",{className:"modal-sheet",children:[e.jsx("button",{className:"modal-close",onClick:g,children:e.jsx("svg",{width:"18",height:"18",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2.5",children:e.jsx("path",{d:"M18 6L6 18M6 6l12 12"})})}),e.jsx("div",{className:"modal-image",children:y.length>0?e.jsxs(e.Fragment,{children:[y.length>1&&e.jsx("button",{className:"modal-nav modal-nav-prev",onClick:t=>{t.stopPropagation(),B(d=>d===0?y.length-1:d-1)},children:"‹"}),e.jsx("img",{src:y[j],alt:o.name}),y.length>1&&e.jsxs(e.Fragment,{children:[e.jsx("button",{className:"modal-nav modal-nav-next",onClick:t=>{t.stopPropagation(),B(d=>(d+1)%y.length)},children:"›"}),e.jsx("div",{className:"modal-dots",children:y.map((t,d)=>e.jsx("button",{onClick:k=>{k.stopPropagation(),B(d)},className:`modal-dot ${j===d?"active":""}`},d))})]})]}):e.jsx("span",{style:{fontSize:70},children:"🍽️"})}),e.jsxs("div",{className:"modal-body",children:[f.length>0&&e.jsx("div",{className:"modal-badges",children:f.map(t=>{const d=le[t];return d?e.jsx("span",{className:`modal-badge ${d.cls}`,children:d.label},t):null})}),e.jsx("h2",{className:"modal-name",children:o.name}),o.description&&e.jsx("p",{className:"modal-desc",children:o.description}),e.jsxs("div",{className:"modal-price",children:[S(o.price)," ",e.jsx("span",{children:"K"})]}),O>0&&e.jsxs("div",{className:"modal-in-cart",children:["× ",O," in your order"]}),e.jsxs("div",{className:"modal-qty-row",children:[e.jsx("span",{className:"modal-qty-label",children:"Quantity"}),e.jsxs("div",{className:"modal-qty-ctrl",children:[e.jsx("button",{className:"modal-qty-btn",onClick:()=>{w>1&&_(t=>t-1)},children:"−"}),e.jsx("span",{className:"modal-qty-num",children:w}),e.jsx("button",{className:"modal-qty-btn",onClick:()=>_(t=>t+1),children:"+"})]})]}),e.jsxs("button",{className:"modal-add-btn",onClick:()=>q(o,w),children:[e.jsxs("svg",{width:"18",height:"18",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",children:[e.jsx("circle",{cx:"9",cy:"21",r:"1"}),e.jsx("circle",{cx:"20",cy:"21",r:"1"}),e.jsx("path",{d:"M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"})]}),e.jsxs("span",{children:[O>0?`Add ${w} more`:"Add to order"," · ",S(Number(o.price)*w)," K"]})]})]})]})})}function je({orderItems:o,orderCount:h,orderTotal:m,shop:q,onUpdateQty:g,onRemoveItem:w,onClearAll:_,onClose:j,paymentMode:B,onProceed:y}){return e.jsxs("div",{className:"cart-sheet-wrap",children:[e.jsx("div",{className:"cart-sheet-bg",onClick:()=>{h===0&&j()}}),e.jsxs("div",{className:"cart-sheet-panel",children:[e.jsxs("div",{className:"cart-sheet-header",children:[e.jsx("h2",{className:"cart-sheet-title",children:"🧾 Your Order"}),e.jsx("button",{onClick:j,className:"cart-sheet-x",children:e.jsx("svg",{width:"20",height:"20",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",children:e.jsx("path",{d:"M18 6L6 18M6 6l12 12"})})})]}),e.jsx("div",{className:"cart-sheet-list",children:o.length===0?e.jsxs("div",{className:"cart-sheet-empty",children:[e.jsxs("svg",{width:"40",height:"40",viewBox:"0 0 24 24",fill:"none",stroke:"#ddd",strokeWidth:"1.5",style:{display:"block",margin:"0 auto 10px"},children:[e.jsx("circle",{cx:"9",cy:"21",r:"1"}),e.jsx("circle",{cx:"20",cy:"21",r:"1"}),e.jsx("path",{d:"M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"})]}),"Nothing here yet!"]}):o.map(f=>{const P=Y(f.item.image_url,q==null?void 0:q.id);return e.jsxs("div",{className:"cart-sheet-item",children:[e.jsx("div",{className:"cart-item-thumb",children:P[0]?e.jsx("img",{src:P[0],alt:f.item.name}):"🍽️"}),e.jsxs("div",{className:"cart-item-info",children:[e.jsx("div",{className:"cart-item-name",children:f.item.name}),e.jsxs("div",{className:"cart-item-price",children:[S(f.item.price)," K each"]})]}),e.jsxs("div",{className:"cart-item-qty",children:[e.jsx("button",{className:"ciq-btn",onClick:()=>g(f.item.id,f.qty-1),children:"−"}),e.jsx("span",{className:"ciq-num",children:f.qty}),e.jsx("button",{className:"ciq-btn",onClick:()=>g(f.item.id,f.qty+1),children:"+"})]})]},f.item.id)})}),o.length>0&&e.jsxs("div",{className:"cart-sheet-footer",children:[e.jsxs("div",{className:"cart-sheet-total",children:[e.jsx("span",{children:"Total"}),e.jsxs("span",{children:[S(m)," K"]})]}),e.jsxs("div",{className:"cart-sheet-actions",children:[e.jsx("button",{className:"cs-btn cs-btn-secondary",onClick:_,children:"Clear"}),B==="prepaid"?e.jsxs("button",{className:"cs-btn cs-btn-primary",onClick:y,children:["Proceed",e.jsx("svg",{width:"16",height:"16",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2.5",children:e.jsx("path",{d:"M5 12h14M12 5l7 7-7 7"})})]}):e.jsx("button",{className:"cs-btn cs-btn-primary",onClick:j,children:"Done"})]}),e.jsx("p",{className:"cart-sheet-hint",children:"Share this list with the restaurant staff"})]})]})]})}function ye({orderItems:o,orderTotal:h,shop:m,paymentMethods:q,onBack:g,onSubmitOrder:w,tableProp:_}){const[j,B]=n.useState("form"),[y,f]=n.useState(""),[P,O]=n.useState(""),[t,d]=n.useState(null),[k,G]=n.useState(null),[I,J]=n.useState(""),[ae,R]=n.useState(!1),[F,M]=n.useState(!1),[N,U]=n.useState(""),[A,Z]=n.useState(null),[c,ee]=n.useState(!1),[K,ne]=n.useState(!1);function i(s){return s!=null&&s.qr_code_url?s.qr_code_url.startsWith("http")?s.qr_code_url:`${L}/telegram/file/${encodeURIComponent(s.qr_code_url)}?bot_id=${m.id}`:null}const H=s=>{navigator.clipboard.writeText(s),ee(!0),setTimeout(()=>ee(!1),2e3)},Q=s=>{var D;const b=(D=s.target.files)==null?void 0:D[0];if(!b)return;const T=new FileReader;T.onload=()=>{const z=new Image;z.src=T.result,z.onload=()=>{let x=z.naturalWidth,v=z.naturalHeight;const $=854;(x>$||v>$*.75)&&(x>v?(v=v/x*$,x=$):(x=x/v*($*.75),v=$*.75));const W=document.createElement("canvas");W.width=x,W.height=v,W.getContext("2d").drawImage(z,0,0,x,v),W.toBlob(E=>{G(new File([E],b.name.replace(/\.[^.]+$/,".jpg"),{type:"image/jpeg"})),J(W.toDataURL("image/jpeg",.85))},"image/jpeg",.85)}},T.readAsDataURL(b)},se=async()=>{if(!t){U("Please select a payment method");return}if(!k){U("Payment proof screenshot is required");return}M(!0),U("");try{let s="";R(!0);const b=new FormData;b.append("file",k),b.append("bot_id",m.id);const T=await fetch(`${L}/public/upload/photo`,{method:"POST",body:b});T.ok&&(s=(await T.json()).file_id||""),R(!1);const D=o.map(v=>({item_id:v.item.id,name:v.item.name,price:v.item.price,quantity:v.qty})),z=await fetch(`${L}/public/create-order`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({bot_id:m.id,customer_name:"Walk-in Customer",phone:"-",items:D,total_amount:h,payment_proof:s,payment_method:t.name||"prepaid",notes:_?`Table ${_}`:"QR Menu - Prepaid"})}),x=await z.json();if(!z.ok)throw new Error(x.detail||"Failed to place order");Z(x)}catch(s){U(s.message)}finally{M(!1),R(!1)}};if(A){const s=(()=>{try{return typeof A.items=="string"?JSON.parse(A.items):A.items||[]}catch{return[]}})();return e.jsx("div",{className:"modal-overlay",onClick:b=>{b.target===b.currentTarget&&w()},children:e.jsxs("div",{className:"modal-sheet",style:{padding:"32px 20px 24px",textAlign:"center"},children:[e.jsx("div",{className:"checkout-done-icon",children:"✅"}),e.jsx("h2",{style:{fontSize:22,fontWeight:800,margin:"12px 0 4px"},children:"Order Placed!"}),e.jsxs("p",{style:{fontSize:14,color:"#888",marginBottom:16},children:["Order #",A.order_number]}),e.jsxs("div",{onClick:()=>ne(!K),style:{cursor:"pointer",background:"#f9fafb",borderRadius:16,padding:"12px 16px",marginBottom:16,textAlign:"left"},children:[e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8},children:[e.jsx("span",{style:{fontSize:14,fontWeight:700,color:"#374151"},children:"Order Summary"}),e.jsx("svg",{width:"16",height:"16",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2.5",style:{color:"#9ca3af",transform:K?"rotate(180deg)":"none",transition:"transform 0.2s"},children:e.jsx("path",{d:"M6 9l6 6 6-6"})})]}),s.slice(0,K?s.length:2).map((b,T)=>e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",fontSize:13,color:"#6b7280",padding:"3px 0"},children:[e.jsxs("span",{children:[b.name||"Item"," ",e.jsxs("span",{style:{color:"#9ca3af"},children:["x",b.quantity||1]})]}),e.jsxs("span",{children:[S((b.price||0)*(b.quantity||1))," K"]})]},T)),!K&&s.length>2&&e.jsxs("p",{style:{fontSize:12,color:"#9ca3af",textAlign:"center",marginTop:4},children:["+",s.length-2," more items"]}),e.jsxs("div",{style:{borderTop:"1px solid #e5e7eb",marginTop:8,paddingTop:8,display:"flex",justifyContent:"space-between",fontSize:15,fontWeight:800,color:"#111827"},children:[e.jsx("span",{children:"Total"}),e.jsxs("span",{children:[S(A.final_amount||A.total_amount||h)," K"]})]})]}),e.jsx("p",{style:{fontSize:13,color:"#aaa",marginBottom:20},children:"Share order number with restaurant staff"}),e.jsx("button",{className:"modal-add-btn",onClick:()=>{w()},children:"Back to Menu"})]})})}return e.jsx("div",{className:"modal-overlay",onClick:s=>{s.target===s.currentTarget&&!F&&g()},children:e.jsxs("div",{className:"modal-sheet checkout-sheet",children:[e.jsx("button",{className:"modal-close",onClick:g,children:e.jsx("svg",{width:"18",height:"18",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2.5",children:e.jsx("path",{d:"M18 6L6 18M6 6l12 12"})})}),j==="form"&&e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"checkout-header",children:[e.jsx("div",{className:"checkout-step-badge active",children:"1"}),e.jsx("span",{className:"checkout-step-label",children:"Payment Method"})]}),e.jsxs("div",{className:"checkout-body",children:[e.jsx("label",{className:"checkout-pm-label",children:"Choose Payment Method"}),e.jsxs("div",{className:"checkout-pm-grid",children:[q.map(s=>e.jsxs("button",{onClick:()=>d(s),className:`checkout-pm-btn ${(t==null?void 0:t.id)===s.id?"active":""}`,children:[e.jsx("div",{className:"checkout-pm-name",children:s.name}),s.account_name&&e.jsx("div",{className:"checkout-pm-acct",children:s.account_name})]},s.id)),q.length===0&&e.jsx("p",{className:"text-sm text-gray-400 col-span-2 text-center py-4",children:"No payment methods available"})]}),N&&e.jsx("div",{className:"checkout-error",children:N}),e.jsxs("button",{className:"checkout-next-btn",disabled:!t,onClick:()=>B("review"),children:["Next",e.jsx("svg",{width:"16",height:"16",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2.5",children:e.jsx("path",{d:"M5 12h14M12 5l7 7-7 7"})})]})]})]}),j==="review"&&e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"checkout-header",children:[e.jsx("div",{className:"checkout-step-badge active",children:"2"}),e.jsx("span",{className:"checkout-step-label",children:"Payment Confirmation"})]}),e.jsxs("div",{className:"checkout-body",children:[e.jsx("div",{className:"checkout-review-info",children:e.jsxs("div",{className:"checkout-info-row",children:[e.jsx("span",{children:"Payment"}),e.jsx("span",{children:t==null?void 0:t.name})]})}),e.jsxs("div",{className:"checkout-payment-detail",children:[e.jsx("p",{className:"checkout-pd-title",children:"Transfer to:"}),e.jsxs("div",{className:"checkout-pd-row",children:[e.jsx("span",{children:"Account"}),e.jsx("span",{className:"font-bold",children:(t==null?void 0:t.account_name)||"N/A"})]}),e.jsxs("div",{className:"checkout-pd-row",children:[e.jsx("span",{children:"Number"}),e.jsxs("span",{className:"font-bold",style:{display:"flex",alignItems:"center",gap:6},children:[(t==null?void 0:t.payment_number)||"N/A",(t==null?void 0:t.payment_number)&&e.jsxs("button",{onClick:()=>H(t.payment_number),style:{border:"none",background:"#f3f4f6",padding:"4px 8px",borderRadius:8,cursor:"pointer",fontSize:12,color:"#6b7280",display:"flex",alignItems:"center",gap:3},children:[e.jsxs("svg",{width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",children:[e.jsx("rect",{x:"9",y:"9",width:"13",height:"13",rx:"2",ry:"2"}),e.jsx("path",{d:"M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"})]}),c?"Copied!":"Copy"]})]})]}),(t==null?void 0:t.description)&&e.jsx("p",{className:"checkout-pd-desc",children:t.description}),(t==null?void 0:t.notes)&&e.jsxs("p",{className:"checkout-pd-desc",style:{color:"#e67e22"},children:["📌 ",t.notes]}),i(t)&&e.jsx("img",{src:i(t),alt:"Payment QR",className:"checkout-qr"})]}),e.jsxs("div",{className:"checkout-total-row",children:[e.jsx("span",{children:"Total Amount"}),e.jsxs("span",{className:"font-bold",children:[S(h)," K"]})]}),e.jsxs("p",{style:{fontSize:13,color:"#6b7280",margin:"8px 0 12px",lineHeight:1.5},children:["Please transfer ",S(h)," MMK to ",(t==null?void 0:t.name)||""," ",(t==null?void 0:t.payment_number)||""," and upload screenshot"]}),e.jsxs("div",{className:"checkout-field",children:[e.jsxs("label",{children:["Payment Proof (screenshot) ",e.jsx("span",{className:"text-rose-500",children:"*"})]}),e.jsx("button",{className:"checkout-upload-btn",onClick:()=>{var s;return(s=document.getElementById("proof-input"))==null?void 0:s.click()},children:I?"Change Screenshot":"Upload Screenshot"}),e.jsx("input",{id:"proof-input",type:"file",accept:"image/*",className:"hidden",onChange:Q}),I&&e.jsx("img",{src:I,alt:"Preview",className:"checkout-preview"}),ae&&e.jsx("p",{className:"text-xs text-gray-400 mt-1",children:"Uploading..."})]}),N&&e.jsx("div",{className:"checkout-error",children:N}),e.jsxs("div",{className:"checkout-action-row",children:[e.jsx("button",{className:"checkout-back-btn",onClick:()=>B("form"),disabled:F,children:"Back"}),e.jsx("button",{className:"checkout-order-btn",onClick:se,disabled:F||!k,children:F?"Placing Order...":"Done, Order now"})]})]})]})]})})}function Ne({slug:o,table:h}){var pe;const[m,q]=n.useState("all"),[g,w]=n.useState(""),[_,j]=n.useState(null),[B,y]=n.useState(!1),[f,P]=n.useState("list"),[O,t]=n.useState(!1),[d,k]=n.useState([]),[G,I]=n.useState(0),[J,ae]=n.useState(!1),R=n.useRef(null),F=n.useRef(null),M=n.useRef(null),N=n.useRef({isDown:!1,startX:0,scrollLeft:0}),U=r=>{N.current.isDown=!0,N.current.startX=r.pageX-M.current.offsetLeft,N.current.scrollLeft=M.current.scrollLeft,M.current.style.cursor="grabbing"},A=r=>{if(!N.current.isDown)return;r.preventDefault();const l=(r.pageX-M.current.offsetLeft-N.current.startX)*1.5;M.current.scrollLeft=N.current.scrollLeft-l},Z=()=>{N.current.isDown=!1,M.current&&(M.current.style.cursor="grab")},{data:c,isLoading:ee,error:K,refetch:ne}=be({queryKey:["public-qr-menu",o],queryFn:()=>fetch(L+"/public/qr-menu/"+o).then(r=>{if(!r.ok)throw new Error("Not found");return r.json()}),enabled:!!o,retry:2,staleTime:3e4,refetchInterval:6e4}),i=c==null?void 0:c.shop,H=(c==null?void 0:c.items)||[],Q=(c==null?void 0:c.categories)||[],se=(c==null?void 0:c.payment_methods)||[],s=(c==null?void 0:c.payment_mode)||"postpaid",b=(c==null?void 0:c.theme)||xe,T=he[b]||he[xe],D=(c==null?void 0:c.is_open)!==!1,z=J&&!D;n.useEffect(()=>{document.title=(i==null?void 0:i.bot_full_name)||"Menu";const r=document.querySelector('link[rel="icon"]');return r&&(i!=null&&i.profile_picture)&&r.setAttribute("href",i.profile_picture),()=>{document.title="E-commerce Myanmar"}},[i]),n.useEffect(()=>{c&&D&&ae(!0)},[c,D]);const x=(c==null?void 0:c.banners)||[];n.useEffect(()=>{if(x.length<=1)return;const r=setInterval(()=>I(a=>(a+1)%x.length),5e3);return()=>clearInterval(r)},[x.length]);const v=r=>{I(a=>r==="next"?(a+1)%x.length:a===0?x.length-1:a-1)},$=n.useMemo(()=>{const r=Q.map((a,l)=>({...a,emoji:a.icon||ge[(l+1)%ge.length]}));return[{id:"all",name:"All",emoji:"🍽️"},...r]},[Q]),W=n.useMemo(()=>H.filter(r=>{var l,u;if(!(m==="all"||r.category_id===m))return!1;if(g){const p=g.toLowerCase();return((l=r.name)==null?void 0:l.toLowerCase().includes(p))||((u=r.description)==null?void 0:u.toLowerCase().includes(p))}return!0}),[H,m,g]),re=n.useMemo(()=>H.filter(r=>(r.badges||[]).includes("popular")),[H]),E=n.useMemo(()=>d.reduce((r,a)=>r+a.qty,0),[d]),oe=n.useMemo(()=>d.reduce((r,a)=>r+a.qty*Number(a.item.price),0),[d]),V=n.useCallback((r,a)=>{z||(k(l=>l.find(p=>p.item.id===r.id)?l.map(p=>p.item.id===r.id?{...p,qty:p.qty+a}:p):[...l,{item:r,qty:a}]),j(null))},[z]),ce=n.useCallback((r,a)=>{if(a<=0){k(l=>l.filter(u=>u.item.id!==r));return}k(l=>l.map(u=>u.item.id===r?{...u,qty:a}:u))},[]),me=n.useCallback(r=>k(a=>a.filter(l=>l.item.id!==r)),[]),fe=n.useCallback(()=>k([]),[]),te=n.useMemo(()=>{const r={};return Q.forEach(a=>r[a.id]=a),r},[Q]);if(ee)return e.jsx(qe,{});if(K||!i)return e.jsx("div",{className:"qr-page",children:e.jsx("div",{className:"qr-empty",style:{background:"#f7f5f0"},children:e.jsxs("div",{className:"qr-empty-inner",children:[e.jsx("div",{style:{fontSize:48,marginBottom:12},children:"🔍"}),e.jsx("h2",{children:"Menu Not Found"}),e.jsx("p",{children:"This menu doesn't exist or is unavailable."}),e.jsx("button",{className:"qr-retry-btn",onClick:()=>ne(),children:"Try Again"})]})})});if(!D&&!J)return e.jsxs("div",{className:"qr-page-closed",children:[e.jsx("div",{className:"qr-closed-bg-pattern"}),e.jsxs("div",{className:"qr-closed-card",children:[e.jsx("div",{className:"qr-closed-icon-wrap",children:e.jsxs("div",{className:"qr-closed-icon-ring",children:[e.jsx("svg",{className:"qr-closed-icon-svg",viewBox:"0 0 100 100",fill:"none",children:e.jsx("circle",{cx:"50",cy:"50",r:"45",stroke:"currentColor",strokeWidth:"1.5",strokeDasharray:"4 4",opacity:"0.3"})}),e.jsx("span",{className:"qr-closed-icon-emoji",children:"🕐"})]})}),e.jsxs("div",{className:"qr-closed-brand",children:[i!=null&&i.profile_picture?e.jsx("img",{src:i.profile_picture,alt:"",className:"qr-closed-avatar"}):e.jsx("div",{className:"qr-closed-avatar qr-closed-avatar-fallback",children:"🍽️"}),e.jsx("p",{className:"qr-closed-name",children:i.bot_full_name})]}),e.jsx("div",{className:"qr-closed-divider"}),e.jsx("h2",{className:"qr-closed-heading",children:"We're Currently Closed"}),e.jsx("p",{className:"qr-closed-desc",children:"The restaurant is currently closed. Please check back later during operating hours."}),e.jsxs("div",{className:"qr-closed-info",children:[e.jsxs("div",{className:"qr-closed-info-item",children:[e.jsxs("svg",{width:"16",height:"16",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",children:[e.jsx("circle",{cx:"12",cy:"12",r:"10"}),e.jsx("path",{d:"M12 6v6l4 2"})]}),e.jsx("span",{children:"Opens again soon"})]}),(i==null?void 0:i.location)&&e.jsxs("div",{className:"qr-closed-info-item",children:[e.jsxs("svg",{width:"16",height:"16",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",children:[e.jsx("path",{d:"M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"}),e.jsx("circle",{cx:"12",cy:"10",r:"3"})]}),e.jsx("span",{children:i.location})]})]}),e.jsxs("div",{className:"qr-closed-ripple",children:[e.jsx("div",{className:"qr-closed-ripple-dot"}),e.jsx("div",{className:"qr-closed-ripple-dot"}),e.jsx("div",{className:"qr-closed-ripple-dot"})]})]}),e.jsx("style",{children:`
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
        `})]});const ue=(()=>{var a;const r=(a=i==null?void 0:i.plan_name)==null?void 0:a.toLowerCase();return r!=="free"&&r!=="basic"?null:e.jsxs("a",{href:"https://t.me/tg_ecommerce_official_bot?start=newbot",target:"_blank",rel:"noopener noreferrer",style:{display:"block",background:"#fef3c7",borderBottom:"1px solid #f59e0b",padding:"5px 16px",textAlign:"center",fontSize:"11px",color:"#92400e",fontWeight:500,letterSpacing:"0.01em",textDecoration:"none"},children:["Want this kind of E-commerce? ",e.jsx("span",{style:{textDecoration:"underline",fontWeight:600},children:"Get here"})]})})();return e.jsxs("div",{className:"qr-page",style:T.css,children:[ue,e.jsxs("div",{className:"qr-container",children:[z&&e.jsxs("div",{className:"qr-closed-banner",children:[e.jsx("div",{className:"qr-closed-banner-icon",children:"🕐"}),e.jsxs("div",{className:"qr-closed-banner-text",children:[e.jsx("span",{className:"qr-closed-banner-title",children:"Shop is now closed"}),e.jsx("span",{className:"qr-closed-banner-desc",children:"Menu viewing only — ordering is disabled"})]})]}),e.jsxs("div",{className:"qr-hero",children:[x.length>0&&e.jsxs("div",{className:"qr-hero-slides",onTouchStart:r=>{R.current=r.touches[0].clientX},onTouchEnd:r=>{if(R.current===null)return;const a=R.current-r.changedTouches[0].clientX;Math.abs(a)>50&&v(a>0?"next":"prev"),R.current=null},children:[x.map((r,a)=>{const l=`${L}/telegram/file/${encodeURIComponent(r.file_id)}?bot_id=${i==null?void 0:i.id}`;return e.jsx("div",{className:`qr-hero-slide ${a===G?"active":""}`,children:e.jsx("img",{src:l,alt:""})},r.file_id||a)}),e.jsx("div",{className:"qr-hero-overlay"}),x.length>1&&e.jsx("div",{className:"qr-hero-dots",children:x.map((r,a)=>e.jsx("button",{className:`qr-hero-dot ${a===G?"active":""}`,onClick:()=>I(a)},a))})]}),x.length===0&&e.jsx("div",{className:"qr-hero-overlay"}),e.jsxs("div",{className:"qr-hero-top",children:[e.jsxs("div",{className:"qr-hero-top-left",children:[e.jsx("div",{className:"qr-avatar",children:i!=null&&i.profile_picture?e.jsx("img",{src:i.profile_picture,alt:""}):"🍽️"}),e.jsxs("div",{className:"qr-hero-top-text",children:[e.jsx("h1",{children:i.bot_full_name}),e.jsxs("span",{className:"qr-hero-badge",children:[e.jsx("i",{className:"ti ti-clock"})," Open now"]})]})]}),e.jsxs("button",{className:`qr-hero-orders-btn ${E>0?"visible":""}`,onClick:()=>y(!0),children:[e.jsxs("svg",{width:"16",height:"16",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",children:[e.jsx("circle",{cx:"9",cy:"21",r:"1"}),e.jsx("circle",{cx:"20",cy:"21",r:"1"}),e.jsx("path",{d:"M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"})]}),e.jsx("span",{children:E>0?`${S(oe)} K`:"Orders"}),E>0&&e.jsx("span",{className:"qr-hero-order-count",children:E})]})]}),e.jsx("div",{className:"qr-hero-content",children:e.jsxs("div",{className:"qr-hero-meta",children:[i.location&&e.jsxs("span",{className:"qr-hero-badge",children:[e.jsx("i",{className:"ti ti-map-pin"})," ",i.location]}),i.description&&e.jsxs("span",{className:"qr-hero-badge",children:[e.jsx("i",{className:"ti ti-info-circle"})," Dine in & Takeaway"]})]})})]}),e.jsx("div",{className:"qr-search-wrap",children:e.jsxs("div",{className:"qr-search",children:[e.jsx("i",{className:"ti ti-search qr-search-icon"}),e.jsx("input",{className:"qr-search-input",ref:F,placeholder:"Search menu items...",value:g,onChange:r=>w(r.target.value)}),g&&e.jsx("button",{className:"qr-search-clear",onClick:()=>w(""),children:e.jsx("i",{className:"ti ti-x",style:{fontSize:11}})})]})}),e.jsx("div",{className:"qr-cats",ref:M,onMouseDown:U,onMouseMove:A,onMouseUp:Z,onMouseLeave:Z,children:$.map(r=>e.jsxs("button",{className:`qr-cat-btn ${m===r.id?"active":""}`,onClick:()=>q(r.id),children:[e.jsx("div",{className:"qr-cat-icon",children:e.jsx("span",{children:r.emoji})}),e.jsx("span",{className:"qr-cat-label",children:r.name})]},r.id))}),!g&&m==="all"&&re.length>0&&e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"qr-section-header",children:[e.jsx("span",{className:"qr-section-title",children:"⭐ Popular Picks"}),e.jsxs("span",{className:"qr-section-count",children:[re.length," items"]})]}),e.jsx("div",{className:"qr-featured-scroll",children:e.jsx("div",{className:"qr-featured-list",children:re.map(r=>{const a=Y(r.image_url,i==null?void 0:i.id);return e.jsxs("div",{className:"qr-featured-card",onClick:()=>j(r),children:[e.jsx("div",{className:"qr-featured-img",children:a[0]?e.jsx("img",{src:a[0],alt:r.name}):"⭐"}),e.jsxs("div",{className:"qr-featured-body",children:[e.jsx("div",{className:"qr-featured-name",children:r.name}),e.jsx("div",{className:"qr-featured-desc",children:r.description||""}),e.jsxs("div",{className:"qr-featured-price",children:[S(r.price)," ",e.jsx("span",{children:"K"})]})]})]},r.id)})})}),e.jsx("div",{className:"qr-divider"})]}),e.jsxs("div",{children:[e.jsxs("div",{className:"qr-section-header",children:[e.jsx("span",{className:"qr-section-title",children:g?`Results for "${g}"`:m==="all"?"All Items":((pe=te[m])==null?void 0:pe.name)||"Items"}),e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsxs("span",{className:"qr-section-count",children:[W.length," items"]}),e.jsxs("div",{className:"flex bg-gray-100 rounded-lg p-0.5 gap-0.5",children:[e.jsx("button",{onClick:()=>P("list"),className:`p-1.5 rounded-md transition-all ${f==="list"?"bg-white shadow-sm":"text-gray-400 hover:text-gray-600"}`,children:e.jsx("svg",{width:"16",height:"16",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",children:e.jsx("path",{d:"M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"})})}),e.jsx("button",{onClick:()=>P("grid"),className:`p-1.5 rounded-md transition-all ${f==="grid"?"bg-white shadow-sm":"text-gray-400 hover:text-gray-600"}`,children:e.jsx("svg",{width:"16",height:"16",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",children:e.jsx("path",{d:"M3 3h7v7H3zm11 0h7v7h-7zM3 14h7v7H3zm11 0h7v7h-7z"})})})]})]})]}),W.length===0?e.jsxs("div",{className:"qr-no-results",children:[e.jsx("i",{className:"ti ti-mood-sad"}),"No items found"]}):f==="list"?e.jsx("div",{className:"qr-item-grid",children:W.map(r=>{const a=Y(r.image_url,i==null?void 0:i.id),l=r.badges||[],u=d.find(p=>p.item.id===r.id);return e.jsxs("div",{className:"qr-item",onClick:()=>j(r),children:[e.jsx("div",{className:"qr-item-thumb",children:a[0]?e.jsx("img",{src:a[0],alt:r.name}):"🍽️"}),e.jsxs("div",{className:"qr-item-info",children:[e.jsx("div",{className:"qr-item-name",children:r.name}),l.length>0&&e.jsx("div",{className:"qr-item-badges",children:l.map(p=>{const X=le[p];return X?e.jsx("span",{className:`qr-badge ${X.cls}`,children:X.label},p):null})}),r.description&&e.jsx("div",{className:"qr-item-desc",children:r.description}),e.jsxs("div",{className:"qr-item-bottom",children:[e.jsxs("div",{className:"qr-item-price",children:[S(r.price)," ",e.jsx("span",{children:"K"})]}),u&&e.jsxs("span",{className:"qr-item-in-cart",children:["× ",u.qty]})]})]}),u?e.jsxs("div",{className:"qr-item-qty-ctrl",children:[e.jsx("button",{className:"qr-item-qty-btn",onClick:p=>{p.stopPropagation(),ce(r.id,u.qty-1)},children:e.jsx("svg",{width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2.5",children:e.jsx("path",{d:"M5 12h14"})})}),e.jsx("span",{className:"qr-item-qty-num",children:u.qty}),e.jsx("button",{className:"qr-item-qty-btn",onClick:p=>{p.stopPropagation(),V(r,1)},children:e.jsx("svg",{width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2.5",children:e.jsx("path",{d:"M12 5v14M5 12h14"})})})]}):e.jsx("button",{className:"qr-item-add",onClick:p=>{p.stopPropagation(),V(r,1)},children:e.jsx("svg",{width:"18",height:"18",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2.5",children:e.jsx("path",{d:"M12 5v14M5 12h14"})})})]},r.id)})}):e.jsx("div",{className:"qr-grid-view",children:W.map((r,a)=>{const l=Y(r.image_url,i==null?void 0:i.id),u=r.badges||[],p=d.find(C=>C.item.id===r.id),X=r.is_available===!1;return e.jsxs("div",{className:"qr-grid-card",onClick:()=>j(r),children:[e.jsxs("div",{className:"qr-grid-img",children:[l[0]?e.jsx("img",{src:l[0],alt:r.name}):e.jsx("span",{style:{fontSize:32},children:"🍽️"}),e.jsx("div",{className:"qr-grid-overlay"}),l.length>1&&e.jsxs("div",{className:"qr-grid-img-count",children:[e.jsxs("svg",{width:"10",height:"10",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",children:[e.jsx("path",{d:"M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"}),e.jsx("circle",{cx:"12",cy:"13",r:"4"})]}),l.length]}),e.jsx("div",{className:`qr-grid-status ${X?"bg-rose-500/90":"bg-emerald-500/90"}`,children:X?"Unavailable":"Available"}),r.category_id&&te[r.category_id]&&e.jsxs("div",{className:"qr-grid-cat",children:[te[r.category_id].icon||"📁"," ",te[r.category_id].name]})]}),e.jsxs("div",{className:"qr-grid-body",children:[e.jsx("h3",{className:"qr-grid-name",children:r.name}),r.description&&e.jsx("p",{className:"qr-grid-desc",children:r.description}),u.length>0&&e.jsx("div",{className:"qr-grid-badges",children:u.map(C=>{const ie=le[C];return ie?e.jsx("span",{className:`qr-badge ${ie.cls}`,children:ie.emoji||ie.label},C):null})}),e.jsxs("div",{className:"qr-grid-bottom",children:[e.jsxs("div",{className:"qr-grid-price",children:[S(r.price)," ",e.jsx("span",{children:"K"})]}),e.jsx("div",{onClick:C=>C.stopPropagation(),children:p?e.jsxs("div",{className:"qr-grid-qty-ctrl",children:[e.jsx("button",{className:"qr-grid-qty-btn",onClick:C=>{C.stopPropagation(),ce(r.id,p.qty-1)},children:e.jsx("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2.5",children:e.jsx("path",{d:"M5 12h14"})})}),e.jsx("span",{className:"qr-grid-qty-num",children:p.qty}),e.jsx("button",{className:"qr-grid-qty-btn",onClick:C=>{C.stopPropagation(),V(r,1)},children:e.jsx("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2.5",children:e.jsx("path",{d:"M12 5v14M5 12h14"})})})]}):e.jsx("button",{className:"qr-grid-add",onClick:C=>{C.stopPropagation(),V(r,1)},children:e.jsx("svg",{width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2.5",children:e.jsx("path",{d:"M12 5v14M5 12h14"})})})})]})]})]},r.id)})})]})]}),e.jsx(de,{children:_&&e.jsx(ve,{item:_,shop:i,orderItems:d,onAddToOrder:V,onClose:()=>j(null)})}),e.jsx(de,{children:B&&e.jsx(je,{orderItems:d,orderCount:E,orderTotal:oe,shop:i,onUpdateQty:ce,onRemoveItem:me,onClearAll:fe,onClose:()=>y(!1),paymentMode:s,onProceed:()=>{y(!1),t(!0)}})}),e.jsx(de,{children:O&&e.jsx(ye,{orderItems:d,orderTotal:oe,shop:i,paymentMethods:se,tableProp:h,onBack:()=>{t(!1),y(!0)},onSubmitOrder:()=>{t(!1),k([])}})}),e.jsx("style",{children:`
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
      `})]})}function qe(){return e.jsxs("div",{className:"qr-page",style:{background:"#f7f5f0"},children:[e.jsx("div",{style:{height:200,background:"linear-gradient(135deg,#1a1a2e,#16213e)"}}),e.jsx("div",{style:{padding:"0 16px",marginTop:-20},children:e.jsx("div",{style:{height:46,background:"#fff",borderRadius:14,boxShadow:"0 4px 20px rgba(0,0,0,0.12)"}})}),e.jsx("div",{style:{display:"flex",gap:8,padding:"16px",overflow:"hidden",justifyContent:"center"},children:[...Array(6)].map((o,h)=>e.jsx("div",{style:{width:54,height:74,background:"#fff",borderRadius:16,flexShrink:0}},h))}),e.jsx("div",{style:{padding:"0 16px"},children:[...Array(4)].map((o,h)=>e.jsx("div",{style:{height:88,background:"#fff",borderRadius:18,marginBottom:10}},h))})]})}export{Ne as default};
