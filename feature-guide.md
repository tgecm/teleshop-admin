# TeleShop Admin Panel - Complete Feature Guide (Q&A)

## Dashboard

**What is the Dashboard?**
The main admin performance dashboard showing real-time stats, charts, and key metrics for your shop. Located at the `/dashboard` route after login.

**What are the Stat Cards?**
Four metric cards at the top showing key numbers. You can toggle between Revenue and Stock Value view. The cards show computed values like total revenue, costs, profits.

**What are the Mini Metrics?**
Units Sold (with a period selector: 7d/30d/90d/365d), Today's Revenue, Monthly Revenue, and Product Sold count. These give quick snapshots below the stat cards.

**How does the Date Range filter work?**
Preset buttons (7d/30d/90d/365d) plus custom start/end date pickers. All charts and metrics update based on the selected range.

**What charts are available?**
Chart type toggle (Bar / Line / Pie) with metric selector (Revenue / Orders / Users / Profit). Charts render with your selected date range data using Recharts library.

**What are Top Products?**
A ranked list of the top 10 products with progress bars showing relative performance. Updated based on the selected date range.

**What are the Quick Stats?**
Shows average daily revenue, maximum daily revenue, and growth rate percentage calculated from the selected period.

**How does the Export Data feature work?**
Opens a modal where you select date range, status filter (All/Pending/Confirmed/Delivered/Cancelled), and section checkboxes (Orders, Products, Customers, Payments, Profit). Downloads a CSV file with UTF-8 BOM encoding.

---

## Orders

**What is the Orders page?**
Full order management at `/orders` - view, search, filter, and update order statuses.

**How do I search orders?**
Search bar that searches by customer name, invoice number, receipt number, or order ID.

**How do I filter orders by status?**
Status filter dropdown with options: All / Pending / Confirmed / Cancelled / Rejected / Processing / Shipped / Delivered.

**How do I filter orders by channel?**
Order tabs: All / Telegram / Website / Guest. Shows orders from each specific channel.

**What is shown in the Order Detail modal?**
Customer info (name, date, total, status badge), Copy Info button (copies customer details to clipboard), Customer Profile section, Products list with prices, Order Summary (subtotal, delivery fee, total), Status Timeline (visual step indicator), "Fetch from Telegram" link.

**How do I update an order status?**
Update Status buttons: Processing / Shipped / Delivered / Cancelled. Each updates the order status directly.

**What is COD Payment handling?**
"Mark as Paid" button for cash-on-delivery orders. Mark payment as completed.

**How does Payment Proof work?**
Images uploaded by customer display with zoom/ImageViewer functionality, plus a download button for each proof image.

**What payment actions can I take?**
Confirm Payment / Reject Payment buttons for orders awaiting payment verification.

**Can I download invoices and receipts?**
Yes. Download Invoice (PDF) and Download Receipt (PDF) buttons in the order detail modal.

**What is the Shop Info modal?**
Shows tagline, phone, email, website, address, and notes for the shop.

---

## Products

**What is the Products page?**
Complete product management at `/products` - CRUD operations, categories, images, variants, and inventory control.

**How do I search products?**
Search bar with Unicode normalization support (works for Myanmar/Burmese search).

**How do I filter by category?**
Category filter dropdown. Categories can also be deleted inline with a two-step confirmation dialog.

**What action buttons are available?**
Sort button, Coupon button (create new or see all), New Product button, Delivery Fees button, Profile Info button, Points & Rewards button.

**How are products displayed?**
Product grid (2-4 columns responsive). Each card shows image with hover zoom, stock badges (Out of Stock / Low / In Stock), and a cost price dot indicator.

**How do I add a new product?**
Click "New Product" button (or + FAB on mobile). The ProductForm opens with:
- Category selector (with inline create new category)
- Product Name input (with duplicate name validation - red border + toast if name exists)
- Price input
- Promotion toggle (shows original price + promotion price, promotion price cannot exceed original)
- Cost Price collapsible section (with estimated profit display)
- Stock selector: In stock / Out of Stock / Custom quantity
- Description textarea
- Delivery Fee toggle
- Photos (up to 10, upload with client-side compression, grid display, remove)
- Colors (up to 8 from pre-defined color palette, optional image per color)
- Options (up to 10 groups, each group has option values with price adjustments)
- Channel Visibility checkboxes: Show on Telegram / Show on Website / Show on Guest (at least 1 required, Telegram auto-disabled when colors or options are added)

