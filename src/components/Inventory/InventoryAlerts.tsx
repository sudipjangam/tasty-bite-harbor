
import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, Check, X, Bell } from "lucide-react";
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

const alertTypeColors = {
  low_stock: "bg-yellow-100 text-yellow-800 border-yellow-200",
  out_of_stock: "bg-red-100 text-red-800 border-red-200",
  reorder_suggested: "bg-blue-100 text-blue-800 border-blue-200",
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
      toast({ title: "Alert marked as read" });
    },
    onError: (error) => {
      toast({
        title: "Error marking alert as read",
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
      toast({ title: "All alerts marked as read" });
    },
    onError: (error) => {
      toast({
        title: "Error marking alerts as read",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return <div>Loading alerts...</div>;
  }

  if (alerts.length === 0) {
    return (
      <Card className="p-6 text-center">
        <Bell className="h-12 w-12 text-gray-400 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-gray-900 mb-1">No Active Alerts</h3>
        <p className="text-gray-500">All your inventory items are properly stocked.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-orange-500" />
          Inventory Alerts ({alerts.length})
        </h2>
        {alerts.length > 0 && (
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => markAllAsReadMutation.mutate()}
          >
            Mark All as Read
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {alerts.map((alert) => (
          <Card 
            key={alert.id} 
            className={`p-4 border-l-4 ${alertTypeColors[alert.alert_type as keyof typeof alertTypeColors]}`}
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4" />
                  <Badge variant="outline" className="text-xs">
                    {alert.alert_type.replace('_', ' ').toUpperCase()}
                  </Badge>
                  <span className="text-xs text-gray-500">
                    {new Date(alert.created_at).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm font-medium mb-1">{alert.inventory_item.name}</p>
                <p className="text-sm text-gray-600">{alert.message}</p>
                <div className="mt-2 text-xs text-gray-500">
                  Current: {alert.inventory_item.quantity} {alert.inventory_item.unit} | 
                  Reorder Level: {alert.inventory_item.reorder_level} {alert.inventory_item.unit}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => markAsReadMutation.mutate(alert.id)}
                className="hover:bg-green-100"
              >
                <Check className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default InventoryAlerts;
