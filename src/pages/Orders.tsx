
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import POSMode from "@/components/Orders/POS/POSMode";
import OrdersView from "@/components/Orders/OrdersView/OrdersView";

const Orders = () => {
  const [showPOS, setShowPOS] = useState(true);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="flex h-16 items-center justify-between px-4 bg-white dark:bg-gray-800 border-b">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold">Orders Management</h1>
          
          {/* Improved Toggle with Clear Labels */}
          <div className="flex items-center gap-3 bg-gray-100 dark:bg-gray-700 rounded-lg p-2">
            <span className={`text-sm font-medium transition-colors ${showPOS ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400'}`}>
              POS Mode
            </span>
            <Switch
              checked={!showPOS}
              onCheckedChange={(checked) => setShowPOS(!checked)}
              className="data-[state=checked]:bg-indigo-600"
            />
            <span className={`text-sm font-medium transition-colors ${!showPOS ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400'}`}>
              Orders View
            </span>
          </div>
        </div>
      </div>

      <div className="h-[calc(100vh-64px)] overflow-hidden">
        {showPOS ? <POSMode /> : <OrdersView />}
      </div>
    </div>
  );
};

export default Orders;