**How do I edit a product?**
Click on a product card. The same ProductForm opens pre-filled with existing data. Save changes with the Update button.

**How do I delete a product?**
Click delete icon on the product card, confirmed via ConfirmDialog.

**What is the Sort feature?**
Drag-and-drop product sorting using dnd-kit library. Rearrange product order visually.

**What is the Coupon feature?**
Create coupon codes for products. Code input (max 9 chars, auto-uppercase, Generate random button). Discount type toggle (Fixed amount or Percentage with validation). End Date picker. Total Coupons input. Min. Spend input. Coupon Manager shows list with status badges (Active/Used Up/Expired), copy code button, stats grid (Used/Remaining/Total).

**What are Delivery Fees?**
Modal with Flat/Zone toggle:
- Flat mode: single delivery fee input + free threshold input
- Zone mode: CSV template download, CSV import, region/district/township selectors, individual fee add/remove, free threshold input

**What are Checkout Fields?**
Modal with 8 field toggles: Full Name, Phone Number, Email Address, Telegram Username, Viber Number, Zone, Delivery Address, Notes. Minimum 2 required. Controls which fields customers see during checkout.

**What are Points & Rewards?**
Modal with: Enable toggle, Earn Rate (Every X currency = Y points), Redemption Rate (X points = Y currency), Min. Redeem Points input, Welcome Bonus input. Save/Cancel.

**What is Profile Info?**
Opens a modal/view with shop profile information like bio, contact details.

**What is Colors?**
Visual product variants. Up to 8 colors from a pre-defined palette. Each color can have an optional image (different photo for each color variant). Customers see color swatches on the shop page.

**What is Options?**
Custom product variants like Size, Material, etc. Up to 10 option groups. Each group has option values with optional price adjustments. For example: Size group with Small (+0), Medium (+2000), Large (+5000). Customers see these as selectable buttons on the shop page.

**What are the Channel Visibility checkboxes?**
Show on Telegram / Show on Website / Show on Guest. Controls which modes can view this product. When colors or options are added, Telegram is automatically unchecked and disabled (variant products cannot be sold on Telegram).

**What is the Cost Price feature?**
A hidden collapsible field where you enter your cost price. Not shown to customers. Used to calculate profit margins in the Profit page.

**What happens when I add colors/options to a product?**
The Telegram checkbox auto-unchecks and becomes disabled/faded. Product will not be available on Telegram mode, only on Website and Guest modes.

---

## Customers

**What is the Customers page?**
Customer management at `/customers` - view Telegram and Website customers with block/unblock capability.

**How do I search customers?**
Search bar that searches by name or username.

**What are the section tabs?**
Telegram / Website tabs with customer counts. Telegram has sub-tabs: All / Blocked.

**What is shown in the customer list?**
Pull-to-refresh, avatar + name, blocked badge, username, order count per customer, expandable row for more details.

**What is in the Customer Detail modal?**
Header with avatar/name. Profile details: Phone, Email, Telegram, Viber, Region, District, Township, Address. Orders section showing latest 3 orders with status badges.

**How do I block/unblock a customer?**
Block/Unblock button in customer detail modal with confirmation dialog.

---

## Broadcast

**What is the Broadcast page?**
Send broadcast messages and manage giveaways at `/broadcast`.

**What tabs are available?**
Broadcasts / Giveaways / Draw.

**How do I send a broadcast?**
New Broadcast modal with textarea message. Shows sent date, target count, and status in the list.

**How do I create a giveaway?**
New Giveaway modal - fill in title, description, end date picker. Giveaways list shows detail modal with stats and winner info.

**How does the Draw work?**
Giveaway selector dropdown, Draw Method toggle (By Tickets / Equal), Winner count selector (1-5), Pick Winner button with slot-machine spinner animation. Winner display with crown icon and rank. Draw Again / Reset buttons. Past Winners collapsible section.

---

## Commands

**What is the Commands page?**
Custom Telegram bot command management at `/commands`.

**How do I add a new command?**
New Command modal: auto-sanitized command name (prepends /, strips special chars), response textarea for the bot's reply message.

**What does the command list show?**
Monospace command name display, content preview with truncation, delete button.

**How do I delete a command?**
Two-step toggle delete button to confirm.

**What is the limitation?**
Commands accept text only - no media support.

---

## Payments

**What is the Payments page?**
Payment method management at `/payments`. Configure how customers pay.

