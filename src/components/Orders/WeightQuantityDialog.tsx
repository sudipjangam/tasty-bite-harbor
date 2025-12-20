import React, { useState, useCallback, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
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
import { Scale, Calculator, ShoppingCart } from 'lucide-react';
import { useCurrencyContext } from '@/contexts/CurrencyContext';

interface WeightQuantityDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (quantity: number, unit: string, calculatedPrice: number) => void;
  item: {
    name: string;
    price: number;
    pricingType: 'weight' | 'volume' | 'unit';
    pricingUnit: string;
    baseUnitQuantity?: number;
  };
}

const UNIT_CONVERSIONS: Record<string, Record<string, number>> = {
  // Weight conversions to kg
  kg: { kg: 1, g: 0.001 },
  g: { kg: 1000, g: 1 },
  // Volume conversions to L
  L: { L: 1, ml: 0.001 },
  ml: { L: 1000, ml: 1 },
  // Unit-based (no conversion)
  piece: { piece: 1 },
  plate: { plate: 1 },
  unit: { unit: 1 },
};

const UNIT_GROUPS: Record<string, string[]> = {
  weight: ['kg', 'g'],
  volume: ['L', 'ml'],
  unit: ['piece', 'plate', 'unit'],
};

const QUICK_PRESETS: Record<string, Array<{ label: string; value: number; unit: string }>> = {
  weight: [
    { label: '100g', value: 100, unit: 'g' },
    { label: '250g', value: 250, unit: 'g' },
    { label: '500g', value: 500, unit: 'g' },
    { label: '1kg', value: 1, unit: 'kg' },
  ],
  volume: [
    { label: '100ml', value: 100, unit: 'ml' },
    { label: '250ml', value: 250, unit: 'ml' },
    { label: '500ml', value: 500, unit: 'ml' },
    { label: '1L', value: 1, unit: 'L' },
  ],
  unit: [
    { label: '1 pc', value: 1, unit: 'piece' },
    { label: '2 pcs', value: 2, unit: 'piece' },
    { label: '5 pcs', value: 5, unit: 'piece' },
    { label: '10 pcs', value: 10, unit: 'piece' },
  ],
};

export const WeightQuantityDialog: React.FC<WeightQuantityDialogProps> = ({
  open,
  onClose,
  onConfirm,
  item,
}) => {
  const { symbol: currencySymbol } = useCurrencyContext();
  const [quantity, setQuantity] = useState<string>('');
  const [selectedUnit, setSelectedUnit] = useState<string>(item.pricingUnit || 'kg');

  // Get available units based on pricing type
  const availableUnits = useMemo(() => {
    return UNIT_GROUPS[item.pricingType] || ['piece'];
  }, [item.pricingType]);

  // Get quick presets based on pricing type
  const presets = useMemo(() => {
    return QUICK_PRESETS[item.pricingType] || QUICK_PRESETS.unit;
  }, [item.pricingType]);

  // Calculate price based on input
  const calculatedPrice = useMemo(() => {
    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) return 0;

    const baseUnit = item.pricingUnit || 'kg';
    const baseQty = item.baseUnitQuantity || 1;
    
    // Convert input quantity to base unit
    let qtyInBaseUnit = qty;
    
    // Handle weight conversions
    if (item.pricingType === 'weight') {
      if (selectedUnit === 'g' && baseUnit === 'kg') {
        qtyInBaseUnit = qty / 1000;
      } else if (selectedUnit === 'kg' && baseUnit === 'g') {
        qtyInBaseUnit = qty * 1000;
      }
    }
    
    // Handle volume conversions
    if (item.pricingType === 'volume') {
      if (selectedUnit === 'ml' && baseUnit === 'L') {
        qtyInBaseUnit = qty / 1000;
      } else if (selectedUnit === 'L' && baseUnit === 'ml') {
        qtyInBaseUnit = qty * 1000;
      }
    }

    // Calculate price: (base_price / base_unit_quantity) * actual_quantity
    return (item.price / baseQty) * qtyInBaseUnit;
  }, [quantity, selectedUnit, item]);

  const handlePresetClick = useCallback((preset: { value: number; unit: string }) => {
    setQuantity(preset.value.toString());
    setSelectedUnit(preset.unit);
  }, []);

  const handleConfirm = useCallback(() => {
    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) return;
    
    // Convert to base unit for storage
    let actualQuantity = qty;
    if (item.pricingType === 'weight' && selectedUnit === 'g') {
      actualQuantity = qty / 1000; // Convert g to kg
    } else if (item.pricingType === 'volume' && selectedUnit === 'ml') {
      actualQuantity = qty / 1000; // Convert ml to L
    }
    
    onConfirm(actualQuantity, item.pricingUnit || 'kg', calculatedPrice);
    setQuantity('');
    onClose();
  }, [quantity, selectedUnit, calculatedPrice, item, onConfirm, onClose]);

  const handleClose = useCallback(() => {
    setQuantity('');
    onClose();
  }, [onClose]);

  const isValid = useMemo(() => {
    const qty = parseFloat(quantity);
    return !isNaN(qty) && qty > 0;
  }, [quantity]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl border border-white/30 dark:border-gray-700/30 rounded-2xl shadow-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
            <Scale className="h-5 w-5 text-emerald-600" />
            {item.name}
          </DialogTitle>
          <DialogDescription className="text-gray-600 dark:text-gray-400">
            Price: {currencySymbol}{item.price.toFixed(2)} per {item.pricingUnit || 'kg'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Quick Presets */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Quick Select
            </Label>
            <div className="grid grid-cols-4 gap-2">
              {presets.map((preset) => (
                <Button
                  key={preset.label}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handlePresetClick(preset)}
                  className={`text-xs font-medium transition-all duration-200 ${
                    quantity === preset.value.toString() && selectedUnit === preset.unit
                      ? 'bg-emerald-100 border-emerald-500 text-emerald-700 dark:bg-emerald-900/30 dark:border-emerald-500 dark:text-emerald-400'
                      : 'hover:bg-emerald-50 hover:border-emerald-300 dark:hover:bg-emerald-900/20'
                  }`}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Manual Input */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Or Enter Quantity
            </Label>
            <div className="flex gap-2">
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="Enter quantity"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="flex-1 bg-white/80 dark:bg-gray-700/80 backdrop-blur-sm border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20"
              />
              <Select value={selectedUnit} onValueChange={setSelectedUnit}>
                <SelectTrigger className="w-24 bg-white/80 dark:bg-gray-700/80 border-2 border-gray-200 dark:border-gray-600 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl border border-white/30 dark:border-gray-700/30 rounded-xl">
                  {availableUnits.map((unit) => (
                    <SelectItem key={unit} value={unit} className="rounded-lg">
                      {unit}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Calculated Price Preview */}
          {isValid && (
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-xl p-4 border border-emerald-200 dark:border-emerald-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calculator className="h-5 w-5 text-emerald-600" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Calculated Price:
                  </span>
                </div>
                <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {currencySymbol}{calculatedPrice.toFixed(2)}
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {quantity} {selectedUnit} × {currencySymbol}{item.price}/{item.pricingUnit}
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            className="rounded-xl"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={!isValid}
            className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl disabled:opacity-50"
          >
            <ShoppingCart className="h-4 w-4 mr-2" />
            Add to Order
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default WeightQuantityDialog;
