import React, { useState } from "react";
import {
  ChefHat,
  Receipt,
  TrendingUp,
  AlertTriangle,
  Globe,
  CheckCircle2,
  Clock,
  Plus,
  Minus,
  Trash2,
  Sparkles,
  Flame,
  ArrowRight,
  RefreshCw,
  ShoppingBag,
  Smartphone,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// Audio chime using Web Audio API for interactive clicks
const playChime = (type: "kot" | "accept" | "ready" | "toggle" = "accept") => {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    if (type === "kot") {
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.25);
    } else if (type === "ready") {
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.08); // E5
      osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.16); // G5
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    } else {
      osc.frequency.setValueAtTime(440, ctx.currentTime); // A4
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.12);
    }
  } catch (e) {
    // AudioContext blocked or not supported - silently ignore
  }
};

export const InteractiveExperienceSection: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"kds" | "margin" | "pos" | "stock86" | "lang">("kds");

  // ==========================================
  // TAB 1: KDS & AGGREGATOR SIMULATOR STATE
  // ==========================================
  type OrderStatus = "NEW" | "COOKING" | "READY" | "DISPATCHED";
  interface DemoOrder {
    id: string;
    channel: "Swiggy" | "Zomato" | "Dine-In" | "Direct Web";
    tableOrId: string;
    customer: string;
    items: { name: string; qty: number }[];
    total: number;
    status: OrderStatus;
    timer: number;
    color: string;
  }

  const initialOrders: DemoOrder[] = [
    {
      id: "SWG-8902",
      channel: "Swiggy",
      tableOrId: "Rider arriving in 4m",
      customer: "Kiran R.",
      items: [
        { name: "Special Chicken Dum Biryani", qty: 2 },
        { name: "Mirchi Ka Salan & Raita", qty: 2 },
        { name: "Thums Up (500ml)", qty: 2 },
      ],
      total: 780,
      status: "NEW",
      timer: 120,
      color: "from-[#FC8019] to-[#E23744]",
    },
    {
      id: "ZOM-4190",
      channel: "Zomato",
      tableOrId: "Scheduled Delivery",
      customer: "Sneha P.",
      items: [
        { name: "Paneer Butter Masala", qty: 1 },
        { name: "Butter Garlic Naan", qty: 3 },
        { name: "Gulab Jamun (2 pcs)", qty: 1 },
      ],
      total: 520,
      status: "COOKING",
      timer: 340,
      color: "from-[#E23744] to-[#CB202D]",
    },
    {
      id: "TBL-07",
      channel: "Dine-In",
      tableOrId: "Table 7 · Captain Rahul",
      customer: "Family of 4",
      items: [
        { name: "Mutton Sukka Starter", qty: 1 },
        { name: "Hyderabadi Mutton Biryani", qty: 2 },
        { name: "Fresh Lime Soda", qty: 4 },
      ],
      total: 1240,
      status: "READY",
      timer: 510,
      color: "from-[#2E3192] to-[#4A90E2]",
    },
    {
      id: "WEB-104",
      channel: "Direct Web",
      tableOrId: "Zero Commission Order",
      customer: "Arjun V.",
      items: [
        { name: "Tandoori Chicken Full", qty: 1 },
        { name: "Rumali Roti", qty: 4 },
      ],
      total: 610,
      status: "NEW",
      timer: 45,
      color: "from-[#10B981] to-[#059669]",
    },
  ];

  const [orders, setOrders] = useState<DemoOrder[]>(initialOrders);
  const [kdsNotification, setKdsNotification] = useState<string | null>(null);

  const handleAdvanceOrderStatus = (orderId: string) => {
    playChime("accept");
    setOrders((prev) =>
      prev.map((ord) => {
        if (ord.id !== orderId) return ord;
        if (ord.status === "NEW") {
          setKdsNotification(`Order ${ord.id} moved to Kitchen Cooking!`);
          return { ...ord, status: "COOKING" };
        }
        if (ord.status === "COOKING") {
          playChime("ready");
          setKdsNotification(`Order ${ord.id} marked FOOD READY! Alert sent to runner/rider.`);
          return { ...ord, status: "READY" };
        }
        if (ord.status === "READY") {
          setKdsNotification(`Order ${ord.id} Dispatched & Settled!`);
          return { ...ord, status: "DISPATCHED" };
        }
        return { ...ord, status: "NEW" };
      })
    );
    setTimeout(() => setKdsNotification(null), 3500);
  };

  const simulateNewIncomingOrder = () => {
    playChime("kot");
    const newId = `SWG-${Math.floor(1000 + Math.random() * 9000)}`;
    const randomOrder: DemoOrder = {
      id: newId,
      channel: "Swiggy",
      tableOrId: "Rider assigned",
      customer: "Vikram K.",
      items: [
        { name: "Butter Chicken Boneless", qty: 1 },
        { name: "Garlic Naan", qty: 2 },
      ],
      total: 490,
      status: "NEW",
      timer: 10,
      color: "from-[#FC8019] to-[#E23744]",
    };
    setOrders((prev) => [randomOrder, ...prev.slice(0, 3)]);
    setKdsNotification(`⚡ Ding! Live Swiggy Order #${newId} auto-accepted and synced to KDS!`);
    setTimeout(() => setKdsNotification(null), 4000);
  };

  // ==========================================
  // TAB 2: DISH PROFIT MARGIN CALCULATOR STATE
  // ==========================================
  const demoDishes = [
    { name: "Chicken Dum Biryani", defaultPrice: 320, defaultCogs: 95, defaultPack: 22 },
    { name: "Paneer Butter Masala", defaultPrice: 280, defaultCogs: 72, defaultPack: 18 },
    { name: "Mutton Galouti Kebab", defaultPrice: 420, defaultCogs: 145, defaultPack: 25 },
    { name: "Cold Brew Artisan Coffee", defaultPrice: 190, defaultCogs: 38, defaultPack: 15 },
  ];

  const [selectedDishIdx, setSelectedDishIdx] = useState(0);
  const [sellingPrice, setSellingPrice] = useState(demoDishes[0].defaultPrice);
  const [cogs, setCogs] = useState(demoDishes[0].defaultCogs);
  const [packaging, setPackaging] = useState(demoDishes[0].defaultPack);
  const [aggregatorCommissionPct, setAggregatorCommissionPct] = useState(24);

  const handleSelectDish = (idx: number) => {
    setSelectedDishIdx(idx);
    setSellingPrice(demoDishes[idx].defaultPrice);
    setCogs(demoDishes[idx].defaultCogs);
    setPackaging(demoDishes[idx].defaultPack);
    playChime("toggle");
  };

  const directGrossProfit = sellingPrice - cogs - packaging;
  const directMarginPct = Math.round((directGrossProfit / (sellingPrice || 1)) * 100);
  const foodCostPct = Math.round(((cogs + packaging) / (sellingPrice || 1)) * 100);

  const commissionAmount = Math.round((sellingPrice * aggregatorCommissionPct) / 100);
  const aggregatorGrossProfit = sellingPrice - cogs - packaging - commissionAmount;
  const aggregatorMarginPct = Math.round((aggregatorGrossProfit / (sellingPrice || 1)) * 100);

  // ==========================================
  // TAB 3: FAST POS PUNCH SIMULATOR STATE
  // ==========================================
  const posCategories = ["Bestsellers", "Biryani & Rice", "Curries", "Starters", "Beverages"];
  const [posCategory, setPosCategory] = useState("Bestsellers");
  const posMenuItems = [
    { id: "p1", name: "Hyderabadi Chicken Biryani", price: 340, category: "Biryani & Rice", popular: true, tag: "Non-Veg" },
    { id: "p2", name: "Special Mutton Dum Biryani", price: 460, category: "Biryani & Rice", popular: true, tag: "Non-Veg" },
    { id: "p3", name: "Paneer Tikka Masala", price: 290, category: "Curries", popular: true, tag: "Veg" },
    { id: "p4", name: "Butter Chicken (Boneless)", price: 360, category: "Curries", popular: true, tag: "Non-Veg" },
    { id: "p5", name: "Tandoori Chicken (Half)", price: 260, category: "Starters", popular: false, tag: "Non-Veg" },
    { id: "p6", name: "Crispy Corn Pepper Salt", price: 220, category: "Starters", popular: true, tag: "Veg" },
    { id: "p7", name: "Garlic Butter Naan", price: 65, category: "Curries", popular: false, tag: "Veg" },
    { id: "p8", name: "Mango Lassi (Thick)", price: 120, category: "Beverages", popular: true, tag: "Veg" },
    { id: "p9", name: "Fresh Mint Mojito", price: 140, category: "Beverages", popular: false, tag: "Veg" },
  ];

  interface CartItem {
    id: string;
    name: string;
    price: number;
    qty: number;
  }

  const [cart, setCart] = useState<CartItem[]>([
    { id: "p1", name: "Hyderabadi Chicken Biryani", price: 340, qty: 2 },
    { id: "p7", name: "Garlic Butter Naan", price: 65, qty: 3 },
  ]);
  const [kotPunchedModal, setKotPunchedModal] = useState(false);
  const [selectedTable, setSelectedTable] = useState("T-04");

  const addToCart = (item: typeof posMenuItems[0]) => {
    playChime("accept");
    setCart((prev) => {
      const existing = prev.find((c) => c.id === item.id);
      if (existing) {
        return prev.map((c) => (c.id === item.id ? { ...c, qty: c.qty + 1 } : c));
      }
      return [...prev, { id: item.id, name: item.name, price: item.price, qty: 1 }];
    });
  };

  const updateCartQty = (id: string, delta: number) => {
    playChime("toggle");
    setCart((prev) =>
      prev
        .map((c) => (c.id === id ? { ...c, qty: Math.max(0, c.qty + delta) } : c))
        .filter((c) => c.qty > 0)
    );
  };

  const cartSubtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const cartGst = Math.round(cartSubtotal * 0.05);
  const cartTotal = cartSubtotal + cartGst;

  const handlePunchKot = () => {
    playChime("kot");
    setKotPunchedModal(true);
    setTimeout(() => setKotPunchedModal(false), 3000);
  };

  // ==========================================
  // TAB 4: 86 / STOCK AUTO-KILL SYNC STATE
  // ==========================================
  const [muttonStockKilled, setMuttonStockKilled] = useState(false);
  const [butterStockKilled, setButterStockKilled] = useState(false);

  const toggleMuttonStock = () => {
    playChime("toggle");
    setMuttonStockKilled(!muttonStockKilled);
  };

  const toggleButterStock = () => {
    playChime("toggle");
    setButterStockKilled(!butterStockKilled);
  };

  // ==========================================
  // TAB 5: MULTI-LANGUAGE STAFF PREVIEW
  // ==========================================
  type LanguageKey = "en" | "te" | "hi" | "ta";
  const [currentLang, setCurrentLang] = useState<LanguageKey>("te");

  const translations: Record<LanguageKey, { label: string; nativeName: string; sampleItems: { name: string; category: string; status: string }[] }> = {
    en: {
      label: "English",
      nativeName: "English",
      sampleItems: [
        { name: "Special Mutton Biryani", category: "Rice Dishes", status: "Cooking in Kitchen" },
        { name: "Butter Chicken", category: "Curries", status: "Ready to Serve" },
        { name: "Garlic Naan", category: "Tandoori Breads", status: "Order Punched" },
        { name: "Gulab Jamun", category: "Desserts", status: "Dispatched" },
      ],
    },
    te: {
      label: "Telugu",
      nativeName: "తెలుగు",
      sampleItems: [
        { name: "స్పెషల్ మటన్ బిర్యానీ", category: "రైస్ వంటకాలు", status: "వంటశాలలో తయారవుతోంది" },
        { name: "బట్టర్ చికెన్ కర్రీ", category: "కర్రీలు", status: "వడ్డించడానికి సిద్ధం" },
        { name: "గార్లిక్ బటర్ నాన్", category: "తందూరి రొట్టెలు", status: "ఆర్డర్ పంపబడింది" },
        { name: "గులాబ్ జామూన్", category: "మిఠాయిలు", status: "డెలివరీ అయింది" },
      ],
    },
    hi: {
      label: "Hindi",
      nativeName: "हिन्दी",
      sampleItems: [
        { name: "स्पेशल मटन बिरयानी", category: "चावल के व्यंजन", status: "किचन में बन रहा है" },
        { name: "बटर चिकन करी", category: "ग्रेवी / करी", status: "परोसने के लिए तैयार" },
        { name: "गार्लिक बटर नान", category: "तंदूरी रोटियां", status: "ऑर्डर दर्ज हुआ" },
        { name: "गुलाब जामुन", category: "मिठाई", status: "रवाना किया गया" },
      ],
    },
    ta: {
      label: "Tamil",
      nativeName: "தமிழ்",
      sampleItems: [
        { name: "ஸ்பெஷல் மட்டன் பிரியாணி", category: "சாத வகைகள்", status: "சமையலறையில் தயாராகிறது" },
        { name: "பட்டர் சிக்கன்", category: "குழம்பு வகைகள்", status: "பரிமாற தயார்" },
        { name: "பூண்டு பட்டர் நான்", category: "ரொட்டி வகைகள்", status: "ஆர்டர் செய்யப்பட்டது" },
        { name: "குலாப் ஜாமுன்", category: "இனிப்புகள்", status: "அனுப்பப்பட்டது" },
      ],
    },
  };

  return (
    <section id="live-experience" className="py-20 relative bg-gradient-to-b from-gray-50 via-white to-gray-50 dark:from-[#151522] dark:via-[#1A1A2E] dark:to-[#151522] overflow-hidden">
      {/* Background glow accents */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-tr from-[#2E3192]/10 via-[#F26722]/10 to-[#6BCB77]/10 blur-3xl pointer-events-none -z-10" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-[#2E3192]/10 to-[#F26722]/10 border border-[#F26722]/20 text-[#2E3192] dark:text-[#F26722] text-xs sm:text-sm font-bold uppercase tracking-wider mb-4">
            <Sparkles className="w-4 h-4 text-[#F26722] animate-pulse" />
            Interactive Live RMS Sandbox
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#2D3A5F] dark:text-white tracking-tight mb-4">
            Don't Just Take Our Word For It.{" "}
            <span className="bg-gradient-to-r from-[#F26722] via-[#FF6B6B] to-[#2E3192] bg-clip-text text-transparent">
              Test Drive It Right Here.
            </span>
          </h2>
          <p className="text-base sm:text-lg text-gray-600 dark:text-gray-300 mb-6">
            Click, punch orders, simulate aggregator sync, and check live profit margins. 100% interactive — zero signup required.
          </p>
          <div className="flex justify-center">
            <a
              href="/live-experience"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-[#2E3192] to-[#F26722] text-white font-bold text-sm shadow-xl shadow-[#2E3192]/20 hover:scale-105 transition-transform"
            >
              <Sparkles className="w-4 h-4" />
              Open Fullscreen Multi-Screen Simulator (7 Screens) →
            </a>
          </div>
        </div>

        {/* Tab Navigation Pill Bar */}
        <div className="flex justify-center mb-8 overflow-x-auto pb-2 px-2">
          <div className="inline-flex p-1.5 rounded-2xl bg-white dark:bg-[#202038] shadow-lg border border-gray-200 dark:border-gray-700/80 gap-1 sm:gap-2">
            {[
              { id: "kds", label: "Unified Live KDS", icon: ChefHat, badge: "Swiggy + Zomato" },
              { id: "margin", label: "Profit Calculator", icon: TrendingUp, badge: "Live Margins" },
              { id: "pos", label: "1-Click POS Punch", icon: Receipt, badge: "Speed Test" },
              { id: "stock86", label: "86 Stock Auto-Kill", icon: AlertTriangle, badge: "Instant 0.2s Sync" },
              { id: "lang", label: "Regional Language UI", icon: Globe, badge: "Telugu / Hindi" },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    playChime("toggle");
                    setActiveTab(tab.id as "kds" | "margin" | "pos" | "stock86" | "lang");
                  }}
                  className={`flex items-center gap-2 px-4 py-3 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-300 whitespace-nowrap ${
                    isActive
                      ? "bg-gradient-to-r from-[#2E3192] to-[#1E2269] text-white shadow-md shadow-[#2E3192]/25 scale-[1.02]"
                      : "text-gray-600 dark:text-gray-300 hover:text-[#2D3A5F] dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800/60"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-[#F26722]" : "text-gray-400"}`} />
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span
                      className={`hidden md:inline-block text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        isActive
                          ? "bg-[#F26722] text-white"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Live Notification Bar if any */}
        {kdsNotification && (
          <div className="max-w-4xl mx-auto mb-6 px-4 py-3 rounded-xl bg-gradient-to-r from-[#10B981]/15 to-[#3B82F6]/15 border border-[#10B981]/30 flex items-center justify-between text-sm font-medium text-gray-800 dark:text-gray-200 animate-fade-in-down shadow-md">
            <div className="flex items-center gap-2.5">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10B981] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#10B981]"></span>
              </span>
              <span>{kdsNotification}</span>
            </div>
            <Badge variant="outline" className="bg-[#10B981]/20 text-[#10B981] border-none text-xs">
              Live Realtime
            </Badge>
          </div>
        )}

        {/* Main Interactive Screen Container */}
        <div className="max-w-6xl mx-auto bg-white dark:bg-[#1E1E34] rounded-3xl shadow-2xl border border-gray-200/90 dark:border-gray-800 overflow-hidden">
          {/* Top Browser/App Chrome Bar */}
          <div className="px-6 py-3.5 bg-gray-100/90 dark:bg-[#161628] border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-amber-400" />
                <div className="w-3 h-3 rounded-full bg-emerald-400" />
              </div>
              <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>Swadeshi RMS Engine v4.2 · Single Cloud Database & Realtime WebSocket</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[11px] font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Online Sync 100%
              </Badge>
            </div>
          </div>

          {/* TAB 1: UNIFIED KDS & AGGREGATOR SYNC */}
          {activeTab === "kds" && (
            <div className="p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-gray-100 dark:border-gray-800">
                <div>
                  <h3 className="text-xl font-bold text-[#2D3A5F] dark:text-white flex items-center gap-2">
                    <ChefHat className="w-5 h-5 text-[#F26722]" />
                    Unified Kitchen Display System (KDS)
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                    Swiggy, Zomato, QR, and Dine-In orders auto-merge into one kitchen queue. No 3 separate tablets needed.
                  </p>
                </div>
                <div className="flex items-center gap-2.5">
                  <Button
                    onClick={simulateNewIncomingOrder}
                    size="sm"
                    className="bg-gradient-to-r from-[#FC8019] to-[#E23744] text-white hover:opacity-95 font-semibold text-xs rounded-xl shadow-md gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Simulate Swiggy Order
                  </Button>
                  <Button
                    onClick={() => {
                      playChime("toggle");
                      setOrders(initialOrders);
                    }}
                    variant="outline"
                    size="sm"
                    className="text-xs rounded-xl border-gray-200 dark:border-gray-700"
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Reset
                  </Button>
                </div>
              </div>

              {/* KDS Order Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {orders.map((order) => {
                  const isNew = order.status === "NEW";
                  const isCooking = order.status === "COOKING";
                  const isReady = order.status === "READY";
                  const isDispatched = order.status === "DISPATCHED";

                  return (
                    <div
                      key={order.id}
                      className={`rounded-2xl p-4 border transition-all duration-300 flex flex-col justify-between ${
                        isDispatched
                          ? "opacity-50 bg-gray-50 dark:bg-gray-900/40 border-gray-200 dark:border-gray-800"
                          : isNew
                          ? "bg-amber-50/50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-700 shadow-md ring-1 ring-amber-400/30"
                          : isCooking
                          ? "bg-blue-50/40 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800 shadow-sm"
                          : "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-700 shadow-sm"
                      }`}
                    >
                      <div>
                        {/* Ticket Header */}
                        <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-200/60 dark:border-gray-700/60">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-md text-white bg-gradient-to-r ${order.color}`}
                            >
                              {order.channel}
                            </span>
                            <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
                              #{order.id}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-[11px] text-gray-500 font-mono">
                            <Clock className="w-3 h-3 text-gray-400" />
                            <span>{Math.floor(order.timer / 60)}m {order.timer % 60}s</span>
                          </div>
                        </div>

                        {/* Customer & Location */}
                        <div className="text-xs text-gray-600 dark:text-gray-300 mb-2 font-medium">
                          <span className="font-bold text-gray-900 dark:text-white">{order.customer}</span> ·{" "}
                          <span className="text-gray-500">{order.tableOrId}</span>
                        </div>

                        {/* Item List */}
                        <div className="space-y-1.5 my-3">
                          {order.items.map((it, idx) => (
                            <div key={idx} className="flex justify-between text-xs">
                              <span className="text-gray-800 dark:text-gray-200 font-medium">
                                <span className="font-bold text-[#F26722] mr-1.5">{it.qty}x</span>
                                {it.name}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Footer & Action Button */}
                      <div className="pt-3 mt-2 border-t border-gray-200/60 dark:border-gray-700/60">
                        <div className="flex justify-between items-center mb-2.5 text-xs">
                          <span className="text-gray-500">Bill Value:</span>
                          <span className="font-extrabold text-[#2D3A5F] dark:text-white">₹{order.total}</span>
                        </div>

                        <Button
                          onClick={() => handleAdvanceOrderStatus(order.id)}
                          size="sm"
                          disabled={isDispatched}
                          className={`w-full text-xs font-bold py-2 rounded-xl transition-all shadow-sm ${
                            isNew
                              ? "bg-amber-500 hover:bg-amber-600 text-white"
                              : isCooking
                              ? "bg-blue-600 hover:bg-blue-700 text-white"
                              : isReady
                              ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                              : "bg-gray-300 dark:bg-gray-800 text-gray-500"
                          }`}
                        >
                          {isNew && "🔥 Accept & Cook"}
                          {isCooking && "✅ Mark Food Ready"}
                          {isReady && "🚀 Dispatch Order"}
                          {isDispatched && "Completed"}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bottom live stats banner */}
              <div className="mt-6 p-4 rounded-2xl bg-gray-50 dark:bg-[#161628] border border-gray-200 dark:border-gray-800 flex flex-wrap items-center justify-between gap-4 text-xs">
                <div className="flex items-center gap-6">
                  <div>
                    <span className="text-gray-400 block">Active Kitchen Tickets:</span>
                    <span className="font-bold text-sm text-[#2D3A5F] dark:text-white">
                      {orders.filter((o) => o.status !== "DISPATCHED").length} Orders
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 block">Avg Prep Time:</span>
                    <span className="font-bold text-sm text-emerald-600">8.4 mins (-35% faster)</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block">Missed Orders:</span>
                    <span className="font-bold text-sm text-emerald-600">0 (Zero Auto-Cancels)</span>
                  </div>
                </div>
                <div className="text-gray-500 italic">
                  💡 Tip: Click buttons above to test live ticket status transitions.
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: DISH PROFIT MARGIN & RECIPE COSTING */}
          {activeTab === "margin" && (
            <div className="p-6 sm:p-8">
              <div className="mb-6 pb-4 border-b border-gray-100 dark:border-gray-800">
                <h3 className="text-xl font-bold text-[#2D3A5F] dark:text-white flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-500" />
                  Live Recipe Costing & Profit Margin Simulator
                </h3>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                  Know exact profit in Rupees & Percentage per dish before listing on menu or aggregators.
                </p>
              </div>

              {/* Dish Selector Chips */}
              <div className="flex flex-wrap gap-2 mb-6">
                {demoDishes.map((dish, i) => (
                  <button
                    key={dish.name}
                    onClick={() => handleSelectDish(i)}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                      selectedDishIdx === i
                        ? "bg-[#2E3192] text-white shadow-md shadow-[#2E3192]/20"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200"
                    }`}
                  >
                    {dish.name}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                {/* Sliders on Left */}
                <div className="lg:col-span-7 space-y-6">
                  {/* Selling Price Slider */}
                  <div className="p-4 rounded-2xl bg-gray-50 dark:bg-[#161628] border border-gray-200 dark:border-gray-800">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Menu Selling Price</span>
                      <span className="text-base font-extrabold text-[#2D3A5F] dark:text-white">₹{sellingPrice}</span>
                    </div>
                    <input
                      type="range"
                      min={100}
                      max={1000}
                      step={10}
                      value={sellingPrice}
                      onChange={(e) => setSellingPrice(Number(e.target.value))}
                      className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-[#2E3192]"
                    />
                    <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                      <span>₹100</span>
                      <span>₹500</span>
                      <span>₹1,000</span>
                    </div>
                  </div>

                  {/* COGS Slider */}
                  <div className="p-4 rounded-2xl bg-gray-50 dark:bg-[#161628] border border-gray-200 dark:border-gray-800">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                        Raw Ingredient Cost (Meat, Rice, Oil, Spices)
                      </span>
                      <span className="text-base font-extrabold text-[#E23744]">₹{cogs}</span>
                    </div>
                    <input
                      type="range"
                      min={20}
                      max={400}
                      step={5}
                      value={cogs}
                      onChange={(e) => setCogs(Number(e.target.value))}
                      className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-[#E23744]"
                    />
                    <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                      <span>₹20</span>
                      <span>₹200</span>
                      <span>₹400</span>
                    </div>
                  </div>

                  {/* Packaging & Commission Controls */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-gray-50 dark:bg-[#161628] border border-gray-200 dark:border-gray-800">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Packaging / Overheads</span>
                        <span className="text-sm font-bold text-gray-800 dark:text-gray-200">₹{packaging}</span>
                      </div>
                      <input
                        type="range"
                        min={5}
                        max={60}
                        step={1}
                        value={packaging}
                        onChange={(e) => setPackaging(Number(e.target.value))}
                        className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-[#F26722]"
                      />
                    </div>

                    <div className="p-4 rounded-2xl bg-gray-50 dark:bg-[#161628] border border-gray-200 dark:border-gray-800">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Swiggy/Zomato Fee</span>
                        <span className="text-sm font-bold text-[#FC8019]">{aggregatorCommissionPct}%</span>
                      </div>
                      <input
                        type="range"
                        min={15}
                        max={32}
                        step={1}
                        value={aggregatorCommissionPct}
                        onChange={(e) => setAggregatorCommissionPct(Number(e.target.value))}
                        className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-[#FC8019]"
                      />
                    </div>
                  </div>
                </div>

                {/* Profit Margin Comparison Gauge Card on Right */}
                <div className="lg:col-span-5 space-y-4">
                  {/* Direct Dine-In / Own Website Card */}
                  <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/10 border border-emerald-300 dark:border-emerald-700 shadow-md">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        Direct Sale (Dine-In / Own Website)
                      </div>
                      <Badge className="bg-emerald-600 text-white text-[10px]">0% Commission</Badge>
                    </div>
                    <div className="flex items-baseline justify-between mt-2">
                      <div>
                        <span className="text-3xl font-extrabold text-emerald-700 dark:text-emerald-400">
                          ₹{directGrossProfit}
                        </span>
                        <span className="text-xs text-emerald-800 dark:text-emerald-300 font-medium ml-1">
                          net profit/dish
                        </span>
                      </div>
                      <span className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                        {directMarginPct}%
                      </span>
                    </div>
                    <div className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80 mt-1">
                      Food Cost: <span className="font-bold">{foodCostPct}%</span> (Optimal is under 32%)
                    </div>
                  </div>

                  {/* Aggregator Card */}
                  <div className="p-5 rounded-2xl bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-950/30 dark:to-orange-900/10 border border-orange-200 dark:border-orange-800 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-orange-800 dark:text-orange-300">
                        <AlertTriangle className="w-4 h-4 text-orange-500" />
                        Aggregator Sale ({aggregatorCommissionPct}% Cut)
                      </div>
                      <span className="text-xs font-semibold text-red-600">-₹{commissionAmount} fee</span>
                    </div>
                    <div className="flex items-baseline justify-between mt-2">
                      <div>
                        <span className="text-2xl font-extrabold text-orange-700 dark:text-orange-400">
                          ₹{aggregatorGrossProfit}
                        </span>
                        <span className="text-xs text-orange-800 dark:text-orange-300 font-medium ml-1">
                          net profit/dish
                        </span>
                      </div>
                      <span className="text-xl font-bold text-orange-700 dark:text-orange-400">
                        {aggregatorMarginPct}%
                      </span>
                    </div>
                    <div className="text-[11px] text-orange-700/80 dark:text-orange-400/80 mt-1">
                      You lose <span className="font-bold text-red-600">₹{directGrossProfit - aggregatorGrossProfit}</span> per order to platform commissions.
                    </div>
                  </div>

                  {/* Monthly Impact Callout */}
                  <div className="p-4 rounded-xl bg-[#2E3192]/10 border border-[#2E3192]/20 text-xs text-[#2D3A5F] dark:text-gray-200">
                    <span className="font-bold text-[#F26722]">💡 Strategic Impact: </span>
                    If you sell 600 biryanis a month, shifting just 30% to your own free Swadeshi website saves you{" "}
                    <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                      ₹{Math.round(180 * (directGrossProfit - aggregatorGrossProfit)).toLocaleString("en-IN")}/month
                    </span>
                    !
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: 1-CLICK FAST POS PUNCH */}
          {activeTab === "pos" && (
            <div className="p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4 border-b border-gray-100 dark:border-gray-800">
                <div>
                  <h3 className="text-xl font-bold text-[#2D3A5F] dark:text-white flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-[#2E3192]" />
                    Lightning Fast Touch POS Simulator
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                    Captains & cashiers punch a 4-item KOT in under 3 seconds. Touch, customize, send.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-gray-500">Table:</span>
                  {["T-02", "T-04", "T-07", "Takeaway"].map((tbl) => (
                    <button
                      key={tbl}
                      onClick={() => {
                        playChime("toggle");
                        setSelectedTable(tbl);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        selectedTable === tbl
                          ? "bg-[#2E3192] text-white"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300"
                      }`}
                    >
                      {tbl}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Side: Category Pills & Menu Grid */}
                <div className="lg:col-span-8 space-y-4">
                  {/* Category Pills */}
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {posCategories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => {
                          playChime("toggle");
                          setPosCategory(cat);
                        }}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                          posCategory === cat
                            ? "bg-[#F26722] text-white shadow-sm"
                            : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  {/* Menu Items Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {posMenuItems
                      .filter((item) => posCategory === "Bestsellers" || item.category === posCategory)
                      .map((item) => (
                        <button
                          key={item.id}
                          onClick={() => addToCart(item)}
                          className="p-3.5 rounded-2xl bg-gray-50 dark:bg-[#161628] hover:bg-white dark:hover:bg-[#202038] border border-gray-200/80 dark:border-gray-700/60 hover:border-[#2E3192] dark:hover:border-[#F26722] transition-all duration-200 text-left flex flex-col justify-between group shadow-sm hover:shadow-md active:scale-95"
                        >
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span
                                className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                  item.tag === "Veg"
                                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                                    : "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                                }`}
                              >
                                {item.tag}
                              </span>
                              {item.popular && (
                                <span className="text-[9px] font-bold text-[#F26722] flex items-center gap-0.5">
                                  <Flame className="w-2.5 h-2.5" /> Hot
                                </span>
                              )}
                            </div>
                            <h4 className="text-xs font-bold text-gray-900 dark:text-white line-clamp-2 mt-1">
                              {item.name}
                            </h4>
                          </div>

                          <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-200/50 dark:border-gray-700/50">
                            <span className="text-xs font-extrabold text-[#2D3A5F] dark:text-emerald-400">
                              ₹{item.price}
                            </span>
                            <span className="w-6 h-6 rounded-lg bg-[#2E3192]/10 group-hover:bg-[#2E3192] group-hover:text-white text-[#2E3192] dark:text-gray-300 flex items-center justify-center text-xs font-bold transition-colors">
                              +
                            </span>
                          </div>
                        </button>
                      ))}
                  </div>
                </div>

                {/* Right Side: Live Bill / Cart */}
                <div className="lg:col-span-4 rounded-2xl bg-gray-50 dark:bg-[#161628] border border-gray-200 dark:border-gray-700 p-4 flex flex-col justify-between shadow-inner">
                  <div>
                    <div className="flex justify-between items-center pb-2 mb-3 border-b border-gray-200 dark:border-gray-700">
                      <div>
                        <span className="text-xs font-bold text-[#2D3A5F] dark:text-white">Active Ticket</span>
                        <span className="text-[11px] text-gray-500 block">{selectedTable} · Dine-In</span>
                      </div>
                      <Badge variant="outline" className="text-[10px] font-mono">
                        {cart.reduce((a, b) => a + b.qty, 0)} Items
                      </Badge>
                    </div>

                    {/* Cart Item List */}
                    {cart.length === 0 ? (
                      <div className="text-center py-10 text-gray-400 text-xs">
                        <ShoppingBag className="w-8 h-8 mx-auto mb-2 opacity-40" />
                        Tap dishes on left to add to bill
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                        {cart.map((item) => (
                          <div
                            key={item.id}
                            className="p-2 rounded-xl bg-white dark:bg-[#1E1E34] border border-gray-200/70 dark:border-gray-700 flex items-center justify-between text-xs"
                          >
                            <div className="flex-1 pr-2">
                              <p className="font-bold text-gray-800 dark:text-gray-200 truncate">{item.name}</p>
                              <span className="text-[10px] text-gray-400">₹{item.price} each</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => updateCartQty(item.id, -1)}
                                className="w-5 h-5 rounded bg-gray-100 dark:bg-gray-700 flex items-center justify-center font-bold text-gray-600 dark:text-gray-200 hover:bg-gray-200"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="text-xs font-bold w-4 text-center">{item.qty}</span>
                              <button
                                onClick={() => updateCartQty(item.id, 1)}
                                className="w-5 h-5 rounded bg-gray-100 dark:bg-gray-700 flex items-center justify-center font-bold text-gray-600 dark:text-gray-200 hover:bg-gray-200"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                            <span className="font-bold text-[#2D3A5F] dark:text-white ml-2 text-right w-12">
                              ₹{item.price * item.qty}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Bill Summary & KOT Button */}
                  <div className="pt-3 mt-3 border-t border-gray-200 dark:border-gray-700 space-y-1.5 text-xs">
                    <div className="flex justify-between text-gray-500">
                      <span>Subtotal</span>
                      <span>₹{cartSubtotal}</span>
                    </div>
                    <div className="flex justify-between text-gray-500">
                      <span>GST (5%)</span>
                      <span>₹{cartGst}</span>
                    </div>
                    <div className="flex justify-between text-sm font-extrabold text-[#2D3A5F] dark:text-white pt-1 border-t border-gray-200 dark:border-gray-700">
                      <span>Total Payable</span>
                      <span className="text-[#F26722]">₹{cartTotal}</span>
                    </div>

                    <Button
                      onClick={handlePunchKot}
                      disabled={cart.length === 0}
                      className="w-full mt-3 bg-gradient-to-r from-[#2E3192] to-[#F26722] text-white hover:opacity-95 font-bold text-xs py-2.5 rounded-xl shadow-md gap-1.5"
                    >
                      <Receipt className="w-4 h-4" />
                      Punch KOT & Send to Kitchen (0.3s)
                    </Button>
                  </div>
                </div>
              </div>

              {/* KOT Modal Toast */}
              {kotPunchedModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fade-in">
                  <div className="bg-white dark:bg-[#1E1E34] rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-emerald-500/50 text-center animate-scale-in">
                    <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center mx-auto mb-3 text-emerald-600">
                      <CheckCircle2 className="w-7 h-7" />
                    </div>
                    <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                      KOT #9402 Punched!
                    </h4>
                    <p className="text-xs text-gray-500 mb-4">
                      Thermal receipt sent to Kitchen & Bar printers. Bill updated for {selectedTable}.
                    </p>
                    <div className="bg-gray-50 dark:bg-[#161628] rounded-xl p-3 text-xs font-mono text-left space-y-1 mb-4">
                      <div className="flex justify-between font-bold">
                        <span>{selectedTable} · KOT #9402</span>
                        <span>{new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                      <div className="border-t border-dashed border-gray-300 dark:border-gray-700 my-1" />
                      {cart.map((c, i) => (
                        <div key={i} className="flex justify-between">
                          <span>{c.qty}x {c.name}</span>
                          <span>₹{c.price * c.qty}</span>
                        </div>
                      ))}
                      <div className="border-t border-dashed border-gray-300 dark:border-gray-700 my-1" />
                      <div className="flex justify-between font-bold text-[#F26722]">
                        <span>Grand Total</span>
                        <span>₹{cartTotal}</span>
                      </div>
                    </div>
                    <Button
                      onClick={() => setKotPunchedModal(false)}
                      size="sm"
                      className="w-full bg-[#2E3192] text-white rounded-xl text-xs font-semibold"
                    >
                      Done
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: 86 / STOCK AUTO-KILL SYNC */}
          {activeTab === "stock86" && (
            <div className="p-6 sm:p-8">
              <div className="mb-6 pb-4 border-b border-gray-100 dark:border-gray-800">
                <h3 className="text-xl font-bold text-[#2D3A5F] dark:text-white flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-rose-500" />
                  Instant 86'd / Out-of-Stock Multi-Channel Auto Kill
                </h3>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                  When an ingredient finishes in your kitchen, toggle it once. In 0.2 seconds, every affected dish turns "SOLD OUT" on Swiggy, Zomato, QR Menu, and POS simultaneously.
                </p>
              </div>

              {/* Master Switches */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-[#161628] border border-gray-200 dark:border-gray-800 flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white">Fresh Mutton Stock</h4>
                    <p className="text-xs text-gray-500">
                      Status:{" "}
                      <span className={`font-bold ${muttonStockKilled ? "text-red-500" : "text-emerald-500"}`}>
                        {muttonStockKilled ? "0 kg (OUT OF STOCK)" : "14.5 kg (In Stock)"}
                      </span>
                    </p>
                  </div>
                  <Button
                    onClick={toggleMuttonStock}
                    size="sm"
                    className={`text-xs font-bold rounded-xl transition-all ${
                      muttonStockKilled
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                        : "bg-red-600 hover:bg-red-700 text-white"
                    }`}
                  >
                    {muttonStockKilled ? "Restore Mutton Stock" : "Kill Mutton (86 NOW)"}
                  </Button>
                </div>

                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-[#161628] border border-gray-200 dark:border-gray-800 flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white">Amul Butter Batch</h4>
                    <p className="text-xs text-gray-500">
                      Status:{" "}
                      <span className={`font-bold ${butterStockKilled ? "text-red-500" : "text-emerald-500"}`}>
                        {butterStockKilled ? "0 packs (OUT OF STOCK)" : "22 packs (In Stock)"}
                      </span>
                    </p>
                  </div>
                  <Button
                    onClick={toggleButterStock}
                    size="sm"
                    className={`text-xs font-bold rounded-xl transition-all ${
                      butterStockKilled
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                        : "bg-red-600 hover:bg-red-700 text-white"
                    }`}
                  >
                    {butterStockKilled ? "Restore Butter Stock" : "Kill Butter (86 NOW)"}
                  </Button>
                </div>
              </div>

              {/* Live Channel Sync Demonstration Matrix */}
              <div className="rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                <div className="bg-gray-100 dark:bg-[#161628] px-4 py-2.5 text-xs font-bold text-gray-700 dark:text-gray-300 flex justify-between">
                  <span>Dish Name</span>
                  <div className="flex gap-8 text-right pr-2">
                    <span className="w-16">Swiggy</span>
                    <span className="w-16">Zomato</span>
                    <span className="w-16">QR Store</span>
                    <span className="w-16">POS</span>
                  </div>
                </div>

                <div className="divide-y divide-gray-100 dark:divide-gray-800 text-xs">
                  {[
                    { name: "Special Hyderabadi Mutton Biryani", usesMutton: true, usesButter: false },
                    { name: "Mutton Sukka Fry", usesMutton: true, usesButter: false },
                    { name: "Butter Chicken Boneless", usesMutton: false, usesButter: true },
                    { name: "Garlic Butter Naan", usesMutton: false, usesButter: true },
                    { name: "Chicken Dum Biryani", usesMutton: false, usesButter: false },
                  ].map((dish, i) => {
                    const isMuttonDisabled = dish.usesMutton && muttonStockKilled;
                    const isButterDisabled = dish.usesButter && butterStockKilled;
                    const isSoldOut = isMuttonDisabled || isButterDisabled;

                    return (
                      <div
                        key={i}
                        className={`px-4 py-3 flex items-center justify-between transition-colors ${
                          isSoldOut
                            ? "bg-red-50/40 dark:bg-red-950/20 text-gray-400"
                            : "bg-white dark:bg-[#1E1E34] text-gray-800 dark:text-gray-200"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${isSoldOut ? "bg-red-500" : "bg-emerald-500"}`} />
                          <span className={`font-semibold ${isSoldOut ? "line-through text-red-500/80" : ""}`}>
                            {dish.name}
                          </span>
                          {isSoldOut && (
                            <Badge variant="destructive" className="text-[9px] py-0 px-1.5 h-4">
                              Auto-Disabled
                            </Badge>
                          )}
                        </div>

                        <div className="flex gap-8 text-right pr-2 font-semibold">
                          {["Swiggy", "Zomato", "QR Store", "POS"].map((ch) => (
                            <span
                              key={ch}
                              className={`w-16 text-[11px] ${
                                isSoldOut ? "text-red-500 font-bold" : "text-emerald-600 dark:text-emerald-400"
                              }`}
                            >
                              {isSoldOut ? "✖ 86'd" : "✔ Live"}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-4 text-center italic">
                ✨ Zero angry customer calls or bad Zomato reviews due to kitchen stockouts.
              </p>
            </div>
          )}

          {/* TAB 5: REGIONAL LANGUAGE UI TOGGLE */}
          {activeTab === "lang" && (
            <div className="p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4 border-b border-gray-100 dark:border-gray-800">
                <div>
                  <h3 className="text-xl font-bold text-[#2D3A5F] dark:text-white flex items-center gap-2">
                    <Globe className="w-5 h-5 text-indigo-500" />
                    Vernacular / Regional Language Interface
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                    Captains, kitchen staff, and billing operators can use Telugu, Hindi, Tamil, or English with 1 tap.
                  </p>
                </div>

                {/* Language Picker */}
                <div className="flex gap-1.5 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
                  {Object.entries(translations).map(([code, config]) => (
                    <button
                      key={code}
                      onClick={() => {
                        playChime("toggle");
                        setCurrentLang(code as LanguageKey);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        currentLang === code
                          ? "bg-[#2E3192] text-white shadow-sm"
                          : "text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white"
                      }`}
                    >
                      {config.nativeName} ({config.label})
                    </button>
                  ))}
                </div>
              </div>

              {/* Vernacular POS Screen Mock */}
              <div className="p-6 rounded-2xl bg-gray-50 dark:bg-[#161628] border border-gray-200 dark:border-gray-800">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-xs font-bold text-gray-500">
                    Live UI Preview: <span className="text-[#F26722]">{translations[currentLang].nativeName}</span>
                  </span>
                  <Badge className="bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border-none text-[10px]">
                    Zero English barrier for floor staff
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {translations[currentLang].sampleItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl bg-white dark:bg-[#1E1E34] border border-gray-200 dark:border-gray-700 flex justify-between items-center shadow-xs"
                    >
                      <div>
                        <span className="text-[10px] text-gray-400 block">{item.category}</span>
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white mt-0.5">{item.name}</h4>
                      </div>
                      <Badge
                        variant="outline"
                        className="text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 border-emerald-300"
                      >
                        {item.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Bottom Banner */}
        <div className="mt-12 text-center">
          <div className="inline-flex flex-col sm:flex-row items-center gap-4 p-4 sm:p-6 rounded-3xl bg-gradient-to-r from-[#2E3192]/10 via-[#F26722]/10 to-[#2E3192]/10 border border-[#2E3192]/20 max-w-3xl mx-auto shadow-lg">
            <div className="text-left sm:flex-1">
              <h4 className="text-base sm:text-lg font-bold text-[#2D3A5F] dark:text-white">
                Want to see this working with your own restaurant menu?
              </h4>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                Book a 15-minute live on-screen walk-through or on-site demo. We set up everything in 3 days.
              </p>
            </div>
            <a
              href="https://wa.me/918790425317?text=Hi%20Swadeshi%20Solutions%2C%20I%20tried%20your%20interactive%20demo%20and%20want%20to%20see%20it%20with%20my%20restaurant%20menu!"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-[#25D366] to-[#128C7E] text-white font-bold text-sm shadow-md hover:shadow-lg hover:scale-105 transition-all whitespace-nowrap"
            >
              <Smartphone className="w-4 h-4" />
              Book Free WhatsApp Demo
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};
