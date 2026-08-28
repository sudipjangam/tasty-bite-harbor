import React, { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Zap,
  Search,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  UtensilsCrossed,
  Package,
  Layers,
  Sparkles,
  ArrowRight,
  Flame,
} from "lucide-react";
import { use86Cascade } from "@/hooks/use86Cascade";

interface Quick86ModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Quick86Modal: React.FC<Quick86ModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    menuItems,
    unavailableDishes,
    unavailableCount,
    ingredientsWithLinkedDishes,
    isLoading,
    toggleDish86,
    toggleIngredientCascade,
    bulkReviveAll,
  } = use86Cascade();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [activeTab, setActiveTab] = useState<"dishes" | "ingredients">("dishes");
  const [isReviving, setIsReviving] = useState(false);

  // Categories
  const categories = useMemo(() => {
    const cats = Array.from(new Set(menuItems.map((m) => m.category))).filter(Boolean);
    return ["All", ...cats];
  }, [menuItems]);

  // Filtered dishes
  const filteredDishes = useMemo(() => {
    return menuItems.filter((item) => {
      const matchSearch =
        !searchQuery ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCat = selectedCategory === "All" || item.category === selectedCategory;
      return matchSearch && matchCat;
    });
  }, [menuItems, searchQuery, selectedCategory]);

  // Filtered ingredients
  const filteredIngredients = useMemo(() => {
    return ingredientsWithLinkedDishes.filter((ing) => {
      return (
        !searchQuery ||
        ing.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ing.linkedDishes.some((d) => d.name.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    });
  }, [ingredientsWithLinkedDishes, searchQuery]);

  const handleReviveAll = async () => {
    try {
      setIsReviving(true);
      await bulkReviveAll();
    } finally {
      setIsReviving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl rounded-3xl p-0 overflow-hidden bg-white/95 dark:bg-gray-900/95 backdrop-blur-2xl border-2 border-rose-200 dark:border-rose-900 shadow-2xl">
        {/* Top Header Banner */}
        <div className="bg-gradient-to-r from-rose-600 via-red-600 to-amber-600 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/20 rounded-2xl backdrop-blur-md border border-white/30 shadow-md">
              <Zap className="h-6 w-6 text-yellow-300 fill-yellow-300" />
            </div>
            <div>
              <DialogTitle className="text-xl font-black tracking-tight text-white flex items-center gap-2">
                1-Click "86" Stock Auto-Kill
              </DialogTitle>
              <DialogDescription className="text-xs text-rose-100 font-medium">
                Instantly disable sold-out dishes across POS, QR Menu, Touch Kiosk & Swiggy/Zomato.
              </DialogDescription>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {unavailableCount > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleReviveAll}
                disabled={isReviving}
                className="rounded-xl bg-white/10 hover:bg-white/20 text-white border-white/30 text-xs font-bold gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Revive All ({unavailableCount})
              </Button>
            )}
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4">
          {/* Status Bar */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 dark:bg-gray-800/80 border border-gray-100 dark:border-gray-800 text-xs">
            <div className="flex items-center gap-2">
              <Badge
                className={`font-black text-xs px-2.5 py-0.5 ${
                  unavailableCount > 0
                    ? "bg-rose-600 text-white animate-pulse"
                    : "bg-emerald-600 text-white"
                }`}
              >
                {unavailableCount} Dishes Sold Out
              </Badge>
              <span className="text-gray-500 font-semibold hidden sm:inline">
                {menuItems.length - unavailableCount} dishes available
              </span>
            </div>

            <span className="text-[11px] text-gray-400 font-medium">
              Multi-channel realtime WebSocket sync active
            </span>
          </div>

          {/* Search and Tabs */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
              <Input
                placeholder="Search dishes or raw materials..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 rounded-xl text-xs bg-gray-50 dark:bg-gray-800"
              />
            </div>

            <Tabs
              value={activeTab}
              onValueChange={(v: any) => setActiveTab(v)}
              className="w-full sm:w-auto"
            >
              <TabsList className="rounded-xl bg-gray-100 dark:bg-gray-800 p-1">
                <TabsTrigger
                  value="dishes"
                  className="rounded-lg text-xs font-bold data-[state=active]:bg-rose-600 data-[state=active]:text-white"
                >
                  <UtensilsCrossed className="w-3.5 h-3.5 mr-1.5" />
                  Dish 86 Toggles
                </TabsTrigger>
                <TabsTrigger
                  value="ingredients"
                  className="rounded-lg text-xs font-bold data-[state=active]:bg-rose-600 data-[state=active]:text-white"
                >
                  <Layers className="w-3.5 h-3.5 mr-1.5" />
                  Raw Material Cascade
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Category Filter Pills for Dishes */}
          {activeTab === "dishes" && (
            <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-1">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    selectedCategory === cat
                      ? "bg-rose-600 text-white shadow-xs"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          {/* ─── TAB 1: DISH-LEVEL 86 TOGGLES ──────────────────────────── */}
          {activeTab === "dishes" && (
            <div className="max-h-[380px] overflow-y-auto space-y-2 pr-1">
              {filteredDishes.length === 0 ? (
                <div className="p-8 text-center text-xs text-gray-400">
                  No menu items found.
                </div>
              ) : (
                filteredDishes.map((dish) => {
                  const isAvailable = dish.is_available;
                  return (
                    <div
                      key={dish.id}
                      className={`p-3 rounded-2xl border transition-all flex items-center justify-between ${
                        isAvailable
                          ? "bg-white dark:bg-gray-800/80 border-gray-200 dark:border-gray-700"
                          : "bg-rose-50/80 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/60"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 pr-2">
                        <div
                          className={`w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center text-lg shrink-0 ${
                            isAvailable
                              ? "bg-gray-100 dark:bg-gray-700"
                              : "bg-rose-100 dark:bg-rose-900 text-rose-600"
                          }`}
                        >
                          {dish.image_url ? (
                            <img
                              src={dish.image_url}
                              alt={dish.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            "🍽️"
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-extrabold text-xs text-gray-900 dark:text-white truncate">
                              {dish.name}
                            </h4>
                            {!isAvailable && (
                              <Badge className="bg-rose-600 text-white font-black text-[9px] px-1.5 py-0 uppercase">
                                86'd (Sold Out)
                              </Badge>
                            )}
                          </div>
                          <span className="text-[10px] text-gray-400 font-semibold">
                            {dish.category} • ₹{dish.price}
                          </span>
                        </div>
                      </div>

                      {/* 1-Touch Availability Toggle */}
                      <div className="flex items-center gap-3 shrink-0">
                        <span
                          className={`text-xs font-black ${
                            isAvailable
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-rose-600 dark:text-rose-400"
                          }`}
                        >
                          {isAvailable ? "Available" : "Sold Out"}
                        </span>
                        <Switch
                          checked={isAvailable}
                          onCheckedChange={(checked) =>
                            toggleDish86(dish.id, checked)
                          }
                          className="data-[state=checked]:bg-emerald-600 data-[state=unchecked]:bg-rose-600"
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* ─── TAB 2: RAW MATERIAL CASCADE ───────────────────────────── */}
          {activeTab === "ingredients" && (
            <div className="max-h-[380px] overflow-y-auto space-y-3 pr-1">
              {filteredIngredients.length === 0 ? (
                <div className="p-8 text-center text-xs text-gray-400">
                  No inventory ingredients mapped.
                </div>
              ) : (
                filteredIngredients.map((ing) => {
                  const dishCount = ing.linkedDishes.length;
                  const allUnavailable =
                    dishCount > 0 && ing.linkedDishes.every((d) => !d.is_available);
                  const anyUnavailable =
                    dishCount > 0 && ing.linkedDishes.some((d) => !d.is_available);

                  return (
                    <div
                      key={ing.id}
                      className="p-3.5 rounded-2xl bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-orange-500" />
                          <h4 className="font-black text-xs text-gray-900 dark:text-white">
                            {ing.name}
                          </h4>
                          <span className="text-[10px] text-gray-400">
                            (Stock: {ing.current_stock} {ing.unit})
                          </span>
                        </div>

                        {/* 1-Click Cascade Actions */}
                        {dishCount > 0 && (
                          <div className="flex items-center gap-2">
                            {allUnavailable ? (
                              <Button
                                size="sm"
                                onClick={() =>
                                  toggleIngredientCascade(
                                    ing.linkedDishes.map((d) => d.id),
                                    true,
                                    ing.name
                                  )
                                }
                                className="h-7 rounded-xl text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                              >
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Restock All ({dishCount})
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                onClick={() =>
                                  toggleIngredientCascade(
                                    ing.linkedDishes.map((d) => d.id),
                                    false,
                                    ing.name
                                  )
                                }
                                className="h-7 rounded-xl text-[11px] font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs"
                              >
                                <Zap className="w-3 h-3 mr-1" />
                                86 All ({dishCount} Dishes)
                              </Button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* List of Affected Dishes */}
                      {dishCount === 0 ? (
                        <p className="text-[10px] text-gray-400 italic">
                          No menu items currently mapped to this raw material in recipe book.
                        </p>
                      ) : (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {ing.linkedDishes.map((dish) => (
                            <button
                              key={dish.id}
                              onClick={() => toggleDish86(dish.id, !dish.is_available)}
                              className={`px-2.5 py-1 rounded-xl text-[10px] font-extrabold flex items-center gap-1 border transition-all ${
                                dish.is_available
                                  ? "bg-white dark:bg-gray-900 border-gray-200 text-gray-700 dark:text-gray-300 hover:border-rose-400"
                                  : "bg-rose-100 dark:bg-rose-950/60 border-rose-300 text-rose-700 dark:text-rose-300 line-through"
                              }`}
                            >
                              <span>{dish.name}</span>
                              <span className="text-[9px] opacity-70">
                                {dish.is_available ? "🟢" : "🔴"}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default Quick86Modal;
