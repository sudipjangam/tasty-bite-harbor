import React from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { Users, DollarSign, ShoppingBag, Clock } from "lucide-react";

const ModernStats = () => {
  // Sample data for charts
  const pieData = [
    { name: "Main Course", value: 45 },
    { name: "Appetizers", value: 20 },
    { name: "Drinks", value: 20 },
    { name: "Desserts", value: 15 }
  ];

  const barData = [
    { name: "Mon", revenue: 2300 },
    { name: "Tue", revenue: 1700 },
    { name: "Wed", revenue: 3100 },
    { name: "Thu", revenue: 3500 },
    { name: "Fri", revenue: 4700 },
    { name: "Sat", revenue: 5200 },
    { name: "Sun", revenue: 4100 }
  ];

  const COLORS = ["#4299E1", "#48BB78", "#F6AD55", "#F6E05E"];

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
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Bar dataKey="revenue" fill="#4299E1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
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
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    fill="#8884d8"
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
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
