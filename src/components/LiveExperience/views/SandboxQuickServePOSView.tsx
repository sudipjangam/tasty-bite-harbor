import React, { useState } from "react";
import {
  Search,
  Plus,
  Minus,
  Trash2,
  Receipt,
  HelpCircle,
  Clock,
  Sparkles,
  ShoppingBag,
  History,
  CheckCircle2,
  Flame,
  Store,
  CreditCard,
  QrCode,
  DollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSandbox, OrderItem } from "../context/SandboxContext";
import { formatCurrency } from "@/utils/formatters";

interface QuickServeItem {
  id: string;
  name: string;
  category: string;
  price: number;
  isVeg: boolean;
}

const QUICKSERVE_CATALOG: QuickServeItem[] = [
  { id: "qs-1", name: "Paneer Tikka", category: "Appetizers", price: 199, isVeg: true },
  { id: "qs-2", name: "Samosa", category: "Appetizers", price: 49, isVeg: true },
  { id: "qs-3", name: "Lassi", category: "Beverages", price: 79, isVeg: true },
  { id: "qs-4", name: "Veg Schezwan Fried Rice", category: "Chinese Rice", price: 130, isVeg: true },
  { id: "qs-5", name: "Veg Manchurian Fried Rice (Gravy)", category: "Chinese Rice", price: 150, isVeg: true },
  { id: "qs-6", name: "Veg Dragon Fried Rice (Gravy)", category: "Chinese Rice", price: 150, isVeg: true },
  { id: "qs-7", name: "Veg Singapuri Fried Rice", category: "Chinese Rice", price: 150, isVeg: true },
  { id: "qs-8", name: "Hong Kong Fried Rice", category: "Chinese Rice", price: 140, isVeg: true },
  { id: "qs-9", name: "Mushroom Chilli Fried Rice (Gravy)", category: "Chinese Rice", price: 160, isVeg: true },
  { id: "qs-10", name: "Veg Combination Fried Rice", category: "Chinese Rice", price: 140, isVeg: true },
  { id: "qs-11", name: "Paneer Schezwan Fried Rice", category: "Chinese Rice", price: 150, isVeg: true },
  { id: "qs-12", name: "Veg Triple Fried Rice (Gravy)", category: "Chinese Rice", price: 150, isVeg: true },
  { id: "qs-13", name: "Veg Fried Rice", category: "Chinese Rice", price: 120, isVeg: true },
  { id: "qs-14", name: "Falooda", category: "Desserts", price: 129, isVeg: true },
  { id: "qs-15", name: "Gulab Jamun", category: "Desserts", price: 99, isVeg: true },
  { id: "qs-16", name: "Chocolate Brownie", category: "Desserts", price: 149, isVeg: true },
  { id: "qs-17", name: "Gajar Halwa", category: "Desserts", price: 119, isVeg: true },
  { id: "qs-18", name: "Shevai", category: "Desserts", price: 51, isVeg: true },
  { id: "qs-19", name: "Jain Margherita Pizza", category: "Jain Pizza", price: 120, isVeg: true },
  { id: "qs-20", name: "Jain Veg Mexican Pizza", category: "Jain Pizza", price: 160, isVeg: true },
  { id: "qs-21", name: "Jain Paneer Mexican Pizza", category: "Jain Pizza", price: 170, isVeg: true },
  { id: "qs-22", name: "Jain Cheese Corn Pizza", category: "Jain Pizza", price: 140, isVeg: true },
  { id: "qs-23", name: "Jain Veg Cheese Grilled Sandwich", category: "Jain Sandwiches", price: 110, isVeg: true },
  { id: "qs-24", name: "Jain Veg Grilled Sandwich", category: "Jain Sandwiches", price: 90, isVeg: true },
];

