import { Suspense, lazy } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { ChefHat, Sparkles, Utensils } from "lucide-react";
import HelpProvider from "@/components/Help/HelpProvider";
import { FeatureLock } from "@/components/Auth/FeatureLock";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import { useIsMobile } from "@/hooks/use-mobile";

// Lazy load the MenuGrid component
const MenuGrid = lazy(() => import("@/components/Menu/MenuGrid"));

const Menu = () => {
  const { restaurantName } = useRestaurantId();
  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/50 to-teal-50/70 dark:from-gray-950 dark:via-slate-900 dark:to-emerald-950/40">
      {/* Header: Compact on Mobile, Rich 3D Hero on Desktop */}
      <div className="sticky top-0 z-30 shadow-xs">
        <div className="relative overflow-hidden bg-gradient-to-r from-emerald-600 via-teal-600 to-green-600">
          <div className="absolute inset-0 bg-gradient-to-b from-white/15 to-transparent"></div>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-yellow-400/20 via-transparent to-transparent"></div>

          {/* Desktop Decorative Element */}
          <div className="hidden md:block absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-white/20 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/4"></div>

          {/* Header Content */}
          <div className="relative py-2.5 px-3.5 md:py-5 md:px-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 md:gap-4">
                {/* Icon Badge */}
                <div className="relative flex-shrink-0">
                  <div className="p-2 md:p-3.5 bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl md:rounded-2xl shadow-lg">
                    <ChefHat className="w-5 h-5 md:w-7 md:h-7 text-white drop-shadow-md" />
                  </div>
                </div>

                {/* Title & Info */}
                <div className="min-w-0">
                  {restaurantName && (
                    <p className="text-[9px] md:text-[10px] font-bold tracking-wider uppercase text-white/75 truncate">
                      {restaurantName}
                    </p>
                  )}
                  <div className="flex items-center gap-1.5">
                    <h1 className="text-lg md:text-3xl font-bold text-white drop-shadow-sm tracking-tight truncate">
                      Menu Management
                    </h1>
                    <Sparkles className="w-3.5 h-3.5 md:w-5 md:h-5 text-yellow-300 animate-pulse flex-shrink-0" />
                  </div>
                  {/* Subtitle hidden on mobile to conserve screen real-estate */}
                  <p className="hidden md:flex text-white/80 text-sm font-medium items-center gap-2 mt-0.5">
                    <Utensils className="w-4 h-4" />
                    Manage items, pricing, availability & categories
                  </p>
                </div>
              </div>

              <div className="hidden md:block">
                <HelpProvider />
              </div>
            </div>
          </div>

          {/* Bottom Accent Glow */}
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-yellow-400 via-emerald-400 to-teal-500"></div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-2.5 sm:p-4 md:p-6 max-w-7xl mx-auto">
        <div className="md:bg-white/90 md:dark:bg-gray-800/90 md:backdrop-blur-sm md:border md:border-white/30 md:dark:border-gray-700/30 md:rounded-2xl md:shadow-xl md:p-6">
          <Suspense
            fallback={
              <div className="p-4 md:p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-9 w-40 rounded-xl" />
                  <Skeleton className="h-9 w-28 rounded-xl" />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {[...Array(6)].map((_, i) => (
                    <div
                      key={i}
                      className="bg-white/60 dark:bg-gray-800/60 rounded-xl p-3 space-y-2.5"
                    >
                      <Skeleton className="h-28 w-full rounded-lg" />
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  ))}
                </div>
              </div>
            }
          >
            <FeatureLock feature="menu.basic" interceptClicks={true}>
              <MenuGrid />
            </FeatureLock>
          </Suspense>
        </div>
      </div>
    </div>
  );
};

export default Menu;
