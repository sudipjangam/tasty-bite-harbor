import React, { useState } from "react";
import {
  ChefHat,
  Clock,
  Printer,
  CheckCircle2,
  AlertCircle,
  Flame,
  Filter,
  Check,
  UtensilsCrossed,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSandbox, DemoOrder } from "../context/SandboxContext";

export const SandboxKDSView: React.FC = () => {
  const { orders, advanceOrderStatus, setPrintedKOT } = useSandbox();
  const [selectedStation, setSelectedStation] = useState<string>("ALL");

  const stations = ["ALL", "Curry", "Grill", "Tandoor", "Pantry", "Bar"];

  const activeOrders = orders.filter((o) => o.status !== "SERVED");
  const filteredOrders = activeOrders.filter((order) => {
    if (selectedStation === "ALL") return true;
    return order.items.some((i) => i.station === selectedStation);
  });

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div className="p-4 sm:p-8 space-y-6 pb-20">
      {/* Header & Station Selector */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ChefHat className="h-6 w-6 text-amber-500" />
            Kitchen Display System (Live KDS)
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Real-time station routing, preparation timers & bump-bar order progression
          </p>
        </div>

        {/* Station Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          {stations.map((st) => (
            <button
              key={st}
              onClick={() => setSelectedStation(st)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                selectedStation === st
                  ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              {st === "ALL" ? "All Stations" : `${st} Station`}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Grid */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white/95 dark:bg-slate-900/95 border border-white/60 dark:border-slate-800 rounded-3xl p-16 text-center shadow-sm space-y-3">
          <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            All Kitchen Tickets Cleared!
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            No pending tickets in {selectedStation === "ALL" ? "the kitchen" : `${selectedStation} station`}.
            Simulate a new order from top bar.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {filteredOrders.map((order) => {
            const isLate = order.elapsedSec > 480; // > 8 mins
            const isWarning = order.elapsedSec > 300 && !isLate; // > 5 mins

            const stationItems =
              selectedStation === "ALL"
                ? order.items
                : order.items.filter((i) => i.station === selectedStation);

            return (
              <div
                key={order.id}
                className={`rounded-3xl border flex flex-col justify-between overflow-hidden shadow-lg transition-all ${
                  isLate
                    ? "bg-red-500/5 border-red-500/40 dark:border-red-900 shadow-red-500/10"
                    : isWarning
                    ? "bg-amber-500/5 border-amber-500/40 dark:border-amber-900 shadow-amber-500/10"
                    : "bg-white/95 dark:bg-slate-900/95 border-white/60 dark:border-slate-800 shadow-slate-900/5"
                }`}
              >
                {/* Ticket Header */}
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-base text-slate-900 dark:text-white font-mono">
                        {order.id}
                      </span>
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-bold px-2 py-0.5 ${
                          order.channel === "Swiggy"
                            ? "bg-orange-500/10 text-orange-600 border-orange-500/30"
                            : order.channel === "Zomato"
                            ? "bg-red-500/10 text-red-600 border-red-500/30"
                            : "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                        }`}
                      >
                        {order.channel}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      {order.tableOrRef}
                    </p>
                  </div>

                  {/* Timer Badge */}
                  <div
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-xl font-mono text-xs font-bold ${
                      isLate
                        ? "bg-red-600 text-white animate-pulse"
                        : isWarning
                        ? "bg-amber-500 text-white"
                        : "bg-emerald-600 text-white"
                    }`}
                  >
                    <Clock className="h-3 w-3" />
                    <span>{formatTimer(order.elapsedSec)}</span>
                  </div>
                </div>

                {/* Items Body */}
                <div className="p-4 flex-1 space-y-2.5">
                  {stationItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 px-1.5 py-0.5 rounded">
                          {item.qty}x
                        </span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {item.name}
                        </span>
                      </div>
                      <Badge variant="outline" className="text-[10px] font-mono text-slate-400">
                        {item.station}
                      </Badge>
                    </div>
                  ))}
                </div>

                {/* Ticket Footer Action */}
                <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPrintedKOT(order)}
                    className="h-8 px-2.5 text-xs text-slate-600 dark:text-slate-300 rounded-xl"
                  >
                    <Printer className="h-3.5 w-3.5 mr-1" />
                    Print KOT
                  </Button>

                  <Button
                    size="sm"
                    onClick={() => advanceOrderStatus(order.id)}
                    className={`flex-1 h-8 text-xs font-bold rounded-xl shadow-md ${
                      order.status === "NEW"
                        ? "bg-amber-600 hover:bg-amber-700 text-white"
                        : order.status === "COOKING"
                        ? "bg-blue-600 hover:bg-blue-700 text-white"
                        : "bg-emerald-600 hover:bg-emerald-700 text-white"
                    }`}
                  >
                    {order.status === "NEW" && "👨‍🍳 Start Cooking"}
                    {order.status === "COOKING" && "✅ Mark Ready"}
                    {order.status === "READY" && "🛵 Dispatch / Serve"}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
