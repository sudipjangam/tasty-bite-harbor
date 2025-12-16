import { Card } from "@/components/ui/card";
import { Activity, ShoppingBag, Users, Clock, BellRing } from "lucide-react";
import { useLiveActivity } from "@/hooks/useLiveActivity";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

const LiveActivity = () => {
  const { data: activity, isLoading, error } = useLiveActivity();

  if (isLoading) {
    return (
      <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-white/20 dark:border-gray-700/30 rounded-3xl shadow-2xl p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl shadow-lg animate-pulse">
            <Activity className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Live Activity
            </h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Real-time operational status
            </p>
          </div>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-2xl" />
          ))}
        </div>
      </Card>
    );
  }

  if (error || !activity) {
    return (
      <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-white/20 dark:border-gray-700/30 rounded-3xl shadow-2xl p-8">
        <div className="text-center text-red-500">
          Failed to load live activity
        </div>
      </Card>
    );
  }

  const activityItems = [
    {
      icon: ShoppingBag,
      title: "Active Orders",
      value: activity.activeOrders,
      subtitle: `${activity.pendingOrders} pending`,
      color: "from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20",
      borderColor: "border-orange-200/50",
      iconColor: "text-orange-600",
      iconBg: "bg-orange-100 dark:bg-orange-900/30",
      status: activity.activeOrders > 10 ? "High" : activity.activeOrders > 5 ? "Medium" : "Low",
      statusColor: activity.activeOrders > 10 ? "bg-red-500" : activity.activeOrders > 5 ? "bg-yellow-500" : "bg-green-500"
    },
    {
      icon: Users,
      title: "Checked-In Guests",
      value: activity.checkedInGuests,
      subtitle: `${activity.expectedCheckouts} check-out today`,
      color: "from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20",
      borderColor: "border-blue-200/50",
      iconColor: "text-blue-600",
      iconBg: "bg-blue-100 dark:bg-blue-900/30",
      status: activity.checkedInGuests > 20 ? "Full" : activity.checkedInGuests > 10 ? "Good" : "Low",
      statusColor: activity.checkedInGuests > 20 ? "bg-purple-500" : activity.checkedInGuests > 10 ? "bg-blue-500" : "bg-gray-500"
    },
    {
      icon: Clock,
      title: "Kitchen Queue",
      value: activity.kitchenQueue,
      subtitle: `Avg. ${activity.avgPrepTime} min prep`,
      color: "from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20",
      borderColor: "border-green-200/50",
      iconColor: "text-green-600",
      iconBg: "bg-green-100 dark:bg-green-900/30",
      status: activity.kitchenQueue > 15 ? "Busy" : activity.kitchenQueue > 8 ? "Normal" : "Clear",
      statusColor: activity.kitchenQueue > 15 ? "bg-red-500" : activity.kitchenQueue > 8 ? "bg-yellow-500" : "bg-green-500"
    }
  ];

  return (
    <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-white/20 dark:border-gray-700/30 rounded-3xl shadow-2xl p-8 transform hover:scale-[1.01] transition-all duration-300">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl shadow-lg relative">
          <Activity className="h-6 w-6 text-white" />
          <span className="absolute -top-1 -right-1 h-3 w-3 bg-green-500 rounded-full border-2 border-white animate-pulse"></span>
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Live Activity
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Real-time operational status
          </p>
        </div>
        {activity.hasAlerts && (
          <Badge variant="destructive" className="animate-pulse">
            <BellRing className="h-3 w-3 mr-1" />
            {activity.alertCount} alerts
          </Badge>
        )}
      </div>
      
      <div className="space-y-4">
        {activityItems.map((item, index) => {
          const Icon = item.icon;
          
          return (
            <div
              key={index}
              className={`group relative overflow-hidden bg-gradient-to-r ${item.color} rounded-2xl p-5 border ${item.borderColor} hover:shadow-lg transition-all duration-300`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                  <div className={`p-3 ${item.iconBg} rounded-xl group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className={`h-6 w-6 ${item.iconColor}`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {item.title}
                      </p>
                      <span className={`h-2 w-2 rounded-full ${item.statusColor} animate-pulse`}></span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {item.subtitle}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-3xl font-bold ${item.iconColor} mb-1`}>
                    {item.value}
                  </div>
                  <Badge 
                    variant="secondary" 
                    className="text-xs font-normal"
                  >
                    {item.status}
                  </Badge>
                </div>
              </div>
              
              {/* Animated background effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

export default LiveActivity;
