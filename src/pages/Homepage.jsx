import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  ShoppingBag, Globe, Package, ClipboardList,
  CreditCard, Users, Megaphone, Bot, Palette, BarChart3,
  Check, ArrowRight, MessageCircle, Sparkles, Zap,
  TrendingUp, Star, Crown, Key, Shield,
} from 'lucide-react';

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
    key: 'standard', name: 'Standard', icon: Crown, price: '20,000', period: '/month', popular: false,
    yearly: '250,000 MMK/yr',
    features: ['7 bots', '70 products', '15 categories', '25 custom commands', '5 payment methods', '25 broadcasts/mo', 'E-commerce website', 'Staff Activities', 'Ads removed (no watermark)'],
  },
  {
    key: 'pro', name: 'Pro', icon: Key, price: '35,000', period: '/month', popular: true,
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

const FAQS = [
  { q: 'How do I start?', a: 'Sign up at telegramecommerce.shop, create your bot, add products, and start selling. Takes under 5 minutes.' },
  { q: 'Can I use my own domain?', a: 'Yes. Standard plan and above include custom domain support with free SSL. Simple DNS setup.' },
  { q: 'What payment methods can I use?', a: 'You can add bank accounts, QR codes, and any payment method. Customers upload payment proof during checkout.' },
  { q: 'Do I need a website?', a: 'No. Your shop works on Telegram without a website. Web shop is included on Standard plan and above.' },
  { q: 'Can I have multiple bots?', a: 'Yes. Each plan supports multiple bots with their own products, customers, and settings.' },
  { q: 'What is the AI Agent?', a: 'AI-powered chat assistant that handles customer inquiries automatically. Pro plan includes free API key.' },
];

/* ───── Components ───── */

function Nav({ scrolled, setMenuOpen, menuOpen }) {
  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
      scrolled ? 'bg-white/90 backdrop-blur-xl shadow-[0_1px_20px_rgba(0,0,0,0.06)]' : 'bg-transparent'
    }`}>
      <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10">
        <div className="flex items-center justify-between h-16 md:h-20">
          <a href="/homepage" className="flex items-center gap-3 shrink-0 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-200 group-hover:shadow-indigo-300 transition-shadow">
              <ShoppingBag className="w-5 h-5 text-white" />
            </div>
            <span className={`font-bold text-lg tracking-tight transition-colors duration-500 ${scrolled ? 'text-gray-900' : 'text-white'}`}>
              TeleShop
            </span>
          </a>

          <div className="hidden md:flex items-center gap-8">
            {[
              ['Features', '#features'],
              ['Pricing', '#pricing'],
              ['FAQ', '#faq'],
            ].map(([label, href]) => (
              <a key={label} href={href}
                className={`text-sm font-medium tracking-wide transition-all hover:opacity-100 ${
                  scrolled ? 'text-gray-500 hover:text-gray-900' : 'text-white/70 hover:text-white'
                }`}>
                {label}
              </a>
            ))}
            <a href="/login"
              className={`text-sm font-semibold px-5 py-2.5 rounded-xl transition-all ${
                scrolled
                  ? 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                  : 'text-white/80 hover:text-white'
              }`}>
              Sign In
            </a>
            <a href="/login"
              className={`text-sm font-semibold px-5 py-2.5 rounded-xl transition-all active:scale-95 ${
                scrolled
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200'
                  : 'bg-white text-indigo-700 hover:bg-gray-50 shadow-lg hover:shadow-xl hover:-translate-y-0.5'
              }`}>
              Get Started
            </a>
          </div>

          <button onClick={() => setMenuOpen(v => !v)}
            className={`md:hidden p-2 rounded-xl transition-colors ${scrolled ? 'text-gray-600' : 'text-white'}`}>
            {menuOpen ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12h18"/><path d="M3 6h18"/><path d="M3 18h18"/></svg>
            )}
          </button>
        </div>
      </div>
    </nav>
  );
}

function Hero() {
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
            <span className="text-[11px] font-semibold text-white/50 tracking-[0.15em] uppercase">Multi-Platform E-Commerce</span>
          </motion.div>

          <motion.h1 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.06 }}
            className="text-[clamp(2.2rem,6.5vw,4.5rem)] font-extrabold text-white leading-[1.05] tracking-tight">
            Sell on{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-purple-300 to-pink-200">Telegram</span>
            ,<br />
            Web &amp; Your Domain
          </motion.h1>

          <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}
            className="mt-5 text-base md:text-lg text-white/40 leading-relaxed max-w-lg">
            The all-in-one platform for Myanmar e-commerce. Create your Telegram bot store,
            launch a web shop, and connect your own domain — all from one dashboard.
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
            {['No coding', 'Free to start', '5-min setup', 'SSL security'].map(text => (
              <span key={text} className="flex items-center gap-1.5 text-white/30">
                <svg className="w-3.5 h-3.5 text-emerald-400/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6 9 17l-5-5"/></svg>
                {text}
              </span>
            ))}
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="mt-10 flex flex-wrap gap-2">
            {[
              ['Telegram Shop', 'bg-sky-500/[0.08] text-sky-300/80 border-sky-500/[0.15]'],
              ['Web Storefront', 'bg-indigo-500/[0.08] text-indigo-300/80 border-indigo-500/[0.15]'],
              ['Custom Domain', 'bg-emerald-500/[0.08] text-emerald-300/80 border-emerald-500/[0.15]'],
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

function StatsBar() {
  return (
    <section className="relative z-10 max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 -mt-14">
      <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-gray-200/40 border border-gray-100/60 p-6 md:p-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          {[
            ['2,400+', 'Active Shops'],
            ['85,000+', 'Orders Processed'],
            ['120,000+', 'Products Listed'],
            ['98%', 'Satisfaction'],
          ].map(([val, label], i) => (
            <motion.div key={label} initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}
              className="text-center md:text-left md:border-r border-gray-100 last:border-0 md:pr-8 last:pr-0">
              <p className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">{val}</p>
              <p className="text-xs md:text-sm text-gray-400 font-medium mt-0.5">{label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeaturesSection() {
  return (
    <section id="features" className="py-20 md:py-28 bg-[#f5f5f7]">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10">
        <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="text-center mb-14">
          <p className="text-[11px] font-semibold text-indigo-500 uppercase tracking-[0.2em] mb-4">Everything Included</p>
          <h2 className="text-3xl md:text-5xl font-extrabold text-gray-900 mb-4 tracking-tight">Built for Myanmar Sellers</h2>
          <p className="text-gray-400 text-sm md:text-base max-w-xl mx-auto">Every tool you need to start, run, and grow your e-commerce business. No third-party apps required.</p>
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

function PricingSection() {
  const [yearly, setYearly] = useState(false);

  return (
    <section id="pricing" className="py-20 md:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10">
        <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="text-center mb-6">
          <p className="text-[11px] font-semibold text-indigo-500 uppercase tracking-[0.2em] mb-4">Pricing</p>
          <h2 className="text-3xl md:text-5xl font-extrabold text-gray-900 mb-3 tracking-tight">Simple Plans</h2>
          <p className="text-gray-400 text-sm">Start free. Upgrade when you grow.</p>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
          className="flex items-center justify-center gap-3 mb-10">
          <span className={`text-sm font-semibold transition-colors ${!yearly ? 'text-gray-900' : 'text-gray-400'}`}>Monthly</span>
          <button onClick={() => setYearly(!yearly)}
            className={`relative w-11 h-5 rounded-full transition-colors ${yearly ? 'bg-indigo-600' : 'bg-gray-200'}`}>
            <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${yearly ? 'translate-x-6' : 'translate-x-0.5'}`} />
          </button>
          <span className={`text-sm font-semibold transition-colors ${yearly ? 'text-gray-900' : 'text-gray-400'}`}>Yearly <span className="text-emerald-500 text-[11px] font-bold">Save ~20%</span></span>
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
                    <span className="px-3 py-0.5 bg-indigo-600 text-white text-[10px] font-bold rounded-full shadow-md">Popular</span>
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

        <p className="text-center text-xs text-gray-400 mt-6">All plans include community support. Paid plans include email support.</p>
      </div>
    </section>
  );
}

