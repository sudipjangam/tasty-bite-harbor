import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useStatsData } from "@/hooks/useStatsData";
import { DollarSign, ShoppingBag, Bed, TrendingUp } from "lucide-react";

const RevenueBreakdown = () => {
  const { data: statsData } = useStatsData();

  const orders = statsData?.orders || [];
  const roomBillings = statsData?.roomBillings || [];

  // Calculate revenue from POS orders (completed only)
  const posRevenue = orders
    .filter(order => order.status === 'completed')
    .reduce((sum, order) => sum + (order.total || 0), 0);

  // Calculate revenue from room billings (paid only)
  const roomRevenue = roomBillings
    .filter(billing => billing.status === 'completed' || billing.status === 'paid')
    .reduce((sum, billing) => sum + (billing.total || 0), 0);

  const totalRevenue = posRevenue + roomRevenue;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const revenueItems = [
    {
      title: "POS & Food Sales",
      value: posRevenue,
      percentage: totalRevenue > 0 ? (posRevenue / totalRevenue) * 100 : 0,
      icon: ShoppingBag,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-100 dark:bg-blue-900/30",
    },
    {
      title: "Room Revenue",
      value: roomRevenue,
      percentage: totalRevenue > 0 ? (roomRevenue / totalRevenue) * 100 : 0,
      icon: Bed,
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-100 dark:bg-green-900/30",
    },
  ];

  return (
    <Card className="bg-white dark:bg-gray-800 shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-semibold flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-purple-600" />
            Revenue Breakdown
          </CardTitle>
          <div className="text-2xl font-bold text-purple-600">
            {formatCurrency(totalRevenue)}
          </div>
        </div>
        <p className="text-sm text-muted-foreground">Total revenue from all sources</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {revenueItems.map((item, index) => {
          const Icon = item.icon;
          return (
            <div
              key={index}
              className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600 transition-all duration-200 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${item.bgColor}`}>
                    <Icon className={`h-5 w-5 ${item.color}`} />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900 dark:text-gray-100">
                      {item.title}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {item.percentage.toFixed(1)}% of total
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    {formatCurrency(item.value)}
                  </div>
                </div>
              </div>
              {/* Progress bar */}
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${item.color.replace('text-', 'bg-')}`}
                  style={{ width: `${item.percentage}%` }}
                ></div>
              </div>
            </div>
          );
        })}

        {/* Summary */}
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span className="text-gray-600 dark:text-gray-400">Growth this week</span>
            </div>
            <span className="font-semibold text-green-600">+12.5%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default RevenueBreakdown;
