
/**
 * Design tokens for consistent UI/UX across the application
 * Use these tokens to maintain visual consistency
 */

export const designTokens = {
  // Enhanced color palette with modern gradients
  colors: {
    primary: {
      50: '#f0f4ff',
      100: '#dbe4fe',
      200: '#bfcfff',
      300: '#93b4ff',
      400: '#608dff',
      500: '#3f3698',
      600: '#2f2b7a',
      700: '#1e1b52',
      800: '#141238',
      900: '#0a0b1f',
    },
    success: {
      50: '#ecfdf5',
      100: '#d1fae5',
      200: '#a7f3d0',
      300: '#6ee7b7',
      400: '#34d399',
      500: '#10b981',
      600: '#059669',
      700: '#047857',
      800: '#065f46',
      900: '#064e3b',
    },
    warning: {
      50: '#fffbeb',
      100: '#fef3c7',
      200: '#fde68a',
      300: '#fcd34d',
      400: '#fbbf24',
      500: '#f59e0b',
      600: '#d97706',
      700: '#b45309',
      800: '#92400e',
      900: '#78350f',
    },
    error: {
      50: '#fef2f2',
      100: '#fee2e2',
      200: '#fecaca',
      300: '#fca5a5',
      400: '#f87171',
      500: '#ef4444',
      600: '#dc2626',
      700: '#b91c1c',
      800: '#991b1b',
      900: '#7f1d1d',
    },
    neutral: {
      50: '#fafafa',
      100: '#f4f4f5',
      200: '#e4e4e7',
      300: '#d4d4d8',
      400: '#a1a1aa',
      500: '#71717a',
      600: '#52525b',
      700: '#3f3f46',
      800: '#27272a',
      900: '#18181b',
    },
    // New gradient colors
    gradients: {
      primary: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      success: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      warning: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
      purple: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      ocean: 'linear-gradient(135deg, #667eea 0%, #667eea 100%)',
      sunset: 'linear-gradient(135deg, #ff7e5f 0%, #feb47b 100%)',
    }
  },

  // Enhanced typography
  typography: {
    fontFamily: {
      sans: ['Inter', 'SF Pro Display', 'system-ui', 'sans-serif'],
      display: ['Playfair Display', 'serif'],
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
      '5xl': '3rem',
      '6xl': '3.75rem',
    },
    fontWeight: {
      light: '300',
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
      extrabold: '800',
    },
    lineHeight: {
      tight: '1.25',
      snug: '1.375',
      normal: '1.5',
      relaxed: '1.625',
      loose: '2',
    }
  },

  // Enhanced spacing
  spacing: {
    xs: '0.5rem',
    sm: '0.75rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    '2xl': '3rem',
    '3xl': '4rem',
    '4xl': '5rem',
    '5xl': '6rem',
  },

  // Enhanced border radius
  borderRadius: {
    none: '0',
    sm: '0.25rem',
    md: '0.375rem',
    lg: '0.5rem',
    xl: '0.75rem',
    '2xl': '1rem',
    '3xl': '1.5rem',
    full: '9999px',
  },

  // Enhanced shadows with depth
  shadows: {
    xs: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    sm: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    glow: '0 0 20px rgb(99 102 241 / 0.3)',
    colored: '0 8px 32px rgb(99 102 241 / 0.2)',
  },

  // Animation and transitions
  transitions: {
    fast: '150ms ease-in-out',
    normal: '250ms ease-in-out',
    slow: '350ms ease-in-out',
    bounce: '0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  }
};

// Enhanced component variants
export const componentVariants = {
  // Modern button variants with gradients
  button: {
    primary: `
      bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700
      hover:from-indigo-700 hover:via-purple-700 hover:to-indigo-800
      text-white font-semibold px-6 py-3 rounded-xl
      shadow-lg hover:shadow-xl transform hover:-translate-y-0.5
      transition-all duration-300 ease-in-out
      border border-indigo-500/20
      disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
    `,
    secondary: `
      bg-white border-2 border-gray-200 hover:border-indigo-300
      hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50
      text-gray-700 hover:text-indigo-700 font-semibold px-6 py-3 rounded-xl
      shadow-md hover:shadow-lg transform hover:-translate-y-0.5
      transition-all duration-300 ease-in-out
    `,
    success: `
      bg-gradient-to-r from-emerald-500 to-teal-600
      hover:from-emerald-600 hover:to-teal-700
      text-white font-semibold px-6 py-3 rounded-xl
      shadow-lg hover:shadow-xl transform hover:-translate-y-0.5
      transition-all duration-300 ease-in-out
    `,
    danger: `
      bg-gradient-to-r from-red-500 to-pink-600
      hover:from-red-600 hover:to-pink-700
      text-white font-semibold px-6 py-3 rounded-xl
      shadow-lg hover:shadow-xl transform hover:-translate-y-0.5
      transition-all duration-300 ease-in-out
    `,
    ghost: `
      hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100
      text-gray-700 hover:text-indigo-600 font-medium px-4 py-2 rounded-lg
      transition-all duration-200 ease-in-out
    `
  },

  // Modern card variants with enhanced shadows
  card: {
    default: `
      bg-white/80 backdrop-blur-sm border border-gray-200/50
      rounded-2xl shadow-lg hover:shadow-xl
      transition-all duration-300 ease-in-out
      hover:-translate-y-1
    `,
    elevated: `
      bg-white/90 backdrop-blur-md border border-gray-200/30
      rounded-2xl shadow-xl hover:shadow-2xl
      transition-all duration-300 ease-in-out
      hover:-translate-y-2
    `,
    glass: `
      bg-white/10 backdrop-blur-xl border border-white/20
      rounded-2xl shadow-2xl
      transition-all duration-300 ease-in-out
    `,
    gradient: `
      bg-gradient-to-br from-white via-indigo-50/30 to-purple-50/30
      border border-indigo-200/30 rounded-2xl shadow-lg hover:shadow-xl
      transition-all duration-300 ease-in-out
      hover:-translate-y-1
    `
  },

  // Enhanced input variants
  input: {
    default: `
      w-full px-4 py-3 border-2 border-gray-200 
      rounded-xl focus:ring-2 focus:ring-indigo-500/30
      focus:border-indigo-500 bg-white/80 backdrop-blur-sm
      transition-all duration-200 ease-in-out
      placeholder:text-gray-400
    `,
    error: `
      w-full px-4 py-3 border-2 border-red-300 
      rounded-xl focus:ring-2 focus:ring-red-500/30
      focus:border-red-500 bg-red-50/80 backdrop-blur-sm
      transition-all duration-200 ease-in-out
    `
  }
};

// Enhanced layout constants
export const layout = {
  sidebar: {
    width: '280px',
    collapsedWidth: '80px',
  },
  header: {
    height: '72px',
  },
  container: {
    maxWidth: '1400px',
    padding: '2rem',
  }
};
