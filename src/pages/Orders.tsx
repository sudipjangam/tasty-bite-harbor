
import { useState } from "react";
import { Button } from "@/components/ui/button";
import POSMode from "@/components/Orders/POS/POSMode";
import OrdersView from "@/components/Orders/OrdersView/OrdersView";
import { StandardizedLayout, StandardizedPageHeader } from "@/components/ui/standardized-layout";
import { QuickActionsToolbar, commonQuickActions } from "@/components/ui/quick-actions-toolbar";
import { MobileNavigation } from "@/components/ui/mobile-navigation";
import { Plus, Download, Search, Filter } from "lucide-react";

const Orders = () => {
  const [showPOS, setShowPOS] = useState(true);

  const quickActions = [
    commonQuickActions.create(() => console.log('Create new order')),
    commonQuickActions.search(() => console.log('Search orders')),
    commonQuickActions.filter(() => console.log('Filter orders')),
    commonQuickActions.export(() => console.log('Export orders')),
    commonQuickActions.refresh(() => window.location.reload())
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <StandardizedLayout maxWidth="full" padding="none">
        <div className="bg-white border-b">
          <StandardizedLayout padding="md">
            <StandardizedPageHeader
              title="Orders Management"
              description="Manage your restaurant orders and point of sale system"
              actions={
                <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setShowPOS(true)}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                      showPOS 
                        ? 'bg-white text-purple-600 shadow-sm' 
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    POS Mode
                  </button>
                  <button
                    onClick={() => setShowPOS(false)}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                      !showPOS 
                        ? 'bg-white text-purple-600 shadow-sm' 
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Orders View
                  </button>
                </div>
              }
            />
            
            <QuickActionsToolbar 
              actions={quickActions}
              className="mb-4"
            />
          </StandardizedLayout>
        </div>

        <div className="h-[calc(100vh-200px)] overflow-hidden">
          {showPOS ? <POSMode /> : <OrdersView />}
        </div>
      </StandardizedLayout>
      
      <MobileNavigation />
    </div>
  );
};

export default Orders;
