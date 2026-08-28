import React, { useState } from "react";
import {
  Package,
  Plus,
  AlertTriangle,
  Layers,
  TrendingUp,
  Search,
  Filter,
  FileSpreadsheet,
  FileText,
  Scan,
  Edit2,
  Trash2,
  CheckCircle2,
  Clock,
  RotateCcw,
  ShoppingBag,
  Bell,
  ShoppingCart,
  Lightbulb,
  TrendingDown,
  Tag,
  Trash,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSandbox } from "../context/SandboxContext";
import { formatCurrency } from "@/utils/formatters";

interface InventoryStockItem {
  id: string;
  name: string;
  category: "Groceries" | "Other" | "Vegetables" | "Dairy";
  stock: number;
  unit: string;
  pricePerUnit: number;
  reorderLevel: number;
  isLowStock?: boolean;
}

const STOCK_ITEMS: InventoryStockItem[] = [
  {
    id: "inv-1",
    name: "Basmati Rice",
    category: "Groceries",
    stock: 3.5,
    unit: "KG",
    pricePerUnit: 120,
    reorderLevel: 2,
  },
  {
    id: "inv-2",
    name: "Broccoli",
    category: "Other",
    stock: 0.31,
    unit: "KG",
    pricePerUnit: 120,
    reorderLevel: 2,
    isLowStock: true,
  },
  {
    id: "inv-3",
    name: "cabbage",
    category: "Vegetables",
    stock: 0,
    unit: "KG",
    pricePerUnit: 20,
    reorderLevel: 2,
    isLowStock: true,
  },
  {
    id: "inv-4",
    name: "Cherry Tomato",
    category: "Other",
    stock: 0.75,
    unit: "KG",
    pricePerUnit: 260,
    reorderLevel: 2,
  },
  {
    id: "inv-5",
    name: "curd",
    category: "Dairy",
    stock: 0,
    unit: "L",
    pricePerUnit: 60,
    reorderLevel: 5,
    isLowStock: true,
  },
  {
    id: "inv-6",
    name: "Green Zucchini",
    category: "Other",
    stock: 2.25,
    unit: "KG",
    pricePerUnit: 140,
    reorderLevel: 1.5,
  },
  {
    id: "inv-7",
    name: "milk",
    category: "Dairy",
    stock: 1.0,
    unit: "L",
    pricePerUnit: 70,
    reorderLevel: 5,
    isLowStock: true,
  },
  {
    id: "inv-8",
    name: "oil",
    category: "Groceries",
    stock: 12.0,
    unit: "L",
    pricePerUnit: 145,
    reorderLevel: 5,
  },
];

interface InventoryTransaction {
  id: string;
  itemName: string;
  type: "usage" | "waste" | "adjustment" | "purchase" | "production output" | "production consumed";
  qty: string;
  unitCost: string;
  totalCost: string;
  note: string;
  date: string;
}

