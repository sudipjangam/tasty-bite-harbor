import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurantId } from "./useRestaurantId";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { DateRange } from "react-day-picker";

export type ReportCategory = 
  | 'orders'
  | 'menu'
  | 'inventory'
  | 'customers'
  | 'staff'
  | 'suppliers'
  | 'expenses'
  | 'rooms'
  | 'recipes'
  | 'promotions';

export interface CategoryReportConfig {
  id: ReportCategory;
  name: string;
  description: string;
  icon: string;
  color: string;
}

export const REPORT_CATEGORIES: CategoryReportConfig[] = [
  { id: 'orders', name: 'Orders & Sales', description: 'Revenue, order count, payment breakdown', icon: 'ShoppingCart', color: 'bg-blue-500' },
  { id: 'menu', name: 'Menu Items', description: 'Top sellers, category performance', icon: 'UtensilsCrossed', color: 'bg-orange-500' },
  { id: 'inventory', name: 'Inventory', description: 'Stock levels, low stock alerts', icon: 'Package', color: 'bg-green-500' },
  { id: 'customers', name: 'Customers', description: 'Visit frequency, loyalty points', icon: 'Users', color: 'bg-purple-500' },
  { id: 'staff', name: 'Staff', description: 'Attendance, hours worked', icon: 'UserCheck', color: 'bg-indigo-500' },
  { id: 'suppliers', name: 'Suppliers', description: 'Purchase history, pending orders', icon: 'Truck', color: 'bg-yellow-500' },
  { id: 'expenses', name: 'Expenses', description: 'Expense breakdown, category totals', icon: 'Receipt', color: 'bg-red-500' },
  { id: 'rooms', name: 'Rooms/Hotel', description: 'Occupancy, revenue per room', icon: 'Bed', color: 'bg-teal-500' },
  { id: 'recipes', name: 'Recipes', description: 'Food cost, margin analysis', icon: 'ChefHat', color: 'bg-pink-500' },
  { id: 'promotions', name: 'Promotions', description: 'Campaign performance, discounts', icon: 'Tag', color: 'bg-cyan-500' },
];

export interface ReportData {
  category: ReportCategory;
  title: string;
  summary: Record<string, number | string>;
  tableData: Record<string, unknown>[];
  chartData?: Record<string, unknown>[];
}

