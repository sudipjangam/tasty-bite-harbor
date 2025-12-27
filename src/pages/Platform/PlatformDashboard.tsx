import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import {
  Building2,
  Users,
  CreditCard,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  ArrowRight,
  Loader2,
  Plus,
  IndianRupee,
} from "lucide-react";

const PlatformDashboard = () => {
  const navigate = useNavigate();

  // Fetch platform statistics
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["platform-stats"],
    queryFn: async () => {
      const [restaurants, subscriptions, users, plans] = await Promise.all([
        supabase
          .from("restaurants")
          .select("*", { count: "exact", head: true }),
        supabase
          .from("restaurant_subscriptions")
          .select("*", { count: "exact", head: true })
          .eq("status", "active"),
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase
          .from("subscription_plans")
          .select("*", { count: "exact", head: true })
          .eq("is_active", true),
      ]);

      return {
        totalRestaurants: restaurants.count || 0,
        activeSubscriptions: subscriptions.count || 0,
        totalUsers: users.count || 0,
        activePlans: plans.count || 0,
      };
    },
  });

  // Fetch recent restaurants
  const { data: recentRestaurants = [] } = useQuery({
    queryKey: ["recent-restaurants"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("restaurants")
        .select(
          `
          *,
          restaurant_subscriptions (
            status,
            current_period_end,
            subscription_plans:plan_id (name, price)
          )
        `
        )
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;
      return data || [];
    },
  });

  // Calculate revenue (mock - sum of active subscription prices)
  const { data: monthlyRevenue = 0 } = useQuery({
    queryKey: ["monthly-revenue"],
    queryFn: async () => {
      const { data } = await supabase
        .from("restaurant_subscriptions")
        .select("subscription_plans:plan_id(price)")
        .eq("status", "active");

      return (
        data?.reduce(
          (sum: number, sub: any) => sum + (sub.subscription_plans?.price || 0),
          0
        ) || 0
      );
    },
  });

  const statsCards = [
    {
      title: "Total Restaurants",
      value: stats?.totalRestaurants || 0,
      icon: Building2,
      color:
        "text-purple-600 bg-purple-50 dark:bg-purple-500/10 dark:text-purple-400",
      description: "Registered",
    },
    {
      title: "Active Subscriptions",
      value: stats?.activeSubscriptions || 0,
      icon: CreditCard,
      color:
        "text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-400",
      description: "Paid plans",
    },
    {
      title: "Total Users",
      value: stats?.totalUsers || 0,
      icon: Users,
      color: "text-blue-600 bg-blue-50 dark:bg-blue-500/10 dark:text-blue-400",
      description: "Across platform",
    },
    {
      title: "Monthly Revenue",
      value: `₹${monthlyRevenue.toLocaleString()}`,
      icon: TrendingUp,
      color:
        "text-amber-600 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-400",
      description: "From subscriptions",
      isString: true,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Platform Overview
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Manage all restaurants and subscriptions
          </p>
        </div>
        <Button
          onClick={() => navigate("/platform/restaurants")}
          className="bg-purple-600 hover:bg-purple-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Restaurant
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card
              key={stat.title}
              className="border-slate-200 dark:border-slate-700"
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {stat.title}
                    </p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                      {statsLoading ? (
                        <Loader2 className="h-6 w-6 animate-spin" />
                      ) : stat.isString ? (
                        stat.value
                      ) : (
                        (stat.value as number).toLocaleString()
                      )}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {stat.description}
                    </p>
                  </div>
                  <div className={`p-3 rounded-xl ${stat.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent Restaurants */}
      <Card className="border-slate-200 dark:border-slate-700">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-slate-900 dark:text-white">
              Recent Restaurants
            </CardTitle>
            <CardDescription>Latest onboarded restaurants</CardDescription>
          </div>
          <Button
            variant="ghost"
            className="text-purple-600 hover:text-purple-700"
            onClick={() => navigate("/platform/restaurants")}
          >
            View All <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentRestaurants.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                No restaurants found. Add your first restaurant!
              </div>
            ) : (
              recentRestaurants.map((restaurant: any) => {
                const subscription = restaurant.restaurant_subscriptions;
                const status = subscription?.status || "none";

                return (
                  <div
                    key={restaurant.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    onClick={() => navigate("/platform/restaurants")}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-500/20 flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">
                          {restaurant.name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {subscription?.subscription_plans?.name || "No plan"}{" "}
                          • {restaurant.phone || "No phone"}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        status === "active"
                          ? "border-emerald-300 text-emerald-700 bg-emerald-50 dark:border-emerald-500/50 dark:text-emerald-400 dark:bg-emerald-500/10"
                          : status === "trial"
                          ? "border-amber-300 text-amber-700 bg-amber-50 dark:border-amber-500/50 dark:text-amber-400 dark:bg-amber-500/10"
                          : "border-slate-300 text-slate-600 bg-slate-50 dark:border-slate-500/50 dark:text-slate-400"
                      }
                    >
                      {status === "active" && (
                        <CheckCircle className="h-3 w-3 mr-1" />
                      )}
                      {status === "trial" && <Clock className="h-3 w-3 mr-1" />}
                      {status !== "active" && status !== "trial" && (
                        <AlertTriangle className="h-3 w-3 mr-1" />
                      )}
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </Badge>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card
          className="border-slate-200 dark:border-slate-700 cursor-pointer hover:border-purple-300 dark:hover:border-purple-500 transition-colors"
          onClick={() => navigate("/platform/restaurants")}
        >
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-500/10">
              <Building2 className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h3 className="font-medium text-slate-900 dark:text-white">
                Manage Restaurants
              </h3>
              <p className="text-sm text-slate-500">
                Add, edit, delete restaurants
              </p>
            </div>
          </CardContent>
        </Card>

        <Card
          className="border-slate-200 dark:border-slate-700 cursor-pointer hover:border-emerald-300 dark:hover:border-emerald-500 transition-colors"
          onClick={() => navigate("/platform/subscriptions")}
        >
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10">
              <CreditCard className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h3 className="font-medium text-slate-900 dark:text-white">
                Subscription Plans
              </h3>
              <p className="text-sm text-slate-500">Manage pricing plans</p>
            </div>
          </CardContent>
        </Card>

        <Card
          className="border-slate-200 dark:border-slate-700 cursor-pointer hover:border-blue-300 dark:hover:border-blue-500 transition-colors"
          onClick={() => navigate("/platform/users")}
        >
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-500/10">
              <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="font-medium text-slate-900 dark:text-white">
                All Users
              </h3>
              <p className="text-sm text-slate-500">View platform users</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PlatformDashboard;
