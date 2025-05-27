import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, startOfWeek, addDays, isSameDay } from "date-fns";
import { useExpenseData } from "./useExpenseData";

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
  name: string;
  quantity: number;
  price?: number;
  category?: string;
  modifiers?: string[];
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

// Define proper types for promotional campaigns from database
interface PromotionCampaign {
  id: string;
  name: string;
  description: string | null;
  start_date: string;
  end_date: string;
  discount_percentage: number;
  discount_amount: number;
  promotion_code: string | null;
  restaurant_id: string;
  status: "active" | "suggested" | "paused";
  time_period: string | null;
  potential_increase: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Define proper types for promotional data used in UI
interface Promotion {
  id: number;
  name: string;
  timePeriod: string;
  potentialIncrease: string;
  status: "active" | "suggested" | "paused";
  description?: string;
}

export const useBusinessDashboardData = () => {
  const { data: expenseDataFromHook } = useExpenseData();

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

      // Fetch promotional campaigns from database
      const { data: promotionCampaigns } = await supabase
        .from("promotion_campaigns")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .order("created_at", { ascending: false });

      // Fetch orders data with date range
      const thirtyDaysAgo = subDays(new Date(), 30);
      const formattedDate = thirtyDaysAgo.toISOString();

      const { data: orderData } = await supabase
        .from("orders")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .gte("created_at", formattedDate)
        .order("created_at", { ascending: false });

      // Fetch menu items to get category information
      const { data: menuItems } = await supabase
        .from("menu_items")
        .select("name, category")
        .eq("restaurant_id", restaurantId);

      // Create a map of item names to categories
      const itemCategoryMap: Record<string, string> = {};
      if (menuItems) {
        menuItems.forEach(item => {
          itemCategoryMap[item.name] = item.category || 'Uncategorized';
        });
      }

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

      // Cast data to proper types and handle the items properly
      const typedOrderData: Order[] = orderData ? orderData.map(order => ({
        ...order,
        items: Array.isArray(order.items) ? order.items.map((item: any) => {
          // Handle both string and object formats
          if (typeof item === 'string') {
            return {
              name: item,
              quantity: 1,
              category: itemCategoryMap[item] || 'Uncategorized'
            };
          } else if (typeof item === 'object' && item !== null) {
            return {
              name: item.name || 'Unknown Item',
              quantity: item.quantity || 1,
              price: item.price,
              category: item.category || itemCategoryMap[item.name] || 'Uncategorized',
              modifiers: item.modifiers
            };
          }
          return {
            name: 'Unknown Item',
            quantity: 1,
            category: 'Uncategorized'
          };
        }) : []
      })) : [];

      const typedInventoryData = inventoryData as InventoryItem[] || [];
      const typedStaffData = staffData as StaffMember[] || [];
      const typedRevenueStats = revenueStats as RevenueStats[] || [];

      // Use live expense data from the expense hook
      const expenseBreakdown = expenseDataFromHook?.expenseBreakdown || [
        { name: "Ingredients", value: 0, percentage: 0 },
        { name: "Utilities", value: 0, percentage: 0 },
        { name: "Staff", value: 0, percentage: 0 },
        { name: "Rent", value: 0, percentage: 0 },
        { name: "Other", value: 0, percentage: 0 }
      ];

      // Calculate expense breakdown based on live data
      const totalOrderRevenue = typedOrderData.reduce((sum, order) => sum + order.total, 0) || 0;
      
      // Calculate ingredient costs (from inventory)
      const ingredientsCost = typedInventoryData.reduce((sum, item) => {
        return item.category.toLowerCase().includes("ingredient") ? 
          sum + (item.cost_per_unit || 0) * (item.quantity || 0) : sum;
      }, 0) || 0;

      // Utilities cost estimation (12% of total revenue)
      const utilitiesCost = totalOrderRevenue * 0.12;
      
      // Staff cost calculation based on live staff data
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

      // Format expense data for charts - use live data if available, otherwise use calculated estimates
      const expenseData = expenseDataFromHook?.expenseBreakdown && expenseDataFromHook.expenseBreakdown.length > 0 
        ? expenseDataFromHook.expenseBreakdown 
        : [
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

      // Convert database promotional campaigns to UI format
      const promotionalData: Promotion[] = (promotionCampaigns || []).map((campaign: PromotionCampaign, index: number) => ({
        id: index + 1,
        name: campaign.name,
        timePeriod: campaign.time_period || `${format(new Date(campaign.start_date), 'MMM dd')} - ${format(new Date(campaign.end_date), 'MMM dd')}`,
        potentialIncrease: campaign.potential_increase || `${campaign.discount_percentage || campaign.discount_amount}%`,
        status: campaign.status || (campaign.is_active ? "active" : "paused"),
        description: campaign.description || undefined
      }));

      // If no promotional campaigns exist, create some suggested ones based on data analysis
      if (promotionalData.length === 0) {
        // Analyze orders by day of week
        const dayOfWeekCounts: Record<string, number> = { 'Mon': 0, 'Tue': 0, 'Wed': 0, 'Thu': 0, 'Fri': 0, 'Sat': 0, 'Sun': 0 };
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
            
            // Update day of week counts
            dayOfWeekCounts[dayOfWeek] = (dayOfWeekCounts[dayOfWeek] || 0) + 1;
            
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

        // Create promotional suggestions based on data analysis
        promotionalData.push(
          { 
            id: 1, 
            name: "Happy Hour", 
            timePeriod: "5 PM - 7 PM", 
            potentialIncrease: "25%", 
            status: (peakHoursData.find(d => d.hour === "5 PM")?.customers || 0) < 
                   (Math.max(...peakHoursData.map(h => h.customers)) * 0.7) ? "suggested" : "active",
            description: "Boost evening revenue with discounted drinks and appetizers"
          },
          { 
            id: 2, 
            name: "Weekend Brunch", 
            timePeriod: "Sat-Sun, 10 AM - 2 PM", 
            potentialIncrease: "35%", 
            status: "suggested",
            description: "Attract weekend crowds with special brunch menu"
          },
          { 
            id: 3, 
            name: `${slowestWeekday} Special`, 
            timePeriod: `Every ${slowestWeekday}`, 
            potentialIncrease: "20%", 
            status: "suggested",
            description: `Boost sales on your slowest day with special offers`
          },
          { 
            id: 4, 
            name: "Corporate Lunch", 
            timePeriod: "Weekdays, 12 PM - 2 PM", 
            potentialIncrease: "30%", 
            status: lowestDayPart === 'lunch' ? "suggested" : "active",
            description: "Target office workers with quick lunch deals"
          }
        );
      }
      
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

      // For document analysis, use actual order data
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
      
      // Expense-based insights
      const totalMonthlyExpenses = expenseDataFromHook?.totalMonthlyExpenses || 0;
      if (totalMonthlyExpenses > 0) {
        const highestExpenseCategory = expenseData.reduce((max, current) => 
          current.value > max.value ? current : max
        );
        
        insights.push({
          type: "expense",
          title: "Expense Analysis",
          message: `${highestExpenseCategory.name} is your highest expense category this month at ₹${highestExpenseCategory.value}.`
        });
      }

      // Promotional insights
      if (promotionalData.filter(p => p.status === "active").length === 0) {
        insights.push({
          type: "revenue",
          title: "Promotional Opportunity",
          message: `No active promotions running. Consider activating suggested promotions to boost revenue.`
        });
      }
      
      // Seasonal opportunity
      const currentMonth = format(new Date(), 'MMMM');
      insights.push({
        type: "seasonal",
        title: "Seasonal Opportunity",
        message: `${currentMonth} is approaching. Prepare special promotions to increase traffic based on previous year's data.`
      });

      // Analyze orders by day of week
      const dayOfWeekCounts: Record<string, number> = { 'Mon': 0, 'Tue': 0, 'Wed': 0, 'Thu': 0, 'Fri': 0, 'Sat': 0, 'Sun': 0 };
      const dayOfWeekRevenue: Record<string, number> = { 'Mon': 0, 'Tue': 0, 'Wed': 0, 'Thu': 0, 'Fri': 0, 'Sat': 0, 'Sun': 0 };
      
      if (typedOrderData) {
        typedOrderData.forEach(order => {
          const orderDate = new Date(order.created_at);
          const dayOfWeek = format(orderDate, 'EEE');
          
          // Update day of week counts and revenue
          dayOfWeekCounts[dayOfWeek] = (dayOfWeekCounts[dayOfWeek] || 0) + 1;
          dayOfWeekRevenue[dayOfWeek] = (dayOfWeekRevenue[dayOfWeek] || 0) + order.total;
        });
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
      const categoryCounts: Record<string, number> = {};
      
      if (typedOrderData && typedOrderData.length > 0) {
        typedOrderData.forEach(order => {
          if (order.items && Array.isArray(order.items)) {
            order.items.forEach((item) => {
              const category = item.category || 'Uncategorized';
              const quantity = item.quantity || 1;
              
              if (!categoryCounts[category]) {
                categoryCounts[category] = 0;
              }
              categoryCounts[category] += quantity;
            });
          }
        });
      }
      
      // If no data from orders, add some default categories for display
      if (Object.keys(categoryCounts).length === 0) {
        categoryCounts['Appetizers'] = 0;
        categoryCounts['Main Course'] = 0;
        categoryCounts['Beverages'] = 0;
        categoryCounts['Desserts'] = 0;
      }
      
      const topCategories = Object.entries(categoryCounts)
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
        totalOperationalCost: totalMonthlyExpenses || totalOperationalCost,
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
        })),
        expenseTrendData: expenseDataFromHook?.expenseTrendData || [],
        staffExpenses: expenseDataFromHook?.staffExpenses || 0,
      };
    },
    refetchInterval: 60000,
  });
};
