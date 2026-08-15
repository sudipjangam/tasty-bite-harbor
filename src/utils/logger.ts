/**
 * Unified Application Logger
 * Suppresses info/debug/log output in standard mode while ensuring errors and warnings are always surfaced.
 * Debug logging can be enabled on-demand via localStorage: localStorage.setItem('ENABLE_DEBUG_LOGS', 'true')
 */

const isDebugMode = (): boolean => {
  try {
    return typeof window !== 'undefined' && window.localStorage?.getItem('ENABLE_DEBUG_LOGS') === 'true';
  } catch {
    return false;
  }
};

export const logger = {
  log: (...args: any[]) => {
    if (isDebugMode()) {
      console.log(...args);
    }
  },
  info: (...args: any[]) => {
    if (isDebugMode()) {
      console.info(...args);
    }
  },
  debug: (...args: any[]) => {
    if (isDebugMode()) {
      console.debug(...args);
    }
  },
  warn: (...args: any[]) => {
    console.warn(...args);
  },
  error: (...args: any[]) => {
    console.error(...args);
  },
};

export default logger;
