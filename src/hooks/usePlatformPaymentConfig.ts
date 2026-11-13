// Hook to load and save platform-level payment/billing config from the platform_config table.
// Key stored: "payment_config"
// Falls back to DEFAULT_COMPANY_CONFIG when not yet set in DB.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  DEFAULT_COMPANY_CONFIG,
  CompanyInvoiceConfig,
} from '@/utils/subscriberInvoiceGenerator';

const CONFIG_KEY = 'payment_config';

export type PaymentConfigFields = {
  bankName: string;
  accountName: string;
  accountNumber: string;
  ifsc: string;
  branch: string;
  accountType: string;
  upiId: string;
  merchantName: string;
  qrImageUrl?: string;       // custom branded QR image (Supabase Storage URL)
  cardTagline?: string;      // headline shown on the UPI payment card
};

/** Merges DB overrides onto DEFAULT_COMPANY_CONFIG to produce a live config. */
export function mergePaymentConfig(
  overrides: Partial<PaymentConfigFields> | null
): CompanyInvoiceConfig {
  if (!overrides) return DEFAULT_COMPANY_CONFIG;
  return {
    ...DEFAULT_COMPANY_CONFIG,
    bank: {
      ...DEFAULT_COMPANY_CONFIG.bank,
      bankName: overrides.bankName ?? DEFAULT_COMPANY_CONFIG.bank.bankName,
      accountName: overrides.accountName ?? DEFAULT_COMPANY_CONFIG.bank.accountName,
      accountNumber: overrides.accountNumber ?? DEFAULT_COMPANY_CONFIG.bank.accountNumber,
      ifsc: overrides.ifsc ?? DEFAULT_COMPANY_CONFIG.bank.ifsc,
      branch: overrides.branch ?? DEFAULT_COMPANY_CONFIG.bank.branch,
      accountType: overrides.accountType ?? DEFAULT_COMPANY_CONFIG.bank.accountType,
    },
    upi: {
      upiId: overrides.upiId ?? DEFAULT_COMPANY_CONFIG.upi.upiId,
      merchantName: overrides.merchantName ?? DEFAULT_COMPANY_CONFIG.upi.merchantName,
    },
  };
}

/** Returns live merged config, loading state, raw fields, and a save mutation. */
export function usePlatformPaymentConfig() {
  const queryClient = useQueryClient();

  const { data: rawConfig, isLoading } = useQuery({
    queryKey: ['platform_config', CONFIG_KEY],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_config')
        .select('value')
        .eq('key', CONFIG_KEY)
        .maybeSingle();
      if (error) throw error;
      return (data?.value as PaymentConfigFields | null) ?? null;
    },
  });

  const liveConfig = mergePaymentConfig(rawConfig ?? null);

  const saveMutation = useMutation({
    mutationFn: async (fields: PaymentConfigFields) => {
      const { error } = await supabase
        .from('platform_config')
        .upsert({ key: CONFIG_KEY, value: fields as any, updated_at: new Date().toISOString() })
        .eq('key', CONFIG_KEY);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform_config', CONFIG_KEY] });
    },
  });

  return {
    isLoading,
    liveConfig,         // CompanyInvoiceConfig — ready to pass into invoice generator
    rawFields: rawConfig,
    saveMutation,
  };
}
