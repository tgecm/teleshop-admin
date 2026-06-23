import{a9 as Q,aB as Pt,w as Dt,a5 as Nt,a1 as t,a as Ot,a3 as At,X as Ft}from"./index-mjQ6XhpR.js";import{b as nt}from"./date-ChK2Om51.js";import{L as Wt}from"./loader-circle-BPAf8xt2.js";import{D as Vt}from"./download-CjbmZg71.js";const St=800,u="#003366",yt="#007bff",j="#333",R="#666",v="#ddd",e={wrap:{width:St,minHeight:1e3,background:"#ffffff",fontFamily:"'Open Sans', system-ui, -apple-system, sans-serif",color:j,border:"1px solid #ccc",display:"flex",flexDirection:"column",fontSize:"14px"},topLine:{height:10,backgroundColor:u},header:{display:"flex",justifyContent:"space-between",alignItems:"flex-start",padding:"30px 40px",borderBottom:`1px solid ${v}`},shopInfo:{display:"flex",alignItems:"flex-start",gap:25},logoCircle:{width:100,height:100,border:`2px solid ${u}`,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"Roboto, system-ui, sans-serif",fontSize:16,fontWeight:500,color:u,textTransform:"uppercase",flexShrink:0,background:"#fff",overflow:"hidden"},shopDetails:{display:"flex",flexDirection:"column",justifyContent:"center",gap:5},shopName:{fontFamily:"Roboto, system-ui, sans-serif",fontSize:22,fontWeight:700,color:u,marginBottom:3},tagline:{fontSize:13,color:R,marginBottom:8},contactRow:{display:"flex",alignItems:"center",gap:10,fontSize:12,color:R},contactIcon:{color:yt,width:20,textAlign:"center"},contactValue:{borderBottom:`1px solid ${v}`,paddingBottom:1,minWidth:150,flexGrow:1,lineHeight:1.4},receiptBlock:{textAlign:"right"},receiptHeading:{fontFamily:"Roboto, system-ui, sans-serif",fontSize:48,fontWeight:700,color:u,lineHeight:1},invoiceHeading:{fontFamily:"Roboto, system-ui, sans-serif",fontSize:42,fontWeight:700,color:u,lineHeight:1},thankYou:{fontFamily:"'Dancing Script', cursive",fontSize:17,color:yt,marginTop:5,marginBottom:15},metaRight:{display:"flex",justifyContent:"flex-end",alignItems:"center",gap:10,fontSize:13,color:R,lineHeight:2},metaLabel:{fontWeight:600,color:j,minWidth:80,textAlign:"left"},metaColon:{color:R},metaValue:{borderBottom:`1px solid ${v}`,minWidth:140,paddingBottom:1,textAlign:"left"},mid:{display:"flex",borderBottom:`1px solid ${v}`},midCol:{padding:"25px 40px",flex:1},midColBorder:{padding:"25px 40px",flex:1,borderRight:`1px solid ${v}`},sectionTitle:{backgroundColor:u,color:"#fff",fontFamily:"Roboto, system-ui, sans-serif",fontSize:13,fontWeight:500,padding:"8px 15px",borderRadius:5,display:"inline-flex",alignItems:"center",gap:10,marginBottom:15},fieldItem:{display:"flex",alignItems:"center",gap:10,fontSize:12,color:R,lineHeight:2},fieldLabel:{fontWeight:500,color:j,minWidth:80},fieldSep:{color:R},fieldValue:{borderBottom:`1px solid ${v}`,flexGrow:1,paddingBottom:1},fieldLabelWide:{fontWeight:500,color:j,minWidth:120},tableWrap:{flex:1,padding:"0 40px 25px"},tableHeader:{display:"flex",backgroundColor:u,color:"#fff",fontFamily:"Roboto, system-ui, sans-serif",fontWeight:500,fontSize:12,borderRadius:4,overflow:"hidden"},thId:{width:50,padding:"10px 15px"},thProduct:{flex:1,padding:"10px 15px",maxWidth:280},thQty:{width:80,padding:"10px 15px",textAlign:"center"},thPrice:{width:145,padding:"10px 15px",textAlign:"right"},thTotal:{width:145,padding:"10px 15px",textAlign:"right"},thPriceInv:{width:120,padding:"10px 15px",textAlign:"right"},thTotalInv:{width:120,padding:"10px 15px",textAlign:"right"},tableRow:{display:"flex",alignItems:"center",fontSize:12,borderBottom:`1px solid ${v}`},tdId:{width:50,padding:"12px 15px",color:u,fontWeight:600},tdProduct:{flex:1,padding:"12px 15px",color:j,maxWidth:280,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"},tdQty:{width:80,padding:"12px 15px",textAlign:"center",color:j},tdUnit:{width:145,padding:"12px 15px",textAlign:"right",color:j},tdTotal:{width:145,padding:"12px 15px",textAlign:"right",color:j},tdUnitInv:{width:120,padding:"12px 15px",textAlign:"right",color:j},tdTotalInv:{width:120,padding:"12px 15px",textAlign:"right",color:j},bottom:{display:"flex",padding:"25px 40px",borderTop:`1px solid ${v}`,gap:30},paymentBlock:{display:"flex",flexDirection:"column",gap:20,flex:1.5},payBox:{border:`1px solid ${v}`,borderRadius:8,padding:15},payTitle:{fontFamily:"Roboto, system-ui, sans-serif",fontSize:13,fontWeight:500,color:u,marginBottom:8,display:"flex",alignItems:"center",gap:10},payValue:{fontSize:12,color:R,borderBottom:`1px solid ${v}`,paddingBottom:4,minWidth:200},amountPaid:{marginTop:15},amountValue:{fontSize:15,fontWeight:700,color:u,display:"inline-block",paddingBottom:5,borderBottom:`2px solid ${yt}`,marginTop:5},totalsCol:{display:"flex",flexDirection:"column",justifyContent:"flex-end",flex:1},totalsRow:{display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:13,color:j,padding:"5px 0",borderBottom:`1px solid ${v}`},totalLabel:{fontWeight:500,color:j,minWidth:100},totalColon:{color:R},totalValue:{textAlign:"right",minWidth:80,color:R},grandTotal:{backgroundColor:u,color:"#fff",fontFamily:"Roboto, system-ui, sans-serif",fontSize:17,fontWeight:700,padding:"12px 18px",borderRadius:5,marginTop:15,display:"flex",justifyContent:"space-between",alignItems:"center",letterSpacing:"0.5px"},grandTotalValue:{color:"#fff"},footer:{borderTop:`1px solid ${v}`,padding:"20px 40px",display:"flex",alignItems:"center",gap:25},footerNotes:{fontSize:10,color:R,lineHeight:1.5},websiteBar:{backgroundColor:u,color:"rgba(255,255,255,0.8)",textAlign:"center",fontSize:11,padding:"8px 0",letterSpacing:1}};function o(i){return i==null?"":String(i).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}function Ut(i,c,E,q,P,ot,at,F,W,X,rt,J="receipt",V={}){var wt,jt,vt,bt,zt,Tt,It,kt,Rt,_t,Mt;const p=J==="invoice",{tagline:B="Your Trusted Online Store",phone:D="Phone",email:U="Email",website:H="Website",address:S="Address",notes:_="",botLogo:N=""}=V,I=800,$=40,Y=I-$*2,l="#003366",L="#007bff",a="#333",s="#666",n="#ddd",k="#bbb",M=p?550:470,K=p?645:610,G=p?760:740,Z=o(i.order_number||`#${i.id}`),tt=o(((wt=i.buyer_snapshot)==null?void 0:wt.name)||((jt=i.buyer_snapshot)==null?void 0:jt.full_name)||((vt=i.customer)==null?void 0:vt.first_name)||"—"),et=o(((bt=i.buyer_snapshot)==null?void 0:bt.phone)||"—"),it=o(((zt=i.buyer_snapshot)==null?void 0:zt.email)||"—"),st=o(((Tt=i.buyer_snapshot)==null?void 0:Tt.address)||"—");o(((It=i.buyer_snapshot)==null?void 0:It.address)||"……………………………………"),o(((kt=i.buyer_snapshot)==null?void 0:kt.phone)||"……………………………………"),o(((Rt=i.buyer_snapshot)==null?void 0:Rt.email)||"……………………………………"),o(c!=null&&c.bot_username?`@${c.bot_username}`:"……………………………………"),o(((_t=i.customer)==null?void 0:_t.telegram_id)||((Mt=i.customer)==null?void 0:Mt.id)||"—");const lt=o(E.charAt(0).toUpperCase()),d=o(E),x=nt(at,"MMM dd, yyyy"),h=o(F),w=`${(P||0).toFixed(2)} MMK`,m=`${(ot||0).toFixed(2)} MMK`,g=40,b=170,f=g+b+5,C=f+12+118+6+12,z=C+6,r=28,O=30,pt=z+r+6,dt=pt+W*O+22,xt=dt+155+10,ct=xt+65+5,mt=28,ft=ct+mt+20;let gt="";for(let A=0;A<W;A++){const T=q[A],y=pt+A*O;let ht;if(T){const Bt=`${((T.price||0)*(T.quantity||0)).toFixed(2)} MMK`,Ct=o(T.product_name||T.name||"—"),Et=T.variant_label?o(` [${T.variant_label}]`):"";ht=`
        <text x="55" y="${y+19}" fill="${l}" font-weight="600" font-size="12">${A+1}</text>
        <text x="100" y="${y+19}" fill="${a}" font-size="12">${Ct}${Et}</text>
        <text x="${M}" y="${y+19}" text-anchor="middle" fill="${a}" font-size="12">${T.quantity||"—"}</text>
        <text x="${K}" y="${y+19}" text-anchor="end" fill="${a}" font-size="12">${(T.price||0).toFixed(2)} MMK</text>
        <text x="${G}" y="${y+19}" text-anchor="end" fill="${a}" font-size="12">${Bt}</text>`}else ht=`
        <text x="55" y="${y+19}" fill="${k}" font-weight="600" font-size="12">${A+1}</text>
        <text x="100" y="${y+19}" fill="${k}" font-size="12">${"·".repeat(30)}</text>
        <text x="${M}" y="${y+19}" text-anchor="middle" fill="${k}" font-size="12">${"·".repeat(4)}</text>
        <text x="${K}" y="${y+19}" text-anchor="end" fill="${k}" font-size="12">${"·".repeat(10)}</text>
        <text x="${G}" y="${y+19}" text-anchor="end" fill="${k}" font-size="12">${"·".repeat(10)}</text>`;gt+=`<g>
      <line x1="40" y1="${y+O-1}" x2="760" y2="${y+O-1}" stroke="${n}" stroke-width="1"/>
      ${ht}
    </g>`}const $t=(i==null?void 0:i.delivery_fee)>0?{l:"Delivery Fee",v:`+ ${Number(i.delivery_fee).toFixed(2)} MMK`}:null,Lt=[{l:"Subtotal",v:w},{l:"Discount",v:`- ${w}`},{l:"Tax",v:"+ 0.00 MMK"},...$t?[$t]:[]];let ut="";return Lt.forEach((A,T)=>{const y=T*22;ut+=`
      <text x="0" y="${y+15}" fill="${a}" font-size="13" font-weight="500">${A.l}</text>
      <text x="85" y="${y+15}" fill="${s}" font-size="13">:</text>
      <text x="100" y="${y+15}" fill="${s}" font-size="13">${A.v}</text>`}),`<svg xmlns="http://www.w3.org/2000/svg" width="${I*2}" height="${ft*2}" viewBox="0 0 ${I} ${ft}">
  <defs><style>
    text{font-family:'Open Sans',system-ui,-apple-system,sans-serif;font-size:12px}
    .r{font-family:'Roboto',system-ui,sans-serif}
    .dc{font-family:'Dancing Script',cursive}
    .w{fill:#fff}
  </style>
  </defs>
  <rect width="${I}" height="${ft}" fill="#fff"/>
  <!-- TOP BAR -->
  <rect width="${I}" height="10" fill="${l}"/>

  <!-- ============ HEADER (y=${g}) ============ -->
  <defs>
    <clipPath id="logoClip">
      <circle cx="50" cy="50" r="50"/>
    </clipPath>
  </defs>
  <g transform="translate(${$}, ${g})">
    <!-- Logo -->
    <circle cx="50" cy="50" r="50" fill="#fff" stroke="${l}" stroke-width="2"/>
    ${N?`<image href="${o(N)}" x="0" y="0" width="100" height="100" preserveAspectRatio="xMidYMid slice" clip-path="url(#logoClip)"/>`:`<text x="50" y="56" text-anchor="middle" fill="${l}" font-size="16" font-weight="600" class="r">${lt}</text>`}

    <!-- Shop info -->
    <text x="140" y="22" fill="${l}" font-size="24" font-weight="700" class="r">${d}</text>
    <text x="140" y="44" fill="${s}" font-size="13">${o(B)}</text>

    <!-- Contacts -->
    <text x="140" y="68" fill="${s}" font-size="12">📞</text>
    <text x="160" y="68" fill="${s}" font-size="12">${o(D)}</text>
    <line x1="160" y1="74" x2="350" y2="74" stroke="${n}" stroke-width="1"/>

    <text x="140" y="90" fill="${s}" font-size="12">✉️</text>
    <text x="160" y="90" fill="${s}" font-size="12">${o(U)}</text>
    <line x1="160" y1="96" x2="350" y2="96" stroke="${n}" stroke-width="1"/>

    <text x="140" y="112" fill="${s}" font-size="12">🌐</text>
    <text x="160" y="112" fill="${s}" font-size="12">${o(H)}</text>
    <line x1="160" y1="118" x2="350" y2="118" stroke="${n}" stroke-width="1"/>

    <text x="140" y="134" fill="${s}" font-size="12">📍</text>
    <text x="160" y="134" fill="${s}" font-size="12">${o(S.slice(0,40))}</text>
    ${S.length>40?`<text x="160" y="152" fill="${s}" font-size="12">${o(S.slice(40,80))}</text><line x1="160" y1="158" x2="350" y2="158" stroke="${n}" stroke-width="1"/>`:`<line x1="160" y1="140" x2="350" y2="140" stroke="${n}" stroke-width="1"/>`}

    ${p?`<!-- INVOICE heading (right) -->
    <text x="720" y="22" text-anchor="end" fill="${l}" font-size="44" font-weight="700" class="r">INVOICE</text>
    <text x="720" y="46" text-anchor="end" fill="${L}" font-size="15" class="dc">Thank you for your purchase!</text>
    <line x1="550" y1="54" x2="720" y2="54" stroke="${L}" stroke-width="2"/>

    <!-- Meta rows -->
    <g transform="translate(0, 0)">
      <text x="460" y="80" fill="${a}" font-size="13" font-weight="600">Invoice No.</text>
      <text x="565" y="80" fill="${s}" font-size="13">:</text>
      <text x="580" y="80" fill="${s}" font-size="13">${o(X)}</text>
      <line x1="580" y1="86" x2="720" y2="86" stroke="${n}" stroke-width="1"/>
    </g>
    <g transform="translate(0, 0)">
      <text x="460" y="102" fill="${a}" font-size="13" font-weight="600">Date</text>
      <text x="565" y="102" fill="${s}" font-size="13">:</text>
      <text x="580" y="102" fill="${s}" font-size="13">${x}</text>
      <line x1="580" y1="108" x2="720" y2="108" stroke="${n}" stroke-width="1"/>
    </g>
    <g transform="translate(0, 0)">
      <text x="460" y="124" fill="${a}" font-size="13" font-weight="600">Order ID</text>
      <text x="565" y="124" fill="${s}" font-size="13">:</text>
      <text x="580" y="124" fill="${s}" font-size="13">${Z}</text>
      <line x1="580" y1="130" x2="720" y2="130" stroke="${n}" stroke-width="1"/>
    </g>
    <g transform="translate(0, 0)">
      <text x="460" y="146" fill="${a}" font-size="13" font-weight="600">Payment Status</text>
      <text x="565" y="146" fill="${s}" font-size="13">:</text>
      <text x="580" y="146" fill="${s}" font-size="13">Pending</text>
      <line x1="580" y1="152" x2="720" y2="152" stroke="${n}" stroke-width="1"/>
    </g>`:`<!-- RECEIPT heading (right) -->
    <text x="720" y="22" text-anchor="end" fill="${l}" font-size="52" font-weight="700" class="r">RECEIPT</text>
    <text x="720" y="48" text-anchor="end" fill="${L}" font-size="16" class="dc">Thank you for your purchase!</text>
    <line x1="550" y1="56" x2="720" y2="56" stroke="${L}" stroke-width="2"/>

    <!-- Meta rows -->
    <g transform="translate(0, 0)">
      <text x="460" y="80" fill="${a}" font-size="13" font-weight="600">Invoice No.</text>
      <text x="565" y="80" fill="${s}" font-size="13">:</text>
      <text x="580" y="80" fill="${s}" font-size="13">${o(X)}</text>
      <line x1="580" y1="86" x2="720" y2="86" stroke="${n}" stroke-width="1"/>
    </g>
    <g transform="translate(0, 0)">
      <text x="460" y="102" fill="${a}" font-size="13" font-weight="600">Receipt No.</text>
      <text x="565" y="102" fill="${s}" font-size="13">:</text>
      <text x="580" y="102" fill="${s}" font-size="13">${o(rt)}</text>
      <line x1="580" y1="108" x2="720" y2="108" stroke="${n}" stroke-width="1"/>
    </g>
    <g transform="translate(0, 0)">
      <text x="460" y="124" fill="${a}" font-size="13" font-weight="600">Payment Status</text>
      <text x="565" y="124" fill="${s}" font-size="13">:</text>
      <text x="580" y="124" fill="${s}" font-size="13">Paid</text>
      <line x1="580" y1="130" x2="720" y2="130" stroke="${n}" stroke-width="1"/>
    </g>`}
  </g>
  <line x1="${$}" y1="${g+b}" x2="${I-$}" y2="${g+b}" stroke="${n}" stroke-width="1"/>

  <!-- ============ MID SECTION (y=${f}) ============ -->
  <!-- ${p?"Bill To":"Received From"} -->
  <g transform="translate(${$}, ${f+12})">
    <rect x="0" y="0" width="${p?115:150}" height="28" rx="5" fill="${l}"/>
    <text x="12" y="19" fill="#fff" font-size="13" font-weight="500" class="r">👤 ${p?"Bill To":"Received From"}</text>
    <text x="0" y="52" fill="${a}" font-size="12" font-weight="600">Name</text>
    <text x="60" y="52" fill="${s}" font-size="12">:</text>
    <text x="70" y="52" fill="${s}" font-size="12">${tt}</text>
    <line x1="70" y1="58" x2="350" y2="58" stroke="${n}" stroke-width="1"/>

    <text x="0" y="74" fill="${a}" font-size="12" font-weight="600">Phone</text>
    <text x="60" y="74" fill="${s}" font-size="12">:</text>
    <text x="70" y="74" fill="${s}" font-size="12">${et}</text>
    <line x1="70" y1="80" x2="350" y2="80" stroke="${n}" stroke-width="1"/>

    <text x="0" y="96" fill="${a}" font-size="12" font-weight="600">Email</text>
    <text x="60" y="96" fill="${s}" font-size="12">:</text>
    <text x="70" y="96" fill="${s}" font-size="12">${it}</text>
    <line x1="70" y1="102" x2="350" y2="102" stroke="${n}" stroke-width="1"/>

    <text x="0" y="118" fill="${a}" font-size="12" font-weight="600">Address</text>
    <text x="60" y="118" fill="${s}" font-size="12">:</text>
    <text x="70" y="118" fill="${s}" font-size="12">${st}</text>
    <line x1="70" y1="124" x2="350" y2="124" stroke="${n}" stroke-width="1"/>
  </g>

  <!-- Vertical divider -->
  <line x1="400" y1="${f+12}" x2="400" y2="${C-5}" stroke="${n}" stroke-width="1"/>

  <!-- ${p?"Order Details":"Payment Details"} -->
  <g transform="translate(415, ${f+12})">
    <rect x="0" y="0" width="${p?170:200}" height="28" rx="5" fill="${l}"/>
    <text x="12" y="19" fill="#fff" font-size="13" font-weight="500" class="r">🧾 ${p?"ORDER DETAILS":"PAYMENT DETAILS"}</text>
    <text x="0" y="52" fill="${a}" font-size="12" font-weight="600">${p?"Amount to pay":"Amount Paid"}</text>
    <text x="85" y="52" fill="${s}" font-size="12">:</text>
    <text x="95" y="52" fill="${s}" font-size="12">${m}</text>
    <line x1="95" y1="58" x2="345" y2="58" stroke="${n}" stroke-width="1"/>

    <text x="0" y="74" fill="${a}" font-size="12" font-weight="600">Payment</text>
    <text x="85" y="74" fill="${s}" font-size="12">:</text>
    <text x="95" y="74" fill="${s}" font-size="12">${h}</text>
    <line x1="95" y1="80" x2="345" y2="80" stroke="${n}" stroke-width="1"/>

    <text x="0" y="96" fill="${a}" font-size="12" font-weight="600">Date</text>
    <text x="85" y="96" fill="${s}" font-size="12">:</text>
    <text x="95" y="96" fill="${s}" font-size="12">${x}</text>
    <line x1="95" y1="102" x2="345" y2="102" stroke="${n}" stroke-width="1"/>

  </g>
  <line x1="${$}" y1="${C}" x2="${I-$}" y2="${C}" stroke="${n}" stroke-width="1"/>

  <!-- ============ TABLE (bar y=${z}) ============ -->
  <rect x="${$}" y="${z}" width="${Y}" height="${r}" rx="5" fill="${l}"/>
  <text x="55" y="${z+19}" fill="#fff" font-size="12" font-weight="600" class="r">#</text>
  <text x="100" y="${z+19}" fill="#fff" font-size="12" font-weight="600" class="r">PRODUCTS</text>
  <text x="${M}" y="${z+19}" text-anchor="middle" fill="#fff" font-size="12" font-weight="600" class="r">QTY</text>
  <text x="${K}" y="${z+19}" text-anchor="end" fill="#fff" font-size="12" font-weight="600" class="r">UNIT PRICE</text>
  <text x="${G}" y="${z+19}" text-anchor="end" fill="#fff" font-size="12" font-weight="600" class="r">TOTAL PRICE</text>
  ${gt}

  <!-- ============ BOTTOM (y=${dt}) ============ -->
  <g transform="translate(${$}, ${dt})">
    <!-- LEFT: Payment -->
    <rect x="0" y="0" width="290" height="50" rx="8" fill="#fff" stroke="${n}" stroke-width="1"/>
    <text x="15" y="20" fill="${l}" font-size="13" font-weight="500" class="r">💳 PAYMENT METHOD</text>
    <text x="15" y="42" fill="${s}" font-size="12">${h}</text>

    <rect x="0" y="65" width="290" height="70" rx="8" fill="#fff" stroke="${n}" stroke-width="1"/>
    <text x="15" y="85" fill="${l}" font-size="13" font-weight="500" class="r">💰 ${p?"AMOUNT TO PAY":"AMOUNT PAID"}</text>
    <text x="15" y="115" fill="${l}" font-size="16" font-weight="700">${m}</text>
    <line x1="15" y1="122" x2="130" y2="122" stroke="${L}" stroke-width="2"/>

    <!-- RIGHT: Totals -->
    <g transform="translate(340, 0)">
      ${ut}
      <rect x="0" y="97" width="380" height="38" rx="5" fill="${l}"/>
      <text x="15" y="121" fill="#fff" font-size="17" font-weight="700" class="r">TOTAL</text>
      <text x="365" y="121" text-anchor="end" fill="#fff" font-size="17" font-weight="700" class="r">${m}</text>
    </g>
  </g>

  <!-- ============ FOOTER (y=${xt}) ============ -->
  <g transform="translate(${$}, ${xt})">
    <line x1="0" y1="0" x2="${Y}" y2="0" stroke="${n}" stroke-width="1"/>
    ${_?`<text x="0" y="24" fill="${s}" font-size="10">${o(_.slice(0,100))}</text>${_.length>100?`<text x="0" y="38" fill="${s}" font-size="10">${o(_.slice(100))}</text>`:""}`:""}
  </g>

  <!-- ============ WEBSITE BAR ============ -->
  <rect x="0" y="${ct}" width="${I}" height="${mt}" fill="${l}"/>
  <text x="400" y="${ct+18}" text-anchor="middle" fill="rgba(255,255,255,0.85)" font-size="11">${d}</text>
</svg>`}function Jt({order:i,bot:c,open:E,onClose:q,receiptType:P="receipt",receiptSettings:ot={}}){var Z,tt,et,it,st,lt;const at=Q.useRef(null),[F,W]=Q.useState(!1),[X,rt]=Q.useState(1),[J,V]=Q.useState(""),{addToast:p}=Pt();if(Q.useEffect(()=>{if(!E||!i)return;i.invoice_number?V(i.invoice_number):(V(""),Dt(i.id).then(x=>{V(x.invoice_number)}).catch(()=>{}));const d=()=>{const x=window.innerWidth-32;rt(Math.min(1,x/St))};return d(),window.addEventListener("resize",d),document.body.style.overflow="hidden",()=>{window.removeEventListener("resize",d),document.body.style.overflow=""}},[E,i]),!i)return null;const B=c?Nt(c.bot_full_name||c.bot_username||"Shop"):"Shop",D=i.items||[],U=D.reduce((d,x)=>d+(x.price||0)*(x.quantity||0),0),H=Number(i.delivery_fee)||0,S=U+H,_=i.created_at?new Date(i.created_at):new Date,N=i.payment_method||"Cash",I=B.split(" ").map(d=>d.charAt(0).toUpperCase()).join(""),$=i.receipt_no||`${I}-ECM-${nt(_,"yyyyMMdd")}-${(i.order_number||String(i.id)).slice(-3)}`,Y=Math.max(5,D.length),l=P==="invoice",{tagline:L="Your Trusted Online Store",phone:a="Phone",email:s=(c==null?void 0:c.admin_notification_email)||"Email",website:n="Website",address:k="Address",notes:M=""}=ot,K=async d=>{try{return await new Promise((h,w)=>{const m=new Image;m.crossOrigin="anonymous",m.onload=()=>h(m),m.onerror=w,m.src=d})}catch{const w=await(await fetch(d)).blob();if(!w||!w.size)throw new Error("empty blob");const m=URL.createObjectURL(w);try{return await new Promise((g,b)=>{const f=new Image;f.onload=()=>g(f),f.onerror=b,f.src=m})}finally{URL.revokeObjectURL(m)}}},G=async()=>{W(!0);try{let d=null;const x=(c==null?void 0:c.profile_picture)||"";if(x)try{d=await K(x)}catch(r){console.warn("Logo load skipped:",r)}const h=Ut(i,c,B,D,U,S,_,N,Y,J,$,P,{tagline:L,phone:a,email:s,website:n,address:k,notes:M,botLogo:""}),w=new Blob([h],{type:"image/svg+xml"}),m=URL.createObjectURL(w),g=new Image;await new Promise((r,O)=>{g.onload=r,g.onerror=O,g.src=m});const b=document.createElement("canvas");b.width=g.naturalWidth,b.height=g.naturalHeight;const f=b.getContext("2d");if(f.drawImage(g,0,0),URL.revokeObjectURL(m),d){const r=b.width/800;f.save(),f.beginPath(),f.arc(90*r,90*r,50*r,0,Math.PI*2),f.clip(),f.drawImage(d,40*r,40*r,100*r,100*r),f.restore()}const C=`${P}-${i.order_number||i.id}.png`,z=b.toDataURL("image/png");if(window.AndroidBridge&&typeof window.AndroidBridge.downloadBase64=="function"){const r=z.split(",")[1];window.AndroidBridge.downloadBase64(r,"image/png",`filename="${C}"`)}else{const r=document.createElement("a");r.download=C,r.href=z,document.body.appendChild(r),r.click(),document.body.removeChild(r)}p("Receipt downloaded successfully")}catch(d){console.error("Receipt export failed:",d),p("Failed to generate receipt image","error")}finally{W(!1)}};return t.jsx(Ot,{children:E&&t.jsxs(t.Fragment,{children:[t.jsx(At.div,{initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},onClick:q,className:"fixed inset-0 bg-black/40 backdrop-blur-sm z-50"}),t.jsxs(At.div,{initial:{y:"100%"},animate:{y:0},exit:{y:"100%"},transition:{type:"spring",damping:25,stiffness:200},className:"fixed bottom-0 left-0 right-0 z-[60] bg-gray-100 rounded-t-[32px] md:rounded-[32px] md:shadow-2xl max-h-[90dvh] flex flex-col md:max-w-2xl md:mx-auto md:bottom-10",children:[t.jsx("div",{className:"sticky top-0 bg-gray-100 z-10 rounded-t-[32px] pt-4 pb-2 flex flex-col items-center",children:t.jsx("div",{className:"w-10 h-1 bg-gray-200 rounded-full"})}),t.jsxs("div",{className:"flex items-center justify-between px-4 pb-3 flex-shrink-0",children:[t.jsx("h2",{className:"text-lg font-bold text-gray-900",children:P==="invoice"?"Invoice":"Receipt"}),t.jsxs("div",{className:"flex items-center gap-2",children:[t.jsxs("button",{onClick:G,disabled:F,className:"px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center gap-1.5 text-sm",children:[F?t.jsx(Wt,{className:"w-4 h-4 animate-spin"}):t.jsx(Vt,{className:"w-4 h-4"}),F?"Generating...":"Download PNG"]}),t.jsx("button",{onClick:q,className:"p-2 bg-white rounded-full shadow-sm active:scale-90 transition-transform",children:t.jsx(Ft,{className:"w-5 h-5 text-gray-500"})})]})]}),t.jsx("div",{className:"flex-1 overflow-y-hidden px-4 pb-6",children:t.jsx("div",{className:"flex justify-center",children:t.jsx("div",{style:{transform:`scale(${X})`,transformOrigin:"top center"},children:t.jsxs("div",{ref:at,style:e.wrap,children:[t.jsx("div",{style:e.topLine}),t.jsxs("div",{style:e.header,children:[t.jsxs("div",{style:e.shopInfo,children:[t.jsx("div",{style:e.logoCircle,children:c!=null&&c.profile_picture?t.jsx("img",{src:c.profile_picture,alt:"Logo",style:{width:"100%",height:"100%",objectFit:"cover",borderRadius:"50%"}}):B.charAt(0).toUpperCase()}),t.jsxs("div",{style:e.shopDetails,children:[t.jsx("div",{style:e.shopName,children:B}),t.jsx("div",{style:e.tagline,children:L}),t.jsxs("div",{style:e.contactRow,children:[t.jsx("span",{style:e.contactIcon,children:"📞"}),t.jsx("span",{style:e.contactValue,children:a})]}),t.jsxs("div",{style:e.contactRow,children:[t.jsx("span",{style:e.contactIcon,children:"✉️"}),t.jsx("span",{style:e.contactValue,children:s})]}),t.jsxs("div",{style:e.contactRow,children:[t.jsx("span",{style:e.contactIcon,children:"🌐"}),t.jsx("span",{style:e.contactValue,children:n})]}),t.jsxs("div",{style:e.contactRow,children:[t.jsx("span",{style:e.contactIcon,children:"📍"}),t.jsxs("span",{style:e.contactValue,children:[k.slice(0,40),k.length>40&&t.jsxs(t.Fragment,{children:[t.jsx("br",{}),k.slice(40,80)]})]})]})]})]}),t.jsxs("div",{style:e.receiptBlock,children:[t.jsx("div",{style:l?e.invoiceHeading:e.receiptHeading,children:l?"INVOICE":"RECEIPT"}),t.jsx("div",{style:e.thankYou,children:"Thank you for your purchase!"}),t.jsxs("div",{style:e.metaRight,children:[t.jsx("span",{style:e.metaLabel,children:"Invoice No."}),t.jsx("span",{style:e.metaColon,children:":"}),t.jsx("span",{style:e.metaValue,children:J||"..."})]}),l?t.jsxs(t.Fragment,{children:[t.jsxs("div",{style:e.metaRight,children:[t.jsx("span",{style:e.metaLabel,children:"Date"}),t.jsx("span",{style:e.metaColon,children:":"}),t.jsx("span",{style:e.metaValue,children:nt(_,"MMM dd, yyyy")})]}),t.jsxs("div",{style:e.metaRight,children:[t.jsx("span",{style:e.metaLabel,children:"Order ID"}),t.jsx("span",{style:e.metaColon,children:":"}),t.jsx("span",{style:e.metaValue,children:i.order_number||`#${i.id}`})]}),t.jsxs("div",{style:e.metaRight,children:[t.jsx("span",{style:e.metaLabel,children:"Payment Status"}),t.jsx("span",{style:e.metaColon,children:":"}),t.jsx("span",{style:e.metaValue,children:"Pending"})]})]}):t.jsxs(t.Fragment,{children:[t.jsxs("div",{style:e.metaRight,children:[t.jsx("span",{style:e.metaLabel,children:"Receipt No."}),t.jsx("span",{style:e.metaColon,children:":"}),t.jsx("span",{style:e.metaValue,children:$})]}),t.jsxs("div",{style:e.metaRight,children:[t.jsx("span",{style:e.metaLabel,children:"Payment Status"}),t.jsx("span",{style:e.metaColon,children:":"}),t.jsx("span",{style:e.metaValue,children:"Paid"})]})]})]})]}),t.jsxs("div",{style:e.mid,children:[t.jsxs("div",{style:e.midColBorder,children:[t.jsxs("div",{style:e.sectionTitle,children:[t.jsx("span",{children:"👤"})," ",l?"Bill To":"Received From"]}),t.jsxs("div",{style:e.fieldItem,children:[t.jsx("span",{style:e.fieldLabel,children:"Name"}),t.jsx("span",{style:e.fieldSep,children:":"}),t.jsx("span",{style:e.fieldValue,children:((Z=i.buyer_snapshot)==null?void 0:Z.name)||((tt=i.buyer_snapshot)==null?void 0:tt.full_name)||((et=i.customer)==null?void 0:et.first_name)||"—"})]}),t.jsxs("div",{style:e.fieldItem,children:[t.jsx("span",{style:e.fieldLabel,children:"Phone"}),t.jsx("span",{style:e.fieldSep,children:":"}),t.jsx("span",{style:e.fieldValue,children:((it=i.buyer_snapshot)==null?void 0:it.phone)||"—"})]}),t.jsxs("div",{style:e.fieldItem,children:[t.jsx("span",{style:e.fieldLabel,children:"Email"}),t.jsx("span",{style:e.fieldSep,children:":"}),t.jsx("span",{style:e.fieldValue,children:((st=i.buyer_snapshot)==null?void 0:st.email)||"—"})]}),t.jsxs("div",{style:e.fieldItem,children:[t.jsx("span",{style:e.fieldLabel,children:"Address"}),t.jsx("span",{style:e.fieldSep,children:":"}),t.jsx("span",{style:e.fieldValue,children:((lt=i.buyer_snapshot)==null?void 0:lt.address)||"—"})]})]}),t.jsxs("div",{style:e.midCol,children:[t.jsxs("div",{style:e.sectionTitle,children:[t.jsx("span",{children:"🧾"})," ",l?"ORDER DETAILS":"PAYMENT DETAILS"]}),t.jsxs("div",{style:{...e.fieldItem,"--label-w":"120px"},children:[t.jsx("span",{style:e.fieldLabelWide,children:l?"Amount to pay":"Amount Paid"}),t.jsx("span",{style:e.fieldSep,children:":"}),t.jsxs("span",{style:e.fieldValue,children:[S.toFixed(2)," MMK"]})]}),t.jsxs("div",{style:e.fieldItem,children:[t.jsx("span",{style:e.fieldLabelWide,children:"Payment"}),t.jsx("span",{style:e.fieldSep,children:":"}),t.jsx("span",{style:e.fieldValue,children:N})]}),t.jsxs("div",{style:e.fieldItem,children:[t.jsx("span",{style:e.fieldLabelWide,children:"Date"}),t.jsx("span",{style:e.fieldSep,children:":"}),t.jsx("span",{style:e.fieldValue,children:nt(_,"MMM dd, yyyy")})]})]})]}),t.jsxs("div",{style:e.tableWrap,children:[t.jsxs("div",{style:e.tableHeader,children:[t.jsx("div",{style:e.thId,children:"#"}),t.jsx("div",{style:e.thProduct,children:"PRODUCTS"}),t.jsx("div",{style:e.thQty,children:"QTY"}),t.jsx("div",{style:l?e.thPriceInv:e.thPrice,children:"UNIT PRICE"}),t.jsx("div",{style:l?e.thTotalInv:e.thTotal,children:"TOTAL PRICE"})]}),Array.from({length:Y}).map((d,x)=>{const h=D[x];if(h){const w=(h.price||0)*(h.quantity||0);return t.jsxs("div",{style:e.tableRow,children:[t.jsx("div",{style:e.tdId,children:x+1}),t.jsxs("div",{style:e.tdProduct,children:[h.product_name||h.name||"—",h.variant_label?t.jsxs("span",{style:{color:"#9ca3af",fontSize:10},children:[" [",h.variant_label,"]"]}):null]}),t.jsx("div",{style:e.tdQty,children:h.quantity||"—"}),t.jsxs("div",{style:l?e.tdUnitInv:e.tdUnit,children:[(h.price||0).toFixed(2)," MMK"]}),t.jsxs("div",{style:l?e.tdTotalInv:e.tdTotal,children:[w.toFixed(2)," MMK"]})]},x)}return t.jsxs("div",{style:e.tableRow,children:[t.jsx("div",{style:e.tdId,children:x+1}),t.jsx("div",{style:e.tdProduct,children:"·".repeat(30)}),t.jsx("div",{style:e.tdQty,children:"·".repeat(4)}),t.jsx("div",{style:l?e.tdUnitInv:e.tdUnit,children:"·".repeat(8)}),t.jsx("div",{style:l?e.tdTotalInv:e.tdTotal,children:"·".repeat(8)})]},`empty-${x}`)})]}),t.jsxs("div",{style:e.bottom,children:[t.jsxs("div",{style:e.paymentBlock,children:[t.jsxs("div",{style:e.payBox,children:[t.jsx("div",{style:e.payTitle,children:"💳 PAYMENT METHOD"}),t.jsx("div",{style:e.payValue,children:N})]}),t.jsxs("div",{style:{...e.payBox,...e.amountPaid},children:[t.jsxs("div",{style:e.payTitle,children:["💰 ",l?"AMOUNT TO PAY":"AMOUNT PAID"]}),t.jsxs("div",{style:e.amountValue,children:[S.toFixed(2)," MMK"]})]})]}),t.jsxs("div",{style:e.totalsCol,children:[t.jsxs("div",{style:e.totalsRow,children:[t.jsx("span",{style:e.totalLabel,children:"Subtotal"}),t.jsx("span",{style:e.totalColon,children:":"}),t.jsxs("span",{style:e.totalValue,children:[U.toFixed(2)," MMK"]})]}),t.jsxs("div",{style:e.totalsRow,children:[t.jsx("span",{style:e.totalLabel,children:"Discount"}),t.jsx("span",{style:e.totalColon,children:":"}),t.jsx("span",{style:e.totalValue,children:"- 0.00 MMK"})]}),t.jsxs("div",{style:e.totalsRow,children:[t.jsx("span",{style:e.totalLabel,children:"Tax"}),t.jsx("span",{style:e.totalColon,children:":"}),t.jsx("span",{style:e.totalValue,children:"+ 0.00 MMK"})]}),H>0&&t.jsxs("div",{style:e.totalsRow,children:[t.jsx("span",{style:e.totalLabel,children:"Delivery Fee"}),t.jsx("span",{style:e.totalColon,children:":"}),t.jsxs("span",{style:e.totalValue,children:["+ ",H.toFixed(2)," MMK"]})]}),t.jsxs("div",{style:e.grandTotal,children:[t.jsx("span",{style:{fontWeight:700,color:"#fff",fontFamily:"'Roboto', system-ui, sans-serif"},children:"TOTAL"}),t.jsx("span",{style:{color:"#fff"},children:":"}),t.jsxs("span",{style:e.grandTotalValue,children:[S.toFixed(2)," MMK"]})]})]})]}),t.jsx("div",{style:e.footer,children:M?t.jsxs("div",{style:e.footerNotes,children:[M.slice(0,100),M.length>100&&t.jsxs(t.Fragment,{children:[t.jsx("br",{}),M.slice(100)]})]}):null}),t.jsx("div",{style:e.websiteBar,children:t.jsx("span",{children:B})})]})})})})]})]})})}export{Jt as R};
