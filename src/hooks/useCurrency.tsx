import { useCurrencyContext } from '@/contexts/CurrencyContext';

export interface Currency {
  id: string;
  symbol: string;
  code: string;
  name: string;
}

const defaultCurrency: Currency = {
  id: 'default',
  symbol: '₹',
  code: 'INR',
  name: 'Indian Rupee'
};

/**
 * Optimised useCurrency hook.
 * Reuses the single cached state from CurrencyProvider instead of making
 * redundant DB queries across 200+ components.
 */
export function useCurrency() {
  try {
    const context = useCurrencyContext();
    return {
      currency: context.currency || defaultCurrency,
      loading: context.loading,
      formatCurrency: context.formatCurrency,
      symbol: context.symbol || '₹',
      code: context.code || 'INR'
    };
  } catch {
    // Graceful fallback when rendered outside CurrencyProvider (e.g. tests)
    return {
      currency: defaultCurrency,
      loading: false,
      formatCurrency: (amount: number) => `₹${amount.toLocaleString()}`,
      symbol: '₹',
      code: 'INR'
    };
  }
}
