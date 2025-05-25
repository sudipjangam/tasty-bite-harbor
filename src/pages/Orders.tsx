
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
          
          {/* Improved Toggle with Better Visual Design */}
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setShowPOS(true)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                showPOS 
                  ? 'bg-white dark:bg-gray-600 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              POS Mode
            </button>
            <button
              onClick={() => setShowPOS(false)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                !showPOS 
                  ? 'bg-white dark:bg-gray-600 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Orders View
            </button>
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
