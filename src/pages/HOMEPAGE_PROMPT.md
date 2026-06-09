# Prompt for AI — Build Marketing Homepage

Build a single-page marketing homepage for a multi-platform e-commerce platform called **TeleShop** (also branded as Telegram E-Commerce). This is a public-facing page at `telegramecommerce.shop/homepage` — no sign-in required, no admin features, no VPS/server info.

## Tech Stack
- React 19, Tailwind CSS v4, motion (framer-motion v12), lucide-react
- The app already has `motion/react` and `lucide-react` available
- Use `import { motion } from 'motion/react'` for animations
- Use lucide-react icons throughout
- Mobile-first responsive (mobile, tablet, desktop)
- Dark theme nav/hero sections use `bg-[#080818]` as the dark color
- Light section backgrounds use `bg-[#f5f5f7]` (Apple-style light gray)
- Max content width: `max-w-7xl mx-auto px-5 sm:px-8 lg:px-10`

## Design Requirements
- Modern, premium SaaS landing page style (think Apple/Stripe)
- Dark hero with animated gradient orbs, subtle grid overlay
- Nav stays dark (`bg-transparent` on top, switches to `bg-[#080818]/90 backdrop-blur-xl` on scroll) — all text/buttons remain white at all times, no white nav
- Sections alternate between dark (`#080818`) and light (`#f5f5f7` / `white`)
- Use gradient accents on headings and icons
- Smooth scroll-triggered animations with `motion`
- High contrast text throughout — no white text on white backgrounds

## Sections Required

