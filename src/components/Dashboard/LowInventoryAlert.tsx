import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Package, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useRestaurantId } from "@/hooks/useRestaurantId";

interface LowStockItem {
  id: string;
  name: string;
  quantity: number;
  reorder_level: number;
  unit: string;
  category?: string;
}

const LowInventoryAlert = () => {
  const navigate = useNavigate();
  const { restaurantId } = useRestaurantId();

  console.log("LowInventoryAlert: Component rendering with restaurantId:", restaurantId);

  const { data: lowStockItems = [], isLoading, error } = useQuery({
    queryKey: ["low-stock-dashboard", restaurantId],
    queryFn: async () => {
      console.log("LowInventoryAlert: Fetching inventory for restaurant:", restaurantId);
      
      if (!restaurantId) {
        console.log("LowInventoryAlert: No restaurant ID available");
        return [];
      }

      const { data, error } = await supabase
        .from("inventory_items")
        .select("id, name, quantity, reorder_level, unit, category")
        .eq("restaurant_id", restaurantId)
        .not("reorder_level", "is", null)
        .order("quantity", { ascending: true });

      if (error) {
        console.error("LowInventoryAlert: Error fetching inventory:", error);
        throw error;
      }

      console.log("LowInventoryAlert: Fetched inventory items:", data?.length || 0);

      // Filter items where quantity <= reorder_level
      const lowStock = (data || []).filter(
        (item) => item.quantity <= item.reorder_level
      ) as LowStockItem[];
      
      console.log("LowInventoryAlert: Low stock items found:", lowStock.length, lowStock);
      
      return lowStock.slice(0, 5); // Limit to 5 items
    },
    enabled: !!restaurantId,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  console.log("LowInventoryAlert: Render state -", { 
    isLoading, 
    error: error?.message, 
    itemsCount: lowStockItems.length,
    restaurantId 
  });

  if (isLoading) {
    return (
      <Card className="border-yellow-200 dark:border-yellow-800">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              Low Inventory Alert
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (lowStockItems.length === 0) {
    return (
      <Card className="border-green-200 dark:border-green-800">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-5 w-5 text-green-600" />
              Inventory Status
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">
              ✓ All inventory items are well stocked
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-yellow-200 dark:border-yellow-800 bg-yellow-50/50 dark:bg-yellow-950/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            Low Inventory Alert
          </CardTitle>
          <Badge variant="destructive" className="bg-yellow-600">
            {lowStockItems.length} {lowStockItems.length === 1 ? "item" : "items"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {lowStockItems.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-yellow-200 dark:border-yellow-800"
          >
            <div className="flex-1">
              <p className="font-medium text-sm">{item.name}</p>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-xs text-red-600 dark:text-red-400 font-medium">
                  Stock: {item.quantity} {item.unit}
                </span>
                <span className="text-xs text-muted-foreground">
                  Reorder at: {item.reorder_level} {item.unit}
                </span>
              </div>
            </div>
          </div>
        ))}

        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/inventory")}
          className="w-full mt-3 border-yellow-300 hover:bg-yellow-100 dark:border-yellow-700 dark:hover:bg-yellow-900/20"
        >
          View All Inventory
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </CardContent>
    </Card>
  );
};

export default LowInventoryAlert;
