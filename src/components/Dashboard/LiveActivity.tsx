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
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-2xl" />
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
      gradient: "from-orange-400 via-orange-500 to-amber-500",
      shadow: "shadow-orange-500/30",
      border: "border-orange-200/50",
      status: activity.activeOrders > 10 ? "High Usage" : "Normal",
      statusColor: activity.activeOrders > 10 ? "bg-red-500" : "bg-green-500"
    },
    {
      icon: Users,
      title: "Checked-In Guests",
      value: activity.checkedInGuests,
      subtitle: `${activity.expectedCheckouts} checking out`,
      gradient: "from-blue-400 via-blue-500 to-indigo-500",
      shadow: "shadow-blue-500/30",
      border: "border-blue-200/50",
      status: activity.checkedInGuests > 20 ? "Busy" : "Steady",
      statusColor: activity.checkedInGuests > 20 ? "bg-purple-500" : "bg-blue-500"
    },
    {
      icon: Clock,
      title: "Kitchen Queue",
      value: activity.kitchenQueue,
      subtitle: `${activity.avgPrepTime}m avg prep`,
      gradient: "from-emerald-400 via-emerald-500 to-teal-500",
      shadow: "shadow-emerald-500/30",
      border: "border-emerald-200/50",
      status: activity.kitchenQueue > 10 ? "Delayed" : "On Time",
      statusColor: activity.kitchenQueue > 10 ? "bg-red-500" : "bg-green-500"
    }
  ];

  return (
    <Card className="relative overflow-hidden bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-white/20 dark:border-gray-700/30 rounded-3xl shadow-2xl p-6 md:p-8 hover:shadow-3xl transition-all duration-500 group/card">
      
      {/* Decorative background glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 group-hover/card:bg-purple-500/20 transition-all duration-500" />
      
      <div className="relative z-10 flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-600 blur-lg opacity-50 animate-pulse" />
            <div className="relative p-3 bg-gradient-to-r from-purple-500 to-pink-600 rounded-2xl shadow-lg border border-white/20">
              <Activity className="h-6 w-6 text-white" />
            </div>
            <span className="absolute -top-1 -right-1 h-3 w-3 bg-green-400 rounded-full border-2 border-white dark:border-gray-800 animate-ping" />
            <span className="absolute -top-1 -right-1 h-3 w-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-800" />
          </div>
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Live Operations
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">
              Real-time store pulse
            </p>
          </div>
        </div>
        {activity.hasAlerts && (
           <div className="animate-bounce">
             <Badge variant="destructive" className="h-8 px-3 rounded-xl shadow-red-500/30 shadow-lg text-sm flex items-center gap-2">
               <BellRing className="h-4 w-4" />
               {activity.alertCount} Alerts
             </Badge>
           </div>
        )}
      </div>

      <div className="space-y-4">
        {activityItems.map((item, index) => {
          const Icon = item.icon;
          return (
            <div 
              key={index}
              className={`group relative overflow-hidden rounded-2xl p-1 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${item.shadow}`}
            >
              {/* Gradient Border Effect */}
              <div className={`absolute inset-0 bg-gradient-to-r ${item.gradient} opacity-20 group-hover:opacity-100 transition-opacity duration-300`} />
              <div className="absolute inset-[1px] bg-white dark:bg-gray-900 rounded-[15px]" />
              
              <div className="relative z-10 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl bg-gradient-to-br ${item.gradient} shadow-lg text-white group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-700 dark:text-gray-200">
                      {item.title}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                      {item.subtitle}
                    </p>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className={`text-2xl font-bold bg-gradient-to-r ${item.gradient} bg-clip-text text-transparent`}>
                    {item.value}
                  </div>
                  <div className="flex items-center justify-end gap-1.5 mt-1">
                    <span className={`h-2 w-2 rounded-full ${item.statusColor} animate-pulse shadow-sm`} />
                    <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      {item.status}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

export default LiveActivity;
