
import { useState } from "react";
import { TrendingUp, Users, ShoppingBag, DollarSign } from "lucide-react";
import { useStatsData } from "@/hooks/useStatsData";
import StatCard from "./StatCard";
import StatDetails from "./StatDetails";

const Stats = () => {
  const [selectedStat, setSelectedStat] = useState<string | null>(null);
  const { data: ordersData } = useStatsData();

  // Calculate stats from orders
  const totalSales = ordersData?.reduce((sum, order) => sum + order.total, 0) || 0;
  const activeOrders = ordersData?.filter(order => order.status === "pending").length || 0;
  const uniqueCustomers = ordersData ? new Set(ordersData.map(order => order.customer_name)).size : 0;
  const todaysOrders = ordersData?.filter(order => {
    const orderDate = new Date(order.created_at).toDateString();
    const today = new Date().toDateString();
    return orderDate === today;
  }) || [];
  const todaysRevenue = todaysOrders.reduce((sum, order) => sum + order.total, 0);

  const stats = [
    {
      title: "Total Sales",
      value: `₹${totalSales.toFixed(2)}`,
      icon: DollarSign,
      trend: "+12.5%",
      color: "text-green-600",
      type: "sales" as const,
      chart: ordersData?.map(order => ({
        date: new Date(order.created_at).toLocaleDateString(),
        amount: order.total
      })) || []
    },
    {
      title: "Active Orders",
      value: activeOrders.toString(),
      icon: ShoppingBag,
      trend: "+3",
      color: "text-blue-600",
      type: "orders" as const,
      data: ordersData?.filter(order => order.status === "pending") || []
    },
    {
      title: "Customers",
      value: uniqueCustomers.toString(),
      icon: Users,
      trend: "+5",
      color: "text-purple-600",
      type: "customers" as const,
      data: ordersData?.map(order => ({
        name: order.customer_name,
        orders: 1,
        total: order.total
      })) || []
    },
    {
      title: "Today's Revenue",
      value: `₹${todaysRevenue.toFixed(2)}`,
      icon: TrendingUp,
      trend: "+8.2%",
      color: "text-orange-600",
      type: "revenue" as const,
      chart: todaysOrders.map(order => ({
        time: new Date(order.created_at).toLocaleTimeString(),
        amount: order.total
      }))
    },
  ];

  // Find the selected stat data
  const selectedStatData = selectedStat ? stats.find(stat => stat.title === selectedStat) : null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in">
        {stats.map((stat, index) => (
          <StatCard
            key={index}
            title={stat.title}
            value={stat.value}
            icon={stat.icon}
            trend={stat.trend}
            color={stat.color}
            onClick={() => setSelectedStat(stat.title)}
          />
        ))}
      </div>

      {selectedStatData && (
        <StatDetails
          title={selectedStat}
          data={selectedStatData}
          type={selectedStatData.type}
          onClose={() => setSelectedStat(null)}
        />
      )}
    </div>
  );
};

export default Stats;
