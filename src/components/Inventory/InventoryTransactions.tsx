
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowUpDown, Package, ShoppingCart, Settings, Trash2, RefreshCw } from "lucide-react";
import { useRestaurantId } from "@/hooks/useRestaurantId";

interface InventoryTransaction {
  id: string;
  transaction_type: string;
  quantity_change: number;
  notes: string;
  created_at: string;
  inventory_item: {
    name: string;
    unit: string;
  };
}

const transactionTypeIcons = {
  purchase: <ShoppingCart className="h-4 w-4" />,
  sale: <ArrowUpDown className="h-4 w-4" />,
  adjustment: <Settings className="h-4 w-4" />,
  waste: <Trash2 className="h-4 w-4" />,
  transfer: <RefreshCw className="h-4 w-4" />,
};

const transactionTypeColors = {
  purchase: "bg-green-100 text-green-800",
  sale: "bg-blue-100 text-blue-800",
  adjustment: "bg-yellow-100 text-yellow-800",
  waste: "bg-red-100 text-red-800",
  transfer: "bg-purple-100 text-purple-800",
};

const InventoryTransactions = () => {
  const [selectedType, setSelectedType] = useState<string>("all");
  const { restaurantId } = useRestaurantId();

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["inventory-transactions", restaurantId, selectedType],
    queryFn: async () => {
      if (!restaurantId) return [];

      let query = supabase
        .from("inventory_transactions")
        .select(`
          *,
          inventory_item:inventory_items(name, unit)
        `)
        .eq("restaurant_id", restaurantId);

      if (selectedType !== "all") {
        query = query.eq("transaction_type", selectedType);
      }

      const { data, error } = await query
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      return data as InventoryTransaction[];
    },
    enabled: !!restaurantId,
  });

  if (isLoading) {
    return <div>Loading transactions...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Package className="h-5 w-5 text-purple-600" />
          Inventory Transactions
        </h2>
        <Select value={selectedType} onValueChange={setSelectedType}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="purchase">Purchase</SelectItem>
            <SelectItem value="sale">Sale</SelectItem>
            <SelectItem value="adjustment">Adjustment</SelectItem>
            <SelectItem value="waste">Waste</SelectItem>
            <SelectItem value="transfer">Transfer</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        {transactions.map((transaction) => (
          <Card key={transaction.id} className="p-4">
            <div className="flex justify-between items-start">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-gray-100">
                  {transactionTypeIcons[transaction.transaction_type as keyof typeof transactionTypeIcons]}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium">{transaction.inventory_item.name}</h3>
                    <Badge className={transactionTypeColors[transaction.transaction_type as keyof typeof transactionTypeColors]}>
                      {transaction.transaction_type}
                    </Badge>
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>
                      <span className={transaction.quantity_change > 0 ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                        {transaction.quantity_change > 0 ? "+" : ""}{transaction.quantity_change}
                      </span> {transaction.inventory_item.unit}
                    </p>
                    {transaction.notes && <p>{transaction.notes}</p>}
                    <p className="text-xs text-gray-400">
                      {new Date(transaction.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {transactions.length === 0 && (
        <Card className="p-6 text-center">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">No Transactions Found</h3>
          <p className="text-gray-500">No inventory transactions match your current filter.</p>
        </Card>
      )}
    </div>
  );
};

export default InventoryTransactions;
