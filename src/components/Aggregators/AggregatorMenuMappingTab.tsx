import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  UtensilsCrossed,
  Search,
  CheckCircle2,
  AlertOctagon,
  Percent,
  SlidersHorizontal,
  Flame,
} from "lucide-react";
import { FeatureLock } from "@/components/Auth/FeatureLock";

interface AggregatorMenuMappingTabProps {
  onToggle86: (params: { menuItemId: string; provider?: any; inStock: boolean }) => void;
}

export const AggregatorMenuMappingTab: React.FC<AggregatorMenuMappingTabProps> = ({
  onToggle86,
}) => {
  const { restaurantId } = useRestaurantId();
  const [searchTerm, setSearchTerm] = useState("");
  const [markupSwiggy, setMarkupSwiggy] = useState(15);
  const [markupZomato, setMarkupZomato] = useState(20);
  const [markupMagicpin, setMarkupMagicpin] = useState(10);

  // Fetch Menu Items
  const { data: menuItems = [], isLoading } = useQuery({
    queryKey: ["aggregator-menu-items", restaurantId],
    enabled: !!restaurantId,
    queryFn: async () => {
      if (!restaurantId) return [];
      const { data, error } = await supabase
        .from("menu_items")
        .select("id, name, price, category, is_available, is_veg")
        .eq("restaurant_id", restaurantId)
        .order("name");

      if (error) {
        console.warn("[MenuMapping] Error fetching menu items:", error);
        return [];
      }
      return data || [];
    },
  });

  const filteredItems = menuItems.filter((item) =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.category && item.category.toLowerCase().includes(searchTerm.toLowerCase())),
  );

  return (
    <div className="space-y-6">
      {/* Price Markup Control Banner */}
      <FeatureLock feature="aggregators.price_markup">
        <Card className="bg-gradient-to-r from-orange-500/10 via-rose-500/10 to-blue-500/10 dark:from-orange-950/20 dark:via-rose-950/20 dark:to-blue-950/20 border-2 border-orange-200/50 dark:border-orange-900/40 rounded-3xl p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Percent className="h-5 w-5 text-orange-500" />
                Aggregator Price Markup Engine
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
                Automatically increase prices on third-party channels to protect margins against commissions.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="bg-white dark:bg-gray-800 p-3 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center gap-3">
                <span className="text-xs font-bold text-orange-600">Swiggy</span>
                <Input
                  type="number"
                  value={markupSwiggy}
                  onChange={(e) => setMarkupSwiggy(Number(e.target.value))}
                  className="w-16 h-8 text-xs font-bold"
                />
                <span className="text-xs text-gray-400">%</span>
              </div>

              <div className="bg-white dark:bg-gray-800 p-3 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center gap-3">
                <span className="text-xs font-bold text-rose-600">Zomato</span>
                <Input
                  type="number"
                  value={markupZomato}
                  onChange={(e) => setMarkupZomato(Number(e.target.value))}
                  className="w-16 h-8 text-xs font-bold"
                />
                <span className="text-xs text-gray-400">%</span>
              </div>

              <div className="bg-white dark:bg-gray-800 p-3 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center gap-3">
                <span className="text-xs font-bold text-blue-600">magicpin</span>
                <Input
                  type="number"
                  value={markupMagicpin}
                  onChange={(e) => setMarkupMagicpin(Number(e.target.value))}
                  className="w-16 h-8 text-xs font-bold"
                />
                <span className="text-xs text-gray-400">%</span>
              </div>
            </div>
          </div>
        </Card>
      </FeatureLock>

      {/* Universal 86 / Out of Stock List */}
      <FeatureLock feature="aggregators.live_86">
        <Card className="rounded-3xl border-0 shadow-xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl">
          <CardHeader className="pb-4 border-b border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <AlertOctagon className="h-5 w-5 text-red-500" />
                Universal 86 Engine (Out-of-Stock Manager)
              </CardTitle>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Toggle dish availability in 1 click across Swiggy, Zomato, and magicpin simultaneously.
              </p>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search dish or category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 rounded-xl text-xs h-9"
              />
            </div>
          </CardHeader>

          <CardContent className="p-4 sm:p-6">
            {isLoading ? (
              <div className="py-12 text-center text-gray-400 text-sm">
                Loading menu items...
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="py-12 text-center text-gray-400 text-sm">
                No items matching search.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredItems.map((item) => {
                  const basePrice = Number(item.price || 0);
                  const isAvailable = item.is_available ?? true;
                  const swiggyPrice = Math.round(basePrice * (1 + markupSwiggy / 100));
                  const zomatoPrice = Math.round(basePrice * (1 + markupZomato / 100));
                  const magicpinPrice = Math.round(basePrice * (1 + markupMagicpin / 100));

                  return (
                    <div
                      key={item.id}
                      className={`p-4 rounded-2xl border-2 transition-all ${
                        isAvailable
                          ? "bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 shadow-sm"
                          : "bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-900/40 opacity-70"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`w-2 h-2 rounded-full ${
                                item.is_veg ? "bg-emerald-500" : "bg-red-500"
                              }`}
                            />
                            <p className="font-bold text-sm text-gray-900 dark:text-white line-clamp-1">
                              {item.name}
                            </p>
                          </div>
                          <Badge variant="outline" className="text-[10px] mt-1">
                            {item.category || "General"}
                          </Badge>
                        </div>

                        <div className="flex flex-col items-end">
                          <span className="text-[10px] font-semibold text-gray-400">
                            {isAvailable ? "IN STOCK" : "86'D (OUT)"}
                          </span>
                          <Switch
                            checked={isAvailable}
                            onCheckedChange={(checked) =>
                              onToggle86({ menuItemId: item.id, inStock: checked })
                            }
                          />
                        </div>
                      </div>

                      {/* Pricing Table */}
                      <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700 grid grid-cols-4 gap-1 text-center text-xs">
                        <div className="bg-gray-50 dark:bg-gray-900 p-1.5 rounded-lg">
                          <span className="text-[10px] text-gray-400 block">Dine-In</span>
                          <span className="font-bold">₹{basePrice}</span>
                        </div>
                        <div className="bg-orange-50 dark:bg-orange-950/40 p-1.5 rounded-lg text-orange-700 dark:text-orange-300">
                          <span className="text-[10px] text-orange-500 block">Swiggy</span>
                          <span className="font-bold">₹{swiggyPrice}</span>
                        </div>
                        <div className="bg-rose-50 dark:bg-rose-950/40 p-1.5 rounded-lg text-rose-700 dark:text-rose-300">
                          <span className="text-[10px] text-rose-500 block">Zomato</span>
                          <span className="font-bold">₹{zomatoPrice}</span>
                        </div>
                        <div className="bg-blue-50 dark:bg-blue-950/40 p-1.5 rounded-lg text-blue-700 dark:text-blue-300">
                          <span className="text-[10px] text-blue-500 block">magicpin</span>
                          <span className="font-bold">₹{magicpinPrice}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </FeatureLock>
    </div>
  );
};
