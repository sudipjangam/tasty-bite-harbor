import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

// --- AUDIO HELPER ---
export const playAudioChime = (freq = 880, duration = 0.15) => {
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
    // Audio context may be restricted by browser before user interaction
  }
};

export interface OrderItem {
  id?: string;
  name: string;
  qty: number;
  price: number;
  station: "Grill" | "Tandoor" | "Curry" | "Pantry" | "Bar";
  isVeg?: boolean;
}

export interface DemoOrder {
  id: string;
  channel: "Swiggy" | "Zomato" | "Dine-in" | "WebStore" | "Room Service";
  tableOrRef: string;
  time: string;
  items: OrderItem[];
  total: number;
  status: "NEW" | "COOKING" | "READY" | "SERVED";
  elapsedSec: number;
  customerName?: string;
  customerPhone?: string;
}

export interface DemoMenuItem {
  id: string;
  name: string;
  category: "Biryani" | "Curries" | "Tandoori & Starters" | "Breads" | "Beverages" | "Desserts";
  price: number;
  cost: number;
  station: "Grill" | "Tandoor" | "Curry" | "Pantry" | "Bar";
  isVeg: boolean;
  isAvailable: boolean; // 86 stock toggle
}

export interface DemoTable {
  id: string;
  name: string;
  section: "AC Dining" | "Main Hall" | "Garden Terrace";
  capacity: number;
  status: "available" | "occupied" | "reserved" | "billing";
  currentOrder?: DemoOrder;
}

const INITIAL_MENU: DemoMenuItem[] = [
  {
    id: "item-1",
    name: "Special Hyderabadi Dum Biryani",
    category: "Biryani",
    price: 340,
    cost: 118,
    station: "Curry",
    isVeg: false,
    isAvailable: true,
  },
  {
    id: "item-2",
    name: "Paneer Butter Masala",
    category: "Curries",
    price: 290,
    cost: 95,
    station: "Curry",
    isVeg: true,
    isAvailable: true,
  },
  {
    id: "item-3",
    name: "Mutton Rogan Josh",
    category: "Curries",
    price: 460,
    cost: 180,
    station: "Curry",
    isVeg: false,
    isAvailable: true,
  },
  {
    id: "item-4",
    name: "Paneer Tikka 65",
    category: "Tandoori & Starters",
    price: 260,
    cost: 82,
    station: "Grill",
    isVeg: true,
    isAvailable: true,
  },
  {
    id: "item-5",
    name: "Murgh Malai Tikka",
    category: "Tandoori & Starters",
    price: 330,
    cost: 120,
    station: "Grill",
    isVeg: false,
    isAvailable: true,
  },
  {
    id: "item-6",
    name: "Butter Garlic Naan",
    category: "Breads",
    price: 65,
    cost: 14,
    station: "Tandoor",
    isVeg: true,
    isAvailable: true,
  },
  {
    id: "item-7",
    name: "Tandoori Roti",
    category: "Breads",
    price: 35,
    cost: 8,
    station: "Tandoor",
    isVeg: true,
    isAvailable: true,
  },
  {
    id: "item-8",
    name: "Virgin Mojito",
    category: "Beverages",
    price: 140,
    cost: 32,
    station: "Bar",
    isVeg: true,
    isAvailable: true,
  },
  {
    id: "item-9",
    name: "Gulab Jamun (2 pcs)",
    category: "Desserts",
    price: 90,
    cost: 24,
    station: "Pantry",
    isVeg: true,
    isAvailable: true,
  },
  {
    id: "item-10",
    name: "Double Ka Meetha",
    category: "Desserts",
    price: 110,
    cost: 30,
    station: "Pantry",
    isVeg: true,
    isAvailable: true,
  },
];

