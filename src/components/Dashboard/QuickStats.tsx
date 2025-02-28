
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { ClipboardList, TableProperties, Package2, Users, Calendar } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { format, isAfter, isBefore, addDays } from "date-fns";
import { useNavigate } from "react-router-dom";

const QuickStats = () => {
  const navigate = useNavigate();
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
        
      // Get upcoming staff leaves (next 7 days)
      const today = new Date();
      const nextWeek = addDays(today, 7);
      const { data: upcomingLeaves } = await supabase
        .from("staff_leaves")
        .select("*")
        .eq("restaurant_id", profile?.restaurant_id)
        .eq("status", "approved")
        .or(`start_date.gte.${format(today, 'yyyy-MM-dd')},end_date.gte.${format(today, 'yyyy-MM-dd')}`);

      // Filter leaves to only include those in the next 7 days
      const filteredLeaves = upcomingLeaves?.filter(leave => {
        const startDate = new Date(leave.start_date);
        const endDate = new Date(leave.end_date);
        return (
          (isAfter(startDate, today) && isBefore(startDate, nextWeek)) ||
          (isAfter(endDate, today) && isBefore(endDate, nextWeek)) ||
          (isBefore(startDate, today) && isAfter(endDate, today))
        );
      });

      return {
        activeOrders: activeOrders?.length || 0,
        totalTables: tables?.length || 0,
        availableTables: tables?.filter(t => t.status === "available").length || 0,
        lowStockItems: lowStockItems?.filter(item => item.quantity <= (item.reorder_level || 0)).length || 0,
        staffOnDuty: staffOnDuty?.length || 0,
        upcomingLeaves: filteredLeaves?.length || 0,
      };
    },
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => (
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
      color: "bg-blue-100 text-blue-700",
      route: "/orders",
      alert: false
    },
    {
      title: "Available Tables",
      value: `${stats?.availableTables || 0}/${stats?.totalTables || 0}`,
      icon: TableProperties,
      color: "bg-green-100 text-green-700",
      route: "/tables",
      alert: false
    },
    {
      title: "Low Stock Items",
      value: stats?.lowStockItems || 0,
      icon: Package2,
      color: stats?.lowStockItems > 0 ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-700",
      route: "/inventory",
      alert: stats?.lowStockItems > 0
    },
    {
      title: "Staff on Duty",
      value: stats?.staffOnDuty || 0,
      icon: Users,
      color: "bg-purple-100 text-purple-700",
      route: "/staff",
      alert: false
    },
    {
      title: "Upcoming Leaves",
      value: stats?.upcomingLeaves || 0,
      icon: Calendar,
      color: stats?.upcomingLeaves > 0 ? "bg-amber-100 text-amber-700" : "bg-indigo-100 text-indigo-700",
      route: "/staff?tab=leaves",
      alert: stats?.upcomingLeaves > 0
    }
  ];

  const handleCardClick = (route: string) => {
    navigate(route);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      {quickStats.map((stat, index) => (
        <Card 
          key={index} 
          className="p-6 hover:shadow-lg transition-shadow cursor-pointer"
          onClick={() => handleCardClick(stat.route)}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                {stat.title}
                {stat.alert && (
                  <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                    Alert
                  </Badge>
                )}
              </p>
              <h3 className="text-2xl font-bold mt-2">{stat.value}</h3>
            </div>
            <div className={`p-2 rounded-full ${stat.color}`}>
              <stat.icon className="w-5 h-5" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default QuickStats;
