
import { Card } from "@/components/ui/card";
import { Utensils, TrendingUp, Flame, ChefHat } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useTrendingItems } from "@/hooks/useTrendingItems";

const TrendingItems = () => {
  const { data: trendingItems, isLoading } = useTrendingItems();

  if (isLoading) {
    return (
      <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-white/20 dark:border-gray-700/30 rounded-3xl shadow-2xl p-8 h-full min-h-[400px]">
        <div className="space-y-6">
          <Skeleton className="h-8 w-1/2 rounded-lg" />
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-3/4 rounded" />
                <Skeleton className="h-3 w-1/2 rounded" />
              </div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  // Fallback if no data
  const items = trendingItems && trendingItems.length > 0 ? trendingItems : [
    { name: "Truffle Pasta", count: 45 },
    { name: "Wagyu Burger", count: 32 },
    { name: "Lobster Bisque", count: 28 }
  ];

  const maxCount = Math.max(...items.map(i => i.count)) || 1;

  const getGradient = (index: number) => {
    const gradients = [
      "from-orange-500 via-red-500 to-rose-600", // Top 1: Hot/Fire
      "from-amber-400 via-orange-500 to-red-500", // Top 2
      "from-yellow-400 via-amber-500 to-orange-500", // Top 3
      "from-emerald-400 via-teal-500 to-cyan-500", // Top 4
      "from-blue-400 via-indigo-500 to-violet-500" // Top 5
    ];
    return gradients[index % gradients.length];
  };

  const icons = [Flame, TrendingUp, ChefHat, Utensils, Utensils];

  return (
    <Card className="relative overflow-hidden bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-white/20 dark:border-gray-700/30 rounded-3xl shadow-2xl p-6 md:p-8 hover:shadow-3xl transition-all duration-500 group/card h-full">
      
      {/* Decorative background glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 group-hover/card:bg-orange-500/20 transition-all duration-500" />
      
      <div className="relative z-10 flex items-center gap-4 mb-8">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-red-600 blur-lg opacity-50 animate-pulse" />
          <div className="relative p-3 bg-gradient-to-r from-orange-500 to-red-600 rounded-2xl shadow-lg border border-white/20">
            <Flame className="h-6 w-6 text-white" />
          </div>
        </div>
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
            Trending Items
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">
            Top selling dishes this week
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {items.map((item, index) => {
           const Icon = icons[index % icons.length];
           const percentage = Math.round((item.count / maxCount) * 100);
           const gradient = getGradient(index);

           return (
             <div key={index} className="group relative">
               <div className="flex items-center gap-4 mb-2">
                 <div className="relative">
                    <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold shadow-lg group-hover:scale-110 transition-transform`}>
                       <span className="text-sm">#{index + 1}</span>
                    </div>
                 </div>
                 <div className="flex-1 min-w-0">
                   <div className="flex justify-between items-center mb-1">
                     <h3 className="font-semibold text-gray-800 dark:text-gray-100 truncate pr-2">
                       {item.name}
                     </h3>
                     <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                       {item.count} orders
                     </span>
                   </div>
                   
                   {/* Progress Bar Container */}
                   <div className="h-2.5 w-full bg-gray-100 dark:bg-gray-700/50 rounded-full overflow-hidden">
                     <div 
                       className={`h-full rounded-full bg-gradient-to-r ${gradient} relative group-hover:brightness-110 transition-all duration-500 ease-out`}
                       style={{ width: `${percentage}%` }}
                     >
                       <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite]" />
                     </div>
                   </div>
                 </div>
               </div>
             </div>
           );
        })}
      </div>
    </Card>
  );
};

export default TrendingItems;
