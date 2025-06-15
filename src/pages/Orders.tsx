
import { useState } from "react";
import { Button } from "@/components/ui/button";
import POSMode from "@/components/Orders/POS/POSMode";
import OrdersView from "@/components/Orders/OrdersView/OrdersView";
import { StandardizedLayout, StandardizedPageHeader } from "@/components/ui/standardized-layout";
import { QuickActionsToolbar, commonQuickActions } from "@/components/ui/quick-actions-toolbar";
import { MobileNavigation } from "@/components/ui/mobile-navigation";
import { Plus, Download, Search, Filter, ShoppingCart, Eye } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import AddOrderForm from "@/components/Orders/AddOrderForm";
import { useIsMobile } from "@/hooks/use-mobile";

const Orders = () => {
  const [showPOS, setShowPOS] = useState(true);
  const [showAddOrderDialog, setShowAddOrderDialog] = useState(false);
  const [searchTrigger, setSearchTrigger] = useState(0);
  const [filterTrigger, setFilterTrigger] = useState(0);
  const [exportTrigger, setExportTrigger] = useState(0);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const isMobile = useIsMobile();

  const handleCreateNew = () => {
    setShowAddOrderDialog(true);
  };

  const handleSearch = () => {
    // Trigger search functionality in OrdersView
    setSearchTrigger(prev => prev + 1);
  };

  const handleFilter = () => {
    // Trigger filter functionality in OrdersView
    setFilterTrigger(prev => prev + 1);
  };

  const handleExport = () => {
    // Trigger export functionality in OrdersView
    setExportTrigger(prev => prev + 1);
  };

  const handleRefresh = () => {
    // Trigger refresh functionality in OrdersView
    setRefreshTrigger(prev => prev + 1);
    window.location.reload();
  };

  const quickActions = [
    commonQuickActions.create(handleCreateNew),
    commonQuickActions.search(handleSearch),
    commonQuickActions.filter(handleFilter),
    commonQuickActions.export(handleExport),
    commonQuickActions.refresh(handleRefresh)
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-slate-900 dark:to-indigo-950">
      {/* Modern Header with Glass Effect */}
      <div className="bg-white/80 backdrop-blur-xl border-b border-white/20 shadow-xl sticky top-0 z-40">
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
          
          {/* Quick Actions - Only show in Orders View mode */}
          {!showPOS && (
            <div className="bg-white/90 backdrop-blur-sm border border-white/30 rounded-2xl shadow-lg p-4 mb-4">
              <QuickActionsToolbar 
                actions={quickActions}
              />
            </div>
          )}
        </StandardizedLayout>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden">
        {showPOS ? (
          <POSMode />
        ) : (
          <OrdersView 
            searchTrigger={searchTrigger}
            filterTrigger={filterTrigger}
            exportTrigger={exportTrigger}
            refreshTrigger={refreshTrigger}
          />
        )}
      </div>
      
      {/* Add Order Dialog */}
      <Dialog open={showAddOrderDialog} onOpenChange={setShowAddOrderDialog}>
        <DialogContent className={`${isMobile ? 'w-[95%] max-w-lg' : 'max-w-5xl'} max-h-[95vh] overflow-y-auto p-0`}>
          <AddOrderForm
            onSuccess={() => setShowAddOrderDialog(false)}
            onCancel={() => setShowAddOrderDialog(false)}
          />
        </DialogContent>
      </Dialog>
      
      <MobileNavigation />
    </div>
  );
};

export default Orders;
