import { useState } from "react";
import OrdersView from "@/components/Orders/OrdersView/OrdersView";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import AddOrderForm from "@/components/Orders/AddOrderForm";
import { useIsMobile } from "@/hooks/use-mobile";
import { ClipboardList, Sparkles, Package, Zap } from "lucide-react";

const Orders = () => {
  const [showAddOrderDialog, setShowAddOrderDialog] = useState(false);
  const [searchTrigger, setSearchTrigger] = useState(0);
  const [filterTrigger, setFilterTrigger] = useState(0);
  const [exportTrigger, setExportTrigger] = useState(0);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-100 dark:from-gray-900 dark:via-slate-900 dark:to-indigo-950">
      {/* Modern 3D Header with Vibrant Gradient */}
      <div className="sticky top-0 z-40">
        <div className="relative overflow-hidden">
          {/* 3D Gradient Background */}
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600"></div>
          <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent"></div>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-yellow-400/20 via-transparent to-transparent"></div>
          
          {/* Decorative Elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-white/20 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/4"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-purple-400/30 to-transparent rounded-full blur-2xl translate-y-1/2 -translate-x-1/4"></div>
          <div className="absolute top-1/2 left-1/2 w-32 h-32 bg-pink-400/20 rounded-full blur-2xl -translate-x-1/2 -translate-y-1/2"></div>
          
          {/* Content */}
          <div className="relative py-4 md:py-6 px-4 md:px-6">
            <div className="flex items-center gap-4">
              {/* 3D Icon Badge */}
              <div className="relative">
                <div className="absolute inset-0 bg-white/30 rounded-2xl blur-lg"></div>
                <div className="relative p-3 md:p-4 bg-white/20 backdrop-blur-sm border border-white/30 rounded-2xl shadow-2xl">
                  <ClipboardList className="w-6 h-6 md:w-8 md:h-8 text-white drop-shadow-lg" />
                </div>
              </div>
              
              {/* Title */}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-2xl md:text-4xl font-bold text-white drop-shadow-lg tracking-tight">
                    Orders Management
                  </h1>
                  <Sparkles className="w-5 h-5 md:w-6 md:h-6 text-yellow-300 animate-pulse" />
                </div>
                <p className="text-white/80 text-sm md:text-base font-medium flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Track and manage all your restaurant orders
                </p>
              </div>
            </div>
          </div>
          
          {/* Bottom Glow Effect */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-yellow-400 via-pink-400 to-purple-500"></div>
        </div>
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
      
    </div>
  );
};

export default Orders;
