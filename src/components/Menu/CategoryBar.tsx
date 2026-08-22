import { useState, useRef, useEffect } from "react";
import { Sparkles, Layers, ChevronRight, ChevronLeft } from "lucide-react";
import CategoryPickerSheet from "./CategoryPickerSheet";

export const getCategoryEmoji = (category: string = ""): string => {
  const cat = category.toLowerCase();
  if (cat.includes("noodle") || cat.includes("maggie") || cat.includes("chowmein") || cat.includes("pasta")) return "🍜";
  if (cat.includes("pizza")) return "🍕";
  if (cat.includes("burger")) return "🍔";
  if (cat.includes("sandwich") || cat.includes("garlic bread") || cat.includes("bread") || cat.includes("toast")) return "🥪";
  if (cat.includes("momo") || cat.includes("starter") || cat.includes("appetizer") || cat.includes("manchurian") || cat.includes("roll") || cat.includes("spring roll")) return "🥟";
  if (cat.includes("rice") || cat.includes("biryani") || cat.includes("pulao") || cat.includes("thali") || cat.includes("bhel")) return "🍛";
  if (cat.includes("soup")) return "🍲";
  if (cat.includes("coffee") || cat.includes("tea") || cat.includes("hot beverage")) return "☕";
  if (cat.includes("shake") || cat.includes("mocktail") || cat.includes("drink") || cat.includes("beverage") || cat.includes("water") || cat.includes("bottle") || cat.includes("cold")) return "🥤";
  if (cat.includes("dessert") || cat.includes("ice cream") || cat.includes("cake") || cat.includes("sweet")) return "🍨";
  if (cat.includes("nachos") || cat.includes("fries") || cat.includes("snack") || cat.includes("hot dog")) return "🍟";
  if (cat.includes("parcel")) return "📦";
  return "🍽️";
};

export const getCategoryGradient = (category: string = "", isVeg?: boolean): string => {
  const cat = category.toLowerCase();
  if (cat.includes("noodle") || cat.includes("chinese")) return "from-amber-500/20 via-orange-500/10 to-red-500/15";
  if (cat.includes("momo") || cat.includes("starter") || cat.includes("appetizer")) return "from-emerald-500/20 via-teal-500/10 to-cyan-500/15";
  if (cat.includes("pizza") || cat.includes("burger") || cat.includes("sandwich")) return "from-orange-500/20 via-rose-500/10 to-red-500/15";
  if (cat.includes("coffee") || cat.includes("beverage") || cat.includes("shake") || cat.includes("mocktail") || cat.includes("water")) return "from-cyan-500/20 via-blue-500/10 to-indigo-500/15";
  if (cat.includes("dessert") || cat.includes("ice cream") || cat.includes("sweet")) return "from-pink-500/20 via-purple-500/10 to-rose-500/15";
  if (isVeg === false) return "from-rose-500/20 via-red-500/10 to-orange-500/15";
  return "from-emerald-500/20 via-teal-500/10 to-green-500/15";
};

interface CategoryBarProps {
  activeCategory: string;
  setActiveCategory: (cat: string) => void;
  groupedItemsData: Record<string, any[]>;
  totalCount: number;
  vegCount: number;
  nonVegCount: number;
  specialCount: number;
}

