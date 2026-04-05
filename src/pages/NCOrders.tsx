import { NCOrdersReport } from "@/components/NC/NCOrdersReport";
import { FeatureLock } from "@/components/Auth/FeatureLock";

const NCOrders = () => {
  return (
    <FeatureLock feature="orders.nc_orders" interceptClicks={true}>
      <NCOrdersReport />
    </FeatureLock>
  );
};

export default NCOrders;
