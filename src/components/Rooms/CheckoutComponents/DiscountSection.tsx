
import React from 'react';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface DiscountSectionProps {
  discountType: 'percentage' | 'fixed' | 'none';
  discountValue: number;
  onDiscountTypeChange: (type: 'percentage' | 'fixed' | 'none') => void;
  onDiscountValueChange: (value: number) => void;
  totalBeforeDiscount: number;
}

const DiscountSection: React.FC<DiscountSectionProps> = ({
  discountType,
  discountValue,
  onDiscountTypeChange,
  onDiscountValueChange,
  totalBeforeDiscount
}) => {
  const calculateDiscountAmount = () => {
    if (discountType === 'none') return 0;
    if (discountType === 'fixed') return discountValue;
    if (discountType === 'percentage') {
      return (discountValue / 100) * totalBeforeDiscount;
    }
    return 0;
  };

  const discountAmount = calculateDiscountAmount();
  
  return (
    <div className="space-y-4 border rounded-md p-4 bg-amber-50">
      <h3 className="text-lg font-semibold text-amber-800">Guest Discount</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="discountType">Discount Type</Label>
          <Select 
            value={discountType} 
            onValueChange={(value) => onDiscountTypeChange(value as 'percentage' | 'fixed' | 'none')}
          >
            <SelectTrigger id="discountType">
              <SelectValue placeholder="Select discount type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No Discount</SelectItem>
              <SelectItem value="percentage">Percentage (%)</SelectItem>
              <SelectItem value="fixed">Fixed Amount (₹)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {discountType !== 'none' && (
          <div className="space-y-2">
            <Label htmlFor="discountValue">
              {discountType === 'percentage' ? 'Percentage (%)' : 'Amount (₹)'}
            </Label>
            <Input
              id="discountValue"
              type="number"
              min={0}
              max={discountType === 'percentage' ? 100 : undefined}
              value={discountValue}
              onChange={(e) => onDiscountValueChange(parseFloat(e.target.value) || 0)}
              className="w-full"
            />
          </div>
        )}
      </div>
      
      {discountType !== 'none' && discountAmount > 0 && (
        <div className="text-green-700 font-medium mt-2">
          Discount Applied: ₹{discountAmount.toFixed(2)}
        </div>
      )}
    </div>
  );
};

export default DiscountSection;
