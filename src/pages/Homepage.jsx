import { useEffect, useRef, useState } from 'react';

const CSS = `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#0a0a0f;
  --surface:#111118;
  --surface2:#18181f;
  --border:#26262f;
  --accent:#ff6b2b;
  --accent2:#ff3d7f;
  --accent3:#ffb627;
  --accent-cool:#38bdf8;
  --text:#f5f5fa;
  --muted:#8a8a9a;
  --card:#0e0e15;
  --radius:18px;
  --r-sm:10px;
}
html{scroll-behavior:smooth}
body{background:var(--bg);color:var(--text);font-family:'DM Sans',sans-serif;font-size:16px;line-height:1.6;overflow-x:hidden;-webkit-font-smoothing:antialiased;}
body::before{content:'';position:fixed;inset:0;background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E");pointer-events:none;z-index:0;opacity:.6;}
.orb{position:fixed;border-radius:50%;filter:blur(100px);pointer-events:none;z-index:0;animation:orb-float 14s ease-in-out infinite alternate;}
.orb1{width:600px;height:600px;background:radial-gradient(circle,rgba(255,107,43,.12),transparent 70%);top:-150px;left:-150px;animation-delay:0s}
.orb2{width:500px;height:500px;background:radial-gradient(circle,rgba(255,61,127,.1),transparent 70%);bottom:100px;right:-150px;animation-delay:-5s}
.orb3{width:350px;height:350px;background:radial-gradient(circle,rgba(255,182,39,.08),transparent 70%);top:40%;left:40%;animation-delay:-9s}
@keyframes orb-float{0%{transform:translate(0,0) scale(1)}100%{transform:translate(40px,25px) scale(1.1)}}
.hp-nav{position:fixed;top:0;left:0;right:0;z-index:100;display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:rgba(10,10,15,.75);-webkit-backdrop-filter:blur(28px);backdrop-filter:blur(28px);border-bottom:1px solid var(--border);transition:all .3s;}
.hp-nav.scrolled{background:rgba(10,10,15,.95)}
.hp-nav-logo{display:flex;align-items:center;text-decoration:none;flex-shrink:0;}
.hp-nav-logo img{height:28px;width:auto;display:block;}
.hp-nav-actions{display:flex;align-items:center;gap:5px;flex-shrink:0;}
.btn-ghost{padding:4px 8px;background:transparent;border:1px solid var(--border);border-radius:var(--r-sm);color:var(--muted);font-family:'DM Sans',sans-serif;font-size:.7rem;font-weight:500;cursor:pointer;transition:all .2s;text-decoration:none;white-space:nowrap;}
.btn-ghost:hover{color:var(--text);border-color:var(--accent);background:rgba(255,107,43,.07)}
.btn-primary{padding:4px 8px;background:linear-gradient(135deg,var(--accent),var(--accent2));border:none;border-radius:var(--r-sm);color:#fff;font-family:'DM Sans',sans-serif;font-size:.7rem;font-weight:600;cursor:pointer;transition:all .2s;text-decoration:none;box-shadow:0 0 18px rgba(255,107,43,.35);white-space:nowrap;}
.btn-primary:hover{transform:translateY(-1px);box-shadow:0 4px 22px rgba(255,107,43,.55)}
.hp-main{position:relative;z-index:1}
.hp-section{padding:60px 20px;position:relative;z-index:1}
.hp-section-label{font-size:.65rem;font-weight:600;text-transform:uppercase;letter-spacing:.1em;color:var(--accent);margin-bottom:8px;}
@media(min-width:768px){.hp-section-label{font-size:.72rem}}
.hp-section-title{font-family:'Syne',sans-serif;font-weight:800;font-size:clamp(1.15rem,4.5vw,2.3rem);letter-spacing:-.02em;line-height:1.2;margin-bottom:10px;}
.hp-section-sub{color:var(--muted);font-size:.82rem;max-width:400px;font-weight:300;line-height:1.5;}
@media(min-width:768px){.hp-section-sub{font-size:.92rem}}
.hero{min-height:100svh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:80px 16px 50px;}
.hero-badge{display:inline-flex;align-items:center;gap:5px;padding:4px 10px;background:rgba(255,107,43,.1);border:1px solid rgba(255,107,43,.3);border-radius:100px;font-size:.68rem;font-weight:500;color:var(--accent);margin-bottom:16px;animation:fade-up .6s ease both;}
.badge-dot{width:5px;height:5px;background:var(--accent3);border-radius:50%;animation:pulse-dot 2s ease-in-out infinite;}
@keyframes pulse-dot{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(1.5)}}
.hero h1{font-family:'Syne',sans-serif;font-weight:800;font-size:clamp(.85rem,4.5vw,3.8rem);line-height:1.25;letter-spacing:-.005em;margin-bottom:8px;animation:fade-up .6s .1s ease both;}
.hero h1 .line2{display:block}
.hero h1 .line2{background:linear-gradient(135deg,var(--accent) 0%,var(--accent2) 50%,var(--accent3) 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;}
.hero-sub{font-size:clamp(.72rem,2.2vw,1rem);color:var(--muted);max-width:420px;margin:0 auto 20px;font-weight:300;line-height:1.5;animation:fade-up .6s .2s ease both;}
.hero-cta{display:flex;flex-direction:column;align-items:center;gap:12px;animation:fade-up .6s .3s ease both;}
.btn-hero{padding:11px 24px;background:linear-gradient(135deg,var(--accent),var(--accent2));border:none;border-radius:12px;color:#fff;font-family:'DM Sans',sans-serif;font-size:.88rem;font-weight:600;cursor:pointer;transition:all .25s;text-decoration:none;box-shadow:0 0 36px rgba(255,107,43,.4),inset 0 1px 0 rgba(255,255,255,.12);width:100%;max-width:240px;display:flex;align-items:center;justify-content:center;gap:8px;}
.btn-hero:hover{transform:translateY(-2px);box-shadow:0 8px 36px rgba(255,107,43,.6)}
.btn-hero-outline{padding:11px 24px;background:transparent;border:1px solid var(--border);border-radius:12px;color:var(--text);font-family:'DM Sans',sans-serif;font-size:.88rem;font-weight:500;cursor:pointer;transition:all .25s;text-decoration:none;width:100%;max-width:240px;display:flex;align-items:center;justify-content:center;gap:8px;}
.btn-hero-outline:hover{background:var(--surface);border-color:var(--accent)}
.btn-hero,.btn-hero-outline,.plan-cta{white-space:nowrap}
.hero-note{font-size:.76rem;color:var(--muted);margin-top:4px}
.hero-note span{color:var(--accent3)}
.platforms{margin-top:20px;display:flex;align-items:center;justify-content:center;gap:5px;flex-wrap:nowrap;animation:fade-up .6s .4s ease both;}
@media(max-width:400px){.plat-chip{font-size:.58rem;padding:2px 5px;gap:2px}}
.plat-label{font-size:.76rem;color:var(--muted)}
.plat-chip{display:flex;align-items:center;gap:4px;padding:4px 8px;background:var(--surface);border:1px solid var(--border);border-radius:100px;font-size:.68rem;font-weight:500;color:var(--text);white-space:nowrap;}
@media(max-width:400px){.plat-chip{font-size:.6rem;padding:3px 6px;gap:3px}}
.stats-bar{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin:0 auto;max-width:500px;}
.stat-item{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:14px 12px;text-align:center;position:relative;overflow:hidden;}
@media(min-width:768px){.stat-item{padding:20px 16px}}
.stat-item::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,var(--accent),var(--accent2));}
.stat-val{font-family:'Syne',sans-serif;font-weight:800;font-size:1.4rem;background:linear-gradient(135deg,#fff,var(--accent));-webkit-background-clip:text;-webkit-text-fill-color:transparent;line-height:1.1;}
@media(min-width:768px){.stat-val{font-size:1.9rem}}
.stat-desc{font-size:.78rem;color:var(--muted);margin-top:4px}
.features-grid{display:flex;flex-direction:column;gap:12px;margin-top:32px;}
.feat-card{background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:14px;transition:all .3s;position:relative;overflow:hidden;}
@media(min-width:768px){.feat-card{padding:20px}}
.feat-card::after{content:'';position:absolute;inset:0;background:linear-gradient(135deg,rgba(255,107,43,0),rgba(255,107,43,.04));opacity:0;transition:opacity .3s;}
.feat-card:hover{border-color:rgba(255,107,43,.35);transform:translateY(-2px);box-shadow:0 8px 28px rgba(0,0,0,.35)}
.feat-card:hover::after{opacity:1}
.feat-content{position:relative;z-index:1;}
.feat-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:3px;}
.feat-icon{width:28px;height:28px;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0;}
@media(min-width:768px){.feat-icon{width:36px;height:36px;border-radius:8px;font-size:17px}}
.feat-title{font-family:'Syne',sans-serif;font-weight:700;font-size:.82rem;}
.feat-desc{font-size:.75rem;color:var(--muted);font-weight:300;line-height:1.4;margin-bottom:6px;}
.feat-sublist{list-style:none;display:flex;flex-direction:column;gap:2px;padding:0}
.feat-sublist li{font-size:.7rem}
@media(min-width:768px){.feat-title{font-size:.93rem}.feat-desc{font-size:.83rem}.feat-sublist li{font-size:.78rem}}
.feat-sublist li{color:var(--muted);font-weight:300;padding-left:12px;position:relative;}
.feat-sublist li::before{content:'→';position:absolute;left:0;color:var(--accent);font-size:.7rem;}
.steps{display:flex;flex-direction:column;gap:0;margin-top:36px;position:relative;}
.steps::before{content:'';position:absolute;left:22px;top:44px;bottom:44px;width:2px;background:linear-gradient(to bottom,var(--accent),var(--accent2),var(--accent3));opacity:.25;}
.step{display:flex;gap:16px;align-items:flex-start;padding:16px 0;opacity:0;transform:translateX(-20px);transition:all .5s ease;}
.step.visible{opacity:1;transform:translateX(0)}
.step-num{width:44px;height:44px;border-radius:12px;background:linear-gradient(135deg,var(--accent),var(--accent2));display:flex;align-items:center;justify-content:center;font-family:'Syne',sans-serif;font-weight:800;font-size:.88rem;flex-shrink:0;box-shadow:0 0 18px rgba(255,107,43,.35);position:relative;z-index:1;}
.step-title{font-family:'Syne',sans-serif;font-weight:700;font-size:.98rem;margin-bottom:4px;}
.step-desc{font-size:.83rem;color:var(--muted);font-weight:300}
.pricing-toggle{display:flex;align-items:center;justify-content:center;gap:10px;margin-bottom:28px;}
.toggle-label{font-size:.83rem;font-weight:500}
.toggle-label.active{color:var(--text)}
.toggle-label.inactive{color:var(--muted)}
.toggle-switch{width:48px;height:26px;background:var(--surface2);border:1px solid var(--border);border-radius:100px;cursor:pointer;position:relative;transition:background .2s;}
.toggle-switch.on{background:linear-gradient(135deg,var(--accent),var(--accent2))}
.toggle-thumb{position:absolute;top:3px;left:3px;width:18px;height:18px;background:#fff;border-radius:50%;transition:transform .2s;box-shadow:0 2px 6px rgba(0,0,0,.3);}
.toggle-switch.on .toggle-thumb{transform:translateX(22px)}
.save-badge{font-size:.65rem;font-weight:700;padding:2px 7px;background:rgba(255,182,39,.12);border:1px solid rgba(255,182,39,.3);border-radius:100px;color:var(--accent3);}
.plans-grid{display:flex;flex-direction:column;gap:12px;}
.plan-card{background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:22px 20px;position:relative;overflow:hidden;transition:all .3s;}
.plan-card.featured{border-color:var(--accent);background:linear-gradient(135deg,rgba(255,107,43,.07),rgba(255,61,127,.04));}
.plan-card.featured::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,var(--accent),var(--accent2));}
.plan-badge{position:absolute;top:16px;right:16px;padding:3px 10px;background:linear-gradient(135deg,var(--accent),var(--accent2));border-radius:100px;font-size:.68rem;font-weight:700;}
.plan-name{font-family:'Syne',sans-serif;font-weight:700;font-size:.88rem;color:var(--muted);margin-bottom:6px;}
.plan-price{font-family:'Syne',sans-serif;font-weight:800;font-size:1.75rem;line-height:1;margin-bottom:4px;}
.plan-period{font-size:.76rem;color:var(--muted);margin-bottom:16px}
.plan-feat{list-style:none;display:flex;flex-direction:column;gap:7px;margin-bottom:20px}
.plan-feat li{display:flex;align-items:center;gap:8px;font-size:.81rem;color:var(--muted);}
.plan-feat li .check{width:16px;height:16px;background:rgba(255,182,39,.15);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:.58rem;color:var(--accent3);flex-shrink:0;}
.plan-feat li .cross{width:16px;height:16px;background:rgba(255,255,255,.04);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:.58rem;color:var(--border);flex-shrink:0;}
.plan-cta{width:100%;padding:11px;border-radius:11px;font-family:'DM Sans',sans-serif;font-size:.86rem;font-weight:600;cursor:pointer;transition:all .2s;border:none;text-align:center;display:block;text-decoration:none;}
.plan-cta.outline{background:transparent;border:1px solid var(--border);color:var(--text);}
.plan-cta.outline:hover{border-color:var(--accent);background:rgba(255,107,43,.07)}
.plan-cta.solid{background:linear-gradient(135deg,var(--accent),var(--accent2));color:#fff;box-shadow:0 0 18px rgba(255,107,43,.3);}
.plan-cta.solid:hover{transform:translateY(-1px);box-shadow:0 4px 22px rgba(255,107,43,.5)}
.cta-section{margin:0 20px;padding:48px 28px;background:linear-gradient(135deg,rgba(255,107,43,.12),rgba(255,61,127,.08));border:1px solid rgba(255,107,43,.25);border-radius:24px;text-align:center;position:relative;overflow:hidden;}
.cta-section::before{content:'';position:absolute;inset:0;background:radial-gradient(circle at 50% 0%,rgba(255,107,43,.18),transparent 60%);}
.cta-section *{position:relative;z-index:1}
.cta-title{font-family:'Syne',sans-serif;font-weight:800;font-size:clamp(1.4rem,5vw,1.9rem);letter-spacing:-.025em;margin-bottom:12px;}
.cta-sub{color:var(--muted);font-size:.9rem;margin-bottom:28px;font-weight:300}
.hp-footer{padding:40px 20px 32px;text-align:center;border-top:1px solid var(--border);margin-top:60px;}
.hp-footer-logo{margin-bottom:6px;}
.hp-footer-tagline{font-size:.78rem;color:var(--muted);margin-bottom:18px}
.hp-footer-links{display:flex;justify-content:center;gap:20px;flex-wrap:wrap;margin-bottom:18px;}
.hp-footer-links a{font-size:.78rem;color:var(--muted);text-decoration:none;transition:color .2s;}
.hp-footer-links a:hover{color:var(--accent)}
.hp-footer-copy{font-size:.72rem;color:rgba(138,138,154,.35)}
@keyframes fade-up{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
.reveal{opacity:0;transform:translateY(24px);transition:opacity .6s ease,transform .6s ease;}
.reveal.visible{opacity:1;transform:translateY(0)}
.chat-demo{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:16px;overflow:hidden;}
.chat-header{display:flex;align-items:center;gap:10px;padding-bottom:12px;border-bottom:1px solid var(--border);margin-bottom:12px;}
.chat-avatar{width:32px;height:32px;background:linear-gradient(135deg,var(--accent),var(--accent2));border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0;}
.chat-name{font-size:.83rem;font-weight:600}
.chat-status{font-size:.7rem;color:var(--accent3)}
.chat-msgs{display:flex;flex-direction:column;gap:8px}
.msg{max-width:80%;padding:9px 13px;border-radius:14px;font-size:.79rem;line-height:1.45;}
.msg.bot{background:linear-gradient(135deg,rgba(255,107,43,.18),rgba(255,61,127,.12));border:1px solid rgba(255,107,43,.2);align-self:flex-start;border-bottom-left-radius:4px;}
.msg.user{background:var(--surface2);border:1px solid var(--border);align-self:flex-end;border-bottom-right-radius:4px;color:var(--muted);}
.msg.typing{display:flex;align-items:center;gap:4px;padding:12px 14px;background:linear-gradient(135deg,rgba(255,107,43,.12),rgba(255,61,127,.08));border:1px solid rgba(255,107,43,.18);align-self:flex-start;border-bottom-left-radius:4px;}
.typing-dot{width:6px;height:6px;background:var(--accent);border-radius:50%;animation:typing-bounce .8s ease-in-out infinite;}
.typing-dot:nth-child(2){animation-delay:.15s}
.typing-dot:nth-child(3){animation-delay:.3s}
@keyframes typing-bounce{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-5px)}}
.faq-list{display:flex;flex-direction:column;gap:8px;margin-top:32px;}
.faq-item{background:var(--card);border:1px solid var(--border);border-radius:var(--r-sm);overflow:hidden;}
.faq-q{width:100%;padding:16px 18px;display:flex;align-items:center;justify-content:space-between;background:transparent;border:none;color:var(--text);text-align:left;font-family:'DM Sans',sans-serif;font-size:.86rem;font-weight:500;cursor:pointer;gap:12px;}
.faq-chevron{width:20px;height:20px;border-radius:6px;background:var(--surface2);display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:transform .3s,background .2s;font-size:.68rem;color:var(--muted);}
.faq-item.open .faq-chevron{transform:rotate(180deg);background:rgba(255,107,43,.18);color:var(--accent)}
.faq-a{max-height:0;overflow:hidden;transition:max-height .35s ease,padding .35s ease;padding:0 18px;font-size:.83rem;color:var(--muted);font-weight:300;line-height:1.6;}
.faq-item.open .faq-a{max-height:200px;padding:0 18px 16px}
@media(min-width:768px){
  .hp-nav{padding:10px 40px}
  .hp-nav-logo img{height:34px;}
  .btn-ghost,.btn-primary{font-size:.78rem;padding:6px 12px}
  .hp-section{padding:80px 40px}
  .hero{padding:120px 40px 80px}
  .stats-bar{grid-template-columns:repeat(4,1fr);max-width:700px}
  .features-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
  .plans-grid{flex-direction:row;gap:14px;align-items:stretch}
  .plan-card{flex:1}
  .cta-section{margin:0 40px;padding:60px 48px}
  .btn-hero,.btn-hero-outline{max-width:240px;white-space:nowrap}
  .hero-cta{flex-direction:row;justify-content:center}
}
`;