**What is COD?**
Cash on Delivery toggle card. Enable/disable with a switch.

**How are payment methods displayed?**
Cards grid showing: name, account name, account number, active/inactive badge, QR thumbnail with hover zoom overlay. Edit/delete buttons per card.

**How do I add a payment method?**
Add/Edit Modal: Wallet/bank name input, account name, phone number, notes textarea, QR code upload (client-side compress to 854px), active toggle switch.

**What is the FAB?**
Floating Action Button on mobile for quick-add of new payment method.

---

## Profit

**What is the Profit page?**
Profit analytics at `/profit` showing cost, revenue, and margin calculations.

**What is in the Summary Cards?**
Total Cost, Net Profit with margin percentage, Today's Net Profit.

**What is the Untracked Products Warning?**
Amber alert banner with link to filter products that don't have cost prices set.

**What is the Product Breakdown table?**
Date quick-select (Today / Weekly / Monthly), date pickers, CSV export, category filter, sort filter (name/total/cost/profit ASC/DESC), search bar, result count. Table columns: Date, Product, Category, Qty Sold, Unit Price, Cost, Total, Profit (color-coded green/red).

**What is the Sales Log table?**
Shows every individual sale (not aggregated). Same filter controls. Summary bar: total cost, total revenue, total profit, margin %. Table with time precision (HH:mm:ss).

---

## Subscription

**What is the Subscription page?**
Plan management at `/subscription` - view current plan and upgrade/downgrade.

**What is the Current Plan Card?**
Plan icon, name, active/expired badge, expiry date, days remaining countdown.

**What plans are available?**
Basic / Standard / Pro / Business. Monthly or Yearly billing toggle. Feature lists with inherited indicators. Current plan badge. Upgrade button with cooldown timer.

**What are the Free Plan features?**
Static feature list display for the free tier.

**How do I use a discount code?**
Discount Code modal: code input (auto-uppercase), validate button. Applies discount to plan upgrade.

**How does the Payment QR work?**
5-minute countdown timer, QRCodeSVG rendering, payment details (account name/number), auto-polls every 1s for payment confirmation. Success/failure states. Close warning overlay.

---

## Settings

**What is the Settings page?**
Comprehensive settings at `/settings` with multiple tabs.

**What tabs are in Settings?**
Shop / Account / App (if native) / Plan (if not staff) / Admin (if superadmin) / Bots (if superadmin).

**Shop Tab - Shop Status:**
Open/Closed toggle with green/red indicators. Controls whether the shop is accepting orders.

**Shop Tab - Email Notifications:**
Edit/save email. Plan-gated feature.

**Shop Tab - Low Stock Alert:**
Toggle + threshold input. Auto-notifies via Support chat when stock drops below threshold.

**Shop Tab - Sound Effects:**
Toggle via localStorage. Plays sounds on certain actions.

**Shop Tab - Public Shop Page:**
Slug display, domain copy links, dedicated mode pages (Telegram/Website/Guest), Generate Public URL button.

**Shop Tab - How do I reorder mode buttons?**
Drag to reorder the modes (telegram/ecommerce/guest). Toggle show/hide with minimum 1 active required.

**Shop Tab - How do I add a custom domain?**
Custom Domains section: Up to 3 domains. Add/edit/verify/delete. DNS setup guide modal with A record instructions. Enable/disable toggle per domain. Dedicated mode URL shortcuts.

**Shop Tab - How do I manage admins?**
Current admins list with remove button. Add admin search with inline results.

**Account Tab - Change Password:**
Current/new/confirm password with show/hide toggle. For owners: email + Telegram verification code. For staff: Telegram code verification.

**Account Tab - Forgot Password:**
Reset via email + Telegram code for owners. Reset via Telegram code for staff.

**Superadmin Tab - APK Update:**
Trigger download latest APK from GitHub to VPS.

**Superadmin Tab - Discount Codes:**
Create/edit/delete subscription discount codes. Code generator (random 6-char). Discount type (Percentage/Free), duration, total cards/unlimited, chat ID. Active/inactive toggle. Desktop table + mobile card views.

**Superadmin Tab - Guide Prompt:**
Set AI guide prompt for bot admin assistant. Text editor with save/cancel. AI answers admin questions based on this prompt only.

**Bots Tab (ManageBots):**
All bots list with search. Current bot indicator. Main bot badge. Plan display. Delete with confirmation (type DELETE to confirm).

