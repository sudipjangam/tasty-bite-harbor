
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { ClipboardList, TableProperties, Package2, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const QuickStats = () => {
  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      const { data, error } = await supabase
        .from("profiles")
        .select("restaurant_id")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      return data;
    },
  });

  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard-quick-stats", profile?.restaurant_id],
    enabled: !!profile?.restaurant_id,
    queryFn: async () => {
      // Get active orders
      const { data: activeOrders } = await supabase
        .from("orders")
        .select("id")
        .eq("restaurant_id", profile?.restaurant_id)
        .eq("status", "pending");

      // Get available tables
      const { data: tables } = await supabase
        .from("rooms")
        .select("id, status")
        .eq("restaurant_id", profile?.restaurant_id);

      // Get low stock items
      const { data: lowStockItems } = await supabase
        .from("inventory_items")
        .select("id, quantity, reorder_level")
        .eq("restaurant_id", profile?.restaurant_id)
        .not("reorder_level", "is", null);

      // Get staff on duty (we'll assume staff without a shift are not on duty)
      const { data: staffOnDuty } = await supabase
        .from("staff")
        .select("id")
        .eq("restaurant_id", profile?.restaurant_id)
        .not("Shift", "is", null);

      return {
        activeOrders: activeOrders?.length || 0,
        totalTables: tables?.length || 0,
        availableTables: tables?.filter(t => t.status === "available").length || 0,
        lowStockItems: lowStockItems?.filter(item => item.quantity <= (item.reorder_level || 0)).length || 0,
        staffOnDuty: staffOnDuty?.length || 0,
      };
    },
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="p-6">
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-8 w-16" />
          </Card>
        ))}
      </div>
    );
  }

  const quickStats = [
    {
      title: "Active Orders",
      value: stats?.activeOrders || 0,
      icon: ClipboardList,
    },
    {
      title: "Available Tables",
      value: `${stats?.availableTables || 0}/${stats?.totalTables || 0}`,
      icon: TableProperties,
    },
    {
      title: "Low Stock Items",
      value: stats?.lowStockItems || 0,
      icon: Package2,
    },
    {
      title: "Staff on Duty",
      value: stats?.staffOnDuty || 0,
      icon: Users,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {quickStats.map((stat, index) => (
        <Card key={index} className="p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
              <h3 className="text-2xl font-bold mt-2">{stat.value}</h3>
            </div>
            <div className="p-2 bg-primary/10 rounded-full">
              <stat.icon className="w-5 h-5 text-primary" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default QuickStats;
