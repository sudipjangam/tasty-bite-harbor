import { useCallback, useRef } from 'react';

interface AnnouncementOptions {
  /** Amount received */
  amount: number;
  /** Table number (optional) */
  tableNumber?: string;
  /** Currency symbol for display */
  currencySymbol?: string;
  /** Language: 'en' for English, 'hi' for Hindi */
  language?: 'en' | 'hi';
  /** Template: 'simple' | 'detailed' | 'custom' */
  template?: 'simple' | 'detailed' | 'custom';
  /** Custom message (used when template is 'custom') */
  customMessage?: string;
}

interface UseSpeechAnnouncementReturn {
  /** Announce a payment received */
  announcePayment: (options: AnnouncementOptions) => void;
  /** Speak any custom text */
  speak: (text: string, lang?: string) => void;
  /** Stop all speech */
  stop: () => void;
  /** Whether speech is currently playing */
  isSpeaking: boolean;
  /** Whether Web Speech API is available */
  isSupported: boolean;
}

/**
 * Hook for voice announcements using Web Speech API
 * 
 * Usage:
 * ```tsx
 * const { announcePayment } = useSpeechAnnouncement();
 * 
 * // When payment succeeds:
 * announcePayment({
 *   amount: 300,
 *   tableNumber: "3",
 *   template: "detailed"
 * });
 * // Speaks: "Payment received! 300 rupees from Table 3"
 * ```
 */
export function useSpeechAnnouncement(): UseSpeechAnnouncementReturn {
  const speechQueueRef = useRef<SpeechSynthesisUtterance[]>([]);
  const isSpeakingRef = useRef(false);

  const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  /**
   * Generate announcement message from template
   */
  const generateMessage = useCallback((options: AnnouncementOptions): string => {
    const {
      amount,
      tableNumber,
      language = 'en',
      template = 'detailed',
      customMessage,
    } = options;

    // Format amount for speech (no decimals for whole numbers)
    const formattedAmount = amount % 1 === 0 ? String(amount) : amount.toFixed(2);

    if (template === 'custom' && customMessage) {
      return customMessage
        .replace('{amount}', formattedAmount)
        .replace('{table}', tableNumber || '');
    }

    if (language === 'hi') {
      // Hindi templates
      if (template === 'simple') {
        return `${formattedAmount} रुपये प्राप्त हुए`;
      }
      const tableInfo = tableNumber ? `, टेबल ${tableNumber} से` : '';
      return `भुगतान प्राप्त! ${formattedAmount} रुपये${tableInfo}`;
    }

    // English templates
    if (template === 'simple') {
      return `Payment received. ${formattedAmount} rupees.`;
    }

    const tableInfo = tableNumber ? ` from Table ${tableNumber}` : '';
    return `Payment received! ${formattedAmount} rupees${tableInfo}`;
  }, []);

  /**
   * Process the speech queue
   */
  const processQueue = useCallback(() => {
    if (!isSupported || speechQueueRef.current.length === 0) {
      isSpeakingRef.current = false;
      return;
    }

    const utterance = speechQueueRef.current.shift();
    if (utterance) {
      utterance.onend = () => {
        processQueue();
      };
      utterance.onerror = (event) => {
        console.error('Speech error:', event);
        processQueue();
      };
      window.speechSynthesis.speak(utterance);
    }
  }, [isSupported]);

  /**
   * Speak any text with optional language
   */
  const speak = useCallback((text: string, lang: string = 'en-IN') => {
    if (!isSupported) {
      console.warn('Web Speech API not supported in this browser');
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 0.9; // Slightly slower for clarity
    utterance.pitch = 1;
    utterance.volume = 1;

    // Try to find a suitable voice
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v =>
      v.lang.startsWith(lang.split('-')[0]) && !v.localService
    ) || voices.find(v =>
      v.lang.startsWith(lang.split('-')[0])
    );

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    speechQueueRef.current.push(utterance);

    if (!isSpeakingRef.current) {
      isSpeakingRef.current = true;
      processQueue();
    }
  }, [isSupported, processQueue]);

  /**
   * Announce a payment with configured template
   */
  const announcePayment = useCallback((options: AnnouncementOptions) => {
    const message = generateMessage(options);
    const lang = options.language === 'hi' ? 'hi-IN' : 'en-IN';

    // Play a notification sound first (beep)
    try {
      const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 880; // A5 note
      oscillator.type = 'sine';
      gainNode.gain.value = 0.3;

      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.2);

      // Short delay, then speak
      setTimeout(() => {
        speak(message, lang);
      }, 300);
    } catch {
      // If audio context fails, just speak directly
      speak(message, lang);
    }
  }, [generateMessage, speak]);

  /**
   * Stop all speech
   */
  const stop = useCallback(() => {
    if (isSupported) {
      window.speechSynthesis.cancel();
      speechQueueRef.current = [];
      isSpeakingRef.current = false;
    }
  }, [isSupported]);

  return {
    announcePayment,
    speak,
    stop,
    isSpeaking: isSpeakingRef.current,
    isSupported,
  };
}
