import React from "react";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import type { SuccessStepProps } from "../types";

interface SuccessStepPropsExtended extends SuccessStepProps {
  tableNumber?: string;
}

export const SuccessStep: React.FC<SuccessStepPropsExtended> = ({
  onClose,
  tableNumber,
}) => {
  return (
    <div className="space-y-6 text-center py-8 p-2">
      <div className="flex justify-center">
        <div className="w-20 h-20 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
          <Check className="w-12 h-12 text-green-600 dark:text-green-400" />
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">
          Payment Successful!
        </h2>
        <p className="text-muted-foreground">
          The order for {tableNumber ? `Table ${tableNumber}` : "POS"} is now
          complete.
        </p>
      </div>

      <Button
        onClick={onClose}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
        size="lg"
      >
        Close
      </Button>
    </div>
  );
};

export default SuccessStep;