export const CategoryBar = ({
  activeCategory,
  setActiveCategory,
  groupedItemsData,
  totalCount,
  vegCount,
  nonVegCount,
  specialCount,
}: CategoryBarProps) => {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const categories = Object.keys(groupedItemsData);

  // Auto-scroll active chip into view inside the category bar
  useEffect(() => {
    if (!scrollRef.current) return;
    const activeEl = scrollRef.current.querySelector<HTMLElement>("[data-active='true']");
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  }, [activeCategory]);

  const scrollLeft = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -200, behavior: "smooth" });
    }
  };

  const scrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 200, behavior: "smooth" });
    }
  };

  const isDietFilter = ["all", "veg", "non-veg", "special"].includes(activeCategory);

  return (
    <div className="space-y-2">
      {/* Primary Diet / Type Filter Segmented Control */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
        <button
          onClick={() => setActiveCategory("all")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap touch-manipulation flex-shrink-0 shadow-xs ${
            activeCategory === "all"
              ? "bg-gradient-to-r from-slate-900 to-slate-800 dark:from-white dark:to-slate-200 text-white dark:text-slate-900 shadow-slate-900/20 scale-[1.02]"
              : "bg-white dark:bg-gray-800/90 text-gray-700 dark:text-gray-300 border border-gray-200/80 dark:border-gray-700/80 hover:bg-gray-50"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
          <span>All</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
            activeCategory === "all" ? "bg-white/20 dark:bg-black/20 text-white dark:text-slate-900" : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
          }`}>
            {totalCount}
          </span>
        </button>

        <button
          onClick={() => setActiveCategory("veg")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap touch-manipulation flex-shrink-0 shadow-xs ${
            activeCategory === "veg"
              ? "bg-gradient-to-r from-emerald-600 to-green-600 text-white shadow-emerald-500/25 scale-[1.02]"
              : "bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/60 hover:bg-emerald-100/50"
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-300 dark:ring-emerald-700"></span>
          <span>Veg</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
            activeCategory === "veg" ? "bg-white/20 text-white" : "bg-emerald-100 dark:bg-emerald-900/50"
          }`}>
            {vegCount}
          </span>
        </button>

        <button
          onClick={() => setActiveCategory("non-veg")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap touch-manipulation flex-shrink-0 shadow-xs ${
            activeCategory === "non-veg"
              ? "bg-gradient-to-r from-rose-600 to-red-600 text-white shadow-rose-500/25 scale-[1.02]"
              : "bg-rose-50/70 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 border border-rose-200/80 dark:border-rose-800/60 hover:bg-rose-100/50"
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-rose-500 ring-2 ring-rose-300 dark:ring-rose-700"></span>
          <span>Non-Veg</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
            activeCategory === "non-veg" ? "bg-white/20 text-white" : "bg-rose-100 dark:bg-rose-900/50"
          }`}>
            {nonVegCount}
          </span>
        </button>

        <button
          onClick={() => setActiveCategory("special")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap touch-manipulation flex-shrink-0 shadow-xs ${
            activeCategory === "special"
              ? "bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 text-white shadow-purple-500/25 scale-[1.02]"
              : "bg-purple-50/70 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 border border-purple-200/80 dark:border-purple-800/60 hover:bg-purple-100/50"
          }`}
        >
          <span>⭐ Specials</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
            activeCategory === "special" ? "bg-white/20 text-white" : "bg-purple-100 dark:bg-purple-900/50"
          }`}>
            {specialCount}
          </span>
        </button>

        {/* Quick button to open all 28+ categories modal */}
        <button
          onClick={() => setIsSheetOpen(true)}
          className={`ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap flex-shrink-0 shadow-xs ${
            !isDietFilter
              ? "bg-emerald-600 text-white shadow-emerald-500/20"
              : "bg-white dark:bg-gray-800 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50"
          }`}
          title="Browse All Categories"
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Categories ({categories.length})</span>
          <span className="text-[10px]">▾</span>
        </button>
      </div>

      {/* Single-Row Horizontal Category Scroll Strip */}
      <div className="relative group">
        {/* Left Scroll Trigger on Desktop */}
        <button
          onClick={scrollLeft}
          className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 w-7 h-7 bg-white/95 dark:bg-gray-800/95 rounded-full shadow-md items-center justify-center border border-gray-200 dark:border-gray-700 text-gray-600 hover:text-black opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Category Horizontal Strip */}
        <div
          ref={scrollRef}
          className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth py-1 px-0.5"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {categories.map((category) => {
            const count = groupedItemsData[category]?.length || 0;
            const isActive = activeCategory === category;
            const emoji = getCategoryEmoji(category);

            return (
              <button
                key={category}
                data-active={isActive ? "true" : "false"}
                onClick={() => setActiveCategory(category)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all touch-manipulation flex-shrink-0 shadow-xs ${
                  isActive
                    ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold shadow-md shadow-emerald-600/20 scale-[1.02]"
                    : "bg-white dark:bg-gray-800/90 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/60 border border-gray-200/70 dark:border-gray-700/70"
                }`}
              >
                <span>{emoji}</span>
                <span>{category}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right Scroll Trigger on Desktop */}
        <button
          onClick={scrollRight}
          className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 z-10 w-7 h-7 bg-white/95 dark:bg-gray-800/95 rounded-full shadow-md items-center justify-center border border-gray-200 dark:border-gray-700 text-gray-600 hover:text-black opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Category Picker Bottom Sheet / Drawer */}
      <CategoryPickerSheet
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        categories={categories}
        groupedItemsData={groupedItemsData}
        activeCategory={activeCategory}
        onSelectCategory={setActiveCategory}
        totalItemsCount={totalCount}
      />
    </div>
  );
};

export default CategoryBar;