const TRANSACTIONS_DATA: InventoryTransaction[] = [
  {
    id: "tx-1",
    itemName: "milk",
    type: "usage",
    qty: "-0.001 l",
    unitCost: "@ ₹70.00/l",
    totalCost: "₹0.07",
    note: "Used for order preparation",
    date: "11/9/2026, 11:25:56 PM",
  },
  {
    id: "tx-2",
    itemName: "milk",
    type: "usage",
    qty: "-0.001 l",
    unitCost: "@ ₹70.00/l",
    totalCost: "₹0.07",
    note: "Used for order preparation",
    date: "7/26/2026, 8:49:23 PM",
  },
  {
    id: "tx-3",
    itemName: "milk",
    type: "usage",
    qty: "-0.001 l",
    unitCost: "@ ₹70.00/l",
    totalCost: "₹0.07",
    note: "Used for order preparation",
    date: "7/11/2026, 9:07:45 PM",
  },
  {
    id: "tx-4",
    itemName: "Broccoli",
    type: "waste",
    qty: "-0.5 kg",
    unitCost: "@ ₹120.00/kg",
    totalCost: "₹60.00",
    note: "Expired / spoiled batch",
    date: "7/11/2026, 8:21:08 PM",
  },
  {
    id: "tx-5",
    itemName: "Basmati Rice",
    type: "adjustment",
    qty: "-0.5 kg",
    unitCost: "@ ₹120.00/kg",
    totalCost: "₹60.00",
    note: "Stocktake Audit Waste/Loss (Fallback)",
    date: "7/11/2026, 8:17:43 PM",
  },
  {
    id: "tx-6",
    itemName: "Basmati Rice",
    type: "adjustment",
    qty: "-1 kg",
    unitCost: "@ ₹120.00/kg",
    totalCost: "₹120.00",
    note: "Stocktake Audit Waste/Loss (Fallback)",
    date: "7/11/2026, 8:18:25 PM",
  },
  {
    id: "tx-7",
    itemName: "paneer",
    type: "purchase",
    qty: "+5 kg",
    unitCost: "@ ₹399.99/kg",
    totalCost: "₹1999.95",
    note: "Initial stock entry",
    date: "7/11/2026, 8:15:35 PM",
  },
  {
    id: "tx-8",
    itemName: "white sauce",
    type: "production output",
    qty: "+50 l",
    unitCost: "@ ₹0.11/l",
    totalCost: "₹5.53",
    note: "Produced from formula. Lot: PROD-BNDN7UW0",
    date: "7/11/2026, 8:13:57 PM",
  },
  {
    id: "tx-9",
    itemName: "milk",
    type: "production consumed",
    qty: "-0.0667 l",
    unitCost: "@ ₹70.00/l",
    totalCost: "₹4.67",
    note: "Re-production: white sauce",
    date: "7/11/2026, 8:13:56 PM",
  },
  {
    id: "tx-10",
    itemName: "Cherry Tomato",
    type: "production consumed",
    qty: "-0.0033 kg",
    unitCost: "@ ₹260.00/kg",
    totalCost: "₹0.86",
    note: "Re-production: white sauce",
    date: "7/11/2026, 8:13:56 PM",
  },
];

