import { Card } from "@/components/ui/card";
import { Building2, TrendingUp, DollarSign, Calendar } from "lucide-react";
import { useCurrency } from "@/hooks/useCurrency";

interface HotelMetricsCardsProps {
  metrics: {
    totalRooms: number;
    occupiedRooms: number;
    occupancyRate: number;
    adr: number;
    revPAR: number;
    totalRoomRevenue: number;
    avgLengthOfStay: number;
    totalReservations: number;
  };
}

export const HotelMetricsCards = ({ metrics }: HotelMetricsCardsProps) => {
  const { formatCurrency } = useCurrency();

  const hotelStats = [
    {
      title: "Occupancy Rate",
      value: `${metrics.occupancyRate.toFixed(1)}%`,
      subtitle: `${metrics.occupiedRooms}/${metrics.totalRooms} rooms occupied`,
      icon: Building2,
      color: "from-blue-500 to-blue-600",
      bgColor: "bg-blue-50 dark:bg-blue-950/30",
      change: metrics.occupancyRate > 70 ? "+12%" : "-5%",
      trend: metrics.occupancyRate > 70 ? "up" : "down"
    },
    {
      title: "ADR (Avg Daily Rate)",
      value: formatCurrency(metrics.adr),
      subtitle: "Per room night",
      icon: DollarSign,
      color: "from-emerald-500 to-emerald-600",
      bgColor: "bg-emerald-50 dark:bg-emerald-950/30",
      change: "+8%",
      trend: "up"
    },
    {
      title: "RevPAR",
      value: formatCurrency(metrics.revPAR),
      subtitle: "Revenue per available room",
      icon: TrendingUp,
      color: "from-purple-500 to-purple-600",
      bgColor: "bg-purple-50 dark:bg-purple-950/30",
      change: "+15%",
      trend: "up"
    },
    {
      title: "Avg Length of Stay",
      value: `${metrics.avgLengthOfStay.toFixed(1)} nights`,
      subtitle: `${metrics.totalReservations} reservations`,
      icon: Calendar,
      color: "from-orange-500 to-orange-600",
      bgColor: "bg-orange-50 dark:bg-orange-950/30",
      change: "+3%",
      trend: "up"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {hotelStats.map((stat, index) => (
        <Card 
          key={index}
          className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm"
        >
          <div className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  {stat.title}
                </p>
                <h3 className="text-3xl font-bold text-foreground mb-1">
                  {stat.value}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {stat.subtitle}
                </p>
              </div>
              <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                <stat.icon className={`h-6 w-6 bg-gradient-to-br ${stat.color} bg-clip-text text-transparent`} />
              </div>
            </div>
            
            {/* Trend indicator */}
            <div className="mt-4 flex items-center gap-1">
              <TrendingUp className={`h-4 w-4 ${stat.trend === 'up' ? 'text-green-600' : 'text-red-600'}`} />
              <span className={`text-sm font-medium ${stat.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                {stat.change}
              </span>
              <span className="text-xs text-muted-foreground ml-1">vs last month</span>
            </div>
          </div>
          
          {/* Gradient background decoration */}
          <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${stat.color}`}></div>
        </Card>
      ))}
    </div>
  );
};
