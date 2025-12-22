
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowUpDown, Package, ShoppingCart, Settings, Trash2, RefreshCw, Plus, TrendingUp, TrendingDown, Search } from "lucide-react";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import { useToast } from "@/hooks/use-toast";
import { usePagination } from "@/hooks/usePagination";
import { DataTablePagination } from "@/components/ui/data-table-pagination";

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

interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
}

const transactionTypeIcons: Record<string, React.ReactNode> = {
  purchase: <ShoppingCart className="h-4 w-4" />,
  sale: <ArrowUpDown className="h-4 w-4" />,
  adjustment: <Settings className="h-4 w-4" />,
  waste: <Trash2 className="h-4 w-4" />,
  transfer: <RefreshCw className="h-4 w-4" />,
  stock_take: <Package className="h-4 w-4" />,
};

const transactionTypeColors: Record<string, string> = {
  purchase: "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300",
  sale: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300",
  adjustment: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300",
  waste: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300",
  transfer: "bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300",
  stock_take: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/50 dark:text-cyan-300",
};

const InventoryTransactions = () => {
  const [selectedType, setSelectedType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string>("");
  const [transactionType, setTransactionType] = useState<string>("adjustment");
  const [quantityChange, setQuantityChange] = useState<number>(0);
  const [notes, setNotes] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const { restaurantId } = useRestaurantId();
  const { toast } = useToast();
  const queryClient = useQueryClient();

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
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as InventoryTransaction[];
    },
    enabled: !!restaurantId,
  });

  const { data: inventoryItems = [] } = useQuery({
    queryKey: ["inventory-items", restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];

      const { data, error } = await supabase
        .from("inventory_items")
        .select("id, name, quantity, unit")
        .eq("restaurant_id", restaurantId)
        .order("name");

      if (error) throw error;
      return data as InventoryItem[];
    },
    enabled: !!restaurantId,
  });

  const createTransactionMutation = useMutation({
    mutationFn: async () => {
      if (!restaurantId || !selectedItemId) throw new Error("Missing required fields");

      const selectedItem = inventoryItems.find(item => item.id === selectedItemId);
      if (!selectedItem) throw new Error("Item not found");

      // Calculate the actual quantity change (negative for waste/sale, positive for purchase)
      let actualChange = quantityChange;
      if (transactionType === "waste" || transactionType === "sale") {
        actualChange = -Math.abs(quantityChange);
      } else if (transactionType === "adjustment") {
        // For adjustment, use the signed value as entered
        actualChange = quantityChange;
      } else {
        actualChange = Math.abs(quantityChange);
      }

      // Create transaction record
      const { error: transactionError } = await supabase
        .from("inventory_transactions")
        .insert([{
          restaurant_id: restaurantId,
          inventory_item_id: selectedItemId,
          transaction_type: transactionType,
          quantity_change: actualChange,
          notes: notes || null,
        }]);

      if (transactionError) throw transactionError;

      // Update inventory item quantity
      const newQuantity = selectedItem.quantity + actualChange;
      const { error: updateError } = await supabase
        .from("inventory_items")
        .update({ quantity: Math.max(0, newQuantity) })
        .eq("id", selectedItemId);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      toast({ title: "Transaction recorded successfully" });
      setIsAddDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast({
        title: "Error recording transaction",
        description: (error as Error).message,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setSelectedItemId("");
    setTransactionType("adjustment");
    setQuantityChange(0);
    setNotes("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemId || quantityChange === 0) {
      toast({
        title: "Invalid input",
        description: "Please select an item and enter a quantity",
        variant: "destructive",
      });
      return;
    }
    createTransactionMutation.mutate();
  };

  const selectedItem = inventoryItems.find(item => item.id === selectedItemId);

  // Filter transactions by search
  const filteredTransactions = transactions.filter(t => 
    searchQuery === "" || 
    t.inventory_item?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.notes?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const {
    currentPage,
    totalPages,
    paginatedData: paginatedTransactions,
    goToPage,
    startIndex,
    endIndex,
    totalItems
  } = usePagination({
    data: filteredTransactions,
    itemsPerPage,
    initialPage: 1
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-xl font-bold flex items-center gap-2 text-gray-900 dark:text-white">
          <Package className="h-5 w-5 text-emerald-600" />
          Inventory Transactions
        </h2>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-semibold px-4 py-2 rounded-xl shadow-lg">
              <Plus className="mr-2 h-4 w-4" />
              Record Transaction
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[450px] bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
                Record Inventory Transaction
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Select Item *</Label>
                <Select value={selectedItemId} onValueChange={setSelectedItemId}>
                  <SelectTrigger className="bg-white/80 dark:bg-gray-700/80 border-gray-200 dark:border-gray-600 rounded-xl">
                    <SelectValue placeholder="Choose inventory item" />
                  </SelectTrigger>
                  <SelectContent>
                    {inventoryItems.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name} ({item.quantity} {item.unit})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Transaction Type *</Label>
                <Select value={transactionType} onValueChange={setTransactionType}>
                  <SelectTrigger className="bg-white/80 dark:bg-gray-700/80 border-gray-200 dark:border-gray-600 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="purchase">
                      <span className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-green-600" />
                        Purchase (Add Stock)
                      </span>
                    </SelectItem>
                    <SelectItem value="sale">
                      <span className="flex items-center gap-2">
                        <TrendingDown className="h-4 w-4 text-blue-600" />
                        Sale (Reduce Stock)
                      </span>
                    </SelectItem>
                    <SelectItem value="waste">
                      <span className="flex items-center gap-2">
                        <Trash2 className="h-4 w-4 text-red-600" />
                        Waste/Spoilage
                      </span>
                    </SelectItem>
                    <SelectItem value="adjustment">
                      <span className="flex items-center gap-2">
                        <Settings className="h-4 w-4 text-yellow-600" />
                        Adjustment (+/-)
                      </span>
                    </SelectItem>
                    <SelectItem value="transfer">
                      <span className="flex items-center gap-2">
                        <RefreshCw className="h-4 w-4 text-purple-600" />
                        Transfer
                      </span>
                    </SelectItem>
                    <SelectItem value="stock_take">
                      <span className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-cyan-600" />
                        Stock Take Correction
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Quantity {transactionType === "adjustment" ? "(+ to add, - to reduce)" : ""} *
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  value={quantityChange}
                  onChange={(e) => setQuantityChange(parseFloat(e.target.value) || 0)}
                  placeholder={transactionType === "adjustment" ? "e.g. +5 or -3" : "Enter quantity"}
                  className="bg-white/80 dark:bg-gray-700/80 border-gray-200 dark:border-gray-600 rounded-xl"
                />
                {selectedItem && (
                  <p className="text-xs text-gray-500 mt-1">
                    Current stock: {selectedItem.quantity} {selectedItem.unit}
                    {quantityChange !== 0 && (
                      <span className="ml-2">
                        → New: {Math.max(0, selectedItem.quantity + (
                          transactionType === "waste" || transactionType === "sale" 
                            ? -Math.abs(quantityChange) 
                            : transactionType === "adjustment" 
                              ? quantityChange 
                              : Math.abs(quantityChange)
                        ))} {selectedItem.unit}
                      </span>
                    )}
                  </p>
                )}
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Notes</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Reason for this transaction..."
                  rows={2}
                  className="bg-white/80 dark:bg-gray-700/80 border-gray-200 dark:border-gray-600 rounded-xl"
                />
              </div>

              <Button 
                type="submit" 
                disabled={createTransactionMutation.isPending}
                className="w-full bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-semibold py-3 rounded-xl shadow-lg"
              >
                {createTransactionMutation.isPending ? "Recording..." : "Record Transaction"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search transactions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-white/80 dark:bg-gray-700/80 border-gray-200 dark:border-gray-600 rounded-xl"
          />
        </div>
        <Select value={selectedType} onValueChange={setSelectedType}>
          <SelectTrigger className="w-full md:w-[200px] bg-white/80 dark:bg-gray-700/80 border-gray-200 dark:border-gray-600 rounded-xl">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="purchase">Purchase</SelectItem>
            <SelectItem value="sale">Sale</SelectItem>
            <SelectItem value="adjustment">Adjustment</SelectItem>
            <SelectItem value="waste">Waste</SelectItem>
            <SelectItem value="transfer">Transfer</SelectItem>
            <SelectItem value="stock_take">Stock Take</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Transactions List */}
      <div className="space-y-3">
        {filteredTransactions.length === 0 ? (
          <Card className="p-8 text-center bg-white/90 dark:bg-gray-800/90 rounded-xl">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">No Transactions Found</h3>
            <p className="text-gray-500 dark:text-gray-400">
              {searchQuery || selectedType !== "all" 
                ? "Try adjusting your filters" 
                : "Record your first transaction to get started"}
            </p>
          </Card>
        ) : (
          paginatedTransactions.map((transaction) => (
            <Card key={transaction.id} className="p-4 bg-white/90 dark:bg-gray-800/90 rounded-xl hover:shadow-md transition-all">
              <div className="flex justify-between items-start">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-xl ${transactionTypeColors[transaction.transaction_type] || "bg-gray-100"}`}>
                    {transactionTypeIcons[transaction.transaction_type] || <Package className="h-4 w-4" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-gray-900 dark:text-white">{transaction.inventory_item?.name || "Unknown Item"}</h3>
                      <Badge className={transactionTypeColors[transaction.transaction_type]}>
                        {transaction.transaction_type.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                      <p>
                        <span className={`font-semibold ${transaction.quantity_change > 0 ? "text-green-600" : "text-red-600"}`}>
                          {transaction.quantity_change > 0 ? "+" : ""}{transaction.quantity_change}
                        </span> {transaction.inventory_item?.unit || "units"}
                      </p>
                      {transaction.notes && <p className="text-gray-500">{transaction.notes}</p>}
                      <p className="text-xs text-gray-400">
                        {new Date(transaction.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {totalPages > 1 && (
        <DataTablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          itemsPerPage={itemsPerPage}
          startIndex={startIndex}
          endIndex={endIndex}
          onPageChange={goToPage}
          onItemsPerPageChange={setItemsPerPage}
          showItemsPerPage={true}
        />
      )}
    </div>
  );
};

export default InventoryTransactions;
