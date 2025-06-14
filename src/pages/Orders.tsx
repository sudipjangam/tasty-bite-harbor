
import { useState } from "react";
import { Button } from "@/components/ui/button";
import POSMode from "@/components/Orders/POS/POSMode";
import OrdersView from "@/components/Orders/OrdersView/OrdersView";
import { StandardizedLayout, StandardizedPageHeader } from "@/components/ui/standardized-layout";
import { QuickActionsToolbar, commonQuickActions } from "@/components/ui/quick-actions-toolbar";
import { MobileNavigation } from "@/components/ui/mobile-navigation";
import { Plus, Download, Search, Filter, ShoppingCart, Eye } from "lucide-react";

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-slate-900 dark:to-indigo-950">
      {/* Modern Header with Glass Effect */}
      <div className="bg-white/80 backdrop-blur-xl border-b border-white/20 shadow-xl">
        <StandardizedLayout padding="md">
          <div className="mb-6 bg-white/90 backdrop-blur-sm border border-white/30 rounded-3xl shadow-xl p-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
                  Orders Management
                </h1>
                <p className="text-gray-600 text-lg">Manage your restaurant orders and point of sale system</p>
              </div>
              
              {/* Modern Tab Switcher */}
              <div className="flex items-center gap-2 bg-white/60 backdrop-blur-sm rounded-2xl p-2 border border-white/30 shadow-lg">
                <button
                  onClick={() => setShowPOS(true)}
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${
                    showPOS 
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg transform -translate-y-0.5' 
                      : 'text-gray-600 hover:text-indigo-600 hover:bg-white/50'
                  }`}
                >
                  <ShoppingCart className="h-4 w-4" />
                  POS Mode
                </button>
                <button
                  onClick={() => setShowPOS(false)}
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${
                    !showPOS 
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg transform -translate-y-0.5' 
                      : 'text-gray-600 hover:text-indigo-600 hover:bg-white/50'
                  }`}
                >
                  <Eye className="h-4 w-4" />
                  Orders View
                </button>
              </div>
            </div>
          </div>
          
          {/* Fixed Quick Actions with better visibility */}
          <div className="bg-white/90 backdrop-blur-sm border border-white/30 rounded-2xl shadow-lg p-4 mb-4">
            <QuickActionsToolbar 
              actions={quickActions}
            />
          </div>
        </StandardizedLayout>
      </div>

      <div className="h-[calc(100vh-200px)] overflow-hidden p-6">
        <div className="h-full bg-white/80 backdrop-blur-sm border border-white/20 rounded-3xl shadow-xl overflow-hidden">
          {showPOS ? <POSMode /> : <OrdersView />}
        </div>
      </div>
      
      <MobileNavigation />
    </div>
  );
};

export default Orders;
