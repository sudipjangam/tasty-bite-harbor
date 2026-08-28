import React, { useState } from "react";
import {
  Globe,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Layers,
  ArrowRight,
  TrendingUp,
  Percent,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useSandbox } from "../context/SandboxContext";

export const SandboxOnlineDeliveryView: React.FC = () => {
  const { orders, simulateOrder, triggerToast } = useSandbox();
  const [swiggyOnline, setSwiggyOnline] = useState(true);
  const [zomatoOnline, setZomatoOnline] = useState(true);
  const [autoAccept, setAutoAccept] = useState(true);

  const swiggyOrders = orders.filter((o) => o.channel === "Swiggy");
  const zomatoOrders = orders.filter((o) => o.channel === "Zomato");

  return (
    <div className="p-4 sm:p-8 space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Globe className="h-6 w-6 text-indigo-600" />
            Online Delivery Aggregators Hub
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Real-time direct API bridge with Swiggy, Zomato & Magicpin (Zero manual punching required)
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            size="sm"
            onClick={() => simulateOrder("Swiggy")}
            className="bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold shadow-md shadow-orange-600/20"
          >
            + Test Inbound Swiggy Order
          </Button>
          <Button
            size="sm"
            onClick={() => simulateOrder("Zomato")}
            className="bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-md shadow-red-600/20"
          >
            + Test Inbound Zomato Order
          </Button>
        </div>
      </div>

      {/* Aggregator Channel Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Swiggy Card */}
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-white/60 dark:border-slate-800 rounded-3xl shadow-xl p-6 space-y-4">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-orange-500 flex items-center justify-center text-white font-extrabold text-lg shadow-md shadow-orange-500/30">
                S
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">Swiggy</h3>
                <span className="text-xs text-slate-400">Direct Partner API</span>
              </div>
            </div>

            <Switch
              checked={swiggyOnline}
              onCheckedChange={(c) => {
                setSwiggyOnline(c);
                triggerToast(c ? "🟢 Swiggy Outlet is now ONLINE" : "🔴 Swiggy Outlet turned OFFLINE");
              }}
              className="data-[state=checked]:bg-orange-500"
            />
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Store Status</span>
              <span className={`font-bold ${swiggyOnline ? "text-emerald-500" : "text-red-500"}`}>
                {swiggyOnline ? "Online & Receiving Orders" : "Closed / Offline"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Commission Rate</span>
              <span className="font-bold text-slate-700 dark:text-slate-300">23% Base</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Active Live Tickets</span>
              <span className="font-bold font-mono text-orange-500">{swiggyOrders.length}</span>
            </div>
          </div>
        </div>

        {/* Zomato Card */}
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-white/60 dark:border-slate-800 rounded-3xl shadow-xl p-6 space-y-4">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-red-600 flex items-center justify-center text-white font-extrabold text-lg shadow-md shadow-red-600/30">
                Z
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">Zomato</h3>
                <span className="text-xs text-slate-400">Direct Partner API</span>
              </div>
            </div>

            <Switch
              checked={zomatoOnline}
              onCheckedChange={(c) => {
                setZomatoOnline(c);
                triggerToast(c ? "🟢 Zomato Outlet is now ONLINE" : "🔴 Zomato Outlet turned OFFLINE");
              }}
              className="data-[state=checked]:bg-red-600"
            />
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Store Status</span>
              <span className={`font-bold ${zomatoOnline ? "text-emerald-500" : "text-red-500"}`}>
                {zomatoOnline ? "Online & Receiving Orders" : "Closed / Offline"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Commission Rate</span>
              <span className="font-bold text-slate-700 dark:text-slate-300">24% Base</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Active Live Tickets</span>
              <span className="font-bold font-mono text-red-500">{zomatoOrders.length}</span>
            </div>
          </div>
        </div>

        {/* Direct 0% Commission WebStore */}
        <div className="bg-gradient-to-br from-cyan-600 to-blue-700 text-white rounded-3xl shadow-xl p-6 space-y-4 shadow-cyan-600/20">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-extrabold uppercase bg-white/20 px-2 py-0.5 rounded-full">
                0% Commission
              </span>
              <h3 className="font-extrabold text-white text-lg mt-2">Direct WebStore</h3>
              <p className="text-xs text-cyan-100">royalhyderabad.in</p>
            </div>
            <Badge className="bg-white text-cyan-800 font-bold text-xs">Active</Badge>
          </div>

          <div className="pt-2 border-t border-white/20 space-y-2 text-xs text-cyan-100">
            <div className="flex justify-between">
              <span>Platform Fee</span>
              <span className="font-bold text-white">0% (Keep 100% Profits)</span>
            </div>
            <div className="flex justify-between">
              <span>WhatsApp Updates</span>
              <span className="font-bold text-white">Automated SMS / WA</span>
            </div>
            <div className="flex justify-between">
              <span>Direct Customer Data</span>
              <span className="font-bold text-white">100% Owned by You</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