function FAQSection() {
  const [open, setOpen] = useState(null);

  return (
    <section id="faq" className="py-20 md:py-28 bg-[#f5f5f7]">
      <div className="max-w-2xl mx-auto px-5 sm:px-8 lg:px-10">
        <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="text-center mb-12">
          <p className="text-[11px] font-semibold text-indigo-500 uppercase tracking-[0.2em] mb-4">FAQ</p>
          <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight">Common Questions</h2>
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

function CtaSection() {
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
          Ready to Start Selling?
        </motion.h2>
        <motion.p initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.05 }}
          className="text-white/30 text-base mb-8 max-w-sm mx-auto">
          Join thousands of Myanmar sellers. Create your store in minutes — free to start, no credit card.
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

function Footer() {
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
              Multi-platform e-commerce solution for Myanmar. Sell on Telegram, web, and your own domain from one dashboard.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-white text-xs mb-4 uppercase tracking-wider">Platform</h4>
            <div className="space-y-2.5">
              {[['Features', '#features'], ['Pricing', '#pricing'], ['FAQ', '#faq']].map(([label, href]) => (
                <a key={label} href={href} className="block text-xs hover:text-white transition-colors">{label}</a>
              ))}
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-white text-xs mb-4 uppercase tracking-wider">Connect</h4>
            <div className="space-y-2.5">
              <a href="https://t.me/tg_ecommerce_official_bot" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 text-xs hover:text-white transition-colors">
                <MessageCircle className="w-3.5 h-3.5" /> Telegram Bot
              </a>
              <a href="mailto:support@telegramecommerce.shop"
                className="flex items-center gap-2 text-xs hover:text-white transition-colors">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                Email Support
              </a>
            </div>
          </div>
        </div>
        <div className="border-t border-white/[0.04] mt-10 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-[11px]">
          <p>&copy; {new Date().getFullYear()} TeleShop. All rights reserved.</p>
          <p className="text-gray-600">Built for Myanmar e-commerce sellers.</p>
        </div>
      </div>
    </footer>
  );
}

