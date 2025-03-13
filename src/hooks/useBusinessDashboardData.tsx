
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, startOfWeek, addDays, isSameDay } from "date-fns";

// Define proper types for inventory items
interface InventoryItem {
  category: string;
  cost_per_unit: number;
  quantity: number;
  name: string;
  reorder_level: number;
}

// Define proper types for order items
interface OrderItem {
  category?: string;
  quantity?: number;
}

// Define proper types for orders
interface Order {
  id: string;
  created_at: string;
  total: number;
  items: OrderItem[];
}

// Define proper types for staff members
interface StaffMember {
  position?: string;
}

// Define proper types for revenue stats
interface RevenueStats {
  date: string;
  total_revenue: number;
  order_count: number;
  average_order_value: number;
}

export const useBusinessDashboardData = () => {
  return useQuery({
    queryKey: ["business-dashboard-data"],
    queryFn: async () => {
      const { data: profile } = await supabase.auth.getUser();
      if (!profile.user) throw new Error("No user found");

      const { data: userProfile } = await supabase
        .from("profiles")
        .select("restaurant_id")
        .eq("id", profile.user.id)
        .single();

      if (!userProfile?.restaurant_id) {
        throw new Error("No restaurant found for user");
      }

      const restaurantId = userProfile.restaurant_id;

      // Fetch orders data with date range
      const thirtyDaysAgo = subDays(new Date(), 30);
      const formattedDate = thirtyDaysAgo.toISOString();

      const { data: orderData } = await supabase
        .from("orders")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .gte("created_at", formattedDate)
        .order("created_at", { ascending: false });

      // Fetch inventory data
      const { data: inventoryData } = await supabase
        .from("inventory_items")
        .select("*")
        .eq("restaurant_id", restaurantId);

      // Fetch staffing data
      const { data: staffData } = await supabase
        .from("staff")
        .select("*")
        .eq("restaurant_id", restaurantId);

      // Fetch revenue stats data
      const { data: revenueStats } = await supabase
        .from("daily_revenue_stats")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .gte("date", formattedDate)
        .order("date", { ascending: true });

      // Cast data to proper types
      const typedOrderData = orderData as Order[] || [];
      const typedInventoryData = inventoryData as InventoryItem[] || [];
      const typedStaffData = staffData as StaffMember[] || [];
      const typedRevenueStats = revenueStats as RevenueStats[] || [];

      // Calculate expense breakdown based on real data
      const totalOrderRevenue = typedOrderData.reduce((sum, order) => sum + order.total, 0) || 0;
      
      // Calculate ingredient costs (from inventory)
      const ingredientsCost = typedInventoryData.reduce((sum, item) => {
        return item.category.toLowerCase().includes("ingredient") ? 
          sum + (item.cost_per_unit || 0) * (item.quantity || 0) : sum;
      }, 0) || 0;

      // Utilities cost estimation (12% of total revenue)
      const utilitiesCost = totalOrderRevenue * 0.12;
      
      // Staff cost calculation based on real staff data
      const staffCost = typedStaffData.reduce((sum, staff) => {
        // Approximate salary based on position
        let baseSalary = 12000; // Default monthly salary
        
        if (staff.position) {
          const position = staff.position.toLowerCase();
          if (position.includes('chef') || position.includes('cook')) {
            baseSalary = 18000;
          } else if (position.includes('manager')) {
            baseSalary = 25000;
          } else if (position.includes('waiter') || position.includes('server')) {
            baseSalary = 10000;
          } else if (position.includes('clean') || position.includes('janitor')) {
            baseSalary = 8000;
          }
        }
        
        return sum + baseSalary;
      }, 0) || 25000; // Default to 25000 if no staff found
      
      // Rent cost estimation (10% of revenue)
      const rentCost = totalOrderRevenue * 0.10;
      
      // Other costs
      const otherCost = totalOrderRevenue * 0.04;
      
      // Total operational costs
      const totalOperationalCost = ingredientsCost + utilitiesCost + staffCost + rentCost + otherCost;

      // Format expense data for charts
      const expenseData = [
        { 
          name: "Ingredients", 
          value: Math.round(ingredientsCost), 
          percentage: Math.round((ingredientsCost / totalOperationalCost) * 100) 
        },
        { 
          name: "Utilities", 
          value: Math.round(utilitiesCost), 
          percentage: Math.round((utilitiesCost / totalOperationalCost) * 100) 
        },
        { 
          name: "Staff", 
          value: Math.round(staffCost), 
          percentage: Math.round((staffCost / totalOperationalCost) * 100) 
        },
        { 
          name: "Rent", 
          value: Math.round(rentCost), 
          percentage: Math.round((rentCost / totalOperationalCost) * 100) 
        },
        { 
          name: "Other", 
          value: Math.round(otherCost), 
          percentage: Math.round((otherCost / totalOperationalCost) * 100) 
        }
      ];

      // Calculate peak hours data based on order timestamps
      const hourCounts: Record<string, number> = {};
      
      // Initialize all hours with 0
      for (let i = 9; i <= 22; i++) {
        const hourLabel = i < 12 ? `${i} AM` : i === 12 ? `${i} PM` : `${i-12} PM`;
        hourCounts[hourLabel] = 0;
      }
      
      // Count orders by hour
      if (typedOrderData) {
        typedOrderData.forEach(order => {
          const orderDate = new Date(order.created_at);
          const hour = orderDate.getHours();
          
          // Only count business hours (9 AM to 10 PM)
          if (hour >= 9 && hour <= 22) {
            const hourLabel = hour < 12 ? `${hour} AM` : hour === 12 ? `${hour} PM` : `${hour-12} PM`;
            hourCounts[hourLabel] = (hourCounts[hourLabel] || 0) + 1;
          }
        });
      }
      
      // Convert to array format for chart
      const peakHoursData = Object.entries(hourCounts).map(([hour, customers]) => ({
        hour,
        customers
      }));

      // Analyze orders by day of week
      const dayOfWeekCounts: Record<string, number> = { 'Mon': 0, 'Tue': 0, 'Wed': 0, 'Thu': 0, 'Fri': 0, 'Sat': 0, 'Sun': 0 };
      const dayOfWeekRevenue: Record<string, number> = { 'Mon': 0, 'Tue': 0, 'Wed': 0, 'Thu': 0, 'Fri': 0, 'Sat': 0, 'Sun': 0 };
      const dayPartCounts: Record<string, number> = { 
        'breakfast': 0, 
        'lunch': 0, 
        'evening': 0, 
        'dinner': 0, 
        'late-night': 0 
      };
      
      if (typedOrderData) {
        typedOrderData.forEach(order => {
          const orderDate = new Date(order.created_at);
          const dayOfWeek = format(orderDate, 'EEE');
          const hour = orderDate.getHours();
          
          // Update day of week counts and revenue
          dayOfWeekCounts[dayOfWeek] = (dayOfWeekCounts[dayOfWeek] || 0) + 1;
          dayOfWeekRevenue[dayOfWeek] = (dayOfWeekRevenue[dayOfWeek] || 0) + order.total;
          
          // Update day part counts
          if (hour >= 7 && hour < 11) {
            dayPartCounts['breakfast'] += 1;
          } else if (hour >= 11 && hour < 15) {
            dayPartCounts['lunch'] += 1;
          } else if (hour >= 15 && hour < 18) {
            dayPartCounts['evening'] += 1;
          } else if (hour >= 18 && hour < 22) {
            dayPartCounts['dinner'] += 1;
          } else {
            dayPartCounts['late-night'] += 1;
          }
        });
      }

      // Find the slowest weekday by order count
      const weekdayEntries = Object.entries(dayOfWeekCounts)
        .filter(([day]) => !['Sat', 'Sun'].includes(day));
      
      const slowestWeekday = weekdayEntries.length > 0 ? 
        [...weekdayEntries].sort((a, b) => a[1] - b[1])[0][0] : 'Mon';
      
      // Find the lowest performing day part
      const lowestDayPart = Object.entries(dayPartCounts)
        .sort((a, b) => a[1] - b[1])[0][0];

      // Get revenue trend from daily_revenue_stats
      let revenueTrend = 0;
      
      if (typedRevenueStats && typedRevenueStats.length >= 2) {
        const lastWeekRevenue = typedRevenueStats.slice(-7).reduce((sum, day) => sum + day.total_revenue, 0);
        const previousWeekRevenue = typedRevenueStats.slice(-14, -7).reduce((sum, day) => sum + day.total_revenue, 0);
        
        if (previousWeekRevenue > 0) {
          revenueTrend = ((lastWeekRevenue - previousWeekRevenue) / previousWeekRevenue) * 100;
        }
      }

      // Find low inventory items
      const lowStockItems = typedInventoryData.filter(item => 
        item.quantity <= (item.reorder_level || 0)
      ) || [];

      // Create promotional suggestions based on data analysis
      const promotionalData = [
        { 
          id: 1, 
          name: "Happy Hour", 
          timePeriod: "5 PM - 7 PM", 
          potentialIncrease: "25%", 
          status: peakHoursData.find(d => d.hour === "5 PM")?.customers < 
                 (Math.max(...peakHoursData.map(h => h.customers)) * 0.7) ? "suggested" : "active" 
        },
        { 
          id: 2, 
          name: "Weekend Brunch", 
          timePeriod: "Sat-Sun, 10 AM - 2 PM", 
          potentialIncrease: "35%", 
          status: dayOfWeekCounts['Sat'] > dayOfWeekCounts['Sun'] * 1.5 ? "active" : "suggested" 
        },
        { 
          id: 3, 
          name: `${slowestWeekday} Special`, 
          timePeriod: `Every ${slowestWeekday}`, 
          potentialIncrease: "20%", 
          status: "suggested" 
        },
        { 
          id: 4, 
          name: "Corporate Lunch", 
          timePeriod: "Weekdays, 12 PM - 2 PM", 
          potentialIncrease: "30%", 
          status: lowestDayPart === 'lunch' ? "suggested" : "active" 
        },
        { 
          id: 5, 
          name: "Seasonal Menu", 
          timePeriod: format(new Date(), 'MMM - ') + format(addDays(new Date(), 90), 'MMM'), 
          potentialIncrease: "40%", 
          status: "suggested" 
        }
      ];

      // For document analysis, use actual order data
      // Recent orders converted to "documents" for analysis
      const documents = typedOrderData ? typedOrderData.slice(0, 5).map(order => {
        return {
          name: `Order_${order.id.slice(0, 8)}.xlsx`,
          type: "Excel",
          date: format(new Date(order.created_at), 'yyyy-MM-dd'),
          insights: `Order total: ₹${order.total} with ${order.items.length} items`
        };
      }) : [];

      // Create business insights based on data analysis
      const insights = [];
      
      // Low inventory insights
      if (lowStockItems.length > 0) {
        insights.push({
          type: "inventory",
          title: "Inventory Alert",
          message: `${lowStockItems.length} items are below reorder level and need attention.`
        });
      }
      
      // Revenue insights based on day of week analysis
      const lowestRevenueDay = Object.entries(dayOfWeekRevenue)
        .filter(([day]) => !['Sat', 'Sun'].includes(day))
        .sort((a, b) => a[1] - b[1])[0];
      
      if (lowestRevenueDay) {
        const [day, revenue] = lowestRevenueDay;
        const highestRevenueWeekday = Object.entries(dayOfWeekRevenue)
          .filter(([d]) => !['Sat', 'Sun'].includes(d))
          .sort((a, b) => b[1] - a[1])[0];
        
        const percentageDifference = highestRevenueWeekday[1] > 0 ? 
          Math.round(((highestRevenueWeekday[1] - revenue) / highestRevenueWeekday[1]) * 100) : 0;
        
        insights.push({
          type: "revenue",
          title: "Revenue Opportunity",
          message: `${day} ${lowestDayPart} hours are underperforming by ${percentageDifference}% compared to other weekdays. Consider a lunch special promotion.`
        });
      }
      
      // Seasonal opportunity
      const currentMonth = format(new Date(), 'MMMM');
      insights.push({
        type: "seasonal",
        title: "Seasonal Opportunity",
        message: `${currentMonth} is approaching. Prepare special promotions to increase traffic based on previous year's data.`
      });

      // Add inventory cost insight if relevant
      const highCostCategory: Record<string, number> = {};
      
      if (typedInventoryData) {
        typedInventoryData.forEach(item => {
          if (!highCostCategory[item.category]) {
            highCostCategory[item.category] = 0;
          }
          highCostCategory[item.category] += (item.cost_per_unit || 0) * (item.quantity || 0);
        });
      }
      
      if (Object.keys(highCostCategory).length > 0) {
        const sortedCategories = Object.entries(highCostCategory)
          .sort((a, b) => b[1] - a[1]);
        
        if (sortedCategories.length > 0) {
          const [topCategory, cost] = sortedCategories[0];
          const percentOfTotal = Math.round((cost / ingredientsCost) * 100);
          
          if (percentOfTotal > 30) {
            insights.push({
              type: "inventory",
              title: "Inventory Cost Analysis",
              message: `${topCategory} costs account for ${percentOfTotal}% of your inventory expenses. Consider alternative suppliers or menu adjustments.`
            });
          }
        }
      }

      // Prepare weekday distribution data for charts
      const weekdayData = Object.entries(dayOfWeekCounts).map(([day, count]) => ({
        day,
        orders: count
      }));

      // Prepare staffing distribution by role
      const staffByRole: Record<string, number> = {};
      
      if (typedStaffData) {
        typedStaffData.forEach(staff => {
          const role = staff.position || 'Unassigned';
          if (!staffByRole[role]) {
            staffByRole[role] = 0;
          }
          staffByRole[role] += 1;
        });
      }
      
      const staffDistribution = Object.entries(staffByRole).map(([role, count]) => ({
        role,
        count
      }));

      // Get inventory by category
      const inventoryByCategory: Record<string, number> = {};
      
      if (typedInventoryData) {
        typedInventoryData.forEach(item => {
          const category = item.category || 'Other';
          if (!inventoryByCategory[category]) {
            inventoryByCategory[category] = 0;
          }
          inventoryByCategory[category] += 1;
        });
      }
      
      const inventoryDistribution = Object.entries(inventoryByCategory).map(([category, count]) => ({
        category,
        count
      }));

      // Revenue trend data
      const revenueTrendData = typedRevenueStats ? typedRevenueStats.map(day => ({
        date: day.date,
        revenue: day.total_revenue,
        orders: day.order_count,
        average: day.average_order_value
      })) : [];

      // Calculate top selling item categories from orders
      const itemCategoryCounts: Record<string, number> = {};
      
      if (typedOrderData) {
        typedOrderData.forEach(order => {
          if (order.items && Array.isArray(order.items)) {
            order.items.forEach((item) => {
              if (typeof item === 'object' && item !== null) {
                const category = item.category || 'Uncategorized';
                if (!itemCategoryCounts[category]) {
                  itemCategoryCounts[category] = 0;
                }
                itemCategoryCounts[category] += item.quantity || 1;
              }
            });
          }
        });
      }
      
      const topCategories = Object.entries(itemCategoryCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([category, count]) => ({
          category,
          count
        }));

      return {
        expenseData,
        peakHoursData,
        promotionalData,
        documents,
        insights,
        totalOperationalCost,
        staffData: typedStaffData || [],
        revenueTrend,
        weekdayData,
        staffDistribution,
        inventoryDistribution,
        revenueTrendData,
        topCategories,
        lowStockItems: lowStockItems.map(item => ({
          name: item.name,
          quantity: item.quantity,
          reorderLevel: item.reorder_level
        }))
      };
    },
    refetchInterval: 60000, // Refetch every minute
  });
};
