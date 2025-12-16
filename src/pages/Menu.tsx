
import { Suspense, lazy } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ChefHat, Sparkles } from "lucide-react";

// Lazy load the MenuGrid component
const MenuGrid = lazy(() => import("@/components/Menu/MenuGrid"));

const Menu = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-100 dark:from-gray-900 dark:via-slate-900 dark:to-emerald-950 p-6">
      {/* Modern Header with Glass Effect */}
      <div className="mb-8 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-white/20 dark:border-gray-700/30 rounded-3xl shadow-xl p-8">
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl shadow-lg">
            <ChefHat className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-600 via-teal-600 to-green-600 bg-clip-text text-transparent">
              Restaurant Menu
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-lg mt-2">Manage your restaurant's delicious offerings</p>
          </div>
        </div>
        
        {/* Decorative Elements */}
        <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
          <Sparkles className="h-5 w-5" />
          <span className="text-sm font-medium">Craft exceptional dining experiences</span>
        </div>
      </div>

      {/* Menu Grid Container with Glass Effect */}
      <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border border-white/30 dark:border-gray-700/30 rounded-3xl shadow-xl overflow-hidden">
        <Suspense fallback={
          <div className="p-8 space-y-6">
            <div className="flex items-center justify-between">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-10 w-32" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white/50 backdrop-blur-sm rounded-2xl p-6 space-y-4">
                  <Skeleton className="h-48 w-full rounded-xl" />
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ))}
            </div>
          </div>
        }>
          <div className="p-8">
            <MenuGrid />
          </div>
        </Suspense>
      </div>
    </div>
  );
};

export default Menu;
