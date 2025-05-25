
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Search, Filter, Calendar } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow, subDays, startOfDay, isWithinInterval } from "date-fns";
import type { Json } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import OrderDetailsDialog from "./OrderDetailsDialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface OrderItem {
  name: string;
  quantity: number;
  notes?: string[];
  price?: number;
}

interface ActiveOrder {
  id: string;
  source: string;
  status: "new" | "preparing" | "ready" | "completed"; // Added "completed" to the type
  items: OrderItem[];
  created_at: string;
}

const ActiveOrdersList = () => {
  const [activeOrders, setActiveOrders] = useState<ActiveOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<ActiveOrder | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("today");
  const { toast } = useToast();

  useEffect(() => {
    const fetchActiveOrders = async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("restaurant_id")
        .eq("id", (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile?.restaurant_id) return;

      const { data: orders } = await supabase
        .from("kitchen_orders")
        .select("*")
        .eq("restaurant_id", profile.restaurant_id)
        .not("status", "eq", "completed")
        .order("created_at", { ascending: false });

      if (orders) {
        const formattedOrders: ActiveOrder[] = orders.map(order => ({
          id: order.id,
          source: order.source,
          status: order.status as "new" | "preparing" | "ready" | "completed",
          items: parseOrderItems(order.items),
          created_at: order.created_at
        }));
        
        setActiveOrders(formattedOrders);
      }
    };

    fetchActiveOrders();

    function parseOrderItems(items: Json): OrderItem[] {
      if (!items) return [];
      
      try {
        if (Array.isArray(items)) {
          return items.map(item => {
            const itemObj = item as Record<string, any>;
            return {
              name: typeof itemObj.name === 'string' ? itemObj.name : "Unknown Item",
              quantity: typeof itemObj.quantity === 'number' ? itemObj.quantity : 1,
              notes: Array.isArray(itemObj.notes) ? itemObj.notes : [],
              price: typeof itemObj.price === 'number' ? itemObj.price : undefined,
            };
          });
        }
        
        const parsedItems = typeof items === 'string' ? JSON.parse(items) : items;
        
        if (Array.isArray(parsedItems)) {
          return parsedItems.map(item => {
            const itemObj = item as Record<string, any>;
            return {
              name: typeof itemObj.name === 'string' ? itemObj.name : "Unknown Item",
              quantity: typeof itemObj.quantity === 'number' ? itemObj.quantity : 1,
              notes: Array.isArray(itemObj.notes) ? itemObj.notes : [],
              price: typeof itemObj.price === 'number' ? itemObj.price : undefined,
            };
          });
        }
        
        return [];
      } catch (error) {
        console.error("Error parsing order items:", error);
        return [];
      }
    }

    const channel = supabase
      .channel("kitchen-orders-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "kitchen_orders",
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newOrder = payload.new;
            const formattedOrder: ActiveOrder = {
              id: newOrder.id,
              source: newOrder.source,
              status: newOrder.status as "new" | "preparing" | "ready" | "completed",
              items: parseOrderItems(newOrder.items),
              created_at: newOrder.created_at
            };
            
            setActiveOrders((prev) => [formattedOrder, ...prev]);
          } else if (payload.eventType === "UPDATE") {
            const updatedOrder = payload.new;
            
            setActiveOrders((prev) =>
              prev.map((order) =>
                order.id === updatedOrder.id 
                  ? {
                      ...order,
                      status: updatedOrder.status as "new" | "preparing" | "ready" | "completed",
                      items: parseOrderItems(updatedOrder.items)
                    } 
                  : order
              ).filter(order => order.status !== "completed")
            );
            
            if (updatedOrder.status === "ready") {
              toast({
                title: "Order Ready!",
                description: `Order from ${updatedOrder.source} is ready for pickup`,
              });
              const audio = new Audio("/notification.mp3");
              audio.play().catch(console.error);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [toast]);

  // Apply date filtering
  const getDateFilteredOrders = (orders: ActiveOrder[]) => {
    const today = new Date();
    
    switch (dateFilter) {
      case "today":
        return orders.filter(order => 
          new Date(order.created_at) >= startOfDay(today)
        );
      case "yesterday":
        return orders.filter(order => 
          isWithinInterval(new Date(order.created_at), {
            start: startOfDay(subDays(today, 1)),
            end: startOfDay(today)
          })
        );
      case "last7days":
        return orders.filter(order => 
          new Date(order.created_at) >= subDays(today, 7)
        );
      case "thisMonth":
        return orders.filter(order => {
          const orderDate = new Date(order.created_at);
          return orderDate.getMonth() === today.getMonth() && 
                 orderDate.getFullYear() === today.getFullYear();
        });
      default:
        return orders;
    }
  };

  // Filter orders based on search term, status, and date
  const filteredOrders = getDateFilteredOrders(activeOrders).filter(order => {
    // Filter by status
    if (statusFilter !== "all" && order.status !== statusFilter) {
      return false;
    }

    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      // Search in source
      if (order.source.toLowerCase().includes(searchLower)) {
        return true;
      }
      // Search in items
      return order.items.some(item => 
        item.name.toLowerCase().includes(searchLower)
      );
    }
    
    return true;
  });

  // Calculate total for an order
  const calculateOrderTotal = (items: OrderItem[]): number => {
    return items.reduce((sum, item) => {
      const price = typeof item.price === 'number' ? item.price : 0;
      return sum + (price * item.quantity);
    }, 0);
  };

  const getCardStyleByStatus = (status: string) => {
    switch (status) {
      case "preparing":
        return "bg-[#fee2e2] border-l-4 border-red-400";
      case "ready":
        return "bg-[#F2FCE2] border-l-4 border-green-400";
      default:
        return "bg-white border";
    }
  };

  const handleEditOrder = (orderId: string) => {
    // Will be implemented in OrderDetailsDialog
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="flex-1 relative min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <Input
            placeholder="Search orders..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Orders</SelectItem>
            <SelectItem value="new">New Orders</SelectItem>
            <SelectItem value="preparing">Preparing</SelectItem>
            <SelectItem value="ready">Ready</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div className="mb-4">
        <Tabs defaultValue="today" value={dateFilter} onValueChange={setDateFilter}>
          <TabsList>
            <TabsTrigger value="today">Today</TabsTrigger>
            <TabsTrigger value="yesterday">Yesterday</TabsTrigger>
            <TabsTrigger value="last7days">Last 7 Days</TabsTrigger>
            <TabsTrigger value="thisMonth">This Month</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      
      <div className="h-[calc(70vh-180px)] overflow-auto">
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {filteredOrders.length > 0 ? filteredOrders.map((order) => (
            <Card 
              key={order.id} 
              className={`p-4 hover:shadow-md transition-shadow cursor-pointer ${getCardStyleByStatus(order.status)}`}
              onClick={() => setSelectedOrder(order)}
            >
              <div className="flex flex-col h-full">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-sm truncate mr-2 flex-1">{order.source}</h3>
                  <span className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700">
                    {order.status}
                  </span>
                </div>
                
                <div className="space-y-2 flex-1">
                  <div className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}
                  </div>
                  
                  <ul className="text-xs space-y-1 max-h-16 overflow-y-auto">
                    {order.items.map((item, index) => (
                      <li key={index} className="flex justify-between">
                        <span className="truncate flex-1">{item.quantity}x {item.name}</span>
                        <span className="pl-1">₹{item.price ? (item.price * item.quantity).toFixed(2) : '0.00'}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-2 pt-2 border-t flex justify-between items-center">
                  <div className="font-semibold text-sm">
                    Total: ₹{calculateOrderTotal(order.items).toFixed(2)}
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedOrder(order);
                    }}
                  >
                    View Details
                  </Button>
                </div>
              </div>
            </Card>
          )) : (
            <div className="col-span-full text-center p-4 text-muted-foreground">
              No orders found matching your filters
            </div>
          )}
        </div>
      </div>

      <OrderDetailsDialog
        isOpen={selectedOrder !== null}
        onClose={() => setSelectedOrder(null)}
        order={selectedOrder}
        onPrintBill={() => {}}
        onEditOrder={() => {}}
      />
    </div>
  );
};

export default ActiveOrdersList;
