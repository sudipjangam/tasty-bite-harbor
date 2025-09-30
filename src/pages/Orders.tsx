
import { useState } from "react";
import OrdersView from "@/components/Orders/OrdersView/OrdersView";
import { StandardizedLayout } from "@/components/ui/standardized-layout";
import { QuickActionsToolbar, commonQuickActions } from "@/components/ui/quick-actions-toolbar";
import { MobileNavigation } from "@/components/ui/mobile-navigation";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import AddOrderForm from "@/components/Orders/AddOrderForm";
import { useIsMobile } from "@/hooks/use-mobile";

const Orders = () => {
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
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
                Orders Management
              </h1>
              <p className="text-gray-600 text-lg">View and manage all your restaurant orders</p>
            </div>
          </div>
          
          {/* Quick Actions */}
          <div className="bg-white/90 backdrop-blur-sm border border-white/30 rounded-2xl shadow-lg p-4 mb-4">
            <QuickActionsToolbar 
              actions={quickActions}
            />
          </div>
        </StandardizedLayout>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden">
        <OrdersView 
          searchTrigger={searchTrigger}
          filterTrigger={filterTrigger}
          exportTrigger={exportTrigger}
          refreshTrigger={refreshTrigger}
        />
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
