
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
  Sparkles
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import Stats from "@/components/Dashboard/Stats";
import WeeklySalesChart from "@/components/Dashboard/WeeklySalesChart";

const Dashboard = () => {
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
      title: "Room Management",
      description: "Check room status",
      icon: <Bed className="h-5 w-5" />,
      onClick: () => navigate('/rooms'),
      variant: 'secondary' as const
    },
    {
      title: "Enhanced Analytics",
      description: "Advanced dashboard with interactive charts",
      icon: <Sparkles className="h-5 w-5" />,
      onClick: () => navigate('/enhanced-dashboard'),
      variant: 'primary' as const
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <PageHeader 
        title={`Welcome back${user?.email ? `, ${user.email.split('@')[0]}` : ''}!`}
        description="Here's what's happening with your restaurant today"
      />
      
      <div className="p-6 space-y-8">
        {/* Quick Actions */}
        <StandardizedCard className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Quick Actions</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">Common tasks and shortcuts</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action, index) => (
              <StandardizedButton
                key={index}
                onClick={action.onClick}
                variant={action.variant}
                className="h-auto p-4 flex flex-col items-center gap-2 text-center"
              >
                {action.icon}
                <div>
                  <div className="font-medium">{action.title}</div>
                  <div className="text-xs opacity-70">{action.description}</div>
                </div>
              </StandardizedButton>
            ))}
          </div>
        </StandardizedCard>

        {/* Stats Overview */}
        <StandardizedCard className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Performance Overview</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">Key metrics at a glance</p>
          </div>
          <Stats />
        </StandardizedCard>

        {/* Weekly Sales Chart */}
        <StandardizedCard className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Weekly Sales Trend</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">Revenue performance over the past week</p>
          </div>
          <WeeklySalesChart />
        </StandardizedCard>
      </div>
    </div>
  );
};

export default Dashboard;