const INITIAL_ORDERS: DemoOrder[] = [
  {
    id: "#4081",
    channel: "Swiggy",
    tableOrRef: "Rider: Suresh (OTP 88)",
    time: "2m ago",
    items: [
      { name: "Special Hyderabadi Dum Biryani", qty: 2, price: 340, station: "Curry", isVeg: false },
      { name: "Gulab Jamun (2 pcs)", qty: 1, price: 90, station: "Pantry", isVeg: true },
    ],
    total: 770,
    status: "NEW",
    elapsedSec: 120,
    customerName: "Ananya Sharma",
    customerPhone: "+91 98765 43210",
  },
  {
    id: "#4080",
    channel: "Dine-in",
    tableOrRef: "Table 6 (AC Section)",
    time: "5m ago",
    items: [
      { name: "Mutton Rogan Josh", qty: 1, price: 460, station: "Curry", isVeg: false },
      { name: "Butter Garlic Naan", qty: 3, price: 65, station: "Tandoor", isVeg: true },
      { name: "Virgin Mojito", qty: 2, price: 140, station: "Bar", isVeg: true },
    ],
    total: 935,
    status: "COOKING",
    elapsedSec: 310,
    customerName: "Rahul Verma",
  },
  {
    id: "#4079",
    channel: "Zomato",
    tableOrRef: "Zomato Pro #Z-991",
    time: "8m ago",
    items: [
      { name: "Paneer Butter Masala", qty: 1, price: 290, station: "Curry", isVeg: true },
      { name: "Tandoori Roti", qty: 4, price: 35, station: "Tandoor", isVeg: true },
    ],
    total: 430,
    status: "READY",
    elapsedSec: 490,
    customerName: "Vikram Reddy",
  },
  {
    id: "#4078",
    channel: "WebStore",
    tableOrRef: "Direct: royalhyderabad.in",
    time: "14m ago",
    items: [
      { name: "Special Hyderabadi Dum Biryani", qty: 2, price: 340, station: "Curry", isVeg: false },
      { name: "Double Ka Meetha", qty: 2, price: 110, station: "Pantry", isVeg: true },
    ],
    total: 900,
    status: "SERVED",
    elapsedSec: 840,
    customerName: "Deepak Patel",
  },
];

const INITIAL_TABLES: DemoTable[] = [
  { id: "t1", name: "Table 1", section: "AC Dining", capacity: 4, status: "available" },
  { id: "t2", name: "Table 2", section: "AC Dining", capacity: 2, status: "occupied" },
  { id: "t3", name: "Table 3", section: "AC Dining", capacity: 6, status: "available" },
  { id: "t4", name: "Table 4", section: "Main Hall", capacity: 4, status: "available" },
  { id: "t5", name: "Table 5", section: "Main Hall", capacity: 4, status: "reserved" },
  {
    id: "t6",
    name: "Table 6",
    section: "AC Dining",
    capacity: 4,
    status: "occupied",
    currentOrder: INITIAL_ORDERS[1],
  },
  { id: "t7", name: "Table 7", section: "Garden Terrace", capacity: 6, status: "available" },
  { id: "t8", name: "Table 8", section: "Garden Terrace", capacity: 8, status: "occupied" },
];

export type SandboxTab =
  | "overview"
  | "orders"
  | "pos"
  | "qsr-pos"
  | "quickserve-pos"
  | "kitchen"
  | "kitchen-tv"
  | "aggregators"
  | "digital-twin"
  | "recipes"
  | "menu"
  | "tables"
  | "inventory"
  | "analytics"
  | "staff"
  | "settings";

interface SandboxContextType {
  activeTab: SandboxTab;
  setActiveTab: (tab: SandboxTab) => void;
  orders: DemoOrder[];
  menuItems: DemoMenuItem[];
  tables: DemoTable[];
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  branch: string;
  setBranch: (branch: string) => void;
  toastMessage: string | null;
  triggerToast: (msg: string) => void;
  printedKOT: DemoOrder | null;
  setPrintedKOT: (order: DemoOrder | null) => void;
  bookingDialogOpen: boolean;
  setBookingDialogOpen: (open: boolean) => void;
  // Simulation Handlers
  simulateOrder: (channel?: DemoOrder["channel"]) => void;
  advanceOrderStatus: (orderId: string) => void;
  toggleItemStock: (itemId: string) => void;
  punchPOSOrder: (tableOrRef: string, items: OrderItem[], channel?: DemoOrder["channel"]) => void;
  resetDemoData: () => void;
}

const SandboxContext = createContext<SandboxContextType | undefined>(undefined);