export const SandboxQuickServePOSView: React.FC = () => {
  const { punchPOSOrder } = useSandbox();
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [customerName, setCustomerName] = useState<string>("");
  const [customerPhone, setCustomerPhone] = useState<string>("");
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [tokenCounter, setTokenCounter] = useState<number>(101);

  const categories = [
    { label: "All", emoji: "🔴" },
    { label: "Appetizers", emoji: "🥟" },
    { label: "Beverages", emoji: "🥤" },
    { label: "Chinese Bhel", emoji: "🥡" },
    { label: "Chinese Rice", emoji: "🍚" },
    { label: "Desserts", emoji: "🍰" },
    { label: "Jain Pizza", emoji: "🍕" },
    { label: "Jain Sandwiches", emoji: "🥪" },
    { label: "Maggies", emoji: "🍜" },
    { label: "Main Course", emoji: "🍛" },
  ];

  const filteredItems = QUICKSERVE_CATALOG.filter((item) => {
    const matchesCategory =
      selectedCategory === "All" || item.category === selectedCategory;
    const matchesSearch = item.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const addToCart = (item: QuickServeItem) => {
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
          station: "Curry",
          isVeg: item.isVeg,
        },
      ];
    });
  };

  const updateQty = (name: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) => {
          if (i.name === name) {
            const next = i.qty + delta;
            return next > 0 ? { ...i, qty: next } : null;
          }
          return i;
        })
        .filter(Boolean) as OrderItem[]
    );
  };

  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const total = subtotal;

  const handleChargeToken = (method: string) => {
    if (cart.length === 0) return;
    const tokenRef = `Takeaway Token #${tokenCounter}`;
    setTokenCounter((c) => c + 1);
    punchPOSOrder(tokenRef, cart, "WebStore");
    setCart([]);
    setCustomerName("");
    setCustomerPhone("");
  };

  return (
    <div className="min-h-screen bg-slate-100/60 dark:bg-slate-950 pb-20 flex flex-col">
      {/* Warm Orange Gradient Header (Matches Image 4) */}
      <div className="bg-gradient-to-r from-orange-500 via-amber-500 to-rose-500 text-white p-4 sm:p-5 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-3 max-w-[1700px] mx-auto">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/20 backdrop-blur-md rounded-2xl">
              <Store className="h-6 w-6" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-orange-100 block">
                KIWI
              </span>
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">
                QuickServe
              </h1>
              <span className="text-[10px] uppercase font-extrabold tracking-widest text-amber-200">
                COUNTER & TAKEAWAY
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 rounded-xl text-xs font-semibold h-8"
            >
              <HelpCircle className="h-3.5 w-3.5 mr-1" />
              Help & Guide
            </Button>

            <div className="flex items-center gap-1 bg-black/20 p-1 rounded-xl">
              <button className="px-3 py-1 rounded-lg text-xs font-bold bg-white text-orange-600 shadow-sm">
                Active
              </button>
              <button className="px-3 py-1 rounded-lg text-xs font-semibold text-white/80 hover:text-white">
                History
              </button>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 rounded-xl text-xs font-semibold h-8"
            >
              End Day
            </Button>

            <div className="flex items-center gap-2 bg-black/30 px-3 py-1 rounded-xl text-xs font-mono">
              <span className="text-orange-200 font-bold">+ 0</span>
              <span className="text-white font-extrabold">₹0</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main POS Workspace */}
      <div className="flex-1 p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5 max-w-[1700px] mx-auto w-full">
        {/* Left/Center: Menu Grid & Quick Tabs (8 Cols) */}
        <div className="lg:col-span-8 space-y-4">
          {/* Search & Categories (Matches Image 4) */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search menu..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
                />
              </div>

              <Button
                variant="outline"
                size="sm"
                className="rounded-2xl text-xs font-semibold text-slate-600 dark:text-slate-300 border-slate-200 h-10 px-3"
              >
                Sold Out (4)
              </Button>
            </div>

            {/* Category Pills (Matches Image 4) */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {categories.map((c) => (
                <button
                  key={c.label}
                  onClick={() => setSelectedCategory(c.label)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-1.5 transition-all ${
                    selectedCategory === c.label
                      ? "bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow-md shadow-pink-500/20"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                  }`}
                >
                  <span>{c.emoji}</span>
                  <span>{c.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Item Cards Grid (Matches Image 4) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
            {filteredItems.map((item) => {
              const inCart = cart.find((i) => i.name === item.name);
              return (
                <div
                  key={item.id}
                  onClick={() => addToCart(item)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer select-none flex flex-col justify-between min-h-[96px] relative shadow-sm hover:shadow-md ${
                    inCart
                      ? "bg-orange-50/50 dark:bg-orange-950/20 border-orange-400 dark:border-orange-600 ring-1 ring-orange-500"
                      : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-orange-300"
                  }`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <h3 className="font-bold text-xs text-slate-900 dark:text-white leading-tight">
                      {item.name}
                    </h3>
                    <span className="w-3 h-3 rounded-sm border-2 border-emerald-600 flex items-center justify-center p-0.5 shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                    </span>
                  </div>

                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span className="font-black text-sm text-orange-600 font-mono">
                      {formatCurrency(item.price)}
                    </span>
                    {inCart && (
                      <Badge className="bg-orange-500 text-white text-[10px] px-1.5 py-0 font-bold">
                        {inCart.qty}
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Takeaway Cart & Token Drawer (4 Cols - Matches Image 4) */}
        <div className="lg:col-span-4">
          <div className="sticky top-20 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 shadow-xl flex flex-col justify-between min-h-[520px]">
            <div className="space-y-3">
              <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block">
                CUSTOMER (OPTIONAL)
              </span>

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder-slate-400"
                />
                <input
                  type="text"
                  placeholder="Phone"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder-slate-400"
                />
              </div>

              {/* Cart Items List */}
              <div className="min-h-[160px] max-h-[240px] overflow-y-auto space-y-2 pt-2">
                {cart.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 space-y-2">
                    <div className="w-12 h-12 mx-auto rounded-3xl bg-orange-50 dark:bg-orange-950/40 text-orange-500 flex items-center justify-center text-xl">
                      🛍️
                    </div>
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                      No items yet
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Tap items on menu to add to order
                    </p>
                  </div>
                ) : (
                  cart.map((item) => (
                    <div
                      key={item.name}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs"
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <span className="font-bold text-slate-800 dark:text-slate-100 truncate block">
                          {item.name}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {formatCurrency(item.price)} × {item.qty} = {formatCurrency(item.price * item.qty)}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border rounded-lg p-0.5">
                        <button
                          onClick={() => updateQty(item.name, -1)}
                          className="p-1 hover:bg-slate-100 rounded text-slate-600"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="font-bold w-4 text-center">{item.qty}</span>
                        <button
                          onClick={() => updateQty(item.name, 1)}
                          className="p-1 hover:bg-slate-100 rounded text-slate-600"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Bottom Settle & Payment */}
            <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button
                variant="outline"
                className="w-full text-xs font-semibold rounded-xl h-8 border-dashed text-slate-600"
              >
                + Add Custom Item
              </Button>

              <div className="flex justify-between items-baseline pt-1">
                <span className="text-xs text-slate-500 font-medium">Grand Total</span>
                <span className="text-2xl font-black text-orange-600 font-mono">
                  {formatCurrency(total)}
                </span>
              </div>

              {/* 1-Click Fast Settle Buttons */}
              <div className="grid grid-cols-3 gap-2">
                <Button
                  disabled={cart.length === 0}
                  onClick={() => handleChargeToken("Cash")}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl h-10 shadow-sm"
                >
                  <DollarSign className="h-3.5 w-3.5 mr-1" />
                  Cash
                </Button>

                <Button
                  disabled={cart.length === 0}
                  onClick={() => handleChargeToken("UPI")}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl h-10 shadow-sm"
                >
                  <QrCode className="h-3.5 w-3.5 mr-1" />
                  UPI / QR
                </Button>

                <Button
                  disabled={cart.length === 0}
                  onClick={() => handleChargeToken("Card")}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl h-10 shadow-sm"
                >
                  <CreditCard className="h-3.5 w-3.5 mr-1" />
                  Card
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
