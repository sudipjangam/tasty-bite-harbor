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
import type { OrderItem as GlobalOrderItem } from "@/types/orders";
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
import { exportToExcel } from "@/utils/exportUtils";

interface LocalOrderItem {
  name: string;
  quantity: number;
  notes?: string[];
  price?: number;
}

interface ActiveOrder {
  id: string;
  source: string;
  status: "new" | "preparing" | "ready" | "completed" | "held";
  items: LocalOrderItem[];
  created_at: string;
  discount_amount?: number;
  discount_percentage?: number;
  item_completion_status?: boolean[];
}

interface ActiveOrdersListProps {
  onRecallOrder?: (payload: {
    items: any[];
    kitchenOrderId: string;
    source: string;
  }) => void;
}

function parseOrderItems(items: Json): LocalOrderItem[] {
  if (!items) return [];

  try {
    if (Array.isArray(items)) {
      return items.map((item) => {
        const itemObj = item as Record<string, any>;
        return {
          name:
            typeof itemObj.name === "string" ? itemObj.name : "Unknown Item",
          quantity: typeof itemObj.quantity === "number" ? itemObj.quantity : 1,
          notes: Array.isArray(itemObj.notes) ? itemObj.notes : [],
          price: typeof itemObj.price === "number" ? itemObj.price : undefined,
        };
      });
    }

    const parsedItems = typeof items === "string" ? JSON.parse(items) : items;

    if (Array.isArray(parsedItems)) {
      return parsedItems.map((item) => {
        const itemObj = item as Record<string, any>;
        return {
          name:
            typeof itemObj.name === "string" ? itemObj.name : "Unknown Item",
          quantity: typeof itemObj.quantity === "number" ? itemObj.quantity : 1,
          notes: Array.isArray(itemObj.notes) ? itemObj.notes : [],
          price: typeof itemObj.price === "number" ? itemObj.price : undefined,
        };
      });
    }

    return [];
  } catch (error) {
    console.error("Error parsing order items:", error);
    return [];
  }
}

