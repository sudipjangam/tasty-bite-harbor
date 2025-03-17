
import React from "react";
import { Doughnut, Bar } from "react-chartjs-2";
import { Chart, ArcElement, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from "chart.js";
import { Card, CardContent } from "@/components/ui/card";
import { Users, DollarSign, ShoppingBag, Clock } from "lucide-react";

// Register Chart.js components
Chart.register(ArcElement, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const ModernStats = () => {
  // Sample data for charts
  const doughnutData = {
    labels: ["Main Course", "Appetizers", "Drinks", "Desserts"],
    datasets: [
      {
        data: [45, 20, 20, 15],
        backgroundColor: ["#4299E1", "#48BB78", "#F6AD55", "#F6E05E"],
        borderWidth: 0,
      },
    ],
  };

  const barData = {
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    datasets: [
      {
        label: "Revenue",
        data: [2300, 1700, 3100, 3500, 4700, 5200, 4100],
        backgroundColor: "#4299E1",
        borderRadius: 4,
      },
    ],
  };

  const barOptions = {
    responsive: true,
    plugins: {
      legend: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          display: false,
        },
      },
      x: {
        grid: {
          display: false,
        },
      },
    },
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Total Customers" 
          value="2,420" 
          trend="+12% vs last week" 
          trendPositive={true}
          description="Active diners this month"
          icon={Users}
          iconColor="bg-blue-100 text-blue-600"
        />
        <StatCard 
          title="Revenue" 
          value="₹23,592" 
          trend="+8% vs last week" 
          trendPositive={true}
          description="Total earnings this month"
          icon={DollarSign}
          iconColor="bg-green-100 text-green-600"
        />
        <StatCard 
          title="Orders" 
          value="342" 
          trend="+3% vs last week" 
          trendPositive={true}
          description="Completed orders today"
          icon={ShoppingBag}
          iconColor="bg-purple-100 text-purple-600"
        />
        <StatCard 
          title="Avg. Wait Time" 
          value="24m" 
          trend="-5% vs last week" 
          trendPositive={true}
          description="Average customer wait time"
          icon={Clock}
          iconColor="bg-orange-100 text-orange-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Weekly Revenue</h3>
              <span className="text-sm bg-green-100 text-green-600 px-2 py-1 rounded">+12%</span>
            </div>
            <p className="text-sm text-gray-500 mb-4">Revenue breakdown by day</p>
            <div className="h-64">
              <Bar data={barData} options={barOptions} />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Order Breakdown</h3>
              <div className="flex space-x-2">
                <button className="bg-blue-100 text-blue-600 px-2 py-1 rounded text-xs">Today</button>
                <button className="text-gray-500 px-2 py-1 rounded text-xs">Week</button>
              </div>
            </div>
            <p className="text-sm text-gray-500 mb-4">Distribution by category</p>
            <div className="h-64 flex justify-center">
              <div className="w-48">
                <Doughnut 
                  data={doughnutData} 
                  options={{ 
                    responsive: true, 
                    plugins: { 
                      legend: { 
                        position: 'bottom',
                        labels: { 
                          boxWidth: 10, 
                          padding: 15 
                        } 
                      } 
                    } 
                  }} 
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

interface StatCardProps {
  title: string;
  value: string;
  trend: string;
  trendPositive: boolean;
  description: string;
  icon: React.ElementType;
  iconColor: string;
}

const StatCard = ({ 
  title, 
  value, 
  trend, 
  trendPositive, 
  description, 
  icon: Icon,
  iconColor
}: StatCardProps) => {
  return (
    <Card className="overflow-hidden border border-gray-200">
      <CardContent className="p-6">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-sm font-medium text-gray-500">{title}</h3>
            <p className="text-2xl font-bold mt-1">{value}</p>
            <span className={`text-xs ${trendPositive ? 'text-green-600' : 'text-red-600'} mt-1 inline-block`}>
              {trend}
            </span>
            <p className="text-xs text-gray-500 mt-2">{description}</p>
          </div>
          <div className={`p-2 rounded-full ${iconColor}`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ModernStats;
