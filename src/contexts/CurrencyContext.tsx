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
}

const defaultCurrency: Currency = {
  id: 'default',
  symbol: '₹',
  code: 'INR',
  name: 'Indian Rupee'
};

const CurrencyContext = createContext<CurrencyContextType>({
  currency: defaultCurrency,
  loading: true,
  symbol: '₹',
  code: 'INR',
  formatCurrency: (amount: number) => `₹${amount.toLocaleString()}`,
  formatCurrencyCompact: (amount: number) => `₹${amount}`,
});

export const useCurrencyContext = () => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrencyContext must be used within a CurrencyProvider');
  }
  return context;
};

interface CurrencyProviderProps {
  children: ReactNode;
}

export const CurrencyProvider: React.FC<CurrencyProviderProps> = ({ children }) => {
  const { restaurantId } = useRestaurantId();
  const [currency, setCurrency] = useState<Currency | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCurrency();
  }, [restaurantId]);

  const loadCurrency = async () => {
    if (!restaurantId) {
      setLoading(false);
      return;
    }

    try {
      // Get restaurant settings
      const { data: settings } = await supabase
        .from('restaurant_settings')
        .select('currency_id')
        .eq('restaurant_id', restaurantId)
        .maybeSingle();

      if (settings?.currency_id) {
        // Get currency details
        const { data: currencyData } = await supabase
          .from('currencies')
          .select('*')
          .eq('id', settings.currency_id)
          .single();

        if (currencyData) {
          setCurrency(currencyData);
        } else {
          setCurrency(defaultCurrency);
        }
      } else {
        // Default to INR if no currency set
        setCurrency(defaultCurrency);
      }
    } catch (error) {
      console.error('Error loading currency:', error);
      setCurrency(defaultCurrency);
    } finally {
      setLoading(false);
    }
  };

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
  };

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
};

export default CurrencyContext;
