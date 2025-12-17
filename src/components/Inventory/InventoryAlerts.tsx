
import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, Check, Bell, CheckCheck, Package } from "lucide-react";
import { useRestaurantId } from "@/hooks/useRestaurantId";

interface InventoryAlert {
  id: string;
  alert_type: string;
  message: string;
  is_read: boolean;
  created_at: string;
  inventory_item: {
    name: string;
    quantity: number;
    unit: string;
    reorder_level: number;
  };
}

const alertTypeColors: Record<string, { bg: string; icon: string; badge: string }> = {
  low_stock: { 
    bg: "bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-l-4 border-yellow-500",
    icon: "bg-yellow-100 dark:bg-yellow-900/50 text-yellow-600",
    badge: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300"
  },
  out_of_stock: { 
    bg: "bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 border-l-4 border-red-500",
    icon: "bg-red-100 dark:bg-red-900/50 text-red-600",
    badge: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300"
  },
  reorder_suggested: { 
    bg: "bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border-l-4 border-blue-500",
    icon: "bg-blue-100 dark:bg-blue-900/50 text-blue-600",
    badge: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300"
  },
};

const InventoryAlerts = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { restaurantId } = useRestaurantId();

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ["inventory-alerts", restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];

      const { data, error } = await supabase
        .from("inventory_alerts")
        .select(`
          *,
          inventory_item:inventory_items(name, quantity, unit, reorder_level)
        `)
        .eq("restaurant_id", restaurantId)
        .eq("is_read", false)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as InventoryAlert[];
    },
    enabled: !!restaurantId,
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (alertId: string) => {
      const { data: profile } = await supabase.auth.getUser();
      if (!profile.user) throw new Error("No user found");

      const { error } = await supabase
        .from("inventory_alerts")
        .update({ 
          is_read: true, 
          acknowledged_at: new Date().toISOString(),
          acknowledged_by: profile.user.id 
        })
        .eq("id", alertId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-alerts"] });
      toast({ title: "Alert dismissed" });
    },
    onError: (error) => {
      toast({
        title: "Error dismissing alert",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const { data: profile } = await supabase.auth.getUser();
      if (!profile.user) throw new Error("No user found");

      const { error } = await supabase
        .from("inventory_alerts")
        .update({ 
          is_read: true, 
          acknowledged_at: new Date().toISOString(),
          acknowledged_by: profile.user.id 
        })
        .eq("restaurant_id", restaurantId)
        .eq("is_read", false);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-alerts"] });
      toast({ title: "All alerts dismissed" });
    },
    onError: (error) => {
      toast({
        title: "Error dismissing alerts",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <Card className="p-8 text-center bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl border-none">
        <div className="p-4 bg-green-100 dark:bg-green-900/50 rounded-full w-fit mx-auto mb-4">
          <Check className="h-8 w-8 text-green-600" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">All Clear!</h3>
        <p className="text-gray-600 dark:text-gray-400">No inventory alerts at this time. All items are properly stocked.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl shadow-md">
            <AlertTriangle className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Inventory Alerts
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {alerts.length} item{alerts.length !== 1 ? "s" : ""} need attention
            </p>
          </div>
        </div>
        {alerts.length > 0 && (
          <Button 
            variant="outline" 
            onClick={() => markAllAsReadMutation.mutate()}
            disabled={markAllAsReadMutation.isPending}
            className="bg-white/80 dark:bg-gray-700/80 border-gray-200 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-600"
          >
            <CheckCheck className="mr-2 h-4 w-4" />
            Dismiss All
          </Button>
        )}
      </div>

      {/* Alerts Grid */}
      <div className="grid gap-4">
        {alerts.map((alert) => {
          const colors = alertTypeColors[alert.alert_type] || alertTypeColors.low_stock;
          return (
            <Card 
              key={alert.id} 
              className={`p-5 rounded-xl ${colors.bg} border-none shadow-md hover:shadow-lg transition-all`}
            >
              <div className="flex justify-between items-start gap-4">
                <div className="flex items-start gap-4 flex-1">
                  <div className={`p-3 rounded-xl ${colors.icon}`}>
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <h3 className="font-bold text-gray-900 dark:text-white">
                        {alert.inventory_item?.name || "Unknown Item"}
                      </h3>
                      <Badge className={colors.badge}>
                        {alert.alert_type.replace(/_/g, ' ').toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">{alert.message}</p>
                    <div className="flex flex-wrap gap-4 text-sm">
                      <div className="bg-white/50 dark:bg-gray-700/50 px-3 py-1 rounded-lg">
                        <span className="text-gray-500 dark:text-gray-400">Current: </span>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {alert.inventory_item?.quantity} {alert.inventory_item?.unit}
                        </span>
                      </div>
                      <div className="bg-white/50 dark:bg-gray-700/50 px-3 py-1 rounded-lg">
                        <span className="text-gray-500 dark:text-gray-400">Reorder at: </span>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {alert.inventory_item?.reorder_level} {alert.inventory_item?.unit}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
                      {new Date(alert.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => markAsReadMutation.mutate(alert.id)}
                  disabled={markAsReadMutation.isPending}
                  className="hover:bg-green-100 dark:hover:bg-green-900/30 rounded-xl"
                >
                  <Check className="h-4 w-4 text-green-600" />
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default InventoryAlerts;
