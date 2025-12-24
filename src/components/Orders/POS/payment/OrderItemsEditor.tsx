/**
 * OrderItemsEditor - Extracted from PaymentDialog
 * Displays order items with add/remove functionality and menu search
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Search, Plus, Minus, Trash2, X } from "lucide-react";
import type { OrderItem } from "@/types/orders";

interface MenuItem {
  id: string;
  name: string;
  price: number;
  category?: string;
}

interface OrderItemsEditorProps {
  existingItems: OrderItem[];
  newItemsBuffer: OrderItem[];
  menuItems: MenuItem[];
  currencySymbol: string;
  onAddMenuItem: (item: MenuItem) => void;
  onRemoveExistingItem: (index: number) => void;
  onRemoveNewItem: (itemId: string) => void;
  onUpdateNewItemQuantity: (itemId: string, quantity: number) => void;
  onSave: () => void;
  onCancel: () => void;
  isSaving?: boolean;
}

const OrderItemsEditor = ({
  existingItems,
  newItemsBuffer,
  menuItems,
  currencySymbol,
  onAddMenuItem,
  onRemoveExistingItem,
  onRemoveNewItem,
  onUpdateNewItemQuantity,
  onSave,
  onCancel,
  isSaving = false,
}: OrderItemsEditorProps) => {
  const [searchQuery, setSearchQuery] = useState("");

  // Filter menu items based on search
  const filteredMenuItems = menuItems.filter(
    (item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.category &&
        item.category.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Calculate new items total
  const newItemsTotal = newItemsBuffer.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  return (
    <div className="space-y-4">
      {/* Existing Items */}
      <div className="space-y-2">
        <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300">
          Current Items
        </h4>
        {existingItems.length === 0 ? (
          <p className="text-sm text-gray-500 italic">No items in order</p>
        ) : (
          <div className="space-y-2">
            {existingItems.map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded"
              >
                <div className="flex-1">
                  <span className="font-medium">{item.name}</span>
                  <span className="text-gray-500 ml-2">x{item.quantity}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm">
                    {currencySymbol}
                    {(item.price * item.quantity).toFixed(2)}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemoveExistingItem(index)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Separator />

      {/* Menu Search */}
      <div className="space-y-2">
        <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300">
          Add Items from Menu
        </h4>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search menu items..."
            className="pl-10"
          />
        </div>
        <ScrollArea className="h-40 border rounded-lg">
          <div className="p-2 space-y-1">
            {filteredMenuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onAddMenuItem(item)}
                className="w-full flex items-center justify-between p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-left transition-colors"
              >
                <span className="font-medium text-sm">{item.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {currencySymbol}
                    {item.price}
                  </span>
                  <Plus className="w-4 h-4 text-green-600" />
                </div>
              </button>
            ))}
            {filteredMenuItems.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">
                No items found
              </p>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* New Items Buffer */}
      {newItemsBuffer.length > 0 && (
        <>
          <Separator />
          <div className="space-y-2">
            <h4 className="font-medium text-sm text-green-700 dark:text-green-300">
              Items to Add ({newItemsBuffer.length})
            </h4>
            <Card className="p-3 bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
              <div className="space-y-2">
                {newItemsBuffer.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between"
                  >
                    <span className="font-medium text-sm">{item.name}</span>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          onUpdateNewItemQuantity(item.id, item.quantity - 1)
                        }
                        className="h-6 w-6 p-0"
                      >
                        <Minus className="w-3 h-3" />
                      </Button>
                      <span className="w-6 text-center">{item.quantity}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          onUpdateNewItemQuantity(item.id, item.quantity + 1)
                        }
                        className="h-6 w-6 p-0"
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                      <span className="text-sm w-16 text-right">
                        {currencySymbol}
                        {(item.price * item.quantity).toFixed(2)}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onRemoveNewItem(item.id)}
                        className="h-6 w-6 p-0 text-red-500"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <Separator className="my-2" />
              <div className="flex justify-between font-medium">
                <span>New Items Total:</span>
                <span className="text-green-700 dark:text-green-300">
                  {currencySymbol}
                  {newItemsTotal.toFixed(2)}
                </span>
              </div>
            </Card>
          </div>
        </>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2 pt-2">
        <Button variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button
          onClick={onSave}
          disabled={newItemsBuffer.length === 0 || isSaving}
          className="flex-1 bg-green-600 hover:bg-green-700"
        >
          {isSaving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
};

export default OrderItemsEditor;
