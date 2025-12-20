import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, X, Package, Trash2 } from 'lucide-react';
import { useCurrencyContext } from '@/contexts/CurrencyContext';
import { OrderItem } from '@/types/orders';
import { v4 as uuidv4 } from 'uuid';

interface CustomExtrasPanelProps {
  onAddCustomItem: (item: OrderItem) => void;
  customItems?: OrderItem[];
  onRemoveCustomItem?: (id: string) => void;
}

const UNITS = [
  { value: 'piece', label: 'Piece' },
  { value: 'plate', label: 'Plate' },
  { value: 'kg', label: 'Kg' },
  { value: 'g', label: 'Grams' },
  { value: 'L', label: 'Litre' },
  { value: 'ml', label: 'ml' },
  { value: 'unit', label: 'Unit' },
];

export const CustomExtrasPanel: React.FC<CustomExtrasPanelProps> = ({
  onAddCustomItem,
  customItems = [],
  onRemoveCustomItem,
}) => {
  const { symbol: currencySymbol } = useCurrencyContext();
  const [isExpanded, setIsExpanded] = useState(false);
  const [itemName, setItemName] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [itemQuantity, setItemQuantity] = useState('1');
  const [itemUnit, setItemUnit] = useState('piece');

  const handleAddItem = useCallback(() => {
    if (!itemName.trim() || !itemPrice) return;

    const price = parseFloat(itemPrice);
    const quantity = parseFloat(itemQuantity) || 1;
    
    if (isNaN(price) || price <= 0) return;

    const newItem: OrderItem = {
      id: uuidv4(),
      name: itemName.trim(),
      price: price,
      quantity: 1,
      actualQuantity: quantity,
      unit: itemUnit,
      pricingType: 'unit',
      calculatedPrice: price * quantity,
      isCustomExtra: true,
    };

    onAddCustomItem(newItem);
    
    // Reset form
    setItemName('');
    setItemPrice('');
    setItemQuantity('1');
    setItemUnit('piece');
    setIsExpanded(false);
  }, [itemName, itemPrice, itemQuantity, itemUnit, onAddCustomItem]);

  const totalExtras = customItems.reduce(
    (sum, item) => sum + (item.calculatedPrice || item.price * item.quantity),
    0
  );

  return (
    <Card className="bg-gradient-to-r from-purple-50/80 to-pink-50/80 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200/50 dark:border-purple-700/50 rounded-2xl shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg font-bold text-purple-700 dark:text-purple-400">
            <Package className="h-5 w-5" />
            Custom Extras
          </CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="bg-white/80 dark:bg-gray-800/80 border-purple-300 dark:border-purple-600 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded-xl"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Item
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Add Custom Item Form */}
        {isExpanded && (
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl p-4 border border-purple-200 dark:border-purple-700 space-y-4 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Item Name
                </Label>
                <Input
                  placeholder="e.g., Special Garnish"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  className="bg-white/90 dark:bg-gray-700/90 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:border-purple-400"
                />
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Price ({currencySymbol})
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={itemPrice}
                  onChange={(e) => setItemPrice(e.target.value)}
                  className="bg-white/90 dark:bg-gray-700/90 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:border-purple-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Quantity
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={itemQuantity}
                  onChange={(e) => setItemQuantity(e.target.value)}
                  className="bg-white/90 dark:bg-gray-700/90 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:border-purple-400"
                />
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Unit
                </Label>
                <Select value={itemUnit} onValueChange={setItemUnit}>
                  <SelectTrigger className="bg-white/90 dark:bg-gray-700/90 border-2 border-gray-200 dark:border-gray-600 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl border border-white/30 dark:border-gray-700/30 rounded-xl">
                    {UNITS.map((unit) => (
                      <SelectItem key={unit.value} value={unit.value} className="rounded-lg">
                        {unit.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Calculated Preview */}
            {itemName && itemPrice && (
              <div className="bg-purple-100/50 dark:bg-purple-900/30 rounded-lg p-3 border border-purple-200 dark:border-purple-700">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {itemName} ({itemQuantity} {itemUnit})
                  </span>
                  <span className="font-bold text-purple-700 dark:text-purple-400">
                    {currencySymbol}{(parseFloat(itemPrice) * parseFloat(itemQuantity || '1')).toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsExpanded(false)}
                className="rounded-xl"
              >
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleAddItem}
                disabled={!itemName.trim() || !itemPrice || parseFloat(itemPrice) <= 0}
                className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white rounded-xl"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add to Bill
              </Button>
            </div>
          </div>
        )}

        {/* Custom Items List */}
        {customItems.length > 0 && (
          <div className="space-y-2">
            {customItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between bg-white/60 dark:bg-gray-800/60 rounded-lg p-3 border border-purple-100 dark:border-purple-800"
              >
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                    {item.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {item.actualQuantity || item.quantity} {item.unit} × {currencySymbol}{item.price}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-purple-700 dark:text-purple-400">
                    {currencySymbol}{(item.calculatedPrice || item.price * item.quantity).toFixed(2)}
                  </span>
                  {onRemoveCustomItem && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemoveCustomItem(item.id)}
                      className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}

            {/* Total Extras */}
            <div className="flex justify-between items-center pt-2 border-t border-purple-200 dark:border-purple-700">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Total Extras:
              </span>
              <span className="text-lg font-bold text-purple-700 dark:text-purple-400">
                {currencySymbol}{totalExtras.toFixed(2)}
              </span>
            </div>
          </div>
        )}

        {/* Empty State */}
        {customItems.length === 0 && !isExpanded && (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-2">
            No custom items added yet
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default CustomExtrasPanel;
