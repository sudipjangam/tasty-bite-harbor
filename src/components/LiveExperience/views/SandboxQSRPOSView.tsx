import React, { useState } from "react";
import {
  UtensilsCrossed,
  Package,
  Bike,
  Ban,
  Printer,
  HelpCircle,
  RotateCcw,
  ShoppingBag,
  History,
  TrendingUp,
  Search,
  Plus,
  Minus,
  Trash2,
  Receipt,
  Check,
  Zap,
  Users,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSandbox, DemoMenuItem, OrderItem } from "../context/SandboxContext";
import { formatCurrency } from "@/utils/formatters";

interface QSRTableItem {
  id: string;
  name: string;
  capacity: number;
  status: "available" | "occupied";
  pendingCount?: number;
  amount?: number;
  lateText?: string;
  occupiedSince?: string;
}

export const SandboxQSRPOSView: React.FC = () => {
  const { menuItems, punchPOSOrder, orders, advanceOrderStatus } = useSandbox();

  const [orderMode, setOrderMode] = useState<"dine_in" | "takeaway" | "delivery" | "nc">("dine_in");
  const [selectedTable, setSelectedTable] = useState<QSRTableItem | null>(null);
  const [phone, setPhone] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  const tables: QSRTableItem[] = [
    { id: "stone1", name: "Stone1", capacity: 6, status: "available" },
    {
      id: "stone2",
      name: "Stone 2",
      capacity: 4,
      status: "occupied",
      pendingCount: 3,
      amount: 327,
      lateText: "0h 58m LATE",
    },
    { id: "t2", name: "T2", capacity: 4, status: "available" },
    { id: "t3", name: "T3", capacity: 6, status: "available" },
    { id: "table1", name: "Table1", capacity: 4, status: "available" },
  ];

  const categories = [
    "All",
    "Biryani",
    "Curries",
    "Tandoori & Starters",
    "Breads",
    "Beverages",
    "Desserts",
  ];

  const filteredMenu = menuItems.filter((i) =>
    selectedCategory === "All" ? true : i.category === selectedCategory
  );

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

  const handleSendToKitchen = () => {
    if (cart.length === 0) return;
    const dest = selectedTable ? selectedTable.name : "Dine-In Order";
    punchPOSOrder(dest, cart, "Dine-in");
    setCart([]);
  };

  const handleTableClick = (table: QSRTableItem) => {
    setSelectedTable(table);
    if (table.status === "occupied" && cart.length === 0) {
      // Pre-fill mock running items
      setCart([
        { name: "Special Hyderabadi Dum Biryani", qty: 1, price: 340, station: "Curry", isVeg: false },
        { name: "Butter Garlic Naan", qty: 2, price: 65, station: "Tandoor", isVeg: true },
      ]);
    }
  };

  const busyCount = tables.filter((t) => t.status === "occupied").length;
  const freeCount = tables.filter((t) => t.status === "available").length;

  return (
    <div className="min-h-screen bg-slate-50/60 dark:bg-slate-950 p-4 sm:p-6 space-y-4 pb-20">
      {/* Top Header (Matches Image 3) */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-indigo-600" />
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase block leading-none">
                KIWI
              </span>
              <h2 className="text-base font-extrabold text-indigo-600 dark:text-indigo-400">
                QSR POS
              </h2>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs rounded-xl gap-1 text-slate-600">
            <Printer className="h-3.5 w-3.5" />
            <span>Printer (80mm)</span>
          </Button>

          <Button variant="outline" size="sm" className="h-8 text-xs rounded-xl gap-1 text-purple-600 bg-purple-50 dark:bg-purple-950/40 border-purple-200">
            <HelpCircle className="h-3.5 w-3.5" />
            <span>Help & Guide</span>
          </Button>

          <Button variant="outline" size="sm" className="h-8 text-xs rounded-xl gap-1 text-slate-600">
            <ShoppingBag className="h-3.5 w-3.5" />
            <span>Active Orders</span>
          </Button>

          <Button variant="outline" size="sm" className="h-8 text-xs rounded-xl gap-1 text-slate-600">
            <History className="h-3.5 w-3.5" />
            <span>Past Orders</span>
          </Button>

          <div className="flex items-center gap-2 bg-emerald-500 text-white px-3 py-1 rounded-xl text-xs font-bold shadow-md shadow-emerald-500/20">
            <TrendingUp className="h-3.5 w-3.5" />
            <div>
              <span className="text-[9px] uppercase block opacity-80">TODAY'S REVENUE</span>
              <span className="text-sm font-mono leading-none">₹0</span>
            </div>
          </div>
        </div>
      </div>

      {/* Mode Selector Top Bar (Matches Image 3) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <button
          onClick={() => setOrderMode("dine_in")}
          className={`py-3 px-4 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
            orderMode === "dine_in"
              ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
              : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100"
          }`}
        >
          <UtensilsCrossed className="h-4 w-4" />
          <span>Dine In</span>
        </button>

        <button
          onClick={() => setOrderMode("takeaway")}
          className={`py-3 px-4 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
            orderMode === "takeaway"
              ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
              : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100"
          }`}
        >
          <Package className="h-4 w-4" />
          <span>Takeaway</span>
        </button>

        <button
          onClick={() => setOrderMode("delivery")}
          className={`py-3 px-4 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
            orderMode === "delivery"
              ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
              : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100"
          }`}
        >
          <Bike className="h-4 w-4" />
          <span>Delivery</span>
        </button>

        <button
          onClick={() => setOrderMode("nc")}
          className={`py-3 px-4 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
            orderMode === "nc"
              ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
              : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100"
          }`}
        >
          <Ban className="h-4 w-4" />
          <span>Non-Chargeable</span>
        </button>
      </div>

      {/* Main Grid: Left Cart Column + Right Table/Menu Grid (Matches Image 3) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Order Pad & Actions (5 Cols) */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 shadow-sm flex flex-col justify-between">
          <div className="space-y-3">
            {/* Mode Banner */}
            <div className="flex items-center gap-2 bg-purple-600 text-white px-3 py-2 rounded-xl text-xs font-bold shadow-sm">
              <UtensilsCrossed className="h-4 w-4" />
              <span>MODE {orderMode === "dine_in" ? "Dine In" : orderMode}</span>
              {selectedTable && (
                <span className="ml-auto bg-white/20 px-2 py-0.5 rounded text-[11px]">
                  {selectedTable.name}
                </span>
              )}
            </div>

            {/* Inputs */}
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Phone (Optional)"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400"
              />
              <input
                type="text"
                placeholder="Customer Name (Option..."
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400"
              />
            </div>

            {/* Cart Content */}
            <div className="min-h-[160px] max-h-[220px] overflow-y-auto space-y-2 pt-2">
              {cart.length === 0 ? (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <div className="w-10 h-10 mx-auto rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                    📦
                  </div>
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Order is empty
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Select a table and add items from the menu
                  </p>
                </div>
              ) : (
                cart.map((item) => (
                  <div
                    key={item.name}
                    className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 text-xs"
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">
                        {item.name}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {formatCurrency(item.price)} × {item.qty}
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

          {/* Cart Bottom Summary & Buttons */}
          <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>Subtotal:</span>
                <span className="font-mono">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-base font-extrabold text-slate-900 dark:text-white">
                <span>Total:</span>
                <span className="font-mono">{formatCurrency(total)}</span>
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full text-xs font-semibold rounded-xl h-8 border-dashed text-slate-600"
            >
              + Add Custom Item
            </Button>

            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={handleSendToKitchen}
                disabled={cart.length === 0}
                className="bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl h-9 shadow-md shadow-amber-500/20"
              >
                Send to Kitchen
              </Button>

              <Button
                variant="outline"
                className="text-xs font-semibold rounded-xl h-9 border-slate-300 dark:border-slate-700"
              >
                Hold Order
              </Button>
            </div>

            <Button
              disabled={cart.length === 0}
              onClick={handleSendToKitchen}
              className="w-full bg-gradient-to-r from-emerald-400 to-teal-500 hover:from-emerald-500 hover:to-teal-600 text-slate-950 font-extrabold text-xs rounded-xl h-10 shadow-md shadow-emerald-500/20"
            >
              💳 Proceed to Payment
            </Button>

            {cart.length > 0 && (
              <button
                onClick={() => setCart([])}
                className="w-full text-center text-[11px] text-slate-400 hover:text-red-500 font-medium"
              >
                Clear Order
              </button>
            )}
          </div>
        </div>

        {/* Right Column: Tables Grid + Menu Picker (8 Cols) */}
        <div className="lg:col-span-8 space-y-4">
          {/* Table Selector Header (Matches Image 3) */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                Select Table
              </h3>

              <div className="flex items-center gap-2 text-xs font-semibold">
                <span className="flex items-center gap-1 text-slate-500">
                  <span className="w-2 h-2 rounded-full bg-slate-400" /> {tables.length} total
                </span>
                <span className="flex items-center gap-1 text-amber-600">
                  <span className="w-2 h-2 rounded-full bg-amber-500" /> {busyCount} busy
                </span>
                <span className="flex items-center gap-1 text-emerald-600">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" /> {freeCount} free
                </span>
              </div>
            </div>

            {/* Table Cards Grid (Matches Image 3) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
              {tables.map((tbl) => {
                const isOccupied = tbl.status === "occupied";
                const isCurrentSelected = selectedTable?.id === tbl.id;

                return (
                  <div
                    key={tbl.id}
                    onClick={() => handleTableClick(tbl)}
                    className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer select-none text-center relative ${
                      isCurrentSelected
                        ? "ring-2 ring-purple-600 shadow-lg"
                        : ""
                    } ${
                      isOccupied
                        ? "bg-red-50 dark:bg-red-950/20 border-red-300 dark:border-red-800 text-red-950"
                        : "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800 text-emerald-950"
                    }`}
                  >
                    {isOccupied && tbl.pendingCount && (
                      <Badge className="absolute -top-2 left-2 bg-red-600 text-white text-[9px] px-1.5 py-0 font-bold">
                        {tbl.pendingCount} Pending
                      </Badge>
                    )}

                    {isOccupied && tbl.amount && (
                      <Badge className="absolute -top-2 right-2 bg-red-600 text-white text-[9px] px-1.5 py-0 font-bold">
                        ₹{tbl.amount}
                      </Badge>
                    )}

                    <h4 className="font-extrabold text-sm text-slate-900 dark:text-white mt-1">
                      {tbl.name}
                    </h4>
                    <span className="text-[10px] text-slate-500 block">
                      👥 {tbl.capacity}
                    </span>

                    <span
                      className={`text-[9px] font-bold uppercase tracking-wider block mt-2 ${
                        isOccupied ? "text-red-600" : "text-emerald-700"
                      }`}
                    >
                      {tbl.status.toUpperCase()}
                    </span>

                    {isOccupied && (
                      <div className="mt-1 text-[9px] text-red-500 font-medium leading-tight">
                        <span>⏱ {tbl.lateText}</span>
                        <span className="block text-[8px] text-slate-400">3 pending to serve</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Menu Grid to Add Items */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">
                Menu Items for {selectedTable ? selectedTable.name : "Dine-In"}
              </h4>

              <div className="flex items-center gap-1 overflow-x-auto max-w-sm pb-1">
                {categories.map((c) => (
                  <button
                    key={c}
                    onClick={() => setSelectedCategory(c)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap ${
                      selectedCategory === c
                        ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {filteredMenu.map((item) => (
                <div
                  key={item.id}
                  onClick={() => addToCart(item)}
                  className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500 cursor-pointer transition-all bg-slate-50/50 dark:bg-slate-800/40 hover:bg-indigo-50/20"
                >
                  <div className="flex justify-between items-start">
                    <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
                    <span className="font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400">
                      {formatCurrency(item.price)}
                    </span>
                  </div>
                  <p className="font-bold text-xs text-slate-800 dark:text-slate-100 mt-1.5 truncate">
                    {item.name}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
