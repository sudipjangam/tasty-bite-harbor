import { useState } from "react";
import POSMode from "@/components/Orders/POS/POSMode";
import { StandardizedLayout } from "@/components/ui/standardized-layout";
import { MobileNavigation } from "@/components/ui/mobile-navigation";
import { Sparkles, Zap } from "lucide-react";

const POS = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-slate-900 dark:to-indigo-950">
      {/* Modern 3D Header with Vibrant Gradient */}
      <div className="sticky top-0 z-40">
        <div className="relative overflow-hidden">
          {/* 3D Gradient Background */}
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600"></div>
          <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent"></div>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-pink-400/30 via-transparent to-transparent"></div>
          
          {/* Decorative Elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-white/20 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/4"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-indigo-400/30 to-transparent rounded-full blur-2xl translate-y-1/2 -translate-x-1/4"></div>
          
          {/* Content */}
          <StandardizedLayout padding="md">
            <div className="relative py-4 md:py-6">
              <div className="flex items-center gap-4">
                {/* 3D Icon Badge */}
                <div className="relative">
                  <div className="absolute inset-0 bg-white/30 rounded-2xl blur-lg"></div>
                  <div className="relative p-3 md:p-4 bg-white/20 backdrop-blur-sm border border-white/30 rounded-2xl shadow-2xl">
                    <Zap className="w-6 h-6 md:w-8 md:h-8 text-white drop-shadow-lg" />
                  </div>
                </div>
                
                {/* Title */}
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h1 className="text-2xl md:text-4xl font-bold text-white drop-shadow-lg tracking-tight">
                      Point of Sale
                    </h1>
                    <Sparkles className="w-5 h-5 md:w-6 md:h-6 text-yellow-300 animate-pulse" />
                  </div>
                  <p className="text-white/80 text-sm md:text-base font-medium">
                    ⚡ Fast and efficient order processing system
                  </p>
                </div>
              </div>
            </div>
          </StandardizedLayout>
          
          {/* Bottom Glow Effect */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-500"></div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden">
        <POSMode />
      </div>
      
      <MobileNavigation />
    </div>
  );
};

export default POS;