export const SandboxInventoryView: React.FC = () => {
  const { triggerToast } = useSandbox();
  const [activeTab, setActiveTab] = useState<
    "overview" | "alerts" | "stocktake" | "orders" | "suggest" | "forecast" | "history" | "lots" | "wastage"
  >("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All Categories");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [selectedSubCategory, setSelectedSubCategory] = useState("All");

  const categories = [
    { label: "Groceries", count: 4 },
    { label: "Other", count: 11 },
    { label: "Vegetables", count: 2 },
    { label: "Dairy", count: 2 },
  ];

  const filteredItems = STOCK_ITEMS.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      categoryFilter === "All Categories" || item.category === categoryFilter;
    const matchesSubCategory =
      selectedSubCategory === "All" || item.category === selectedSubCategory;
    const matchesLowStock = lowStockOnly ? item.isLowStock : true;
    return matchesSearch && matchesCategory && matchesSubCategory && matchesLowStock;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 pb-20">
      {/* Top Banner (Matches Real Inventory Image 2) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-2xl shadow-lg shadow-emerald-500/20">
            <Package className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              KIWI
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
              Inventory Management
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Track stock, manage costs, and optimize reorders
            </p>
          </div>
        </div>

        <Button
          onClick={() => triggerToast("✨ Add Item dialog opened (Mock)")}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl h-10 px-4 gap-1.5 shadow-md shadow-emerald-600/20"
        >
          <Plus className="h-4 w-4" />
          <span>Add Item</span>
        </Button>
      </div>

      {/* 4 Summary Metric Cards (Matches Image 2) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Items */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-2xl">
            <Package className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
              TOTAL ITEMS
            </span>
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono">
              19
            </span>
          </div>
        </div>

        {/* Low Stock */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-red-500/10 text-red-600 rounded-2xl">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
              LOW STOCK
            </span>
            <span className="text-2xl font-extrabold text-red-600 font-mono">5</span>
          </div>
        </div>

        {/* Categories */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 text-blue-600 rounded-2xl">
            <Layers className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
              CATEGORIES
            </span>
            <span className="text-2xl font-extrabold text-blue-600 font-mono">4</span>
          </div>
        </div>

        {/* Total Value */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-purple-500/10 text-purple-600 rounded-2xl">
            <TrendingUp className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
              TOTAL VALUE
            </span>
            <span className="text-2xl font-extrabold text-purple-600 font-mono">
              ₹14,431
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Sub-tabs (Matches Image 2) */}
      <div className="bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-1.5 overflow-x-auto pb-1">
        {[
          { id: "overview", label: "Overview", icon: Package },
          { id: "alerts", label: "Alerts", icon: Bell },
          { id: "stocktake", label: "Stocktake", icon: FileText },
          { id: "orders", label: "Orders", icon: ShoppingCart },
          { id: "suggest", label: "Suggest", icon: Lightbulb },
          { id: "forecast", label: "Forecast", icon: TrendingUp },
          { id: "history", label: "History", icon: Clock },
          { id: "lots", label: "Lots", icon: Tag },
          { id: "wastage", label: "Wastage", icon: Trash },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                isActive
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab View Content */}
      {activeTab === "overview" && (
        <div className="space-y-4">
          {/* Filters & Export Row (Matches Image 2) */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex flex-wrap items-center gap-3 flex-1">
              <div className="relative min-w-[220px] flex-1">
                <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-xl text-xs text-slate-600 dark:text-slate-300">
                <Filter className="h-3.5 w-3.5 text-slate-400" />
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="bg-transparent focus:outline-none cursor-pointer"
                >
                  <option value="All Categories">All Categories</option>
                  <option value="Groceries">Groceries</option>
                  <option value="Vegetables">Vegetables</option>
                  <option value="Dairy">Dairy</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <button
                onClick={() => setLowStockOnly(!lowStockOnly)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  lowStockOnly
                    ? "bg-red-600 text-white"
                    : "bg-red-50 text-red-600 border border-red-200"
                }`}
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>Low Stock</span>
                <Badge className="bg-emerald-600 text-white text-[9px] px-1.5 py-0 h-4">5</Badge>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl text-xs font-bold gap-1 text-emerald-700 border-emerald-300 h-9"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                Export to Excel
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="rounded-xl text-xs font-bold gap-1 text-red-700 border-red-300 h-9"
              >
                <FileText className="h-3.5 w-3.5" />
                Export to PDF
              </Button>

              <Button
                size="sm"
                className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold gap-1.5 h-9"
              >
                <Scan className="h-3.5 w-3.5" />
                Scan Bill
              </Button>
            </div>
          </div>

          {/* Quick Category Badges */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setSelectedSubCategory("All")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                selectedSubCategory === "All"
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                  : "bg-white dark:bg-slate-900 border text-slate-600"
              }`}
            >
              All ({STOCK_ITEMS.length})
            </button>

            {categories.map((c) => (
              <button
                key={c.label}
                onClick={() => setSelectedSubCategory(c.label)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
                  selectedSubCategory === c.label
                    ? "bg-emerald-500/20 text-emerald-700 border-emerald-400 font-bold"
                    : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800"
                }`}
              >
                📁 {c.label} <span className="opacity-70">({c.count})</span>
              </button>
            ))}
          </div>

          {/* Inventory Item Cards (4 Columns - Matches Image 2) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`p-2.5 rounded-2xl ${
                        item.isLowStock
                          ? "bg-red-500/10 text-red-600"
                          : "bg-emerald-500/10 text-emerald-600"
                      }`}
                    >
                      <Package className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-slate-900 dark:text-white capitalize">
                        {item.name}
                      </h4>
                      <span className="text-[10px] text-slate-400">{item.category}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button className="p-1 text-slate-400 hover:text-slate-600">
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button className="p-1 text-slate-400 hover:text-red-500">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-slate-900 dark:text-white font-mono">
                      {item.stock}
                    </span>
                    <span className="text-xs font-bold text-slate-500">{item.unit}</span>
                  </div>

                  {item.isLowStock ? (
                    <div className="mt-2">
                      <Badge className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5">
                        ⚠️ Low Stock
                      </Badge>
                    </div>
                  ) : (
                    <div className="mt-2 w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full rounded-full w-[65%]" />
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs">
                  <span className="font-bold text-emerald-600 font-mono">
                    ₹{item.pricePerUnit}/{item.unit.toLowerCase()}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Reorder: {item.reorderLevel} {item.unit.toLowerCase()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* History Sub-tab (Matches Image 5) */}
      {activeTab === "history" && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl p-6 space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="flex items-center gap-2 text-emerald-600">
              <Clock className="h-5 w-5" />
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                Inventory Transactions
              </h3>
            </div>

            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl h-9 gap-1"
            >
              <Plus className="h-3.5 w-3.5" />
              Record Transaction
            </Button>
          </div>

          <div className="space-y-2.5">
            {TRANSACTIONS_DATA.map((tx) => {
              const badgeColors = {
                usage: "bg-blue-600 text-white",
                waste: "bg-red-600 text-white",
                adjustment: "bg-amber-600 text-white",
                purchase: "bg-emerald-600 text-white",
                "production output": "bg-amber-500 text-white",
                "production consumed": "bg-orange-500 text-white",
              };

              return (
                <div
                  key={tx.id}
                  className="p-3.5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-slate-200/80 dark:bg-slate-800 flex items-center justify-center text-slate-600 shrink-0">
                      📦
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white capitalize">
                          {tx.itemName}
                        </span>
                        <Badge className={`text-[9px] px-1.5 py-0 font-bold ${badgeColors[tx.type]}`}>
                          {tx.type}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">{tx.note}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="flex items-baseline justify-end gap-1.5 font-mono">
                      <span className="font-bold text-slate-700 dark:text-slate-200">{tx.qty}</span>
                      <span className="text-slate-400 text-[10px]">{tx.unitCost}</span>
                      <span className="font-extrabold text-purple-600">= {tx.totalCost}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 block">{tx.date}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Forecast Sub-tab (Matches Image 4) */}
      {activeTab === "forecast" && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-500/10 text-blue-600 rounded-2xl">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                    Inventory Forecast & Planning
                  </h3>
                  <p className="text-xs text-slate-400">Consumption velocity analysis over 30 days</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <select className="bg-slate-50 dark:bg-slate-800 border px-3 py-1.5 rounded-xl text-xs font-semibold">
                  <option>Last 30 days</option>
                </select>
                <select className="bg-slate-50 dark:bg-slate-800 border px-3 py-1.5 rounded-xl text-xs font-semibold">
                  <option>Lead: 3 days</option>
                </select>
              </div>
            </div>

            {/* 4 Forecast KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-t-2 border-red-500 space-y-1">
                <span className="text-[10px] text-red-500 font-bold uppercase">Critical</span>
                <p className="text-2xl font-black text-slate-900 dark:text-white font-mono">0</p>
                <span className="text-[10px] text-slate-400">Items at risk of stockout</span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-t-2 border-amber-500 space-y-1">
                <span className="text-[10px] text-amber-500 font-bold uppercase">Warning</span>
                <p className="text-2xl font-black text-slate-900 dark:text-white font-mono">0</p>
                <span className="text-[10px] text-slate-400">Reorder soon</span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-t-2 border-blue-500 space-y-1">
                <span className="text-[10px] text-blue-500 font-bold uppercase">Overstocked</span>
                <p className="text-2xl font-black text-slate-900 dark:text-white font-mono">1</p>
                <span className="text-[10px] text-slate-400">60+ days of supply</span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-t-2 border-emerald-500 space-y-1">
                <span className="text-[10px] text-emerald-500 font-bold uppercase">Reorder Cost</span>
                <p className="text-2xl font-black text-slate-900 dark:text-white font-mono">₹0</p>
                <span className="text-[10px] text-slate-400">Estimated purchase needed</span>
              </div>
            </div>

            {/* Smart Reorder Suggestions Table */}
            <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 text-emerald-600">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-xs font-bold">Smart Reorder Suggestions (17 active items)</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-slate-400 border-b uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">Item</th>
                      <th className="py-2.5 px-3">Stock</th>
                      <th className="py-2.5 px-3">Daily Use</th>
                      <th className="py-2.5 px-3">Days Left</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {[
                      { name: "tomato", cat: "Vegetables · kg", stock: "176.0", use: "0.00/kg/day" },
                      { name: "oil", cat: "Groceries · l", stock: "11.0", use: "0.00/l/day" },
                      { name: "olive oil", cat: "Groceries · l", stock: "1.0", use: "0.00/l/day" },
                      { name: "Red Capsicum", cat: "Other · kg", stock: "0.3", use: "0.00/kg/day" },
                      { name: "Green Zucchini", cat: "Other · kg", stock: "2.3", use: "0.00/kg/day" },
                    ].map((row, i) => (
                      <tr key={i} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-3">
                          <span className="font-bold text-slate-900 dark:text-white block">{row.name}</span>
                          <span className="text-[10px] text-slate-400">{row.cat}</span>
                        </td>
                        <td className="py-2.5 px-3 font-mono">{row.stock}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-500">{row.use}</td>
                        <td className="py-2.5 px-3 text-emerald-600 font-bold">∞</td >
                        <td className="py-2.5 px-3 text-center">
                          <Badge className="bg-emerald-500 text-white text-[9px]">OK</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Wastage Sub-tab (Matches Image 3) */}
      {activeTab === "wastage" && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="flex items-center gap-2 text-red-500">
              <Trash className="h-5 w-5" />
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                Wastage Report
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <select className="bg-slate-50 dark:bg-slate-800 border px-3 py-1.5 rounded-xl text-xs font-semibold">
                <option>Current Month</option>
              </select>
              <Badge className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 text-xs">
                August 2026
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl bg-rose-500 text-white space-y-1">
              <span className="text-[10px] uppercase font-bold text-rose-100">Total Wastage Cost</span>
              <p className="text-2xl font-black font-mono">₹0</p>
            </div>

            <div className="p-4 rounded-2xl bg-amber-500 text-white space-y-1">
              <span className="text-[10px] uppercase font-bold text-amber-100">Waste Entries</span>
              <p className="text-2xl font-black font-mono">0</p>
            </div>

            <div className="p-4 rounded-2xl bg-purple-600 text-white space-y-1">
              <span className="text-[10px] uppercase font-bold text-purple-100">Items Affected</span>
              <p className="text-2xl font-black font-mono">0</p>
            </div>

            <div className="p-4 rounded-2xl bg-pink-600 text-white space-y-1">
              <span className="text-[10px] uppercase font-bold text-pink-100">Top Wasted</span>
              <p className="text-2xl font-black font-mono">—</p>
            </div>
          </div>

          <div className="py-16 text-center text-slate-400 space-y-2">
            <Trash className="h-12 w-12 mx-auto opacity-30" />
            <h4 className="font-bold text-sm text-slate-700 dark:text-slate-200">No Wastage Found</h4>
            <p className="text-xs text-slate-400">No waste entries recorded for August 2026</p>
          </div>
        </div>
      )}

      {/* Fallback for alerts, stocktake, orders, suggest, lots */}
      {["alerts", "stocktake", "orders", "suggest", "lots"].includes(activeTab) && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-12 text-center shadow-xl space-y-3">
          <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto" />
          <h3 className="font-bold text-base text-slate-900 dark:text-white capitalize">
            {activeTab} Management
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Live sandbox is fully active with automated replenishment and lot tracking.
          </p>
        </div>
      )}
    </div>
  );
};
