
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
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  onDiscountPercentChange: (value: number) => void;
  onDiscountAmountChange: (value: number) => void;
}

const DiscountSection: React.FC<DiscountSectionProps> = ({
  subtotal,
  discountPercent,
  discountAmount,
  onDiscountPercentChange,
  onDiscountAmountChange
}) => {
  const [discountType, setDiscountType] = React.useState<'percentage' | 'fixed' | 'none'>(
    discountPercent > 0 ? 'percentage' : discountAmount > 0 ? 'fixed' : 'none'
  );
  
  const calculateDiscountAmount = () => {
    if (discountType === 'none') return 0;
    if (discountType === 'fixed') return discountAmount;
    if (discountType === 'percentage') {
      return (discountPercent / 100) * subtotal;
    }
    return 0;
  };

  const handleDiscountTypeChange = (type: 'percentage' | 'fixed' | 'none') => {
    setDiscountType(type);
    if (type === 'none') {
      onDiscountPercentChange(0);
      onDiscountAmountChange(0);
    }
  };
  
  const calculatedDiscount = calculateDiscountAmount();
  
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Discount</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="discountType">Discount Type</Label>
          <Select 
            value={discountType} 
            onValueChange={(value) => handleDiscountTypeChange(value as 'percentage' | 'fixed' | 'none')}
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
        
        {discountType === 'percentage' && (
          <div className="space-y-2">
            <Label htmlFor="discountPercent">Percentage (%)</Label>
            <Input
              id="discountPercent"
              type="number"
              min={0}
              max={100}
              value={discountPercent}
              onChange={(e) => onDiscountPercentChange(parseFloat(e.target.value) || 0)}
              className="w-full"
            />
          </div>
        )}
        
        {discountType === 'fixed' && (
          <div className="space-y-2">
            <Label htmlFor="discountAmount">Amount (₹)</Label>
            <Input
              id="discountAmount"
              type="number"
              min={0}
              value={discountAmount}
              onChange={(e) => onDiscountAmountChange(parseFloat(e.target.value) || 0)}
              className="w-full"
            />
          </div>
        )}
      </div>
      
      {discountType !== 'none' && calculatedDiscount > 0 && (
        <div className="text-green-700 font-medium mt-2">
          Discount Applied: ₹{calculatedDiscount.toFixed(2)}
        </div>
      )}
    </div>
  );
};

export default DiscountSection;
