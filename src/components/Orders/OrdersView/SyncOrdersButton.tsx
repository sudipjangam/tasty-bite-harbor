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

      // Fetch all orders from orders_unified for today
      const { data: orders, error: ordersError } = await supabase
        .from("orders_unified")
        .select("*")
        .gte("created_at", today.toISOString())
        .lt("created_at", tomorrow.toISOString());

      if (ordersError) throw ordersError;

      if (!orders || orders.length === 0) {
        toast({
          title: "No orders to sync",
          description: "No orders found for today.",
        });
        return;
      }

      let updatedCount = 0;

      // Iterate and recalculate totals for each order
      for (const order of orders) {
        if (!order.items || !Array.isArray(order.items)) continue;

        // Calculate Gross Total from items
        const grossTotal = order.items.reduce((sum: number, item: any) => {
          const price = Number(item.price) || 0;
          const qty = Number(item.quantity) || 1;
          return sum + price * qty;
        }, 0);

        // Get existing discount
        const discountAmount = Number(order.discount_amount) || 0;

        // Calculate Net Total
        const netTotal = Math.max(0, grossTotal - discountAmount);

        // Update the order with recalculated total
        const { error: updateError } = await supabase
          .from("orders_unified")
          .update({
            total_amount: netTotal,
          })
          .eq("id", order.id);

        if (!updateError) {
          updatedCount++;
        } else {
          console.error("Failed to update order", order.id, updateError);
        }
      }

      toast({
        title: "Sync Complete",
        description: `Successfully synchronized ${updatedCount} orders.`,
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
