
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import OrderTicket from "./OrderTicket";
import OrdersColumn from "./OrdersColumn";

export interface KitchenOrder {
  id: string;
  source: string;
  status: "new" | "preparing" | "ready";
  created_at: string;
  items: {
    name: string;
    quantity: number;
    notes?: string[];
  }[];
}

const KitchenDisplay = () => {
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const { toast } = useToast();
  const notification = new Audio("/notification.mp3");

  useEffect(() => {
    // Fetch initial orders
    const fetchOrders = async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("restaurant_id")
        .eq("id", (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile?.restaurant_id) return;

      const { data } = await supabase
        .from("kitchen_orders")
        .select("*")
        .eq("restaurant_id", profile.restaurant_id)
        .order("created_at", { ascending: false });

      if (data) setOrders(data as KitchenOrder[]);
    };

    fetchOrders();

    // Subscribe to real-time updates
    const channel = supabase
      .channel("kitchen-orders")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "kitchen_orders",
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setOrders((prev) => [payload.new as KitchenOrder, ...prev]);
            if (soundEnabled) {
              notification.play();
              toast({
                title: "New Order",
                description: `New order from ${(payload.new as KitchenOrder).source}`,
              });
            }
          } else if (payload.eventType === "UPDATE") {
            setOrders((prev) =>
              prev.map((order) =>
                order.id === payload.new.id
                  ? (payload.new as KitchenOrder)
                  : order
              )
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [soundEnabled, toast]);

  const handleStatusUpdate = async (orderId: string, newStatus: KitchenOrder["status"]) => {
    const { error } = await supabase
      .from("kitchen_orders")
      .update({ status: newStatus })
      .eq("id", orderId);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update order status",
      });
    }
  };

  const filterOrdersByStatus = (status: KitchenOrder["status"]) => {
    return orders.filter((order) => order.status === status);
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Kitchen Display System</h1>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setSoundEnabled(!soundEnabled)}
          className="ml-2"
        >
          {soundEnabled ? (
            <Volume2 className="h-5 w-5" />
          ) : (
            <VolumeX className="h-5 w-5" />
          )}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <OrdersColumn
          title="New Orders"
          orders={filterOrdersByStatus("new")}
          onStatusUpdate={handleStatusUpdate}
          variant="new"
        />
        <OrdersColumn
          title="Preparing"
          orders={filterOrdersByStatus("preparing")}
          onStatusUpdate={handleStatusUpdate}
          variant="preparing"
        />
        <OrdersColumn
          title="Ready"
          orders={filterOrdersByStatus("ready")}
          onStatusUpdate={handleStatusUpdate}
          variant="ready"
        />
      </div>
    </div>
  );
};

export default KitchenDisplay;
