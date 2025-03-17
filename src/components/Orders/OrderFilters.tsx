
import React from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShoppingCart, Clock, Check, X } from "lucide-react";

interface OrderFiltersProps {
  statusFilter: string;
  setStatusFilter: (value: string) => void;
}

const OrderFilters: React.FC<OrderFiltersProps> = ({ 
  statusFilter, 
  setStatusFilter 
}) => {
  return (
    <Tabs defaultValue="all" value={statusFilter} onValueChange={setStatusFilter}>
      <TabsList className="mb-4">
        <TabsTrigger value="all" className="flex items-center gap-2">
          <ShoppingCart className="h-4 w-4" />
          All Orders
        </TabsTrigger>
        <TabsTrigger value="pending" className="flex items-center gap-2 text-yellow-600">
          <Clock className="h-4 w-4" />
          Pending
        </TabsTrigger>
        <TabsTrigger value="completed" className="flex items-center gap-2 text-green-600">
          <Check className="h-4 w-4" />
          Completed
        </TabsTrigger>
        <TabsTrigger value="cancelled" className="flex items-center gap-2 text-red-600">
          <X className="h-4 w-4" />
          Cancelled
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
};

export default OrderFilters;
