
import { Suspense, lazy } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { ChefHat, Sparkles, Utensils, Zap } from "lucide-react";

// Lazy load the MenuGrid component
const MenuGrid = lazy(() => import("@/components/Menu/MenuGrid"));

const Menu = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-100 dark:from-gray-900 dark:via-slate-900 dark:to-emerald-950">
      {/* Modern 3D Header with Vibrant Gradient */}
      <div className="sticky top-0 z-40">
        <div className="relative overflow-hidden">
          {/* 3D Gradient Background */}
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 via-teal-600 to-green-600"></div>
          <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent"></div>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-yellow-400/20 via-transparent to-transparent"></div>
          
          {/* Decorative Elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-white/20 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/4"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-teal-400/30 to-transparent rounded-full blur-2xl translate-y-1/2 -translate-x-1/4"></div>
          
          {/* Content */}
          <div className="relative py-4 md:py-6 px-4 md:px-6">
            <div className="flex items-center gap-4">
              {/* 3D Icon Badge */}
              <div className="relative">
                <div className="absolute inset-0 bg-white/30 rounded-2xl blur-lg"></div>
                <div className="relative p-3 md:p-4 bg-white/20 backdrop-blur-sm border border-white/30 rounded-2xl shadow-2xl">
                  <ChefHat className="w-6 h-6 md:w-8 md:h-8 text-white drop-shadow-lg" />
                </div>
              </div>
              
              {/* Title */}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-2xl md:text-4xl font-bold text-white drop-shadow-lg tracking-tight">
                    Menu Management
                  </h1>
                  <Sparkles className="w-5 h-5 md:w-6 md:h-6 text-yellow-300 animate-pulse" />
                </div>
                <p className="text-white/80 text-sm md:text-base font-medium flex items-center gap-2">
                  <Utensils className="w-4 h-4" />
                  Manage your restaurant's delicious offerings
                </p>
              </div>
            </div>
          </div>
          
          {/* Bottom Glow Effect */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-yellow-400 via-emerald-400 to-teal-500"></div>
        </div>
      </div>

      {/* Menu Grid Container */}
      <div className="p-4 md:p-6">
        <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border border-white/30 dark:border-gray-700/30 rounded-2xl shadow-xl overflow-hidden">
          <Suspense fallback={
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-10 w-32" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="bg-white/50 backdrop-blur-sm rounded-xl p-4 space-y-3">
                    <Skeleton className="h-32 w-full rounded-lg" />
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                ))}
              </div>
            </div>
          }>
            <div className="p-4 md:p-6">
              <MenuGrid />
            </div>
          </Suspense>
        </div>
      </div>
    </div>
  );
};

export default Menu;
