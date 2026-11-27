import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useRestaurantId } from '@/hooks/useRestaurantId';

interface Currency {
  id: string;
  symbol: string;
  code: string;
  name: string;
}

interface CurrencyContextType {
  currency: Currency | null;
  loading: boolean;
  symbol: string;
  code: string;
  formatCurrency: (amount: number) => string;
  formatCurrencyCompact: (amount: number) => string;
  refreshCurrency: () => Promise<void>;
}

const defaultCurrency: Currency = {
  id: 'default',
  symbol: '₹',
  code: 'INR',
  name: 'Indian Rupee'
};

const CurrencyContext = createContext<CurrencyContextType | null>(null);

export const useCurrencyContext = () => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrencyContext must be used within a CurrencyProvider');
  }
  return context;
};

export const useOptionalCurrencyContext = () => {
  return useContext(CurrencyContext);
};

const refreshListeners = new Set<(restaurantId?: string | null) => void>();

export const invalidateCurrencyCache = (restaurantId?: string | null) => {
  if (!restaurantId) return;
  try {
    sessionStorage.removeItem(`tbh_currency_${restaurantId}`);
  } catch {}
  refreshListeners.forEach((listener) => {
    try {
      listener(restaurantId);
    } catch {}
  });
  // Cross-tab synchronization via localStorage storage event
  try {
    localStorage.setItem('tbh_currency_invalidate_ts', `${restaurantId}:${Date.now()}`);
  } catch {}
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('tbh:currency-invalidated', { detail: { restaurantId } }),
    );
  }
};

interface CurrencyProviderProps {
  children: ReactNode;
}

export const CurrencyProvider: React.FC<CurrencyProviderProps> = ({ children }) => {
  const { restaurantId } = useRestaurantId();
  const restaurantIdRef = React.useRef(restaurantId);
  const prevRestaurantIdRef = React.useRef<string | null | undefined>(restaurantId);
  restaurantIdRef.current = restaurantId;

  const [currency, setCurrency] = useState<Currency | null>(null);
  const [loading, setLoading] = useState(true);
  const activeRequestId = React.useRef(0);

  const loadCurrency = async (forceRefresh = false) => {
    const targetRestaurantId = restaurantId;
    const reqId = ++activeRequestId.current;

    if (!targetRestaurantId) {
      if (reqId === activeRequestId.current) {
        setCurrency(defaultCurrency);
        setLoading(false);
      }
      return;
    }

    const cacheKey = `tbh_currency_${targetRestaurantId}`;
    let hasCachedCurrency = false;
    if (!forceRefresh) {
      try {
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) {
          hasCachedCurrency = true;
          if (reqId === activeRequestId.current && targetRestaurantId === restaurantIdRef.current) {
            setCurrency(JSON.parse(cached));
            setLoading(false);
          }
          // Do not return early: revalidate in background (stale-while-revalidate)
        }
      } catch {
        // Ignore storage errors
      }
    }
    if (!hasCachedCurrency) {
      setLoading(true);
    }

    try {
      // 1. Fetch configured currency_id from restaurant_settings
      const { data: settings, error: settingsError } = await supabase
        .from('restaurant_settings')
        .select('currency_id')
        .eq('restaurant_id', targetRestaurantId)
        .maybeSingle();

      if (reqId !== activeRequestId.current || targetRestaurantId !== restaurantIdRef.current) return;

      if (settingsError) {
        console.error('Error loading restaurant settings currency:', settingsError);
        return;
      }

      if (!settings?.currency_id) {
        setCurrency(defaultCurrency);
        try {
          sessionStorage.setItem(cacheKey, JSON.stringify(defaultCurrency));
        } catch {}
        return;
      }

      // 2. Fetch currency details from currencies table
      const { data: currencyData, error: currencyError } = await supabase
        .from('currencies')
        .select('id, symbol, code, name')
        .eq('id', settings.currency_id)
        .maybeSingle();

      if (reqId !== activeRequestId.current || targetRestaurantId !== restaurantIdRef.current) return;

      if (currencyError) {
        console.error('Error loading currency row:', currencyError);
        return;
      }

      const fetchedCurrency: Currency = currencyData || defaultCurrency;
      setCurrency(fetchedCurrency);
      try {
        sessionStorage.setItem(cacheKey, JSON.stringify(fetchedCurrency));
      } catch {}
    } catch (error) {
      if (reqId !== activeRequestId.current || targetRestaurantId !== restaurantIdRef.current) return;
      console.error('Error loading currency:', error);
    } finally {
      if (reqId === activeRequestId.current && targetRestaurantId === restaurantIdRef.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    const isRestaurantChange = prevRestaurantIdRef.current !== restaurantId;
    if (isRestaurantChange) {
      prevRestaurantIdRef.current = restaurantId;
      setCurrency(null);
      setLoading(true);
    }

    loadCurrency(false);

    const handleRefresh = (targetId?: string | null) => {
      if (!targetId || targetId === restaurantIdRef.current) {
        loadCurrency(true);
      }
    };

    refreshListeners.add(handleRefresh);

    // Cross-tab storage listener to propagate invalidation across open tabs
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'tbh_currency_invalidate_ts' && e.newValue) {
        const [targetId] = e.newValue.split(':');
        if (targetId) {
          try {
            sessionStorage.removeItem(`tbh_currency_${targetId}`);
          } catch {}
        }
        if (!targetId || targetId === restaurantIdRef.current) {
          loadCurrency(true);
        }
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      // Advance activeRequestId on cleanup to invalidate in-flight loads from retiring setup
      activeRequestId.current += 1;
      refreshListeners.delete(handleRefresh);
      window.removeEventListener('storage', handleStorage);
    };
  }, [restaurantId]);

  const formatCurrency = (amount: number): string => {
    const sym = currency?.symbol || '₹';
    return `${sym}${amount.toLocaleString()}`;
  };

  const formatCurrencyCompact = (amount: number): string => {
    const sym = currency?.symbol || '₹';
    const absAmount = Math.abs(amount);
    
    if (absAmount >= 10000000) { // 1 crore / 10 million
      return `${sym}${(absAmount / 10000000).toFixed(1)}Cr`;
    } else if (absAmount >= 100000) { // 1 lakh / 100k
      return `${sym}${(absAmount / 100000).toFixed(1)}L`;
    } else if (absAmount >= 1000) { // 1k
      return `${sym}${(absAmount / 1000).toFixed(1)}K`;
    }
    return `${sym}${amount.toLocaleString()}`;
  };

  const value: CurrencyContextType = {
    currency: currency || defaultCurrency,
    loading,
    symbol: currency?.symbol || '₹',
    code: currency?.code || 'INR',
    formatCurrency,
    formatCurrencyCompact,
    refreshCurrency: () => loadCurrency(true),
  };

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
};

export default CurrencyContext;
