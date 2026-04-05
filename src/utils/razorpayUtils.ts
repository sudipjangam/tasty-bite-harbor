/**
 * Razorpay Checkout Utilities
 * Handles script loading, checkout modal, and TypeScript types
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

export interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: RazorpayResponse) => void;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  notes?: Record<string, string>;
  theme?: {
    color?: string;
  };
  modal?: {
    ondismiss?: () => void;
    escape?: boolean;
    backdropclose?: boolean;
  };
}

export interface RazorpayInstance {
  open: () => void;
  close: () => void;
  on: (event: string, callback: (response: any) => void) => void;
}

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

export interface CreateOrderResponse {
  success: boolean;
  order: {
    id: string;
    amount: number;
    currency: string;
    receipt: string;
  };
  key_id: string;
  prefill: {
    name: string;
    email: string;
    contact: string;
  };
  plan: {
    name: string;
    price: string;
    interval: string;
  };
}

export interface VerifyPaymentResponse {
  success: boolean;
  message: string;
  subscription: {
    id: string;
    status: string;
    plan_name: string;
    current_period_start: string;
    current_period_end: string;
    amount_paid: number;
    payment_method: string;
  };
}

// ─── Script Loader ──────────────────────────────────────────────────────────

const RAZORPAY_SCRIPT_URL = 'https://checkout.razorpay.com/v1/checkout.js';

let scriptLoadPromise: Promise<void> | null = null;

/**
 * Dynamically loads the Razorpay checkout script.
 * Returns immediately if already loaded. Deduplicates concurrent calls.
 */
export const loadRazorpayScript = (): Promise<void> => {
  // Already loaded
  if (window.Razorpay) {
    return Promise.resolve();
  }

  // Already loading — return existing promise
  if (scriptLoadPromise) {
    return scriptLoadPromise;
  }

  scriptLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = RAZORPAY_SCRIPT_URL;
    script.async = true;

    script.onload = () => {
      console.log('[Razorpay] Checkout script loaded');
      resolve();
    };

    script.onerror = () => {
      scriptLoadPromise = null; // Allow retry
      reject(new Error('Failed to load Razorpay checkout script'));
    };

    document.body.appendChild(script);
  });

  return scriptLoadPromise;
};

// ─── Checkout Opener ────────────────────────────────────────────────────────

/**
 * Opens the Razorpay checkout modal with the given options.
 * Automatically loads the script if not already loaded.
 */
export const openRazorpayCheckout = async (
  options: RazorpayOptions
): Promise<RazorpayInstance> => {
  await loadRazorpayScript();

  if (!window.Razorpay) {
    throw new Error('Razorpay SDK not available after script load');
  }

  const rzp = new window.Razorpay(options);

  // Handle payment failure event
  rzp.on('payment.failed', (response: any) => {
    console.error('[Razorpay] Payment failed:', response.error);
  });

  rzp.open();
  return rzp;
};

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Format price for display (e.g., "999" → "₹999", "4999" → "₹4,999")
 */
export const formatPrice = (price: string | number): string => {
  const num = typeof price === 'string' ? parseFloat(price) : price;
  if (isNaN(num) || num === 0) return 'Free';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
};

/**
 * Format billing interval for display
 */
export const formatInterval = (interval: string): string => {
  switch (interval) {
    case 'monthly': return 'month';
    case 'quarterly': return 'quarter';
    case 'half_yearly': return '6 months';
    case 'yearly': return 'year';
    default: return interval;
  }
};

/**
 * Calculate days remaining in subscription period
 */
export const getDaysRemaining = (endDate: string): number => {
  const end = new Date(endDate);
  const now = new Date();
  const diff = end.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
};

/**
 * Check if subscription is expiring soon (within 7 days)
 */
export const isExpiringSoon = (endDate: string): boolean => {
  return getDaysRemaining(endDate) <= 7 && getDaysRemaining(endDate) > 0;
};
