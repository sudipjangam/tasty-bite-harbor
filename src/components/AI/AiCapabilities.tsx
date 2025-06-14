
import React from "react";
import { BarChart3, Package, Users, TrendingUp, Database, Sparkles } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

const AiCapabilities = () => {
  const capabilities = [
    {
      icon: <BarChart3 className="h-5 w-5" />,
      title: "Sales Analysis",
      description: "Analyze revenue trends, order patterns, and financial performance",
      color: "text-blue-600",
      bgColor: "from-blue-500/10 to-blue-600/10 border-blue-200/30"
    },
    {
      icon: <Package className="h-5 w-5" />,
      title: "Inventory Insights",
      description: "Check stock levels, get reorder suggestions, and track usage",
      color: "text-purple-600",
      bgColor: "from-purple-500/10 to-purple-600/10 border-purple-200/30"
    },
    {
      icon: <Users className="h-5 w-5" />,
      title: "Menu Optimization",
      description: "Analyze menu performance and get suggestions for improvements",
      color: "text-orange-600",
      bgColor: "from-orange-500/10 to-orange-600/10 border-orange-200/30"
    },
    {
      icon: <TrendingUp className="h-5 w-5" />,
      title: "Staff Performance",
      description: "Analyze staff efficiency, sales per server, and scheduling effectiveness",
      color: "text-emerald-600",
      bgColor: "from-emerald-500/10 to-emerald-600/10 border-emerald-200/30"
    },
    {
      icon: <Database className="h-5 w-5" />,
      title: "Comprehensive Data Access",
      description: "Analyzes Orders, Inventory, Revenue, Menu Items, Staff, Customers, Suppliers, Reservations & more",
      color: "text-indigo-600",
      bgColor: "from-indigo-500/10 to-indigo-600/10 border-indigo-200/30"
    }
  ];

  return (
    <div className="h-full bg-white/80 backdrop-blur-xl border border-white/20 rounded-3xl shadow-xl p-6 flex flex-col">
      <div className="flex items-center gap-3 mb-6 flex-shrink-0">
        <div className="p-3 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-2xl shadow-lg">
          <Database className="h-6 w-6 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
            AI Capabilities
          </h2>
          <p className="text-sm text-gray-500 flex items-center gap-1">
            <Sparkles className="h-3 w-3" />
            Powered by advanced AI
          </p>
        </div>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="space-y-4 pr-2">
          {capabilities.map((capability, index) => (
            <div
              key={index}
              className={`p-4 bg-gradient-to-br ${capability.bgColor} backdrop-blur-sm border rounded-2xl hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group`}
            >
              <div className="flex items-start gap-4">
                <div className={`${capability.color} p-3 bg-white/80 backdrop-blur-sm rounded-xl shadow-md group-hover:shadow-lg transition-all duration-300`}>
                  {capability.icon}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 text-sm">
                    {capability.title}
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                    {capability.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export default AiCapabilities;
