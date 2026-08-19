import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  LayoutDashboard,
  UtensilsCrossed,
  BookOpen,
  Boxes,
  BarChart3,
  Users,
  Settings,
  Sparkles,
  ArrowLeft,
  Bell,
  Clock,
  CheckCircle2,
  TrendingUp,
  AlertTriangle,
  Plus,
  Search,
  Check,
  ShieldCheck,
  Building2,
  Smartphone,
  ChevronRight,
  Flame,
  Volume2,
  VolumeX,
  RefreshCw,
  Edit2,
  X,
  Percent,
  Layers,
  Store,
  DollarSign,
  Printer
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// --- AUDIO CHIME HELPER ---
const playTone = (freq = 880, duration = 0.15) => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch {
    // Ignore audio restrictions
  }
};

// --- INITIAL MOCK DATA ---
interface OrderItem {
  name: string;
  qty: number;
  price: number;
  station: "Grill" | "Tandoor" | "Curry" | "Pantry" | "Bar";
}

interface DemoOrder {
  id: string;
  channel: "Swiggy" | "Zomato" | "Dine-in" | "WebStore" | "Room Service";
  tableOrRef: string;
  time: string;
  items: OrderItem[];
  total: number;
  status: "NEW" | "COOKING" | "READY" | "SERVED";
  elapsedSec: number;
}

const INITIAL_ORDERS: DemoOrder[] = [
  {
    id: "#4081",
    channel: "Swiggy",
    tableOrRef: "Rider: Suresh (OTP 88)",
    time: "2m ago",
    items: [
      { name: "Chicken Dum Biryani", qty: 2, price: 340, station: "Curry" },
      { name: "Mirchi Ka Salan", qty: 2, price: 60, station: "Curry" },
      { name: "Gulab Jamun (2 pcs)", qty: 1, price: 90, station: "Pantry" },
    ],
    total: 890,
    status: "NEW",
    elapsedSec: 120,
  },
  {
    id: "#4080",
    channel: "Dine-in",
    tableOrRef: "Table 6 (AC Section)",
    time: "5m ago",
    items: [
      { name: "Mutton Rogan Josh", qty: 1, price: 460, station: "Curry" },
      { name: "Butter Garlic Naan", qty: 3, price: 60, station: "Tandoor" },
      { name: "Virgin Mojito", qty: 2, price: 140, station: "Bar" },
    ],
    total: 920,
    status: "COOKING",
    elapsedSec: 310,
  },
  {
    id: "#4079",
    channel: "Zomato",
    tableOrRef: "Zomato Pro #Z-991",
    time: "8m ago",
    items: [
      { name: "Paneer Butter Masala", qty: 1, price: 290, station: "Curry" },
      { name: "Tandoori Roti", qty: 4, price: 30, station: "Tandoor" },
      { name: "Jeera Rice", qty: 1, price: 180, station: "Curry" },
    ],
    total: 590,
    status: "READY",
    elapsedSec: 490,
  },
  {
    id: "#4078",
    channel: "WebStore",
    tableOrRef: "Direct: royalhyderabad.in",
    time: "14m ago",
    items: [
      { name: "Hyderabadi Haleem (Spl)", qty: 2, price: 320, station: "Curry" },
      { name: "Double Ka Meetha", qty: 2, price: 110, station: "Pantry" },
    ],
    total: 860,
    status: "SERVED",
    elapsedSec: 840,
  },
];

