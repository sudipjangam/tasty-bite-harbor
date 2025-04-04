
import React from "react";
import { TrendingUp, AlertTriangle, Calendar } from "lucide-react";

export interface SmartInsightProps {
  title: string;
  description: string;
  type: "opportunity" | "alert" | "seasonal";
  impact?: number;
}

const SmartInsightItem: React.FC<SmartInsightProps> = ({ 
  title, 
  description, 
  type,
  impact 
}) => {
  const getTypeStyles = () => {
    switch (type) {
      case "opportunity":
        return {
          bg: "bg-yellow-50 dark:bg-yellow-900/20",
          border: "border-yellow-200 dark:border-yellow-800",
          titleColor: "text-yellow-800 dark:text-yellow-300",
          textColor: "text-yellow-600 dark:text-yellow-400",
          icon: <TrendingUp className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
        };
      case "alert":
        return {
          bg: "bg-blue-50 dark:bg-blue-900/20",
          border: "border-blue-200 dark:border-blue-800",
          titleColor: "text-blue-800 dark:text-blue-300",
          textColor: "text-blue-600 dark:text-blue-400",
          icon: <AlertTriangle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        };
      case "seasonal":
        return {
          bg: "bg-green-50 dark:bg-green-900/20",
          border: "border-green-200 dark:border-green-800",
          titleColor: "text-green-800 dark:text-green-300",
          textColor: "text-green-600 dark:text-green-400",
          icon: <Calendar className="h-4 w-4 text-green-600 dark:text-green-400" />
        };
    }
  };

  const styles = getTypeStyles();

  return (
    <div className={`p-3 ${styles.bg} rounded-lg border ${styles.border} transition-all hover:shadow-md`}>
      <div className="flex items-start">
        <div className="mr-2 mt-0.5">
          {styles.icon}
        </div>
        <div className="flex-1">
          <p className={`text-sm font-medium ${styles.titleColor}`}>{title}</p>
          <p className={`text-xs ${styles.textColor} mt-1`}>
            {description}
          </p>
          {impact !== undefined && (
            <div className="mt-2 flex justify-between items-center">
              <span className={`text-xs font-semibold ${styles.titleColor}`}>
                Potential Impact
              </span>
              <div className="bg-white dark:bg-gray-800 px-2 py-0.5 rounded-full">
                <span className={`text-xs font-bold ${styles.titleColor}`}>
                  {impact}%
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SmartInsightItem;
