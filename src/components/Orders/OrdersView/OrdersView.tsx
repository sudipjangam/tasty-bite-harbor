import { useState, useEffect, useRef } from "react";
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
import { useToast } from "@/hooks/use-toast";
import * as XLSX from 'xlsx';
import { usePagination } from "@/hooks/usePagination";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { EnhancedSkeleton } from "@/components/ui/enhanced-skeleton";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { StandardizedLayout } from "@/components/ui/standardized-layout";

interface OrdersViewProps {
  searchTrigger?: number;
  filterTrigger?: number;
  exportTrigger?: number;
  refreshTrigger?: number;
}

const OrdersView = ({ 
  searchTrigger = 0, 
  filterTrigger = 0, 
  exportTrigger = 0, 
  refreshTrigger = 0 
}: OrdersViewProps) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [dateFilter, setDateFilter] = useState<string>("today");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Handle triggers from parent component
  useEffect(() => {
    if (searchTrigger > 0) {
      searchInputRef.current?.focus();
    }
  }, [searchTrigger]);

  useEffect(() => {
    if (filterTrigger > 0) {
      setShowFilters(!showFilters);
    }
  }, [filterTrigger]);

  useEffect(() => {
    if (exportTrigger > 0) {
      handleExportOrders();
    }
  }, [exportTrigger]);

  useEffect(() => {
    if (refreshTrigger > 0) {
      refetchOrders();
    }
  }, [refreshTrigger]);

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

  // Fetch all orders from all sources (POS, table, takeaway, dine-in, delivery, etc.)
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
      
      // Fetch all orders from orders table - includes POS, table, manual, room service, QSR, etc.
      const { data: allOrders, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .eq('restaurant_id', profile.restaurant_id)
        .gte('created_at', dateRange.start.toISOString())
        .lte('created_at', dateRange.end.toISOString())
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      return (allOrders || []) as Order[];
    },
  });

  // Real-time subscription for orders table to update UI immediately
  useRealtimeSubscription({
    table: 'orders',
    queryKey: ['all-orders', dateFilter],
    schema: 'public',
  });

  const handleOrderAdded = () => {
    setShowAddForm(false);
    setEditingOrder(null);
    refetchOrders();
  };

  const handleRefresh = () => {
    refetchOrders();
    toast({
      title: "Orders Refreshed",
      description: "Order data has been updated successfully.",
    });
  };

  const handleExportOrders = () => {
    if (!filteredOrders || filteredOrders.length === 0) {
      toast({
        variant: "destructive",
        title: "No Data to Export",
        description: "There are no orders to export for the selected filters.",
      });
      return;
    }

    try {
      // Prepare data for export
      const exportData = filteredOrders.map(order => ({
        'Order ID': order.id,
        'Customer Name': order.customer_name,
        'Items': order.items.join(', '),
        'Total Amount': `₹${order.total.toFixed(2)}`,
        'Status': order.status,
        'Created Date': new Date(order.created_at).toLocaleDateString(),
        'Created Time': new Date(order.created_at).toLocaleTimeString()
      }));

      // Create workbook and worksheet
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Orders");

      // Generate filename with current date
      const filename = `orders_export_${new Date().toISOString().split('T')[0]}.xlsx`;

      // Save file
      XLSX.writeFile(wb, filename);

      toast({
        title: "Export Successful",
        description: `Orders exported to ${filename}`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        variant: "destructive",
        title: "Export Failed",
        description: "Failed to export orders. Please try again.",
      });
    }
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

  const {
    currentPage,
    totalPages,
    paginatedData: paginatedOrders,
    goToPage,
    startIndex,
    endIndex,
    totalItems
  } = usePagination({
    data: filteredOrders,
    itemsPerPage,
    initialPage: 1
  });

  const orderStats = {
    totalOrders: filteredOrders.length || 0,
    pendingOrders: filteredOrders.filter(order => ['pending', 'preparing', 'ready', 'held'].includes(order.status)).length || 0,
    completedOrders: filteredOrders.filter(order => order.status === 'completed').length || 0,
    totalRevenue: filteredOrders.filter(order => order.status === 'completed').reduce((sum, order) => sum + order.total, 0) || 0,
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex-shrink-0">
          <EnhancedSkeleton type="orders" count={1} showHeader={false} />
        </div>
        <div className="flex-1 overflow-hidden">
          <div className="p-6">
            <EnhancedSkeleton type="orders" count={itemsPerPage} />
          </div>
        </div>
      </div>
    );
  }

  // Status tabs configuration
  const statusTabs = [
    { id: 'all', label: 'All Orders', count: orders?.length || 0 },
    { id: 'pending', label: 'New Orders', count: orders?.filter(o => o.status === 'pending').length || 0, color: 'bg-orange-100 text-orange-700 border-orange-200' },
    { id: 'preparing', label: 'Preparing', count: orders?.filter(o => o.status === 'preparing').length || 0, color: 'bg-blue-100 text-blue-700 border-blue-200' },
    { id: 'ready', label: 'Ready', count: orders?.filter(o => o.status === 'ready').length || 0, color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    { id: 'completed', label: 'Completed', count: orders?.filter(o => o.status === 'completed').length || 0, color: 'bg-gray-100 text-gray-700 border-gray-200' },
    { id: 'held', label: 'Held', count: orders?.filter(o => o.status === 'held').length || 0, color: 'bg-purple-100 text-purple-700 border-purple-200' },
    { id: 'cancelled', label: 'Cancelled', count: orders?.filter(o => o.status === 'cancelled').length || 0, color: 'bg-red-100 text-red-700 border-red-200' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-50 to-indigo-50/20 dark:from-gray-900 dark:via-slate-900 dark:to-indigo-950 flex flex-col">
      {/* Modern Header with Glass Effect */}
      <div className="sticky top-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200/50 dark:border-gray-800/50">
        <StandardizedLayout padding="md">
          <div className="flex flex-col gap-6 py-4">
            {/* Title and Actions */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-indigo-800 to-gray-900 dark:from-white dark:via-indigo-200 dark:to-white bg-clip-text text-transparent">
                  Orders Management
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                  Live Updates • {getDateFilterLabel()}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                 <Button 
                  variant="outline" 
                  onClick={handleRefresh}
                  disabled={isLoading}
                  className="bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 border shadow-sm transition-all duration-200 hidden sm:flex"
                >
                  <RefreshCw className={`h-3.5 w-3.5 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={handleExportOrders}
                  disabled={!filteredOrders || filteredOrders.length === 0}
                  className="bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 border shadow-sm transition-all duration-200"
                >
                  <Download className="h-3.5 w-3.5 mr-2" />
                  Export
                </Button>
              </div>
            </div>

            {/* Stats Overview */}
             <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center justify-between group hover:shadow-md transition-all">
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Active</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">{orderStats.pendingOrders}</p>
                </div>
                <div className="h-8 w-8 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center group-hover:bg-orange-100 transition-colors">
                  <RefreshCw className="h-4 w-4" />
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center justify-between group hover:shadow-md transition-all">
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Completed</p>
                  <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{orderStats.completedOrders}</p>
                </div>
                <div className="h-8 w-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
                  <Download className="h-4 w-4" />
                </div>
              </div>
              {/* Add more mini-stats as needed */}
            </div>

            {/* Modern Filter Bar */}
            <div className="flex flex-col lg:flex-row gap-4">
               {/* Search */}
               <div className="relative flex-1 group">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500 group-focus-within:text-indigo-500 transition-colors" />
                <Input
                  ref={searchInputRef}
                  placeholder="Search orders..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-white/50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-indigo-500/20 transition-all rounded-xl"
                />
              </div>

               {/* Date Filter */}
               <div className="flex items-center gap-2 overflow-x-auto pb-1 hide-scrollbar">
                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger className="w-[160px] bg-white/50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 rounded-xl">
                    <SelectValue placeholder="Date Range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="yesterday">Yesterday</SelectItem>
                    <SelectItem value="last7days">Last 7 Days</SelectItem>
                    <SelectItem value="last30days">Last 30 Days</SelectItem>
                    <SelectItem value="lastMonth">Last Month</SelectItem>
                  </SelectContent>
                 </Select>
                 
                 <Select value={sourceFilter} onValueChange={setSourceFilter}>
                  <SelectTrigger className="w-[150px] bg-white/50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 rounded-xl">
                    <SelectValue placeholder="Source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sources</SelectItem>
                    <SelectItem value="pos">POS</SelectItem>
                    <SelectItem value="table">Table Order</SelectItem>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="qsr">QSR</SelectItem>
                    <SelectItem value="room_service">Room Service</SelectItem>
                  </SelectContent>
                 </Select>
               </div>
            </div>

            {/* Status Tabs (Pills) */}
            <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
              {statusTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  className={`
                    whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 flex items-center gap-2 border
                    ${statusFilter === tab.id 
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200 dark:shadow-none' 
                      : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-indigo-300 hover:bg-gray-50'
                    }
                  `}
                >
                  {tab.label}
                  <span className={`
                    text-xs py-0.5 px-2 rounded-full 
                    ${statusFilter === tab.id 
                      ? 'bg-white/20 text-white' 
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                    }
                  `}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </StandardizedLayout>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden bg-gray-50/50 dark:bg-gray-950/50">
        <ScrollArea className="h-full">
          <div className="p-4 md:p-6 lg:max-w-7xl lg:mx-auto">
            <OrderList 
              orders={paginatedOrders} 
              onOrdersChange={refetchOrders}
              onEditOrder={setEditingOrder}
              isLoading={isLoading}
            />
            
            {totalPages > 1 && (
              <div className="mt-8">
                <DataTablePagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={totalItems}
                  itemsPerPage={itemsPerPage}
                  startIndex={startIndex}
                  endIndex={endIndex}
                  onPageChange={goToPage}
                  onItemsPerPageChange={setItemsPerPage}
                  showItemsPerPage={true}
                />
              </div>
            )}
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
