import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getBot } from '../api/bots';
import { useSelectedBot } from '../hooks/useSelectedBot';
import { createPlanOrder, validateSubscriptionDiscount } from '../api/public';
import { useToastStore } from '../store/toastStore';
import LoadingSkeleton from '../components/shared/LoadingSkeleton';
import {
  ShieldCheck,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  Zap,
  Star,
  Crown,
  Key,
  Loader2,
  X,
  Smartphone,
  CreditCard,
  Timer,
  AlertTriangle, Percent, Tag,
} from 'lucide-react';
import { differenceInDays } from 'date-fns';
import { myanmarFormat } from '../utils/date';
import { formatPrice } from '../utils/formatPrice';
import { motion, AnimatePresence } from 'motion/react';
import { QRCodeSVG } from 'qrcode.react';

const PLAN_RANK = { free: 0, basic: 1, standard: 2, pro: 3, business: 4 };

export default function Subscription() {
  const { selectedBotId, selectedBot } = useSelectedBot();
  const queryClient = useQueryClient();
  const { addToast } = useToastStore();
  const [planBilling, setPlanBilling] = useState({});
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderData, setOrderData] = useState(null);
  const [showQr, setShowQr] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(300);
  const [showCloseWarning, setShowCloseWarning] = useState(false);
  const [showDiscountForm, setShowDiscountForm] = useState(false);
  const [pendingPlanKey, setPendingPlanKey] = useState(null);
  const [discountCodeInput, setDiscountCodeInput] = useState('');
  const [discountValidating, setDiscountValidating] = useState(false);
  const [appliedDiscount, setAppliedDiscount] = useState(null);
  const [cooldown, setCooldown] = useState(0);
  const cooldownRef = useRef(null);
  const qrRef = useRef(null);
  const failureCountRef = useRef(0);
  const pollRef = useRef(null);
  const timerRef = useRef(null);
  const pendingPlanRef = useRef(null);

  const { data: bot, isLoading } = useQuery({
    queryKey: ['bots', selectedBotId],
    queryFn: () => getBot(selectedBotId),
    enabled: !!selectedBotId,
  });

  const plans = [
    {
      key: 'free',
      name: 'Free',
      icon: Zap,
      color: 'text-gray-400',
      bg: 'bg-gray-50',
      border: 'border-gray-200',
      price: 'Free',
      yearlyPrice: 'Free',
      monthlyPrice: 'Free',
      features: [
        'Categories: 1', 'Products: 5', 'Admin: Owner only',
        'Update Bot Info: Welcome Message Only', 'Update Photo: Main menu photo only',
        'Custom Commands: 5', 'Payment Methods: 1', 'Broadcasts: 4/mo', 'Total Bots: 2',
        'AI Agent: No', 'E-commerce Website: No', 'Admin Panel: Telegram Panel',
        'Change Order Button Name: No', 'Shop Banner: No', 'New Order Email Notification: No',
        'Watermark: Powered by @ecommercemyanmar', 'QR Menu System: ❌', 'Staff Accounts: ❌'
      ],
      extras: [],
    },
    {
      key: 'basic',
      name: 'Basic',
      icon: Star,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      yearlyPrice: '150,000 MMK/yr',
      monthlyPrice: '14,000 MMK/month',
      yearlyRaw: 150000,
      monthlyRaw: 14000,
      features: [
        'Yearly Plan: 150,000 MMK/year', 'Monthly Plan: 14,000 MMK/monthnth',
        'Categories: 7', 'Products: 30', 'Add Admin: up to 2',
        'Update Bot Info: Welcome, About, Support, Cart',
        'Update Photo: Main Menu, Shopping, Cart, Support',
        'Automation: 10', 'Custom Commands: 25', 'Payment Method: 3',
        'Broadcast to Users: 10/mo', 'Total Bots: 3',
        'AI Agent: ❌', 'E-commerce Website: ❌', 'Custom Domain: ❌',
        'Change Order Button Name: ❌', 'New Order Email Notification: ❌',
        'Watermark: ❌', 'QR Menu System: ❌', 'Staff Accounts: ❌'
      ],
    },
    {
      key: 'standard',
      name: 'Standard',
      icon: Crown,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      yearlyPrice: '250,000 MMK/yr',
      monthlyPrice: '23,000 MMK/month',
      yearlyRaw: 250000,
      monthlyRaw: 23000,
      inherited: 'Basic',
      features: [
        'Categories: up to 15', 'Products: up to 70', 'Admin: Up to 3',
        'Update Bot Info: All', 'Update Photo: All',
        'Automation: 20', 'Custom Commands: 25', 'Payment Methods: 5',
        'Broadcasts: 25/mo', 'Ads Removed: Yes', 'Total Bots: 7',
        'AI Agent: Yes but with your own API', 'E-commerce Website: Yes',
        'Admin Panel: Website Dashboard + Telegram',
        'Change Order Button Name: Yes', 'Watermark: Removed ✅',
        'QR Menu System: ❌', 'Staff Accounts: ✅'
      ],
    },
    {
      key: 'pro',
      name: 'Pro',
      icon: Key,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      border: 'border-purple-200',
      yearlyPrice: '350,000 MMK/yr',
      monthlyPrice: '32,500 MMK/month',
      yearlyRaw: 350000,
      monthlyRaw: 32500,
      inherited: 'Standard',
      features: [
        'Categories: up to 35', 'Products: up to 150', 'Admin: Up to 10',
        'Automation: 50', 'Custom Commands: 50', 'Payment Methods: 10',
        'Broadcasts: 75/mo', 'Total Bots: 25',
        'Free API: ✅', 'Help Setting Up Product: ✅',
        'AI Agent: Yes (API Provided)',
        'E-commerce Website: Yes (Multi-Platform)',
        'Custom Domain: Yes (1)', 'E-commerce Shop Banner: Yes',
        'UI Templates: ✅', 'Custom Printer Presets: ✅',
        'Multi-Currency: Yes (180+ currencies)', 'QR Menu System: ✅', 'Staff Accounts: ✅'
      ],
    },
    {
      key: 'business',
      name: 'Business',
      icon: Crown,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      yearlyPrice: '600,000 MMK/yr',
      monthlyPrice: '55,000 MMK/month',
      yearlyRaw: 600000,
      monthlyRaw: 55000,
      inherited: 'Pro',
      features: [
        'Categories: Unlimited', 'Products: Unlimited', 'Admin: Unlimited',
        'Automation: Unlimited', 'Custom Commands: Unlimited',
        'Payment Methods: Unlimited', 'Broadcasts: Unlimited', 'Total Bots: 50',
        'Custom Domain: Yes (up to 3)', 'Multi-Currency: Yes (180+ currencies)',
        'UI Templates: Unlimited', 'Custom Printer Presets: ✅',
        'New Order Email Notification: Yes',
        'QR Menu System: ✅', 'Staff Accounts: ✅', 'Feature Request: ✅'
      ],
    }
  ];

  const currentPlan = bot?.plan_name?.toLowerCase() || 'free';
  const expiryDate = bot?.plan_expiry ? new Date(bot.plan_expiry) : null;
  const hasExpiry = !!expiryDate;
  const daysRemaining = expiryDate ? differenceInDays(expiryDate, new Date()) : 0;
  const isSubActive = currentPlan === 'free' || !hasExpiry || daysRemaining > 0;
  const currentRank = PLAN_RANK[currentPlan] || 0;

  const handleUpgradeClick = (planKey) => {
    if (cooldown > 0) return;
    if (!selectedBot) { addToast('No bot selected. Please select a bot from the admin panel first.', 'error'); return; }
    if (!bot && !selectedBot) { addToast('Bot data not loaded', 'error'); return; }
    setPendingPlanKey(planKey);
    pendingPlanRef.current = planKey;
    setDiscountCodeInput('');
    setDiscountValidating(false);
    setShowDiscountForm(true);
  };

  const handleApplyDiscount = async () => {
    const code = discountCodeInput.trim().toUpperCase();
    if (!code) return addToast('Enter a discount code', 'error');
    const pk = pendingPlanRef.current;
    if (!pk) return;
    setDiscountValidating(true);
    try {
      const result = await validateSubscriptionDiscount(code);
      setAppliedDiscount(result);
      setShowDiscountForm(false);
      setDiscountCodeInput(code);
      handleUpgrade(pk, code);
    } catch (err) {
      addToast(err.response?.data?.detail || 'Invalid discount code', 'error');
    } finally {
      setDiscountValidating(false);
    }
  };

  const handleSkipDiscount = () => {
    const pk = pendingPlanRef.current;
    if (!pk) return;
    setShowDiscountForm(false);
    setAppliedDiscount(null);
    setDiscountCodeInput('');
    handleUpgrade(pk);
  };

  const handleUpgrade = async (planKey, discountCode) => {
    setOrderLoading(true);
    setOrderData(null);
    setShowQr(true);
    setTimeRemaining(300);
    setAppliedDiscount(null);
    const plan = plans.find(p => p.key === planKey);
    const planType = planBilling[planKey] !== false ? 'yearly' : 'monthly';

    try {
      const result = await createPlanOrder(selectedBotId, planKey, planType, discountCode);
      failureCountRef.current = 0;
      if (result.free) {
        setOrderData({
          ...result,
          planName: plan.name,
          planType,
          amountFormatted: formatPrice(0, 'MMK'),
          originalAmountFormatted: formatPrice(result.original_amount || 0, 'MMK'),
          discountPercent: 100,
        });
        if (discountCode) {
          setAppliedDiscount({ discount_percent: 100 });
        }
        setPaymentSuccess(true);
        setTimeout(() => {
          setShowQr(false);
          setPaymentSuccess(false);
          setOrderData(null);
          queryClient.invalidateQueries({ queryKey: ['bots', selectedBotId] });
        }, 5000);
        return;
      }
      const originalPrice = planBilling[planKey] !== false ? plan.yearlyPrice : plan.monthlyPrice;
      setOrderData({
        ...result,
        planName: plan.name,
        planType,
        amountFormatted: result.original_amount
          ? formatPrice(result.amount || 0, 'MMK')
          : originalPrice,
        originalAmountFormatted: result.discount_percent > 0
          ? formatPrice(result.original_amount || 0, 'MMK')
          : null,
        discountPercent: result.discount_percent || 0,
      });
      if (discountCode) {
        setAppliedDiscount({ discount_percent: result.discount_percent });
      }
    } catch (err) {
      addToast(err.response?.data?.detail || 'Failed to create order', 'error');
      setShowQr(false);
      // Use backend's wait time on 429, otherwise exponential backoff
      if (err.response?.status === 429) {
        const match = (err.response?.data?.detail || '').match(/(\d+)/);
        setCooldown(match ? parseInt(match[1]) : 30);
      } else {
        setCooldown(Math.min(30 * Math.pow(2, failureCountRef.current), 1800));
      }
      failureCountRef.current += 1;
    } finally {
      setOrderLoading(false);
    }
  };

  useEffect(() => {
    if (!showQr || !orderData || orderLoading || paymentSuccess) return;

    pollRef.current = setInterval(async () => {
      try {
        const fresh = await getBot(selectedBotId);
        if (fresh?.plan_name?.toLowerCase() === orderData.planName?.toLowerCase()) {
          clearInterval(pollRef.current);
          clearInterval(timerRef.current);
          setPaymentSuccess(true);
          setTimeout(() => {
            setShowQr(false);
            setPaymentSuccess(false);
            setOrderData(null);
            queryClient.invalidateQueries({ queryKey: ['bots', selectedBotId] });
          }, 5000);
        }
      } catch {
        // polling silently retries
      }
    }, 1000);

    return () => {
      clearInterval(pollRef.current);
      clearInterval(timerRef.current);
    };
  }, [showQr, orderData, orderLoading, paymentSuccess]);

  // Countdown timer
  useEffect(() => {
    if (!showQr || paymentSuccess || orderLoading) return;
    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [showQr, paymentSuccess, orderLoading]);

  // Cooldown timer after closing QR
  useEffect(() => {
    if (cooldown <= 0) return;
    cooldownRef.current = setInterval(() => {
      setCooldown(prev => {
        if (prev <= 1) { clearInterval(cooldownRef.current); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(cooldownRef.current);
  }, [cooldown > 0]);

  // Auto-close when timer hits 0
  useEffect(() => {
    if (timeRemaining <= 0 && showQr && !paymentSuccess) {
      closeQrForce();
    }
  }, [timeRemaining]);

  const closeQrForce = () => {
    clearInterval(pollRef.current);
    clearInterval(timerRef.current);
    setShowQr(false);
    setPaymentSuccess(false);
    setOrderData(null);
    setShowCloseWarning(false);
    failureCountRef.current = 0;
    setCooldown(30);
  };

  const closeQr = () => {
    if (showCloseWarning) {
      closeQrForce();
      return;
    }
    setShowCloseWarning(true);
  };

  const cancelClose = () => {
    setShowCloseWarning(false);
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const downloadQr = () => {
    const svg = qrRef.current?.querySelector('svg');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    canvas.width = 360;
    canvas.height = 360;
    const ctx = canvas.getContext('2d');
    const img = new window.Image();
    img.onload = () => {
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, 360, 360);
      const a = document.createElement('a');
      a.download = 'payment-qr.png';
      a.href = canvas.toDataURL('image/png');
      a.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  return (
    <div className="space-y-5 sm:space-y-8 pb-10">
      <div className="flex items-center justify-between">
        <h1 className="text-lg sm:text-2xl lg:text-3xl font-bold text-gray-900">Subscription</h1>
      </div>

      {isLoading ? (
        <LoadingSkeleton className="h-48" />
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col sm:flex-row items-center gap-6 sm:gap-8"
        >
          <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-3xl flex items-center justify-center flex-shrink-0 shadow-sm ${
            currentPlan === 'business' ? 'bg-amber-50 text-amber-600' :
            currentPlan === 'pro' ? 'bg-purple-50 text-purple-600' :
            currentPlan === 'standard' ? 'bg-emerald-50 text-emerald-600' :
            currentPlan === 'basic' ? 'bg-blue-50 text-blue-600' :
            'bg-gray-50 text-gray-400'
          }`}>
            {currentPlan === 'business' ? <Key className="w-10 h-10 sm:w-12 sm:h-12" /> :
             currentPlan === 'pro' ? <Crown className="w-10 h-10 sm:w-12 sm:h-12" /> :
             currentPlan === 'standard' ? <Crown className="w-10 h-10 sm:w-12 sm:h-12" /> :
             currentPlan === 'basic' ? <Star className="w-10 h-10 sm:w-12 sm:h-12" /> :
             <Zap className="w-10 h-10 sm:w-12 sm:h-12" />}
          </div>

          <div className="flex-1 text-center sm:text-left min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 capitalize truncate">{plans.find(p => p.key === currentPlan)?.name || 'Free'} Plan</h2>
              <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider self-center sm:self-auto ${
                isSubActive ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'
              }`}>
                {isSubActive ? 'Active' : 'Expired'}
              </span>
            </div>
            <p className="text-gray-500 text-sm">
              {currentPlan === 'free'
                ? 'Never expires'
                : expiryDate
                  ? `Expires on ${myanmarFormat(expiryDate, 'MMM d, yyyy')}`
                  : 'Active — no expiry date set'}
            </p>
          </div>

          <div className="bg-gray-50 px-6 py-4 rounded-2xl text-center border border-gray-100 w-full sm:w-auto">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Days Remaining</p>
            <p className="text-3xl font-bold text-indigo-600">{hasExpiry ? Math.max(0, daysRemaining) : '—'}</p>
          </div>
        </motion.div>
      )}

      {/* Plan Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
        {plans.filter(p => p.key !== 'free').map((plan) => {
          const isYearly = planBilling[plan.key] !== false;
          const price = isYearly ? plan.yearlyPrice : plan.monthlyPrice;
          const planRank = PLAN_RANK[plan.key];
          const isCurrent = currentPlan === plan.key;
          const isDowngrade = planRank < currentRank;
          const canUpgrade = planRank > currentRank;
          return (
            <div key={plan.key} className={`bg-white p-6 rounded-3xl shadow-sm border transition-all flex flex-col ${isCurrent ? 'border-indigo-600 ring-4 ring-indigo-50' : 'border-gray-100'}`}>
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 rounded-2xl ${plan.bg} ${plan.color} flex items-center justify-center shadow-sm`}>
                  <plan.icon className="w-6 h-6" />
                </div>
                <button
                  onClick={() => setPlanBilling(prev => ({ ...prev, [plan.key]: !isYearly }))}
                  className="relative w-20 h-8 rounded-full bg-gray-100 border border-gray-200 flex items-center p-0.5 transition-colors"
                >
                  <div className={`absolute w-[38px] h-7 rounded-full bg-white shadow-sm border border-gray-100 transition-all duration-200 ${isYearly ? 'translate-x-[38px]' : 'translate-x-0'}`} />
                  <span className={`relative z-10 w-[38px] text-[10px] font-bold text-center transition-colors ${!isYearly ? 'text-indigo-600' : 'text-gray-400'}`}>Mo</span>
                  <span className={`relative z-10 w-[38px] text-[10px] font-bold text-center transition-colors ${isYearly ? 'text-indigo-600' : 'text-gray-400'}`}>Yr</span>
                </button>
              </div>
              <h3 className="text-xl font-bold text-gray-900">{plan.name} Plan</h3>
              <p className="text-sm font-bold text-indigo-600 mt-1 mb-4">{price}</p>
              <ul className="space-y-2 flex-1">
                {plan.inherited && (
                  <li className="text-xs text-gray-500 italic mb-3 border-b border-gray-100 pb-2">
                    Everything in {plan.inherited}, plus:
                  </li>
                )}
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
              <div className="mt-5">
                {isCurrent ? (
                  <span className="block w-full py-2.5 text-center text-xs font-bold text-indigo-600 bg-indigo-50 rounded-xl border border-indigo-100">
                    Current Plan
                  </span>
                ) : canUpgrade ? (
                  <button
                    onClick={() => handleUpgradeClick(plan.key)}
                    disabled={orderLoading || cooldown > 0}
                    className="w-full py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 text-xs"
                  >
                    {cooldown > 0 ? (
                      <><Timer className="w-3 h-3" /> Wait {cooldown}s</>
                    ) : (
                      'Upgrade'
                    )}
                  </button>
                ) : (
                  <span className="block w-full py-2.5 text-center text-xs font-bold text-gray-400 bg-gray-50 rounded-xl border border-gray-100">
                    Downgrade
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Discount Code Modal */}
      <AnimatePresence>
        {showDiscountForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-sm relative overflow-hidden"
            >
              <button
                onClick={() => setShowDiscountForm(false)}
                className="absolute top-3 right-3 w-7 h-7 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors z-10"
              >
                <X className="w-3.5 h-3.5 text-white" />
              </button>
              <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-6 text-center">
                <div className="w-12 h-12 mx-auto mb-3 bg-white/20 rounded-2xl flex items-center justify-center">
                  <Tag className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-bold text-white">Have a Discount Code?</h3>
                <p className="text-indigo-200 text-sm mt-1">
                  {pendingPlanKey && `${plans.find(p => p.key === pendingPlanKey)?.name} Plan`}
                </p>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1.5 block">Discount Code</label>
                  <input
                    type="text"
                    value={discountCodeInput}
                    onChange={e => setDiscountCodeInput(e.target.value.toUpperCase())}
                    placeholder="Enter your code"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 uppercase tracking-wider font-bold"
                    autoFocus
                    onKeyDown={e => { if (e.key === 'Enter') handleApplyDiscount(); }}
                  />
                </div>
                {discountValidating && (
                  <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                    <Loader2 className="w-4 h-4 animate-spin" /> Validating...
                  </div>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={handleApplyDiscount}
                    disabled={discountValidating || !discountCodeInput.trim()}
                    className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all text-sm disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {discountValidating ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    Apply
                  </button>
                  <button
                    onClick={handleSkipDiscount}
                    disabled={discountValidating}
                    className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-all text-sm disabled:opacity-50"
                  >
                    Skip
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* QR Code Modal */}
      <AnimatePresence>
        {showQr && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pt-safe pb-safe bg-black/60 backdrop-blur-sm"
            onClick={() => { if (!showCloseWarning) closeQr(); }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-[300px] sm:max-w-sm relative max-h-[85dvh] overflow-y-auto"
            >
              {/* Header */}
              <div className="relative bg-gradient-to-br from-indigo-600 to-purple-700 p-4 sm:p-6 text-center">
                <button
                  onClick={closeQr}
                  className="absolute top-2 right-2 w-7 h-7 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
                >
                  <X className="w-3.5 h-3.5 text-white" />
                </button>
                {paymentSuccess ? (
                  <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-2 bg-emerald-400 rounded-2xl flex items-center justify-center">
                    <CheckCircle2 className="w-7 h-7 sm:w-9 sm:h-9 text-white" />
                  </div>
                ) : (
                  <div className="w-10 h-10 sm:w-14 sm:h-14 mx-auto mb-2 bg-white/20 rounded-2xl flex items-center justify-center">
                    <CreditCard className="w-5 h-5 sm:w-7 sm:h-7 text-white" />
                  </div>
                )}
                {paymentSuccess ? (
                  <>
                    <h3 className="text-sm sm:text-lg font-bold text-white">Payment Successful!</h3>
                    <p className="text-indigo-200 text-xs sm:text-sm mt-1">
                      Your plan has been upgraded
                    </p>
                  </>
                ) : (
                  <>
                    <h3 className="text-sm sm:text-lg font-bold text-white">Scan to Pay</h3>
                    <p className="text-indigo-200 text-xs sm:text-sm mt-1">
                      Pay with your preferred Mobile Wallet
                    </p>
                  </>
                )}
              </div>

              {/* QR Area */}
              <div className="p-4 sm:p-6 pb-safe">
                {paymentSuccess ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    onClick={() => closeQrForce()}
                    className="flex flex-col items-center justify-center py-4 gap-2 cursor-pointer"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: [0, 1.2, 1] }}
                      transition={{ duration: 0.6, ease: 'easeOut' }}
                      className="w-14 h-14 sm:w-20 sm:h-20 rounded-full bg-emerald-100 flex items-center justify-center"
                    >
                      <CheckCircle2 className="w-7 h-7 sm:w-10 sm:h-10 text-emerald-500" />
                    </motion.div>
                    <p className="text-sm sm:text-lg font-bold text-gray-900">{orderData?.planName} Plan Activated</p>
                    <p className="text-xs sm:text-sm text-gray-400">Your plan has been upgraded successfully!</p>
                    <p className="text-[11px] text-gray-300">Closing automatically...</p>
                  </motion.div>
                ) : orderLoading ? (
                  <div className="flex flex-col items-center justify-center py-8 gap-2">
                    <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                    <p className="text-xs text-gray-500 font-medium">Creating payment...</p>
                  </div>
                ) : orderData?.qr ? (
                  <>
                    {/* Timer */}
                    {!paymentSuccess && (
                      <div className="flex items-center justify-center gap-1.5 mb-3">
                        <Timer className={`w-3 h-3 ${timeRemaining <= 60 ? 'text-red-500' : 'text-gray-400'}`} />
                        <span className={`text-xs font-bold tabular-nums ${timeRemaining <= 60 ? 'text-red-500' : 'text-gray-500'}`}>
                          {formatTime(timeRemaining)}
                        </span>
                      </div>
                    )}
                    <div ref={qrRef} className="bg-white rounded-2xl border-2 border-gray-100 shadow-sm mb-3">
                      <div className="p-2 sm:p-3 flex items-center justify-center">
                        <QRCodeSVG value={orderData.qr} size={180} level="M" includeMargin />
                      </div>
                      <div className="flex items-center justify-center gap-1.5 pt-2 pb-2 border-t border-gray-50">
                        <img src="/mmqr-logo.png" alt="MMQR" className="w-3 h-3 object-contain" />
                        <span className="text-[9px] text-gray-400">Payment powered by Myan Myan Pay MMQR</span>
                      </div>
                    </div>
                    <button
                      onClick={downloadQr}
                      className="mb-3 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-xl transition-colors"
                    >
                      Download QR
                    </button>
                    <div className="text-center space-y-1">
                      <p className="text-sm sm:text-lg font-bold text-gray-900">{orderData.planName} Plan</p>
                      {orderData.discountPercent > 0 ? (
                        <div>
                          <p className="text-sm text-gray-400 line-through">{orderData.originalAmountFormatted}</p>
                          <p className="text-lg sm:text-2xl font-bold text-indigo-600">{orderData.amountFormatted}</p>
                          <span className="inline-block mt-1 px-2 py-0.5 bg-emerald-50 border border-emerald-100 text-emerald-600 text-[10px] font-bold rounded-full">
                            {orderData.discountPercent}% OFF
                          </span>
                        </div>
                      ) : (
                        <p className="text-lg sm:text-2xl font-bold text-indigo-600">{orderData.amountFormatted}</p>
                      )}
                    </div>
                    <div className="mt-3 p-2.5 bg-amber-50 border border-amber-100 rounded-xl text-center">
                      <p className="text-[11px] text-amber-700 font-medium">
                        Proceed within 5 minutes. No Screenshot need.
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 gap-2">
                    <XCircle className="w-8 h-8 text-red-400" />
                    <p className="text-xs text-gray-500 font-medium">Failed to create payment</p>
                    <button
                      onClick={closeQrForce}
                      className="px-4 py-1.5 bg-gray-100 text-gray-600 font-bold rounded-xl text-xs"
                    >
                      Close
                    </button>
                  </div>
                )}
              </div>

              {/* Close Warning Overlay */}
              <AnimatePresence>
                {showCloseWarning && !paymentSuccess && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-white/95 backdrop-blur-sm rounded-3xl flex items-center justify-center p-4"
                  >
                    <motion.div
                      initial={{ scale: 0.9 }}
                      animate={{ scale: 1 }}
                      className="text-center"
                    >
                      <div className="w-10 h-10 mx-auto mb-2 bg-rose-50 rounded-xl flex items-center justify-center">
                        <AlertTriangle className="w-5 h-5 text-rose-500" />
                      </div>
                      <h3 className="text-sm font-bold text-gray-900 mb-2">Warning</h3>
                      <p className="text-[11px] text-gray-600 mb-4 leading-relaxed">
                        If you close this qr code, dont transfer to this qr code. to proceed again, recreate order by clicking Upgrade button
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={closeQrForce}
                          className="flex-1 px-3 py-2.5 bg-rose-500 text-white font-bold rounded-xl hover:bg-rose-600 transition-all text-[11px]"
                        >
                          Close
                        </button>
                        <button
                          onClick={cancelClose}
                          className="flex-1 px-3 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-all text-[11px]"
                        >
                          Keep Waiting
                        </button>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
