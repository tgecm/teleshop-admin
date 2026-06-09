import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  ShoppingBag, Globe, Package, ClipboardList,
  CreditCard, Users, Megaphone, Bot, Palette, BarChart3,
  Check, ArrowRight, MessageCircle, Sparkles, Zap,
  TrendingUp, Star, Crown, Key, Shield,
} from 'lucide-react';

/* ───── Translations ───── */

const LANG = {
  en: {
    heroBadge: 'Multi-Platform E-Commerce',
    heroSub: 'The all-in-one platform for Myanmar e-commerce. Create your Telegram bot store, launch a web shop, and connect your own domain — all from one dashboard.',
    badgeNoCode: 'No coding',
    badgeFreeStart: 'Free to start',
    badge5min: '5-min setup',
    badgeAffordable: 'Affordable price',
    pillTelegram: 'Telegram Shop',
    pillWeb: 'Web Storefront',
    pillDomain: 'Custom Domain',
    featuresBadge: 'Everything Included',
    featuresTitle: 'Built for Myanmar Sellers',
    featuresSub: 'Every tool you need to start, run, and grow your e-commerce business. No third-party apps required.',
    pricingBadge: 'Pricing',
    pricingSub: 'Start free. Upgrade when you grow.',
    monthly: 'Monthly',
    yearly: 'Yearly',
    save: 'Save 10%',
    popular: 'Popular',
    startFree: 'Start Free',
    subscribe: 'Subscribe',
    pricingNote: 'All plans include community support. Paid plans include email support.',
    faqBadge: 'FAQ',
    faqTitle: 'Common Questions',
    ctaTitle: 'Ready to Start Selling?',
    ctaSub: 'Join thousands of Myanmar sellers. Create your store in minutes — free to start, no credit card.',
    ctaBtn: 'Create Your Free Shop',
    footerDesc: 'Multi-platform e-commerce solution for Myanmar. Sell on Telegram, web, and your own domain from one dashboard.',
    footerPlatform: 'Platform',
    footerFeatures: 'Features',
    footerPricing: 'Pricing',
    footerFaq: 'FAQ',
    footerConnect: 'Connect',
    footerBot: 'Telegram Bot',
    footerEmail: 'Email Support',
    footerRights: 'All rights reserved.',
    footerTagline: 'Built for Myanmar e-commerce sellers.',
    faq1q: 'How do I start?',
    faq1a: 'Sign up at telegramecommerce.shop, create your bot, add products, and start selling. Takes under 5 minutes.',
    faq2q: 'Can I use my own domain?',
    faq2a: 'Yes. Standard plan and above include custom domain support with free SSL. Simple DNS setup.',
    faq3q: 'What payment methods can I use?',
    faq3a: 'You can add bank accounts, QR codes, and any payment method. Customers upload payment proof during checkout.',
    faq4q: 'Do I need a website?',
    faq4a: 'No. Your shop works on Telegram without a website. Web shop is included on Standard plan and above.',
    faq5q: 'Can I have multiple bots?',
    faq5a: 'Yes. Each plan supports multiple bots with their own products, customers, and settings.',
    faq6q: 'What is the AI Agent?',
    faq6a: 'AI-powered chat assistant that handles customer inquiries automatically. Pro plan includes free API key.',
  },
  mm: {
    heroBadge: 'မာလ်တီပလက်ဖောင်း အီးကောမင့်',
    heroSub: 'မြန်မာနိုင်ငံအတွက် All-in-One အီးကောမင့်ပလက်ဖောင်း။ Telegram ဆိုင်ဘော့တ်၊ ဝက်ဘ်ဆိုက်နှင့် ကိုယ်ပိုင်ဒိုမိန်းဖြင့် ရောင်းချနိုင်သည် — အားလုံးကို တစ်နေရာတည်းမှ စီမံခန့်ခွဲနိုင်။',
    badgeNoCode: 'ကုဒ်ရေးစရာမလို',
    badgeFreeStart: 'အခမဲ့စတင်ပါ',
    badge5min: '၅ မိနစ်အတွင်း ပြင်ဆင်',
    badgeAffordable: 'တတ်နိုင်သောစျေး',
    pillTelegram: 'တယ်လီဂရမ်ဆိုင်',
    pillWeb: 'ဝက်ဘ်စတိုး',
    pillDomain: 'ကိုယ်ပိုင်ဒိုမိန်း',
    featuresBadge: 'အားလုံးပါဝင်သည်',
    featuresTitle: 'မြန်မာ့ရောင်းချသူများအတွက်',
    featuresSub: 'သင့်အီးကောမင့်လုပ်ငန်းကို စတင်ရန်၊ လည်ပတ်ရန်နှင့် ကြီးထွားရန် လိုအပ်သမျှ ကိရိယာများ။ Third-party အက်ပ်များ မလိုအပ်ပါ။',
    pricingBadge: 'စျေးနှုန်းများ',
    pricingSub: 'အခမဲ့စတင်ပါ။ ကြီးထွားလာသည့်အခါ အဆင့်မြှင့်ပါ။',
    monthly: 'လစဉ်',
    yearly: 'နှစ်စဉ်',
    save: '၁၀% သက်သာ',
    popular: 'လူကြိုက်များ',
    startFree: 'အခမဲ့စတင်ပါ',
    subscribe: 'စာရင်းသွင်းပါ',
    pricingNote: 'အစီအစဉ်အားလုံးတွင် Community Support ပါဝင်သည်။ ပေးချေသည့်အစီအစဉ်များတွင် Email Support ပါဝင်သည်။',
    faqBadge: 'အမေးများသောမေးခွန်း',
    faqTitle: 'အမေးများသောမေးခွန်းများ',
    ctaTitle: 'ရောင်းချရန် အဆင်သင့်ဖြစ်ပြီလား?',
    ctaSub: 'မြန်မာ့ရောင်းချသူ ထောင်ပေါင်းများစွာနှင့် ပူးပေါင်းပါ။ မိနစ်ပိုင်းအတွင်း သင့်ဆိုင်ကို စတင်ပါ — အခမဲ့၊ ခရက်ဒစ်ကတ်မလိုပါ။',
    ctaBtn: 'သင့်ဆိုင်ကို အခမဲ့စတင်ပါ',
    footerDesc: 'မြန်မာနိုင်ငံအတွက် မာလ်တီပလက်ဖောင်း အီးကောမင့်ဖြေရှင်းချက်။ Telegram၊ ဝက်ဘ်နှင့် ကိုယ်ပိုင်ဒိုမိန်းတို့မှ တစ်နေရာတည်းဖြင့် ရောင်းချနိုင်။',
    footerPlatform: 'ပလက်ဖောင်း',
    footerFeatures: 'အင်္ဂါရပ်များ',
    footerPricing: 'စျေးနှုန်းများ',
    footerFaq: 'အမေးများသောမေးခွန်း',
    footerConnect: 'ဆက်သွယ်ရန်',
    footerBot: 'တယ်လီဂရမ်ဘော့တ်',
    footerEmail: 'အီးမေးလ်အကူအညီ',
    footerRights: 'မူပိုင်ခွင့်များ',
    footerTagline: 'မြန်မာ့အီးကောမင့်ရောင်းချသူများအတွက် ဖန်တီးထားသည်။',
    faq1q: 'မည်သို့စတင်ရမည်နည်း။',
    faq1a: 'telegramecommerce.shop တွင် စာရင်းသွင်းပါ၊ သင့်ဘော့တ်ကို ဖန်တီးပါ၊ ကုန်ပစ္စည်းများထည့်ပါ၊ စတင်ရောင်းချပါ။ ၅ မိနစ်အောက်သာကြာပါသည်။',
    faq2q: 'ကိုယ်ပိုင်ဒိုမိန်း သုံးနိုင်ပါသလား။',
    faq2a: 'ရနိုင်ပါသည်။ Standard အစီအစဉ်နှင့်အထက်တွင် ကိုယ်ပိုင်ဒိုမိန်းနှင့် အခမဲ့ SSL ပါဝင်သည်။ DNS ပြင်ဆင်မှု လွယ်ကူပါသည်။',
    faq3q: 'မည်သည့်ငွေပေးချေမှုနည်းလမ်းများ သုံးနိုင်သနည်း။',
    faq3a: 'ဘဏ်အကောင့်များ၊ QR ကုဒ်များနှင့် အခြားငွေပေးချေမှုနည်းလမ်းများ ထည့်နိုင်ပါသည်။ ဝယ်သူများက ငွေပေးချေမှုအထောက်အထားကို Checkout တွင် တင်ရပါသည်။',
    faq4q: 'ဝက်ဘ်ဆိုက် လိုအပ်ပါသလား။',
    faq4a: 'မလိုအပ်ပါ။ သင့်ဆိုင်သည် Telegram ပေါ်တွင် ဝက်ဘ်ဆိုက်မပါဘဲ အလုပ်လုပ်နိုင်သည်။ Web Shop သည် Standard အစီအစဉ်နှင့်အထက်တွင် ပါဝင်ပါသည်။',
    faq5q: 'ဘော့တ်များ အများကြီးထားနိုင်ပါသလား။',
    faq5a: 'ရနိုင်ပါသည်။ အစီအစဉ်တိုင်းတွင် ကိုယ်ပိုင်ကုန်ပစ္စည်း၊ ဝယ်သူများနှင့် ဆက်တင်များပါသော ဘော့တ်များစွာကို ထောက်ပံ့ပေးပါသည်။',
    faq6q: 'AI Agent ဆိုတာဘာလဲ။',
    faq6a: 'AI စွမ်းအင်သုံး ချက်တ်အကူအညီဖြစ်ပြီး ဝယ်သူများ၏ မေးခွန်းများကို အလိုအလျောက်ဖြေကြားပေးပါသည်။ Pro အစီအစဉ်တွင် အခမဲ့ API သော့ပါဝင်ပါသည်။',
  },
};

