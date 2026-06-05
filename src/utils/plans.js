const PLAN_FEATURES = {
  basic: {
    ai_agent: false,
    ecommerce_website: false,
    custom_domain: false,
    change_order_button_name: false,
    new_order_email_notification: false,
    shop_banner: false,
    watermark_removed: false,
  },
  standard: {
    ai_agent: 'own_api',
    ecommerce_website: true,
    custom_domain: false,
    change_order_button_name: true,
    new_order_email_notification: false,
    shop_banner: false,
    watermark_removed: true,
  },
  pro: {
    ai_agent: 'api_provided',
    ecommerce_website: 'multi_platform',
    custom_domain: true,
    change_order_button_name: true,
    new_order_email_notification: false,
    shop_banner: true,
    watermark_removed: true,
  },
  business: {
    ai_agent: 'api_provided',
    ecommerce_website: 'multi_platform',
    custom_domain: 'up_to_3',
    change_order_button_name: true,
    new_order_email_notification: true,
    shop_banner: true,
    watermark_removed: true,
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
