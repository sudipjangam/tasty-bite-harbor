import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PaymentTransaction {
  id: string;
  paytm_order_id: string;
  paytm_txn_id: string | null;
  amount: number;
  status: 'pending' | 'success' | 'failed' | 'expired';
  table_number: string | null;
  order_id: string | null;
  completed_at: string | null;
}

interface UsePaymentStatusOptions {
  /** Paytm order ID to monitor */
  paytmOrderId: string | null;
  /** Restaurant ID for polling fallback */
  restaurantId: string;
  /** Callback when payment succeeds */
  onSuccess?: (transaction: PaymentTransaction) => void;
  /** Callback when payment fails */
  onFailure?: (transaction: PaymentTransaction) => void;
  /** Enable polling fallback (every 5s) */
  enablePolling?: boolean;
  /** Polling interval in ms (default: 5000) */
  pollingInterval?: number;
}

interface UsePaymentStatusReturn {
  /** Current payment status */
  status: 'idle' | 'waiting' | 'success' | 'failed' | 'expired' | 'error';
  /** Transaction data from DB */
  transaction: PaymentTransaction | null;
  /** Error message if any */
  error: string | null;
  /** Whether actively listening */
  isListening: boolean;
  /** Manually stop listening */
  stopListening: () => void;
}

/**
 * Hook for real-time payment status monitoring
 * 
 * Uses dual strategy:
 * 1. Primary: Supabase Realtime subscription on payment_transactions
 * 2. Fallback: Poll check-paytm-status Edge Function every 5 seconds
 * 
 * Usage:
 * ```tsx
 * const { status, transaction } = usePaymentStatus({
 *   paytmOrderId: 'TB_T3_1707635974_XYZ',
 *   restaurantId: '...',
 *   onSuccess: (txn) => {
 *     announcePayment(txn.amount, txn.table_number);
 *     showSuccessToast();
 *   }
 * });
 * ```
 */
export function usePaymentStatus({
  paytmOrderId,
  restaurantId,
  onSuccess,
  onFailure,
  enablePolling = true,
  pollingInterval = 5000,
}: UsePaymentStatusOptions): UsePaymentStatusReturn {
  const [status, setStatus] = useState<UsePaymentStatusReturn['status']>('idle');
  const [transaction, setTransaction] = useState<PaymentTransaction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);

  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const callbackCalledRef = useRef(false);

  // Cleanup function
  const stopListening = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    setIsListening(false);
  }, []);

  // Handle status change
  const handleStatusChange = useCallback((txn: PaymentTransaction) => {
    setTransaction(txn);

    if (txn.status === 'success' && !callbackCalledRef.current) {
      callbackCalledRef.current = true;
      setStatus('success');
      stopListening();
      onSuccess?.(txn);
    } else if (txn.status === 'failed' && !callbackCalledRef.current) {
      callbackCalledRef.current = true;
      setStatus('failed');
      stopListening();
      onFailure?.(txn);
    } else if (txn.status === 'expired') {
      setStatus('expired');
      stopListening();
    }
  }, [onSuccess, onFailure, stopListening]);

  // Poll check-paytm-status Edge Function
  const pollStatus = useCallback(async () => {
    if (!paytmOrderId || !restaurantId) return;

    try {
      const { data, error: fnError } = await supabase.functions.invoke('check-paytm-status', {
        body: { paytmOrderId, restaurantId },
      });

      if (fnError) {
        console.error('Polling error:', fnError);
        return;
      }

      if (data?.status && data.status !== 'pending') {
        handleStatusChange({
          id: '',
          paytm_order_id: paytmOrderId,
          paytm_txn_id: data.paytmTxnId || null,
          amount: data.amount || 0,
          status: data.status,
          table_number: null,
          order_id: null,
          completed_at: data.completedAt || null,
        });
      }
    } catch (err) {
      console.error('Polling failed:', err);
    }
  }, [paytmOrderId, restaurantId, handleStatusChange]);

  // Main effect: Start listening when paytmOrderId changes
  useEffect(() => {
    if (!paytmOrderId) {
      setStatus('idle');
      return;
    }

    // Reset state
    callbackCalledRef.current = false;
    setStatus('waiting');
    setError(null);
    setIsListening(true);

    // Strategy 1: Supabase Realtime subscription
    const channel = supabase
      .channel(`payment_${paytmOrderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'payment_transactions',
          filter: `paytm_order_id=eq.${paytmOrderId}`,
        },
        (payload) => {
          console.log('Realtime payment update:', payload);
          const newRecord = payload.new as PaymentTransaction;
          handleStatusChange(newRecord);
        }
      )
      .subscribe((status) => {
        console.log(`Realtime subscription status: ${status}`);
        if (status === 'CHANNEL_ERROR') {
          setError('Realtime connection error');
        }
      });

    channelRef.current = channel;

    // Strategy 2: Polling fallback
    if (enablePolling) {
      // Initial poll after 3 seconds
      const initialPoll = setTimeout(() => {
        pollStatus();
      }, 3000);

      // Regular polling every pollingInterval
      pollingRef.current = setInterval(pollStatus, pollingInterval);

      return () => {
        clearTimeout(initialPoll);
        stopListening();
      };
    }

    return () => {
      stopListening();
    };
  }, [paytmOrderId, enablePolling, pollingInterval, handleStatusChange, pollStatus, stopListening]);

  return { status, transaction, error, isListening, stopListening };
}
