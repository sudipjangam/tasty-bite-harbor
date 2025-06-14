
import React from "react";
import { BarChart3, Package, Users, TrendingUp, Database, Sparkles } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

const AiCapabilities = () => {
  const capabilities = [
    {
      icon: <BarChart3 className="h-3 w-3" />,
      title: "Sales Analysis",
      description: "Analyze revenue trends and financial performance",
      color: "text-blue-600",
      bgColor: "from-blue-500/10 to-blue-600/10 border-blue-200/30"
    },
    {
      icon: <Package className="h-3 w-3" />,
      title: "Inventory Insights",
      description: "Check stock levels and get reorder suggestions",
      color: "text-purple-600",
      bgColor: "from-purple-500/10 to-purple-600/10 border-purple-200/30"
    },
    {
      icon: <Users className="h-3 w-3" />,
      title: "Menu Optimization",
      description: "Analyze menu performance and improvements",
      color: "text-orange-600",
      bgColor: "from-orange-500/10 to-orange-600/10 border-orange-200/30"
    },
    {
      icon: <TrendingUp className="h-3 w-3" />,
      title: "Staff Performance",
      description: "Analyze efficiency and scheduling effectiveness",
      color: "text-emerald-600",
      bgColor: "from-emerald-500/10 to-emerald-600/10 border-emerald-200/30"
    },
    {
      icon: <Database className="h-3 w-3" />,
      title: "Comprehensive Data Access",
      description: "Full access to Orders, Inventory, Revenue, Staff & more",
      color: "text-indigo-600",
      bgColor: "from-indigo-500/10 to-indigo-600/10 border-indigo-200/30"
    }
  ];

  return (
    <div className="h-full bg-white/80 backdrop-blur-xl border border-white/20 rounded-2xl shadow-xl p-3 flex flex-col">
      <div className="flex items-center gap-2 mb-3 flex-shrink-0">
        <div className="p-1.5 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl shadow-lg">
          <Database className="h-4 w-4 text-white" />
        </div>
        <div>
          <h2 className="text-base font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
            AI Capabilities
          </h2>
          <p className="text-xs text-gray-500 flex items-center gap-1">
            <Sparkles className="h-2 w-2" />
            Powered by advanced AI
          </p>
        </div>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="space-y-2 pr-2">
          {capabilities.map((capability, index) => (
            <div
              key={index}
              className={`p-2 bg-gradient-to-br ${capability.bgColor} backdrop-blur-sm border rounded-xl hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group`}
            >
              <div className="flex items-start gap-2">
                <div className={`${capability.color} p-1.5 bg-white/80 backdrop-blur-sm rounded-lg shadow-md group-hover:shadow-lg transition-all duration-300`}>
                  {capability.icon}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1 text-xs">
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
