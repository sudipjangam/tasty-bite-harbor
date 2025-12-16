import { useCallback, useEffect, useRef } from 'react';

// ============================================
// ERROR MONITORING CONFIGURATION
// ============================================

interface ErrorConfig {
  dsn?: string;                    // Sentry DSN or similar
  environment?: string;            // development, staging, production
  release?: string;                // App version
  enabled?: boolean;               // Toggle error reporting
  sampleRate?: number;             // Sample rate 0-1
  debug?: boolean;                 // Enable debug mode
}

interface ErrorContext {
  userId?: string;
  restaurantId?: string;
  page?: string;
  component?: string;
  action?: string;
  extra?: Record<string, unknown>;
}

interface ErrorEvent {
  message: string;
  stack?: string;
  timestamp: string;
  context: ErrorContext;
  type: 'error' | 'warning' | 'info';
  fingerprint?: string[];
}

// ============================================
// ERROR MONITORING SERVICE
// ============================================

class ErrorMonitoringService {
  private static instance: ErrorMonitoringService;
  private config: ErrorConfig;
  private queue: ErrorEvent[] = [];
  private context: ErrorContext = {};

  private constructor() {
    this.config = {
      environment: import.meta.env.VITE_APP_ENV || 'development',
      enabled: import.meta.env.PROD,
      sampleRate: 1.0,
      debug: !import.meta.env.PROD,
    };
  }

  static getInstance(): ErrorMonitoringService {
    if (!ErrorMonitoringService.instance) {
      ErrorMonitoringService.instance = new ErrorMonitoringService();
    }
    return ErrorMonitoringService.instance;
  }

  init(config: Partial<ErrorConfig>): void {
    this.config = { ...this.config, ...config };
    
    if (this.config.debug) {
      console.log('[ErrorMonitoring] Initialized with config:', this.config);
    }

    // Set up global error handlers
    this.setupGlobalHandlers();
  }

  private setupGlobalHandlers(): void {
    // Handle uncaught errors
    window.onerror = (message, source, lineno, colno, error) => {
      this.captureError(error || new Error(String(message)), {
        extra: { source, lineno, colno },
      });
      return false;
    };

    // Handle unhandled promise rejections
    window.onunhandledrejection = (event) => {
      this.captureError(
        event.reason instanceof Error 
          ? event.reason 
          : new Error(String(event.reason)),
        { extra: { type: 'unhandledrejection' } }
      );
    };
  }

  setContext(context: Partial<ErrorContext>): void {
    this.context = { ...this.context, ...context };
  }

  setUser(userId: string, restaurantId?: string): void {
    this.context.userId = userId;
    if (restaurantId) {
      this.context.restaurantId = restaurantId;
    }
  }

  clearContext(): void {
    this.context = {};
  }

  captureError(error: Error, additionalContext?: Partial<ErrorContext>): void {
    if (!this.config.enabled) {
      if (this.config.debug) {
        console.error('[ErrorMonitoring] Error captured (not sent):', error);
      }
      return;
    }

    // Sample rate check
    if (Math.random() > (this.config.sampleRate || 1)) {
      return;
    }

    const event: ErrorEvent = {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      context: { ...this.context, ...additionalContext },
      type: 'error',
    };

    this.sendEvent(event);
  }

  captureMessage(
    message: string, 
    level: 'warning' | 'info' = 'info',
    context?: Partial<ErrorContext>
  ): void {
    if (!this.config.enabled) return;

    const event: ErrorEvent = {
      message,
      timestamp: new Date().toISOString(),
      context: { ...this.context, ...context },
      type: level,
    };

    this.sendEvent(event);
  }

  private sendEvent(event: ErrorEvent): void {
    // Log to console in debug mode
    if (this.config.debug) {
      console.log('[ErrorMonitoring] Event:', event);
    }

    // TODO: Integrate with actual error monitoring service
    // Option 1: Sentry
    // if (window.Sentry) {
    //   window.Sentry.captureException(new Error(event.message), {
    //     extra: event.context,
    //     tags: { environment: this.config.environment },
    //   });
    // }

    // Option 2: LogRocket
    // if (window.LogRocket) {
    //   window.LogRocket.captureMessage(event.message, {
    //     extra: event.context,
    //   });
    // }

    // Option 3: Send to custom endpoint
    // fetch('/api/errors', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(event),
    // }).catch(console.error);

    // For now, store in queue (can be flushed later)
    this.queue.push(event);
    
    // Keep queue bounded
    if (this.queue.length > 100) {
      this.queue.shift();
    }
  }

  getQueue(): ErrorEvent[] {
    return [...this.queue];
  }

  clearQueue(): void {
    this.queue = [];
  }
}

// Export singleton instance
export const errorMonitoring = ErrorMonitoringService.getInstance();

// ============================================
// REACT HOOK
// ============================================

interface UseErrorMonitoringOptions {
  component?: string;
  page?: string;
}

export function useErrorMonitoring(options: UseErrorMonitoringOptions = {}) {
  const componentRef = useRef(options.component);
  const pageRef = useRef(options.page);

  useEffect(() => {
    // Update context when component mounts
    errorMonitoring.setContext({
      component: componentRef.current,
      page: pageRef.current || window.location.pathname,
    });
  }, []);

  const captureError = useCallback((
    error: Error,
    additionalContext?: Partial<ErrorContext>
  ) => {
    errorMonitoring.captureError(error, {
      component: componentRef.current,
      page: pageRef.current,
      ...additionalContext,
    });
  }, []);

  const captureMessage = useCallback((
    message: string,
    level: 'warning' | 'info' = 'info',
    context?: Partial<ErrorContext>
  ) => {
    errorMonitoring.captureMessage(message, level, {
      component: componentRef.current,
      ...context,
    });
  }, []);

  const setAction = useCallback((action: string) => {
    errorMonitoring.setContext({ action });
  }, []);

  return {
    captureError,
    captureMessage,
    setAction,
    setContext: errorMonitoring.setContext.bind(errorMonitoring),
    setUser: errorMonitoring.setUser.bind(errorMonitoring),
  };
}

// ============================================
// UTILITY: WRAP ASYNC FUNCTIONS
// ============================================

/**
 * Wrap an async function to automatically capture errors
 */
export function withErrorCapture<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  context?: Partial<ErrorContext>
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      errorMonitoring.captureError(
        error instanceof Error ? error : new Error(String(error)),
        context
      );
      throw error;
    }
  }) as T;
}

/**
 * Safe wrapper that won't throw but logs errors
 */
export function safeAsync<T>(
  promise: Promise<T>,
  fallback: T,
  context?: Partial<ErrorContext>
): Promise<T> {
  return promise.catch((error) => {
    errorMonitoring.captureError(
      error instanceof Error ? error : new Error(String(error)),
      context
    );
    return fallback;
  });
}
