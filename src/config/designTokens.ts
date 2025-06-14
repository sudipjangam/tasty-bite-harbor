
/**
 * Design tokens for consistent UI/UX across the application
 * Use these tokens to maintain visual consistency
 */

export const designTokens = {
  // Color palette - Updated for better consistency
  colors: {
    primary: {
      50: '#f0f4ff',
      100: '#dbe4fe',
      400: '#6366f1',
      500: '#3f3698', // Main purple from sidebar
      600: '#2f2b7a',
      700: '#1e1b52',
      800: '#1a1748',
      900: '#151240',
    },
    success: {
      50: '#f0fff4',
      100: '#c6f6d5',
      400: '#4ade80',
      500: '#48bb78',
      600: '#38a169',
      700: '#2f855a',
    },
    warning: {
      50: '#fffbeb',
      100: '#fef3c7',
      400: '#fbbf24',
      500: '#f59e0b',
      600: '#d97706',
      700: '#b45309',
    },
    error: {
      50: '#fef2f2',
      100: '#fee2e2',
      400: '#f87171',
      500: '#ef4444',
      600: '#dc2626',
      700: '#b91c1c',
    },
    neutral: {
      50: '#f9fafb',
      100: '#f3f4f6',
      200: '#e5e7eb',
      300: '#d1d5db',
      400: '#9ca3af',
      500: '#6b7280',
      600: '#4b5563',
      700: '#374151',
      800: '#1f2937',
      900: '#111827',
    }
  },

  // Typography
  typography: {
    fontFamily: {
      sans: ['Inter', 'SF Pro Display', 'system-ui', 'sans-serif'],
    },
    fontSize: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
      '3xl': '1.875rem',
      '4xl': '2.25rem',
    },
    fontWeight: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    }
  },

  // Consistent spacing
  spacing: {
    xs: '0.5rem',
    sm: '0.75rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    '2xl': '3rem',
    '3xl': '4rem',
  },

  // Border radius
  borderRadius: {
    sm: '0.375rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
    full: '9999px',
  },

  // Consistent shadows
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  }
};

// Standardized component variants
export const componentVariants = {
  // Button variants - Consistent with primary purple theme
  button: {
    primary: `
      bg-gradient-to-r from-primary-500 to-primary-600 
      hover:from-primary-600 hover:to-primary-700 
      text-white font-medium rounded-lg
      shadow-md hover:shadow-lg 
      transition-all duration-200 
      disabled:opacity-50 disabled:cursor-not-allowed
      border-0 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
    `,
    secondary: `
      bg-white border border-neutral-300 
      hover:bg-neutral-50 hover:border-neutral-400
      text-neutral-700 font-medium rounded-lg
      shadow-sm hover:shadow-md 
      transition-all duration-200
      focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
    `,
    success: `
      bg-gradient-to-r from-success-500 to-success-600 
      hover:from-success-600 hover:to-success-700 
      text-white font-medium rounded-lg
      shadow-md hover:shadow-lg 
      transition-all duration-200
      border-0 focus:ring-2 focus:ring-success-500 focus:ring-offset-2
    `,
    danger: `
      bg-gradient-to-r from-error-500 to-error-600 
      hover:from-error-600 hover:to-error-700 
      text-white font-medium rounded-lg
      shadow-md hover:shadow-lg 
      transition-all duration-200
      border-0 focus:ring-2 focus:ring-error-500 focus:ring-offset-2
    `,
    ghost: `
      hover:bg-neutral-100 dark:hover:bg-neutral-800
      text-neutral-700 dark:text-neutral-300 font-medium rounded-lg
      transition-all duration-200
      border-0 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
    `,
    outline: `
      border border-primary-300 text-primary-600
      hover:bg-primary-50 hover:border-primary-400
      font-medium rounded-lg
      transition-all duration-200
      focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
    `
  },

  // Card variants - Consistent styling
  card: {
    default: `
      bg-white dark:bg-neutral-800 
      border border-neutral-200 dark:border-neutral-700 
      rounded-xl shadow-sm hover:shadow-md 
      transition-all duration-200
    `,
    elevated: `
      bg-white dark:bg-neutral-800 
      border border-neutral-200 dark:border-neutral-700 
      rounded-xl shadow-lg hover:shadow-xl 
      transition-all duration-200
    `,
    glass: `
      bg-white/80 dark:bg-neutral-800/80 
      backdrop-blur-sm border border-white/20 dark:border-neutral-700/30 
      rounded-xl shadow-lg 
      transition-all duration-200
    `,
    purple: `
      bg-gradient-to-br from-primary-50 to-primary-100 
      dark:from-primary-900/20 dark:to-primary-800/10
      border border-primary-200 dark:border-primary-700 
      rounded-xl shadow-sm hover:shadow-md 
      transition-all duration-200
    `
  },

  // Input variants
  input: {
    default: `
      w-full px-3 py-2 
      border border-neutral-300 dark:border-neutral-600 
      rounded-lg bg-white dark:bg-neutral-800
      text-neutral-900 dark:text-neutral-100
      placeholder:text-neutral-500 dark:placeholder:text-neutral-400
      focus:ring-2 focus:ring-primary-500 focus:border-transparent 
      transition-all duration-200
      disabled:bg-neutral-100 dark:disabled:bg-neutral-700 disabled:cursor-not-allowed
    `,
    error: `
      w-full px-3 py-2 
      border border-error-300 dark:border-error-600 
      rounded-lg bg-white dark:bg-neutral-800
      text-neutral-900 dark:text-neutral-100
      placeholder:text-error-400
      focus:ring-2 focus:ring-error-500 focus:border-transparent 
      transition-all duration-200
    `
  },

  // Badge variants
  badge: {
    default: `
      inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
      bg-primary-100 text-primary-800 dark:bg-primary-900/30 dark:text-primary-400
    `,
    success: `
      inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
      bg-success-100 text-success-800 dark:bg-success-900/30 dark:text-success-400
    `,
    warning: `
      inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
      bg-warning-100 text-warning-800 dark:bg-warning-900/30 dark:text-warning-400
    `,
    error: `
      inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
      bg-error-100 text-error-800 dark:bg-error-900/30 dark:text-error-400
    `,
    neutral: `
      inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
      bg-neutral-100 text-neutral-800 dark:bg-neutral-700 dark:text-neutral-200
    `
  }
};

// Layout constants
export const layout = {
  sidebar: {
    width: '256px',
    collapsedWidth: '64px',
  },
  header: {
    height: '64px',
  },
  container: {
    maxWidth: '1200px',
    padding: '1.5rem',
  }
};