export default function LiveExperience() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "kds" | "menu" | "inventory" | "analytics" | "staff" | "settings">("dashboard");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [branch, setBranch] = useState("Royal Hyderabad · Main Jubilee Hills");
  const [orders, setOrders] = useState<DemoOrder[]>(INITIAL_ORDERS);
  const [kdsFilter, setKdsFilter] = useState<string>("ALL");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // KOT Print Simulation State
  const [printedKOT, setPrintedKOT] = useState<DemoOrder | null>(null);

  // Trigger Toast
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    if (soundEnabled) playTone(980, 0.12);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Auto-Simulation Clock & Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setOrders((prev) =>
        prev.map((o) => (o.status !== "SERVED" ? { ...o, elapsedSec: o.elapsedSec + 1 } : o))
      );
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto-spawn simulated live orders every 22 seconds
  useEffect(() => {
    const spawner = setInterval(() => {
      const channels: DemoOrder["channel"][] = ["Swiggy", "Zomato", "Dine-in", "WebStore"];
      const randomChannel = channels[Math.floor(Math.random() * channels.length)];
      const randomNum = Math.floor(4082 + Math.random() * 50);
      const newOrder: DemoOrder = {
        id: `#${randomNum}`,
        channel: randomChannel,
        tableOrRef: randomChannel === "Dine-in" ? `Table ${Math.floor(Math.random() * 12 + 1)}` : `Direct Order #${randomNum}`,
        time: "Just now",
        items: [
          { name: "Special Hyderabadi Dum Biryani", qty: 1, price: 350, station: "Curry" },
          { name: "Paneer Tikka 65", qty: 1, price: 260, station: "Grill" },
        ],
        total: 610,
        status: "NEW",
        elapsedSec: 1,
      };
      setOrders((prev) => [newOrder, ...prev.slice(0, 7)]);
      triggerToast(`🔔 New ${randomChannel} Order ${newOrder.id} Received!`);
    }, 22000);
    return () => clearInterval(spawner);
  }, [soundEnabled]);

  // Handle Order Status Transition
  const advanceOrderStatus = (orderId: string) => {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id === orderId) {
          if (o.status === "NEW") {
            triggerToast(`👨‍🍳 Order ${o.id} moved to Kitchen Cooking`);
            return { ...o, status: "COOKING" };
          }
          if (o.status === "COOKING") {
            triggerToast(`✅ Order ${o.id} is READY for Dispatch!`);
            return { ...o, status: "READY" };
          }
          if (o.status === "READY") {
            triggerToast(`🛵 Order ${o.id} marked as SERVED & Settled`);
            return { ...o, status: "SERVED" };
          }
        }
        return o;
      })
    );
  };

  // Recipe Costing State for Menu Tab
  const [recipes, setRecipes] = useState([
    {
      id: "biryani",
      name: "Chicken Dum Biryani (Large)",
      category: "Biryani",
      sellingPrice: 380,
      ingredients: [
        { name: "Basmati Biryani Rice (g)", qty: 250, unitCost: 0.09, total: 22.5 },
        { name: "Fresh Chicken (g)", qty: 300, unitCost: 0.22, total: 66.0 },
        { name: "Desi Ghee & Spices (ml/g)", qty: 40, unitCost: 0.45, total: 18.0 },
        { name: "Curd, Onion & Mint (g)", qty: 120, unitCost: 0.08, total: 9.6 },
        { name: "Premium Packaging Container", qty: 1, unitCost: 12.0, total: 12.0 },
      ],
    },
    {
      id: "paneer-tikka",
      name: "Paneer Tikka Masala",
      category: "Curries",
      sellingPrice: 320,
      ingredients: [
        { name: "Malai Paneer Cubes (g)", qty: 200, unitCost: 0.35, total: 70.0 },
        { name: "Makhani Gravy Base (ml)", qty: 250, unitCost: 0.12, total: 30.0 },
        { name: "Amul Butter & Cream (g)", qty: 30, unitCost: 0.50, total: 15.0 },
        { name: "Eco Delivery Box", qty: 1, unitCost: 10.0, total: 10.0 },
      ],
    },
  ]);

  const [selectedRecipeIndex, setSelectedRecipeIndex] = useState(0);

  const updateIngredientCost = (ingIndex: number, newUnitCost: number) => {
    setRecipes((prev) => {
      const next = [...prev];
      const rec = { ...next[selectedRecipeIndex] };
      const ings = [...rec.ingredients];
      ings[ingIndex] = {
        ...ings[ingIndex],
        unitCost: newUnitCost,
        total: Number((ings[ingIndex].qty * newUnitCost).toFixed(1)),
      };
      rec.ingredients = ings;
      next[selectedRecipeIndex] = rec;
      return next;
    });
    triggerToast("⚡ Live Recipe COGS & Profit Margin Recalculated!");
  };

  const currentRec = recipes[selectedRecipeIndex];
  const cogsTotal = currentRec.ingredients.reduce((acc, i) => acc + i.total, 0);
  const directProfit = currentRec.sellingPrice - cogsTotal;
  const directMargin = Math.round((directProfit / currentRec.sellingPrice) * 100);
  const aggregatorComm = currentRec.sellingPrice * 0.24; // 24% Swiggy/Zomato cut
  const aggProfit = currentRec.sellingPrice - cogsTotal - aggregatorComm;
  const aggMargin = Math.round((aggProfit / currentRec.sellingPrice) * 100);

  // Inventory State
  const [inventory, setInventory] = useState([
    { id: 1, name: "Premium Basmati Rice", stock: "18.5 kg", min: "25 kg", status: "LOW", rate: "2.8 kg/hr", runout: "7:45 PM", out: false },
    { id: 2, name: "Fresh Farm Chicken", stock: "4.2 kg", min: "12 kg", status: "CRITICAL", rate: "3.5 kg/hr", runout: "4:30 PM", out: false },
    { id: 3, name: "Amul Butter (500g)", stock: "14 pkts", min: "10 pkts", status: "OK", rate: "1.2 pkts/hr", runout: "Tomorrow", out: false },
    { id: 4, name: "Fresh Paneer", stock: "8.0 kg", min: "10 kg", status: "LOW", rate: "1.5 kg/hr", runout: "8:30 PM", out: false },
    { id: 5, name: "Cooking Desi Ghee", stock: "12 L", min: "5 L", status: "OK", rate: "0.8 L/hr", runout: "3 days", out: false },
    { id: 6, name: "Biryani Packaging Box", stock: "180 pcs", min: "50 pcs", status: "OK", rate: "22 pcs/hr", runout: "Tomorrow", out: false },
  ]);

  const toggleStockKill = (id: number) => {
    setInventory((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const nextOut = !item.out;
          if (nextOut) {
            triggerToast(`🚫 ${item.name} marked OUT-OF-STOCK! Synced to Swiggy, Zomato & POS in 1.2s`);
          } else {
            triggerToast(`✅ ${item.name} RESTOCKED & enabled across all channels!`);
          }
          return { ...item, out: nextOut };
        }
        return item;
      })
    );
  };

  // Staff Management State
  const [staffList, setStaffList] = useState([
    { id: 1, name: "Vikram Reddy", role: "Store Manager", status: "ONLINE", ordersHandled: 42, avgSpeed: "3.2m", rls: "Full Outlet Admin" },
    { id: 2, name: "K. Ramesh", role: "Head Chef (KDS)", status: "ONLINE", ordersHandled: 28, avgSpeed: "7.4m", rls: "Kitchen KOT Only" },
    { id: 3, name: "Priya Sharma", role: "Front Cashier / POS", status: "ONLINE", ordersHandled: 34, avgSpeed: "1.8m", rls: "POS & Billing Only" },
    { id: 4, name: "Mohammad Ali", role: "Floor Captain", status: "ONLINE", ordersHandled: 19, avgSpeed: "4.1m", rls: "Waiter Captain App" },
    { id: 5, name: "Sunita Das", role: "Housekeeping / Hotel", status: "OFFLINE", ordersHandled: 6, avgSpeed: "12m", rls: "Housekeeping Module" },
  ]);
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [newStaffName, setNewStaffName] = useState("");
  const [newStaffRole, setNewStaffRole] = useState("Front Cashier");

  const handleAddStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffName.trim()) return;
    const newMember = {
      id: staffList.length + 1,
      name: newStaffName,
      role: newStaffRole,
      status: "ONLINE",
      ordersHandled: 0,
      avgSpeed: "--",
      rls: "Assigned Role Only (RLS)",
    };
    setStaffList([...staffList, newMember]);
    setShowAddStaff(false);
    setNewStaffName("");
    triggerToast(`👤 New Staff Member '${newMember.name}' onboarded with secure role permissions!`);
  };

  return (
    <div className="min-h-screen bg-[#0E0E18] text-gray-100 flex flex-col font-sans selection:bg-[#F26722] selection:text-white">
      {/* --- TOPBAR --- */}
      <header className="h-16 border-b border-gray-800 bg-[#141422]/95 backdrop-blur px-4 sm:px-6 flex items-center justify-between z-30 sticky top-0">
        <div className="flex items-center gap-3 sm:gap-6">
          <Link
            to="/"
            className="flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-white px-3 py-1.5 rounded-lg bg-gray-800/60 hover:bg-gray-700 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to Main Website</span>
          </Link>

          <div className="h-5 w-px bg-gray-700 hidden sm:block" />

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#2E3192] to-[#F26722] flex items-center justify-center font-black text-white text-sm shadow-md">
              S
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm sm:text-base tracking-tight text-white">
                  Swadeshi <span className="text-[#F26722]">RMS</span>
                </span>
                <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  LIVE SIMULATOR
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Topbar Right Controls */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Branch Switcher (Demonstrating Franchise Multi-Outlet capability) */}
          <div className="hidden lg:flex items-center gap-2 bg-[#1A1A2E] border border-gray-700 px-3 py-1.5 rounded-xl text-xs">
            <Store className="w-3.5 h-3.5 text-[#F26722]" />
            <select
              value={branch}
              onChange={(e) => {
                setBranch(e.target.value);
                triggerToast(`🏢 Switched outlet context to: ${e.target.value}`);
              }}
              className="bg-transparent text-gray-200 text-xs font-bold outline-none cursor-pointer"
            >
              <option value="Royal Hyderabad · Main Jubilee Hills">Jubilee Hills (Central Kitchen)</option>
              <option value="Royal Hyderabad · Hitech City QSR">Hitech City (Express QSR)</option>
              <option value="Royal Hyderabad · Banjara Hills Dine-in">Banjara Hills (Dine-in + Bar)</option>
              <option value="Royal Grand Residency (Hotel + F&B)">Royal Grand (Hotel Room PMS)</option>
            </select>
          </div>

          {/* Sound Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 rounded-lg bg-[#1A1A2E] border border-gray-700 text-gray-300 hover:text-white transition"
            title={soundEnabled ? "Mute audio chimes" : "Enable audio chimes"}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-gray-500" />}
          </button>

          {/* WhatsApp Direct CTA */}
          <a
            href="https://wa.me/918790425317?text=Hi%2C%20I%20tried%20your%20Live%20Experience%20demo%20and%20want%20to%20set%20up%20Swadeshi%20RMS%20for%20my%20restaurant!"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold text-xs shadow-lg hover:scale-105 transition"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Book 15-min Setup</span>
            <span className="sm:hidden">Demo</span>
          </a>
        </div>
      </header>

      {/* --- MAIN LAYOUT (SIDEBAR + ACTIVE SCREEN) --- */}
      <div className="flex-1 flex overflow-hidden">
        {/* --- VERTICAL SIDEBAR --- */}
        <aside className="w-16 sm:w-60 bg-[#121220] border-r border-gray-800 flex flex-col justify-between py-4 select-none shrink-0">
          <div className="space-y-1 px-2 sm:px-3">
            {[
              { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, badge: null },
              { id: "kds", label: "Live KDS", icon: UtensilsCrossed, badge: orders.filter((o) => o.status === "NEW" || o.status === "COOKING").length },
              { id: "menu", label: "Menu & COGS", icon: BookOpen, badge: "Live" },
              { id: "inventory", label: "86-Stock & Sync", icon: Boxes, badge: inventory.filter((i) => i.status === "CRITICAL" || i.status === "LOW").length },
              { id: "analytics", label: "P&L Analytics", icon: BarChart3, badge: null },
              { id: "staff", label: "Staff & RLS", icon: Users, badge: staffList.length },
              { id: "settings", label: "Integrations", icon: Settings, badge: "4 Active" },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as any);
                    if (soundEnabled) playTone(740, 0.08);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition group ${
                    isActive
                      ? "bg-gradient-to-r from-[#2E3192] to-[#3B3FB5] text-white shadow-lg shadow-[#2E3192]/30"
                      : "text-gray-400 hover:text-gray-200 hover:bg-[#1A1A2E]"
                  }`}
                  title={tab.label}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${isActive ? "text-[#F26722]" : "text-gray-400 group-hover:text-white"}`} />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </div>
                  {tab.badge !== null && (
                    <span
                      className={`hidden sm:inline-block px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                        isActive
                          ? "bg-white/20 text-white"
                          : typeof tab.badge === "number" && tab.badge > 0
                          ? "bg-[#F26722] text-white"
                          : "bg-gray-800 text-gray-300"
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Bottom Franchise / Hotel PMS highlight banner */}
          <div className="hidden sm:block mx-3 p-3 rounded-2xl bg-gradient-to-br from-[#1E1E34] to-[#141424] border border-gray-700/60 text-xs">
            <div className="flex items-center gap-2 text-[#F26722] font-bold mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Full Swadeshi Advantage</span>
            </div>
            <p className="text-[11px] text-gray-400 leading-relaxed mb-2">
              Unlike single-shop POS, Swadeshi includes central kitchen dispatch & hotel room billing natively.
            </p>
            <div className="flex items-center justify-between text-[10px] text-emerald-400 font-mono font-bold">
              <span>99.99% Offline Uptime</span>
              <span>RLS Secured</span>
            </div>
          </div>
        </aside>

        {/* --- MAIN SCREEN CONTAINER --- */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#0E0E18]">
          {/* ========================================================
              SCREEN 1: DASHBOARD
              ======================================================== */}
          {activeTab === "dashboard" && (
            <div className="space-y-6 max-w-7xl mx-auto">
              {/* Header Title */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
                    Executive Real-Time Overview
                  </h1>
                  <p className="text-xs sm:text-sm text-gray-400 mt-1">
                    Live operational metrics across Swiggy, Zomato, Dine-In & Direct WebStore
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-xs font-mono">
                    ● Realtime DB Sync Active
                  </Badge>
                  <Button
                    size="sm"
                    onClick={() => {
                      triggerToast("🔄 Refreshing operational ledgers...");
                    }}
                    variant="outline"
                    className="border-gray-700 text-xs gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Refresh
                  </Button>
                </div>
              </div>

              {/* 4 Big KPI Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 sm:p-5 rounded-2xl bg-[#151526] border border-gray-800 relative overflow-hidden">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Today's Gross Revenue</span>
                    <Badge className="bg-emerald-500/10 text-emerald-400 text-[10px] font-bold">+28.4%</Badge>
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-white font-mono">₹48,920</div>
                  <p className="text-[11px] text-gray-400 mt-1">114 Orders settled today</p>
                  <div className="h-1 w-full bg-gray-800 rounded-full mt-3 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-[#2E3192] to-[#F26722] w-[78%]" />
                  </div>
                </div>

                <div className="p-4 sm:p-5 rounded-2xl bg-[#151526] border border-gray-800 relative overflow-hidden">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Net Pocket Profit</span>
                    <Badge className="bg-emerald-500/10 text-emerald-400 text-[10px] font-bold">58% Margin</Badge>
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">₹28,370</div>
                  <p className="text-[11px] text-gray-400 mt-1">After ingredient COGS & staff</p>
                  <div className="h-1 w-full bg-gray-800 rounded-full mt-3 overflow-hidden">
                    <div className="h-full bg-emerald-500 w-[64%]" />
                  </div>
                </div>

                <div className="p-4 sm:p-5 rounded-2xl bg-[#151526] border border-gray-800 relative overflow-hidden">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Average Order Value</span>
                    <Badge className="bg-blue-500/10 text-blue-400 text-[10px] font-bold">AOV</Badge>
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-white font-mono">₹429</div>
                  <p className="text-[11px] text-gray-400 mt-1">₹495 Dine-in vs ₹360 Online</p>
                  <div className="h-1 w-full bg-gray-800 rounded-full mt-3 overflow-hidden">
                    <div className="h-full bg-blue-500 w-[55%]" />
                  </div>
                </div>

                <div className="p-4 sm:p-5 rounded-2xl bg-[#151526] border border-gray-800 relative overflow-hidden">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Kitchen Queue Load</span>
                    <Badge className="bg-[#F26722]/10 text-[#F26722] text-[10px] font-bold">Avg 6.4 min</Badge>
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-[#F26722] font-mono">
                    {orders.filter((o) => o.status === "NEW" || o.status === "COOKING").length} Active
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1">0 missed or delayed tickets</p>
                  <div className="h-1 w-full bg-gray-800 rounded-full mt-3 overflow-hidden">
                    <div className="h-full bg-[#F26722] w-[40%]" />
                  </div>
                </div>
              </div>

              {/* Mid-Row: Channel Split + Quick Actions */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Channel Performance Card */}
                <div className="lg:col-span-2 p-5 rounded-2xl bg-[#151526] border border-gray-800">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center justify-between">
                    <span>Multi-Channel Revenue Mix (Today)</span>
                    <span className="text-xs text-gray-400 font-normal">Real-time settlement</span>
                  </h3>
                  <div className="space-y-3.5">
                    {[
                      { channel: "Dine-In Tables", rev: "₹22,400", share: 46, comm: "0% (Free)", color: "bg-emerald-500" },
                      { channel: "Direct WebStore (.in)", rev: "₹11,800", share: 24, comm: "0% Commission", color: "bg-teal-400" },
                      { channel: "Swiggy Orders", rev: "₹8,420", share: 17, comm: "23% Aggregator cut", color: "bg-orange-500" },
                      { channel: "Zomato Orders", rev: "₹6,300", share: 13, comm: "24% Aggregator cut", color: "bg-red-500" },
                    ].map((ch, i) => (
                      <div key={i} className="p-3 rounded-xl bg-[#1A1A2E] border border-gray-800/80">
                        <div className="flex justify-between items-center text-xs font-bold mb-1.5">
                          <span className="text-white">{ch.channel}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-gray-400 font-mono">{ch.comm}</span>
                            <span className="text-white font-mono">{ch.rev}</span>
                          </div>
                        </div>
                        <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden">
                          <div className={`h-full ${ch.color}`} style={{ width: `${ch.share}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quick Simulation Trigger Actions */}
                <div className="p-5 rounded-2xl bg-[#151526] border border-gray-800 flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-2">
                      Test Live Scenarios
                    </h3>
                    <p className="text-xs text-gray-400 mb-4">
                      Click below to simulate real-world high-rush operations instantly:
                    </p>
                    <div className="space-y-2.5">
                      <Button
                        onClick={() => {
                          const newDineIn: DemoOrder = {
                            id: `#${Math.floor(4090 + Math.random() * 20)}`,
                            channel: "Dine-in",
                            tableOrRef: `Table ${Math.floor(Math.random() * 10 + 1)} (VIP)`,
                            time: "Just now",
                            items: [
                              { name: "Mutton Biryani Special", qty: 2, price: 480, station: "Curry" },
                              { name: "Butter Naan", qty: 4, price: 55, station: "Tandoor" },
                            ],
                            total: 1180,
                            status: "NEW",
                            elapsedSec: 1,
                          };
                          setOrders([newDineIn, ...orders]);
                          triggerToast("🛎️ VIP Dine-In order punched at POS!");
                        }}
                        className="w-full justify-start gap-2 bg-[#2E3192] hover:bg-[#3B3FB5] text-white text-xs font-bold"
                      >
                        <Plus className="w-4 h-4 text-[#F26722]" /> Punch 1-Click Dine-in KOT
                      </Button>

                      <Button
                        onClick={() => {
                          setActiveTab("kds");
                          triggerToast("👩‍🍳 Switched to Kitchen Display System");
                        }}
                        variant="secondary"
                        className="w-full justify-start gap-2 bg-[#1A1A2E] hover:bg-gray-800 text-gray-200 text-xs font-bold border border-gray-700"
                      >
                        <UtensilsCrossed className="w-4 h-4 text-emerald-400" /> Switch to Kitchen KDS Queue
                      </Button>

                      <Button
                        onClick={() => {
                          setActiveTab("inventory");
                          triggerToast("📦 Switched to 86-Stock Kill Switch");
                        }}
                        variant="secondary"
                        className="w-full justify-start gap-2 bg-[#1A1A2E] hover:bg-gray-800 text-gray-200 text-xs font-bold border border-gray-700"
                      >
                        <Boxes className="w-4 h-4 text-[#F26722]" /> Test 86-Stock Multi-Channel Kill
                      </Button>
                    </div>
                  </div>

                  <div className="mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-center">
                    <p className="text-xs font-bold text-emerald-400">Zero Commission WebStore Live</p>
                    <p className="text-[10px] text-gray-400">royalhyderabad.in · 0% commission</p>
                  </div>
                </div>
              </div>

              {/* Bottom Stream: Recent Live Orders */}
              <div className="p-5 rounded-2xl bg-[#151526] border border-gray-800">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Flame className="w-4 h-4 text-[#F26722]" /> Live Consolidated Kitchen Stream
                  </h3>
                  <span className="text-xs text-gray-400">Single screen replaces 4 separate tablets</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-gray-800 text-gray-400 font-bold uppercase text-[10px]">
                        <th className="pb-3">Order ID</th>
                        <th className="pb-3">Source Channel</th>
                        <th className="pb-3">Table / Rider Details</th>
                        <th className="pb-3">Items Summary</th>
                        <th className="pb-3">Total Amount</th>
                        <th className="pb-3">Status</th>
                        <th className="pb-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/60 font-medium">
                      {orders.slice(0, 5).map((o) => (
                        <tr key={o.id} className="hover:bg-[#1A1A2E]/60 transition">
                          <td className="py-3 font-mono font-bold text-white">{o.id}</td>
                          <td className="py-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                o.channel === "Swiggy"
                                  ? "bg-orange-500/10 text-orange-400 border border-orange-500/30"
                                  : o.channel === "Zomato"
                                  ? "bg-red-500/10 text-red-400 border border-red-500/30"
                                  : o.channel === "Dine-in"
                                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                                  : "bg-teal-500/10 text-teal-400 border border-teal-500/30"
                              }`}
                            >
                              {o.channel}
                            </span>
                          </td>
                          <td className="py-3 text-gray-300">{o.tableOrRef}</td>
                          <td className="py-3 text-gray-300 font-mono">
                            {o.items.map((it) => `${it.qty}x ${it.name}`).join(", ")}
                          </td>
                          <td className="py-3 font-mono font-bold text-emerald-400">₹{o.total}</td>
                          <td className="py-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                o.status === "NEW"
                                  ? "bg-blue-500/20 text-blue-300"
                                  : o.status === "COOKING"
                                  ? "bg-amber-500/20 text-amber-300 animate-pulse"
                                  : o.status === "READY"
                                  ? "bg-emerald-500/20 text-emerald-300"
                                  : "bg-gray-700 text-gray-400"
                              }`}
                            >
                              {o.status}
                            </span>
                          </td>
                          <td className="py-3 text-right">
                            <Button
                              size="sm"
                              onClick={() => advanceOrderStatus(o.id)}
                              className="h-7 px-2.5 text-[10px] font-bold bg-[#2E3192] hover:bg-[#3B3FB5] text-white"
                            >
                              {o.status === "NEW" ? "Cook" : o.status === "COOKING" ? "Ready" : o.status === "READY" ? "Serve" : "Done"}
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              SCREEN 2: KITCHEN DISPLAY SYSTEM (KDS)
              ======================================================== */}
          {activeTab === "kds" && (
            <div className="space-y-6 max-w-7xl mx-auto">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
                    <UtensilsCrossed className="w-6 h-6 text-[#F26722]" />
                    Kitchen Display System (KDS)
                  </h1>
                  <p className="text-xs sm:text-sm text-gray-400 mt-1">
                    Unified touch-first queue for kitchen line chefs. Auto-routes by Grill, Tandoor & Curry stations.
                  </p>
                </div>
                {/* Channel Filter Badges */}
                <div className="flex flex-wrap items-center gap-1.5 bg-[#151526] p-1.5 rounded-xl border border-gray-800 text-xs">
                  {["ALL", "Swiggy", "Zomato", "Dine-in", "WebStore"].map((f) => (
                    <button
                      key={f}
                      onClick={() => setKdsFilter(f)}
                      className={`px-3 py-1 rounded-lg font-bold text-xs transition ${
                        kdsFilter === f ? "bg-[#2E3192] text-white" : "text-gray-400 hover:text-white"
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3 KANBAN COLUMNS */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Column 1: NEW ORDERS */}
                <div className="rounded-2xl bg-[#141424] border border-blue-900/40 p-4 flex flex-col">
                  <div className="flex items-center justify-between pb-3 border-b border-gray-800 mb-4">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                      <h3 className="font-extrabold text-sm text-white uppercase tracking-wider">New Incoming</h3>
                    </div>
                    <Badge className="bg-blue-500/20 text-blue-300 font-mono text-xs">
                      {orders.filter((o) => o.status === "NEW" && (kdsFilter === "ALL" || o.channel === kdsFilter)).length}
                    </Badge>
                  </div>

                  <div className="space-y-3 flex-1 overflow-y-auto max-h-[600px]">
                    {orders
                      .filter((o) => o.status === "NEW" && (kdsFilter === "ALL" || o.channel === kdsFilter))
                      .map((o) => (
                        <div key={o.id} className="p-4 rounded-xl bg-[#1C1C30] border border-gray-700/80 shadow-md flex flex-col justify-between">
                          <div>
                            <div className="flex justify-between items-start mb-2">
                              <span className="font-mono font-black text-sm text-white">{o.id}</span>
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 font-mono">
                                {o.channel}
                              </span>
                            </div>
                            <p className="text-xs text-gray-400 mb-3">{o.tableOrRef}</p>
                            <div className="space-y-1.5 mb-4 border-t border-b border-gray-800 py-2">
                              {o.items.map((item, idx) => (
                                <div key={idx} className="flex justify-between text-xs">
                                  <span className="font-bold text-white">
                                    {item.qty}x {item.name}
                                  </span>
                                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-gray-800 text-gray-400 font-mono">
                                    {item.station}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="flex items-center justify-between gap-2 pt-2">
                            <div className="flex items-center gap-1 text-[11px] text-gray-400 font-mono">
                              <Clock className="w-3 h-3 text-blue-400" />
                              <span>{Math.floor(o.elapsedSec / 60)}m {o.elapsedSec % 60}s</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setPrintedKOT(o);
                                  triggerToast(`🖨️ Thermal KOT Printed for ${o.id}`);
                                }}
                                className="h-8 px-2 text-xs border-gray-700 text-gray-300 hover:text-white"
                                title="Print Physical KOT"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => advanceOrderStatus(o.id)}
                                className="h-8 px-3 text-xs font-bold bg-[#2E3192] hover:bg-[#3B3FB5] text-white"
                              >
                                Accept & Cook →
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Column 2: COOKING IN PROGRESS */}
                <div className="rounded-2xl bg-[#141424] border border-amber-900/40 p-4 flex flex-col">
                  <div className="flex items-center justify-between pb-3 border-b border-gray-800 mb-4">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
                      <h3 className="font-extrabold text-sm text-white uppercase tracking-wider">Cooking on Line</h3>
                    </div>
                    <Badge className="bg-amber-500/20 text-amber-300 font-mono text-xs">
                      {orders.filter((o) => o.status === "COOKING" && (kdsFilter === "ALL" || o.channel === kdsFilter)).length}
                    </Badge>
                  </div>

                  <div className="space-y-3 flex-1 overflow-y-auto max-h-[600px]">
                    {orders
                      .filter((o) => o.status === "COOKING" && (kdsFilter === "ALL" || o.channel === kdsFilter))
                      .map((o) => (
                        <div key={o.id} className="p-4 rounded-xl bg-[#1C1C30] border border-amber-500/40 shadow-md flex flex-col justify-between">
                          <div>
                            <div className="flex justify-between items-start mb-2">
                              <span className="font-mono font-black text-sm text-amber-300">{o.id}</span>
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 font-mono">
                                {o.channel}
                              </span>
                            </div>
                            <p className="text-xs text-gray-400 mb-3">{o.tableOrRef}</p>
                            <div className="space-y-1.5 mb-4 border-t border-b border-gray-800 py-2">
                              {o.items.map((item, idx) => (
                                <div key={idx} className="flex justify-between text-xs">
                                  <span className="font-bold text-white">
                                    {item.qty}x {item.name}
                                  </span>
                                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-950/40 text-amber-300 font-mono">
                                    {item.station}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="flex items-center justify-between gap-2 pt-2">
                            <div className="flex items-center gap-1 text-[11px] text-amber-400 font-mono font-bold">
                              <Flame className="w-3.5 h-3.5 text-[#F26722] animate-bounce" />
                              <span>{Math.floor(o.elapsedSec / 60)}m {o.elapsedSec % 60}s elapsed</span>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => advanceOrderStatus(o.id)}
                              className="h-8 px-3 text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white"
                            >
                              Mark Ready ✅
                            </Button>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Column 3: READY FOR DISPATCH */}
                <div className="rounded-2xl bg-[#141424] border border-emerald-900/40 p-4 flex flex-col">
                  <div className="flex items-center justify-between pb-3 border-b border-gray-800 mb-4">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      <h3 className="font-extrabold text-sm text-white uppercase tracking-wider">Ready / Runner</h3>
                    </div>
                    <Badge className="bg-emerald-500/20 text-emerald-300 font-mono text-xs">
                      {orders.filter((o) => o.status === "READY" && (kdsFilter === "ALL" || o.channel === kdsFilter)).length}
                    </Badge>
                  </div>

                  <div className="space-y-3 flex-1 overflow-y-auto max-h-[600px]">
                    {orders
                      .filter((o) => o.status === "READY" && (kdsFilter === "ALL" || o.channel === kdsFilter))
                      .map((o) => (
                        <div key={o.id} className="p-4 rounded-xl bg-[#1C1C30] border border-emerald-500/40 shadow-md flex flex-col justify-between">
                          <div>
                            <div className="flex justify-between items-start mb-2">
                              <span className="font-mono font-black text-sm text-emerald-300">{o.id}</span>
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 font-mono">
                                {o.channel}
                              </span>
                            </div>
                            <p className="text-xs text-gray-400 mb-3">{o.tableOrRef}</p>
                            <div className="space-y-1.5 mb-4 border-t border-b border-gray-800 py-2">
                              {o.items.map((item, idx) => (
                                <div key={idx} className="flex justify-between text-xs">
                                  <span className="font-bold text-white">
                                    {item.qty}x {item.name}
                                  </span>
                                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-950/40 text-emerald-300 font-mono">
                                    PACKED
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="flex items-center justify-between gap-2 pt-2">
                            <span className="text-[11px] text-emerald-400 font-bold">Rider / Waiter Alerted</span>
                            <Button
                              size="sm"
                              onClick={() => advanceOrderStatus(o.id)}
                              className="h-8 px-3 text-xs font-bold bg-gray-700 hover:bg-gray-600 text-white"
                            >
                              Dispatch & Settle
                            </Button>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              SCREEN 3: MENU & RECIPE COGS ENGINE
              ======================================================== */}
          {activeTab === "menu" && (
            <div className="space-y-6 max-w-7xl mx-auto">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
                    <BookOpen className="w-6 h-6 text-[#F26722]" />
                    Dish-Level Recipe COGS & Profit Engine
                  </h1>
                  <p className="text-xs sm:text-sm text-gray-400 mt-1">
                    Edit raw ingredient wholesale prices to see live gross margins for Dine-in vs 24% Aggregator delivery cut.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Recipe Selector List */}
                <div className="p-5 rounded-2xl bg-[#151526] border border-gray-800 space-y-3">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Select Active Dish</h3>
                  {recipes.map((rec, idx) => (
                    <button
                      key={rec.id}
                      onClick={() => setSelectedRecipeIndex(idx)}
                      className={`w-full text-left p-4 rounded-xl border transition ${
                        selectedRecipeIndex === idx
                          ? "bg-[#2E3192]/30 border-[#F26722] text-white"
                          : "bg-[#1A1A2E] border-gray-800 text-gray-300 hover:bg-[#202038]"
                      }`}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-sm text-white">{rec.name}</span>
                        <span className="font-mono font-bold text-xs text-emerald-400">₹{rec.sellingPrice}</span>
                      </div>
                      <p className="text-[11px] text-gray-400">{rec.category} · {rec.ingredients.length} raw ingredients</p>
                    </button>
                  ))}
                </div>

                {/* Middle & Right: Recipe Ingredients Breakdown + Profit Gauges */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Ingredients Table */}
                  <div className="p-5 rounded-2xl bg-[#151526] border border-gray-800">
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <h3 className="text-base font-extrabold text-white">{currentRec.name}</h3>
                        <p className="text-xs text-gray-400">Selling Price: ₹{currentRec.sellingPrice}</p>
                      </div>
                      <Badge className="bg-emerald-500/10 text-emerald-400 text-xs font-mono">
                        COGS: ₹{cogsTotal.toFixed(1)}
                      </Badge>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-gray-800 text-gray-400 font-bold uppercase text-[10px]">
                            <th className="pb-3">Ingredient</th>
                            <th className="pb-3">Portion Qty</th>
                            <th className="pb-3">Unit Cost (₹)</th>
                            <th className="pb-3 text-right">Total (₹)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800 font-mono">
                          {currentRec.ingredients.map((ing, i) => (
                            <tr key={i}>
                              <td className="py-2.5 font-sans text-gray-200">{ing.name}</td>
                              <td className="py-2.5 text-gray-300">{ing.qty}</td>
                              <td className="py-2.5">
                                <div className="flex items-center gap-1.5">
                                  <span>₹</span>
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={ing.unitCost}
                                    onChange={(e) => updateIngredientCost(i, parseFloat(e.target.value) || 0)}
                                    className="w-16 bg-[#1A1A2E] border border-gray-700 rounded px-1.5 py-0.5 text-white font-mono text-xs focus:border-[#F26722] outline-none"
                                  />
                                </div>
                              </td>
                              <td className="py-2.5 text-right font-bold text-white">₹{ing.total.toFixed(1)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Profit Comparison (Dine-in vs Swiggy/Zomato) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-5 rounded-2xl bg-emerald-950/20 border border-emerald-800/40">
                      <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                        Direct Dine-In / WebStore
                      </span>
                      <div className="text-2xl font-black text-emerald-400 font-mono mt-1">
                        ₹{directProfit.toFixed(1)}{" "}
                        <span className="text-sm font-normal text-gray-400">({directMargin}%)</span>
                      </div>
                      <p className="text-xs text-gray-300 mt-2">
                        0% Commission. You pocket the full profit margin per plate.
                      </p>
                    </div>

                    <div className="p-5 rounded-2xl bg-red-950/20 border border-red-800/40">
                      <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider">
                        Swiggy / Zomato Delivery (24% Cut)
                      </span>
                      <div className="text-2xl font-black text-red-400 font-mono mt-1">
                        ₹{aggProfit.toFixed(1)}{" "}
                        <span className="text-sm font-normal text-gray-400">({aggMargin}%)</span>
                      </div>
                      <p className="text-xs text-gray-300 mt-2">
                        Aggregator drains ₹{aggregatorComm.toFixed(0)} commission per plate.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              SCREEN 4: INVENTORY & 86-STOCK KILL SWITCH
              ======================================================== */}
          {activeTab === "inventory" && (
            <div className="space-y-6 max-w-7xl mx-auto">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
                    <Boxes className="w-6 h-6 text-[#F26722]" />
                    Smart Inventory & 86-Stock Kill Switch
                  </h1>
                  <p className="text-xs sm:text-sm text-gray-400 mt-1">
                    When raw ingredient finishes, click 86-Kill. All dependent dishes toggle to Sold-Out across Swiggy, Zomato & POS in 1 click.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {inventory.map((item) => (
                  <div
                    key={item.id}
                    className={`p-5 rounded-2xl border transition-all ${
                      item.out
                        ? "bg-red-950/30 border-red-700/60 opacity-80"
                        : item.status === "CRITICAL"
                        ? "bg-[#1C1522] border-red-500/40"
                        : item.status === "LOW"
                        ? "bg-[#1A1A28] border-amber-500/40"
                        : "bg-[#151526] border-gray-800"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-extrabold text-sm text-white">{item.name}</h3>
                      <Badge
                        className={`text-[10px] font-bold ${
                          item.out
                            ? "bg-red-600 text-white"
                            : item.status === "CRITICAL"
                            ? "bg-red-500/20 text-red-300"
                            : item.status === "LOW"
                            ? "bg-amber-500/20 text-amber-300"
                            : "bg-emerald-500/20 text-emerald-300"
                        }`}
                      >
                        {item.out ? "86'D (OUT OF STOCK)" : item.status}
                      </Badge>
                    </div>

                    <div className="space-y-1.5 my-3 text-xs">
                      <div className="flex justify-between text-gray-400">
                        <span>Current Stock:</span>
                        <span className="font-mono font-bold text-white">{item.stock}</span>
                      </div>
                      <div className="flex justify-between text-gray-400">
                        <span>Burn Rate:</span>
                        <span className="font-mono text-gray-300">{item.rate}</span>
                      </div>
                      <div className="flex justify-between text-gray-400">
                        <span>Estimated Runout:</span>
                        <span className="font-mono text-amber-400">{item.runout}</span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-gray-800 flex items-center justify-between gap-2">
                      <Button
                        size="sm"
                        onClick={() => toggleStockKill(item.id)}
                        className={`w-full text-xs font-bold ${
                          item.out
                            ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                            : "bg-red-600 hover:bg-red-500 text-white"
                        }`}
                      >
                        {item.out ? "Restock & Re-enable" : "86-Kill Switch (All Channels)"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ========================================================
              SCREEN 5: ANALYTICS & P&L
              ======================================================== */}
          {activeTab === "analytics" && (
            <div className="space-y-6 max-w-7xl mx-auto">
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
                  <BarChart3 className="w-6 h-6 text-[#F26722]" />
                  Automated P&L, GST & Profit Analytics
                </h1>
                <p className="text-xs sm:text-sm text-gray-400 mt-1">
                  Replaces manual end-of-day Excel entries with automated audit-ready ledger reconciliations.
                </p>
              </div>

              {/* 3 Analytics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-5 rounded-2xl bg-[#151526] border border-gray-800">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Top 5 Dishes by Revenue</h3>
                  <div className="space-y-3 font-mono text-xs">
                    {[
                      { name: "Special Mutton Biryani", sales: "₹18,400", share: 38 },
                      { name: "Chicken Dum Biryani", sales: "₹14,200", share: 29 },
                      { name: "Paneer Butter Masala", sales: "₹7,600", share: 16 },
                      { name: "Tandoori Platters", sales: "₹5,200", share: 11 },
                      { name: "Desserts & Beverages", sales: "₹3,520", share: 6 },
                    ].map((d, i) => (
                      <div key={i} className="space-y-1">
                        <div className="flex justify-between text-gray-200">
                          <span className="font-sans font-bold">{d.name}</span>
                          <span className="text-emerald-400">{d.sales}</span>
                        </div>
                        <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                          <div className="h-full bg-[#2E3192]" style={{ width: `${d.share}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-[#151526] border border-gray-800">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Payment Modes Breakdown</h3>
                  <div className="space-y-3 font-mono text-xs">
                    {[
                      { mode: "Direct UPI (QR / PhonePe / GPay)", amount: "₹26,800", share: 55, color: "bg-emerald-500" },
                      { mode: "Credit / Debit Cards", amount: "₹14,200", share: 29, color: "bg-blue-500" },
                      { mode: "Cash at Counter", amount: "₹7,920", share: 16, color: "bg-amber-500" },
                    ].map((m, i) => (
                      <div key={i} className="p-3 rounded-xl bg-[#1A1A2E] border border-gray-800">
                        <div className="flex justify-between text-xs font-bold mb-1">
                          <span className="text-white font-sans">{m.mode}</span>
                          <span className="text-white">{m.amount}</span>
                        </div>
                        <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                          <div className={`h-full ${m.color}`} style={{ width: `${m.share}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-[#151526] border border-gray-800 flex flex-col justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">GST & Tax Summary</h3>
                    <div className="space-y-2 text-xs font-mono">
                      <div className="flex justify-between py-2 border-b border-gray-800">
                        <span className="text-gray-400">CGST (2.5%):</span>
                        <span className="text-white font-bold">₹1,223.00</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-gray-800">
                        <span className="text-gray-400">SGST (2.5%):</span>
                        <span className="text-white font-bold">₹1,223.00</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-gray-800">
                        <span className="text-gray-400">Total GST Collected:</span>
                        <span className="text-emerald-400 font-bold">₹2,446.00</span>
                      </div>
                    </div>
                  </div>
                  <Button
                    onClick={() => triggerToast("📊 Downloaded GST Form GSTR-1 Excel Report!")}
                    className="w-full mt-4 bg-[#2E3192] hover:bg-[#3B3FB5] text-white text-xs font-bold"
                  >
                    Download GSTR-1 Excel Report
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              SCREEN 6: STAFF & ROW-LEVEL SECURITY (RLS)
              ======================================================== */}
          {activeTab === "staff" && (
            <div className="space-y-6 max-w-7xl mx-auto">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
                    <Users className="w-6 h-6 text-[#F26722]" />
                    Staff Accounts & Granular Role Permissions
                  </h1>
                  <p className="text-xs sm:text-sm text-gray-400 mt-1">
                    Powered by PostgreSQL Row-Level Security (RLS). Kitchen staff only see KOTs; cashiers cannot delete bills without manager OTP.
                  </p>
                </div>
                <Button
                  onClick={() => setShowAddStaff(true)}
                  className="bg-[#2E3192] hover:bg-[#3B3FB5] text-white text-xs font-bold gap-2"
                >
                  <Plus className="w-4 h-4" /> Add Staff Member
                </Button>
              </div>

              {/* Staff Table */}
              <div className="rounded-2xl bg-[#151526] border border-gray-800 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-[#1C1C30] border-b border-gray-800 text-gray-400 font-bold uppercase text-[10px]">
                      <th className="p-4">Staff Name</th>
                      <th className="p-4">Assigned Role</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Orders Handled</th>
                      <th className="p-4">Avg Service Time</th>
                      <th className="p-4">Security Policy</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {staffList.map((s) => (
                      <tr key={s.id} className="hover:bg-[#1A1A2E] transition">
                        <td className="p-4 font-bold text-white flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#2E3192] to-[#F26722] flex items-center justify-center text-[10px] text-white">
                            {s.name.charAt(0)}
                          </div>
                          {s.name}
                        </td>
                        <td className="p-4 text-gray-300 font-medium">{s.role}</td>
                        <td className="p-4">
                          <Badge
                            className={`text-[10px] font-bold ${
                              s.status === "ONLINE"
                                ? "bg-emerald-500/20 text-emerald-300"
                                : "bg-gray-700 text-gray-400"
                            }`}
                          >
                            {s.status}
                          </Badge>
                        </td>
                        <td className="p-4 font-mono text-white">{s.ordersHandled}</td>
                        <td className="p-4 font-mono text-gray-300">{s.avgSpeed}</td>
                        <td className="p-4 text-emerald-400 font-mono text-[11px] flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          {s.rls}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Add Staff Modal */}
              {showAddStaff && (
                <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
                  <div className="bg-[#18182C] border border-gray-700 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="font-extrabold text-lg text-white">Add Staff Member</h3>
                      <button onClick={() => setShowAddStaff(false)} className="text-gray-400 hover:text-white">
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <form onSubmit={handleAddStaff} className="space-y-4">
                      <div>
                        <label className="text-xs font-bold text-gray-300 uppercase">Staff Full Name</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Suresh Verma"
                          value={newStaffName}
                          onChange={(e) => setNewStaffName(e.target.value)}
                          className="w-full mt-1 bg-[#121220] border border-gray-700 rounded-xl px-3 py-2 text-sm text-white focus:border-[#F26722] outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-gray-300 uppercase">Role & Access Level</label>
                        <select
                          value={newStaffRole}
                          onChange={(e) => setNewStaffRole(e.target.value)}
                          className="w-full mt-1 bg-[#121220] border border-gray-700 rounded-xl px-3 py-2 text-sm text-white focus:border-[#F26722] outline-none"
                        >
                          <option value="Front Cashier / POS">Front Cashier / POS (Billing Only)</option>
                          <option value="Head Chef (KDS)">Head Chef (Kitchen KDS Only)</option>
                          <option value="Floor Captain">Floor Captain (Waiter Order Punching)</option>
                          <option value="Store Manager">Store Manager (Discounts, Stock, Reports)</option>
                          <option value="Housekeeping / Hotel">Housekeeping (Room PMS Status)</option>
                        </select>
                      </div>

                      <div className="p-3 rounded-xl bg-blue-950/30 border border-blue-800/50 text-[11px] text-blue-200">
                        🔒 All credentials enforce Supabase Row-Level Security automatically.
                      </div>

                      <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="outline" onClick={() => setShowAddStaff(false)} className="border-gray-700 text-xs">
                          Cancel
                        </Button>
                        <Button type="submit" className="bg-[#2E3192] hover:bg-[#3B3FB5] text-white text-xs font-bold">
                          Save & Issue Login
                        </Button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================
              SCREEN 7: SETTINGS & INTEGRATIONS
              ======================================================== */}
          {activeTab === "settings" && (
            <div className="space-y-6 max-w-7xl mx-auto">
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
                  <Settings className="w-6 h-6 text-[#F26722]" />
                  Connected Platforms & Regional Settings
                </h1>
                <p className="text-xs sm:text-sm text-gray-400 mt-1">
                  Manage Swiggy, Zomato, Razorpay & WhatsApp API connections in one place.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { name: "Swiggy UrbanPiper API", desc: "Live menu, inventory & auto-order sync", status: "CONNECTED", color: "text-orange-400" },
                  { name: "Zomato Partner Integration", desc: "Direct kitchen stream routing", status: "CONNECTED", color: "text-red-400" },
                  { name: "Razorpay / UPI Payment Gateway", desc: "Direct instant bank settlements", status: "CONNECTED", color: "text-blue-400" },
                  { name: "WhatsApp Cloud Messaging", desc: "Automated digital receipts & marketing", status: "CONNECTED", color: "text-emerald-400" },
                  { name: "Custom Domain WebStore", desc: "royalhyderabad.in · 0% commission", status: "ACTIVE", color: "text-teal-400" },
                  { name: "Regional Language Staff UI", desc: "Telugu, Hindi, Tamil & English toggles", status: "ENABLED", color: "text-purple-400" },
                ].map((integ, i) => (
                  <div key={i} className="p-5 rounded-2xl bg-[#151526] border border-gray-800 flex items-center justify-between">
                    <div>
                      <h4 className="font-extrabold text-sm text-white">{integ.name}</h4>
                      <p className="text-xs text-gray-400 mt-0.5">{integ.desc}</p>
                    </div>
                    <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                      {integ.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* --- KOT PRINT SIMULATION MODAL --- */}
      {printedKOT && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white text-black p-6 rounded-2xl max-w-sm w-full font-mono text-xs shadow-2xl space-y-3 animate-scale-in">
            <div className="text-center pb-2 border-b-2 border-dashed border-gray-400">
              <h2 className="font-black text-base uppercase">SWADESHI SOLUTIONS KOT</h2>
              <p className="text-[10px] text-gray-600">Royal Hyderabad · Central Kitchen</p>
              <p className="font-bold text-sm mt-1">{printedKOT.id} - {printedKOT.channel}</p>
              <p className="text-[10px]">{printedKOT.tableOrRef}</p>
            </div>

            <div className="space-y-1.5 py-2 border-b-2 border-dashed border-gray-400">
              {printedKOT.items.map((it, idx) => (
                <div key={idx} className="flex justify-between font-bold text-xs">
                  <span>{it.qty}x {it.name}</span>
                  <span>[{it.station}]</span>
                </div>
              ))}
            </div>

            <div className="flex justify-between font-black text-sm pt-1">
              <span>TOTAL ESTIMATE</span>
              <span>₹{printedKOT.total}</span>
            </div>

            <div className="text-center text-[10px] text-gray-500 pt-2">
              Time: {new Date().toLocaleTimeString()} · Server: POS-Station-1
            </div>

            <Button
              onClick={() => setPrintedKOT(null)}
              className="w-full mt-2 bg-black text-white hover:bg-gray-800 text-xs font-bold font-sans"
            >
              Close KOT Preview
            </Button>
          </div>
        </div>
      )}

      {/* --- TOAST NOTIFICATION POPUP --- */}
      {toastMessage && (
        <div className="fixed bottom-14 right-6 z-50 bg-[#1E1E34] border border-emerald-500/50 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 text-xs font-bold animate-fade-in">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* --- PERSISTENT BOTTOM STRIP --- */}
      <footer className="h-12 bg-[#121220] border-t border-gray-800 px-4 flex items-center justify-between text-xs text-gray-400 shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="text-gray-300 font-bold">Try clicking tabs & buttons above!</span>
          <span className="hidden md:inline text-gray-500">— zero signup or credit card required.</span>
        </div>

        <a
          href="https://wa.me/918790425317?text=Hi%2C%20I%20wanna%20book%20a%20free%20demo%20for%20Swadeshi%20RMS"
          target="_blank"
          rel="noreferrer"
          className="text-[#F26722] hover:text-white font-bold transition flex items-center gap-1"
        >
          Book 15-Minute WhatsApp Walkthrough <ChevronRight className="w-3.5 h-3.5" />
        </a>
      </footer>
    </div>
  );
}
