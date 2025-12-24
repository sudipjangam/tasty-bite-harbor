import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const SyncOrdersButton = () => {
  const [isSyncing, setIsSyncing] = useState(false);
  const { toast } = useToast();

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // 1. Fetch all kitchen orders for today that have an order_id
      const { data: kitchenOrders, error: koError } = await supabase
        .from("kitchen_orders")
        .select("*")
        .gte("created_at", today.toISOString())
        .lt("created_at", tomorrow.toISOString())
        .not("order_id", "is", null);

      if (koError) throw koError;

      if (!kitchenOrders || kitchenOrders.length === 0) {
        toast({
          title: "No orders to sync",
          description: "No kitchen orders found for today.",
        });
        return;
      }

      // 2. Fetch all orders for today to get discount info
      const { data: existingOrders, error: ordersError } = await supabase
        .from("orders")
        .select("id, discount_amount")
        .gte("created_at", today.toISOString())
        .lt("created_at", tomorrow.toISOString());

      if (ordersError) throw ordersError;

      const ordersMap = new Map(existingOrders?.map((o) => [o.id, o]) || []);
      let updatedCount = 0;

      // 3. Iterate and update corresponding 'orders'
      for (const ko of kitchenOrders) {
        if (!ko.items || !Array.isArray(ko.items)) continue;

        // Calculate Gross Total from kitchen items
        const grossTotal = ko.items.reduce((sum: number, item: any) => {
          const price = Number(item.price) || 0;
          const qty = Number(item.quantity) || 1;
          return sum + price * qty;
        }, 0);

        // Get existing discount
        const existingOrder = ordersMap.get(ko.order_id);
        const discountAmount = Number(existingOrder?.discount_amount) || 0;

        // Calculate Net Total
        const netTotal = Math.max(0, grossTotal - discountAmount);

        // Format items for orders table
        const formattedItems = ko.items.map((item: any) => {
          const notes = Array.isArray(item.notes) ? item.notes.join(", ") : "";
          const meta = notes ? ` (${notes})` : "";
          return `${item.quantity}x ${item.name}${meta} @${item.price}`;
        });

        // Update the main orders table with Net Total and formatted items
        const { error: updateError } = await supabase
          .from("orders")
          .update({
            total: netTotal,
            items: formattedItems,
          })
          .eq("id", ko.order_id);

        if (!updateError) {
          updatedCount++;
        } else {
          console.error("Failed to update order", ko.order_id, updateError);
        }
      }

      toast({
        title: "Sync Complete",
        description: `Successfully synchronized ${updatedCount} orders (respecting discounts).`,
      });
    } catch (error) {
      console.error("Sync error:", error);
      toast({
        variant: "destructive",
        title: "Sync Failed",
        description: "An error occurred while syncing orders.",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Button
      variant="outline"
      onClick={handleSync}
      disabled={isSyncing}
      className="gap-2"
    >
      <RefreshCw className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
      {isSyncing ? "Syncing..." : "Fix Data Sync"}
    </Button>
  );
};