const PLANS = [
  { key: 'free', name: 'Free', monthly: '0', yearly: '0', period: 'Forever free', popular: false,
    feat: [
      { ok: true, text: '5 Products' },
      { ok: true, text: '1 Category' },
      { ok: true, text: '1 Payment Method' },
      { ok: true, text: 'Telegram Bot Shop' },
      { ok: false, text: 'Web Storefront' },
      { ok: false, text: 'AI Agent' },
    ]
  },
  { key: 'basic', name: 'Basic', monthly: '14,000', yearly: '150,000', period: 'per month', popular: false,
    feat: [
      { ok: true, text: '30 Products' },
      { ok: true, text: '7 Categories' },
      { ok: true, text: '3 Payment Methods' },
      { ok: true, text: '10 Broadcasts/mo' },
      { ok: true, text: 'Web Dashboard' },
      { ok: false, text: 'Web Storefront' },
      { ok: false, text: 'AI Agent' },
    ]
  },
  { key: 'standard', name: 'Standard', monthly: '23,000', yearly: '250,000', period: 'per month', popular: false,
    feat: [
      { ok: true, text: '70 Products' },
      { ok: true, text: '15 Categories' },
      { ok: true, text: '5 Payment Methods' },
      { ok: true, text: '25 Broadcasts/mo' },
      { ok: true, text: 'Web Store Included' },
      { ok: true, text: 'AI Agent (own key)' },
      { ok: true, text: 'No Watermark' },
    ]
  },
  { key: 'pro', name: 'Pro', monthly: '32,500', yearly: '350,000', period: 'per month', popular: true,
    feat: [
      { ok: true, text: '150 Products' },
      { ok: true, text: '35 Categories' },
      { ok: true, text: 'Custom Domain' },
      { ok: true, text: 'AI Agent (API provided)' },
      { ok: true, text: '75 Broadcasts/mo' },
      { ok: true, text: 'Shop Banners' },
      { ok: true, text: 'Multi-Platform' },
    ]
  },
  { key: 'business', name: 'Business', monthly: '55,000', yearly: '600,000', period: 'per month', popular: false,
    feat: [
      { ok: true, text: 'Unlimited Products' },
      { ok: true, text: 'Unlimited Categories' },
      { ok: true, text: 'Custom Domains (up to 3)' },
      { ok: true, text: 'Unlimited Broadcasts' },
      { ok: true, text: 'Email Notifications' },
      { ok: true, text: 'Priority Support' },
    ]
  },
];