/* ───── Data ───── */

const PLANS = [
  {
    key: 'free', name: 'Free', icon: Zap, price: 'Free', popular: false,
    features: ['1 bot', '5 products', '1 category', '5 custom commands', '1 payment method', '4 broadcasts/mo', 'Telegram panel', 'Community support'],
  },
  {
    key: 'basic', name: 'Basic', icon: Star, price: '14,000', period: '/month', popular: false,
    yearly: '150,000 MMK/yr',
    features: ['3 bots', '30 products', '7 categories', '25 custom commands', '3 payment methods', '10 broadcasts/mo', 'Add up to 2 admins', 'Web dashboard access'],
  },
  {
    key: 'standard', name: 'Standard', icon: Crown, price: '23,000', period: '/month', popular: false,
    yearly: '250,000 MMK/yr',
    features: ['7 bots', '70 products', '15 categories', '25 custom commands', '5 payment methods', '25 broadcasts/mo', 'E-commerce website', 'Staff Activities', 'Ads removed (no watermark)'],
  },
  {
    key: 'pro', name: 'Pro', icon: Key, price: '32,500', period: '/month', popular: true,
    yearly: '350,000 MMK/yr',
    features: ['25 bots', '150 products', '35 categories', '50 custom commands', '10 payment methods', '75 broadcasts/mo', 'Custom domain (1)', 'Staff Activities', 'AI Agent + Free API'],
  },
  {
    key: 'business', name: 'Business', icon: Crown, price: '55,000', period: '/month', popular: false,
    yearly: '600,000 MMK/yr',
    features: ['50 bots', 'Unlimited products', 'Unlimited categories', 'Unlimited commands', 'Unlimited payments', 'Unlimited broadcasts', 'Custom domains (up to 3)', 'Staff Activities', 'Email notification + Priority'],
  },
];