const ActiveOrdersList = ({
  onRecallOrder,
}: ActiveOrdersListProps = {}): JSX.Element => {
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
      const { data: restaurant } = await supabase
        .from("restaurants")
        .select("name")
        .eq("id", profile.restaurant_id)
        .single();

      if (restaurant?.name) {
        setRestaurantName(restaurant.name);
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

      // Apply status filter - "all" shows everything, otherwise filter by specific status
      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }
      // Note: When statusFilter is "all", no status filter is applied - shows all orders

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
            item_completion_status: Array.isArray(order.item_completion_status)
              ? order.item_completion_status
              : [],
          };
        });

        setActiveOrders(formattedOrders);
      }
    };

    fetchActiveOrders();

    // Real-time subscription for kitchen order changes

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
                  item_completion_status: Array.isArray(
                    newOrder.item_completion_status
                  )
                    ? newOrder.item_completion_status
                    : [],
                };

                setActiveOrders((prev) => [formattedOrder, ...prev]);
              });
          } else if (payload.eventType === "UPDATE") {
            const updatedOrder = payload.new;

            // Re-fetch discount data from the linked orders table
            if (updatedOrder.order_id) {
              supabase
                .from("orders")
                .select("discount_amount, discount_percentage")
                .eq("id", updatedOrder.order_id)
                .single()
                .then(({ data: orderData }) => {
                  setActiveOrders((prev) => {
                    const updatedOrders = prev.map((order) =>
                      order.id === updatedOrder.id
                        ? {
                            ...order,
                            source: updatedOrder.source,
                            status: updatedOrder.status as
                              | "new"
                              | "preparing"
                              | "ready"
                              | "completed"
                              | "held",
                            discount_amount: orderData?.discount_amount || 0,
                            discount_percentage:
                              orderData?.discount_percentage || 0,
                            item_completion_status: Array.isArray(
                              updatedOrder.item_completion_status
                            )
                              ? updatedOrder.item_completion_status
                              : [],
                          }
                        : order
                    );

                    // If status filter is not "all" and not "completed", filter out completed orders
                    if (
                      statusFilter !== "all" &&
                      statusFilter !== "completed"
                    ) {
                      return updatedOrders.filter(
                        (order) => order.status !== "completed"
                      );
                    }

                    return updatedOrders;
                  });
                });
            } else {
              // No linked order_id, just update without discount info
              setActiveOrders((prev) => {
                const updatedOrders = prev.map((order) =>
                  order.id === updatedOrder.id
                    ? {
                        ...order,
                        source: updatedOrder.source,
                        status: updatedOrder.status as
                          | "new"
                          | "preparing"
                          | "ready"
                          | "completed"
                          | "held",
                        items: parseOrderItems(updatedOrder.items),
                        item_completion_status: Array.isArray(
                          updatedOrder.item_completion_status
                        )
                          ? updatedOrder.item_completion_status
                          : [],
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
            }

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
  const calculateOrderTotal = (items: LocalOrderItem[]): number => {
    return items.reduce((sum, item) => {
      const price = typeof item.price === "number" ? item.price : 0;
      return sum + price * item.quantity;
    }, 0);
  };

  // Calculate final total after discount
  const calculateFinalTotal = (
    items: LocalOrderItem[],
    discountAmount?: number
  ): number => {
    const subtotal = calculateOrderTotal(items);
    const discount = discountAmount || 0;
    return subtotal - discount;
  };

  // Check if all items in order are delivered
  const isAllItemsDelivered = (order: ActiveOrder): boolean => {
    const items = order.items || [];
    const completionStatus = order.item_completion_status || [];
    return (
      items.length > 0 &&
      completionStatus.length >= items.length &&
      completionStatus.slice(0, items.length).every((status) => status === true)
    );
  };

  const getCardStyleByStatus = (
    status: string,
    allDelivered: boolean = false
  ) => {
    // Purple for all items delivered (ready for payment) - takes priority
    if (allDelivered && status !== "completed") {
      return "bg-gradient-to-br from-purple-100 via-violet-150 to-indigo-200 border-l-4 border-purple-500 shadow-lg shadow-purple-200/60 hover:shadow-purple-300/70 hover:scale-[1.01] transition-all duration-200";
    }

    switch (status) {
      case "new":
        return "bg-gradient-to-br from-slate-50 via-indigo-50 to-blue-100 border-l-4 border-indigo-500 shadow-md hover:shadow-lg hover:shadow-indigo-200/60 hover:scale-[1.01] transition-all duration-200";
      case "preparing":
        return "bg-gradient-to-br from-red-100 via-orange-100 to-amber-150 border-l-4 border-red-500 shadow-lg shadow-red-200/60 hover:shadow-red-300/70 hover:scale-[1.01] transition-all duration-200";
      case "ready":
        return "bg-gradient-to-br from-green-100 via-emerald-150 to-teal-200 border-l-4 border-green-500 shadow-lg shadow-green-200/60 hover:shadow-green-300/70 hover:scale-[1.01] transition-all duration-200";
      case "completed":
        return "bg-gradient-to-br from-blue-100 via-sky-150 to-cyan-200 border-l-4 border-blue-500 shadow-lg shadow-blue-200/60 hover:shadow-blue-300/70 hover:scale-[1.01] transition-all duration-200";
      case "held":
        return "bg-gradient-to-br from-amber-100 via-yellow-150 to-orange-200 border-l-4 border-amber-500 shadow-lg shadow-amber-200/60 hover:shadow-amber-300/70 hover:scale-[1.01] transition-all duration-200";
      default:
        return "bg-gradient-to-br from-gray-50 to-slate-100 border-l-4 border-gray-400 shadow-sm hover:shadow-md transition-all duration-200";
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "new":
        return "bg-gradient-to-r from-indigo-500 to-blue-500 text-white shadow-sm";
      case "preparing":
        return "bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-sm";
      case "ready":
        return "bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-sm";
      case "completed":
        return "bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-sm";
      case "held":
        return "bg-gradient-to-r from-amber-500 to-yellow-500 text-white shadow-sm";
      case "served":
        return "bg-gradient-to-r from-purple-500 to-violet-500 text-white shadow-sm";
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
      const exportData = filteredOrders.map((order) => ({
        "Order ID": order.id.slice(0, 8) + "...",
        Source: order.source,
        Items: order.items.map((i) => `${i.quantity}x ${i.name}`).join(", "),
        [`Gross Total (${currencySymbol})`]: parseFloat(
          calculateOrderTotal(order.items).toFixed(2)
        ),
        [`Discount (${currencySymbol})`]: order.discount_amount
          ? `${order.discount_amount.toFixed(2)} (${
              order.discount_percentage
            }%)`
          : "-",
        [`Net Total (${currencySymbol})`]: parseFloat(
          calculateFinalTotal(order.items, order.discount_amount).toFixed(2)
        ),
        Status: order.status as string,
        "Created Date": format(new Date(order.created_at), "yyyy-MM-dd"),
        "Created Time": format(new Date(order.created_at), "HH:mm:ss"),
      }));

      // Add empty row as separator
      exportData.push({
        "Order ID": "",
        Source: "",
        Items: "",
        [`Gross Total (${currencySymbol})`]: "" as any,
        [`Discount (${currencySymbol})`]: "",
        [`Net Total (${currencySymbol})`]: "" as any,
        Status: "-",
        "Created Date": "",
        "Created Time": "",
      });

      // Add summary row
      exportData.push({
        "Order ID": "SUMMARY",
        Source: `Total Orders: ${filteredOrders.length}`,
        Items: "",
        [`Gross Total (${currencySymbol})`]: "" as any,
        [`Discount (${currencySymbol})`]: parseFloat(totalDiscount.toFixed(2)),
        [`Net Total (${currencySymbol})`]: parseFloat(totalRevenue.toFixed(2)),
        Status: "-",
        "Created Date": format(new Date(), "yyyy-MM-dd"),
        "Created Time": "",
      });

      // Generate filename: RestaurantName_POS_Orders_YYYY-MM-DD
      const sanitizedRestaurantName = restaurantName.replace(
        /[^a-zA-Z0-9]/g,
        "_"
      );
      const dateStr = format(new Date(), "yyyy-MM-dd");
      const filename = `${sanitizedRestaurantName}_POS_Orders_${dateStr}`;

      // Use shared export utility
      const success = exportToExcel(exportData, filename, "POS Orders");

      if (success) {
        toast({
          title: "Export Successful",
          description: `Orders exported to ${filename}.xlsx`,
        });
      } else {
        throw new Error("Export failed");
      }
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
            filteredOrders.map((order) => {
              const allDelivered = isAllItemsDelivered(order);
              return (
                <Card
                  key={order.id}
                  className={`p-4 rounded-xl cursor-pointer overflow-hidden ${getCardStyleByStatus(
                    order.status,
                    allDelivered
                  )}`}
                  onClick={() => setSelectedOrder(order)}
                >
                  <div className="flex flex-col h-full">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-sm truncate mr-2 flex-1 text-gray-800">
                        {order.source}
                      </h3>
                      <span
                        className={`text-xs px-3 py-1 rounded-full font-medium ${
                          allDelivered && order.status !== "completed"
                            ? getStatusBadgeColor("served")
                            : getStatusBadgeColor(order.status)
                        }`}
                      >
                        {allDelivered && order.status !== "completed"
                          ? "served"
                          : order.status}
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
              );
            })
          ) : (
            <div className="col-span-full text-center p-4 text-muted-foreground">
              No orders found matching your filters
            </div>
          )}
        </div>
      </div>

      <PaymentDialog
        isOpen={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        orderItems={
          selectedOrder?.items
            ? selectedOrder.items.map((item) => ({
                id: crypto.randomUUID(),
                name: item.name,
                package_price: item.price || 0,
                price: item.price || 0,
                quantity: item.quantity,
                modifiers: item.notes,
              }))
            : []
        }
        onSuccess={() => {
          // Refresh orders - the realtime subscription will handle the list update,
          // but we can force a manual recall if needed, or close dialog.
          // Usually onSuccess means payment done or edits saved and finalized.
          setSelectedOrder(null);
        }}
        onOrderUpdated={async () => {
          // When an item quantity is updated inside the dialog, we need to refresh
          // the current selectedOrder so the dialog doesn't close and shows waiting state.
          if (!selectedOrder) return;

          const { data: updatedOrder } = await supabase
            .from("kitchen_orders")
            .select(
              "*, orders!kitchen_orders_order_id_fkey(discount_amount, discount_percentage)"
            )
            .eq("id", selectedOrder.id)
            .single();

          if (updatedOrder) {
            const orderData = updatedOrder.orders as any;
            const formattedOrder: ActiveOrder = {
              id: updatedOrder.id,
              source: updatedOrder.source,
              status: updatedOrder.status as any,
              items: parseOrderItems(updatedOrder.items),
              created_at: updatedOrder.created_at,
              discount_amount: orderData?.discount_amount || 0,
              discount_percentage: orderData?.discount_percentage || 0,
              item_completion_status: Array.isArray(
                updatedOrder.item_completion_status
              )
                ? updatedOrder.item_completion_status
                : [],
            };

            // Update both the list and the selected item
            setActiveOrders((prev) =>
              prev.map((o) => (o.id === formattedOrder.id ? formattedOrder : o))
            );
            setSelectedOrder(formattedOrder);
          }
        }}
        tableNumber={selectedOrder?.source || "Order"}
        orderId={selectedOrder?.id}
        itemCompletionStatus={selectedOrder?.item_completion_status}
      />
    </div>
  );
};

export default ActiveOrdersList;
