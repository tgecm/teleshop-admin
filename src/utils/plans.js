const PLAN_LIMITS = {
  free:     { products: 5, categories: 1, payment_methods: 1, custom_domains: 0 },
  basic:    { products: 30, categories: 7, payment_methods: 3, custom_domains: 0 },
  standard: { products: 70, categories: 15, payment_methods: 5, custom_domains: 0 },
  pro:      { products: 150, categories: 35, payment_methods: 10, custom_domains: 1 },
  business: { products: Infinity, categories: Infinity, payment_methods: Infinity, custom_domains: 3 },
};

export function getPlanLimit(planName, type) {
  const plan = planName?.toLowerCase() || 'free';
  return PLAN_LIMITS[plan]?.[type] ?? Infinity;
}

const PLAN_FEATURES = {
  basic: {
    ai_agent: false,
    ecommerce_website: false,
    custom_domain: false,
    change_order_button_name: false,
    new_order_email_notification: false,
    shop_banner: false,
    watermark_removed: false,
    qr_menu: false,
    staff_accounts: false,
    admin_template: false,
  },
  standard: {
    ai_agent: 'own_api',
    ecommerce_website: true,
    custom_domain: false,
    change_order_button_name: true,
    new_order_email_notification: false,
    shop_banner: false,
    watermark_removed: true,
    qr_menu: false,
    staff_accounts: true,
    admin_template: false,
  },
  pro: {
    ai_agent: 'api_provided',
    ecommerce_website: 'multi_platform',
    custom_domain: true,
    change_order_button_name: true,
    new_order_email_notification: false,
    shop_banner: true,
    watermark_removed: true,
    qr_menu: true,
    staff_accounts: true,
    admin_template: 'limited',
  },
  business: {
    ai_agent: 'api_provided',
    ecommerce_website: 'multi_platform',
    custom_domain: 'up_to_3',
    change_order_button_name: true,
    new_order_email_notification: true,
    shop_banner: true,
    watermark_removed: true,
    qr_menu: true,
    staff_accounts: true,
    admin_template: true,
  },
};

export function isFeatureAllowed(planName, feature) {
  const plan = planName?.toLowerCase() || 'free';
  const features = PLAN_FEATURES[plan];
  if (!features) return false;
  return !!features[feature];
}

export function requireFeature(planName, feature, addToast) {
  if (!isFeatureAllowed(planName, feature)) {
    addToast("You're not allowed to use this feature, please upgrade", 'error');
    return false;
  }
  return true;
}
