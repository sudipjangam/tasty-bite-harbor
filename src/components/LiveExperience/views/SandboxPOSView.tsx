import React, { useState } from "react";
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Receipt,
  Check,
  Percent,
  Sparkles,
  Zap,
  Tag,
  Clock,
  Printer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSandbox, DemoMenuItem, OrderItem } from "../context/SandboxContext";
import { formatCurrency } from "@/utils/formatters";

export const SandboxPOSView: React.FC = () => {
  const { menuItems, punchPOSOrder, tables } = useSandbox();
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedTable, setSelectedTable] = useState<string>("Table 6");
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [discountPercent, setDiscountPercent] = useState<number>(0);

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

  const addToCart = (item: DemoMenuItem) => {
    if (!item.isAvailable) return;
    setCart((prev) => {
      const existing = prev.find((i) => i.name === item.name);
      if (existing) {
        return prev.map((i) =>
          i.name === item.name ? { ...i, qty: i.qty + 1 } : i
        );
      }
      return [
        ...prev,
        {
          name: item.name,
          qty: 1,
          price: item.price,
          station: item.station,
          isVeg: item.isVeg,
        },
      ];
    });
  };

  const updateQty = (itemName: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) => {
          if (i.name === itemName) {
            const newQty = i.qty + delta;
            return newQty > 0 ? { ...i, qty: newQty } : null;
          }
          return i;
        })
        .filter(Boolean) as OrderItem[]
    );
  };

  const clearCart = () => setCart([]);

  const subtotal = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
  const discountAmount = Math.round((subtotal * discountPercent) / 100);
  const gstAmount = Math.round((subtotal - discountAmount) * 0.05);
  const grandTotal = subtotal - discountAmount + gstAmount;

  const handlePunchKOT = () => {
    if (cart.length === 0) return;
    punchPOSOrder(selectedTable, cart, "Dine-in");
    setCart([]);
    setDiscountPercent(0);
  };

  return (
    <div className="p-4 sm:p-8 space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Zap className="h-6 w-6 text-amber-500" />
            Fast QSR & Dine-In POS Terminal
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            1-Click Billing, KOT routing & instant multi-station kitchen dispatch
          </p>
        </div>

        {/* Table Selector Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
          {["Table 1", "Table 2", "Table 4", "Table 6", "Takeaway Counter", "Room 204"].map((t) => (
            <button
              key={t}
              onClick={() => setSelectedTable(t)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                selectedTable === t
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Menu Catalog (8 Cols) */}
        <div className="lg:col-span-8 space-y-4">
          {/* Filters & Search */}
          <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-white/60 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
            <div className="relative">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search food items, starters, drinks, desserts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                    selectedCategory === cat
                      ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Items Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3.5">
            {filteredItems.map((item) => {
              const inCart = cart.find((i) => i.name === item.name);
              return (
                <div
                  key={item.id}
                  onClick={() => addToCart(item)}
                  className={`relative group p-4 rounded-2xl border transition-all cursor-pointer select-none ${
                    !item.isAvailable
                      ? "bg-slate-100/80 dark:bg-slate-800/40 border-dashed border-red-300 dark:border-red-900/60 opacity-60 cursor-not-allowed"
                      : "bg-white dark:bg-slate-900 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20 border-slate-200/80 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 shadow-sm hover:shadow-md"
                  }`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${
                          item.isVeg ? "bg-green-500" : "bg-red-500"
                        }`}
                        title={item.isVeg ? "Veg" : "Non-Veg"}
                      />
                      <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-mono">
                        {item.station}
                      </Badge>
                    </div>

                    {!item.isAvailable && (
                      <Badge className="bg-red-500 text-white text-[10px] font-bold">
                        86 OUT OF STOCK
                      </Badge>
                    )}
                  </div>

                  <h3 className="font-bold text-sm text-slate-900 dark:text-white mt-2 leading-tight">
                    {item.name}
                  </h3>

                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/60">
                    <span className="font-extrabold text-sm text-indigo-600 dark:text-indigo-400 font-mono">
                      {formatCurrency(item.price)}
                    </span>

                    {inCart ? (
                      <Badge className="bg-indigo-600 text-white text-xs font-bold px-2 py-0.5">
                        {inCart.qty} in cart
                      </Badge>
                    ) : item.isAvailable ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 rounded-lg text-indigo-600 hover:bg-indigo-100 dark:hover:bg-indigo-900/50"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Cart & Billing Summary (4 Cols) */}
        <div className="lg:col-span-4">
          <div className="sticky top-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-white/60 dark:border-slate-800 rounded-3xl shadow-xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4 text-indigo-600" />
                  Order Summary
                </h3>
                <span className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold">
                  Destination: {selectedTable}
                </span>
              </div>
              {cart.length > 0 && (
                <button
                  onClick={clearCart}
                  className="text-xs text-slate-400 hover:text-red-500 flex items-center gap-1 transition-colors"
                >
                  <Trash2 className="h-3 w-3" /> Clear
                </button>
              )}
            </div>

            {/* Cart Items List */}
            <div className="max-h-64 overflow-y-auto space-y-2.5 pr-1">
              {cart.length === 0 ? (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <ShoppingCart className="h-8 w-8 mx-auto opacity-30" />
                  <p className="text-xs font-medium">Cart is empty. Click items to punch order.</p>
                </div>
              ) : (
                cart.map((item) => (
                  <div
                    key={item.name}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/50 text-xs"
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {item.name}
                      </p>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {formatCurrency(item.price)} × {item.qty} = {formatCurrency(item.price * item.qty)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-0.5">
                      <button
                        onClick={() => updateQty(item.name, -1)}
                        className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-600 dark:text-slate-300"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="font-bold w-4 text-center">{item.qty}</span>
                      <button
                        onClick={() => updateQty(item.name, 1)}
                        className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-600 dark:text-slate-300"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Discounts */}
            {cart.length > 0 && (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Apply Discount
                </span>
                <div className="flex gap-1.5">
                  {[0, 10, 15, 20].map((d) => (
                    <button
                      key={d}
                      onClick={() => setDiscountPercent(d)}
                      className={`flex-1 py-1 rounded-lg text-xs font-semibold transition-all ${
                        discountPercent === d
                          ? "bg-purple-600 text-white font-bold"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                      }`}
                    >
                      {d === 0 ? "0%" : `${d}%`}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Totals Breakdown */}
            {cart.length > 0 && (
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal</span>
                  <span className="font-mono">{formatCurrency(subtotal)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-purple-600 font-medium">
                    <span>Discount ({discountPercent}%)</span>
                    <span className="font-mono">-{formatCurrency(discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-500">
                  <span>GST (5%)</span>
                  <span className="font-mono">{formatCurrency(gstAmount)}</span>
                </div>
                <div className="flex justify-between text-sm font-extrabold text-slate-900 dark:text-white pt-2 border-t border-slate-200 dark:border-slate-700">
                  <span>Grand Total</span>
                  <span className="font-mono text-indigo-600 dark:text-indigo-400">
                    {formatCurrency(grandTotal)}
                  </span>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-2 space-y-2">
              <Button
                disabled={cart.length === 0}
                onClick={handlePunchKOT}
                className="w-full h-11 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-600/30 transition-all"
              >
                <Receipt className="h-4 w-4 mr-2" />
                Punch KOT & Send to Kitchen
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
