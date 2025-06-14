
import React from "react";
import FinancialDashboard from "@/components/Financial/FinancialDashboard";

const Financial = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-slate-900 dark:to-blue-950 animate-fade-in">
      <FinancialDashboard />
    </div>
  );
};

export default Financial;