export const SandboxProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<SandboxTab>("overview");
  const [orders, setOrders] = useState<DemoOrder[]>(INITIAL_ORDERS);
  const [menuItems, setMenuItems] = useState<DemoMenuItem[]>(INITIAL_MENU);
  const [tables, setTables] = useState<DemoTable[]>(INITIAL_TABLES);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [branch, setBranch] = useState("Jubilee Hills (Central Kitchen)");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [printedKOT, setPrintedKOT] = useState<DemoOrder | null>(null);
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    if (soundEnabled) playAudioChime(980, 0.12);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Timer: increment elapsed seconds for active orders
  useEffect(() => {
    const timer = setInterval(() => {
      setOrders((prev) =>
        prev.map((o) => (o.status !== "SERVED" ? { ...o, elapsedSec: o.elapsedSec + 1 } : o))
      );
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Spawner: auto inject orders occasionally if user is idle
  useEffect(() => {
    const spawner = setInterval(() => {
      const channels: DemoOrder["channel"][] = ["Swiggy", "Zomato", "Dine-in", "WebStore"];
      const randomChannel = channels[Math.floor(Math.random() * channels.length)];
      simulateOrder(randomChannel);
    }, 45000);
    return () => clearInterval(spawner);
  }, [soundEnabled]);

  const simulateOrder = (channel: DemoOrder["channel"] = "Swiggy") => {
    const randomNum = Math.floor(4082 + Math.random() * 80);
    const availableItems = menuItems.filter((i) => i.isAvailable);
    const selectedItem = availableItems[Math.floor(Math.random() * availableItems.length)] || menuItems[0];
    const sideItem = availableItems.find((i) => i.id !== selectedItem.id) || menuItems[1];

    const orderItems: OrderItem[] = [
      {
        name: selectedItem.name,
        qty: 1,
        price: selectedItem.price,
        station: selectedItem.station,
        isVeg: selectedItem.isVeg,
      },
      {
        name: sideItem.name,
        qty: 1,
        price: sideItem.price,
        station: sideItem.station,
        isVeg: sideItem.isVeg,
      },
    ];

    const total = orderItems.reduce((acc, curr) => acc + curr.price * curr.qty, 0);

    const newOrder: DemoOrder = {
      id: `#${randomNum}`,
      channel,
      tableOrRef: channel === "Dine-in" ? `Table ${Math.floor(Math.random() * 8 + 1)}` : `Direct Order #${randomNum}`,
      time: "Just now",
      items: orderItems,
      total,
      status: "NEW",
      elapsedSec: 1,
      customerName: channel === "Swiggy" ? "Swiggy Customer" : channel === "Zomato" ? "Zomato Pro User" : "Direct Guest",
    };

    setOrders((prev) => [newOrder, ...prev.slice(0, 15)]);
    triggerToast(`🔔 New ${channel} Order ${newOrder.id} Received!`);
  };

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

  const toggleItemStock = (itemId: string) => {
    setMenuItems((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          const updated = !item.isAvailable;
          triggerToast(
            updated
              ? `🟢 86 Revoked: ${item.name} is back in stock across all channels`
              : `⚡ 86 Kill Switch: ${item.name} is now OUT OF STOCK on Swiggy, Zomato & POS`
          );
          return { ...item, isAvailable: updated };
        }
        return item;
      })
    );
  };

  const punchPOSOrder = (tableOrRef: string, items: OrderItem[], channel: DemoOrder["channel"] = "Dine-in") => {
    const randomNum = Math.floor(5000 + Math.random() * 500);
    const total = items.reduce((sum, item) => sum + item.price * item.qty, 0);

    const newOrder: DemoOrder = {
      id: `#${randomNum}`,
      channel,
      tableOrRef,
      time: "Just now",
      items,
      total,
      status: "NEW",
      elapsedSec: 1,
      customerName: "Dine-In Guest",
    };

    setOrders((prev) => [newOrder, ...prev]);
    setPrintedKOT(newOrder);
    triggerToast(`🧾 KOT Generated: Order ${newOrder.id} punched to Kitchen KDS!`);
  };

  const resetDemoData = () => {
    setOrders(INITIAL_ORDERS);
    setMenuItems(INITIAL_MENU);
    setTables(INITIAL_TABLES);
    triggerToast("🔄 Sandbox demo data has been reset to default state.");
  };

  return (
    <SandboxContext.Provider
      value={{
        activeTab,
        setActiveTab,
        orders,
        menuItems,
        tables,
        soundEnabled,
        setSoundEnabled,
        branch,
        setBranch,
        toastMessage,
        triggerToast,
        printedKOT,
        setPrintedKOT,
        bookingDialogOpen,
        setBookingDialogOpen,
        simulateOrder,
        advanceOrderStatus,
        toggleItemStock,
        punchPOSOrder,
        resetDemoData,
      }}
    >
      {children}
    </SandboxContext.Provider>
  );
};

export const useSandbox = () => {
  const context = useContext(SandboxContext);
  if (!context) {
    throw new Error("useSandbox must be used within a SandboxProvider");
  }
  return context;
};
