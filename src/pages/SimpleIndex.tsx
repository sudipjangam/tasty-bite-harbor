
import React from "react";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/Layout/PageHeader";
import { StandardizedCard } from "@/components/ui/standardized-card";
import { StandardizedButton } from "@/components/ui/standardized-button";
import { 
  BarChart3, 
  ShoppingCart, 
  Users, 
  DollarSign, 
  TrendingUp,
  Plus,
  Settings,
  Coffee,
  Bed,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import Stats from "@/components/Dashboard/Stats";
import WeeklySalesChart from "@/components/Dashboard/WeeklySalesChart";

const SimpleIndex = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const quickActions = [
    {
      title: "New Order",
      description: "Create a new order",
      icon: <Plus className="h-5 w-5" />,
      onClick: () => navigate('/orders'),
      variant: 'primary' as const
    },
    {
      title: "View Menu",
      description: "Manage menu items",
      icon: <Coffee className="h-5 w-5" />,
      onClick: () => navigate('/menu'),
      variant: 'secondary' as const
    },
    {
      title: "Room Status",
      description: "Check room availability",
      icon: <Bed className="h-5 w-5" />,
      onClick: () => navigate('/rooms'),
      variant: 'secondary' as const
    },
    {
      title: "Analytics",
      description: "View business insights",
      icon: <BarChart3 className="h-5 w-5" />,
      onClick: () => navigate('/analytics'),
      variant: 'secondary' as const
    }
  ];

  return (
    <div className="p-4 md:p-6 space-y-6 bg-gradient-to-br from-gray-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 min-h-screen">
      <PageHeader
        title={`Welcome back${user?.email ? `, ${user.email.split('@')[0]}` : ''}!`}
        description="Here's an overview of your restaurant and hotel operations"
      />

      {/* Quick Actions */}
      <StandardizedCard>
        <h2 className="text-lg font-semibold mb-4 flex items-center">
          <Settings className="h-5 w-5 mr-2 text-purple-600" />
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action, index) => (
            <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-purple-300 dark:hover:border-purple-600 transition-all duration-200 hover:shadow-md bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900">
              <div className="flex items-start justify-between mb-3">
                <div className="bg-purple-100 dark:bg-purple-900/30 p-2 rounded-lg">
                  {action.icon}
                </div>
              </div>
              <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                {action.title}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                {action.description}
              </p>
              <StandardizedButton
                variant={action.variant}
                size="sm"
                onClick={action.onClick}
                className="w-full"
              >
                {action.title}
              </StandardizedButton>
            </div>
          ))}
        </div>
      </StandardizedCard>

      {/* Stats Section */}
      <Stats />

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StandardizedCard>
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            <TrendingUp className="h-5 w-5 mr-2 text-purple-600" />
            Sales Overview
          </h2>
          <WeeklySalesChart />
        </StandardizedCard>
        
        <StandardizedCard>
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            <BarChart3 className="h-5 w-5 mr-2 text-purple-600" />
            Performance Metrics
          </h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <span className="text-sm font-medium text-green-800 dark:text-green-200">
                Customer Satisfaction
              </span>
              <span className="text-lg font-bold text-green-600">96%</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                Table Turnover Rate
              </span>
              <span className="text-lg font-bold text-blue-600">2.3x</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <span className="text-sm font-medium text-purple-800 dark:text-purple-200">
                Room Occupancy
              </span>
              <span className="text-lg font-bold text-purple-600">78%</span>
            </div>
          </div>
        </StandardizedCard>
      </div>
    </div>
  );
};

export default SimpleIndex;