const FEATURES = [
  {
    title: 'Multi-Platform Shop',
    desc: 'Sell on Telegram, web, and your own custom domain — all synced in real-time from one dashboard.',
    items: ['Telegram bot with inline ordering', 'Full web storefront with cart', 'Custom domain with SSL', 'Real-time multi-platform sync'],
    gradient: 'from-violet-500 to-purple-600',
    icon: ShoppingBag,
  },
  {
    title: 'Product Management',
    desc: 'Powerful product catalog with images, categories, variants, colors, and stock tracking.',
    items: ['Unlimited products with images', 'Categories & subcategories', 'Color swatches & size options', 'Stock alerts & sale pricing'],
    gradient: 'from-blue-500 to-cyan-500',
    icon: Package,
  },
  {
    title: 'Orders & Payments',
    desc: 'Complete order workflow with payment proof verification and invoice generation.',
    items: ['Order status tracking', 'Payment proof upload & verify', 'PDF invoice generation', 'Multiple bank/QR methods'],
    gradient: 'from-emerald-500 to-teal-500',
    icon: ClipboardList,
  },
  {
    title: 'Customer System',
    desc: 'Built-in customer accounts with Google & Telegram login, order history, and saved info.',
    items: ['Customer profiles & history', 'Google + Telegram sign-in', 'Saved addresses & contacts', 'Customer order dashboard'],
    gradient: 'from-orange-500 to-amber-500',
    icon: Users,
  },
  {
    title: 'Broadcast & Newsfeed',
    desc: 'Send promotions and updates to all customers. Built-in social-style newsfeed.',
    items: ['Mass broadcasts', 'Rich media newsfeed', 'Customer likes & comments', 'Auto-publish product updates'],
    gradient: 'from-pink-500 to-rose-500',
    icon: Megaphone,
  },
  {
    title: 'AI Chat Assistant',
    desc: '24/7 AI-powered customer support that answers questions and qualifies leads automatically.',
    items: ['Automated customer support', 'Product recommendations', 'Photo sharing in chat', 'Multi-language support'],
    gradient: 'from-indigo-500 to-blue-500',
    icon: Bot,
  },
  {
    title: 'Customization',
    desc: 'Brand your shop with custom themes, colors, banners, and personalized button labels.',
    items: ['20+ color themes', 'Custom banners & logos', 'Brand colors everywhere', 'Custom button labels'],
    gradient: 'from-fuchsia-500 to-pink-500',
    icon: Palette,
  },
  {
    title: 'Analytics & Insights',
    desc: 'Visual dashboards showing sales trends, top products, and revenue with exportable reports.',
    items: ['Sales charts & trends', 'Top products report', 'Revenue analytics', 'Export to CSV/PDF'],
    gradient: 'from-cyan-500 to-sky-500',
    icon: BarChart3,
  },
  {
    title: 'Cart & Checkout',
    desc: 'Smooth shopping experience with guest checkout, contact forms, and payment proof upload.',
    items: ['Web cart with quantity', 'Guest checkout — no signup', 'Contact info collection', 'Payment proof upload'],
    gradient: 'from-amber-500 to-yellow-500',
    icon: CreditCard,
  },
  {
    title: 'Telegram Deep Integration',
    desc: 'Seamless Telegram bot with order notifications, chat commands, and real-time admin alerts.',
    items: ['Order notifications in chat', 'Telegram admin alerts', 'Share products to Telegram', 'Telegram login for users'],
    gradient: 'from-sky-500 to-blue-500',
    icon: MessageCircle,
  },
  {
    title: 'Custom Domain',
    desc: 'Professional storefront on your own domain. Free SSL, no branding, simple DNS setup.',
    items: ['Your own domain name', 'Free SSL certificate', 'No platform branding', 'Simple DNS guide'],
    gradient: 'from-green-500 to-emerald-500',
    icon: Globe,
  },
  {
    title: 'Security & Admin',
    desc: 'Enterprise-grade security with Firebase auth, staff accounts, and role-based access control.',
    items: ['SSL encryption', 'Firebase authentication', 'Staff accounts & roles', 'Session management'],
    gradient: 'from-red-500 to-rose-500',
    icon: Shield,
  },
];