/* ───── Main Export ───── */
export default function Homepage() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div style={{ WebkitUserSelect: 'text', userSelect: 'text' }} className="bg-[#f5f5f7]">
      <Nav scrolled={scrolled} menuOpen={menuOpen} setMenuOpen={setMenuOpen} />

      {menuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setMenuOpen(false)} />
          <div className="fixed top-16 right-0 w-72 bg-white rounded-bl-3xl shadow-2xl border border-gray-100 p-6">
            <div className="space-y-2">
              {[['Features', '#features'], ['Pricing', '#pricing'], ['FAQ', '#faq']].map(([label, href]) => (
                <a key={label} href={href} onClick={() => setMenuOpen(false)}
                  className="block px-4 py-3 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                  {label}
                </a>
              ))}
              <hr className="my-3 border-gray-100" />
              <a href="/login" onClick={() => setMenuOpen(false)}
                className="block px-4 py-3 rounded-xl text-sm font-semibold text-indigo-600 hover:bg-indigo-50 transition-colors">
                Sign In
              </a>
              <a href="/login" onClick={() => setMenuOpen(false)}
                className="block text-center px-4 py-3 rounded-xl text-sm font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors">
                Get Started
              </a>
            </div>
          </div>
        </div>
      )}

      <Hero />
      <StatsBar />
      <FeaturesSection />
      <PricingSection />
      <FAQSection />
      <CtaSection />
      <Footer />
    </div>
  );
}
