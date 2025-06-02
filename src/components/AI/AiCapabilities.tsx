
import React from "react";
import { BarChart3, Package, Users, TrendingUp, Database } from "lucide-react";
import { StandardizedCard } from "@/components/ui/standardized-card";

const AiCapabilities = () => {
  const capabilities = [
    {
      icon: <BarChart3 className="h-5 w-5" />,
      title: "Sales Analysis",
      description: "Analyze revenue trends, order patterns, and financial performance",
      color: "text-blue-600"
    },
    {
      icon: <Package className="h-5 w-5" />,
      title: "Inventory Insights",
      description: "Check stock levels, get reorder suggestions, and track usage",
      color: "text-purple-600"
    },
    {
      icon: <Users className="h-5 w-5" />,
      title: "Menu Optimization",
      description: "Analyze menu performance and get suggestions for improvements",
      color: "text-orange-600"
    },
    {
      icon: <TrendingUp className="h-5 w-5" />,
      title: "Staff Performance",
      description: "Analyze staff efficiency, sales per server, and scheduling effectiveness",
      color: "text-red-600"
    },
    {
      icon: <Database className="h-5 w-5" />,
      title: "Comprehensive Data Access",
      description: "Analyzes Orders, Inventory, Revenue, Menu Items, Staff, Customers, Suppliers, Reservations & more",
      color: "text-green-600"
    }
  ];

  return (
    <StandardizedCard className="mb-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="bg-purple-100 dark:bg-purple-900/30 p-2 rounded-lg">
          <Database className="h-5 w-5 text-purple-600" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          AI Capabilities
        </h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {capabilities.map((capability, index) => (
          <div
            key={index}
            className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-purple-300 dark:hover:border-purple-600 transition-all duration-200 hover:shadow-md bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900"
          >
            <div className="flex items-start gap-3">
              <div className={`${capability.color} bg-gray-100 dark:bg-gray-800 p-2 rounded-lg`}>
                {capability.icon}
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                  {capability.title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {capability.description}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </StandardizedCard>
  );
};

export default AiCapabilities;