/* ───── Components ───── */

function Nav({ scrolled, lang, setLang }) {
  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
      scrolled ? 'bg-[#080818]/90 backdrop-blur-xl shadow-lg shadow-black/20' : 'bg-transparent'
    }`}>
      <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10">
        <div className="flex items-center justify-end h-16 md:h-20 gap-3 mr-1 md:mr-3">
          <button onClick={() => setLang(l => l === 'en' ? 'mm' : 'en')}
            className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold tracking-wide
              bg-white/10 backdrop-blur-sm border border-white/20
              text-white/80 hover:text-white hover:bg-white/20 hover:border-white/40
              transition-all duration-300 active:scale-95 shadow-lg shadow-black/10">
            <span className={`px-2 py-0.5 rounded-full transition-all duration-300 ${lang === 'en' ? 'bg-white/20 shadow-sm scale-110' : 'opacity-50 grayscale'}`}>🇺🇸</span>
            <span className="text-white/30 text-[9px]">|</span>
            <span className={`px-2 py-0.5 rounded-full transition-all duration-300 ${lang === 'mm' ? 'bg-white/20 shadow-sm scale-110' : 'opacity-50 grayscale'}`}>🇲🇲</span>
          </button>
          <div className="hidden md:flex items-center gap-8">
            <a href="/login"
              className="text-sm font-semibold px-5 py-2.5 rounded-xl bg-white text-indigo-700 hover:bg-gray-50 shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all active:scale-95">
              Get Started
            </a>
          </div>

        </div>
      </div>
    </nav>
  );
}

function Hero({ lang }) {
  const t = LANG[lang];
  return (
    <section className="relative min-h-[90svh] flex items-center overflow-hidden bg-[#080818]">
      <div className="absolute inset-0">
        <div className="absolute top-[-15%] left-[-5%] w-[55%] h-[55%] bg-gradient-to-br from-indigo-500/[0.12] via-purple-500/[0.08] to-transparent rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-5%] w-[55%] h-[55%] bg-gradient-to-br from-purple-500/[0.12] via-pink-500/[0.08] to-transparent rounded-full blur-[120px]" />
        <div className="absolute top-[45%] left-[60%] w-[30%] h-[30%] bg-gradient-to-br from-blue-500/[0.06] to-transparent rounded-full blur-[100px]" />
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }} />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </div>

      <div className="relative max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 py-28 md:py-36 w-full">
        <div className="max-w-3xl">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] mb-8">
            <Sparkles className="w-3 h-3 text-indigo-300" />
            <span className="text-[11px] font-semibold text-white/50 tracking-[0.15em] uppercase">{t.heroBadge}</span>
          </motion.div>

          <motion.h1 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.06 }}
            className="text-[clamp(2.2rem,6.5vw,4.5rem)] font-extrabold text-white leading-[1.05] tracking-tight">
            Sell on{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-purple-300 to-pink-200">Telegram</span>
            ,{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-purple-300 to-pink-200">Website</span>{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-200 to-orange-200">With Your Own Domain</span>
          </motion.h1>

          <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}
            className="mt-5 text-base md:text-lg text-white/40 leading-relaxed max-w-lg">
            {t.heroSub}
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.14 }}
            className="mt-8 flex flex-col sm:flex-row gap-3">
            <a href="/login"
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl bg-white text-indigo-700 font-bold text-sm shadow-2xl hover:shadow-[0_0_30px_rgba(99,102,241,0.25)] hover:-translate-y-0.5 transition-all active:scale-95">
              Start Free <ArrowRight className="w-4 h-4" />
            </a>
            <a href="#features"
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl bg-white/[0.04] backdrop-blur-sm text-white/60 font-semibold text-sm border border-white/[0.08] hover:bg-white/[0.08] hover:text-white/80 transition-all">
              See Features
            </a>
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
            className="mt-12 flex flex-wrap items-center gap-5 text-xs">
            {[t.badgeNoCode, t.badgeFreeStart, t.badge5min, t.badgeAffordable].map(text => (
              <span key={text} className="flex items-center gap-1.5 text-white/30">
                <svg className="w-3.5 h-3.5 text-emerald-400/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6 9 17l-5-5"/></svg>
                {text}
              </span>
            ))}
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="mt-10 flex flex-wrap gap-2">
            {[
              [t.pillTelegram, 'bg-sky-500/[0.08] text-sky-300/80 border-sky-500/[0.15]'],
              [t.pillWeb, 'bg-indigo-500/[0.08] text-indigo-300/80 border-indigo-500/[0.15]'],
              [t.pillDomain, 'bg-emerald-500/[0.08] text-emerald-300/80 border-emerald-500/[0.15]'],
            ].map(([label, style]) => (
              <span key={label} className={`px-3 py-1 rounded-lg text-[11px] font-medium border ${style} backdrop-blur-sm`}>
                {label}
              </span>
            ))}
          </motion.div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#f5f5f7] to-transparent pointer-events-none" />
    </section>
  );
}

function FeaturesSection({ lang }) {
  const t = LANG[lang];
  return (
    <section id="features" className="py-20 md:py-28 bg-[#f5f5f7]">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10">
        <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="text-center mb-14">
          <p className="text-[11px] font-semibold text-indigo-500 uppercase tracking-[0.2em] mb-4">{t.featuresBadge}</p>
          <h2 className="text-3xl md:text-5xl font-extrabold text-gray-900 mb-4 tracking-tight">{t.featuresTitle}</h2>
          <p className="text-gray-400 text-sm md:text-base max-w-xl mx-auto">{t.featuresSub}</p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {FEATURES.map((f, i) => (
            <motion.div key={f.title} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: (i % 6) * 0.03 }}
              className="group bg-white rounded-2xl md:rounded-3xl p-6 md:p-7 border border-gray-100/60 hover:border-gray-200/80 transition-all hover:shadow-lg hover:-translate-y-0.5">
              <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${f.gradient} flex items-center justify-center mb-4 shadow-sm`}>
                <f.icon className="w-[18px] h-[18px] text-white" />
              </div>
              <h3 className="text-[15px] font-bold text-gray-900 mb-1.5">{f.title}</h3>
              <p className="text-xs md:text-sm text-gray-400 leading-relaxed mb-3.5">{f.desc}</p>
              <ul className="space-y-1.5">
                {f.items.map(item => (
                  <li key={item} className="flex items-start gap-2 text-xs md:text-sm text-gray-500">
                    <svg className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6 9 17l-5-5"/></svg>
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PricingSection({ lang }) {
  const [yearly, setYearly] = useState(false);
  const t = LANG[lang];

  return (
    <section id="pricing" className="py-20 md:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10">
        <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="text-center mb-6">
          <p className="text-[11px] font-semibold text-indigo-500 uppercase tracking-[0.2em] mb-4">{t.pricingBadge}</p>
          <h2 className="text-3xl md:text-5xl font-extrabold text-gray-900 mb-3 tracking-tight">Plans</h2>
          <p className="text-gray-400 text-sm">{t.pricingSub}</p>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
          className="flex items-center justify-center gap-3 mb-10">
          <span className={`text-sm font-semibold transition-colors ${!yearly ? 'text-gray-900' : 'text-gray-400'}`}>{t.monthly}</span>
          <button onClick={() => setYearly(!yearly)}
            className={`relative w-11 h-5 rounded-full transition-colors ${yearly ? 'bg-indigo-600' : 'bg-gray-200'}`}>
            <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${yearly ? 'translate-x-6' : 'translate-x-0.5'}`} />
          </button>
          <span className={`text-sm font-semibold transition-colors ${yearly ? 'text-gray-900' : 'text-gray-400'}`}>{t.yearly} <span className="text-emerald-500 text-[11px] font-bold">{t.save}</span></span>
        </motion.div>

        <div className="grid md:grid-cols-5 gap-3 md:gap-4">
          {PLANS.map((plan, i) => {
            const isFree = plan.key === 'free';
            const priceDisplay = isFree ? 'Free' : yearly ? plan.yearly : `${plan.price}${plan.period}`;
            return (
              <motion.div key={plan.key} initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}
                className={`relative rounded-2xl md:rounded-3xl p-5 md:p-6 border transition-all hover:shadow-lg flex flex-col ${
                  plan.popular
                    ? 'border-indigo-500 bg-white shadow-xl ring-1 ring-indigo-500/15 scale-[1.02] md:scale-105'
                    : 'border-gray-100 bg-white shadow-sm hover:border-gray-200'
                }`}>
                {plan.popular && (
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                    <span className="px-3 py-0.5 bg-indigo-600 text-white text-[10px] font-bold rounded-full shadow-md">{t.popular}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 mb-3">
                  <plan.icon className={`w-4 h-4 ${plan.popular ? 'text-indigo-600' : 'text-gray-400'}`} />
                  <h3 className={`font-bold text-sm ${plan.popular ? 'text-indigo-600' : 'text-gray-900'}`}>{plan.name}</h3>
                </div>
                <div className="mb-4">
                  <p className={`font-extrabold text-gray-900 ${isFree ? 'text-xl' : 'text-2xl'}`}>
                    {priceDisplay}
                    {!isFree && !yearly && <span className="text-sm font-medium text-gray-400">/mo</span>}
                  </p>
                  {!isFree && yearly && (
                    <p className="text-[10px] text-gray-400 mt-0.5">{plan.yearly}</p>
                  )}
                </div>
                <ul className="space-y-2 mb-5 flex-1">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-xs text-gray-500">
                      <svg className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6 9 17l-5-5"/></svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <a href="/login"
                  className={`block text-center py-3 rounded-xl font-bold text-xs transition-all active:scale-95 ${
                    plan.popular
                      ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}>
                  {isFree ? 'Start Free' : 'Subscribe'}
                </a>
              </motion.div>
            );
          })}
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">{t.pricingNote}</p>
      </div>
    </section>
  );
}

