import { useState, memo, useMemo } from "react";
import {
  Search,
  X,
  Plus,
  Edit2,
  Trash2,
  LayoutGrid,
  List,
  Sparkles,
  MoreVertical,
  AlertCircle,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { LazyImage } from "@/components/ui/lazy-image";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FeatureLock } from "@/components/Auth/FeatureLock";
import CategoryBar, { getCategoryEmoji, getCategoryGradient } from "./CategoryBar";

export interface MenuItem {
  id: string;
  name: string;
  description?: string;
  category: string;
  price: number;
  image_url: string;
  is_available: boolean;
  created_at?: string;
  is_veg?: boolean | null;
  is_special?: boolean;
  pricing_type?: string;
  pricing_unit?: string;
  base_unit_quantity?: number;
}

interface MobileMenuViewProps {
  items: MenuItem[];
  allItems: MenuItem[];
  activeCategory: string;
  setActiveCategory: (cat: string) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  groupedItemsData: Record<string, MenuItem[]>;
  currencySymbol: string;
  onEdit: (item: MenuItem) => void;
  onDelete: (id: string) => void;
  onToggleAvailability: (id: string, currentStatus: boolean) => void;
  onOpenAddModal: () => void;
  onOpenAIImport: () => void;
}

// Authentic Indian Restaurant Veg / Non-Veg Indicator
export const VegIndicator = ({ isVeg }: { isVeg?: boolean | null }) => {
  if (isVeg === undefined || isVeg === null) return null;
  return (
    <div
      className={`w-3.5 h-3.5 rounded-xs border-[1.5px] p-[1.5px] flex items-center justify-center bg-white/95 dark:bg-gray-900/90 shadow-xs flex-shrink-0 ${
        isVeg ? "border-emerald-600" : "border-rose-600"
      }`}
      title={isVeg ? "Vegetarian" : "Non-Vegetarian"}
    >
      <div
        className={`w-1.5 h-1.5 rounded-full ${
          isVeg ? "bg-emerald-600" : "bg-rose-600"
        }`}
      />
    </div>
  );
};

