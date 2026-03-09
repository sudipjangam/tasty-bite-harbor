import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { usePlanType, PlanInsight } from "@/hooks/usePlanType";
import { Lightbulb, BarChart3, AlertTriangle, Info } from "lucide-react";

/**
 * Displays category-specific tips, benchmarks, and insights for business owners.
 * Shown contextually on Expenses, Financial, and Analytics pages.
 */
const PlanInsightsCard = () => {
  const { insights, label, isLoading } = usePlanType();

  if (isLoading || insights.length === 0) return null;

  const getIcon = (iconType: PlanInsight["icon"]) => {
    switch (iconType) {
      case "tip":
        return <Lightbulb className="h-4 w-4" />;
      case "benchmark":
        return <BarChart3 className="h-4 w-4" />;
      case "alert":
        return <AlertTriangle className="h-4 w-4" />;
      case "info":
        return <Info className="h-4 w-4" />;
    }
  };

  return (
    <Card className="bg-gradient-to-br from-white/90 to-gray-50/90 dark:from-gray-800/90 dark:to-gray-900/90 backdrop-blur-sm border border-gray-200/60 dark:border-gray-700/60 shadow-lg overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-1.5 rounded-lg bg-gradient-to-r from-purple-500 to-indigo-500 text-white">
            <Lightbulb className="h-3.5 w-3.5" />
          </div>
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
            {label} Insights
          </h3>
        </div>
        <div className="space-y-2.5">
          {insights.map((insight, index) => (
            <div
              key={index}
              className="flex items-start gap-2.5 p-2 rounded-lg bg-white/60 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700/40 hover:shadow-sm transition-all duration-200"
            >
              <div
                className={`p-1 rounded-md bg-gradient-to-r ${insight.color} text-white flex-shrink-0 mt-0.5`}
              >
                {getIcon(insight.icon)}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  {insight.title}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mt-0.5">
                  {insight.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default PlanInsightsCard;
