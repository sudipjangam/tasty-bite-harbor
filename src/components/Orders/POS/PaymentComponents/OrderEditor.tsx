import React from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Receipt, Plus, X, Search, Check } from 'lucide-react';
import type { OrderEditorProps } from './types';

const OrderEditor: React.FC<OrderEditorProps> = ({
  orderItems,
  newItemsBuffer,
  filteredMenuItems,
  menuSearchQuery,
  tableNumber,
  onAddItem,
  onRemoveExistingItem,
  onRemoveNewItem,
  onUpdateQuantity,
  onSearchChange,
  onSave,
  onCancel,
}) => {
  return (
    <div className="space-y-4 p-2">
      <Button
        variant="ghost"
        onClick={onCancel}
        className="mb-2"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Order
      </Button>

      <div className="text-center mb-4">
        <h2 className="text-2xl font-bold text-foreground mb-1">Edit Order</h2>
        <p className="text-sm text-muted-foreground">
          Add new items to {tableNumber ? `Table ${tableNumber}` : 'this order'}
        </p>
      </div>

      {/* Previously Sent Items */}
      <Card className="p-4 bg-muted/30">
        <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
          <Receipt className="w-4 h-4" />
          Previously Sent Items
        </h3>
        <div className="space-y-2 max-h-32 overflow-y-auto">
          {orderItems.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between gap-2 text-sm">
              <span className="flex-1">{item.quantity}x {item.name}</span>
              <span className="font-medium">₹{(item.price * item.quantity).toFixed(2)}</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onRemoveExistingItem(idx)}
                className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/20"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      </Card>

      {/* New Items to Add */}
      {newItemsBuffer.length > 0 && (
        <Card className="p-4 bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2 text-green-700 dark:text-green-400">
            <Plus className="w-4 h-4" />
            New Items to Add
          </h3>
          <div className="space-y-3 max-h-40 overflow-y-auto">
            {newItemsBuffer.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-2">
                <span className="text-sm flex-1">{item.name}</span>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                    className="h-7 w-7 p-0"
                  >
                    -
                  </Button>
                  <span className="text-sm font-medium w-8 text-center">{item.quantity}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                    className="h-7 w-7 p-0"
                  >
                    +
                  </Button>
                  <span className="text-sm font-medium w-16 text-right">
                    ₹{(item.price * item.quantity).toFixed(2)}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onRemoveNewItem(item.id)}
                    className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-100"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Search Menu Items */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search menu items..."
            value={menuSearchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Menu Items List */}
        <Card className="max-h-64 overflow-y-auto">
          <div className="p-2 space-y-1">
            {filteredMenuItems.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                {menuSearchQuery ? 'No items found matching your search' : 'No menu items available'}
              </p>
            ) : (
              filteredMenuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onAddItem(item)}
                  className="w-full flex items-center justify-between p-3 hover:bg-accent rounded-lg transition-colors text-left"
                >
                  <div className="flex-1">
                    <p className="font-medium text-sm">{item.name}</p>
                    {item.category && (
                      <p className="text-xs text-muted-foreground">{item.category}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-sm">₹{item.price.toFixed(2)}</span>
                    <Plus className="w-4 h-4 text-green-600" />
                  </div>
                </button>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="pt-2 space-y-2">
        <Button 
          onClick={onSave}
          disabled={newItemsBuffer.length === 0}
          className="w-full bg-green-600 hover:bg-green-700 text-white"
          size="lg"
        >
          <Check className="w-4 h-4 mr-2" />
          Save & Send New Items to Kitchen
        </Button>
        <Button 
          onClick={onCancel}
          variant="outline"
          className="w-full"
        >
          Cancel
        </Button>
      </div>
    </div>
  );
};

export default OrderEditor;
