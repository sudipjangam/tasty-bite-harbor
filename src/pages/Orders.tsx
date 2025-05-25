
import { useState } from "react";
import { ToggleLeft, ToggleRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import POSMode from "@/components/Orders/POS/POSMode";
import OrdersView from "@/components/Orders/OrdersView/OrdersView";

const Orders = () => {
  const [showPOS, setShowPOS] = useState(true);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="flex h-16 items-center justify-between px-4 bg-white dark:bg-gray-800 border-b">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold">Orders Management</h1>
          <Button 
            variant="ghost" 
            onClick={() => setShowPOS(!showPOS)} 
            className="flex items-center gap-2"
          >
            {showPOS ? (
              <ToggleRight className="h-5 w-5 text-indigo-600" />
            ) : (
              <ToggleLeft className="h-5 w-5 text-gray-400" />
            )}
            <span className="text-sm font-medium">
              {showPOS ? "POS Mode" : "Orders View"}
            </span>
          </Button>
        </div>
      </div>

      <div className="h-[calc(100vh-64px)] overflow-hidden">
        {showPOS ? <POSMode /> : <OrdersView />}
      </div>
    </div>
  );
};

export default Orders;