const FAQS = [
  { q: 'အသုံးပြုရလွယ်လား?',
    a: 'အရိုးရှင်းဆုံးက အဆန်းပြားပဲဆိုသလိုပဲ UI တစ်ခုလုံးက Clean and Simple Interface ဖြစ်ပြီး E-commerce နှင့် အကျွမ်းတဝင်မရှိတဲ့သူတောင် ကျွမ်းကျင်စွာ အသုံးပြုနိုင်မှာဖြစ်ပါတယ်။' },
  { q: 'Telegam Shop နဲ့ E-commerce Website က real-time sync ဖြစ်လား?',
    a: ' Real-Time Sync, Instant Update ဖြစ်ပါတယ်။ Delay အနည်းငယ်တောင်မရှိပါဘူး။' },
  { q: 'ဆိုင်အတွက် ဘယ် Payment တွေကိုသုံးလို့ရလဲ?',
    a: 'ဘာမှ မသက်မှက်ထားပါဘူး။ စိတ်ကြိုက် Payment ထည့်နိုင်ပါတယ်။' },
  { q: 'Telegam မသုံးတဲ့ Customer တွေက ဘယ်လိုဝယ်ရမလဲ?',
    a: 'ကျနော်တို့ရဲ့ Myanmar\s First First Multi-Platform Ecommerce မှာဆိုရင် Customer အနေနဲ့ Telegram Mode, Website Mode, Guest Mode ဆိုပြီး အဆင်ပြေရာကနေတစ်ဆင့် ဝယ်ယူနိုင်မှာဖြစ်ပါတယ်။ .' },
  { q: 'Free သုံးလို့ရလား?',
    a: 'ရပါတယ်။ Free Plan က Expire မရှိပါဘူး။ ရက်အကန့်အသက်လဲ မရှိပါဘူး။ ဒါပေမယ့် Web Panel နဲ့ E-commerce Website ကိုတော့ အသုံးပြုနိုင်မှာ မဟုတ်ပါဘူး။ Free Plan ကတော့ Telegram E-commerce တစ်မျိုးတည်းရရှိမှာဖြစ်ပါတယ်။' },
  { q: 'AI Agent ကဘာတွေလုပ်ပေးမှာလဲ?',
    a: 'AI Agent က Customer Service role အနေနဲ့ သင့်ဆိုင်ကိုကူညီပေးမှာဖြစ်ပါတယ်။ ဥပမာ မေးခွန်းဖြေကြားပေးတာ၊ စျေးရောင်း​​ပေးတာတွေလုပ်ပေးနိုင်ပါတယ်။' },
  { q: 'QR MENU System ဆိုတာဘာလဲ?',
    a: 'QR Ordering System ဆိုတာ စားသောက်ဆိုင်တွေနဲ့ ကော်ဖီဆိုင်တွေမှာ စားသုံးသူတွေက စားပွဲပေါ်မှာကပ်ထားတဲ့ QR Code ကို မိမိရဲ့စမတ်ဖုန်းနဲ့ Scan ဖတ်ပြီး၊ Digital Menu ကိုကြည့်ကာ မိမိကိုယ်တိုင် Order တင်နိုင်တဲ့ ခေတ်မီနည်းစနစ်တစ်ခု ဖြစ်ပါတယ်။ စားသောက်ဆိုင်တွေမှာ စားပွဲထိုး၊ဝန်ထမ်း‌တွေကို စောင့်ဆိုင်းနေစရာမလိုဘဲ မိမိဖုန်းထဲမှတစ်ဆင့် အစအဆုံး လုပ်ဆောင်နိုင်မှာ ဖြစ်ပါတယ်။ အစားအသောက်ရောင်းတဲ့ ဘယ်ဆိုင်မဆို Menu စာရွက်မှာ QR Code ထည့်ထားလိုက်ရုံပါပဲ။' },  
];

