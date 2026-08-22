import { useState, useMemo } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Search, Check, Layers, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getCategoryEmoji } from "./CategoryBar";

interface CategoryPickerSheetProps {
  isOpen: boolean;
  onClose: () => void;
  categories: string[];
  groupedItemsData: Record<string, any[]>;
  activeCategory: string;
  onSelectCategory: (category: string) => void;
  totalItemsCount: number;
}

export const CategoryPickerSheet = ({
  isOpen,
  onClose,
  categories,
  groupedItemsData,
  activeCategory,
  onSelectCategory,
  totalItemsCount,
}: CategoryPickerSheetProps) => {
  const [search, setSearch] = useState("");

  const filteredCategories = useMemo(() => {
    if (!search.trim()) return categories;
    return categories.filter((cat) =>
      cat.toLowerCase().includes(search.toLowerCase().trim()),
    );
  }, [categories, search]);

  const handleSelect = (cat: string) => {
    onSelectCategory(cat);
    onClose();
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="bottom"
        className="max-h-[85vh] h-[80vh] sm:max-h-[600px] sm:h-auto rounded-t-3xl sm:rounded-2xl p-0 flex flex-col bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-t border-emerald-500/20 shadow-2xl"
      >
        <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full mx-auto mt-3 mb-1" />

        <SheetHeader className="px-5 pt-2 pb-3 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-lg font-bold flex items-center gap-2 text-gray-900 dark:text-white">
              <Layers className="w-5 h-5 text-emerald-500" />
              All Categories
              <Badge variant="secondary" className="text-xs bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-semibold">
                {categories.length}
              </Badge>
            </SheetTitle>
          </div>

          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search category name..."
              className="pl-9 h-10 rounded-xl bg-gray-50 dark:bg-gray-800/80 border-gray-200 dark:border-gray-700 text-sm focus-visible:ring-emerald-500"
              autoFocus={false}
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400 hover:text-gray-600"
              >
                Clear
              </button>
            )}
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {/* All Categories Button */}
          {!search && (
            <button
              onClick={() => handleSelect("all")}
              className={`w-full flex items-center justify-between p-3.5 rounded-2xl transition-all ${
                activeCategory === "all"
                  ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md font-bold"
                  : "bg-gray-50 dark:bg-gray-800/60 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-800 dark:text-gray-200 font-medium"
              }`}
            >
              <div className="flex items-center gap-3">
                <Sparkles className={`w-4 h-4 ${activeCategory === "all" ? "text-yellow-300" : "text-emerald-500"}`} />
                <span>All Categories</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2.5 py-0.5 rounded-full ${
                  activeCategory === "all"
                    ? "bg-white/20 text-white"
                    : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                }`}>
                  {totalItemsCount} items
                </span>
                {activeCategory === "all" && <Check className="w-4 h-4" />}
              </div>
            </button>
          )}

          {/* Categories Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            {filteredCategories.map((cat) => {
              const count = groupedItemsData[cat]?.length || 0;
              const isSelected = activeCategory === cat;
              const emoji = getCategoryEmoji(cat);

              return (
                <button
                  key={cat}
                  onClick={() => handleSelect(cat)}
                  className={`flex items-center justify-between p-3 rounded-2xl border transition-all text-left ${
                    isSelected
                      ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-700 dark:text-emerald-300 font-bold shadow-sm"
                      : "bg-white dark:bg-gray-800/80 border-gray-100 dark:border-gray-800 hover:border-emerald-200 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 font-medium"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <span className="text-base flex-shrink-0">{emoji}</span>
                    <span className="truncate">{cat}</span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                      isSelected
                        ? "bg-emerald-500 text-white"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                    }`}>
                      {count}
                    </span>
                    {isSelected && <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
                  </div>
                </button>
              );
            })}
          </div>

          {filteredCategories.length === 0 && (
            <div className="py-12 text-center text-gray-500 dark:text-gray-400">
              <p className="text-sm">No category matches "{search}"</p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default CategoryPickerSheet;
