
import { format, parseISO, differenceInDays, isWithinInterval, startOfDay, endOfDay, subDays, startOfMonth, endOfMonth } from "date-fns";

export const formatDateTime = (dateTimeString: string) => {
  if (!dateTimeString) return "";
  try {
    return format(parseISO(dateTimeString), "MMM dd, yyyy h:mm a");
  } catch (error) {
    return dateTimeString;
  }
};

export const formatDate = (dateString: string) => {
  if (!dateString) return "";
  try {
    if (dateString.includes('T')) {
      return format(parseISO(dateString), "MMM dd, yyyy");
    }
    return format(new Date(dateString), "MMM dd, yyyy");
  } catch (error) {
    return dateString;
  }
};

export const calculateDuration = (startDateStr: string, endDateStr: string) => {
  try {
    // Handle both date-only and datetime strings
    const startDate = startDateStr.includes('T') ? parseISO(startDateStr) : new Date(startDateStr);
    const endDate = endDateStr.includes('T') ? parseISO(endDateStr) : new Date(endDateStr);
    
    return differenceInDays(endDate, startDate) + 1; // +1 to include both start and end days
  } catch (error) {
    return 0;
  }
};

export const calculateHourMinuteDuration = (startTimeStr: string, endTimeStr: string): string => {
  try {
    if (!startTimeStr || !endTimeStr) return "—";

    const startTime = parseISO(startTimeStr);
    const endTime = parseISO(endTimeStr);
    
    const durationMs = endTime.getTime() - startTime.getTime();
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m`;
  } catch (error) {
    return "—";
  }
};

// Function to filter orders by date range
export const filterOrdersByDateRange = (orders: any[], dateFilter: string): any[] => {
  const today = new Date();
  
  switch (dateFilter) {
    case "today":
      return orders.filter(order => {
        const orderDate = new Date(order.created_at);
        return isWithinInterval(orderDate, {
          start: startOfDay(today),
          end: endOfDay(today)
        });
      });
      
    case "yesterday":
      return orders.filter(order => {
        const orderDate = new Date(order.created_at);
        const yesterday = subDays(today, 1);
        return isWithinInterval(orderDate, {
          start: startOfDay(yesterday),
          end: endOfDay(yesterday)
        });
      });
      
    case "last7days":
      return orders.filter(order => {
        const orderDate = new Date(order.created_at);
        return isWithinInterval(orderDate, {
          start: startOfDay(subDays(today, 6)), // 6 days ago + today = 7 days
          end: endOfDay(today)
        });
      });
      
    case "thisMonth":
      return orders.filter(order => {
        const orderDate = new Date(order.created_at);
        return isWithinInterval(orderDate, {
          start: startOfMonth(today),
          end: endOfMonth(today)
        });
      });
      
    default:
      return orders;
  }
};
