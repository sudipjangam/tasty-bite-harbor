
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Search, Filter, Download, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useIsMobile } from "@/hooks/use-mobile";
import OrderList from "../OrderList";
import OrderStats from "../OrderStats";
import AddOrderForm from "../AddOrderForm";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { startOfToday, subDays, subMonths, startOfDay, endOfDay } from "date-fns";
import type { Order } from "@/types/orders";

const OrdersView = () => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [dateFilter, setDateFilter] = useState<string>("today");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const isMobile = useIsMobile();

  const getDateRange = (filter: string) => {
    const now = new Date();
    switch (filter) {
      case "today":
        return { start: startOfDay(now), end: endOfDay(now) };
      case "yesterday":
        return { 
          start: startOfDay(subDays(now, 1)), 
          end: endOfDay(subDays(now, 1)) 
        };
      case "last7days":
        return { start: startOfDay(subDays(now, 7)), end: endOfDay(now) };
      case "last30days":
        return { start: startOfDay(subDays(now, 30)), end: endOfDay(now) };
      case "lastMonth":
        return { 
          start: startOfDay(subMonths(now, 1)), 
          end: endOfDay(subDays(now, 1)) 
        };
      default:
        return { start: startOfToday(), end: endOfDay(now) };
    }
  };

  // Fetch both regular orders and kitchen orders (POS orders)
  const { data: orders, refetch: refetchOrders, isLoading } = useQuery({
    queryKey: ['all-orders', dateFilter],
    queryFn: async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("restaurant_id")
        .eq("id", (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile?.restaurant_id) {
        throw new Error("No restaurant found for user");
      }

      const dateRange = getDateRange(dateFilter);
      
      // Fetch regular orders
      const { data: regularOrders, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .eq('restaurant_id', profile.restaurant_id)
        .gte('created_at', dateRange.start.toISOString())
        .lte('created_at', dateRange.end.toISOString())
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      // Fetch kitchen orders (POS orders)
      const { data: kitchenOrders, error: kitchenError } = await supabase
        .from('kitchen_orders')
        .select('*')
        .eq('restaurant_id', profile.restaurant_id)
        .gte('created_at', dateRange.start.toISOString())
        .lte('created_at', dateRange.end.toISOString())
        .order('created_at', { ascending: false });

      if (kitchenError) throw kitchenError;

      // Convert kitchen orders to Order format
      const convertedKitchenOrders: Order[] = (kitchenOrders || []).map(ko => ({
        id: ko.id,
        customer_name: ko.source || 'POS Customer',
        items: Array.isArray(ko.items) ? ko.items.map((item: any) => `${item.quantity}x ${item.name}`) : [],
        total: Array.isArray(ko.items) ? ko.items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0) : 0,
        status: ko.status === 'new' ? 'pending' : ko.status === 'ready' ? 'completed' : ko.status as 'completed' | 'pending' | 'preparing' | 'ready' | 'cancelled',
        created_at: ko.created_at,
        restaurant_id: ko.restaurant_id || profile.restaurant_id,
        updated_at: ko.updated_at
      }));

      // Combine and sort all orders
      const allOrders = [...(regularOrders || []), ...convertedKitchenOrders];
      allOrders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      return allOrders as Order[];
    },
  });

  const handleOrderAdded = () => {
    setShowAddForm(false);
    setEditingOrder(null);
    refetchOrders();
  };

  const handleRefresh = () => {
    refetchOrders();
  };

  // Filter orders based on search and status
  const filteredOrders = orders?.filter(order => {
    const matchesSearch = !searchQuery || 
      order.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.items.some(item => item.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  }) || [];

  const orderStats = {
    totalOrders: filteredOrders.length || 0,
    pendingOrders: filteredOrders.filter(order => order.status === 'pending' || order.status === 'preparing').length || 0,
    completedOrders: filteredOrders.filter(order => order.status === 'completed').length || 0,
    totalRevenue: filteredOrders.reduce((sum, order) => sum + order.total, 0) || 0,
  };

  const getDateFilterLabel = () => {
    switch (dateFilter) {
      case "today": return "Today";
      case "yesterday": return "Yesterday";
      case "last7days": return "Last 7 Days";
      case "last30days": return "Last 30 Days";
      case "lastMonth": return "Last Month";
      default: return "Today";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex-shrink-0">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Orders Management</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Manage and track your restaurant orders • {getDateFilterLabel()}
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              variant="outline" 
              onClick={handleRefresh}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            
            <Button 
              onClick={() => setShowAddForm(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              New Order
            </Button>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="flex flex-col lg:flex-row gap-4 mt-6">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search orders, customers, or items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Orders</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="preparing">Preparing</SelectItem>
              <SelectItem value="ready">Ready</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>

          {/* Date Filter */}
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Select time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="yesterday">Yesterday</SelectItem>
              <SelectItem value="last7days">Last 7 Days</SelectItem>
              <SelectItem value="last30days">Last 30 Days</SelectItem>
              <SelectItem value="lastMonth">Last Month</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Active Filters */}
        {(searchQuery || statusFilter !== "all") && (
          <div className="flex flex-wrap gap-2 mt-4">
            {searchQuery && (
              <Badge variant="secondary" className="flex items-center gap-1">
                Search: "{searchQuery}"
                <button 
                  onClick={() => setSearchQuery("")}
                  className="ml-1 hover:bg-gray-200 rounded-full w-4 h-4 flex items-center justify-center"
                >
                  ×
                </button>
              </Badge>
            )}
            {statusFilter !== "all" && (
              <Badge variant="secondary" className="flex items-center gap-1">
                Status: {statusFilter}
                <button 
                  onClick={() => setStatusFilter("all")}
                  className="ml-1 hover:bg-gray-200 rounded-full w-4 h-4 flex items-center justify-center"
                >
                  ×
                </button>
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Content with Scroll */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-6">
            <OrderStats 
              totalOrders={orderStats.totalOrders}
              pendingOrders={orderStats.pendingOrders}
              completedOrders={orderStats.completedOrders}
              totalRevenue={orderStats.totalRevenue}
            />

            <div className="mt-6">
              <OrderList 
                orders={filteredOrders} 
                onOrdersChange={refetchOrders}
                onEditOrder={setEditingOrder}
                isLoading={isLoading}
              />
            </div>
          </div>
        </ScrollArea>
      </div>

      {/* Add/Edit Order Dialog */}
      <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
        <DialogContent className={`${isMobile ? 'w-[95%] max-w-lg' : 'max-w-5xl'} max-h-[95vh] overflow-y-auto p-0`}>
          <AddOrderForm
            onSuccess={handleOrderAdded}
            onCancel={() => {
              setShowAddForm(false);
              setEditingOrder(null);
            }}
            editingOrder={editingOrder}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OrdersView;
