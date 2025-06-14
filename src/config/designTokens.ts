
/**
 * Design tokens for consistent UI/UX across the application
 * Use these tokens to maintain visual consistency
 */

export const designTokens = {
  // Color palette
  colors: {
    primary: {
      50: '#f0f4ff',
      100: '#dbe4fe',
      500: '#3f3698',
      600: '#2f2b7a',
      700: '#1e1b52',
    },
    success: {
      50: '#f0fff4',
      100: '#c6f6d5',
      500: '#48bb78',
      600: '#38a169',
    },
    warning: {
      50: '#fffbeb',
      100: '#fef3c7',
      500: '#f59e0b',
      600: '#d97706',
    },
    error: {
      50: '#fef2f2',
      100: '#fee2e2',
      500: '#ef4444',
      600: '#dc2626',
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

  // Spacing
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

  // Shadows
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  }
};

// Component variants for consistent styling
export const componentVariants = {
  // Button variants
  button: {
    primary: `
      bg-gradient-to-r from-purple-600 to-purple-700 
      hover:from-purple-700 hover:to-purple-800 
      text-white font-medium px-4 py-2 rounded-lg 
      shadow-md hover:shadow-lg 
      transition-all duration-200 
      disabled:opacity-50 disabled:cursor-not-allowed
    `,
    secondary: `
      bg-white border border-gray-300 
      hover:bg-gray-50 
      text-gray-700 font-medium px-4 py-2 rounded-lg 
      shadow-sm hover:shadow-md 
      transition-all duration-200
    `,
    success: `
      bg-gradient-to-r from-green-500 to-green-600 
      hover:from-green-600 hover:to-green-700 
      text-white font-medium px-4 py-2 rounded-lg 
      shadow-md hover:shadow-lg 
      transition-all duration-200
    `,
    danger: `
      bg-gradient-to-r from-red-500 to-red-600 
      hover:from-red-600 hover:to-red-700 
      text-white font-medium px-4 py-2 rounded-lg 
      shadow-md hover:shadow-lg 
      transition-all duration-200
    `,
    ghost: `
      hover:bg-gray-100 
      text-gray-700 font-medium px-4 py-2 rounded-lg 
      transition-all duration-200
    `
  },

  // Card variants
  card: {
    default: `
      bg-white border border-gray-200 
      rounded-xl shadow-sm hover:shadow-md 
      transition-all duration-200
    `,
    elevated: `
      bg-white border border-gray-200 
      rounded-xl shadow-lg hover:shadow-xl 
      transition-all duration-200
    `,
    glass: `
      bg-white/80 backdrop-blur-sm border border-white/20 
      rounded-xl shadow-lg 
      transition-all duration-200
    `
  },

  // Input variants
  input: {
    default: `
      w-full px-3 py-2 border border-gray-300 
      rounded-lg focus:ring-2 focus:ring-purple-500 
      focus:border-transparent 
      transition-all duration-200
    `,
    error: `
      w-full px-3 py-2 border border-red-300 
      rounded-lg focus:ring-2 focus:ring-red-500 
      focus:border-transparent 
      transition-all duration-200
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