export default function Homepage() {
  const navRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      if (navRef.current) {
        navRef.current.classList.toggle('scrolled', window.scrollY > 20);
      }
    };
    window.addEventListener('scroll', handleScroll);

    // Scroll reveal observer
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('visible');
          e.target.querySelectorAll('[data-count]').forEach(el => {
            const target = parseInt(el.dataset.count);
            let current = 0;
            const inc = target / 40;
            const timer = setInterval(() => {
              current = Math.min(current + inc, target);
              el.textContent = (current >= target ? target : Math.floor(current)) + (target === 100 ? '%' : '+');
              if (current >= target) { el.textContent = target + (target === 100 ? '%' : '+'); clearInterval(timer); }
            }, 30);
          });
        }
      });
    }, { threshold: 0.15 });
    document.querySelectorAll('.reveal, .step').forEach(el => observer.observe(el));
    return () => { window.removeEventListener('scroll', handleScroll); observer.disconnect(); };
  }, []);

  // Chat demo animation
  useEffect(() => {
    const timer1 = setTimeout(() => {
      const typing = document.getElementById('typingMsg');
      const msgs = document.getElementById('chatMsgs');
      if (!typing || !msgs) return;
      const timer2 = setTimeout(() => {
        typing.remove();
        const reply = document.createElement('div');
        reply.className = 'msg bot';
        reply.style.cssText = 'opacity:0;transform:translateY(8px);transition:all .3s ease';
        reply.innerHTML = '👟 Yes! We have 3 shoes under 50,000 MMK. Sneakers Pro is most popular at 45,000 MMK. Want to see details?';
        msgs.appendChild(reply);
        requestAnimationFrame(() => requestAnimationFrame(() => { reply.style.opacity = '1'; reply.style.transform = 'translateY(0)'; }));
        const timer3 = setTimeout(() => {
          const u2 = document.createElement('div');
          u2.className = 'msg user';
          u2.style.cssText = 'opacity:0;transform:translateY(8px);transition:all .3s ease';
          u2.textContent = 'Yes please! 😊';
          msgs.appendChild(u2);
          requestAnimationFrame(() => requestAnimationFrame(() => { u2.style.opacity = '1'; u2.style.transform = 'translateY(0)'; }));
        }, 1800);
        return () => clearTimeout(timer3);
      }, 2000);
      return () => clearTimeout(timer2);
    }, 3000);
    return () => clearTimeout(timer1);
  }, []);

  const toggleFaq = (idx) => {
    const items = document.querySelectorAll('.faq-item');
    items.forEach((item, i) => {
      if (i === idx) item.classList.toggle('open');
      else item.classList.remove('open');
    });
  };

  function PlanCard({ plan, yr }) {
    const price = yr ? plan.yearly : plan.monthly;
    const periodLabel = yr ? 'per month, billed yearly' : plan.period;
    return (
      <div className={'plan-card' + (plan.popular ? ' featured' : '')}>
        {plan.popular && <div className="plan-badge">Popular</div>}
        <div className="plan-name">{plan.name}</div>
        <div className="plan-price">{price} <span style={{ fontSize: '1rem', color: 'var(--muted)' }}>MMK</span></div>
        <div className="plan-period">{plan.key === 'free' ? plan.period : periodLabel}</div>
        <ul className="plan-feat">
          {plan.feat.map((f, i) => (
            <li key={i}><span className={f.ok ? 'check' : 'cross'}>{f.ok ? '✓' : '✗'}</span> {f.text}</li>
          ))}
        </ul>
        <a href="https://t.me/ecommercemyanmarbot" className={'plan-cta ' + (plan.popular ? 'solid' : 'outline')}>
          {plan.key === 'free' ? 'Get Started Free' : 'Choose ' + plan.name}
        </a>
      </div>
    );
  }

  const [yearly, setYearly] = useState(false);

  return (
    <div>
      <style>{CSS}</style>
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;1,9..40,300&display=swap" rel="stylesheet" />

      <div className="orb orb1"></div>
      <div className="orb orb2"></div>
      <div className="orb orb3"></div>

      <nav className="hp-nav" ref={navRef}>
        <a href="/" className="hp-nav-logo">
          <img src="/logo.png" alt="E-commerce Myanmar" />
        </a>
        <div className="hp-nav-actions">
          <a href="https://telegramecommerce.shop/login" className="btn-ghost">Sign In</a>
          <a href="https://t.me/tg_ecommerce_official_bot?start=newbot" className="btn-primary">Sign Up</a>
        </div>
      </nav>

      <main className="hp-main">
        {/* HERO */}
        <section className="hero">
          <div className="hero-badge"><span className="badge-dot"></span> Myanmar's First Multi-Platform E-commercez</div>
          <h1>Sell on Telegram + Web<br /><span className="line2">With Your Own Domain</span></h1>
          <p className="hero-sub">ဆိုင်ရှင်ကိုရော ဈေးဝယ်သူကိုပါ စိတ်ကျေနပ်မှုအပြည့်အဝပေးနိုင်မယ့် <br /> Myanmar's First Multi-Platform E-commerce ကို အခုပဲစတင် စမ်းသုံးနိုင်ပါပြီ။</p>
          <div className="hero-cta">
            <a href="https://t.me/ecommercemyanmarbot" className="btn-hero">🚀 Start for Free</a>
            <a href="#features" className="btn-hero-outline">✨ See Features</a>
          </div>
          <p className="hero-note">No credit card needed · <span>Free plan forever</span></p>
          <div className="platforms">
            <span className="plat-chip">✈️ Telegram Bot</span>
            <span className="plat-chip">🌐 Web Store</span>
            <span className="plat-chip">📱 Mobile First</span>
          </div>
        </section>

        {/* STATS */}
        <section className="hp-section" style={{ paddingTop: 0 }}>
          <div className="stats-bar reveal">
            <div className="stat-item"><div className="stat-val" data-count="2">0</div><div className="stat-desc">Platforms in 1</div></div>
            <div className="stat-item"><div className="stat-val" data-count="5">0</div><div className="stat-desc">Plan Tiers</div></div>
            <div className="stat-item"><div className="stat-val" data-count="1">0</div><div className="stat-desc">Min to Launch</div></div>
            <div className="stat-item"><div className="stat-val" data-count="9">0</div><div className="stat-desc">Super Easy to Use</div></div>
          </div>
        </section>

        {/* FEATURES */}
        <section id="features" className="hp-section">
          <div className="reveal">
            <p className="hp-section-label">Everything You Need</p>
            <h2 className="hp-section-title"> Features ပေါင်းများစွာပါဝင်ပြီး<br /> အသုံးပြုရ အလွန်လွယ်ကူသော Interface!</h2>
            <p className="hp-section-sub"> စိတ်ကျေနပ်မှုအပြည့်အဝ ရရှိစေမယ့် မြန်မာ့ပထမဆုံးသော <br />  Multi-Platform E-commerce with one click set up.......</p>
          </div>
          <div className="features-grid">
            {[
              { icon: '🌐', title: 'Multi-Platform Shop', desc: 'Telegram Bot မှာတင်မကဘဲ သီးသန့် E-commerce Website အပြင် <br /> Admin Panel ပါ ရရှိဦးမယ့် ပြီးပြည့်စုံတဲ့ Multi-Platform E-commerce စနစ်ပဲ ဖြစ်ပါတယ်', bg: 'rgba(56,189,248,.1)',
                items: ['Telegram Bot မှာတင် E-commerce Feature တွေ အစုံအလင် ရရှိမှာဖြစ်ပြီး <br /> ဝယ်သူတွေအတွက် E-commerce Website ပါ ထပ်မံရရှိပါမယ်။', 'Telegram E-commerce နဲ့ E-commerce Website ကြား <br /> Data တွေအားလုံးက အပြန်အလှန် Real-time Sync ဖြစ်ပါတယ်။', 'မိမိ ကိုယ်ပိုင် Custom domain ဖြင့် အသုံးပြုနိုင်မယ်။', 'Customer တွေအနေနဲ့လည်း Telegram ကနေဖြစ်စေ၊ Website ကနေဖြစ်စေ ဈေးဝယ်ယူနိုင်ပါတယ်။'] },
              { icon: '📦', title: 'Product Management', desc: 'Telegram ကဖြစ်‌စေ Web Panel ကဖြစ်စေ Product တွေကို <br /> Category အလိုက် စိတ်ကြိုက်စီမံခန့်ခွဲပြီး တင်လိုရနိုင်မယ်။', bg: 'rgba(255,182,39,.1)',
                items: ['Shop Owners တိုအကြိုက် Coupon တွေဖန်တီးလိုရမယ်။', 'Delivery Fees တွေ သက်မှက်နိုင်မယ်။', 'Color, Size, Option ပါဝင်မယ်။', 'Stock ကုန်ခါနီး သတိပေးမယ်။'] },
              { icon: '💳', title: 'Orders & Payments', desc: 'Complete order workflow with payment proof verification and invoice generation.', bg: 'rgba(255,107,43,.12)',
                items: ['ငွေဝင်မဝင်စစ်လို့ရမယ်။ Invoice ‌ရော Receipt ပါထုတ်လို့ရမယ်။', 'Confirm, Reject, Processing, Ship, Delivered, Cancelled Status ပါဝင်မယ်။ <br /> Order record တွေအလွယ်တကူ ပြန်ရှာလို့ရမယ်။', 'Payment တွေစိတ်ကြိုက် ထည့်လို့ရမယ်။', 'Cash on Delivery စနစ်ပါဝင်မယ်။'] },
              { icon: '👥', title: 'Customer System', desc: 'Built-in customer accounts with Google & Telegram login, order history, and saved info.', bg: 'rgba(56,189,248,.1)',
                items: ['Customer profiles & history', 'Google + Telegram sign-in', 'Saved addresses & contacts', 'Customer order dashboard'] },
              { icon: '📢', title: 'Broadcast & Newsfeed', desc: 'Send promotions and updates to all customers. Built-in social-style newsfeed.', bg: 'rgba(255,61,127,.1)',
                items: ['Customer တွေကို Update သတင်းပေးပိုနိုင်မယ်။', 'Promotion Message ပေးပိုလိုရမယ်။', 'Facebook ကဲ့သိုသော Newsfeed ပါဝင်မယ်။', 'Like, Comment & Share ပါဝင်မယ်။'] },
              { icon: '🤖', title: 'AI Chat Assistant', desc: '24/7 AI-powered customer support that answers questions and qualifies leads automatically.', bg: 'rgba(255,107,43,.12)',
                items: ['Automated customer support', 'Product recommendations', 'Photo sharing in chat', 'Multi-language support'] },
              { icon: '🎨', title: 'Customization', desc: 'Brand your shop with custom themes, colors, banners, and personalized button labels.', bg: 'rgba(255,182,39,.1)',
                items: ['Shop color themes', 'Custom banners & logos', 'Brand colors everywhere', 'Custom button labels'] },
              { icon: '📊', title: 'Analytics & Insights', desc: 'Visual dashboards showing sales trends, top products, and revenue with exportable reports.', bg: 'rgba(255,61,127,.1)',
                items: ['Sales charts & trends', 'Top products report', 'Revenue analytics', 'Export to CSV/PDF'] },
              { icon: '🛒', title: 'Cart & Checkout', desc: 'Smooth shopping experience with guest checkout, contact forms, and payment proof upload.', bg: 'rgba(56,189,248,.1)',
                items: ['Web cart with quantity', 'Guest checkout — no signup', 'Contact info collection', 'Payment proof upload'] },
              { icon: '✈️', title: 'Telegram Deep Integration', desc: 'Seamless Telegram bot with order notifications, chat commands, and real-time admin alerts.', bg: 'rgba(255,107,43,.12)',
                items: ['Order notifications in chat', 'Telegram admin alerts', 'Share products to Telegram', 'ဘယ်မှာမှ မရှိသေးတဲ့ Telegram E-commerce စစ်စစ်။'] },
              { icon: '🔗', title: 'Custom Domain', desc: 'Professional storefront on your own domain. Free SSL, no branding, simple DNS setup.', bg: 'rgba(255,182,39,.1)',
                items: ['ကိုယ်ပိုင် Domain အသုံးပြုနိုင်မယ်','Very Easy to Set Up'] },
              { icon: '⚡', title: 'Fast & Lightweight', desc: 'Optimized for speed with minimal load times, even on mobile. Built with React and Node.js.', bg: 'rgba(255,61,127,.1)',
                items: ['Optimized for speed', 'Fast load times on mobile', 'Built with React & Node.js', 'Efficient database queries'] },  
              { icon: '🍽️', title: 'QR Ordering System', desc: 'Let customers scan QR codes to browse menu, place orders, and pay directly from their phone.', bg: 'rgba(56,189,248,.1)',
                items: ['Scan QR to view full menu', 'Self-service ordering', 'Direct payment integration', 'Order management in admin panel'] },
            ].map((f, i) => (
              <div key={i} className="feat-card reveal" style={{ animationDelay: `${i * 0.05}s` }}>
                <div className="feat-content">
                  <div className="feat-head">
                    <div className="feat-title">{f.title}</div>
                    <div className="feat-icon" style={{ background: f.bg }}>{f.icon}</div>
                  </div>
                  <div className="feat-desc" dangerouslySetInnerHTML={{__html: f.desc}} />
                  <ul className="feat-sublist">
                    {f.items.map((item, j) => <li key={j} dangerouslySetInnerHTML={{__html: item}} />)}
                  </ul>
                </div>
              </div>
            ))}
          </div>
          <div className="chat-demo reveal" style={{ maxWidth: 340, margin: '32px auto 0' }}>
            <div className="chat-header">
              <div className="chat-avatar">🛍️</div>
              <div><div className="chat-name">My Shop</div><div className="chat-status">● Online</div></div>
            </div>
            <div className="chat-msgs" id="chatMsgs">
              <div className="msg bot">👋 Welcome to Shop! Browse our products or ask me anything.</div>
              <div className="msg user">Do you have shoes under 50,000 MMK?</div>
              <div className="msg typing" id="typingMsg">
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
              </div>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how" className="hp-section">
          <div className="reveal">
            <p className="hp-section-label">How To Get Started <br /> ၁မိနစ်အတွင်း E-commerce Website တစ်ခုကို <br /> အလွယ်ကူဆုံး ဘယ်လိုဖန်တီးမလဲ?  </p>
            <h2 className="hp-section-title">Open your store<br />in just 4 steps</h2>
            <p className="hp-section-sub">So simple, anyone can do it. <br /> Even if you've never sold online before.</p>
          </div>
          <div className="steps">
            {[
              { num: '1', title: 'Sign Up Free', desc: 'Sign Up ကိုနှိပ်ပြီး Create My Bot Now ကိုနှိပ်ကာ E-commerce Store ရယူပါ။ Just One-Click Setup' },
              { num: '2', title: 'Set Up Payments', desc: 'Online ဈေးဆိုင်အတွက် Payment ထည့်ပါ။ ဥပမာ- KBZPAY, WavePay.' },
              { num: '3', title: 'Add Your Products', desc: 'Product တွေကို စထည့်နိုင်ပါပြီ။' },
              { num: '4', title: 'Share & Start Selling', desc: 'သင့်ရဲ့ Telegram bot link သို့မဟုတ် website Link ကို Social Media မှာ ဝေမျှနိုင်ပါပြီ။' },
            ].map((s, i) => (
              <div key={i} className="step" style={{ transitionDelay: `${i * 0.12}s` }}>
                <div className="step-num">{s.num}</div>
                <div className="step-content"><div className="step-title">{s.title}</div><div className="step-desc">{s.desc}</div></div>
              </div>
            ))}
          </div>
        </section>

        {/* PRICING */}
        <section id="pricing" className="hp-section">
          <div className="reveal">
            <p className="hp-section-label">Plans & Pricing</p>
            <h2 className="hp-section-title">Start free,<br />grow when ready</h2>
            <p className="hp-section-sub">No surprise fees. Change or cancel anytime.</p>
          </div>
          <div className="pricing-toggle reveal" style={{ marginTop: 24 }}>
            <span className={'toggle-label ' + (yearly ? 'inactive' : 'active')}>Monthly</span>
            <div className={'toggle-switch' + (yearly ? ' on' : '')} onClick={() => setYearly(!yearly)} style={{ cursor: 'pointer' }}>
              <div className="toggle-thumb"></div>
            </div>
            <span className={'toggle-label ' + (yearly ? 'active' : 'inactive')}>Yearly</span>
            <span className="save-badge">Save ~10%</span>
          </div>
          <div className="plans-grid reveal">
            {PLANS.map((plan, i) => <PlanCard key={i} plan={plan} yr={yearly} />)}
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="hp-section">
          <div className="reveal"><p className="hp-section-label">Questions?</p><h2 className="hp-section-title">We've got answers</h2></div>
          <div className="faq-list reveal">
            {FAQS.map((faq, i) => (
              <div key={i} className="faq-item">
                <button className="faq-q" onClick={() => toggleFaq(i)}>
                  {faq.q}<span className="faq-chevron">▼</span>
                </button>
                <div className="faq-a">{faq.a}</div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <div className="cta-section reveal" style={{ marginBottom: 60 }}>
          <h2 className="cta-title">Ready to open your store? 🚀</h2>
          <p className="cta-sub"> ဆိုင်ရှင်ကိုရော ဈေးဝယ်သူကိုပါ စိတ်ကျေနပ်မှုအပြည့်အဝပေးနိုင်မယ့် <br /> Multi-Platform E-commerce ကို အခုပဲစတင် စမ်းသုံးနိုင်ပါပြီ။</p>
          <a href="https://t.me/tg_ecommerce_official_bot?start=newbot" className="btn-hero" style={{ margin: '0 auto', maxWidth: 240, display: 'flex' }}>
            🛍️ Open My Store Now
          </a>
        </div>
      </main>

      <footer className="hp-footer">
        <div className="hp-footer-logo"><img src="/logo.png" alt="E-commerce Myanmar" style={{height:28,display:'block',margin:'0 auto'}} /></div>
        <div className="hp-footer-tagline">Myanmar's First Multi-Platform E-commerce</div>
        <div className="hp-footer-links">
          <a href="#features">Features</a>
          <a href="#pricing">Pricing</a>
          <a href="#faq">FAQ</a>
          <a href="https://telegramecommerce.shop/login">Sign In</a>
          <a href="https://t.me/tg_ecommerce_official_bot?start=newbot">Sign Up</a>
        </div>
        <div className="hp-footer-copy">© 2025 E-commerce Myanmar · telegramecommerce.shop · Made with ❤️ in Myanmar</div>
      </footer>
    </div>
  );
}
