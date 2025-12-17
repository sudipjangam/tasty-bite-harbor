import { startOfDay, subDays, subMonths, subYears, format } from "date-fns";

// Types
export type TimePeriod = '1d' | '7d' | '30d' | '90d' | '1y' | 'all';

// Constant Colors
export const CHART_COLORS = {
  primary: {
    light: '#8b5cf6', // Violet 500
    dark: '#a78bfa',  // Violet 400
    gradientLight: ['rgba(139, 92, 246, 0.4)', 'rgba(139, 92, 246, 0.05)'],
    gradientDark: ['rgba(167, 139, 250, 0.4)', 'rgba(167, 139, 250, 0.05)']
  },
  success: {
    light: '#10b981', // Emerald 500
    dark: '#34d399',  // Emerald 400
    gradientLight: ['rgba(16, 185, 129, 0.4)', 'rgba(16, 185, 129, 0.05)'],
    gradientDark: ['rgba(52, 211, 153, 0.4)', 'rgba(52, 211, 153, 0.05)']
  },
  warning: {
    light: '#f59e0b', // Amber 500
    dark: '#fbbf24',  // Amber 400
    gradientLight: ['rgba(245, 158, 11, 0.4)', 'rgba(245, 158, 11, 0.05)'],
    gradientDark: ['rgba(251, 191, 36, 0.4)', 'rgba(251, 191, 36, 0.05)']
  },
  grid: {
    light: '#e2e8f0', // Slate 200
    dark: '#334155'   // Slate 700
  },
  text: {
    light: '#334155', // Slate 700
    dark: '#e2e8f0'   // Slate 200
  },
  background: {
    light: '#ffffff',
    dark: '#1e293b'   // Slate 800
  }
};

/**
 * Format currency with symbol
 */
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(value);
};

/**
 * Filter data array by time period based on a date field
 */
export const filterByTimePeriod = <T>(
  data: T[], 
  period: TimePeriod, 
  dateField: keyof T
): T[] => {
  const now = new Date();
  let startDate: Date;
  
  switch (period) {
    case '1d': startDate = startOfDay(now); break;
    case '7d': startDate = subDays(now, 7); break;
    case '30d': startDate = subDays(now, 30); break;
    case '90d': startDate = subDays(now, 90); break;
    case '1y': startDate = subYears(now, 1); break;
    case 'all': default: return data;
  }
  
  return data.filter(item => {
    const itemDate = new Date(item[dateField] as string | number | Date);
    return itemDate >= startDate;
  });
};

/**
 * Get Highcharts gradient object
 */
export const getGradient = (stops: string[]) => {
  return {
    linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
    stops: [
      [0, stops[0]],
      [1, stops[1]]
    ]
  };
};