---

## Chats

**What is the Chats page?**
Multi-channel chat system at `/chats` - communicate with customers from Telegram, Website, and Guest channels.

**How do I search conversations?**
Search bar that searches by name or message content.

**What are the Support messages?**
Support button shows unread count badge from superadmin messages.

**What chat tabs are available?**
All / Telegram / Website / Guest with per-tab unread counts.

**What is shown in the conversation list?**
Avatar, unread badge with count, name, last message preview, admin checkmark (admin has replied), relative date, active highlight.

**What is the Context Menu?**
Right-click or long-press on a conversation: Delete Chat (two-click confirm), Mark as Read / Mark as Unread.

**What is in the Chat Detail modal?**
Header with avatar/name/phone. AI Agent toggle button. Messages area (ChatBubble, Markdown rendering, media, RichMessage component). AI-labeled messages.

**How do I send a message?**
Photo upload button (compress to 854px), auto-resize textarea, character count warning, send button.

**How does auto-refresh work?**
Chat messages poll every 15 seconds for new messages.

**What channels are supported?**
Telegram, web visitors, guest visitors.

---

## Customization

**What is the Customization page?**
Shop appearance and behavior customization at `/customization`.

**What are the Public Shop Themes?**
5 color themes: Modern Indigo, Emerald, Amber, Rose, Slate. Each with preview swatches showing primary/secondary/background colors.

**How do I set up Shop Identity?**
Logo upload (512x512, client-side compress). Bio editor (150 chars max) with save button.

**What is the AI Agent?**
Enable/disable toggle. Gender selector (Male/Female). Website custom prompt editor (full-screen textarea). Controls the AI customer service bot on the shop page.

**What are the Order Button options?**
7 options: Order Now / Shop Now / Buy Now / Enroll Now / Book Now / Get Now / Grab Now. Select one for the CTA button.

**How does Currency work?**
180+ searchable currencies with search input and dropdown selection.

**What are Shop Banners?**
Up to 5 banners at 1200x400 aspect ratio. Each with optional link URL. Reorder via drag. Upload with compression.

**What are Bot Captions?**
9 caption types in dropdown: New Arrival, Sale, Promotion, etc. Bottom sheet editor for each.

**What are Bot Posters?**
11 poster types. Per-type upload with progress indicator.

---

## Bot Customization

**What is the Bot Customization page?**
Separate Telegram bot customization at `/bot-customization`.

