import React, { useState } from "react";
import {
  ChefHat,
  Sparkles,
  Utensils,
  Search,
  Plus,
  HelpCircle,
  Edit2,
  Trash2,
  Check,
  Filter,
  Layers,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useSandbox } from "../context/SandboxContext";
import { formatCurrency } from "@/utils/formatters";

interface MenuItemOffering {
  id: string;
  name: string;
  category: string;
  description: string;
  price: number;
  isVeg: boolean;
  isSpecial?: boolean;
  isAvailable: boolean;
}

const INITIAL_MENU_OFFERINGS: MenuItemOffering[] = [
  {
    id: "m-1",
    name: "Jain Cheese Corn Pizza",
    category: "Jain Pizza",
    description: "Delectable sweet corn and melted cheese pizza adhering to Jain guidelines.",
    price: 140,
    isVeg: true,
    isAvailable: true,
  },
  {
    id: "m-2",
    name: "Jain Paneer Mexican Pizza",
    category: "Jain Pizza",
    description: "Succulent paneer with Mexican seasonings on a delicious Jain-friendly pizza base.",
    price: 170,
    isVeg: true,
    isAvailable: true,
  },
  {
    id: "m-3",
    name: "Jain Veg Mexican Pizza",
    category: "Jain Pizza",
    description: "Spicy Mexican style pizza prepared without onion and garlic.",
    price: 160,
    isVeg: true,
    isAvailable: true,
  },
  {
    id: "m-4",
    name: "Jain Margherita Pizza",
    category: "Jain Pizza",
    description: "Classic Jain-friendly margherita pizza with simple tomato sauce and cheese.",
    price: 120,
    isVeg: true,
    isAvailable: true,
  },
  {
    id: "m-5",
    name: "Special Paneer Butter Masala",
    category: "Main Course",
    description: "Rich and creamy tomato gravy with velvety paneer cubes and butter.",
    price: 290,
    isVeg: true,
    isSpecial: true,
    isAvailable: true,
  },
  {
    id: "m-6",
    name: "Veg Schezwan Fried Rice",
    category: "Chinese Rice",
    description: "Wok-tossed basmati rice with fiery Schezwan chili garlic sauce and crunchy vegetables.",
    price: 130,
    isVeg: true,
    isAvailable: true,
  },
  {
    id: "m-7",
    name: "Jain Veg Cheese Grilled Sandwich",
    category: "Jain Sandwiches",
    description: "Golden grilled sandwich with gooey melted cheese and fresh bell peppers.",
    price: 110,
    isVeg: true,
    isAvailable: true,
  },
  {
    id: "m-8",
    name: "Cheese Butter Maggie",
    category: "Maggies",
    description: "Comforting hot noodles tossed in butter with a thick layer of grated Amul cheese.",
    price: 90,
    isVeg: true,
    isAvailable: true,
  },
];

