
import React, { useMemo } from "react";
import { DollarSign, ShoppingCart, Users, TrendingUp } from "lucide-react";
import { CurrencyDisplay } from "@/components/ui/currency-display";

interface StatCardsProps {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  ordersToday: number;
  restaurantRevenue?: number;
  hotelRevenue?: number;
}

// Mini sparkline component
const MiniSparkline = ({ color = "white", data }: { color?: string; data: number[] }) => {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * 100;
    const y = 100 - ((value - min) / range) * 80 - 10;
    return `${x},${y}`;
  }).join(' ');
  
  return (
    <svg className="w-full h-12" viewBox="0 0 100 100" preserveAspectRatio="none">
      <defs>
        <linearGradient id={`sparkline-gradient-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.05" />
        </linearGradient>
      </defs>
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
      <polygon
        fill={`url(#sparkline-gradient-${color})`}
        points={`0,100 ${points} 100,100`}
      />
    </svg>
  );
};

const StatCards = ({ 
  totalRevenue, 
  totalOrders, 
  averageOrderValue, 
  ordersToday,
}: StatCardsProps) => {
  // Generate pseudo-random sparkline data based on actual values
  const generateSparklineData = (base: number, variance: number = 0.3) => {
    const data = [];
    for (let i = 0; i < 12; i++) {
      const factor = 0.5 + Math.sin(i * 0.8) * 0.3 + (i / 12) * 0.5;
      data.push(base * factor * (1 + (Math.random() - 0.5) * variance));
    }
    return data;
  };

  const sparklineData = useMemo(() => ({
    revenue: generateSparklineData(totalRevenue / 12),
    orders: generateSparklineData(totalOrders / 12),
    customers: generateSparklineData(1840 / 12), // Placeholder
    avgOrder: generateSparklineData(averageOrderValue),
  }), [totalRevenue, totalOrders, averageOrderValue]);

  const stats = [
    {
      title: "Total Revenue",
      value: totalRevenue,
      isCurrency: true,
      icon: DollarSign,
      gradient: "from-purple-500 via-purple-600 to-indigo-700",
      trend: "+12%",
      sparklineData: sparklineData.revenue,
    },
    {
      title: "Orders",
      value: totalOrders,
      isCurrency: false,
      icon: ShoppingCart,
      gradient: "from-blue-400 via-blue-500 to-cyan-600",
      trend: "+5%",
      sparklineData: sparklineData.orders,
    },
    {
      title: "Customers",
      value: ordersToday > 0 ? ordersToday * 15 : 1840, // Estimate based on orders
      isCurrency: false,
      icon: Users,
      gradient: "from-emerald-400 via-green-500 to-teal-600",
      trend: "+8%",
      sparklineData: sparklineData.customers,
    },
    {
      title: "Avg Order Value",
      value: averageOrderValue,
      isCurrency: true,
      icon: TrendingUp,
      gradient: "from-orange-400 via-orange-500 to-amber-600",
      trend: "+2%",
      sparklineData: sparklineData.avgOrder,
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <div 
          key={index}
          className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${stat.gradient} p-5 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]`}
        >
          {/* Content */}
          <div className="relative z-10">
            {/* Header with icon and title */}
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg">
                <stat.icon className="h-4 w-4 text-white" />
              </div>
              <span className="text-white/90 text-sm font-medium">{stat.title}</span>
            </div>
            
            {/* Value and trend */}
            <div className="flex items-end justify-between mb-2">
              <div className="text-white">
                <span className="text-3xl font-bold">
                  {stat.isCurrency ? (
                    <CurrencyDisplay amount={stat.value} showTooltip={false} className="text-white" />
                  ) : (
                    stat.value.toLocaleString()
                  )}
                </span>
              </div>
              <div className="flex items-center gap-1 px-2 py-1 bg-white/20 backdrop-blur-sm rounded-full">
                <TrendingUp className="h-3 w-3 text-white" />
                <span className="text-xs font-semibold text-white">{stat.trend}</span>
              </div>
            </div>
          </div>
          
          {/* Sparkline at bottom */}
          <div className="absolute bottom-0 left-0 right-0 h-12 opacity-80">
            <MiniSparkline color="white" data={stat.sparklineData} />
          </div>
          
          {/* Decorative gradient overlay */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl transform translate-x-16 -translate-y-16" />
        </div>
      ))}
    </div>
  );
};

export default StatCards;

