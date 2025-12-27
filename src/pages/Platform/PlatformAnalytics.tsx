import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3,
  Building2,
  Users,
  CreditCard,
  TrendingUp,
  TrendingDown,
  Calendar,
  Loader2,
  IndianRupee,
  PieChart,
} from "lucide-react";

const PlatformAnalytics = () => {
  // Fetch comprehensive platform stats
  const { data: stats, isLoading } = useQuery({
    queryKey: ["platform-analytics"],
    queryFn: async () => {
      const now = new Date();
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

      // Total restaurants
      const { count: totalRestaurants } = await supabase
        .from("restaurants")
        .select("*", { count: "exact", head: true });

      // Restaurants this month
      const { count: newRestaurants } = await supabase
        .from("restaurants")
        .select("*", { count: "exact", head: true })
        .gte("created_at", thisMonth.toISOString());

      // Restaurants last month
      const { count: lastMonthRestaurants } = await supabase
        .from("restaurants")
        .select("*", { count: "exact", head: true })
        .gte("created_at", lastMonth.toISOString())
        .lt("created_at", thisMonth.toISOString());

      // Active subscriptions
      const { count: activeSubscriptions } = await supabase
        .from("restaurant_subscriptions")
        .select("*", { count: "exact", head: true })
        .eq("status", "active");

      // Trial subscriptions
      const { count: trialSubscriptions } = await supabase
        .from("restaurant_subscriptions")
        .select("*", { count: "exact", head: true })
        .eq("status", "trial");

      // Total users
      const { count: totalUsers } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      // Users by role
      const { data: roleData } = await supabase.from("profiles").select("role");

      const roleBreakdown: Record<string, number> = {};
      roleData?.forEach((p: any) => {
        roleBreakdown[p.role] = (roleBreakdown[p.role] || 0) + 1;
      });

      // Revenue from active subscriptions
      const { data: subscriptionData } = await supabase
        .from("restaurant_subscriptions")
        .select("subscription_plans(price)")
        .eq("status", "active");

      const monthlyRevenue =
        subscriptionData?.reduce(
          (sum: number, sub: any) => sum + (sub.subscription_plans?.price || 0),
          0
        ) || 0;

      // Plan distribution
      const { data: planData } = await supabase
        .from("restaurant_subscriptions")
        .select("subscription_plans(name)");

      const planBreakdown: Record<string, number> = {};
      planData?.forEach((sub: any) => {
        const name = sub.subscription_plans?.name || "Unknown";
        planBreakdown[name] = (planBreakdown[name] || 0) + 1;
      });

      return {
        totalRestaurants: totalRestaurants || 0,
        newRestaurants: newRestaurants || 0,
        lastMonthRestaurants: lastMonthRestaurants || 0,
        activeSubscriptions: activeSubscriptions || 0,
        trialSubscriptions: trialSubscriptions || 0,
        totalUsers: totalUsers || 0,
        monthlyRevenue,
        roleBreakdown,
        planBreakdown,
      };
    },
  });

  const restaurantGrowth = stats?.lastMonthRestaurants
    ? ((stats.newRestaurants - stats.lastMonthRestaurants) /
        stats.lastMonthRestaurants) *
      100
    : 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Platform Analytics
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Overview of platform performance and metrics
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200 dark:border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Restaurants</p>
                <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">
                  {stats?.totalRestaurants}
                </p>
                <div className="flex items-center gap-1 mt-2 text-sm">
                  {restaurantGrowth >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-500" />
                  )}
                  <span
                    className={
                      restaurantGrowth >= 0
                        ? "text-emerald-600"
                        : "text-red-600"
                    }
                  >
                    {Math.abs(restaurantGrowth).toFixed(0)}%
                  </span>
                  <span className="text-slate-400">vs last month</span>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-500/10">
                <Building2 className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500">Active Subscriptions</p>
                <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">
                  {stats?.activeSubscriptions}
                </p>
                <p className="text-sm text-amber-600 mt-2">
                  +{stats?.trialSubscriptions} on trial
                </p>
              </div>
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10">
                <CreditCard className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Users</p>
                <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">
                  {stats?.totalUsers}
                </p>
                <p className="text-sm text-slate-400 mt-2">
                  Across all restaurants
                </p>
              </div>
              <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-500/10">
                <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500">Monthly Revenue</p>
                <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1 flex items-center">
                  <IndianRupee className="h-6 w-6" />
                  {stats?.monthlyRevenue?.toLocaleString()}
                </p>
                <p className="text-sm text-slate-400 mt-2">
                  From subscriptions
                </p>
              </div>
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10">
                <TrendingUp className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Breakdowns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Users by Role */}
        <Card className="border-slate-200 dark:border-slate-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-600" />
              Users by Role
            </CardTitle>
            <CardDescription>Distribution across roles</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(stats?.roleBreakdown || {}).map(
                ([role, count]) => (
                  <div key={role} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-purple-500" />
                      <span className="capitalize text-slate-700 dark:text-slate-300">
                        {role}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-purple-500"
                          style={{
                            width: `${
                              ((count as number) / (stats?.totalUsers || 1)) *
                              100
                            }%`,
                          }}
                        />
                      </div>
                      <span className="text-sm font-medium w-8 text-right">
                        {count as number}
                      </span>
                    </div>
                  </div>
                )
              )}
            </div>
          </CardContent>
        </Card>

        {/* Subscriptions by Plan */}
        <Card className="border-slate-200 dark:border-slate-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5 text-emerald-600" />
              Subscriptions by Plan
            </CardTitle>
            <CardDescription>Popular plans</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(stats?.planBreakdown || {})
                .sort(([, a], [, b]) => (b as number) - (a as number))
                .slice(0, 6)
                .map(([plan, count], idx) => {
                  const colors = [
                    "bg-purple-500",
                    "bg-blue-500",
                    "bg-emerald-500",
                    "bg-amber-500",
                    "bg-pink-500",
                    "bg-indigo-500",
                  ];
                  return (
                    <div
                      key={plan}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-3 h-3 rounded-full ${
                            colors[idx % colors.length]
                          }`}
                        />
                        <span className="text-sm text-slate-700 dark:text-slate-300 truncate max-w-[180px]">
                          {plan}
                        </span>
                      </div>
                      <Badge variant="outline">{count as number}</Badge>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* This Month Summary */}
      <Card className="border-slate-200 dark:border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            This Month
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-500/10">
              <p className="text-sm text-purple-600 dark:text-purple-400">
                New Restaurants
              </p>
              <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                {stats?.newRestaurants}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-500/10">
              <p className="text-sm text-emerald-600 dark:text-emerald-400">
                Active Plans
              </p>
              <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                {stats?.activeSubscriptions}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-500/10">
              <p className="text-sm text-amber-600 dark:text-amber-400">
                Trial Users
              </p>
              <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">
                {stats?.trialSubscriptions}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-500/10">
              <p className="text-sm text-blue-600 dark:text-blue-400">
                Est. Revenue
              </p>
              <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                ₹{stats?.monthlyRevenue?.toLocaleString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PlatformAnalytics;