**What can I customize here?**
Bot captions (same 9 types), update posters (same 11 types), AI custom prompt for Telegram, Website Link toggle (show/hide + URL input with https:// validation).

---

## Newsfeed

**What is the Newsfeed page?**
Newsfeed post management at `/newsfeed`. Requires a bot to be selected. Wraps the NewsfeedPanel component.

**What can I do in NewsfeedPanel?**
Create, edit, delete newsfeed posts. Image upload. Comment management on posts.

---

## Send Message

**What is the Send Message page?**
Superadmin support chat with bot owners at `/send-message`.

**What tabs are available?**
Send New / Conversations.

**How do I send a new message?**
Search for a bot by name/username. Select bot card. Type message in textarea. Send button. Option to navigate to full chat view.

**How does the Conversations view work?**
List with unread counts, last message preview, date display. Click to open chat.

**What does the Chat view look like?**
Message bubbles (superadmin in amber, bot owner in gray), Markdown support, timestamps, reply input with Enter to send.

**How does auto-polling work?**
Messages poll every 5 seconds. Conversations list polls every 10 seconds.

---

## Subscribers

**What is the Subscribers page?**
Superadmin subscriber management at `/subscribers`.

**How do I search subscribers?**
Search by shop name or username.

**How do I filter by plan?**
Plan filter tabs: All / Paid / Free / Basic / Standard / Pro / Business (color-coded).

**What stats are shown?**
"X shown of Y total - Z active" display.

**Mobile view:**
Cards with shop name, owner, plan badge, active/inactive status dot, start/end dates.

**Desktop view:**
Table: #, Shop Name, Username, Bot Username, Plan, Start Date, End Date, Status.

---

## FAQs

**What is the FAQs page?**
FAQ management for superadmin at `/faqs`.

**How are FAQs displayed?**
Expandable/collapsible items with chevron icon. Answers render with linkifyText (auto-links URLs).

**How do I add/edit FAQs?**
Create/Edit modals with question input and answer textarea.

**How do I reorder FAQs?**
Drag-to-reorder via dnd-kit with GripVertical handle. Amber info banner about sort mode. Save/cancel for reorder.

**How do I delete a FAQ?**
Confirm dialog with trash icon.

---

## Staff Accounts

**What is the Staff Accounts page?**
Staff management with permissions and activity logs at `/staff-accounts`.

**How are staff displayed?**
List with initial avatar (first letter), name, @username + role, action buttons (Permissions / Change Password / Delete).

**How do I add staff?**
Add Staff Modal: name input, username (5-25 chars validation), password with show/hide toggle.

**How do I change a staff password?**
Change Password modal: displays staff name, minimum 4 chars, show/hide toggle.

**How do permissions work?**
Permissions modal with Master toggle (ALL ON/OFF). Individual toggles: Dashboard, Orders, Products, Customers, Chats, Newsfeed, Payments, Subscription, Customize, Profile, QR Menu group, FAQs, Telegram group, Broadcast, Commands, BotCustomization, Settings.

**What are Activity Logs?**
Modal with staff selector dropdown, date filter (last 7d/30d/90d/all). Entries with timestamp. Download as .txt file.

---

## QR Menu

**What is QR Menu?**
A digital menu system accessible by scanning a QR code. Customers scan to view menu items and place orders. Different from the regular e-commerce shop - designed for restaurants, cafes, and physical businesses.

**What is the QR Menu Admin page?**
Full QR menu management at `/qr-menu`. Manage menu items, categories, settings, customers, and coupons.

**How do I add menu items?**
New Item button opens MenuItemForm: Photos (up to 5, upload with compress), Category dropdown (searchable, emoji picker), Name, Price, Description, Variants (multiple groups with required toggle, options with label + price_add), Add-ons (label + price_add), Dietary Labels (badge toggles per business mode), Available toggle.

**How are items displayed?**
Grid (2-4 cols responsive) with images, hover zoom, Available/Unavailable badge, dietary labels, edit/delete overlay buttons, price, category tag.

**What is the Menu Banner?**
Collapsible section: banner thumbnails with remove, Add Banner (1200x400), upload.

**How do I manage customers?**
Collapsible customer section: search by phone/name. Customer list with name, phone, points, order count. Customer Detail modal with points adjustment (+100/-100 quick buttons, custom amount input), order history with channel icons.

**What are QR Menu Settings?**
Full settings bottom sheet:
- Business Type: Restaurant/Cafe/Bakery/Salon/Retail/Custom with emojis
- Visual Theme: 8+ themes with color previews. Custom theme with 4 color pickers
- Custom Labels: 9 editable text fields
- Dual Mode: Table or Token mode on scan
- Open/Close toggle
- Order Flow Mode: Prepaid/Postpaid/Browse Only/Token + Browse
- Landing Page: Welcome Message, Announcement with toggle, Operating Hours (weekday/weekend time inputs), Social Links (Facebook/Instagram/Phone)
- Points & Rewards: Enable, Earn Rate, Redemption Rate, Min Redeem, Welcome Bonus
- Coupons section: list with status, New Coupon button, delete
- QR Menu URLs with copy links per domain

---

## QR Menu - Orders

**What is the QR Menu Orders page?**
QR menu order management at `/qr-menu/orders`.

**What shows the pending count?**
Pending orders count badge with auto-refresh every 15 seconds.

**What tabs are available?**
Waiting / Confirmed / Rejected with counts.

**What do order cards show?**
Order number, notes badge, items summary (first item + count), total price, pending pulse dot animation, expandable chevron.

**What is in the expanded order?**
Items with quantities and prices, total amount, notes, payment method, points redeemed, payment proofs with images and download.

**How do I manage orders?**
Confirm/Decline buttons for pending orders. ImageViewer for payment proof zoom.

---

## QR Menu - Tables

**What is the QR Menu Tables page?**
Table QR codes and token queue management at `/qr-menu/tables`.

**What are the modes?**
Table Mode / Token Mode.

**Table Mode:**
Generate QR Link button. Table QR cards with editable inline name. QRCodeCanvas display. Copy domain links. Download QR as PNG.

**Token Mode:**
Now Serving display with Delete/Skip/Back/Next buttons. Queue Status (waiting count, next token, assigned count). Waiting Queue list (ordered by time). Reset Queue button with confirm. Token QR Code display with copy/download.

---

## QR Menu - Dashboard

**What is the QR Menu Dashboard page?**
QR Menu performance metrics at `/qr-menu/dashboard`.

**What date range controls?**
7d/30d/90d/365d/custom presets.

**What stat cards?**
QR Revenue, QR Orders, Pending QR orders count.

**What mini metrics?**
Items Sold, Today's Revenue, Monthly Revenue with total subtext.

**What charts?**
Bar/Line/Pie toggle. Revenue/Orders metric toggle. Top 10 Items label for pie charts.

**What are Popular Items?**
Up to 10 items with rank badges (1st/2nd/3rd), order count, share percentage, progress bars, revenue display.

---

## Public Shop Page

**What is the Public Shop page?**
The customer-facing e-commerce storefront. Different URL patterns determine the mode.

**What are the view modes?**
Telegram / Ecommerce / Guest. The shop page has mode tabs allowing customers to choose.

**How does the shop header look?**
Banner carousel (ShopBanner), circular logo (clickable for fullscreen), cart button with item count badge.

**How does the product grid look?**
2-4 columns responsive. Product images with hover zoom. Stock badges (Out of Stock / Low / In Stock). Color swatches. Add to Cart / Buy Now buttons per product.

**How does the cart work?**
Slide-in drawer panel. Item list with qty controls (+/-/delete). Out-of-stock indicators. Cross-sell "You May Also Like" horizontal scroll. Subtotal display. Checkout button.

**How does checkout work?**
Multi-step: Sign In (Google or Telegram) > Contact Info form (fields per checkout config) > Payment method selection > Payment proof upload > Agreement checkboxes > Order placement. Order confirmation with animated checkmark, order ID, download invoice.

**What is the Product Detail modal?**
Full-screen modal. Image gallery with prev/next arrows and keyboard navigation. Color selector (swatches with images). Options selector (buttons). Add to cart with qty. Buy Now. Copy product link. Stock badge. Cross-sell section.

**What is the Search feature?**
Animated expand/collapse search bar with clear button.

**How do categories work?**
Horizontal scroll with arrow navigation and drag-to-scroll.

**How does sorting work?**
Sort menu: Price Low/High, Newest First.

**What is the Track Order feature?**
Modal where customers enter Order ID/Invoice/Receipt number to check status. Shows status with icon/color, order details, items list.

**What is the Shop Assistant chat?**
Chat panel where customers can message the shop. Visitor form (name, phone, email). Send photos. Message history with RichMessage support. Polls every 3s for new messages.

**What is the Customer Dashboard link?**
Profile menu with User Dashboard link and Sign Out. Customers can view their order history.

**What is in the footer?**
CrossMart logo (circular), "Powered by CrossMart" link (opens crossmart.shop in new tab), "Myanmar's First Cross-Platform Marketplace" tagline.

---

## Customer Dashboard

**What is the Customer Dashboard?**
Customer-facing dashboard where logged-in customers view orders, manage profile, and browse the shop.

**What tabs are available?**
Home / Shop / Newsfeed / Orders / Cart / Points / Profile (animated indicator).

**Home tab:**
Banners (auto-rotation, dot indicators, prev/next). Shop bio. Quick stats (orders/coupons/points). Quick action buttons. Popular products sidebar.

**Points tab:**
Balance card with gradient. "How Points Work" explanation. Points history (earn/redeem entries).

**Orders tab:**
Accordion-style order list with status badges (color-coded). Contact info section. Items list. Payment info. Download invoice/receipt.

**Cart tab:**
Items with qty controls (+/-). Out-of-stock checking. Checkout flow (payment selection, contact form, place order). Order confirmation.

**Profile tab:**
User card with photo. Contact form (name, phones add/remove, emails add/remove, telegram, viber, region/district/township selectors, address, notes). Save with states. Sign out.

**Chat panel:**
Register visitor. Load existing messages. Poll every 3s. RichMessage support. File upload. Copy message on long-press.

---

## Customer Login

**What is the Customer Login page?**
Login page for customers to access their dashboard. Shows shop profile picture and name.

**How can customers sign in?**
Two methods:
1. Continue with Google (redirects to main domain proxy for custom domains)
2. Continue with Telegram (shows QR code login modal with countdown timer)

**What happens after login?**
Auto-redirects to the customer dashboard page.

---

## Public QR Menu

**What is the Public QR Menu?**
Customer-facing menu page when scanning a QR code at a physical location.

**What modes are available?**
Table mode (take a table) or Token mode (get a queue number). Set in QR Menu admin settings.

**What is on the Welcome Screen?**
Shop logo, name, welcome message, mode selection cards (Take a Table / Get a Token) with spring animations.

**What happens after phone prompt?**
Enter phone number (+95 prefix, validation) or skip.

**What is on the main menu?**
Hero section with banner carousel (touch swipe, dot indicators), shop avatar, name, location/description/hours badges, social links. Welcome/announcement messages. Search bar. Categories horizontal scroll with emoji icons. Popular Picks horizontal scroll. Menu items in list or grid view (toggle).

**List view:**
Item image, badges, name, description, price, in-cart indicator, qty controls.

**Grid view:**
Item image with count badge, category tag, available/unavailable status, name, price, qty controls.

**How does ordering work?**
Add items to cart. View cart in bottom sheet. Proceed to checkout. Select payment method. Apply coupon (5 failed attempts = 60s lockout). Redeem points. Upload payment proof. Submit order. Get confirmation with order number and points earned.

**What are the order flow modes?**
Prepaid (pay before order confirmed), Postpaid (pay on delivery), Browse Only (view only, call to order by phone), Token + Browse (get queue token and browse).

---

## Web Panel

**What is the Web Panel page?**
Standalone signup and authentication flow at `/manage-web-panel`. Separate CSS-styled page.

**What are the signup steps?**
5 steps:
1. Bot Username input
2. Bot Code (6-digit from Telegram)
3. Email input
4. Email Code (6-digit with 60s resend countdown)
5. Password with strength meter (weak/medium/strong)

**Can I change my password?**
Yes. Email input, current/new/confirm password fields, strength bar, submit.

**How does Forgot Password work?**
Email input, code sent to Telegram, new password with confirm, submit. Success view with animated checkmark.

---

## AI Assistant

**What is the AI Assistant?**
An AI chat button (✨) in the top bar next to the refresh icon. Only available for shop admins (not customers). Helps answer questions about website features.

**How does the AI work?**
The superadmin writes a Guide Prompt in Settings > Admin tab. The AI uses ONLY this guide prompt as its context. It will NOT answer product questions, sales, or anything outside the guide. The AI responds in the same language the admin writes in.

**Does the AI remember conversation?**
Yes. Last 50 messages are stored in localStorage per bot. History persists across page reloads.

**What markdown format does the AI support?**
Bold, italic, lists, code blocks, and other markdown are rendered properly in the chat.

---

## Delivery Fees

**What is the Delivery Fee system?**
Two modes:
- Flat: Single delivery fee for all orders + free threshold (orders above X get free delivery)
- Zone: Different fees per region/district/township. CSV import/export supported. Free threshold per zone.

---

## Point & Rewards System

**What is the Points system?**
Customer loyalty program. Customers earn points on purchases. Points can be redeemed for discounts on future orders.

**How do customers earn points?**
Set earn rate: Every X currency spent = Y points earned.

**How do customers redeem points?**
Set redemption rate: X points = Y currency discount. Minimum redeemable points configurable.

**What is the Welcome Bonus?**
Free points awarded when a customer first signs up.

---

## Payment Methods

**What payment methods are supported?**
Bank transfers, mobile wallets, and Cash on Delivery. Each method can have: name, account name, account number, QR code image, notes/description.

---

## Channel Visibility

**What are the three channels?**
Telegram mode (buy via Telegram bot), Website mode (buy on the shop website), Guest mode (buy without login). Each product can be shown/hidden per channel.

**What happens when colors or options are added to a product?**
The product is automatically hidden from Telegram mode. Only available on Website and Guest modes.

---

## Shop Mode Buttons

**What are the Shop Mode Buttons?**
Buttons on the public shop page: Buy on Telegram / Buy on Website / Buy as a Guest. These can be reordered and shown/hidden in Settings. At least 1 must be active.

---

## Custom Domains

**How do custom domains work?**
Up to 3 custom domains per shop. Add the domain in Settings, then configure DNS A record to point to the server. Verify the domain. Enable/disable per domain. The shop page works on the custom domain with all modes.

**What is the DNS setup guide?**
Modal showing A record instructions with the server IP address.

---

## Export Data

**What data can be exported?**
From Dashboard: Orders, Products, Customers, Payments, Profit data as CSV. From Profit page: Product Breakdown and Sales Log as CSV. Date range and status filters available.
