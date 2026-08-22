import React from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Award, TrendingUp, Gift } from "lucide-react";

interface LoyaltyProgramSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loyaltyEnabled: boolean;
  setLoyaltyEnabled: (enabled: boolean) => void;
  spendThreshold: number | "";
  setSpendThreshold: (val: number | "") => void;
  pointsPerAmount: number | "";
  setPointsPerAmount: (val: number | "") => void;
  amountPerPoint: number | "";
  setAmountPerPoint: (val: number | "") => void;
  maxRedemptionPercentage: number | "";
  setMaxRedemptionPercentage: (val: number | "") => void;
  pointsExpiryDays: number | null;
  setPointsExpiryDays: (val: number | null) => void;
  onSave: () => void;
  saving: boolean;
  loyaltyProgram: any;
}

export const LoyaltyProgramSettingsDialog: React.FC<LoyaltyProgramSettingsDialogProps> = ({
  open,
  onOpenChange,
  loyaltyEnabled,
  setLoyaltyEnabled,
  spendThreshold,
  setSpendThreshold,
  pointsPerAmount,
  setPointsPerAmount,
  amountPerPoint,
  setAmountPerPoint,
  maxRedemptionPercentage,
  setMaxRedemptionPercentage,
  pointsExpiryDays,
  setPointsExpiryDays,
  onSave,
  saving,
  loyaltyProgram,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl p-6">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl text-white shadow-md">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">
                Loyalty Program Settings
              </DialogTitle>
              <DialogDescription className="text-xs">
                Configure how customers earn and redeem loyalty points
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Active / Inactive Toggle */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30 border border-purple-100 dark:border-purple-800/40">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-white dark:bg-gray-800 shadow-xs">
                <Award
                  className={`h-4 w-4 ${
                    loyaltyEnabled
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-gray-400"
                  }`}
                />
              </div>
              <div>
                <Label className="text-sm font-semibold">Loyalty Program</Label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {loyaltyEnabled
                    ? "Customers earn points on every order"
                    : "Points earning is paused"}
                </p>
              </div>
            </div>
            <Button
              type="button"
              size="sm"
              className={`rounded-full px-4 font-semibold shadow-xs transition-all ${
                loyaltyEnabled
                  ? "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white"
                  : "bg-gray-300 hover:bg-gray-400 text-gray-700 dark:bg-gray-600 dark:text-gray-300"
              }`}
              onClick={() => setLoyaltyEnabled(!loyaltyEnabled)}
            >
              {loyaltyEnabled ? "✓ Active" : "Inactive"}
            </Button>
          </div>

          <div
            className={`space-y-5 transition-all ${
              !loyaltyEnabled
                ? "opacity-40 blur-[1px] pointer-events-none select-none"
                : ""
            }`}
          >
            {/* How Points Are Earned */}
            <div className="rounded-xl border border-purple-200 dark:border-purple-800/50 bg-gradient-to-br from-purple-50/80 to-indigo-50/50 dark:from-purple-900/20 dark:to-indigo-900/10 p-4 space-y-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                <h3 className="text-sm font-bold text-purple-800 dark:text-purple-300">
                  How Points Are Earned
                </h3>
              </div>

              <div className="rounded-lg bg-purple-100/60 dark:bg-purple-900/30 p-3">
                <p className="text-sm font-medium text-purple-800 dark:text-purple-200">
                  On every{" "}
                  <span className="font-bold text-purple-600 dark:text-purple-300">
                    ₹{spendThreshold || "___"}
                  </span>{" "}
                  spend, customer earns{" "}
                  <span className="font-bold text-purple-600 dark:text-purple-300">
                    {pointsPerAmount || "___"}
                  </span>{" "}
                  points
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
                    <span className="p-0.5 bg-purple-200 dark:bg-purple-800 rounded">
                      💰
                    </span>
                    For every ₹ (spend)
                  </Label>
                  <Input
                    type="number"
                    value={spendThreshold}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSpendThreshold(val === "" ? ("" as any) : Number(val));
                    }}
                    placeholder="e.g. 50"
                    className="border-purple-200 dark:border-purple-700 focus:ring-purple-500 bg-white dark:bg-gray-800"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
                    <span className="p-0.5 bg-purple-200 dark:bg-purple-800 rounded">
                      ⭐
                    </span>
                    Points earned
                  </Label>
                  <Input
                    type="number"
                    value={pointsPerAmount}
                    onChange={(e) => {
                      const val = e.target.value;
                      setPointsPerAmount(
                        val === "" ? ("" as any) : Number(val)
                      );
                    }}
                    placeholder="e.g. 10"
                    className="border-purple-200 dark:border-purple-700 focus:ring-purple-500 bg-white dark:bg-gray-800"
                  />
                </div>
              </div>
            </div>

            {/* How Points Are Used */}
            <div className="rounded-xl border border-amber-200 dark:border-amber-800/50 bg-gradient-to-br from-amber-50/80 to-orange-50/50 dark:from-amber-900/20 dark:to-orange-900/10 p-4 space-y-4">
              <div className="flex items-center gap-2">
                <Gift className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <h3 className="text-sm font-bold text-amber-800 dark:text-amber-300">
                  How Points Are Used
                </h3>
              </div>

              <div className="rounded-lg bg-amber-100/60 dark:bg-amber-900/30 p-3">
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                  1 point ={" "}
                  <span className="font-bold text-amber-600 dark:text-amber-300">
                    ₹{amountPerPoint || "___"}
                  </span>{" "}
                  discount · Customer can use points for up to{" "}
                  <span className="font-bold text-amber-600 dark:text-amber-300">
                    {maxRedemptionPercentage || "___"}%
                  </span>{" "}
                  of the bill
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                    <span className="p-0.5 bg-amber-200 dark:bg-amber-800 rounded">
                      💎
                    </span>
                    1 point = ₹ ?
                  </Label>
                  <Input
                    type="number"
                    value={amountPerPoint}
                    onChange={(e) => {
                      const val = e.target.value;
                      setAmountPerPoint(val === "" ? ("" as any) : Number(val));
                    }}
                    placeholder="e.g. 1"
                    className="border-amber-200 dark:border-amber-700 focus:ring-amber-500 bg-white dark:bg-gray-800"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                    <span className="p-0.5 bg-amber-200 dark:bg-amber-800 rounded">
                      🛡️
                    </span>
                    Max bill % payable by points
                  </Label>
                  <Input
                    type="number"
                    value={maxRedemptionPercentage}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "") {
                        setMaxRedemptionPercentage("" as any);
                      } else {
                        setMaxRedemptionPercentage(Number(val));
                      }
                    }}
                    placeholder="e.g. 50"
                    className="border-amber-200 dark:border-amber-700 focus:ring-amber-500 bg-white dark:bg-gray-800"
                  />
                </div>
              </div>
            </div>

            {/* Points Expiry */}
            <div className="rounded-xl border border-rose-200 dark:border-rose-800/50 bg-gradient-to-br from-rose-50/60 to-pink-50/40 dark:from-rose-900/15 dark:to-pink-900/10 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-sm">⏳</span>
                <h3 className="text-sm font-bold text-rose-800 dark:text-rose-300">
                  Points Expiry
                </h3>
              </div>
              <div className="max-w-xs space-y-1.5">
                <Label className="text-xs font-semibold text-rose-700 dark:text-rose-300">
                  Expire after how many days?
                </Label>
                <Input
                  type="number"
                  value={pointsExpiryDays || ""}
                  onChange={(e) =>
                    setPointsExpiryDays(
                      e.target.value ? Number(e.target.value) : null
                    )
                  }
                  placeholder="Leave empty = never expire"
                  className="border-rose-200 dark:border-rose-700 focus:ring-rose-500 bg-white dark:bg-gray-800"
                />
                <p className="text-[11px] text-rose-500 dark:text-rose-400">
                  {pointsExpiryDays
                    ? `Points will expire ${pointsExpiryDays} days after last visit`
                    : "Points will never expire ✓"}
                </p>
              </div>
            </div>

            {/* Summary Preview */}
            {loyaltyProgram && (
              <div className="rounded-xl overflow-hidden border border-indigo-200 dark:border-indigo-800/50">
                <div className="bg-gradient-to-r from-indigo-500 to-purple-500 px-4 py-2">
                  <p className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>📋</span> Summary
                  </p>
                </div>
                <div className="p-3 bg-white dark:bg-gray-800 text-xs space-y-1.5 text-gray-700 dark:text-gray-300">
                  <p>
                    • Spend{" "}
                    <strong className="text-purple-600 dark:text-purple-400">
                      ₹{spendThreshold || 0}
                    </strong>{" "}
                    $\rightarrow$ Earn{" "}
                    <strong className="text-purple-600 dark:text-purple-400">
                      {pointsPerAmount || 0} pts
                    </strong>
                  </p>
                  <p>
                    •{" "}
                    <strong className="text-amber-600 dark:text-amber-400">
                      1 pt = ₹{amountPerPoint || 0}
                    </strong>{" "}
                    discount
                  </p>
                  <p>
                    • Max discount:{" "}
                    <strong className="text-amber-600 dark:text-amber-400">
                      {maxRedemptionPercentage || 100}%
                    </strong>{" "}
                    of total bill
                  </p>
                  <p>
                    • Expiry:{" "}
                    <strong className="text-rose-600 dark:text-rose-400">
                      {pointsExpiryDays
                        ? `${pointsExpiryDays} days`
                        : "Never"}
                    </strong>
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex gap-2 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-xl"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-md"
          >
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default LoyaltyProgramSettingsDialog;
