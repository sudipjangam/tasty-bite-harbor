
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingCart, Clock, CheckCircle, IndianRupee, TrendingUp } from "lucide-react";

interface OrderStatsProps {
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  totalRevenue?: number;
}

const OrderStats: React.FC<OrderStatsProps> = ({ 
  totalOrders, 
  pendingOrders, 
  completedOrders,
  totalRevenue = 0
}) => {
  const completionRate = totalOrders > 0 ? Math.round((completedOrders / totalOrders) * 100) : 0;

  const stats = [
    {
      title: "Total Orders",
      value: totalOrders,
      icon: ShoppingCart,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      change: null
    },
    {
      title: "Pending Orders",
      value: pendingOrders,
      icon: Clock,
      color: "text-yellow-600",
      bgColor: "bg-yellow-50",
      change: null
    },
    {
      title: "Completed Orders",
      value: completedOrders,
      icon: CheckCircle,
      color: "text-green-600",
      bgColor: "bg-green-50",
      change: `${completionRate}% completion rate`
    },
    {
      title: "Total Revenue",
      value: `₹${totalRevenue.toFixed(2)}`,
      icon: IndianRupee,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      change: totalOrders > 0 ? `₹${(totalRevenue / totalOrders).toFixed(2)} avg per order` : null
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <Card key={index} className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              {stat.title}
            </CardTitle>
            <div className={`${stat.bgColor} ${stat.color} p-2 rounded-lg`}>
              <stat.icon className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {stat.value}
            </div>
            {stat.change && (
              <p className="text-xs text-gray-500 mt-1">
                {stat.change}
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default OrderStats;
