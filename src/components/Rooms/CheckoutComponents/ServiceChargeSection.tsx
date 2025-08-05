import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calculator } from "lucide-react";

interface ServiceChargeSectionProps {
  subtotal: number;
  serviceChargeEnabled: boolean;
  serviceChargePercent: number;
  onServiceChargeEnabledChange: (enabled: boolean) => void;
  onServiceChargePercentChange: (percent: number) => void;
}

const ServiceChargeSection: React.FC<ServiceChargeSectionProps> = ({
  subtotal,
  serviceChargeEnabled,
  serviceChargePercent,
  onServiceChargeEnabledChange,
  onServiceChargePercentChange,
}) => {
  const serviceChargeAmount = serviceChargeEnabled 
    ? (subtotal * serviceChargePercent) / 100 
    : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-gradient-to-r from-orange-500 to-red-600 rounded-xl">
          <Calculator className="h-5 w-5 text-white" />
        </div>
        <h3 className="text-lg font-medium text-gray-800 dark:text-gray-100">Service Charge</h3>
      </div>

      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="serviceChargeEnabled"
            checked={serviceChargeEnabled}
            onCheckedChange={(checked) => onServiceChargeEnabledChange(checked as boolean)}
          />
          <Label 
            htmlFor="serviceChargeEnabled" 
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Apply Service Charge
          </Label>
        </div>

        {serviceChargeEnabled && (
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Label htmlFor="serviceChargePercent" className="text-sm min-w-fit">
                Percentage:
              </Label>
              <div className="relative flex-1">
                <Input
                  id="serviceChargePercent"
                  type="number"
                  min="0"
                  max="50"
                  step="0.1"
                  value={serviceChargePercent}
                  onChange={(e) => onServiceChargePercentChange(parseFloat(e.target.value) || 0)}
                  className="pr-8"
                  placeholder="0"
                />
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">
                  %
                </span>
              </div>
            </div>

            <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
              <div className="flex justify-between items-center">
                <span className="text-sm text-orange-700 dark:text-orange-300">Service Charge Amount:</span>
                <span className="font-semibold text-orange-800 dark:text-orange-200">
                  ₹{serviceChargeAmount.toFixed(2)}
                </span>
              </div>
              <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                {serviceChargePercent}% of ₹{subtotal.toFixed(2)}
              </p>
            </div>
          </div>
        )}

        {!serviceChargeEnabled && (
          <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              No service charge will be applied to this bill.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ServiceChargeSection;