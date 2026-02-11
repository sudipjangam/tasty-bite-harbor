import { useCallback, useRef, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

interface PaymentNotificationOptions {
  /** Amount received */
  amount: number;
  /** Table number */
  tableNumber?: string;
  /** Currency symbol */
  currencySymbol?: string;
  /** Order ID or description */
  orderDescription?: string;
}

interface UsePaymentNotificationReturn {
  /** Show payment success notification (toast + browser) */
  notifyPaymentSuccess: (options: PaymentNotificationOptions) => void;
  /** Show payment failure notification */
  notifyPaymentFailure: (options: PaymentNotificationOptions) => void;
  /** Request browser notification permission */
  requestPermission: () => Promise<boolean>;
  /** Whether browser notifications are supported */
  isSupported: boolean;
  /** Current permission state */
  permissionState: NotificationPermission | 'unsupported';
}

/**
 * Hook for payment popup and browser notifications
 * 
 * Combines:
 * 1. In-app toast notifications (always works)
 * 2. Browser Notification API (needs permission)
 * 3. Notification sound
 * 
 * Usage:
 * ```tsx
 * const { notifyPaymentSuccess, requestPermission } = usePaymentNotification();
 * 
 * // Request permission on mount
 * useEffect(() => { requestPermission(); }, []);
 * 
 * // When payment succeeds:
 * notifyPaymentSuccess({
 *   amount: 300,
 *   tableNumber: "3",
 *   currencySymbol: "₹"
 * });
 * ```
 */
export function usePaymentNotification(): UsePaymentNotificationReturn {
  const { toast } = useToast();
  const notificationSoundRef = useRef<HTMLAudioElement | null>(null);

  const isSupported = typeof window !== 'undefined' && 'Notification' in window;

  const permissionState: NotificationPermission | 'unsupported' = isSupported
    ? Notification.permission
    : 'unsupported';

  // Preload notification sound
  useEffect(() => {
    // Create a simple notification sound using Web Audio
    // We'll generate it on-the-fly when needed
    return () => {
      notificationSoundRef.current = null;
    };
  }, []);

  /**
   * Play a pleasant notification sound
   */
  const playNotificationSound = useCallback((isSuccess: boolean) => {
    try {
      const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();

      if (isSuccess) {
        // Success: Pleasant ascending tone (C5 → E5 → G5)
        const notes = [523.25, 659.25, 783.99];
        notes.forEach((freq, i) => {
          const osc = audioContext.createOscillator();
          const gain = audioContext.createGain();
          osc.connect(gain);
          gain.connect(audioContext.destination);
          osc.frequency.value = freq;
          osc.type = 'sine';
          gain.gain.value = 0.2;
          gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15 * (i + 1) + 0.3);
          osc.start(audioContext.currentTime + 0.15 * i);
          osc.stop(audioContext.currentTime + 0.15 * (i + 1) + 0.3);
        });
      } else {
        // Failure: Descending tone
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.connect(gain);
        gain.connect(audioContext.destination);
        osc.frequency.value = 400;
        osc.type = 'sine';
        gain.gain.value = 0.2;
        osc.start();
        osc.stop(audioContext.currentTime + 0.5);
      }
    } catch {
      // Audio context not available — silently fail
    }
  }, []);

  /**
   * Request browser notification permission
   */
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') return false;

    const result = await Notification.requestPermission();
    return result === 'granted';
  }, [isSupported]);

  /**
   * Show browser notification
   */
  const showBrowserNotification = useCallback((title: string, body: string, icon?: string) => {
    if (!isSupported || Notification.permission !== 'granted') return;

    try {
      const notification = new Notification(title, {
        body,
        icon: icon || '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'payment-notification',
        requireInteraction: true,
        silent: false,
      });

      // Auto-close after 10 seconds
      setTimeout(() => notification.close(), 10000);

      // Focus window on click
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    } catch {
      // Notification API failed — silently handle
    }
  }, [isSupported]);

  /**
   * Notify payment success
   */
  const notifyPaymentSuccess = useCallback((options: PaymentNotificationOptions) => {
    const { amount, tableNumber, currencySymbol = '₹', orderDescription } = options;
    const tableInfo = tableNumber ? ` from Table ${tableNumber}` : '';
    const formattedAmount = `${currencySymbol}${amount.toLocaleString('en-IN')}`;

    // 1. Play success sound
    playNotificationSound(true);

    // 2. In-app toast notification (always visible)
    toast({
      title: '✅ Payment Received!',
      description: `${formattedAmount}${tableInfo}${orderDescription ? ` • ${orderDescription}` : ''}`,
      duration: 8000,
    });

    // 3. Browser notification (if permitted)
    showBrowserNotification(
      '💰 Payment Received!',
      `${formattedAmount}${tableInfo}`
    );
  }, [toast, playNotificationSound, showBrowserNotification]);

  /**
   * Notify payment failure
   */
  const notifyPaymentFailure = useCallback((options: PaymentNotificationOptions) => {
    const { amount, tableNumber, currencySymbol = '₹' } = options;
    const tableInfo = tableNumber ? ` for Table ${tableNumber}` : '';
    const formattedAmount = `${currencySymbol}${amount.toLocaleString('en-IN')}`;

    playNotificationSound(false);

    toast({
      title: '❌ Payment Failed',
      description: `${formattedAmount} payment${tableInfo} was unsuccessful. Please try again.`,
      variant: 'destructive',
      duration: 10000,
    });

    showBrowserNotification(
      '❌ Payment Failed',
      `${formattedAmount} payment${tableInfo} failed`
    );
  }, [toast, playNotificationSound, showBrowserNotification]);

  return {
    notifyPaymentSuccess,
    notifyPaymentFailure,
    requestPermission,
    isSupported,
    permissionState,
  };
}