### 1. Nav
- Logo (ShoppingBag icon + "TeleShop" text, both always white)
- Links: Features (#features), Pricing (#pricing), FAQ (#faq) — always white text
- Sign In link — white text
- Get Started button — white bg with indigo-700 text
- Mobile hamburger menu that opens a slide-in panel
- On scroll: nav gets `bg-[#080818]/90 backdrop-blur-xl shadow-lg shadow-black/20`

### 2. Hero
- Full viewport height dark section (`#080818`)
- Animated gradient orbs (subtle indigo/purple)
- Grid overlay pattern (opacity 0.02-0.03)
- Small badge: "Multi-Platform E-Commerce"
- Main headline: "Sell on Telegram, Web & Your Own Domain" with gradient text on "Telegram"
- Subtext describing the platform
- "Start Free" CTA button (white bg, indigo-700 text)
- "See Features" secondary CTA (subtle white border)
- Feature badges: Telegram Shop, Web Storefront, Custom Domain
- Trust markers: No coding, Free to start, 5-min setup, SSL security

### 3. Stats Bar
- White card with shadow, positioned to overlap hero bottom (-mt-14)
- 4 stats in a row: 2,400+ Active Shops, 85,000+ Orders Processed, 120,000+ Products Listed, 98% Satisfaction
- Animate on scroll

### 4. Features Section (12 feature cards)
Background: `bg-[#f5f5f7]`
Grid: 3 columns desktop, 2 tablet, 1 mobile
Each card has:
- Gradient icon in a rounded box (use these gradient combinations):
  - Multi-Platform Shop: from-violet-500 to-purple-600, icon: ShoppingBag
  - Product Management: from-blue-500 to-cyan-500, icon: Package
  - Orders & Payments: from-emerald-500 to-teal-500, icon: ClipboardList
  - Customer System: from-orange-500 to-amber-500, icon: Users
  - Broadcast & Newsfeed: from-pink-500 to-rose-500, icon: Megaphone
  - AI Chat Assistant: from-indigo-500 to-blue-500, icon: Bot
  - Customization: from-fuchsia-500 to-pink-500, icon: Palette
  - Analytics & Insights: from-cyan-500 to-sky-500, icon: BarChart3
  - Cart & Checkout: from-amber-500 to-yellow-500, icon: CreditCard
  - Telegram Deep Integration: from-sky-500 to-blue-500, icon: MessageCircle
  - Custom Domain: from-green-500 to-emerald-500, icon: Globe
  - Security & Admin: from-red-500 to-rose-500, icon: Shield
- White card bg with subtle border, hover shadow effect
- Title (bold), description text, 4 bullet features with green checkmark

Feature details for each card:
1. **Multi-Platform Shop**: "Sell on Telegram, web, and your own custom domain — all synced in real-time from one dashboard." Bullets: Telegram bot with inline ordering, Full web storefront with cart, Custom domain with SSL, Real-time multi-platform sync
2. **Product Management**: "Powerful product catalog with images, categories, variants, colors, and stock tracking." Bullets: Unlimited products with images, Categories & subcategories, Color swatches & size options, Stock alerts & sale pricing
3. **Orders & Payments**: "Complete order workflow with payment proof verification and invoice generation." Bullets: Order status tracking, Payment proof upload & verify, PDF invoice generation, Multiple bank/QR methods
4. **Customer System**: "Built-in customer accounts with Google & Telegram login, order history, and saved info." Bullets: Customer profiles & history, Google + Telegram sign-in, Saved addresses & contacts, Customer order dashboard
5. **Broadcast & Newsfeed**: "Send promotions and updates to all customers. Built-in social-style newsfeed." Bullets: Mass broadcasts, Rich media newsfeed, Customer likes & comments, Auto-publish product updates
6. **AI Chat Assistant**: "24/7 AI-powered customer support that answers questions and qualifies leads automatically." Bullets: Automated customer support, Product recommendations, Photo sharing in chat, Multi-language support
7. **Customization**: "Brand your shop with custom themes, colors, banners, and personalized button labels." Bullets: 20+ color themes, Custom banners & logos, Brand colors everywhere, Custom button labels
8. **Analytics & Insights**: "Visual dashboards showing sales trends, top products, and revenue with exportable reports." Bullets: Sales charts & trends, Top products report, Revenue analytics, Export to CSV/PDF
9. **Cart & Checkout**: "Smooth shopping experience with guest checkout, contact forms, and payment proof upload." Bullets: Web cart with quantity, Guest checkout — no signup, Contact info collection, Payment proof upload
10. **Telegram Deep Integration**: "Seamless Telegram bot with order notifications, chat commands, and real-time admin alerts." Bullets: Order notifications in chat, Telegram admin alerts, Share products to Telegram, Telegram login for users
11. **Custom Domain**: "Professional storefront on your own domain. Free SSL, no branding, simple DNS setup." Bullets: Your own domain name, Free SSL certificate, No platform branding, Simple DNS guide
12. **Security & Admin**: "Enterprise-grade security with Firebase auth, staff accounts, and role-based access control." Bullets: SSL encryption, Firebase authentication, Staff accounts & roles, Session management

### 5. Pricing Section
Background: `bg-white`
Monthly/yearly toggle with sliding switch
Grid of 5 plan cards (Free, Basic, Standard, Pro, Business)

#### Plan Specs:
**Free** — Price: Free — Popular: false
- 1 bot, 5 products, 1 category, 5 custom commands, 1 payment method, 4 broadcasts/mo, Telegram panel, Community support

**Basic** — Price: 14,000 MMK/month or 150,000 MMK/yr — Popular: false
- 3 bots, 30 products, 7 categories, 25 custom commands, 3 payment methods, 10 broadcasts/mo, Add up to 2 admins, Web dashboard access

**Standard** — Price: 20,000 MMK/month or 250,000 MMK/yr — Popular: false
- 7 bots, 70 products, 15 categories, 25 custom commands, 5 payment methods, 25 broadcasts/mo, E-commerce website, Staff Activities, Ads removed (no watermark)

**Pro** — Price: 35,000 MMK/month or 350,000 MMK/yr — Popular: **true** (marked as Most Popular)
- 25 bots, 150 products, 35 categories, 50 custom commands, 10 payment methods, 75 broadcasts/mo, Custom domain (1), Staff Activities, AI Agent + Free API

**Business** — Price: 55,000 MMK/month or 600,000 MMK/yr — Popular: false
- 50 bots, Unlimited products, Unlimited categories, Unlimited commands, Unlimited payments, Unlimited broadcasts, Custom domains (up to 3), Staff Activities, Email notification + Priority

All plan cards have: icon, name, price display, feature list with green checks, Subscribe button. Popular plan gets elevated styling (indigo border, slight scale, "Most Popular" badge).

### 6. How It Works Section
Background: `bg-[#080818]` (dark, matching hero)
3 steps in a row:
1. "Create Your Bot" — Sign up and create your e-commerce bot in under 2 minutes
2. "Add Products & Customize" — Upload products, set prices, organize categories, customize theme
3. "Start Selling" — Share your Telegram bot link or web shop URL

With a CTA button at the bottom: "Start Free — No Credit Card"

### 7. FAQ Section
Background: `bg-[#f5f5f7]`
Accordion-style questions. 6 questions:
- How do I start?
- Can I use my own domain?
- What payment methods can I use?
- Do I need a website?
- Can I have multiple bots?
- What is the AI Agent?

### 8. CTA Section
Dark background (`#080818`) matching hero
Headline: "Ready to Start Selling?"
Subtext
"Create Your Free Shop" button (white bg, indigo text)

### 9. Footer
Dark background (`#080818`)
4-column grid: Brand description, Platform links, Connect links
Bottom: copyright

## Key Implementation Notes
- The page does NOT use React Router — all nav links use `<a href="#section-id">` for smooth scrolling
- The export should be: `export default function Homepage() { ... }`
- Import `useState`, `useEffect` from react and `motion` from 'motion/react'
- All text must be selectable: wrap root div with `style={{ WebkitUserSelect: 'text', userSelect: 'text' }}`
- Keep `scrolled` state in the main Homepage component and pass it to Nav
- Scroll threshold: `window.scrollY > 5`
- The `bg-gray-50` reference: use `bg-[#f5f5f7]` instead (custom color, not Tailwind default gray)
