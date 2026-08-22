import { useState } from "react";
import OrdersView from "@/components/Orders/OrdersView/OrdersView";
import { FeatureLock } from "@/components/Auth/FeatureLock";

const Orders = () => {
  const [searchTrigger, setSearchTrigger] = useState(0);
  const [filterTrigger, setFilterTrigger] = useState(0);
  const [exportTrigger, setExportTrigger] = useState(0);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

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
        <div className="flex-1 overflow-auto">
          <OrdersView
            searchTrigger={searchTrigger}
            filterTrigger={filterTrigger}
            exportTrigger={exportTrigger}
            refreshTrigger={refreshTrigger}
          />
        </div>
      </FeatureLock>
    </div>
  );
};

export default Orders;
