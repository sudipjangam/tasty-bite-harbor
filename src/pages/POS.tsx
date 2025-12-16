import { useState } from "react";
import POSMode from "@/components/Orders/POS/POSMode";
import { StandardizedLayout } from "@/components/ui/standardized-layout";
import { MobileNavigation } from "@/components/ui/mobile-navigation";

const POS = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-slate-900 dark:to-indigo-950">
      {/* Modern Header with Glass Effect */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-b border-white/20 dark:border-gray-700/30 shadow-xl sticky top-0 z-40">
        <StandardizedLayout padding="md">
          <div className="mb-3 md:mb-6 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border border-white/30 dark:border-gray-700/30 rounded-2xl md:rounded-3xl shadow-xl p-3 md:p-6">
            <div>
              <h1 className="text-2xl md:text-4xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-1 md:mb-2">
                Point of Sale
              </h1>
              <p className="text-gray-600 dark:text-gray-400 text-sm md:text-lg">Fast and efficient order processing system</p>
            </div>
          </div>
        </StandardizedLayout>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden">
        <POSMode />
      </div>
      
      {/* <MobileNavigation /> */}
    </div>
  );
};

export default POS;
