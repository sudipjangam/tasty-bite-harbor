import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Store,
  Flame,
  UtensilsCrossed,
  Settings,
  DollarSign,
  TrendingUp,
  Radio,
  ShoppingBag,
} from "lucide-react";
import { useAggregatorHub } from "@/hooks/useAggregatorHub";
import { AggregatorStoreStatusHeader } from "@/components/Aggregators/AggregatorStoreStatusHeader";
import { AggregatorLiveOrderCard } from "@/components/Aggregators/AggregatorLiveOrderCard";
import { AggregatorMenuMappingTab } from "@/components/Aggregators/AggregatorMenuMappingTab";
import { AggregatorChannelSettingsTab } from "@/components/Aggregators/AggregatorChannelSettingsTab";
import { AggregatorPnLTab } from "@/components/Aggregators/AggregatorPnLTab";
import { AggregatorSimulatorModal } from "@/components/Aggregators/AggregatorSimulatorModal";
import { FeatureLock } from "@/components/Auth/FeatureLock";

export const AggregatorsPage: React.FC = () => {
  const {
    stores,
    orders,
    summaryStats,
    activeTab,
    setActiveTab,
    toggleStore,
    executeOrderAction,
    isUpdatingOrder,
    toggle86,
    simulateOrder,
  } = useAggregatorHub();

  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);

  return (
    <FeatureLock feature="aggregators.view" interceptClicks={true}>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50/30 to-purple-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-gray-950 p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Top Header & Platform Online Switches */}
        <AggregatorStoreStatusHeader
          stores={stores}
          stats={summaryStats}
          onToggleStore={toggleStore}
          onOpenSimulator={() => setIsSimulatorOpen(true)}
        />

        {/* Main Tabs Navigation */}
        <Tabs defaultValue="live-board" className="space-y-6">
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl p-2 rounded-2xl border border-gray-200/50 dark:border-gray-700/50 shadow-md">
            <TabsList className="grid grid-cols-2 md:grid-cols-4 gap-2 bg-transparent h-auto p-0">
              <TabsTrigger
                value="live-board"
                className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-600 data-[state=active]:text-white font-bold text-xs shadow-sm transition-all"
              >
                <Radio className="h-4 w-4" />
                <span>Live Relay Board</span>
                {summaryStats.activeOrdersCount > 0 && (
                  <Badge className="ml-1 bg-white text-orange-600 dark:bg-gray-900 text-[10px] px-1.5 py-0">
                    {summaryStats.activeOrdersCount}
                  </Badge>
                )}
              </TabsTrigger>

              <TabsTrigger
                value="menu-markups"
                className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-600 data-[state=active]:text-white font-bold text-xs shadow-sm transition-all"
              >
                <UtensilsCrossed className="h-4 w-4" />
                <span>Menu & 86ing</span>
              </TabsTrigger>

              <TabsTrigger
                value="pnl"
                className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-600 data-[state=active]:text-white font-bold text-xs shadow-sm transition-all"
              >
                <DollarSign className="h-4 w-4" />
                <span>P&L & Settlement</span>
              </TabsTrigger>

              <TabsTrigger
                value="settings"
                className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-600 data-[state=active]:text-white font-bold text-xs shadow-sm transition-all"
              >
                <Settings className="h-4 w-4" />
                <span>Channel Config</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Tab 1: Live Relay Board */}
          <TabsContent value="live-board" className="space-y-4">
            {/* Channel Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant={activeTab === "all" ? "default" : "outline"}
                onClick={() => setActiveTab("all")}
                className={`rounded-xl text-xs font-semibold ${
                  activeTab === "all"
                    ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                    : ""
                }`}
              >
                All Channels ({orders.length})
              </Button>

              <Button
                size="sm"
                variant={activeTab === "swiggy" ? "default" : "outline"}
                onClick={() => setActiveTab("swiggy")}
                className={`rounded-xl text-xs font-semibold ${
                  activeTab === "swiggy"
                    ? "bg-orange-500 text-white hover:bg-orange-600"
                    : "text-orange-600 hover:bg-orange-50"
                }`}
              >
                Swiggy
              </Button>

              <Button
                size="sm"
                variant={activeTab === "zomato" ? "default" : "outline"}
                onClick={() => setActiveTab("zomato")}
                className={`rounded-xl text-xs font-semibold ${
                  activeTab === "zomato"
                    ? "bg-rose-600 text-white hover:bg-rose-700"
                    : "text-rose-600 hover:bg-rose-50"
                }`}
              >
                Zomato
              </Button>

              <Button
                size="sm"
                variant={activeTab === "magicpin" ? "default" : "outline"}
                onClick={() => setActiveTab("magicpin")}
                className={`rounded-xl text-xs font-semibold ${
                  activeTab === "magicpin"
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "text-blue-600 hover:bg-blue-50"
                }`}
              >
                magicpin
              </Button>
            </div>

            {/* Live Orders Grid */}
            {orders.length === 0 ? (
              <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl p-12 text-center border border-gray-200/50 dark:border-gray-700/50 shadow-sm">
                <div className="w-16 h-16 rounded-full bg-orange-100 dark:bg-orange-950/50 text-orange-500 mx-auto flex items-center justify-center mb-4">
                  <ShoppingBag className="h-8 w-8" />
                </div>
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">
                  No active orders right now
                </h3>
                <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1 mb-4">
                  Incoming orders from Swiggy, Zomato, and magicpin will chime and appear here in real-time.
                </p>
                <Button
                  size="sm"
                  onClick={() => setIsSimulatorOpen(true)}
                  className="rounded-xl bg-gradient-to-r from-orange-500 to-red-600 text-white text-xs font-bold"
                >
                  Fire a Test Simulated Order
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {orders.map((order) => (
                  <AggregatorLiveOrderCard
                    key={order.id}
                    order={order}
                    onAction={executeOrderAction}
                    isUpdating={isUpdatingOrder}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Tab 2: Menu & 86ing */}
          <TabsContent value="menu-markups">
            <AggregatorMenuMappingTab onToggle86={toggle86} />
          </TabsContent>

          {/* Tab 3: P&L & Settlement */}
          <TabsContent value="pnl">
            <AggregatorPnLTab stats={summaryStats} />
          </TabsContent>

          {/* Tab 4: Channel Configuration */}
          <TabsContent value="settings">
            <AggregatorChannelSettingsTab
              stores={stores}
              onSaveStoreSettings={() => {}}
            />
          </TabsContent>
        </Tabs>

        {/* Test Simulator Dialog */}
        <AggregatorSimulatorModal
          isOpen={isSimulatorOpen}
          onClose={() => setIsSimulatorOpen(false)}
          onSimulate={simulateOrder}
        />
      </div>
    </FeatureLock>
  );
};

export default AggregatorsPage;
