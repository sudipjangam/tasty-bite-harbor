import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatOrderItemString } from "@/lib/order-utils";
import { useToast } from "@/hooks/use-toast";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import { useQueryClient } from "@tanstack/react-query";

export const SyncOrdersButton = () => {
  const [isSyncing, setIsSyncing] = useState(false);
  const { toast } = useToast();
  const { restaurantId } = useRestaurantId();
  const queryClient = useQueryClient();

  const handleSync = async () => {
    if (!restaurantId) {
      toast({ title: "No restaurant selected", variant: "destructive" });
      return;
    }

    setIsSyncing(true);
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // 1. Fetch all orders for today that have kitchen_items, scoped to restaurant
      const { data: ordersToSync, error: ordersError } = await supabase
        .from("orders")
        .select("id, kitchen_items, discount_amount")
        .eq("restaurant_id", restaurantId)
        .gte("created_at", today.toISOString())
        .lt("created_at", tomorrow.toISOString())
        .not("kitchen_items", "is", null);

      if (ordersError) throw ordersError;

      if (!ordersToSync || ordersToSync.length === 0) {
        toast({
          title: "No orders to sync",
          description: "No orders found for today.",
        });
        return;
      }

      let updatedCount = 0;

      // 2. Iterate and update corresponding 'orders'
      for (const ord of ordersToSync) {
        const kItems = ord.kitchen_items as any;
        if (!kItems || !Array.isArray(kItems)) continue;

        // Calculate Gross Total from kitchen items
        const grossTotal = kItems.reduce((sum: number, item: any) => {
          const price = Number(item.price) || 0;
          const qty = Number(item.quantity) || 1;
          return sum + price * qty;
        }, 0);

        // Get existing discount
        const discountAmount = Number(ord.discount_amount) || 0;

        // Calculate Net Total
        const netTotal = Math.max(0, grossTotal - discountAmount);

        // Format items for orders table
        const formattedItems = kItems.map((item: any) => {
          return formatOrderItemString(item.quantity, item.name, item.price, item.notes);
        });

        // Update the main orders table with Net Total and formatted items
        const { error: updateError } = await supabase
          .from("orders")
          .update({
            total: netTotal,
            items: formattedItems,
          })
          .eq("id", ord.id);

        if (!updateError) {
          updatedCount++;
        } else {
          console.error("Failed to update order", ord.id, updateError);
        }
      }

      // Invalidate caches so UI reflects synced data
      queryClient.invalidateQueries({ queryKey: ["all-orders"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-orders"] });

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