export const useReportsData = (dateRange?: DateRange) => {
  const { restaurantId } = useRestaurantId();
  
  const startDate = dateRange?.from ? format(startOfDay(dateRange.from), "yyyy-MM-dd'T'HH:mm:ss") : format(subDays(new Date(), 30), "yyyy-MM-dd'T'HH:mm:ss");
  const endDate = dateRange?.to ? format(endOfDay(dateRange.to), "yyyy-MM-dd'T'HH:mm:ss") : format(new Date(), "yyyy-MM-dd'T'HH:mm:ss");

  // Orders Report
  const ordersReport = useQuery({
    queryKey: ['report-orders', restaurantId, startDate, endDate],
    queryFn: async () => {
      if (!restaurantId) return null;
      
      // Fetch orders with actual column names
      const { data: orders, error } = await supabase
        .from('orders')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      const totalRevenue = orders?.reduce((sum, o) => sum + (o.total || 0), 0) || 0;
      const orderCount = orders?.length || 0;
      const avgOrderValue = orderCount > 0 ? totalRevenue / orderCount : 0;
      const totalDiscount = orders?.reduce((sum, o) => sum + (o.discount_amount || 0), 0) || 0;
      
      // Group by order type
      const byType = orders?.reduce((acc, o) => {
        const type = o.order_type || 'dine-in';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};
      
      // Format orders for display
      const formattedOrders = orders?.map(o => ({
        'Order Date': format(new Date(o.created_at), 'MMM dd, yyyy HH:mm'),
        'Customer': o.customer_name || o.Customer_Name || 'Walk-in',
        'Phone': o.customer_phone || o.Customer_MobileNumber || '-',
        'Type': o.order_type || 'dine-in',
        'Source': o.source || 'POS',
        'Items': o.items,
        'Discount': o.discount_amount || 0,
        'Total': o.total || 0,
        'Status': o.status || 'completed',
      })) || [];

      return {
        category: 'orders' as ReportCategory,
        title: 'Orders & Sales Report',
        summary: {
          'Total Revenue': `₹${totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
          'Total Orders': orderCount,
          'Avg Order': `₹${avgOrderValue.toFixed(0)}`,
          'Total Discounts': `₹${totalDiscount.toFixed(0)}`,
        },
        tableData: formattedOrders,
        chartData: Object.entries(byType).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value })),
      } as ReportData;
    },
    enabled: !!restaurantId,
  });

  // Menu Report
  const menuReport = useQuery({
    queryKey: ['report-menu', restaurantId, startDate, endDate],
    queryFn: async () => {
      if (!restaurantId) return null;
      
      const [menuResult, ordersResult] = await Promise.all([
        supabase.from('menu_items').select('*').eq('restaurant_id', restaurantId),
        supabase.from('orders').select('items, total').eq('restaurant_id', restaurantId)
          .gte('created_at', startDate).lte('created_at', endDate),
      ]);
      
      if (menuResult.error) throw menuResult.error;
      
      const menuItems = menuResult.data || [];
      const orders = ordersResult.data || [];
      
      // Count item sales from orders
      const itemSales: Record<string, number> = {};
      orders.forEach(order => {
        if (order.items && Array.isArray(order.items)) {
          order.items.forEach((item: string) => {
            try {
              const parsed = typeof item === 'string' ? JSON.parse(item) : item;
              const name = parsed.name || item;
              itemSales[name] = (itemSales[name] || 0) + (parsed.quantity || 1);
            } catch {
              itemSales[item] = (itemSales[item] || 0) + 1;
            }
          });
        }
      });
      
      // Category breakdown
      const byCategory = menuItems.reduce((acc, item) => {
        acc[item.category] = (acc[item.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Format menu items for display
      const formattedItems = menuItems.map(item => ({
        'Item Name': item.name,
        'Category': item.category,
        'Price': `₹${item.price}`,
        'Units Sold': itemSales[item.name] || 0,
        'Available': item.is_available ? 'Yes' : 'No',
        'Veg': item.is_veg ? 'Veg' : 'Non-Veg',
        'Description': item.description?.substring(0, 50) || '-',
      })).sort((a, b) => b['Units Sold'] - a['Units Sold']);

      return {
        category: 'menu' as ReportCategory,
        title: 'Menu Performance Report',
        summary: {
          'Total Items': menuItems.length,
          'Available': menuItems.filter(i => i.is_available).length,
          'Categories': Object.keys(byCategory).length,
          'Total Sales': Object.values(itemSales).reduce((a, b) => a + b, 0),
        },
        tableData: formattedItems,
        chartData: Object.entries(byCategory).map(([name, value]) => ({ name, value })),
      } as ReportData;
    },
    enabled: !!restaurantId,
  });

  // Inventory Report
  const inventoryReport = useQuery({
    queryKey: ['report-inventory', restaurantId],
    queryFn: async () => {
      if (!restaurantId) return null;
      
      const { data: items, error } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('quantity', { ascending: true });
      
      if (error) throw error;
      
      const totalValue = items?.reduce((sum, i) => sum + (i.quantity * (i.cost_per_unit || 0)), 0) || 0;
      const lowStock = items?.filter(i => i.quantity <= (i.reorder_level || 10)) || [];
      
      const byCategory = items?.reduce((acc, item) => {
        acc[item.category] = (acc[item.category] || 0) + (item.quantity * (item.cost_per_unit || 0));
        return acc;
      }, {} as Record<string, number>) || {};

      // Format inventory for display
      const formattedInventory = items?.map(item => ({
        'Item Name': item.name,
        'Category': item.category,
        'Quantity': item.quantity,
        'Unit': item.unit || 'pcs',
        'Cost/Unit': `₹${(item.cost_per_unit || 0).toFixed(2)}`,
        'Total Value': `₹${(item.quantity * (item.cost_per_unit || 0)).toFixed(2)}`,
        'Status': item.quantity <= (item.reorder_level || 10) ? '⚠️ Low Stock' : '✓ OK',
      })) || [];

      return {
        category: 'inventory' as ReportCategory,
        title: 'Inventory Report',
        summary: {
          'Total Items': items?.length || 0,
          'Stock Value': `₹${totalValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
          'Low Stock': lowStock.length,
          'Categories': Object.keys(byCategory).length,
        },
        tableData: formattedInventory,
        chartData: Object.entries(byCategory).map(([name, value]) => ({ name, value: Number((value as number).toFixed(0)) })),
      } as ReportData;
    },
    enabled: !!restaurantId,
  });

  // Customers Report
  const customersReport = useQuery({
    queryKey: ['report-customers', restaurantId],
    queryFn: async () => {
      if (!restaurantId) return null;
      
      const { data: customers, error } = await supabase
        .from('customers')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('total_spent', { ascending: false });
      
      if (error) throw error;
      
      const totalCustomers = customers?.length || 0;
      const totalSpent = customers?.reduce((sum, c) => sum + (c.total_spent || 0), 0) || 0;
      const avgSpent = totalCustomers > 0 ? totalSpent / totalCustomers : 0;
      const loyaltyEnrolled = customers?.filter(c => c.loyalty_enrolled).length || 0;

      // Format customers for display
      const formattedCustomers = customers?.map(c => ({
        'Name': c.name,
        'Phone': c.phone || '-',
        'Email': c.email || '-',
        'Total Spent': `₹${(c.total_spent || 0).toLocaleString('en-IN')}`,
        'Visit Count': c.visit_count || 0,
        'Loyalty Points': c.loyalty_points || 0,
        'Loyalty Member': c.loyalty_enrolled ? 'Yes' : 'No',
      })) || [];

      return {
        category: 'customers' as ReportCategory,
        title: 'Customer Insights Report',
        summary: {
          'Total Customers': totalCustomers,
          'Total Revenue': `₹${totalSpent.toLocaleString('en-IN', { minimumFractionDigits: 0 })}`,
          'Avg Spend': `₹${avgSpent.toFixed(0)}`,
          'Loyalty Members': loyaltyEnrolled,
        },
        tableData: formattedCustomers,
        chartData: customers?.slice(0, 10).map(c => ({ name: c.name, value: c.total_spent || 0 })) || [],
      } as ReportData;
    },
    enabled: !!restaurantId,
  });

  // Staff Report
  const staffReport = useQuery({
    queryKey: ['report-staff', restaurantId, startDate, endDate],
    queryFn: async () => {
      if (!restaurantId) return null;
      
      const [staffResult, clockResult, leavesResult] = await Promise.all([
        supabase.from('staff').select('*').eq('restaurant_id', restaurantId),
        supabase.from('staff_clock_entries').select('*').eq('restaurant_id', restaurantId)
          .gte('clock_in', startDate).lte('clock_in', endDate),
        supabase.from('staff_leaves').select('*').eq('restaurant_id', restaurantId)
          .gte('start_date', startDate.split('T')[0]).lte('end_date', endDate.split('T')[0]),
      ]);
      
      const staff = staffResult.data || [];
      const clockEntries = clockResult.data || [];
      const leaves = leavesResult.data || [];
      
      // Calculate hours per staff
      const hoursByStaff: Record<string, number> = {};
      clockEntries.forEach(entry => {
        if (entry.clock_in && entry.clock_out) {
          const hours = (new Date(entry.clock_out).getTime() - new Date(entry.clock_in).getTime()) / (1000 * 60 * 60);
          hoursByStaff[entry.staff_id] = (hoursByStaff[entry.staff_id] || 0) + hours;
        }
      });

      return {
        category: 'staff' as ReportCategory,
        title: 'Staff Report',
        summary: {
          'Total Staff': staff.length,
          'Clock Entries': clockEntries.length,
          'Leave Requests': leaves.length,
        },
        tableData: staff.map(s => ({
          ...s,
          hoursWorked: (hoursByStaff[s.id] || 0).toFixed(1),
        })),
        chartData: staff.map(s => ({ name: `${s.first_name} ${s.last_name}`, value: hoursByStaff[s.id] || 0 })),
      } as ReportData;
    },
    enabled: !!restaurantId,
  });

  // Suppliers Report
  const suppliersReport = useQuery({
    queryKey: ['report-suppliers', restaurantId, startDate, endDate],
    queryFn: async () => {
      if (!restaurantId) return null;
      
      const [suppliersResult, ordersResult] = await Promise.all([
        supabase.from('suppliers').select('*').eq('restaurant_id', restaurantId),
        supabase.from('purchase_orders').select('*').eq('restaurant_id', restaurantId)
          .gte('created_at', startDate).lte('created_at', endDate),
      ]);
      
      const suppliers = suppliersResult.data || [];
      const purchaseOrders = ordersResult.data || [];
      
      const totalSpent = purchaseOrders.reduce((sum, po) => sum + (po.total_amount || 0), 0);
      const pendingOrders = purchaseOrders.filter(po => po.status === 'pending').length;
      
      // Spending by supplier
      const bySupplier: Record<string, number> = {};
      purchaseOrders.forEach(po => {
        bySupplier[po.supplier_id] = (bySupplier[po.supplier_id] || 0) + (po.total_amount || 0);
      });

      return {
        category: 'suppliers' as ReportCategory,
        title: 'Supplier Analysis Report',
        summary: {
          'Total Suppliers': suppliers.length,
          'Purchase Orders': purchaseOrders.length,
          'Total Spent': `₹${totalSpent.toFixed(2)}`,
          'Pending Orders': pendingOrders,
        },
        tableData: suppliers.map(s => ({
          ...s,
          totalSpent: bySupplier[s.id] || 0,
        })).sort((a, b) => b.totalSpent - a.totalSpent),
        chartData: suppliers.map(s => ({ name: s.name, value: bySupplier[s.id] || 0 })).filter(d => d.value > 0),
      } as ReportData;
    },
    enabled: !!restaurantId,
  });

  // Expenses Report
  const expensesReport = useQuery({
    queryKey: ['report-expenses', restaurantId, startDate, endDate],
    queryFn: async () => {
      if (!restaurantId) return null;
      
      const { data: expenses, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .gte('expense_date', startDate.split('T')[0])
        .lte('expense_date', endDate.split('T')[0])
        .order('expense_date', { ascending: false });
      
      if (error) throw error;
      
      const totalExpenses = expenses?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0;
      
      const byCategory = expenses?.reduce((acc, e) => {
        acc[e.category] = (acc[e.category] || 0) + (e.amount || 0);
        return acc;
      }, {} as Record<string, number>) || {};

      return {
        category: 'expenses' as ReportCategory,
        title: 'Expense Report',
        summary: {
          'Total Expenses': `₹${totalExpenses.toFixed(2)}`,
          'Expense Count': expenses?.length || 0,
          'Categories': Object.keys(byCategory).length,
        },
        tableData: expenses || [],
        chartData: Object.entries(byCategory).map(([name, value]) => ({ name, value })),
      } as ReportData;
    },
    enabled: !!restaurantId,
  });

  // Rooms Report
  const roomsReport = useQuery({
    queryKey: ['report-rooms', restaurantId, startDate, endDate],
    queryFn: async () => {
      if (!restaurantId) return null;
      
      const [roomsResult, reservationsResult, billingsResult] = await Promise.all([
        supabase.from('rooms').select('*').eq('restaurant_id', restaurantId),
        supabase.from('reservations').select('*').eq('restaurant_id', restaurantId)
          .gte('start_time', startDate).lte('end_time', endDate),
        supabase.from('room_billings').select('*').eq('restaurant_id', restaurantId)
          .gte('created_at', startDate).lte('created_at', endDate),
      ]);
      
      const rooms = roomsResult.data || [];
      const reservations = reservationsResult.data || [];
      const billings = billingsResult.data || [];
      
      const totalRevenue = billings.reduce((sum, b) => sum + (b.total_amount || 0), 0);
      const occupiedRooms = rooms.filter(r => r.status === 'occupied').length;

      return {
        category: 'rooms' as ReportCategory,
        title: 'Rooms/Hotel Report',
        summary: {
          'Total Rooms': rooms.length,
          'Occupied': occupiedRooms,
          'Reservations': reservations.length,
          'Revenue': `₹${totalRevenue.toFixed(2)}`,
        },
        tableData: rooms,
        chartData: rooms.map(r => ({ name: r.name, value: r.base_price || 0 })),
      } as ReportData;
    },
    enabled: !!restaurantId,
  });

  // Recipes Report
  const recipesReport = useQuery({
    queryKey: ['report-recipes', restaurantId],
    queryFn: async () => {
      if (!restaurantId) return null;
      
      const { data: recipes, error } = await supabase
        .from('recipes')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('food_cost_percentage', { ascending: false });
      
      if (error) throw error;
      
      const avgFoodCost = recipes?.length 
        ? recipes.reduce((sum, r) => sum + (r.food_cost_percentage || 0), 0) / recipes.length 
        : 0;
      const avgMargin = recipes?.length 
        ? recipes.reduce((sum, r) => sum + (r.margin_percentage || 0), 0) / recipes.length 
        : 0;

      return {
        category: 'recipes' as ReportCategory,
        title: 'Recipe Cost Analysis',
        summary: {
          'Total Recipes': recipes?.length || 0,
          'Avg Food Cost %': `${avgFoodCost.toFixed(1)}%`,
          'Avg Margin %': `${avgMargin.toFixed(1)}%`,
        },
        tableData: recipes || [],
        chartData: recipes?.slice(0, 10).map(r => ({ 
          name: r.name, 
          value: r.food_cost_percentage || 0,
          margin: r.margin_percentage || 0,
        })) || [],
      } as ReportData;
    },
    enabled: !!restaurantId,
  });

  // Promotions Report
  const promotionsReport = useQuery({
    queryKey: ['report-promotions', restaurantId, startDate, endDate],
    queryFn: async () => {
      if (!restaurantId) return null;
      
      const [campaignsResult, sentResult] = await Promise.all([
        supabase.from('promotion_campaigns').select('*').eq('restaurant_id', restaurantId),
        supabase.from('sent_promotions').select('*').eq('restaurant_id', restaurantId)
          .gte('sent_at', startDate).lte('sent_at', endDate),
      ]);
      
      const campaigns = campaignsResult.data || [];
      const sent = sentResult.data || [];
      
      const activeCampaigns = campaigns.filter(c => c.is_active).length;

      return {
        category: 'promotions' as ReportCategory,
        title: 'Promotions Report',
        summary: {
          'Total Campaigns': campaigns.length,
          'Active': activeCampaigns,
          'Messages Sent': sent.length,
        },
        tableData: campaigns,
        chartData: campaigns.map(c => ({ name: c.name, value: c.discount_percentage || c.discount_amount || 0 })),
      } as ReportData;
    },
    enabled: !!restaurantId,
  });

  // Get report by category
  const getReportByCategory = (category: ReportCategory): ReportData | null | undefined => {
    switch (category) {
      case 'orders': return ordersReport.data;
      case 'menu': return menuReport.data;
      case 'inventory': return inventoryReport.data;
      case 'customers': return customersReport.data;
      case 'staff': return staffReport.data;
      case 'suppliers': return suppliersReport.data;
      case 'expenses': return expensesReport.data;
      case 'rooms': return roomsReport.data;
      case 'recipes': return recipesReport.data;
      case 'promotions': return promotionsReport.data;
      default: return null;
    }
  };

  const isLoadingCategory = (category: ReportCategory): boolean => {
    switch (category) {
      case 'orders': return ordersReport.isLoading;
      case 'menu': return menuReport.isLoading;
      case 'inventory': return inventoryReport.isLoading;
      case 'customers': return customersReport.isLoading;
      case 'staff': return staffReport.isLoading;
      case 'suppliers': return suppliersReport.isLoading;
      case 'expenses': return expensesReport.isLoading;
      case 'rooms': return roomsReport.isLoading;
      case 'recipes': return recipesReport.isLoading;
      case 'promotions': return promotionsReport.isLoading;
      default: return false;
    }
  };

  const isFetchingCategory = (category: ReportCategory): boolean => {
    switch (category) {
      case 'orders': return ordersReport.isFetching;
      case 'menu': return menuReport.isFetching;
      case 'inventory': return inventoryReport.isFetching;
      case 'customers': return customersReport.isFetching;
      case 'staff': return staffReport.isFetching;
      case 'suppliers': return suppliersReport.isFetching;
      case 'expenses': return expensesReport.isFetching;
      case 'rooms': return roomsReport.isFetching;
      case 'recipes': return recipesReport.isFetching;
      case 'promotions': return promotionsReport.isFetching;
      default: return false;
    }
  };

  const getReportError = (category: ReportCategory): Error | null => {
    switch (category) {
      case 'orders': return ordersReport.error;
      case 'menu': return menuReport.error;
      case 'inventory': return inventoryReport.error;
      case 'customers': return customersReport.error;
      case 'staff': return staffReport.error;
      case 'suppliers': return suppliersReport.error;
      case 'expenses': return expensesReport.error;
      case 'rooms': return roomsReport.error;
      case 'recipes': return recipesReport.error;
      case 'promotions': return promotionsReport.error;
      default: return null;
    }
  };

  // Generate combined report for multiple categories
  const getCombinedReport = (categories: ReportCategory[]): ReportData[] => {
    return categories
      .map(cat => getReportByCategory(cat))
      .filter((report): report is ReportData => report !== null && report !== undefined);
  };

  return {
    // Individual reports
    ordersReport,
    menuReport,
    inventoryReport,
    customersReport,
    staffReport,
    suppliersReport,
    expensesReport,
    roomsReport,
    recipesReport,
    promotionsReport,
    // Utility functions
    getReportByCategory,
    isLoadingCategory,
    isFetchingCategory,
    getReportError,
    getCombinedReport,
    // Categories config
    categories: REPORT_CATEGORIES,
  };
};

export default useReportsData;