export const SandboxMenuView: React.FC = () => {
  const { triggerToast } = useSandbox();
  const [items, setItems] = useState<MenuItemOffering[]>(INITIAL_MENU_OFFERINGS);
  const [activeFilter, setActiveFilter] = useState<"all" | "veg" | "non-veg" | "specials">("all");
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");

  const subCategories = [
    { label: "All", count: items.length },
    { label: "Jain Pizza", count: 4 },
    { label: "Pizza", count: 6 },
    { label: "Jain Sandwiches", count: 2 },
    { label: "Tasty Sandwiches", count: 7 },
    { label: "Maggies", count: 3 },
    { label: "Chinese Rice", count: 10 },
    { label: "Chinese Bhel", count: 2 },
    { label: "Main Course", count: 7 },
  ];

  const filteredItems = items.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSubCategory = selectedSubCategory === "All" || item.category === selectedSubCategory;
    const matchesFilter =
      activeFilter === "all"
        ? true
        : activeFilter === "veg"
        ? item.isVeg
        : activeFilter === "non-veg"
        ? !item.isVeg
        : item.isSpecial;
    return matchesSearch && matchesSubCategory && matchesFilter;
  });

  const toggleAvailability = (id: string) => {
    setItems((prev) =>
      prev.map((i) => {
        if (i.id === id) {
          const next = !i.isAvailable;
          triggerToast(
            next
              ? `🟢 ${i.name} marked IN STOCK`
              : `🔴 ${i.name} marked OUT OF STOCK`
          );
          return { ...i, isAvailable: next };
        }
        return i;
      })
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/30 to-teal-50/40 dark:from-slate-950 dark:via-slate-900 pb-20 space-y-6">
      {/* Green Header Banner (Matches Image 3) */}
      <div className="relative overflow-hidden bg-gradient-to-r from-emerald-600 via-teal-600 to-green-600 text-white p-5 sm:p-6 shadow-lg">
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 max-w-[1700px] mx-auto">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl shadow-inner text-white">
              <ChefHat className="h-7 w-7" />
            </div>
            <div>
              <span className="text-[10px] font-bold tracking-wider uppercase text-emerald-200 block">
                KIWI
              </span>
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight flex items-center gap-2">
                Menu Management
                <Sparkles className="h-4 w-4 text-yellow-300 animate-pulse" />
              </h1>
              <p className="text-xs sm:text-sm text-emerald-100 font-medium">
                Manage items, pricing, availability & categories
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 rounded-xl text-xs font-semibold h-9"
            >
              <HelpCircle className="h-3.5 w-3.5 mr-1.5" />
              Help & Guide
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content Workspace (Matches Image 3) */}
      <div className="max-w-[1700px] mx-auto px-4 sm:px-6 space-y-5">
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-xl space-y-5">
          {/* Top Controls Row */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/10 text-emerald-600 rounded-2xl">
                <Utensils className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                  Menu Offerings
                </h3>
                <span className="text-xs text-slate-400 font-medium">
                  {items.length} items shown • 14 categories
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative min-w-[240px] flex-1">
                <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search items by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
                />
              </div>

              <Button
                variant="outline"
                size="sm"
                className="rounded-xl text-xs font-bold gap-1.5 h-9 border-emerald-300 text-emerald-700 bg-emerald-50/50"
              >
                <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                AI Import
              </Button>

              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold gap-1.5 h-9 shadow-md shadow-emerald-600/20"
              >
                <Plus className="h-4 w-4" />
                Add Item
              </Button>
            </div>
          </div>

          {/* Filter Pills (Matches Image 3) */}
          <div className="flex items-center gap-2 border-t border-slate-100 dark:border-slate-800 pt-4 overflow-x-auto pb-1">
            <button
              onClick={() => setActiveFilter("all")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeFilter === "all"
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              All ({items.length})
            </button>

            <button
              onClick={() => setActiveFilter("veg")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeFilter === "veg"
                  ? "bg-emerald-600 text-white"
                  : "bg-emerald-50 text-emerald-700 border border-emerald-200"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Veg ({items.filter((i) => i.isVeg).length})
            </button>

            <button
              onClick={() => setActiveFilter("non-veg")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeFilter === "non-veg"
                  ? "bg-red-600 text-white"
                  : "bg-red-50 text-red-700 border border-red-200"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-red-500" />
              Non-Veg (0)
            </button>

            <button
              onClick={() => setActiveFilter("specials")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeFilter === "specials"
                  ? "bg-amber-500 text-white"
                  : "bg-amber-50 text-amber-700 border border-amber-200"
              }`}
            >
              <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
              Specials (4)
            </button>
          </div>

          {/* Sub-Category Badges (Matches Image 3) */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {subCategories.map((c) => (
              <button
                key={c.label}
                onClick={() => setSelectedSubCategory(c.label)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedSubCategory === c.label
                    ? "bg-amber-500/20 text-amber-700 border border-amber-400 font-bold"
                    : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                }`}
              >
                🍕 {c.label} <span className="opacity-70">({c.count})</span>
              </button>
            ))}
          </div>

          {/* 4-Column Card Grid (Matches Image 3) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                {/* Top Image Preview with Price Pill */}
                <div className="h-32 bg-gradient-to-tr from-amber-100/60 via-orange-100/40 to-slate-100 relative p-3 flex items-center justify-center">
                  <div className="text-5xl select-none filter drop-shadow-md">
                    🍕
                  </div>

                  <span className="absolute top-3 left-3 w-4 h-4 rounded-sm border-2 border-emerald-600 flex items-center justify-center bg-white">
                    <span className="w-2 h-2 rounded-full bg-emerald-600" />
                  </span>

                  {item.isSpecial && (
                    <Badge className="absolute top-3 left-9 bg-purple-600 text-white text-[10px] font-bold gap-1">
                      <Star className="h-2.5 w-2.5 fill-white" /> Special
                    </Badge>
                  )}

                  <div className="absolute bottom-3 right-3 bg-slate-900 text-white font-mono font-black text-xs px-2.5 py-1 rounded-xl shadow-md">
                    {formatCurrency(item.price)}
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-4 flex-1 space-y-2">
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white leading-tight">
                    {item.name}
                  </h4>
                  <span className="text-[11px] font-bold text-emerald-600 block">
                    {item.category}
                  </span>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                {/* In Stock & Action Buttons */}
                <div className="p-4 pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold ${
                        item.isAvailable ? "text-emerald-600" : "text-red-500"
                      }`}
                    >
                      {item.isAvailable ? "● In Stock" : "● Out of Stock"}
                    </span>
                    <Switch
                      checked={item.isAvailable}
                      onCheckedChange={() => toggleAvailability(item.id)}
                      className="data-[state=checked]:bg-emerald-600"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs font-semibold rounded-xl gap-1 text-slate-700 dark:text-slate-200"
                    >
                      <Edit2 className="h-3 w-3 text-indigo-500" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs font-semibold rounded-xl gap-1 text-red-600 border-red-200 hover:bg-red-50"
                    >
                      <Trash2 className="h-3 w-3" />
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
