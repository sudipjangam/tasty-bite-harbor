import React from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tag, X } from 'lucide-react';
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface PromoCodeSectionProps {
  promotionCode: string;
  onPromotionCodeChange: (code: string) => void;
  appliedPromotion: any;
  onApplyPromotion: () => void;
  onRemovePromotion: () => void;
  promotionDiscountAmount: number;
  activePromotions?: any[];
}

const PromoCodeSection: React.FC<PromoCodeSectionProps> = ({
  promotionCode,
  onPromotionCodeChange,
  appliedPromotion,
  onApplyPromotion,
  onRemovePromotion,
  promotionDiscountAmount,
  activePromotions = []
}) => {
  
  const handleSelectPromotion = (promo: any) => {
    onPromotionCodeChange(promo.promotion_code || '');
    // Trigger apply with a small delay to ensure state is updated
    setTimeout(() => {
      onApplyPromotion();
    }, 50);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl">
          <Tag className="h-5 w-5 text-white" />
        </div>
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Promo Code</h3>
      </div>
      
      {!appliedPromotion ? (
        <div className="space-y-3">
          <Label htmlFor="promo-select">Select or Enter Promotion Code</Label>
          <div className="flex gap-2">
            <Select
              value={promotionCode}
              onValueChange={(value) => {
                onPromotionCodeChange(value);
                if (value && value !== "manual") {
                  // Auto-apply when selecting from dropdown
                  setTimeout(() => onApplyPromotion(), 100);
                }
              }}
            >
              <SelectTrigger className="flex-1 bg-white dark:bg-gray-700">
                <SelectValue placeholder="Select a promotion code" />
              </SelectTrigger>
              <SelectContent>
                {activePromotions.length > 0 ? (
                  <>
                    {activePromotions.map((promo) => (
                      <SelectItem key={promo.id} value={promo.promotion_code || ''}>
                        <div className="flex items-center justify-between w-full gap-4">
                          <div className="flex flex-col">
                            <span className="font-semibold">{promo.promotion_code}</span>
                            <span className="text-xs text-muted-foreground">{promo.name}</span>
                          </div>
                          <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200">
                            {promo.discount_percentage ? `${promo.discount_percentage}% off` : `₹${promo.discount_amount} off`}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                    <Separator className="my-1" />
                    <SelectItem value="manual">Enter code manually...</SelectItem>
                  </>
                ) : (
                  <SelectItem value="manual">Enter code manually...</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
          
          {/* Manual entry field - show when "manual" is selected or no promotions */}
          {(promotionCode === "manual" || activePromotions.length === 0) && (
            <div className="flex gap-2">
              <Input
                value={promotionCode === "manual" ? "" : promotionCode}
                onChange={(e) => onPromotionCodeChange(e.target.value)}
                placeholder="Enter promotion code"
                className="flex-1 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    onApplyPromotion();
                  }
                }}
              />
              <Button 
                onClick={onApplyPromotion}
                variant="default"
                className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
              >
                Apply
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl border-2 border-green-300 dark:border-green-700">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <Badge variant="default" className="bg-green-600">
                  {appliedPromotion.code}
                </Badge>
                <span className="text-sm font-semibold text-green-700 dark:text-green-300">
                  {appliedPromotion.name}
                </span>
              </div>
              {appliedPromotion.description && (
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                  {appliedPromotion.description}
                </p>
              )}
              <p className="text-sm font-bold text-green-700 dark:text-green-300">
                Discount: ₹{promotionDiscountAmount.toFixed(2)}
              </p>
            </div>
            <Button
              onClick={onRemovePromotion}
              variant="ghost"
              size="sm"
              className="text-red-600 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/20 ml-2"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PromoCodeSection;
