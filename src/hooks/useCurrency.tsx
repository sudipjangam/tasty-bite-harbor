import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useRestaurantId } from './useRestaurantId';

interface Currency {
  id: string;
  symbol: string;
  code: string;
  name: string;
}

export function useCurrency() {
  const { restaurantId } = useRestaurantId();
  const [currency, setCurrency] = useState<Currency | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCurrency();
  }, [restaurantId]);

  const loadCurrency = async () => {
    if (!restaurantId) return;

    try {
      // Get restaurant settings
      const { data: settings } = await supabase
        .from('restaurant_settings')
        .select('currency_id')
        .eq('restaurant_id', restaurantId)
        .single();

      if (settings?.currency_id) {
        // Get currency details
        const { data: currencyData } = await supabase
          .from('currencies')
          .select('*')
          .eq('id', settings.currency_id)
          .single();

        if (currencyData) {
          setCurrency(currencyData);
        }
      } else {
        // Default to INR if no currency set
        const { data: defaultCurrency } = await supabase
          .from('currencies')
          .select('*')
          .eq('code', 'INR')
          .single();

        if (defaultCurrency) {
          setCurrency(defaultCurrency);
        }
      }
    } catch (error) {
      console.error('Error loading currency:', error);
      // Fallback to INR
      setCurrency({
        id: 'default',
        symbol: '₹',
        code: 'INR',
        name: 'Indian Rupee'
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number): string => {
    if (!currency) return `₹${amount.toLocaleString()}`;
    return `${currency.symbol}${amount.toLocaleString()}`;
  };

  return {
    currency,
    loading,
    formatCurrency,
    symbol: currency?.symbol || '₹',
    code: currency?.code || 'INR'
  };
}