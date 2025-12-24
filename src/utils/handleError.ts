/**
 * Standardized error handling utility
 * Provides consistent error logging, toast notifications, and message extraction
 */

import { useToast } from "@/hooks/use-toast";

export interface HandleErrorOptions {
  /** Whether to display a toast notification. Default: true */
  toast?: boolean;
  /** Whether to log to console. Default: true */
  log?: boolean;
  /** Context string for logging (e.g., component or function name) */
  context?: string;
  /** Custom title for the toast notification */
  title?: string;
}

export interface ErrorToastConfig {
  title: string;
  description: string;
  variant: "destructive";
}

/**
 * Extracts a user-friendly message from any error type
 */
export const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return "An unexpected error occurred";
};

/**
 * Handles errors consistently across the application
 * 
 * @param error - The error to handle
 * @param options - Configuration options
 * @returns Toast configuration object for use with useToast hook
 * 
 * @example
 * ```tsx
 * const { toast } = useToast();
 * 
 * try {
 *   await someOperation();
 * } catch (error) {
 *   toast(handleError(error, { context: "OrderCreation" }));
 * }
 * ```
 */
export const handleError = (
  error: unknown,
  options: HandleErrorOptions = {}
): ErrorToastConfig => {
  const {
    toast = true,
    log = true,
    context = "Error",
    title = "Error",
  } = options;

  const message = getErrorMessage(error);

  if (log) {
    console.error(`[${context}]:`, error);
  }

  return {
    title,
    description: message,
    variant: "destructive",
  };
};

/**
 * React hook wrapper for handleError that automatically uses toast
 * 
 * @example
 * ```tsx
 * const handleErrorWithToast = useHandleError();
 * 
 * try {
 *   await someOperation();
 * } catch (error) {
 *   handleErrorWithToast(error, { context: "MyComponent" });
 * }
 * ```
 */
export const useHandleError = () => {
  const { toast } = useToast();

  return (error: unknown, options: HandleErrorOptions = {}) => {
    const toastConfig = handleError(error, options);
    if (options.toast !== false) {
      toast(toastConfig);
    }
    return toastConfig;
  };
};

export default handleError;
