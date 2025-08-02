
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, FileText, Users, Calendar, TrendingUp, ArrowUpRight } from "lucide-react";
import { CurrencyDisplay } from "@/components/ui/currency-display";

interface StatCardsProps {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  ordersToday: number;
}

const StatCards = ({ totalRevenue, totalOrders, averageOrderValue, ordersToday }: StatCardsProps) => {
  const stats = [
    {
      title: "Total Revenue",
      subtitle: "30 days",
      value: totalRevenue,
      icon: BarChart3,
      gradient: "from-purple-500 to-indigo-600",
      bgGradient: "from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20",
      trend: "+12.5%",
      description: "Based on all sales in the last 30 days"
    },
    {
      title: "Total Orders",
      subtitle: "30 days",
      value: totalOrders.toString(),
      icon: FileText,
      gradient: "from-blue-500 to-cyan-600",
      bgGradient: "from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20",
      trend: "+8.3%",
      description: "Number of orders placed in the last 30 days"
    },
    {
      title: "Average Order",
      subtitle: "Value",
      value: averageOrderValue,
      icon: Users,
      gradient: "from-green-500 to-emerald-600",
      bgGradient: "from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20",
      trend: "+15.2%",
      description: "Average spend per order"
    },
    {
      title: "Today's Orders",
      subtitle: "Real-time",
      value: ordersToday.toString(),
      icon: Calendar,
      gradient: "from-orange-500 to-red-600",
      bgGradient: "from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20",
      trend: "+22.1%",
      description: "Orders received today"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat, index) => (
        <div 
          key={index}
          className="group relative overflow-hidden bg-white/90 backdrop-blur-sm border border-white/30 rounded-2xl p-6 hover:bg-white hover:border-purple-200 hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
        >
          {/* Gradient overlay */}
          <div className={`absolute inset-0 bg-gradient-to-br ${stat.bgGradient} opacity-40 group-hover:opacity-60 transition-opacity duration-300`}></div>
          
          <div className="relative z-10">
            <CardHeader className="p-0 pb-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-3 bg-gradient-to-r ${stat.gradient} rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    <stat.icon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      {stat.title}
                    </CardTitle>
                    <p className="text-xs text-gray-500 dark:text-gray-500">{stat.subtitle}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <ArrowUpRight className="h-3 w-3 text-green-600" />
                  <span className="text-xs font-medium text-green-600">{stat.trend}</span>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="p-0">
              <div className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2 group-hover:text-purple-700 dark:group-hover:text-purple-300 transition-colors duration-300">
                {typeof stat.value === 'number' ? (
                  <CurrencyDisplay amount={stat.value} showTooltip={true} />
                ) : (
                  stat.value
                )}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                {stat.description}
              </p>
              
              {/* Progress bar */}
              <div className="mt-4">
                <div className="w-full h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className={`h-full bg-gradient-to-r ${stat.gradient} transform transition-all duration-1000 ease-out`}
                    style={{ width: `${65 + Math.random() * 30}%` }}
                  ></div>
                </div>
              </div>
            </CardContent>
          </div>
        </div>
      ))}
    </div>
  );
};

export default StatCards;
