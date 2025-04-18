
import { Receipt, Clock, CheckCircle } from "lucide-react";
import { Card } from "@/components/ui/card";

interface OrderStatsProps {
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
}

const OrderStats = ({ totalOrders, pendingOrders, completedOrders }: OrderStatsProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <Card className="p-4 flex items-center space-x-4">
        <div className="p-3 bg-purple-100 rounded-full">
          <Receipt className="h-6 w-6 text-purple-600" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Total Orders</p>
          <h3 className="text-2xl font-bold text-purple-600">{totalOrders}</h3>
        </div>
      </Card>

      <Card className="p-4 flex items-center space-x-4">
        <div className="p-3 bg-yellow-100 rounded-full">
          <Clock className="h-6 w-6 text-yellow-600" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Pending</p>
          <h3 className="text-2xl font-bold text-yellow-600">{pendingOrders}</h3>
        </div>
      </Card>

      <Card className="p-4 flex items-center space-x-4">
        <div className="p-3 bg-green-100 rounded-full">
          <CheckCircle className="h-6 w-6 text-green-600" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Completed</p>
          <h3 className="text-2xl font-bold text-green-600">{completedOrders}</h3>
        </div>
      </Card>
    </div>
  );
};

export default OrderStats;
