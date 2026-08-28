import React, { useState } from "react";
import {
  ChefHat,
  Plus,
  HelpCircle,
  Search,
  Filter,
  ArrowUpDown,
  Utensils,
  Calculator,
  Grid,
  Layers,
  Sparkles,
  TrendingUp,
  Percent,
  Clock,
  Users,
  MoreVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSandbox } from "../context/SandboxContext";
import { formatCurrency } from "@/utils/formatters";

interface SandboxRecipe {
  id: string;
  name: string;
  category: string;
  tags?: string[];
  description: string;
  prepTime: string;
  cookTime: string;
  serves: number;
  cost: number;
  sellingPrice: number;
  foodCostPercent: number;
  marginPercent: number;
  yieldUnit?: string;
  yieldAmount?: string;
  unitCost?: string;
}

const RECIPES_DATA: SandboxRecipe[] = [
  {
    id: "r1",
    name: "Falooda",
    category: "Main Course",
    description: "A decadent and refreshing Indian dessert drink featuring layers of sweet rose syrup, soft vermicelli, chewy basil seeds, creamy milk...",
    prepTime: "0m",
    cookTime: "0m",
    serves: 1,
    cost: 0.07,
    sellingPrice: 129,
    foodCostPercent: 0.1,
    marginPercent: 100,
  },
  {
    id: "r2",
    name: "Pasta",
    category: "Main Course",
    description: "A timeless Italian classic, this vibrant spaghetti Aglio e Olio captures the essence of simplicity with its aromatic garlic, a kick of red...",
    prepTime: "0m",
    cookTime: "0m",
    serves: 1,
    cost: 140.0,
    sellingPrice: 249,
    foodCostPercent: 56.2,
    marginPercent: 44,
  },
  {
    id: "r3",
    name: "Pizza",
    category: "Main Course",
    description: "Hand-tossed crust with rich San Marzano tomato sauce, fresh mozzarella, and slow-roasted garden basil.",
    prepTime: "0m",
    cookTime: "0m",
    serves: 1,
    cost: 184.0,
    sellingPrice: 2250,
    foodCostPercent: 8.2,
    marginPercent: 92,
  },
  {
    id: "r4",
    name: "Production: soya paneer",
    category: "Side Dish",
    tags: ["Production"],
    description: "Production recipe for homemade fresh organic soya paneer blocks.",
    prepTime: "0m",
    cookTime: "0m",
    serves: 1,
    cost: 95.0,
    sellingPrice: 0,
    foodCostPercent: 0,
    marginPercent: 0,
    yieldAmount: "1 kg",
    unitCost: "₹95.00/kg",
  },
  {
    id: "r5",
    name: "Production: white sauce",
    category: "Side Dish",
    tags: ["Production"],
    description: "Master batch production recipe for creamy béchamel white sauce base.",
    prepTime: "0m",
    cookTime: "0m",
    serves: 1,
    cost: 83.0,
    sellingPrice: 0,
    foodCostPercent: 0,
    marginPercent: 0,
    yieldAmount: "750 ml",
    unitCost: "₹0.11/ml",
  },
  {
    id: "r6",
    name: "Veg Biryani",
    category: "Main Course",
    description: "Indulge in the aromatic symphony of spices with our Veg Biryani, a fragrant masterpiece of long-grain basmati rice layered with tender vegetables...",
    prepTime: "0m",
    cookTime: "0m",
    serves: 1,
    cost: 350.0,
    sellingPrice: 0,
    foodCostPercent: 0,
    marginPercent: 0,
  },
];

