import React, { useState } from "react";
import {
  Menu as MenuIcon,
  Zap,
  DollarSign,
  TrendingUp,
  Percent,
  Search,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useSandbox, DemoMenuItem } from "../context/SandboxContext";
import { formatCurrency } from "@/utils/formatters";

export const SandboxMenuStockView: React.FC = () => {
  const { menuItems, toggleItemStock } = useSandbox();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const categories = [
    "All",
    "Biryani",
    "Curries",
    "Tandoori & Starters",
    "Breads",
    "Beverages",
    "Desserts",
  ];

  const filteredItems = menuItems.filter((item) => {
    const matchesCategory =
      selectedCategory === "All" || item.category === selectedCategory;
    const matchesSearch = item.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="p-4 sm:p-8 space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <MenuIcon className="h-6 w-6 text-indigo-600" />
            Menu Management & 86-Stock Multi-Channel Sync
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Real-time COGS profit margin tracking & instant 1-click item disable across Swiggy, Zomato & POS
          </p>
        </div>

        {/* 86 Summary Badge */}
        <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 px-3.5 py-1.5 rounded-2xl text-xs font-bold text-amber-700 dark:text-amber-400">
          <Zap className="h-4 w-4 text-amber-500 animate-pulse" />
          <span>
            {menuItems.filter((i) => !i.isAvailable).length} Items Currently 86'd Out-of-Stock
          </span>
        </div>
      </div>

      {/* Catalog Table Card */}
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-white/60 dark:border-slate-800 rounded-3xl shadow-xl p-6 space-y-4">
        {/* Search & Category Pills */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search recipes & dishes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setSelectedCategory(c)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  selectedCategory === c
                    ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Menu Items Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-slate-400 border-b border-slate-100 dark:border-slate-800 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-3">Item / Recipe Name</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3">Kitchen Station</th>
                <th className="py-3 px-3 text-right">Selling Price</th>
                <th className="py-3 px-3 text-right">Ingredient Cost</th>
                <th className="py-3 px-3 text-right">Gross Margin</th>
                <th className="py-3 px-3 text-center">86 Stock Sync Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredItems.map((item) => {
                const margin = Math.round(
                  ((item.price - item.cost) / item.price) * 100
                );
                return (
                  <tr
                    key={item.id}
                    className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                      !item.isAvailable ? "bg-red-500/5 opacity-80" : ""
                    }`}
                  >
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2.5 h-2.5 rounded-full ${
                            item.isVeg ? "bg-green-500" : "bg-red-500"
                          }`}
                        />
                        <span className="font-bold text-slate-900 dark:text-white">
                          {item.name}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-3 text-slate-500">{item.category}</td>
                    <td className="py-3.5 px-3">
                      <Badge variant="outline" className="text-[10px] font-mono">
                        {item.station}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-3 text-right font-bold text-slate-900 dark:text-white font-mono">
                      {formatCurrency(item.price)}
                    </td>
                    <td className="py-3.5 px-3 text-right text-slate-500 font-mono">
                      {formatCurrency(item.cost)}
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      <Badge
                        className={`text-[10px] font-bold ${
                          margin > 60
                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                            : "bg-amber-500/10 text-amber-600 border-amber-500/30"
                        }`}
                      >
                        {margin}% Profit
                      </Badge>
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <span
                          className={`text-[11px] font-semibold ${
                            item.isAvailable
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-red-500 font-bold"
                          }`}
                        >
                          {item.isAvailable ? "In Stock" : "86 Disabled"}
                        </span>
                        <Switch
                          checked={item.isAvailable}
                          onCheckedChange={() => toggleItemStock(item.id)}
                          className="data-[state=checked]:bg-emerald-600"
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
