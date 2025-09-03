import { Card } from "@/components/ui/card";
import { BarChart3, Users, Repeat, Building } from "lucide-react";
import { usePerformanceMetrics } from "@/hooks/usePerformanceMetrics";
import { Skeleton } from "@/components/ui/skeleton";

const PerformanceMetrics = () => {
  const { data: metrics, isLoading, error } = usePerformanceMetrics();

  if (isLoading) {
    return (
      <Card className="bg-white/80 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl shadow-lg">
            <BarChart3 className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Performance Metrics
            </h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Key business indicators
            </p>
          </div>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-2xl" />
          ))}
        </div>
      </Card>
    );
  }

  if (error || !metrics) {
    return (
      <Card className="bg-white/80 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl p-8">
        <div className="text-center text-red-500">
          Failed to load performance metrics
        </div>
      </Card>
    );
  }

  const metricItems = [
    {
      icon: Users,
      title: "Customer Satisfaction",
      value: `${metrics.customerSatisfaction}%`,
      change: metrics.customerSatisfactionChange,
      color: "from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20",
      borderColor: "border-green-200/50",
      iconColor: "text-green-600",
      valueColor: "text-green-600"
    },
    {
      icon: Repeat,
      title: "Table Turnover Rate",
      value: `${metrics.tableTurnoverRate}x`,
      change: metrics.tableTurnoverChange,
      color: "from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20",
      borderColor: "border-blue-200/50",
      iconColor: "text-blue-600",
      valueColor: "text-blue-600"
    },
    {
      icon: Building,
      title: "Room Occupancy",
      value: `${metrics.roomOccupancy}%`,
      change: metrics.roomOccupancyChange,
      color: "from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20",
      borderColor: "border-purple-200/50",
      iconColor: "text-purple-600",
      valueColor: "text-purple-600"
    }
  ];

  return (
    <Card className="bg-white/80 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl p-8 transform hover:scale-[1.01] transition-all duration-300">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl shadow-lg">
          <BarChart3 className="h-6 w-6 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Performance Metrics
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Key business indicators
          </p>
        </div>
      </div>
      
      <div className="space-y-4">
        {metricItems.map((metric, index) => {
          const Icon = metric.icon;
          const isPositive = metric.change > 0;
          const changeText = isPositive ? `+${metric.change}` : `${metric.change}`;
          
          return (
            <div
              key={index}
              className={`group relative overflow-hidden bg-gradient-to-r ${metric.color} rounded-2xl p-4 border ${metric.borderColor} hover:shadow-lg transition-all duration-300`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 ${metric.iconColor} bg-white/50 rounded-lg`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {metric.title}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className={`text-2xl font-bold ${metric.valueColor}`}>
                        {metric.value}
                      </span>
                      <span 
                        className={`text-sm font-medium ${
                          isPositive ? 'text-green-600' : 'text-red-500'
                        }`}
                      >
                        {changeText} this week
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Subtle animation effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transform translate-x-[-100%] group-hover:translate-x-[100%] transition-all duration-1000"></div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

export default PerformanceMetrics;