
export const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
};

export const formatCurrency = (amount: number | null | undefined): string => {
  if (amount === null || amount === undefined) return '';
  
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

export const formatIndianCurrency = (amount: number | null | undefined): { formatted: string; actual: string } => {
  if (amount === null || amount === undefined) return { formatted: '', actual: '' };
  
  const actualValue = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);

  let formatted = '';
  const absAmount = Math.abs(amount);
  
  if (absAmount >= 10000000) { // 1 crore
    const crores = absAmount / 10000000;
    formatted = `₹${crores.toFixed(crores >= 100 ? 0 : 1)}Cr`;
  } else if (absAmount >= 100000) { // 1 lakh
    const lakhs = absAmount / 100000;
    formatted = `₹${lakhs.toFixed(lakhs >= 100 ? 0 : 1)}L`;
  } else if (absAmount >= 1000) {
    formatted = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  } else {
    formatted = `₹${amount}`;
  }
  
  if (amount < 0) {
    formatted = `-${formatted.replace('₹', '')}`;
    formatted = `₹${formatted}`;
  }
  
  return { formatted, actual: actualValue };
};

export const calculateDaysSince = (dateString: string | null | undefined): number => {
  if (!dateString) return 0;
  
  const date = new Date(dateString);
  const now = new Date();
  return Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
};
