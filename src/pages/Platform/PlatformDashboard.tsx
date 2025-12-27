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
  ChevronRight,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

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
      gradient: "from-violet-500 to-purple-600",
      iconColor: "text-violet-100",
      bgIcon: "bg-violet-400/20",
      description: "Registered partners",
    },
    {
      title: "Active Subscriptions",
      value: stats?.activeSubscriptions || 0,
      icon: CreditCard,
      gradient: "from-emerald-500 to-teal-600",
      iconColor: "text-emerald-100",
      bgIcon: "bg-emerald-400/20",
      description: "Paid active plans",
    },
    {
      title: "Total Users",
      value: stats?.totalUsers || 0,
      icon: Users,
      gradient: "from-blue-500 to-indigo-600",
      iconColor: "text-blue-100",
      bgIcon: "bg-blue-400/20",
      description: "Platform wide users",
    },
    {
      title: "Monthly Revenue",
      value: `₹${monthlyRevenue.toLocaleString()}`,
      icon: TrendingUp,
      gradient: "from-amber-500 to-orange-600",
      iconColor: "text-amber-100",
      bgIcon: "bg-amber-400/20",
      description: "Recurring revenue",
      isString: true,
    },
  ];

  // Mock chart data
  const revenueData = [
    { month: "Jan", revenue: 45000 },
    { month: "Feb", revenue: 52000 },
    { month: "Mar", revenue: 48000 },
    { month: "Apr", revenue: 61000 },
    { month: "May", revenue: 55000 },
    { month: "Jun", revenue: 67000 },
  ];

  const growthData = [
    { month: "Jan", restaurants: 12, users: 45 },
    { month: "Feb", restaurants: 19, users: 58 },
    { month: "Mar", restaurants: 15, users: 62 },
    { month: "Apr", restaurants: 25, users: 78 },
    { month: "May", restaurants: 22, users: 85 },
    { month: "Jun", restaurants: 30, users: 102 },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 via-slate-800 to-slate-600 dark:from-white dark:via-slate-200 dark:to-slate-400 bg-clip-text text-transparent">
            Platform Overview
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-lg">
            Welcome back, here's what's happening today.
          </p>
        </div>
        <Button
          onClick={() => navigate("/platform/restaurants")}
          className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-violet-500/25 transition-all duration-300 transform hover:-translate-y-0.5 rounded-xl px-6 h-12"
        >
          <Plus className="h-5 w-5 mr-2" />
          Add Restaurant
        </Button>
      </div>

      {/* Stats Cards 3D */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.title}
              className={`relative overflow-hidden rounded-2xl p-6 bg-gradient-to-br ${stat.gradient} shadow-xl transform transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl group cursor-default`}
            >
              {/* Background Pattern */}
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
                <Icon className="h-24 w-24 text-white rotate-12" />
              </div>

              <div className="relative z-10">
                <div
                  className={`inline-flex p-3 rounded-xl ${stat.bgIcon} backdrop-blur-sm mb-4 border border-white/10 shadow-inner`}
                >
                  <Icon className={`h-6 w-6 ${stat.iconColor}`} />
                </div>
                <h3 className="text-white/80 font-medium text-sm">
                  {stat.title}
                </h3>
                <div className="text-3xl font-bold text-white mt-1 tracking-tight">
                  {statsLoading ? (
                    <Loader2 className="h-8 w-8 animate-spin text-white/50" />
                  ) : stat.isString ? (
                    stat.value
                  ) : (
                    (stat.value as number).toLocaleString()
                  )}
                </div>
                <p className="text-white/60 text-xs mt-2 font-medium">
                  {stat.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Restaurants - Glass Card */}
        <div className="lg:col-span-2 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-xl overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-100/50 dark:border-slate-800/50 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                Recent Restaurants
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Latest partners onboarded
              </p>
            </div>
            <Button
              variant="ghost"
              className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
              onClick={() => navigate("/platform/restaurants")}
            >
              View All <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>

          <div className="p-6 space-y-4">
            {recentRestaurants.length === 0 ? (
              <div className="text-center py-12 text-slate-400 bg-slate-50/50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                <Building2 className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>No restaurants found yet.</p>
                <Button
                  variant="link"
                  onClick={() => navigate("/platform/restaurants")}
                  className="mt-2 text-indigo-600"
                >
                  Add your first one
                </Button>
              </div>
            ) : (
              recentRestaurants.map((restaurant: any) => {
                const subscription = restaurant.restaurant_subscriptions;
                const status = subscription?.status || "none";

                return (
                  <div
                    key={restaurant.id}
                    className="group flex items-center justify-between p-4 rounded-xl bg-white/50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 hover:border-indigo-200 dark:hover:border-indigo-500/30 hover:shadow-lg hover:shadow-indigo-500/5 hover:-translate-y-1 transition-all duration-300 cursor-pointer"
                    onClick={() => navigate("/platform/restaurants")}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-500/10 dark:to-purple-500/10 border border-indigo-100 dark:border-indigo-500/20 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-300">
                        <Building2 className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          {restaurant.name}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge
                            variant="secondary"
                            className="bg-slate-100/50 dark:bg-slate-800/50 text-slate-500 text-xs font-normal border-0"
                          >
                            {subscription?.subscription_plans?.name ||
                              "No Plan"}
                          </Badge>
                          <span className="text-slate-300 dark:text-slate-600">
                            •
                          </span>
                          <span className="text-xs text-slate-500">
                            {restaurant.phone || "No phone"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <Badge
                      className={`
                        px-3 py-1 rounded-full border-0 shadow-sm
                        ${
                          status === "active"
                            ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                            : status === "trial"
                            ? "bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                        }
                      `}
                    >
                      {status === "active" && (
                        <CheckCircle className="h-3 w-3 mr-1.5" />
                      )}
                      {status === "trial" && (
                        <Clock className="h-3 w-3 mr-1.5" />
                      )}
                      {status !== "active" && status !== "trial" && (
                        <AlertTriangle className="h-3 w-3 mr-1.5" />
                      )}
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </Badge>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Quick Actions Panel */}
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-150 transition-transform duration-700">
              <CreditCard className="h-32 w-32 rotate-12" />
            </div>
            <h3 className="text-xl font-bold relative z-10">Manage Plans</h3>
            <p className="text-indigo-100 mt-2 relative z-10 text-sm max-w-[80%]">
              Update pricing, features, and billing cycles for your subscription
              tiers.
            </p>
            <Button
              onClick={() => navigate("/platform/subscriptions")}
              variant="secondary"
              className="mt-6 w-full bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-sm"
            >
              View Subscriptions
            </Button>
          </div>

          <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg p-6">
            <h3 className="font-semibold text-slate-800 dark:text-white mb-4">
              Quick Shortcuts
            </h3>
            <div className="space-y-3">
              <button
                onClick={() => navigate("/platform/users")}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-white/50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-700 border border-slate-100 dark:border-slate-700/50 hover:shadow-md transition-all duration-300 group text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 dark:bg-blue-500/10 text-blue-600 rounded-lg group-hover:scale-110 transition-transform">
                    <Users className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    User Management
                  </span>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                onClick={() => navigate("/platform/analytics")}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-white/50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-700 border border-slate-100 dark:border-slate-700/50 hover:shadow-md transition-all duration-300 group text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-pink-50 dark:bg-pink-500/10 text-pink-600 rounded-lg group-hover:scale-110 transition-transform">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    Platform Analytics
                  </span>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Revenue Trend Chart */}
        <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-xl p-6">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <div className="p-2 bg-emerald-100 dark:bg-emerald-500/20 rounded-lg">
                <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              Revenue Trend
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              Monthly recurring revenue
            </p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={12}
                  tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{
                    background: "rgba(255,255,255,0.9)",
                    border: "none",
                    borderRadius: "12px",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
                  }}
                  formatter={(value: number) => [
                    `₹${value.toLocaleString()}`,
                    "Revenue",
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#10b981"
                  strokeWidth={3}
                  fill="url(#colorRevenue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Platform Growth Chart */}
        <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-xl p-6">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <div className="p-2 bg-violet-100 dark:bg-violet-500/20 rounded-lg">
                <Building2 className="h-4 w-4 text-violet-600 dark:text-violet-400" />
              </div>
              Platform Growth
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              New restaurants & users per month
            </p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={growthData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    background: "rgba(255,255,255,0.9)",
                    border: "none",
                    borderRadius: "12px",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
                  }}
                />
                <Bar
                  dataKey="restaurants"
                  fill="#8b5cf6"
                  radius={[4, 4, 0, 0]}
                  name="Restaurants"
                />
                <Bar
                  dataKey="users"
                  fill="#6366f1"
                  radius={[4, 4, 0, 0]}
                  name="Users"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center gap-6 mt-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-violet-500" />
              <span className="text-slate-600 dark:text-slate-400">
                Restaurants
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-indigo-500" />
              <span className="text-slate-600 dark:text-slate-400">Users</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlatformDashboard;
