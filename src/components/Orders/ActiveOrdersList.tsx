import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Search,
  Filter,
  Calendar as CalendarIcon,
  Download,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  formatDistanceToNow,
  subDays,
  startOfDay,
  endOfDay,
  isWithinInterval,
  format,
} from "date-fns";
import type { DateRange } from "react-day-picker";
import type { Json } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import PaymentDialog from "./POS/PaymentDialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCurrencyContext } from "@/contexts/CurrencyContext";
import { useAuth } from "@/hooks/useAuth";
import * as XLSX from "xlsx";

interface OrderItem {
  name: string;
  quantity: number;
  notes?: string[];
  price?: number;
}

interface ActiveOrder {
  id: string;
  source: string;
  status: "new" | "preparing" | "ready" | "completed" | "held";
  items: OrderItem[];
  created_at: string;
  discount_amount?: number;
  discount_percentage?: number;
}

interface ActiveOrdersListProps {
  onRecallOrder?: (payload: {
    items: any[];
    kitchenOrderId: string;
    source: string;
  }) => void;
}

const ActiveOrdersList = ({ onRecallOrder }: ActiveOrdersListProps = {}) => {
  const [activeOrders, setActiveOrders] = useState<ActiveOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<ActiveOrder | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("today");
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>(
    undefined
  );
  const [showCalendar, setShowCalendar] = useState(false);
  const [restaurantName, setRestaurantName] = useState("Restaurant");
  const { toast } = useToast();
  const { symbol: currencySymbol } = useCurrencyContext();
  const { user } = useAuth();

  // Check if user has admin/manager/owner role
  const canViewSensitiveData =
    user?.role?.toLowerCase() === "admin" ||
    user?.role?.toLowerCase() === "manager" ||
    user?.role?.toLowerCase() === "owner";

  useEffect(() => {
    const fetchActiveOrders = async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("restaurant_id")
        .eq("id", (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile?.restaurant_id) return;

      // Fetch restaurant name
      const { data: settings } = await supabase
        .from("restaurant_settings")
        .select("restaurant_name")
        .eq("restaurant_id", profile.restaurant_id)
        .single();

      if (settings?.restaurant_name) {
        setRestaurantName(settings.restaurant_name);
      }

      // Build query based on status filter
      let query = supabase
        .from("kitchen_orders")
        .select(
          `
          *,
          orders!kitchen_orders_order_id_fkey (
            discount_amount,
            discount_percentage
          )
        `
        )
        .eq("restaurant_id", profile.restaurant_id);

      // Only filter out completed orders if status filter is not "all"
      if (statusFilter !== "all") {
        if (statusFilter === "completed") {
          query = query.eq("status", "completed");
        } else {
          query = query.not("status", "eq", "completed");
          if (statusFilter !== "all") {
            query = query.eq("status", statusFilter);
          }
        }
      }

      const { data: orders } = await query.order("created_at", {
        ascending: false,
      });

      if (orders) {
        const formattedOrders: ActiveOrder[] = orders.map((order) => {
          const orderData = order.orders as any;
          return {
            id: order.id,
            source: order.source,
            status: order.status as
              | "new"
              | "preparing"
              | "ready"
              | "completed"
              | "held",
            items: parseOrderItems(order.items),
            created_at: order.created_at,
            discount_amount: orderData?.discount_amount || 0,
            discount_percentage: orderData?.discount_percentage || 0,
          };
        });

        setActiveOrders(formattedOrders);
      }
    };

    fetchActiveOrders();

    function parseOrderItems(items: Json): OrderItem[] {
      if (!items) return [];

      try {
        if (Array.isArray(items)) {
          return items.map((item) => {
            const itemObj = item as Record<string, any>;
            return {
              name:
                typeof itemObj.name === "string"
                  ? itemObj.name
                  : "Unknown Item",
              quantity:
                typeof itemObj.quantity === "number" ? itemObj.quantity : 1,
              notes: Array.isArray(itemObj.notes) ? itemObj.notes : [],
              price:
                typeof itemObj.price === "number" ? itemObj.price : undefined,
            };
          });
        }

        const parsedItems =
          typeof items === "string" ? JSON.parse(items) : items;

        if (Array.isArray(parsedItems)) {
          return parsedItems.map((item) => {
            const itemObj = item as Record<string, any>;
            return {
              name:
                typeof itemObj.name === "string"
                  ? itemObj.name
                  : "Unknown Item",
              quantity:
                typeof itemObj.quantity === "number" ? itemObj.quantity : 1,
              notes: Array.isArray(itemObj.notes) ? itemObj.notes : [],
              price:
                typeof itemObj.price === "number" ? itemObj.price : undefined,
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

            // Fetch the discount information from orders table
            supabase
              .from("orders")
              .select("discount_amount, discount_percentage")
              .eq("id", newOrder.order_id)
              .single()
              .then(({ data: orderData }) => {
                const formattedOrder: ActiveOrder = {
                  id: newOrder.id,
                  source: newOrder.source,
                  status: newOrder.status as
                    | "new"
                    | "preparing"
                    | "ready"
                    | "completed"
                    | "held",
                  items: parseOrderItems(newOrder.items),
                  created_at: newOrder.created_at,
                  discount_amount: orderData?.discount_amount || 0,
                  discount_percentage: orderData?.discount_percentage || 0,
                };

                setActiveOrders((prev) => [formattedOrder, ...prev]);
              });
          } else if (payload.eventType === "UPDATE") {
            const updatedOrder = payload.new;

            setActiveOrders((prev) => {
              const updatedOrders = prev.map((order) =>
                order.id === updatedOrder.id
                  ? {
                      ...order,
                      status: updatedOrder.status as
                        | "new"
                        | "preparing"
                        | "ready"
                        | "completed"
                        | "held",
                      items: parseOrderItems(updatedOrder.items),
                    }
                  : order
              );

              // If status filter is not "all" and not "completed", filter out completed orders
              if (statusFilter !== "all" && statusFilter !== "completed") {
                return updatedOrders.filter(
                  (order) => order.status !== "completed"
                );
              }

              return updatedOrders;
            });

            if (updatedOrder.status === "ready") {
              toast({
                title: "Order Ready!",
                description: `Order from ${updatedOrder.source} is ready for pickup`,
              });
              const audio = new Audio("/notification.mp3");
              audio.play().catch(console.error);
            }
          } else if (payload.eventType === "DELETE") {
            // Remove deleted order from UI immediately
            const deletedOrderId = payload.old.id;
            setActiveOrders((prev) =>
              prev.filter((order) => order.id !== deletedOrderId)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [toast, statusFilter]);

  // Apply date filtering
  const getDateFilteredOrders = (orders: ActiveOrder[]) => {
    const today = new Date();

    switch (dateFilter) {
      case "today":
        return orders.filter(
          (order) => new Date(order.created_at) >= startOfDay(today)
        );
      case "yesterday":
        return orders.filter((order) =>
          isWithinInterval(new Date(order.created_at), {
            start: startOfDay(subDays(today, 1)),
            end: startOfDay(today),
          })
        );
      case "last7days":
        return orders.filter(
          (order) => new Date(order.created_at) >= subDays(today, 7)
        );
      case "thisMonth":
        return orders.filter((order) => {
          const orderDate = new Date(order.created_at);
          return (
            orderDate.getMonth() === today.getMonth() &&
            orderDate.getFullYear() === today.getFullYear()
          );
        });
      case "custom":
        if (customDateRange?.from && customDateRange?.to) {
          return orders.filter((order) =>
            isWithinInterval(new Date(order.created_at), {
              start: startOfDay(customDateRange.from!),
              end: endOfDay(customDateRange.to!),
            })
          );
        }
        return orders;
      default:
        return orders;
    }
  };

  // Filter orders based on search term and date
  const filteredOrders = getDateFilteredOrders(activeOrders).filter((order) => {
    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      // Search in source
      if (order.source.toLowerCase().includes(searchLower)) {
        return true;
      }
      // Search in items
      return order.items.some((item) =>
        item.name.toLowerCase().includes(searchLower)
      );
    }

    return true;
  });

  // Calculate total for an order
  const calculateOrderTotal = (items: OrderItem[]): number => {
    return items.reduce((sum, item) => {
      const price = typeof item.price === "number" ? item.price : 0;
      return sum + price * item.quantity;
    }, 0);
  };

  // Calculate final total after discount
  const calculateFinalTotal = (
    items: OrderItem[],
    discountAmount?: number
  ): number => {
    const subtotal = calculateOrderTotal(items);
    const discount = discountAmount || 0;
    return subtotal - discount;
  };

  const getCardStyleByStatus = (status: string) => {
    switch (status) {
      case "preparing":
        return "bg-[#fee2e2] border-l-4 border-red-400";
      case "ready":
        return "bg-[#F2FCE2] border-l-4 border-green-400";
      case "completed":
        return "bg-[#e5f3ff] border-l-4 border-blue-400";
      case "held":
        return "bg-[#fef3c7] border-l-4 border-amber-400";
      default:
        return "bg-white border";
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "new":
        return "bg-yellow-100 text-yellow-800";
      case "preparing":
        return "bg-red-100 text-red-800";
      case "ready":
        return "bg-green-100 text-green-800";
      case "completed":
        return "bg-blue-100 text-blue-800";
      case "held":
        return "bg-amber-100 text-amber-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Export orders to Excel
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
      // Calculate totals
      const totalRevenue = filteredOrders.reduce(
        (sum, order) =>
          sum + calculateFinalTotal(order.items, order.discount_amount),
        0
      );
      const totalDiscount = filteredOrders.reduce(
        (sum, order) => sum + (order.discount_amount || 0),
        0
      );

      // Prepare data for export
      const exportData: Record<string, string>[] = filteredOrders.map(
        (order) => ({
          "Order ID": order.id.slice(0, 8) + "...",
          Source: order.source,
          Items: order.items.map((i) => `${i.quantity}x ${i.name}`).join(", "),
          "Gross Total": `${currencySymbol}${calculateOrderTotal(
            order.items
          ).toFixed(2)}`,
          Discount: order.discount_amount
            ? `${currencySymbol}${order.discount_amount.toFixed(2)} (${
                order.discount_percentage
              }%)`
            : "-",
          "Net Total": `${currencySymbol}${calculateFinalTotal(
            order.items,
            order.discount_amount
          ).toFixed(2)}`,
          Status: order.status,
          "Created Date": format(new Date(order.created_at), "yyyy-MM-dd"),
          "Created Time": format(new Date(order.created_at), "HH:mm:ss"),
        })
      );

      // Add empty row as separator
      exportData.push({
        "Order ID": "",
        Source: "",
        Items: "",
        "Gross Total": "",
        Discount: "",
        "Net Total": "",
        Status: "-",
        "Created Date": "",
        "Created Time": "",
      });

      // Add summary row
      exportData.push({
        "Order ID": "SUMMARY",
        Source: `Total Orders: ${filteredOrders.length}`,
        Items: "",
        "Gross Total": "",
        Discount: `${currencySymbol}${totalDiscount.toFixed(2)}`,
        "Net Total": `${currencySymbol}${totalRevenue.toFixed(2)}`,
        Status: "-",
        "Created Date": format(new Date(), "yyyy-MM-dd"),
        "Created Time": "",
      });

      // Create workbook and worksheet
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "POS Orders");

      // Generate filename: RestaurantName_POS_Orders_YYYY-MM-DD.xlsx
      const sanitizedRestaurantName = restaurantName.replace(
        /[^a-zA-Z0-9]/g,
        "_"
      );
      const dateStr = format(new Date(), "yyyy-MM-dd");
      const filename = `${sanitizedRestaurantName}_POS_Orders_${dateStr}.xlsx`;

      // Save file
      XLSX.writeFile(wb, filename);

      toast({
        title: "Export Successful",
        description: `Orders exported to ${filename}`,
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        variant: "destructive",
        title: "Export Failed",
        description: "An error occurred while exporting orders.",
      });
    }
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
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="held">Held Orders</SelectItem>
          </SelectContent>
        </Select>

        {/* Export button - Only visible to admin/manager/owner */}
        {canViewSensitiveData && (
          <Button
            variant="outline"
            size="icon"
            onClick={handleExportOrders}
            className="bg-green-50 hover:bg-green-100 border-green-200 dark:bg-green-900/20 dark:hover:bg-green-900/40 dark:border-green-700"
            title="Export to Excel"
          >
            <Download className="h-4 w-4 text-green-600 dark:text-green-400" />
          </Button>
        )}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Tabs
          defaultValue="today"
          value={dateFilter}
          onValueChange={(value) => {
            setDateFilter(value);
            if (value !== "custom") {
              setCustomDateRange(undefined);
            }
          }}
        >
          <TabsList>
            <TabsTrigger value="today">Today</TabsTrigger>
            <TabsTrigger value="yesterday">Yesterday</TabsTrigger>
            <TabsTrigger value="last7days">Last 7 Days</TabsTrigger>
            <TabsTrigger value="thisMonth">This Month</TabsTrigger>
            <TabsTrigger value="custom">Custom</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Custom Date Range Picker */}
        {dateFilter === "custom" && (
          <Popover open={showCalendar} onOpenChange={setShowCalendar}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-lg min-w-[160px] justify-start text-left font-normal text-sm"
              >
                <CalendarIcon className="mr-2 h-4 w-4 text-indigo-500" />
                {customDateRange?.from && customDateRange?.to ? (
                  <span>
                    {format(customDateRange.from, "MMM dd")} -{" "}
                    {format(customDateRange.to, "MMM dd")}
                  </span>
                ) : customDateRange?.from ? (
                  <span>{format(customDateRange.from, "MMM dd")} - ...</span>
                ) : (
                  <span className="text-muted-foreground">Pick dates</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <div className="p-3 border-b text-xs text-gray-500 dark:text-gray-400">
                💡 Click same date twice for single day
              </div>
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={customDateRange?.from || new Date()}
                selected={customDateRange}
                onSelect={(range) => {
                  if (range?.from && !range?.to) {
                    setCustomDateRange(range);
                  } else if (range?.from && range?.to) {
                    setCustomDateRange(range);
                    setShowCalendar(false);
                  }
                }}
                numberOfMonths={2}
                className="rounded-xl"
              />
              {customDateRange?.from && !customDateRange?.to && (
                <div className="p-2 border-t">
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full text-xs"
                    onClick={() => {
                      if (customDateRange.from) {
                        setCustomDateRange({
                          from: customDateRange.from,
                          to: customDateRange.from,
                        });
                        setShowCalendar(false);
                      }
                    }}
                  >
                    Select {format(customDateRange.from, "MMM dd")} only
                  </Button>
                </div>
              )}
            </PopoverContent>
          </Popover>
        )}
      </div>

      <div className="h-[calc(70vh-180px)] overflow-auto">
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {filteredOrders.length > 0 ? (
            filteredOrders.map((order) => (
              <Card
                key={order.id}
                className={`p-4 hover:shadow-md transition-shadow cursor-pointer ${getCardStyleByStatus(
                  order.status
                )}`}
                onClick={() => setSelectedOrder(order)}
              >
                <div className="flex flex-col h-full">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-sm truncate mr-2 flex-1">
                      {order.source}
                    </h3>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${getStatusBadgeColor(
                        order.status
                      )}`}
                    >
                      {order.status}
                    </span>
                  </div>

                  <div className="space-y-2 flex-1">
                    <div className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(order.created_at), {
                        addSuffix: true,
                      })}
                    </div>

                    <ul className="text-xs space-y-1 max-h-16 overflow-y-auto">
                      {order.items.map((item, index) => (
                        <li key={index} className="flex justify-between">
                          <span className="truncate flex-1">
                            {item.quantity}x {item.name}
                          </span>
                          <span className="pl-1">
                            {currencySymbol}
                            {item.price
                              ? (item.price * item.quantity).toFixed(2)
                              : "0.00"}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-2 pt-2 border-t flex justify-between items-center">
                    <div className="font-semibold text-sm">
                      Total: {currencySymbol}
                      {calculateFinalTotal(
                        order.items,
                        order.discount_amount
                      ).toFixed(2)}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedOrder(order);
                        }}
                      >
                        Details
                      </Button>
                      {order.status === "held" && onRecallOrder && (
                        <Button
                          variant="default"
                          size="sm"
                          className="text-xs bg-amber-600 hover:bg-amber-700"
                          onClick={async (e) => {
                            e.stopPropagation();

                            // Convert order items to POS OrderItem format
                            const recalledItems: any[] = order.items.map(
                              (item) => ({
                                id: crypto.randomUUID(),
                                menuItemId: undefined,
                                name: item.name,
                                price: item.price || 0,
                                quantity: item.quantity,
                                modifiers: item.notes || [],
                              })
                            );

                            // Do NOT delete the held order; send its ID back so POS can update it
                            onRecallOrder({
                              items: recalledItems,
                              kitchenOrderId: order.id,
                              source: order.source,
                            });

                            toast({
                              title: "Order Recalled",
                              description:
                                "Held order has been recalled to POS",
                            });
                          }}
                        >
                          Recall
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))
          ) : (
            <div className="col-span-full text-center p-4 text-muted-foreground">
              No orders found matching your filters
            </div>
          )}
        </div>
      </div>

      <PaymentDialog
        isOpen={selectedOrder !== null}
        onClose={() => setSelectedOrder(null)}
        orderItems={
          selectedOrder
            ? selectedOrder.items.map((item) => ({
                id: crypto.randomUUID(),
                menuItemId: undefined,
                name: item.name,
                price: item.price || 0,
                quantity: item.quantity,
                modifiers: item.notes || [],
              }))
            : []
        }
        onSuccess={() => setSelectedOrder(null)}
        tableNumber={selectedOrder?.source || undefined}
        orderId={selectedOrder?.id}
      />
    </div>
  );
};

export default ActiveOrdersList;
