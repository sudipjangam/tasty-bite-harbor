import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSplitBilling, SplitPortion } from "@/hooks/useSplitBilling";
import { useCurrencyContext } from "@/contexts/CurrencyContext";
import {
  Split,
  Percent,
  Equal,
  User,
  Phone,
  Loader2,
  Plus,
  Trash2,
  Calculator,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SplitBillingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  checkIn: {
    id: string;
    guest_name: string;
    total_amount: number;
  } | null;
  onSuccess?: () => void;
}

interface PortionForm {
  payerName: string;
  payerPhone: string;
  percentage: number;
  amount: number;
}

const SplitBillingDialog: React.FC<SplitBillingDialogProps> = ({
  open,
  onOpenChange,
  checkIn,
  onSuccess,
}) => {
  const {
    createSplit,
    isCreating,
    calculateEqualSplit,
    calculatePercentageSplit,
  } = useSplitBilling();
  const { symbol: currencySymbol } = useCurrencyContext();

  const [splitMethod, setSplitMethod] = useState<"equal" | "percentage">(
    "equal"
  );
  const [numPayers, setNumPayers] = useState(2);
  const [portions, setPortions] = useState<PortionForm[]>([
    { payerName: "", payerPhone: "", percentage: 50, amount: 0 },
    { payerName: "", payerPhone: "", percentage: 50, amount: 0 },
  ]);

  // Update portions when method or num payers changes
  useEffect(() => {
    if (!checkIn) return;

    if (splitMethod === "equal") {
      const amounts = calculateEqualSplit(checkIn.total_amount, numPayers);
      const pct = 100 / numPayers;
      setPortions(
        amounts.map((amount, i) => ({
          payerName: i === 0 ? checkIn.guest_name : "",
          payerPhone: "",
          percentage: pct,
          amount,
        }))
      );
    } else {
      // Keep existing portions or create new ones
      const newPortions: PortionForm[] = [];
      for (let i = 0; i < numPayers; i++) {
        if (portions[i]) {
          newPortions.push(portions[i]);
        } else {
          newPortions.push({
            payerName: "",
            payerPhone: "",
            percentage: 0,
            amount: 0,
          });
        }
      }
      setPortions(newPortions);
    }
  }, [splitMethod, numPayers, checkIn?.total_amount]);

  // Recalculate amounts when percentages change
  useEffect(() => {
    if (splitMethod === "percentage" && checkIn) {
      const amounts = calculatePercentageSplit(
        checkIn.total_amount,
        portions.map((p) => p.percentage)
      );
      setPortions((prev) =>
        prev.map((p, i) => ({ ...p, amount: amounts[i] || 0 }))
      );
    }
  }, [portions.map((p) => p.percentage).join(","), splitMethod]);

  const updatePortion = (
    index: number,
    field: keyof PortionForm,
    value: string | number
  ) => {
    setPortions((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const totalPercentage = portions.reduce((sum, p) => sum + p.percentage, 0);
  const totalAmount = portions.reduce((sum, p) => sum + p.amount, 0);
  const isValid =
    portions.every((p) => p.payerName) &&
    Math.abs(totalPercentage - 100) < 0.01 &&
    Math.abs(totalAmount - (checkIn?.total_amount || 0)) < 0.01;

  const handleSplit = async () => {
    if (!checkIn || !isValid) return;

    try {
      await createSplit({
        checkInId: checkIn.id,
        originalAmount: checkIn.total_amount,
        splitMethod,
        portions: portions.map((p) => ({
          payerName: p.payerName,
          payerPhone: p.payerPhone,
          amount: p.amount,
          percentage: p.percentage,
        })),
      });
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error("Split failed:", error);
    }
  };

  if (!checkIn) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-2xl">
        <DialogHeader className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 p-5 -m-6 mb-4 border-b border-purple-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl shadow-lg">
              <Split className="h-5 w-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Split Bill
              </DialogTitle>
              <DialogDescription className="text-gray-600">
                Split {currencySymbol}
                {checkIn.total_amount.toLocaleString()} between multiple payers
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5">
          {/* Split Method */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Split Method</Label>
            <RadioGroup
              value={splitMethod}
              onValueChange={(v) => setSplitMethod(v as "equal" | "percentage")}
              className="flex gap-4"
            >
              <div
                className={cn(
                  "flex-1 flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all",
                  splitMethod === "equal"
                    ? "border-purple-500 bg-purple-50"
                    : "border-gray-200 hover:border-gray-300"
                )}
              >
                <RadioGroupItem value="equal" id="equal" />
                <Equal className="h-5 w-5 text-purple-500" />
                <Label htmlFor="equal" className="cursor-pointer font-medium">
                  Equal Split
                </Label>
              </div>
              <div
                className={cn(
                  "flex-1 flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all",
                  splitMethod === "percentage"
                    ? "border-purple-500 bg-purple-50"
                    : "border-gray-200 hover:border-gray-300"
                )}
              >
                <RadioGroupItem value="percentage" id="percentage" />
                <Percent className="h-5 w-5 text-purple-500" />
                <Label
                  htmlFor="percentage"
                  className="cursor-pointer font-medium"
                >
                  Custom %
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Number of Payers */}
          <div className="space-y-2">
            <Label>Number of Payers</Label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => numPayers > 2 && setNumPayers(numPayers - 1)}
                disabled={numPayers <= 2}
              >
                -
              </Button>
              <span className="w-12 text-center font-semibold text-lg">
                {numPayers}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => numPayers < 10 && setNumPayers(numPayers + 1)}
                disabled={numPayers >= 10}
              >
                +
              </Button>
            </div>
          </div>

          {/* Portions */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Payer Details</Label>
            <ScrollArea className="h-[250px] pr-4">
              <div className="space-y-3">
                {portions.map((portion, index) => (
                  <Card key={index} className="p-4 border-gray-200">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-700">
                          Payer {index + 1}
                        </span>
                        <span className="text-lg font-bold text-purple-600">
                          {currencySymbol}
                          {portion.amount.toFixed(2)}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs text-gray-500">
                            Name *
                          </Label>
                          <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                              value={portion.payerName}
                              onChange={(e) =>
                                updatePortion(
                                  index,
                                  "payerName",
                                  e.target.value
                                )
                              }
                              placeholder="Payer name"
                              className="pl-9"
                            />
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs text-gray-500">Phone</Label>
                          <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                              value={portion.payerPhone}
                              onChange={(e) =>
                                updatePortion(
                                  index,
                                  "payerPhone",
                                  e.target.value
                                )
                              }
                              placeholder="Phone"
                              className="pl-9"
                            />
                          </div>
                        </div>
                      </div>

                      {splitMethod === "percentage" && (
                        <div>
                          <Label className="text-xs text-gray-500">
                            Percentage
                          </Label>
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              value={portion.percentage}
                              onChange={(e) =>
                                updatePortion(
                                  index,
                                  "percentage",
                                  Number(e.target.value)
                                )
                              }
                              min={0}
                              max={100}
                              className="w-24"
                            />
                            <span className="text-gray-500">%</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Summary */}
          <Card
            className={cn(
              "p-4",
              isValid
                ? "bg-emerald-50 border-emerald-200"
                : "bg-amber-50 border-amber-200"
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-gray-600" />
                <span className="font-medium">Total Split</span>
              </div>
              <div className="text-right">
                <p className="font-bold text-lg">
                  {currencySymbol}
                  {totalAmount.toFixed(2)}
                </p>
                <p
                  className={cn(
                    "text-sm",
                    Math.abs(totalPercentage - 100) < 0.01
                      ? "text-emerald-600"
                      : "text-amber-600"
                  )}
                >
                  {totalPercentage.toFixed(1)}%
                </p>
              </div>
            </div>
            {!isValid && (
              <p className="text-sm text-amber-600 mt-2">
                {!portions.every((p) => p.payerName) &&
                  "All payers must have names. "}
                {Math.abs(totalPercentage - 100) >= 0.01 &&
                  "Percentages must add up to 100%. "}
              </p>
            )}
          </Card>
        </div>

        <DialogFooter className="mt-4 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSplit}
            disabled={!isValid || isCreating}
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
          >
            {isCreating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Splitting...
              </>
            ) : (
              <>
                <Split className="h-4 w-4 mr-2" />
                Create Split
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SplitBillingDialog;