// Aesthetic Food Thumbnail with Fallback Emoji Gradient
const FoodThumbnail = memo(
  ({
    item,
    size = "md",
  }: {
    item: MenuItem;
    size?: "md" | "lg";
  }) => {
    const isAvailable = item.is_available ?? true;
    const hasCustomImage = Boolean(
      item.image_url &&
        item.image_url !== "/placeholder.svg" &&
        !item.image_url.includes("placeholder"),
    );
    const emoji = getCategoryEmoji(item.category || item.name);
    const gradient = getCategoryGradient(item.category, item.is_veg ?? undefined);

    const sizeClasses =
      size === "lg" ? "h-28 w-full" : "w-16 h-16 rounded-2xl";

    return (
      <div
        className={`relative overflow-hidden flex-shrink-0 border border-black/5 dark:border-white/10 shadow-xs select-none ${sizeClasses} ${
          !isAvailable ? "grayscale contrast-75 opacity-75" : ""
        }`}
      >
        {hasCustomImage ? (
          <LazyImage
            src={item.image_url}
            alt={item.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div
            className={`w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center relative`}
          >
            <span
              className={`${
                size === "lg" ? "text-4xl" : "text-2xl"
              } filter drop-shadow-xs transition-transform duration-300 group-hover:scale-110`}
            >
              {emoji}
            </span>
          </div>
        )}

        {/* Veg/Non-Veg Badge in Top Left (only if explicitly veg or non-veg) */}
        {item.is_veg !== undefined && item.is_veg !== null && (
          <div className="absolute top-1.5 left-1.5">
            <VegIndicator isVeg={item.is_veg} />
          </div>
        )}

        {/* Special Star in Bottom Right */}
        {item.is_special && (
          <div className="absolute bottom-1 right-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-[9px] px-1 py-0.2 rounded font-bold shadow-xs">
            ★
          </div>
        )}
      </div>
    );
  },
);

// Compact Mobile List Item Card
const MobileListItem = memo(
  ({
    item,
    currencySymbol,
    onEdit,
    onDelete,
    onToggleAvailability,
  }: {
    item: MenuItem;
    currencySymbol: string;
    onEdit: (item: MenuItem) => void;
    onDelete: (id: string) => void;
    onToggleAvailability: (id: string, currentStatus: boolean) => void;
  }) => {
    const isAvailable = item.is_available ?? true;

    return (
      <div
        onClick={() => onEdit(item)}
        className={`group relative flex items-center gap-3 p-2.5 bg-white dark:bg-gray-800/90 rounded-2xl border transition-all duration-200 shadow-xs cursor-pointer active:scale-[0.99] ${
          isAvailable
            ? "border-gray-100 dark:border-gray-700/80 hover:border-emerald-200 dark:hover:border-emerald-800"
            : "border-rose-200/50 dark:border-rose-950/40 bg-gray-50/70 dark:bg-gray-800/40 opacity-70"
        }`}
      >
        {/* Left: Food Avatar */}
        <FoodThumbnail item={item} size="md" />

        {/* Middle: Dish Name, Category Tag & Price */}
        <div className="flex-1 min-w-0 pr-1">
          <div className="flex items-center gap-1.5 mb-0.5">
            <h4
              className={`text-sm font-bold truncate leading-tight capitalize ${
                isAvailable
                  ? "text-gray-900 dark:text-white"
                  : "text-gray-500 dark:text-gray-400 line-through"
              }`}
            >
              {item.name}
            </h4>
          </div>

          <div className="flex items-center gap-1.5 text-xs mb-1.5 flex-wrap">
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 truncate max-w-[120px]">
              {item.category}
            </span>
            {!isAvailable && (
              <span className="text-[9px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/50 px-1.5 py-0.5 rounded-md">
                Out of Stock
              </span>
            )}
          </div>

          <div className="text-sm font-black text-indigo-600 dark:text-indigo-400 tracking-tight">
            {currencySymbol}
            {item.price}
          </div>
        </div>

        {/* Right: Instant Stock Switch & Dropdown Actions */}
        <div
          className="flex items-center gap-1.5 flex-shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex flex-col items-center">
            <span
              className={`text-[8px] font-bold uppercase tracking-wider mb-0.5 ${
                isAvailable
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-gray-400"
              }`}
            >
              {isAvailable ? "In Stock" : "Off"}
            </span>
            <Switch
              checked={isAvailable}
              onCheckedChange={() => onToggleAvailability(item.id, isAvailable)}
              className="scale-[0.8] data-[state=checked]:bg-emerald-500"
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              >
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36 rounded-2xl shadow-xl">
              <DropdownMenuItem
                onClick={() => onEdit(item)}
                className="gap-2 text-indigo-600 dark:text-indigo-400 font-semibold cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit Item</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(item.id)}
                className="gap-2 text-rose-600 dark:text-rose-400 font-semibold cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    );
  },
);

// Compact Mobile 2-Column Grid Card
const MobileGridItem = memo(
  ({
    item,
    currencySymbol,
    onEdit,
    onDelete,
    onToggleAvailability,
  }: {
    item: MenuItem;
    currencySymbol: string;
    onEdit: (item: MenuItem) => void;
    onDelete: (id: string) => void;
    onToggleAvailability: (id: string, currentStatus: boolean) => void;
  }) => {
    const isAvailable = item.is_available ?? true;

    return (
      <div
        onClick={() => onEdit(item)}
        className={`group relative flex flex-col bg-white dark:bg-gray-800/90 rounded-2xl border overflow-hidden transition-all shadow-xs cursor-pointer active:scale-[0.99] ${
          isAvailable
            ? "border-gray-100 dark:border-gray-700/80"
            : "border-rose-200/50 dark:border-rose-950/40 bg-gray-50/70 dark:bg-gray-800/40 opacity-70"
        }`}
      >
        {/* Top Image / Food Avatar */}
        <div className="relative">
          <FoodThumbnail item={item} size="lg" />

          {/* Price Badge Overlay */}
          <div className="absolute bottom-1.5 right-1.5 bg-slate-900/80 dark:bg-black/80 backdrop-blur-xs text-white text-xs font-black px-2 py-0.5 rounded-lg shadow-sm">
            {currencySymbol}
            {item.price}
          </div>
        </div>

        {/* Content */}
        <div className="p-2.5 flex-1 flex flex-col justify-between">
          <div>
            <h4
              className={`text-xs font-bold line-clamp-1 capitalize ${
                isAvailable
                  ? "text-gray-900 dark:text-white"
                  : "text-gray-500 dark:text-gray-400 line-through"
              }`}
            >
              {item.name}
            </h4>
            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold truncate mt-0.5">
              {item.category}
            </p>
          </div>

          {/* Action bottom row */}
          <div
            className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100 dark:border-gray-700/60"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-1">
              <Switch
                checked={isAvailable}
                onCheckedChange={() => onToggleAvailability(item.id, isAvailable)}
                className="scale-[0.7] data-[state=checked]:bg-emerald-500 -ml-1"
              />
              <span className="text-[9px] text-gray-400 font-semibold">
                {isAvailable ? "Stock" : "Off"}
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => onEdit(item)}
                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-indigo-600 dark:text-indigo-400"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onDelete(item.id)}
                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-rose-600 dark:text-rose-400"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  },
);

export const MobileMenuView = ({
  items,
  allItems,
  activeCategory,
  setActiveCategory,
  searchQuery,
  setSearchQuery,
  groupedItemsData,
  currencySymbol,
  onEdit,
  onDelete,
  onToggleAvailability,
  onOpenAddModal,
  onOpenAIImport,
}: MobileMenuViewProps) => {
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  const vegCount = allItems.filter((i) => i.is_veg === true).length;
  const nonVegCount = allItems.filter((i) => i.is_veg === false).length;
  const specialCount = allItems.filter((i) => i.is_special === true).length;

  return (
    <div className="space-y-3 pb-28">
      {/* Search Bar & AI Action Header */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search ${allItems.length} items...`}
            className="pl-9 pr-8 h-10 rounded-2xl bg-white dark:bg-gray-800 border-gray-200/80 dark:border-gray-700/80 shadow-xs text-sm focus-visible:ring-emerald-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* AI Import Trigger */}
        <FeatureLock feature="menu.ai_import" interceptClicks={true}>
          <Button
            size="sm"
            variant="outline"
            onClick={onOpenAIImport}
            className="h-10 px-3 rounded-2xl border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20 hover:bg-emerald-100/50 shadow-xs flex items-center gap-1 font-bold text-xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
            <span>AI</span>
          </Button>
        </FeatureLock>

        {/* List vs Grid Mode Switcher */}
        <div className="flex items-center bg-gray-100 dark:bg-gray-800 p-1 rounded-2xl border border-gray-200/70 dark:border-gray-700/70">
          <button
            onClick={() => setViewMode("list")}
            className={`p-1.5 rounded-xl transition-all ${
              viewMode === "list"
                ? "bg-white dark:bg-gray-700 text-emerald-600 dark:text-emerald-400 shadow-xs font-bold"
                : "text-gray-400 hover:text-gray-600"
            }`}
            title="List View"
          >
            <List className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode("grid")}
            className={`p-1.5 rounded-xl transition-all ${
              viewMode === "grid"
                ? "bg-white dark:bg-gray-700 text-emerald-600 dark:text-emerald-400 shadow-xs font-bold"
                : "text-gray-400 hover:text-gray-600"
            }`}
            title="Grid View"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Categories & Filter Bar */}
      <CategoryBar
        activeCategory={activeCategory}
        setActiveCategory={setActiveCategory}
        groupedItemsData={groupedItemsData}
        totalCount={allItems.length}
        vegCount={vegCount}
        nonVegCount={nonVegCount}
        specialCount={specialCount}
      />

      {/* Item Counter Summary */}
      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 px-1">
        <span>
          Showing <strong className="text-gray-900 dark:text-white font-bold">{items.length}</strong> items
          {activeCategory !== "all" && (
            <span className="text-emerald-600 dark:text-emerald-400 font-bold ml-1">
              • {activeCategory}
            </span>
          )}
        </span>
      </div>

      {/* Empty State */}
      {items.length === 0 ? (
        <div className="py-16 text-center bg-white/60 dark:bg-gray-800/60 rounded-3xl border border-dashed border-gray-200 dark:border-gray-700 p-6">
          <AlertCircle className="w-10 h-10 text-gray-400 mx-auto mb-2" />
          <h4 className="text-base font-bold text-gray-800 dark:text-gray-200">No items found</h4>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-xs mx-auto">
            Try adjusting your search query or choosing another category filter.
          </p>
          {(searchQuery || activeCategory !== "all") && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setSearchQuery("");
                setActiveCategory("all");
              }}
              className="mt-4 rounded-xl text-xs"
            >
              Reset Filters
            </Button>
          )}
        </div>
      ) : viewMode === "list" ? (
        /* List View */
        <div className="space-y-2">
          {items.map((item) => (
            <MobileListItem
              key={item.id}
              item={item}
              currencySymbol={currencySymbol}
              onEdit={onEdit}
              onDelete={onDelete}
              onToggleAvailability={onToggleAvailability}
            />
          ))}
        </div>
      ) : (
        /* 2-Column Grid View */
        <div className="grid grid-cols-2 gap-2.5">
          {items.map((item) => (
            <MobileGridItem
              key={item.id}
              item={item}
              currencySymbol={currencySymbol}
              onEdit={onEdit}
              onDelete={onDelete}
              onToggleAvailability={onToggleAvailability}
            />
          ))}
        </div>
      )}

      {/* Floating Action Button (FAB) for Add Item */}
      <div className="fixed bottom-20 right-5 z-40">
        <Button
          onClick={onOpenAddModal}
          className="h-14 w-14 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-xl shadow-emerald-600/35 flex items-center justify-center p-0 hover:scale-105 active:scale-95 transition-transform"
        >
          <Plus className="w-7 h-7" />
        </Button>
      </div>
    </div>
  );
};

export default MobileMenuView;
