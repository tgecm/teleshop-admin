import{aa as q,aB as Vt,w as Ht,a6 as Yt,a1 as t,a as Ut,a4 as Lt,k as mt}from"./index-bL5sTpqK.js";import{b as ot}from"./date-ChK2Om51.js";import{d as Dt}from"./download-YiUYwShs.js";import{L as Kt}from"./loader-circle-DdlnBF8-.js";import{D as Gt}from"./download-D03z0pD1.js";import{X as Qt}from"./x-i-Y89o0f.js";const Pt=800,$="#003366",pt="#007bff",v="#333",I="#666",b="#ddd",e={wrap:{width:Pt,minHeight:1e3,background:"#ffffff",fontFamily:"'Open Sans', system-ui, -apple-system, sans-serif",color:v,border:"1px solid #ccc",display:"flex",flexDirection:"column",fontSize:"14px"},topLine:{height:10,backgroundColor:$},header:{display:"flex",justifyContent:"space-between",alignItems:"flex-start",padding:"30px 40px",borderBottom:`1px solid ${b}`},shopInfo:{display:"flex",alignItems:"flex-start",gap:25},logoCircle:{width:100,height:100,border:`2px solid ${$}`,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"Roboto, system-ui, sans-serif",fontSize:16,fontWeight:500,color:$,textTransform:"uppercase",flexShrink:0,background:"#fff",overflow:"hidden"},shopDetails:{display:"flex",flexDirection:"column",justifyContent:"center",gap:5},shopName:{fontFamily:"Roboto, system-ui, sans-serif",fontSize:22,fontWeight:700,color:$,marginBottom:3},tagline:{fontSize:13,color:I,marginBottom:8},contactRow:{display:"flex",alignItems:"center",gap:10,fontSize:12,color:I},contactIcon:{color:pt,width:20,textAlign:"center"},contactValue:{borderBottom:`1px solid ${b}`,paddingBottom:1,minWidth:150,flexGrow:1,lineHeight:1.4},receiptBlock:{textAlign:"right"},receiptHeading:{fontFamily:"Roboto, system-ui, sans-serif",fontSize:48,fontWeight:700,color:$,lineHeight:1},invoiceHeading:{fontFamily:"Roboto, system-ui, sans-serif",fontSize:42,fontWeight:700,color:$,lineHeight:1},thankYou:{fontFamily:"'Dancing Script', cursive",fontSize:17,color:pt,marginTop:5,marginBottom:15},metaRight:{display:"flex",justifyContent:"flex-end",alignItems:"center",gap:10,fontSize:13,color:I,lineHeight:2},metaLabel:{fontWeight:600,color:v,minWidth:80,textAlign:"left"},metaColon:{color:I},metaValue:{borderBottom:`1px solid ${b}`,minWidth:140,paddingBottom:1,textAlign:"left"},mid:{display:"flex",borderBottom:`1px solid ${b}`},midCol:{padding:"25px 40px",flex:1},midColBorder:{padding:"25px 40px",flex:1,borderRight:`1px solid ${b}`},sectionTitle:{backgroundColor:$,color:"#fff",fontFamily:"Roboto, system-ui, sans-serif",fontSize:13,fontWeight:500,padding:"8px 15px",borderRadius:5,display:"inline-flex",alignItems:"center",gap:10,marginBottom:15},fieldItem:{display:"flex",alignItems:"center",gap:10,fontSize:12,color:I,lineHeight:2},fieldLabel:{fontWeight:500,color:v,minWidth:80},fieldSep:{color:I},fieldValue:{borderBottom:`1px solid ${b}`,flexGrow:1,paddingBottom:1},fieldLabelWide:{fontWeight:500,color:v,minWidth:120},tableWrap:{flex:1,padding:"0 40px 25px"},tableHeader:{display:"flex",backgroundColor:$,color:"#fff",fontFamily:"Roboto, system-ui, sans-serif",fontWeight:500,fontSize:12,borderRadius:4,overflow:"hidden"},thId:{width:50,padding:"10px 15px"},thProduct:{flex:1,padding:"10px 15px",maxWidth:280},thQty:{width:80,padding:"10px 15px",textAlign:"center"},thPrice:{width:145,padding:"10px 15px",textAlign:"right"},thTotal:{width:145,padding:"10px 15px",textAlign:"right"},thPriceInv:{width:120,padding:"10px 15px",textAlign:"right"},thTotalInv:{width:120,padding:"10px 15px",textAlign:"right"},tableRow:{display:"flex",alignItems:"center",fontSize:12,borderBottom:`1px solid ${b}`},tdId:{width:50,padding:"12px 15px",color:$,fontWeight:600},tdProduct:{flex:1,padding:"12px 15px",color:v,maxWidth:280,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"},tdQty:{width:80,padding:"12px 15px",textAlign:"center",color:v},tdUnit:{width:145,padding:"12px 15px",textAlign:"right",color:v},tdTotal:{width:145,padding:"12px 15px",textAlign:"right",color:v},tdUnitInv:{width:120,padding:"12px 15px",textAlign:"right",color:v},tdTotalInv:{width:120,padding:"12px 15px",textAlign:"right",color:v},bottom:{display:"flex",padding:"25px 40px",borderTop:`1px solid ${b}`,gap:30},paymentBlock:{display:"flex",flexDirection:"column",gap:20,flex:1.5},payBox:{border:`1px solid ${b}`,borderRadius:8,padding:15},payTitle:{fontFamily:"Roboto, system-ui, sans-serif",fontSize:13,fontWeight:500,color:$,marginBottom:8,display:"flex",alignItems:"center",gap:10},payValue:{fontSize:12,color:I,borderBottom:`1px solid ${b}`,paddingBottom:4,minWidth:200},amountPaid:{marginTop:15},amountValue:{fontSize:15,fontWeight:700,color:$,display:"inline-block",paddingBottom:5,borderBottom:`2px solid ${pt}`,marginTop:5},totalsCol:{display:"flex",flexDirection:"column",justifyContent:"flex-end",flex:1},totalsRow:{display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:13,color:v,padding:"5px 0",borderBottom:`1px solid ${b}`},totalLabel:{fontWeight:500,color:v,minWidth:100},totalColon:{color:I},totalValue:{textAlign:"right",minWidth:80,color:I},grandTotal:{backgroundColor:$,color:"#fff",fontFamily:"Roboto, system-ui, sans-serif",fontSize:17,fontWeight:700,padding:"12px 18px",borderRadius:5,marginTop:15,display:"flex",justifyContent:"space-between",alignItems:"center",letterSpacing:"0.5px"},grandTotalValue:{color:"#fff"},footer:{borderTop:`1px solid ${b}`,padding:"20px 40px",display:"flex",alignItems:"center",gap:25},footerNotes:{fontSize:10,color:I,lineHeight:1.5},websiteBar:{backgroundColor:$,color:"rgba(255,255,255,0.8)",textAlign:"center",fontSize:11,padding:"8px 0",letterSpacing:1}};function n(i){return i==null?"":String(i).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}function Ct(i){return new Promise((l,z)=>{const d=new FileReader;d.onload=()=>l(d.result),d.onerror=z,d.readAsDataURL(i)})}function L(i,l=16){try{const d=document.createElement("canvas");d.width=l*2,d.height=l*2;const u=d.getContext("2d");return u.font=`${l*2}px sans-serif`,u.textAlign="center",u.textBaseline="middle",u.fillText(i,l,l),d.toDataURL()}catch{return""}}async function qt(i){if(!i)return"";try{if(i.startsWith("data:")||i.startsWith("blob:"))return i;const l=i.startsWith("http")?new URL(i):new URL(i,mt.defaults.baseURL||window.location.origin),z=`${l.pathname}${l.search}`,d=await mt.get(z,{responseType:"blob"});return!d.data||!d.data.size?"":await Ct(d.data)}catch{try{const l=await fetch(i,{mode:"cors",credentials:"omit"});return l.ok?await Ct(await l.blob()):""}catch{return""}}}function Nt(i,l,z,d,u,at,rt,O,V,X,dt,H="receipt",Y={}){var bt,zt,Tt,Rt,It,_t,St,At,Et,Bt,Mt;const x=H==="invoice",{tagline:B="Your Trusted Online Store",phone:D="Phone",email:P="Email",website:U="Website",address:_="Address",notes:R="",botLogo:C="",emojis:a={}}=Y,w=800,p=40,c=w-p*2,r="#003366",S="#007bff",o="#333",s="#666",g="#ddd",j="#bbb",K=x?450:420,k=x?560:540,W=x?690:670,J=n(i.order_number||`#${i.id}`),Z=n(((bt=i.buyer_snapshot)==null?void 0:bt.name)||((zt=i.buyer_snapshot)==null?void 0:zt.full_name)||((Tt=i.customer)==null?void 0:Tt.first_name)||"—"),tt=n(((Rt=i.buyer_snapshot)==null?void 0:Rt.phone)||"—"),et=n(((It=i.buyer_snapshot)==null?void 0:It.email)||"—"),y=n(((_t=i.buyer_snapshot)==null?void 0:_t.address)||"—");n(((St=i.buyer_snapshot)==null?void 0:St.address)||"……………………………………"),n(((At=i.buyer_snapshot)==null?void 0:At.phone)||"……………………………………"),n(((Et=i.buyer_snapshot)==null?void 0:Et.email)||"……………………………………"),n(l!=null&&l.bot_username?`@${l.bot_username}`:"……………………………………"),n(((Bt=i.customer)==null?void 0:Bt.telegram_id)||((Mt=i.customer)==null?void 0:Mt.id)||"—");const f=n(z.charAt(0).toUpperCase()),m=n(z),F=ot(rt,"MMM dd, yyyy"),it=n(O),st=`${(u||0).toFixed(2)} MMK`,N=`${(at||0).toFixed(2)} MMK`,A=40,G=170,Q=A+G+5,lt=Q+12+118+6+12,M=lt+6,gt=28,nt=30,$t=M+gt+6,xt=$t+V*nt+22,ct=xt+155+10,ft=ct+65+5,ut=28,ht=ft+ut+20;let wt="";for(let E=0;E<V;E++){const T=d[E],h=$t+E*nt;let yt;if(T){const Wt=`${((T.price||0)*(T.quantity||0)).toFixed(2)} MMK`,Ft=n(T.product_name||T.name||"—"),Ot=T.variant_label?n(` [${T.variant_label}]`):"";yt=`
        <text x="55" y="${h+19}" fill="${r}" font-weight="600" font-size="12">${E+1}</text>
        <text x="100" y="${h+19}" fill="${o}" font-size="12">${Ft}${Ot}</text>
        <text x="${K}" y="${h+19}" text-anchor="middle" fill="${o}" font-size="12">${T.quantity||"—"}</text>
        <text x="${k}" y="${h+19}" text-anchor="end" fill="${o}" font-size="12">${(T.price||0).toFixed(2)} MMK</text>
        <text x="${W}" y="${h+19}" text-anchor="end" fill="${o}" font-size="12">${Wt}</text>`}else yt=`
        <text x="55" y="${h+19}" fill="${j}" font-weight="600" font-size="12">${E+1}</text>
        <text x="100" y="${h+19}" fill="${j}" font-size="12">${"·".repeat(30)}</text>
        <text x="${K}" y="${h+19}" text-anchor="middle" fill="${j}" font-size="12">${"·".repeat(4)}</text>
        <text x="${k}" y="${h+19}" text-anchor="end" fill="${j}" font-size="12">${"·".repeat(10)}</text>
        <text x="${W}" y="${h+19}" text-anchor="end" fill="${j}" font-size="12">${"·".repeat(10)}</text>`;wt+=`<g>
      <line x1="40" y1="${h+nt-1}" x2="760" y2="${h+nt-1}" stroke="${g}" stroke-width="1"/>
      ${yt}
    </g>`}const jt=(i==null?void 0:i.delivery_fee)>0?{l:"Delivery Fee",v:`+ ${Number(i.delivery_fee).toFixed(2)} MMK`}:null,kt=[{l:"Subtotal",v:st},...jt?[jt]:[]];let vt="";return kt.forEach((E,T)=>{const h=T*22;vt+=`
      <text x="0" y="${h+15}" fill="${o}" font-size="13" font-weight="500">${E.l}</text>
      <text x="85" y="${h+15}" fill="${s}" font-size="13">:</text>
      <text x="100" y="${h+15}" fill="${s}" font-size="13">${E.v}</text>`}),`<svg xmlns="http://www.w3.org/2000/svg" width="${w*2}" height="${ht*2}" viewBox="0 0 ${w} ${ht}">
  <defs><style>
    text{font-family:'Open Sans',system-ui,-apple-system,sans-serif;font-size:12px}
    .r{font-family:'Roboto',system-ui,sans-serif}
    .dc{font-family:'Dancing Script',cursive}
    .w{fill:#fff}
  </style>
  </defs>
  <rect width="${w}" height="${ht}" fill="#fff"/>
  <!-- TOP BAR -->
  <rect width="${w}" height="10" fill="${r}"/>

  <!-- ============ HEADER (y=${A}) ============ -->
  <defs>
    <clipPath id="logoClip">
      <circle cx="50" cy="50" r="50"/>
    </clipPath>
  </defs>
  <g transform="translate(${p}, ${A})">
    <!-- Logo -->
    <circle cx="50" cy="50" r="50" fill="#fff" stroke="${r}" stroke-width="2"/>
    ${C?`<image href="${n(C)}" x="0" y="0" width="100" height="100" preserveAspectRatio="xMidYMid slice" clip-path="url(#logoClip)"/>`:`<text x="50" y="56" text-anchor="middle" fill="${r}" font-size="16" font-weight="600" class="r">${f}</text>`}

    <!-- Shop info -->
    <text x="140" y="22" fill="${r}" font-size="24" font-weight="700" class="r">${m}</text>
    <text x="140" y="44" fill="${s}" font-size="13">${n(B)}</text>

    <!-- Contacts -->
    ${a.phone?`<image href="${n(a.phone)}" x="132" y="56" width="16" height="16"/>`:`<text x="140" y="68" fill="${s}" font-size="12">📞</text>`}
    <text x="152" y="68" fill="${s}" font-size="12">${n(D)}</text>

    ${a.email?`<image href="${n(a.email)}" x="132" y="78" width="16" height="16"/>`:`<text x="140" y="90" fill="${s}" font-size="12">✉️</text>`}
    <text x="152" y="90" fill="${s}" font-size="12">${n(P)}</text>

    ${a.globe?`<image href="${n(a.globe)}" x="132" y="100" width="16" height="16"/>`:`<text x="140" y="112" fill="${s}" font-size="12">🌐</text>`}
    <text x="152" y="112" fill="${s}" font-size="12">${n(U)}</text>

    ${a.pin?`<image href="${n(a.pin)}" x="132" y="122" width="16" height="16"/>`:`<text x="140" y="134" fill="${s}" font-size="12">📍</text>`}
    <text x="152" y="134" fill="${s}" font-size="12">${n(_.slice(0,40))}</text>
    ${_.length>40?`<text x="152" y="152" fill="${s}" font-size="12">${n(_.slice(40,80))}</text>`:""}

    ${x?`<!-- INVOICE heading (right) -->
    <text x="720" y="22" text-anchor="end" fill="${r}" font-size="44" font-weight="700" class="r">INVOICE</text>
    <text x="720" y="46" text-anchor="end" fill="${S}" font-size="15" class="dc">Thank you for your purchase!</text>
    <line x1="550" y1="54" x2="720" y2="54" stroke="${S}" stroke-width="2"/>

    <!-- Meta rows -->
    <g transform="translate(0, 0)">
      <text x="460" y="80" fill="${o}" font-size="13" font-weight="600">Invoice No.</text>
      <text x="565" y="80" fill="${s}" font-size="13">:</text>
      <text x="580" y="80" fill="${s}" font-size="13">${n(X)}</text>
    </g>
    <g transform="translate(0, 0)">
      <text x="460" y="102" fill="${o}" font-size="13" font-weight="600">Date</text>
      <text x="565" y="102" fill="${s}" font-size="13">:</text>
      <text x="580" y="102" fill="${s}" font-size="13">${F}</text>
    </g>
    <g transform="translate(0, 0)">
      <text x="460" y="124" fill="${o}" font-size="13" font-weight="600">Order ID</text>
      <text x="565" y="124" fill="${s}" font-size="13">:</text>
      <text x="580" y="124" fill="${s}" font-size="13">${J}</text>
    </g>
    <g transform="translate(0, 0)">
      <text x="460" y="146" fill="${o}" font-size="13" font-weight="600">Payment Status</text>
      <text x="565" y="146" fill="${s}" font-size="13">:</text>
      <text x="580" y="146" fill="${s}" font-size="13">Pending</text>
    </g>`:`<!-- RECEIPT heading (right) -->
    <text x="720" y="22" text-anchor="end" fill="${r}" font-size="52" font-weight="700" class="r">RECEIPT</text>
    <text x="720" y="48" text-anchor="end" fill="${S}" font-size="16" class="dc">Thank you for your purchase!</text>
    <line x1="550" y1="56" x2="720" y2="56" stroke="${S}" stroke-width="2"/>

    <!-- Meta rows -->
    <g transform="translate(0, 0)">
      <text x="460" y="80" fill="${o}" font-size="13" font-weight="600">Invoice No.</text>
      <text x="565" y="80" fill="${s}" font-size="13">:</text>
      <text x="580" y="80" fill="${s}" font-size="13">${n(X)}</text>
    </g>
    <g transform="translate(0, 0)">
      <text x="460" y="102" fill="${o}" font-size="13" font-weight="600">Receipt No.</text>
      <text x="565" y="102" fill="${s}" font-size="13">:</text>
      <text x="580" y="102" fill="${s}" font-size="13">${n(dt)}</text>
    </g>
    <g transform="translate(0, 0)">
      <text x="460" y="124" fill="${o}" font-size="13" font-weight="600">Payment Status</text>
      <text x="565" y="124" fill="${s}" font-size="13">:</text>
      <text x="580" y="124" fill="${s}" font-size="13">Paid</text>
    </g>`}
  </g>
  <line x1="${p}" y1="${A+G}" x2="${w-p}" y2="${A+G}" stroke="${g}" stroke-width="1"/>

  <!-- ============ MID SECTION (y=${Q}) ============ -->
  <!-- ${x?"Bill To":"Received From"} -->
  <g transform="translate(${p}, ${Q+12})">
    <rect x="0" y="0" width="${x?115:150}" height="28" rx="5" fill="${r}"/>
    ${a.person?`<image href="${n(a.person)}" x="8" y="6" width="16" height="16"/>`:""}
    <text x="${a.person?28:12}" y="19" fill="#fff" font-size="13" font-weight="500" class="r">${x?"Bill To":"Received From"}</text>
    <text x="0" y="52" fill="${o}" font-size="12" font-weight="600">Name</text>
    <text x="60" y="52" fill="${s}" font-size="12">:</text>
    <text x="70" y="52" fill="${s}" font-size="12">${Z}</text>

    <text x="0" y="74" fill="${o}" font-size="12" font-weight="600">Phone</text>
    <text x="60" y="74" fill="${s}" font-size="12">:</text>
    <text x="70" y="74" fill="${s}" font-size="12">${tt}</text>

    <text x="0" y="96" fill="${o}" font-size="12" font-weight="600">Email</text>
    <text x="60" y="96" fill="${s}" font-size="12">:</text>
    <text x="70" y="96" fill="${s}" font-size="12">${et}</text>

    <text x="0" y="118" fill="${o}" font-size="12" font-weight="600">Address</text>
    <text x="60" y="118" fill="${s}" font-size="12">:</text>
    <text x="70" y="118" fill="${s}" font-size="12">${y}</text>
  </g>

  <!-- Vertical divider -->
  <line x1="400" y1="${Q+12}" x2="400" y2="${lt-5}" stroke="${g}" stroke-width="1"/>

  <!-- ${x?"Order Details":"Payment Details"} -->
  <g transform="translate(415, ${Q+12})">
    <rect x="0" y="0" width="${x?170:200}" height="28" rx="5" fill="${r}"/>
    ${a.receipt?`<image href="${n(a.receipt)}" x="8" y="6" width="16" height="16"/><text x="28" y="19" fill="#fff" font-size="13" font-weight="500" class="r">${x?"ORDER DETAILS":"PAYMENT DETAILS"}</text>`:`<text x="12" y="19" fill="#fff" font-size="13" font-weight="500" class="r">🧾 ${x?"ORDER DETAILS":"PAYMENT DETAILS"}</text>`}
    <text x="0" y="52" fill="${o}" font-size="12" font-weight="600">${x?"Amount to pay":"Amount Paid"}</text>
    <text x="85" y="52" fill="${s}" font-size="12">:</text>
    <text x="95" y="52" fill="${s}" font-size="12">${N}</text>

    <text x="0" y="74" fill="${o}" font-size="12" font-weight="600">Payment</text>
    <text x="85" y="74" fill="${s}" font-size="12">:</text>
    <text x="95" y="74" fill="${s}" font-size="12">${it}</text>

    <text x="0" y="96" fill="${o}" font-size="12" font-weight="600">Date</text>
    <text x="85" y="96" fill="${s}" font-size="12">:</text>
    <text x="95" y="96" fill="${s}" font-size="12">${F}</text>

  </g>
  <line x1="${p}" y1="${lt}" x2="${w-p}" y2="${lt}" stroke="${g}" stroke-width="1"/>

  <!-- ============ TABLE (bar y=${M}) ============ -->
  <rect x="${p}" y="${M}" width="${c}" height="${gt}" rx="5" fill="${r}"/>
  <text x="55" y="${M+19}" fill="#fff" font-size="12" font-weight="600" class="r">#</text>
  <text x="100" y="${M+19}" fill="#fff" font-size="12" font-weight="600" class="r">PRODUCTS</text>
  <text x="${K}" y="${M+19}" text-anchor="middle" fill="#fff" font-size="12" font-weight="600" class="r">QTY</text>
  <text x="${k}" y="${M+19}" text-anchor="end" fill="#fff" font-size="12" font-weight="600" class="r">UNIT PRICE</text>
  <text x="${W}" y="${M+19}" text-anchor="end" fill="#fff" font-size="12" font-weight="600" class="r">TOTAL PRICE</text>
  ${wt}

  <!-- ============ BOTTOM (y=${xt}) ============ -->
  <g transform="translate(${p}, ${xt})">
    <rect x="0" y="0" width="290" height="50" rx="8" fill="#fff" stroke="${g}" stroke-width="1"/>
    ${a.card?`<image href="${n(a.card)}" x="13" y="2" width="16" height="16"/>`:""}
    <text x="${a.card?33:15}" y="20" fill="${r}" font-size="13" font-weight="500" class="r">PAYMENT METHOD</text>
    <text x="15" y="42" fill="${s}" font-size="12">${it}</text>

    <rect x="0" y="65" width="290" height="70" rx="8" fill="#fff" stroke="${g}" stroke-width="1"/>
    ${a.money?`<image href="${n(a.money)}" x="13" y="67" width="16" height="16"/>`:""}
    <text x="${a.money?33:15}" y="85" fill="${r}" font-size="13" font-weight="500" class="r">${x?"AMOUNT TO PAY":"AMOUNT PAID"}</text>
    <text x="15" y="115" fill="${r}" font-size="16" font-weight="700">${N}</text>
    <line x1="15" y1="122" x2="130" y2="122" stroke="${S}" stroke-width="2"/>

    <!-- RIGHT: Totals -->
    <g transform="translate(340, 0)">
      ${vt}
      <rect x="0" y="97" width="380" height="38" rx="5" fill="${r}"/>
      <text x="15" y="121" fill="#fff" font-size="17" font-weight="700" class="r">TOTAL</text>
      <text x="365" y="121" text-anchor="end" fill="#fff" font-size="17" font-weight="700" class="r">${N}</text>
    </g>
  </g>

  <!-- ============ FOOTER (y=${ct}) ============ -->
  <g transform="translate(${p}, ${ct})">
    <line x1="0" y1="0" x2="${c}" y2="0" stroke="${g}" stroke-width="1"/>
    ${R?`<text x="0" y="24" fill="${s}" font-size="10">${n(R.slice(0,100))}</text>${R.length>100?`<text x="0" y="38" fill="${s}" font-size="10">${n(R.slice(100))}</text>`:""}`:""}
  </g>

  <!-- ============ WEBSITE BAR ============ -->
  <rect x="0" y="${ft}" width="${w}" height="${ut}" fill="${r}"/>
  <text x="400" y="${ft+18}" text-anchor="middle" fill="rgba(255,255,255,0.85)" font-size="11">${m}</text>
</svg>`}function oe({order:i,bot:l,open:z,onClose:d,receiptType:u="receipt",receiptSettings:at={}}){var k,W,J,Z,tt,et;const rt=q.useRef(null),[O,V]=q.useState(!1),[X,dt]=q.useState(1),[H,Y]=q.useState(""),{addToast:x}=Vt();if(q.useEffect(()=>{if(!z||!i)return;i.invoice_number?Y(i.invoice_number):(Y(""),Ht(i.id).then(f=>{Y(f.invoice_number)}).catch(()=>{}));const y=()=>{const f=window.innerWidth-32;dt(Math.min(1,f/Pt))};return y(),window.addEventListener("resize",y),document.body.style.overflow="hidden",()=>{window.removeEventListener("resize",y),document.body.style.overflow=""}},[z,i]),!i)return null;const B=l?Yt(l.bot_full_name||l.bot_username||"Shop"):"Shop",D=i.items||[],P=D.reduce((y,f)=>y+(f.price||0)*(f.quantity||0),0),U=Number(i.delivery_fee)||0,_=P+U,R=i.created_at?new Date(i.created_at):new Date,C=i.payment_method||"Cash",a=B.split(" ").map(y=>y.charAt(0).toUpperCase()).join(""),w=i.receipt_no||`${a}-ECM-${ot(R,"yyyyMMdd")}-${(i.order_number||String(i.id)).slice(-3)}`,p=Math.max(5,D.length),c=u==="invoice",{tagline:r="Your Trusted Online Store",phone:S="Phone",email:o=(l==null?void 0:l.admin_notification_email)||"Email",website:s="Website",address:g="Address",notes:j=""}=at,K=async()=>{V(!0);try{const y=await qt((l==null?void 0:l.profile_picture)||""),f=(l==null?void 0:l.profile_picture)||"",m=y||"{{LOGO_BASE64}}",F={phone:L("📞"),email:L("✉️"),globe:L("🌐"),pin:L("📍"),person:L("👤"),receipt:L("🧾"),card:L("💳"),money:L("💰")},it=Nt(i,l,B,D,P,_,R,C,p,H,w,u,{tagline:r,phone:S,email:o,website:s,address:g,notes:j,botLogo:m,emojis:F}),st=`${u}-${i.order_number||i.id}`;try{const N=await mt.post("/orders/receipt-png",{svg:it,logo_url:f||void 0},{responseType:"blob"}),A=new Blob([N.data],{type:"image/png"});await Dt(A,`${st}.png`)}catch(N){console.warn("PNG conversion server error, falling back to SVG:",N);const A=Nt(i,l,B,D,P,_,R,C,p,H,w,u,{tagline:r,phone:S,email:o,website:s,address:g,notes:j,botLogo:y}),G=new Blob([A],{type:"image/svg+xml"});await Dt(G,`${st}.svg`)}x("Receipt downloaded successfully")}catch(y){console.error("Receipt export failed:",y),x("Failed to generate receipt image","error")}finally{V(!1)}};return t.jsx(Ut,{children:z&&t.jsxs(t.Fragment,{children:[t.jsx(Lt.div,{initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},onClick:d,className:"fixed inset-0 bg-black/40 backdrop-blur-sm z-50"}),t.jsxs(Lt.div,{initial:{y:"100%"},animate:{y:0},exit:{y:"100%"},transition:{type:"spring",damping:25,stiffness:200},className:"fixed bottom-0 left-0 right-0 z-[60] bg-gray-100 rounded-t-[32px] md:rounded-[32px] md:shadow-2xl max-h-[90dvh] flex flex-col md:max-w-2xl md:mx-auto md:bottom-10",children:[t.jsx("div",{className:"sticky top-0 bg-gray-100 z-10 rounded-t-[32px] pt-4 pb-2 flex flex-col items-center",children:t.jsx("div",{className:"w-10 h-1 bg-gray-200 rounded-full"})}),t.jsxs("div",{className:"flex items-center justify-between px-4 pb-3 flex-shrink-0",children:[t.jsx("h2",{className:"text-lg font-bold text-gray-900",children:u==="invoice"?"Invoice":"Receipt"}),t.jsxs("div",{className:"flex items-center gap-2",children:[t.jsxs("button",{onClick:K,disabled:O,className:"px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center gap-1.5 text-sm",children:[O?t.jsx(Kt,{className:"w-4 h-4 animate-spin"}):t.jsx(Gt,{className:"w-4 h-4"}),O?"Generating...":"Download PNG"]}),t.jsx("button",{onClick:d,className:"p-2 bg-white rounded-full shadow-sm active:scale-90 transition-transform",children:t.jsx(Qt,{className:"w-5 h-5 text-gray-500"})})]})]}),t.jsx("div",{className:"flex-1 overflow-y-hidden px-4 pb-6",children:t.jsx("div",{className:"flex justify-center",children:t.jsx("div",{style:{transform:`scale(${X})`,transformOrigin:"top center"},children:t.jsxs("div",{ref:rt,style:e.wrap,children:[t.jsx("div",{style:e.topLine}),t.jsxs("div",{style:e.header,children:[t.jsxs("div",{style:e.shopInfo,children:[t.jsx("div",{style:e.logoCircle,children:l!=null&&l.profile_picture?t.jsx("img",{src:l.profile_picture,alt:"Logo",style:{width:"100%",height:"100%",objectFit:"cover",borderRadius:"50%"}}):B.charAt(0).toUpperCase()}),t.jsxs("div",{style:e.shopDetails,children:[t.jsx("div",{style:e.shopName,children:B}),t.jsx("div",{style:e.tagline,children:r}),t.jsxs("div",{style:e.contactRow,children:[t.jsx("span",{style:e.contactIcon,children:"📞"}),t.jsx("span",{style:e.contactValue,children:S})]}),t.jsxs("div",{style:e.contactRow,children:[t.jsx("span",{style:e.contactIcon,children:"✉️"}),t.jsx("span",{style:e.contactValue,children:o})]}),t.jsxs("div",{style:e.contactRow,children:[t.jsx("span",{style:e.contactIcon,children:"🌐"}),t.jsx("span",{style:e.contactValue,children:s})]}),t.jsxs("div",{style:e.contactRow,children:[t.jsx("span",{style:e.contactIcon,children:"📍"}),t.jsxs("span",{style:e.contactValue,children:[g.slice(0,40),g.length>40&&t.jsxs(t.Fragment,{children:[t.jsx("br",{}),g.slice(40,80)]})]})]})]})]}),t.jsxs("div",{style:e.receiptBlock,children:[t.jsx("div",{style:c?e.invoiceHeading:e.receiptHeading,children:c?"INVOICE":"RECEIPT"}),t.jsx("div",{style:e.thankYou,children:"Thank you for your purchase!"}),t.jsxs("div",{style:e.metaRight,children:[t.jsx("span",{style:e.metaLabel,children:"Invoice No."}),t.jsx("span",{style:e.metaColon,children:":"}),t.jsx("span",{style:e.metaValue,children:H||"..."})]}),c?t.jsxs(t.Fragment,{children:[t.jsxs("div",{style:e.metaRight,children:[t.jsx("span",{style:e.metaLabel,children:"Date"}),t.jsx("span",{style:e.metaColon,children:":"}),t.jsx("span",{style:e.metaValue,children:ot(R,"MMM dd, yyyy")})]}),t.jsxs("div",{style:e.metaRight,children:[t.jsx("span",{style:e.metaLabel,children:"Order ID"}),t.jsx("span",{style:e.metaColon,children:":"}),t.jsx("span",{style:e.metaValue,children:i.order_number||`#${i.id}`})]}),t.jsxs("div",{style:e.metaRight,children:[t.jsx("span",{style:e.metaLabel,children:"Payment Status"}),t.jsx("span",{style:e.metaColon,children:":"}),t.jsx("span",{style:e.metaValue,children:"Pending"})]})]}):t.jsxs(t.Fragment,{children:[t.jsxs("div",{style:e.metaRight,children:[t.jsx("span",{style:e.metaLabel,children:"Receipt No."}),t.jsx("span",{style:e.metaColon,children:":"}),t.jsx("span",{style:e.metaValue,children:w})]}),t.jsxs("div",{style:e.metaRight,children:[t.jsx("span",{style:e.metaLabel,children:"Payment Status"}),t.jsx("span",{style:e.metaColon,children:":"}),t.jsx("span",{style:e.metaValue,children:"Paid"})]})]})]})]}),t.jsxs("div",{style:e.mid,children:[t.jsxs("div",{style:e.midColBorder,children:[t.jsxs("div",{style:e.sectionTitle,children:[t.jsx("span",{children:"👤"})," ",c?"Bill To":"Received From"]}),t.jsxs("div",{style:e.fieldItem,children:[t.jsx("span",{style:e.fieldLabel,children:"Name"}),t.jsx("span",{style:e.fieldSep,children:":"}),t.jsx("span",{style:e.fieldValue,children:((k=i.buyer_snapshot)==null?void 0:k.name)||((W=i.buyer_snapshot)==null?void 0:W.full_name)||((J=i.customer)==null?void 0:J.first_name)||"—"})]}),t.jsxs("div",{style:e.fieldItem,children:[t.jsx("span",{style:e.fieldLabel,children:"Phone"}),t.jsx("span",{style:e.fieldSep,children:":"}),t.jsx("span",{style:e.fieldValue,children:((Z=i.buyer_snapshot)==null?void 0:Z.phone)||"—"})]}),t.jsxs("div",{style:e.fieldItem,children:[t.jsx("span",{style:e.fieldLabel,children:"Email"}),t.jsx("span",{style:e.fieldSep,children:":"}),t.jsx("span",{style:e.fieldValue,children:((tt=i.buyer_snapshot)==null?void 0:tt.email)||"—"})]}),t.jsxs("div",{style:e.fieldItem,children:[t.jsx("span",{style:e.fieldLabel,children:"Address"}),t.jsx("span",{style:e.fieldSep,children:":"}),t.jsx("span",{style:e.fieldValue,children:((et=i.buyer_snapshot)==null?void 0:et.address)||"—"})]})]}),t.jsxs("div",{style:e.midCol,children:[t.jsxs("div",{style:e.sectionTitle,children:[t.jsx("span",{children:"🧾"})," ",c?"ORDER DETAILS":"PAYMENT DETAILS"]}),t.jsxs("div",{style:{...e.fieldItem,"--label-w":"120px"},children:[t.jsx("span",{style:e.fieldLabelWide,children:c?"Amount to pay":"Amount Paid"}),t.jsx("span",{style:e.fieldSep,children:":"}),t.jsxs("span",{style:e.fieldValue,children:[_.toFixed(2)," MMK"]})]}),t.jsxs("div",{style:e.fieldItem,children:[t.jsx("span",{style:e.fieldLabelWide,children:"Payment"}),t.jsx("span",{style:e.fieldSep,children:":"}),t.jsx("span",{style:e.fieldValue,children:C})]}),t.jsxs("div",{style:e.fieldItem,children:[t.jsx("span",{style:e.fieldLabelWide,children:"Date"}),t.jsx("span",{style:e.fieldSep,children:":"}),t.jsx("span",{style:e.fieldValue,children:ot(R,"MMM dd, yyyy")})]})]})]}),t.jsxs("div",{style:e.tableWrap,children:[t.jsxs("div",{style:e.tableHeader,children:[t.jsx("div",{style:e.thId,children:"#"}),t.jsx("div",{style:e.thProduct,children:"PRODUCTS"}),t.jsx("div",{style:e.thQty,children:"QTY"}),t.jsx("div",{style:c?e.thPriceInv:e.thPrice,children:"UNIT PRICE"}),t.jsx("div",{style:c?e.thTotalInv:e.thTotal,children:"TOTAL PRICE"})]}),Array.from({length:p}).map((y,f)=>{const m=D[f];if(m){const F=(m.price||0)*(m.quantity||0);return t.jsxs("div",{style:e.tableRow,children:[t.jsx("div",{style:e.tdId,children:f+1}),t.jsxs("div",{style:e.tdProduct,children:[m.product_name||m.name||"—",m.variant_label?t.jsxs("span",{style:{color:"#9ca3af",fontSize:10},children:[" [",m.variant_label,"]"]}):null]}),t.jsx("div",{style:e.tdQty,children:m.quantity||"—"}),t.jsxs("div",{style:c?e.tdUnitInv:e.tdUnit,children:[(m.price||0).toFixed(2)," MMK"]}),t.jsxs("div",{style:c?e.tdTotalInv:e.tdTotal,children:[F.toFixed(2)," MMK"]})]},f)}return t.jsxs("div",{style:e.tableRow,children:[t.jsx("div",{style:e.tdId,children:f+1}),t.jsx("div",{style:e.tdProduct,children:"·".repeat(30)}),t.jsx("div",{style:e.tdQty,children:"·".repeat(4)}),t.jsx("div",{style:c?e.tdUnitInv:e.tdUnit,children:"·".repeat(8)}),t.jsx("div",{style:c?e.tdTotalInv:e.tdTotal,children:"·".repeat(8)})]},`empty-${f}`)})]}),t.jsxs("div",{style:e.bottom,children:[t.jsxs("div",{style:e.paymentBlock,children:[t.jsxs("div",{style:e.payBox,children:[t.jsx("div",{style:e.payTitle,children:"💳 PAYMENT METHOD"}),t.jsx("div",{style:e.payValue,children:C})]}),t.jsxs("div",{style:{...e.payBox,...e.amountPaid},children:[t.jsxs("div",{style:e.payTitle,children:["💰 ",c?"AMOUNT TO PAY":"AMOUNT PAID"]}),t.jsxs("div",{style:e.amountValue,children:[_.toFixed(2)," MMK"]})]})]}),t.jsxs("div",{style:e.totalsCol,children:[t.jsxs("div",{style:e.totalsRow,children:[t.jsx("span",{style:e.totalLabel,children:"Subtotal"}),t.jsx("span",{style:e.totalColon,children:":"}),t.jsxs("span",{style:e.totalValue,children:[P.toFixed(2)," MMK"]})]}),U>0&&t.jsxs("div",{style:e.totalsRow,children:[t.jsx("span",{style:e.totalLabel,children:"Delivery Fee"}),t.jsx("span",{style:e.totalColon,children:":"}),t.jsxs("span",{style:e.totalValue,children:["+ ",U.toFixed(2)," MMK"]})]}),t.jsxs("div",{style:e.grandTotal,children:[t.jsx("span",{style:{fontWeight:700,color:"#fff",fontFamily:"'Roboto', system-ui, sans-serif"},children:"TOTAL"}),t.jsx("span",{style:{color:"#fff"},children:":"}),t.jsxs("span",{style:e.grandTotalValue,children:[_.toFixed(2)," MMK"]})]})]})]}),t.jsx("div",{style:e.footer,children:j?t.jsxs("div",{style:e.footerNotes,children:[j.slice(0,100),j.length>100&&t.jsxs(t.Fragment,{children:[t.jsx("br",{}),j.slice(100)]})]}):null}),t.jsx("div",{style:e.websiteBar,children:t.jsx("span",{children:B})})]})})})})]})]})})}export{oe as R};
