/**
 * PromotionApplicator - Extracted from PaymentDialog
 * Handles promotion code input, validation, and display
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { X, Loader2 } from "lucide-react";

interface AppliedPromotion {
  id: string;
  name: string;
  discount_percentage?: number;
  discount_amount?: number;
}

interface PromotionApplicatorProps {
  promotionCode: string;
  appliedPromotion: AppliedPromotion | null;
  currencySymbol: string;
  isValidating?: boolean;
  onCodeChange: (code: string) => void;
  onApply: (code?: string) => void;
  onRemove: () => void;
}

const PromotionApplicator = ({
  promotionCode,
  appliedPromotion,
  currencySymbol,
  isValidating = false,
  onCodeChange,
  onApply,
  onRemove,
}: PromotionApplicatorProps) => {
  const [localCode, setLocalCode] = useState(promotionCode);

  const handleApply = () => {
    onCodeChange(localCode);
    onApply(localCode);
  };

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">Promotion Code</Label>

      {appliedPromotion ? (
        <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
          <div className="flex items-center gap-2">
            <Badge className="bg-green-600 hover:bg-green-700">
              {appliedPromotion.name}
            </Badge>
            <span className="text-sm text-green-700 dark:text-green-300">
              {appliedPromotion.discount_percentage
                ? `${appliedPromotion.discount_percentage}% off`
                : `${currencySymbol}${appliedPromotion.discount_amount} off`}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRemove}
            className="text-red-500 hover:text-red-700 hover:bg-red-50"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <div className="flex gap-2">
          <Input
            value={localCode}
            onChange={(e) => setLocalCode(e.target.value.toUpperCase())}
            placeholder="Enter promotion code"
            className="flex-1"
            onKeyPress={(e) => {
              if (e.key === "Enter") {
                handleApply();
              }
            }}
          />
          <Button
            onClick={handleApply}
            disabled={!localCode.trim() || isValidating}
            className="px-4"
          >
            {isValidating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Apply"
            )}
          </Button>
        </div>
      )}
    </div>
  );
};

export default PromotionApplicator;