function FAQSection({ lang }) {
  const [open, setOpen] = useState(null);
  const t = LANG[lang];

  const FAQS = [
    { q: t.faq1q, a: t.faq1a },
    { q: t.faq2q, a: t.faq2a },
    { q: t.faq3q, a: t.faq3a },
    { q: t.faq4q, a: t.faq4a },
    { q: t.faq5q, a: t.faq5a },
    { q: t.faq6q, a: t.faq6a },
  ];

  return (
    <section id="faq" className="py-20 md:py-28 bg-[#f5f5f7]">
      <div className="max-w-2xl mx-auto px-5 sm:px-8 lg:px-10">
        <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="text-center mb-12">
          <p className="text-[11px] font-semibold text-indigo-500 uppercase tracking-[0.2em] mb-4">{t.faqBadge}</p>
          <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight">{t.faqTitle}</h2>
        </motion.div>

        <div className="space-y-2">
          {FAQS.map((faq, i) => (
            <div key={i}>
              <button onClick={() => setOpen(open === i ? null : i)}
                className={`w-full flex items-center justify-between p-5 rounded-2xl text-left transition-all ${
                  open === i ? 'bg-white shadow-sm border border-gray-100' : 'bg-white/40 hover:bg-white/80 border border-transparent hover:border-gray-100'
                }`}>
                <span className="font-semibold text-sm md:text-base text-gray-900 pr-4">{faq.q}</span>
                <svg className={`w-4 h-4 text-gray-400 shrink-0 transition-transform duration-200 ${open === i ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="m6 9 6 6 6-6"/>
                </svg>
              </button>
              {open === i && (
                <div className="px-5 pb-5 pt-3">
                  <p className="text-sm text-gray-500 leading-relaxed">{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CtaSection({ lang }) {
  const t = LANG[lang];
  return (
    <section className="py-20 md:py-28 bg-[#080818] relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-[-10%] left-[20%] w-[40%] h-[40%] bg-gradient-to-br from-indigo-500/[0.08] via-purple-500/[0.06] to-transparent rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[20%] w-[40%] h-[40%] bg-gradient-to-br from-purple-500/[0.08] via-pink-500/[0.06] to-transparent rounded-full blur-[100px]" />
        <div className="absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }} />
      </div>
      <div className="relative max-w-2xl mx-auto px-5 sm:px-8 lg:px-10 text-center">
        <motion.h2 initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="text-3xl md:text-5xl font-extrabold text-white mb-5 leading-tight tracking-tight">
          {t.ctaTitle}
        </motion.h2>
        <motion.p initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.05 }}
          className="text-white/30 text-base mb-8 max-w-sm mx-auto">
          {t.ctaSub}
        </motion.p>
        <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.08 }}>
          <a href="/login"
            className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl bg-white text-indigo-700 font-bold text-sm shadow-2xl hover:shadow-[0_0_30px_rgba(99,102,241,0.25)] hover:-translate-y-0.5 transition-all active:scale-95">
            Create Your Free Shop <ArrowRight className="w-4 h-4" />
          </a>
        </motion.div>
      </div>
    </section>
  );
}

function Footer({ lang }) {
  const t = LANG[lang];
  return (
    <footer className="bg-[#080818] border-t border-white/[0.04] text-gray-500">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 py-12 md:py-16">
        <div className="grid md:grid-cols-4 gap-8 md:gap-12">
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <ShoppingBag className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-base text-white">TeleShop</span>
            </div>
            <p className="text-xs leading-relaxed max-w-xs text-gray-500">
              {t.footerDesc}
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-white text-xs mb-4 uppercase tracking-wider">{t.footerPlatform}</h4>
            <div className="space-y-2.5">
              {[[t.footerFeatures, '#features'], [t.footerPricing, '#pricing'], [t.footerFaq, '#faq']].map(([label, href]) => (
                <a key={label} href={href} className="block text-xs hover:text-white transition-colors">{label}</a>
              ))}
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-white text-xs mb-4 uppercase tracking-wider">{t.footerConnect}</h4>
            <div className="space-y-2.5">
              <a href="https://t.me/tg_ecommerce_official_bot" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 text-xs hover:text-white transition-colors">
                <MessageCircle className="w-3.5 h-3.5" /> {t.footerBot}
              </a>
              <a href="mailto:support@telegramecommerce.shop"
                className="flex items-center gap-2 text-xs hover:text-white transition-colors">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                {t.footerEmail}
              </a>
            </div>
          </div>
        </div>
        <div className="border-t border-white/[0.04] mt-10 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-[11px]">
          <p>&copy; {new Date().getFullYear()} TeleShop. {t.footerRights}</p>
          <p className="text-gray-600">{t.footerTagline}</p>
        </div>
      </div>
    </footer>
  );
}

/* ───── Main Export ───── */
export default function Homepage() {
  const [scrolled, setScrolled] = useState(false);
  const [lang, setLang] = useState('en');

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 5);
    window.addEventListener('scroll', onScroll, { passive: true });
    const preventCtx = e => e.preventDefault();
    window.addEventListener('contextmenu', preventCtx);
    const style = document.createElement('style');
    style.id = 'homepage-selectable';
    style.textContent = '#homepage-root,#homepage-root *{-webkit-user-select:text!important;user-select:text!important;-webkit-user-drag:auto!important;-webkit-touch-callout:default!important}';
    document.head.appendChild(style);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('contextmenu', preventCtx);
      document.getElementById('homepage-selectable')?.remove();
    };
  }, []);

  return (
    <div id="homepage-root" style={{ WebkitUserSelect: 'text', userSelect: 'text' }} className="bg-[#f5f5f7]">
      <Nav scrolled={scrolled} lang={lang} setLang={setLang} />

      <Hero lang={lang} />
      <FeaturesSection lang={lang} />
      <PricingSection lang={lang} />
      <FAQSection lang={lang} />
      <CtaSection lang={lang} />
      <Footer lang={lang} />
    </div>
  );
}
