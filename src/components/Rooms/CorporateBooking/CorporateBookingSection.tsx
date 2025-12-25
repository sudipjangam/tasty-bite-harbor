import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Building2, Receipt, MapPin, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCurrencyContext } from "@/contexts/CurrencyContext";

interface CorporateBookingData {
  isCorporate: boolean;
  companyName: string;
  companyGst: string;
  billingAddress: string;
  corporateRate: number | null;
}

interface CorporateBookingSectionProps {
  data: CorporateBookingData;
  onChange: (data: CorporateBookingData) => void;
  roomPrice: number;
  className?: string;
}

const CorporateBookingSection: React.FC<CorporateBookingSectionProps> = ({
  data,
  onChange,
  roomPrice,
  className,
}) => {
  const { symbol: currencySymbol } = useCurrencyContext();

  const updateField = <K extends keyof CorporateBookingData>(
    field: K,
    value: CorporateBookingData[K]
  ) => {
    onChange({ ...data, [field]: value });
  };

  const discount =
    data.corporateRate && data.corporateRate < roomPrice
      ? (((roomPrice - data.corporateRate) / roomPrice) * 100).toFixed(0)
      : null;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Corporate Toggle */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-xl border border-blue-100 dark:border-blue-900">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg">
            <Building2 className="h-5 w-5 text-white" />
          </div>
          <div>
            <Label className="text-base font-semibold text-blue-700 dark:text-blue-400">
              Corporate Booking
            </Label>
            <p className="text-sm text-gray-500">
              Enable for company billing and special rates
            </p>
          </div>
        </div>
        <Switch
          checked={data.isCorporate}
          onCheckedChange={(checked) => updateField("isCorporate", checked)}
        />
      </div>

      {/* Corporate Details */}
      {data.isCorporate && (
        <Card className="p-4 border-blue-200 dark:border-blue-800 bg-white/50 dark:bg-gray-900/50">
          <div className="space-y-4">
            {/* Company Name */}
            <div>
              <Label className="text-sm font-medium flex items-center gap-2">
                <Building2 className="h-4 w-4 text-gray-500" />
                Company Name *
              </Label>
              <Input
                value={data.companyName}
                onChange={(e) => updateField("companyName", e.target.value)}
                placeholder="Enter company name"
                className="mt-1"
              />
            </div>

            {/* GST Number */}
            <div>
              <Label className="text-sm font-medium flex items-center gap-2">
                <Receipt className="h-4 w-4 text-gray-500" />
                GST Number
              </Label>
              <Input
                value={data.companyGst}
                onChange={(e) =>
                  updateField("companyGst", e.target.value.toUpperCase())
                }
                placeholder="e.g. 29ABCDE1234F1Z5"
                className="mt-1"
                maxLength={15}
              />
            </div>

            {/* Corporate Rate */}
            <div>
              <Label className="text-sm font-medium flex items-center gap-2">
                <FileText className="h-4 w-4 text-gray-500" />
                Corporate Rate (per night)
              </Label>
              <div className="flex items-center gap-2 mt-1">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                    {currencySymbol}
                  </span>
                  <Input
                    type="number"
                    value={data.corporateRate || ""}
                    onChange={(e) =>
                      updateField(
                        "corporateRate",
                        e.target.value ? Number(e.target.value) : null
                      )
                    }
                    placeholder={roomPrice.toString()}
                    className="pl-8"
                  />
                </div>
                {discount && (
                  <span className="px-2 py-1 text-sm font-medium text-green-700 bg-green-100 dark:bg-green-900/30 dark:text-green-400 rounded-lg">
                    {discount}% off
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Standard rate: {currencySymbol}
                {roomPrice.toLocaleString()}
              </p>
            </div>

            {/* Billing Address */}
            <div>
              <Label className="text-sm font-medium flex items-center gap-2">
                <MapPin className="h-4 w-4 text-gray-500" />
                Billing Address
              </Label>
              <Textarea
                value={data.billingAddress}
                onChange={(e) => updateField("billingAddress", e.target.value)}
                placeholder="Enter company billing address"
                className="mt-1"
                rows={2}
              />
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default CorporateBookingSection;
