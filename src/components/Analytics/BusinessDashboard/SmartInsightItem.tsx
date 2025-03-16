
import React from "react";

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
          textColor: "text-yellow-600 dark:text-yellow-400"
        };
      case "alert":
        return {
          bg: "bg-blue-50 dark:bg-blue-900/20",
          border: "border-blue-200 dark:border-blue-800",
          titleColor: "text-blue-800 dark:text-blue-300",
          textColor: "text-blue-600 dark:text-blue-400"
        };
      case "seasonal":
        return {
          bg: "bg-green-50 dark:bg-green-900/20",
          border: "border-green-200 dark:border-green-800",
          titleColor: "text-green-800 dark:text-green-300",
          textColor: "text-green-600 dark:text-green-400"
        };
    }
  };

  const styles = getTypeStyles();

  return (
    <div className={`p-3 ${styles.bg} rounded-lg border ${styles.border}`}>
      <p className={`text-sm font-medium ${styles.titleColor}`}>{title}</p>
      <p className={`text-xs ${styles.textColor} mt-1`}>
        {description}
      </p>
      {impact !== undefined && (
        <div className="mt-2">
          <span className={`text-xs font-semibold ${styles.titleColor}`}>
            Impact: {impact}%
          </span>
        </div>
      )}
    </div>
  );
};

export default SmartInsightItem;
