import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Package, ArrowRight, Clock, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import { isPast, differenceInDays, format } from "date-fns";

interface AlertItem {
  id: string;
  name: string;
  type: "low_stock" | "expiring" | "expired";
  quantity: number;
  unit: string;
  details: string;
}

const LowInventoryAlert = () => {
  const navigate = useNavigate();
  const { restaurantId } = useRestaurantId();

  const { data: alertItems = [], isLoading, error } = useQuery({
    queryKey: ["inventory-alerts-dashboard", restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];

      const alerts: AlertItem[] = [];

      // 1. Fetch low stock items
      const { data: stockData, error: stockError } = await supabase
        .from("inventory_items")
        .select("id, name, quantity, reorder_level, unit, category")
        .eq("restaurant_id", restaurantId)
        .not("reorder_level", "is", null);

      if (stockError) throw stockError;

      (stockData || []).forEach((item) => {
        if (item.quantity <= item.reorder_level) {
          alerts.push({
            id: `low_${item.id}`,
            name: item.name,
            type: "low_stock",
            quantity: item.quantity,
            unit: item.unit,
            details: `Reorder at: ${item.reorder_level} ${item.unit}`,
          });
        }
      });

      // 2. Fetch expiring lots
      const { data: lotsData, error: lotsError } = await supabase
        .from("inventory_lots")
        .select(`
          id, 
          quantity_remaining, 
          expiry_date,
          inventory_items (name, unit)
        `)
        .eq("restaurant_id", restaurantId)
        .gt("quantity_remaining", 0)
        .not("expiry_date", "is", null);

      if (lotsError) throw lotsError;

      (lotsData || []).forEach((lot) => {
        if (!lot.expiry_date) return;
        const expDate = new Date(lot.expiry_date);

        if (isPast(expDate)) {
          alerts.push({
            id: `exp_${lot.id}`,
            name: lot.inventory_items?.name || "Unknown",
            type: "expired",
            quantity: lot.quantity_remaining,
            unit: lot.inventory_items?.unit || "",
            details: `Expired: ${format(expDate, "MMM dd, yyyy")}`,
          });
        } else if (differenceInDays(expDate, new Date()) <= 7) {
          alerts.push({
            id: `exp_${lot.id}`,
            name: lot.inventory_items?.name || "Unknown",
            type: "expiring",
            quantity: lot.quantity_remaining,
            unit: lot.inventory_items?.unit || "",
            details: `Expiring: ${format(expDate, "MMM dd")}`,
          });
        }
      });

      // Sort alerts: Expired first, then low stock, then expiring soon
      alerts.sort((a, b) => {
        const typeScore = { expired: 0, low_stock: 1, expiring: 2 };
        return typeScore[a.type] - typeScore[b.type];
      });

      return alerts;
    },
    enabled: !!restaurantId,
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <Card className="border-amber-200 dark:border-amber-800">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              Inventory Alerts
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

  if (alertItems.length === 0) {
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
              ✓ All items well stocked securely.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Determine widget appearance based on most urgent alert
  const hasExpired = alertItems.some((a) => a.type === "expired");
  const widgetColor = hasExpired
    ? "border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20"
    : "border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20";
  const iconColor = hasExpired ? "text-red-600" : "text-amber-600";
  const badgeColor = hasExpired ? "bg-red-600" : "bg-amber-600";

  return (
    <Card className={widgetColor}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className={`h-5 w-5 ${iconColor}`} />
            Inventory Alerts
          </CardTitle>
          <Badge variant="destructive" className={badgeColor}>
            {alertItems.length} {alertItems.length === 1 ? "alert" : "alerts"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {alertItems.slice(0, 5).map((item) => (
          <div
            key={item.id}
            className={`flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border ${
              item.type === "expired"
                ? "border-red-200 dark:border-red-800"
                : item.type === "expiring"
                ? "border-amber-200 dark:border-amber-800"
                : "border-yellow-200 dark:border-yellow-800"
            }`}
          >
            <div className="flex-1">
              <div className="flex items-center gap-2">
                {item.type === "expired" && <Trash2 className="h-3 w-3 text-red-500" />}
                {item.type === "expiring" && <Clock className="h-3 w-3 text-amber-500" />}
                <p className="font-medium text-sm">{item.name}</p>
                {item.type === "expired" && (
                  <Badge variant="outline" className="text-[10px] h-4 py-0 ml-1 border-red-200 text-red-600 bg-red-50">Expired</Badge>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                <span
                  className={`text-xs font-medium ${
                    item.type === "expired" ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"
                  }`}
                >
                  {item.type === "low_stock" ? "Stock: " : "Lot Qty: "}
                  {item.quantity.toFixed(2)} {item.unit}
                </span>
                <span className="text-xs text-muted-foreground">{item.details}</span>
              </div>
            </div>
          </div>
        ))}

        {alertItems.length > 5 && (
          <p className="text-xs text-center text-muted-foreground mt-2">
            + {alertItems.length - 5} more alerts
          </p>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/inventory")}
          className="w-full mt-3 dark:hover:bg-primary/10"
        >
          View All Inventory
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </CardContent>
    </Card>
  );
};

export default LowInventoryAlert;