export const SandboxRecipesView: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<"recipes" | "costing" | "matrix" | "batch">("recipes");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All Categories");
  const [selectedRecipeForModal, setSelectedRecipeForModal] = useState<SandboxRecipe | null>(null);

  const filteredRecipes = RECIPES_DATA.filter((r) => {
    const matchesSearch = r.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "All Categories" || r.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 pb-20">
      {/* Top Banner (Matches Image 2) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-2xl shadow-lg shadow-orange-500/20">
            <ChefHat className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              KIWI
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
              Recipe & Costing Management
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Manage recipes, calculate costs, and track batch production
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="rounded-xl text-xs font-semibold gap-1.5 h-9 text-slate-600">
            <HelpCircle className="h-3.5 w-3.5" />
            <span>Help & Guide</span>
          </Button>

          <Button size="sm" className="bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white rounded-xl text-xs font-bold gap-1.5 h-9 shadow-md shadow-orange-500/20">
            <Plus className="h-4 w-4" />
            <span>New Recipe</span>
          </Button>
        </div>
      </div>

      {/* 4 Summary Metric Cards (Matches Image 2) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Recipes */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border-t-4 border-orange-500 border-x border-b border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center gap-2 text-orange-600">
            <ChefHat className="h-4 w-4" />
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Total Recipes</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white font-mono">6</span>
            <span className="text-xs text-emerald-600 font-semibold">6 active</span>
          </div>
        </div>

        {/* Avg Food Cost % */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border-t-4 border-emerald-500 border-x border-b border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center gap-2 text-emerald-600">
            <TrendingUp className="h-4 w-4" />
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Avg Food Cost %</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white font-mono">10.7%</span>
            <span className="text-xs text-slate-400 font-medium">Target: &lt;30%</span>
          </div>
        </div>

        {/* Total Cost */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border-t-4 border-blue-500 border-x border-b border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center gap-2 text-blue-600">
            <Layers className="h-4 w-4" />
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Total Cost</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white font-mono">₹852.07</span>
            <span className="text-xs text-slate-400 font-medium">All recipes combined</span>
          </div>
        </div>

        {/* Categories */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border-t-4 border-purple-500 border-x border-b border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center gap-2 text-purple-600">
            <Grid className="h-4 w-4" />
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Categories</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white font-mono">2</span>
            <span className="text-xs text-slate-400 font-medium">Different types</span>
          </div>
        </div>
      </div>

      {/* Main Recipes Explorer (Matches Image 2) */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl p-6 space-y-6">
        {/* Sub-tabs Navigation */}
        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <button
            onClick={() => setActiveSubTab("recipes")}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeSubTab === "recipes"
                ? "bg-amber-500 text-white shadow-md shadow-amber-500/20"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100"
            }`}
          >
            <Utensils className="h-3.5 w-3.5" />
            <span>Recipes</span>
          </button>

          <button
            onClick={() => setActiveSubTab("costing")}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeSubTab === "costing"
                ? "bg-amber-500 text-white shadow-md shadow-amber-500/20"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100"
            }`}
          >
            <Calculator className="h-3.5 w-3.5" />
            <span>Costing</span>
          </button>

          <button
            onClick={() => setActiveSubTab("matrix")}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeSubTab === "matrix"
                ? "bg-amber-500 text-white shadow-md shadow-amber-500/20"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100"
            }`}
          >
            <Grid className="h-3.5 w-3.5" />
            <span>Matrix</span>
          </button>

          <button
            onClick={() => setActiveSubTab("batch")}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeSubTab === "batch"
                ? "bg-amber-500 text-white shadow-md shadow-amber-500/20"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100"
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Batch</span>
          </button>
        </div>

        {/* Search & Sort Row */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search recipes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-xl text-xs text-slate-600 dark:text-slate-300">
              <Filter className="h-3.5 w-3.5 text-slate-400" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-transparent focus:outline-none cursor-pointer"
              >
                <option value="All Categories">All Categories</option>
                <option value="Main Course">Main Course</option>
                <option value="Side Dish">Side Dish</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-xl text-xs text-slate-600 dark:text-slate-300">
              <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
              <span>Name (A-Z)</span>
            </div>
          </div>
        </div>

        {/* Recipe Cards Grid (3 Columns - Matches Image 2) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredRecipes.map((recipe) => (
            <div
              key={recipe.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Badge className="bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5">
                      {recipe.category}
                    </Badge>
                    {recipe.tags?.map((t) => (
                      <Badge key={t} className="bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5">
                        {t}
                      </Badge>
                    ))}
                  </div>
                  <MoreVertical className="h-4 w-4 text-slate-400 cursor-pointer" />
                </div>

                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  {recipe.name}
                </h3>

                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                  {recipe.description}
                </p>

                {/* Prep, Cook, Serves */}
                <div className="flex items-center gap-4 text-[11px] text-slate-400 font-medium pt-1">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-amber-500" /> Prep: {recipe.prepTime}
                  </span>
                  <span className="flex items-center gap-1">
                    🔥 Cook: {recipe.cookTime}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5 text-blue-500" /> Serves: {recipe.serves}
                  </span>
                </div>

                {/* Cost vs Selling Price Breakdown Card */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">Cost</span>
                      <span className="font-extrabold text-slate-800 dark:text-slate-100 font-mono">
                        {formatCurrency(recipe.cost)}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                        {recipe.yieldAmount ? "Recipe Yield" : "Selling Price"}
                      </span>
                      <span className="font-extrabold text-orange-600 font-mono">
                        {recipe.yieldAmount || formatCurrency(recipe.sellingPrice)}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200/80 dark:border-slate-700 flex justify-between items-center text-xs">
                    {recipe.unitCost ? (
                      <>
                        <span className="text-[10px] text-slate-400">Unit Cost</span>
                        <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-[10px] font-bold">
                          {recipe.unitCost}
                        </Badge>
                      </>
                    ) : (
                      <>
                        <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px] font-bold">
                          {recipe.foodCostPercent}% Food Cost
                        </Badge>
                        <span className="font-bold text-slate-700 dark:text-slate-300 text-[11px]">
                          Margin: <strong className="text-emerald-600">{recipe.marginPercent}%</strong>
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Bottom Action Button (Matches Image 2) */}
              <Button
                onClick={() => setSelectedRecipeForModal(recipe)}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-xs rounded-xl h-10 shadow-md shadow-orange-500/20"
              >
                ✏️ Manage Recipe
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Manage Recipe Modal Simulation */}
      {selectedRecipeForModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex justify-between items-start border-b pb-3 border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                  {selectedRecipeForModal.name}
                </h3>
                <p className="text-xs text-slate-400">Ingredients & Food Cost Breakdown</p>
              </div>
              <button
                onClick={() => setSelectedRecipeForModal(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Recipe Formulation
              </span>
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl space-y-1.5">
                <div className="flex justify-between">
                  <span>Base Ingredients</span>
                  <span className="font-mono">{formatCurrency(selectedRecipeForModal.cost * 0.7)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Garnish & Seasoning</span>
                  <span className="font-mono">{formatCurrency(selectedRecipeForModal.cost * 0.15)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Eco Packaging</span>
                  <span className="font-mono">{formatCurrency(selectedRecipeForModal.cost * 0.15)}</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between font-bold text-sm">
              <span>Total Batch Cost</span>
              <span className="text-orange-600 font-mono">
                {formatCurrency(selectedRecipeForModal.cost)}
              </span>
            </div>

            <Button
              onClick={() => setSelectedRecipeForModal(null)}
              className="w-full bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs rounded-xl h-10"
            >
              Close
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
