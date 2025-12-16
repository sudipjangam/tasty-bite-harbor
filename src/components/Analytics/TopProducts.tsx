
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, ShoppingCart, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface ProductData {
  name: string;
  orders: number;
  revenue: number;
  profit_margin: number;
  in_stock: boolean;
  trend: 'up' | 'down' | 'stable';
}

interface TopProductsProps {
  data: ProductData[];
}

// Gradient colors for ranking
const RANK_GRADIENTS = [
  'from-yellow-400 via-amber-500 to-orange-500', // Gold - #1
  'from-gray-300 via-slate-400 to-gray-500',     // Silver - #2
  'from-amber-600 via-orange-600 to-amber-700',  // Bronze - #3
];

const TopProducts = ({ data }: TopProductsProps) => {
  const maxRevenue = Math.max(...data.map(d => d.revenue));
  
  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-emerald-500" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      case 'stable':
        return <Minus className="h-4 w-4 text-blue-500" />;
    }
  };

  const getTrendBadge = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0">↑ Rising</Badge>;
      case 'down':
        return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-0">↓ Falling</Badge>;
      case 'stable':
        return <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-0">→ Stable</Badge>;
    }
  };

  return (
    <Card className="shadow-lg hover:shadow-xl transition-all duration-300 border-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">Top Selling Items</CardTitle>
            <CardDescription className="text-sm">Items generating the most revenue</CardDescription>
          </div>
          <div className="p-2 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-xl shadow-lg">
            <ShoppingCart className="h-5 w-5 text-white" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {data.slice(0, 8).map((item, index) => (
          <div 
            key={index} 
            className={`group relative overflow-hidden p-4 rounded-xl transition-all duration-300 hover:scale-[1.02] ${
              index < 3 
                ? 'bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 border border-purple-100 dark:border-purple-800/30' 
                : 'bg-gray-50/50 dark:bg-gray-800/30 hover:bg-gray-100/50 dark:hover:bg-gray-700/30'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                {/* Rank badge */}
                {index < 3 ? (
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${RANK_GRADIENTS[index]} flex items-center justify-center shadow-lg`}>
                    <span className="text-white font-bold text-sm">{index + 1}</span>
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                    <span className="text-gray-500 dark:text-gray-400 font-medium text-sm">{index + 1}</span>
                  </div>
                )}
                <div>
                  <p className="font-semibold text-gray-900 dark:text-gray-100 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                    {item.name}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <span>{item.orders} orders</span>
                    <span>•</span>
                    <span>{item.profit_margin}% margin</span>
                    {item.in_stock ? (
                      <CheckCircle2 className="h-3 w-3 text-emerald-500 ml-1" />
                    ) : (
                      <AlertCircle className="h-3 w-3 text-amber-500 ml-1" />
                    )}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-lg text-gray-900 dark:text-gray-100">₹{item.revenue.toLocaleString()}</p>
                <div className="flex items-center justify-end gap-1">
                  {getTrendIcon(item.trend)}
                  {getTrendBadge(item.trend)}
                </div>
              </div>
            </div>
            {/* Revenue progress bar */}
            <div className="mt-2 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-700 ease-out ${
                  index === 0 ? 'bg-gradient-to-r from-yellow-400 to-amber-500' :
                  index === 1 ? 'bg-gradient-to-r from-gray-400 to-slate-500' :
                  index === 2 ? 'bg-gradient-to-r from-amber-500 to-orange-600' :
                  'bg-gradient-to-r from-purple-500 to-indigo-500'
                }`}
                style={{ width: `${(item.revenue / maxRevenue) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default TopProducts;

