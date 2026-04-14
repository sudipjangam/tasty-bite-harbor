import { useState } from "react";
import OrdersView from "@/components/Orders/OrdersView/OrdersView";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import AddOrderForm from "@/components/Orders/AddOrderForm";
import { useIsMobile } from "@/hooks/use-mobile";
import HelpProvider from "@/components/Help/HelpProvider";
import { FeatureLock } from "@/components/Auth/FeatureLock";

const Orders = () => {
  const [showAddOrderDialog, setShowAddOrderDialog] = useState(false);
  const [searchTrigger, setSearchTrigger] = useState(0);
  const [filterTrigger, setFilterTrigger] = useState(0);
  const [exportTrigger, setExportTrigger] = useState(0);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen bg-[#f0f4ff]" style={{
      backgroundImage: `
        radial-gradient(ellipse at 10% 0%, rgba(29,78,216,0.12) 0%, transparent 50%),
        radial-gradient(ellipse at 90% 0%, rgba(249,115,22,0.10) 0%, transparent 50%),
        radial-gradient(ellipse at 50% 100%, rgba(29,78,216,0.08) 0%, transparent 60%)
      `
    }}>
      {/* Main Content Area */}
      <FeatureLock feature="orders.view" interceptClicks={true}>
        <div className="flex-1 overflow-hidden">
          <OrdersView
            searchTrigger={searchTrigger}
            filterTrigger={filterTrigger}
            exportTrigger={exportTrigger}
            refreshTrigger={refreshTrigger}
          />
        </div>
      </FeatureLock>

      {/* Add Order Dialog */}
      <Dialog open={showAddOrderDialog} onOpenChange={setShowAddOrderDialog}>
        <DialogContent
          className={`${isMobile ? "w-[95%] max-w-lg" : "max-w-5xl"} max-h-[95vh] overflow-y-auto p-0`}
        >
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
