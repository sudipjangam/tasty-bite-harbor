import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Utensils,
  Receipt,
  BellRing,
  ArrowRight,
  Sparkles,
  Clock,
  CheckCircle2,
} from "lucide-react";

interface WelcomeScreenProps {
  restaurantName: string;
  restaurantLogo?: string;
  tableName: string;
  entityType?: "table" | "room";
  activeOrdersCount: number;
  runningTotal: number;
  onStartOrder: () => void;
  onViewBill: () => void;
  onCallWaiter: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  restaurantName,
  restaurantLogo,
  tableName,
  entityType = "table",
  activeOrdersCount,
  runningTotal,
  onStartOrder,
  onViewBill,
  onCallWaiter,
}) => {
  const isRunningOrder = activeOrdersCount > 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-900 via-stone-800 to-black text-white flex flex-col justify-between p-5 sm:p-8">
      {/* Top Bar Branding */}
      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-3">
          {restaurantLogo ? (
            <img
              src={restaurantLogo}
              alt={restaurantName}
              className="w-12 h-12 rounded-2xl object-cover border-2 border-white/20 shadow-lg"
            />
          ) : (
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center font-black text-xl text-white shadow-lg">
              {restaurantName.charAt(0) || "R"}
            </div>
          )}
          <div>
            <h2 className="text-sm font-semibold tracking-wide text-stone-300">
              Welcome to
            </h2>
            <h1 className="text-xl font-black text-white tracking-tight">
              {restaurantName}
            </h1>
          </div>
        </div>

        {/* Table Badge */}
        <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-bold capitalize">
            {entityType} {tableName}
          </span>
        </Badge>
      </div>

      {/* Center Hero Card */}
      <div className="my-auto py-8 text-center max-w-md mx-auto w-full space-y-6">
        <div className="relative inline-block">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-amber-500/30 via-orange-500/20 to-transparent border border-amber-500/30 flex items-center justify-center mx-auto shadow-2xl backdrop-blur-xl">
            <Utensils className="w-12 h-12 text-amber-400 drop-shadow-md" />
          </div>
          <div className="absolute -bottom-2 -right-2 p-1.5 bg-black/60 backdrop-blur-md rounded-full border border-white/10">
            <Sparkles className="w-4 h-4 text-amber-300" />
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Scan. Order. Enjoy.
          </h2>
          <p className="text-stone-400 text-sm max-w-xs mx-auto">
            Order freshly prepared food directly from your phone to your table.
          </p>
        </div>

        {/* Running Tab Banner if active */}
        {isRunningOrder && (
          <Card className="bg-gradient-to-r from-amber-950/70 to-stone-900 border border-amber-500/40 text-left rounded-3xl p-4 shadow-xl">
            <CardContent className="p-0 flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-400 animate-spin" />
                  <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                    Running Table Order
                  </span>
                </div>
                <p className="text-xs text-stone-300">
                  {activeOrdersCount} {activeOrdersCount === 1 ? "order" : "orders"} placed
                </p>
                <p className="text-lg font-black text-white">
                  ₹{runningTotal.toFixed(2)}
                </p>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={onViewBill}
                className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border-amber-500/50 rounded-2xl text-xs font-bold h-9 px-3.5"
              >
                <Receipt className="w-3.5 h-3.5 mr-1.5" />
                View Bill
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Bottom Actions */}
      <div className="space-y-3 max-w-md mx-auto w-full pb-4">
        {/* Main CTA */}
        <Button
          onClick={onStartOrder}
          size="lg"
          className="w-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-white font-extrabold text-base py-6 rounded-2xl shadow-xl shadow-orange-900/40 flex items-center justify-between px-6 transition-all transform active:scale-[0.99]"
        >
          <span>{isRunningOrder ? "Add More Items" : "Order Food"}</span>
          <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
            <ArrowRight className="w-5 h-5 text-white" />
          </div>
        </Button>

        {/* Secondary Row: Check Bill & Call Waiter */}
        <div className="grid grid-cols-2 gap-2.5">
          <Button
            variant="outline"
            onClick={onViewBill}
            className="w-full bg-stone-900/80 hover:bg-stone-800 text-stone-200 border-stone-700/80 rounded-2xl py-5 text-xs font-bold flex items-center justify-center gap-2"
          >
            <Receipt className="w-4 h-4 text-amber-400" />
            Check Bill
          </Button>

          <Button
            variant="outline"
            onClick={onCallWaiter}
            className="w-full bg-stone-900/80 hover:bg-stone-800 text-stone-200 border-stone-700/80 rounded-2xl py-5 text-xs font-bold flex items-center justify-center gap-2"
          >
            <BellRing className="w-4 h-4 text-emerald-400" />
            Call Waiter
          </Button>
        </div>
      </div>
    </div>
  );
};
