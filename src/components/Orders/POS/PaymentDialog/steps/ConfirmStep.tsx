import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Receipt, Printer, Trash2, X, Check } from "lucide-react";
import type { OrderItem } from "@/types/orders";
import type { ConfirmStepProps } from "../types";

export const ConfirmStep: React.FC<ConfirmStepProps> = ({
  orderItems,
  subtotal,
  totalDiscountAmount,
  total,
  promotionDiscountAmount,
  manualDiscountAmount,
  currencySymbol,
  tableNumber,

  // Customer details
  customerName,
  setCustomerName,
  customerMobile,
  setCustomerMobile,
  customerEmail,
  setCustomerEmail,
  sendBillToEmail,
  setSendBillToEmail,

  // Discount/promotion
  promotionCode,
  setPromotionCode,
  appliedPromotion,
  manualDiscountPercent,
  setManualDiscountPercent,
  activePromotions,

  // Actions
  onApplyPromotion,
  onRemovePromotion,
  onEditOrder,
  onPrintBill,
  onDeleteOrder,
  onContinueToPayment,

  // State
  isSaving,
  detectedReservation,
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  return (
    <div className="space-y-6 p-2">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground mb-2">
          Confirm Order
        </h2>
        <p className="text-muted-foreground">
          Review the details for{" "}
          {tableNumber ? `Table ${tableNumber}` : "POS Order"}
        </p>
      </div>

      {/* Order Items Card */}
      <Card className="p-4 bg-muted/50">
        <div className="space-y-3">
          {orderItems.map((item, idx) => {
            const isWeightBased =
              item.pricingType && item.pricingType !== "fixed";
            const itemTotal =
              item.calculatedPrice ?? item.price * item.quantity;

            return (
              <div key={idx} className="flex flex-col gap-1">
                <div className="flex justify-between text-sm">
                  <span>
                    {isWeightBased && item.actualQuantity ? (
                      <>
                        {item.actualQuantity} {item.unit} {item.name}
                      </>
                    ) : (
                      <>
                        {item.quantity}x {item.name}
                      </>
                    )}
                    {item.isCustomExtra && (
                      <span className="text-purple-600 ml-1">[Custom]</span>
                    )}
                  </span>
                  <span className="font-medium">
                    {currencySymbol}
                    {itemTotal.toFixed(2)}
                  </span>
                </div>
                {item.notes && (
                  <div className="text-xs text-muted-foreground ml-4 mb-2">
                    Note:{" "}
                    {Array.isArray(item.notes)
                      ? item.notes.join(", ")
                      : item.notes}
                  </div>
                )}
              </div>
            );
          })}

          <Separator className="my-3" />

          <div className="flex justify-between text-sm">
            <span>Subtotal</span>
            <span>
              {currencySymbol}
              {subtotal.toFixed(2)}
            </span>
          </div>

          {appliedPromotion && promotionDiscountAmount > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Promo Discount ({appliedPromotion.name})</span>
              <span>
                -{currencySymbol}
                {promotionDiscountAmount.toFixed(2)}
              </span>
            </div>
          )}

          {manualDiscountPercent > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Discount ({manualDiscountPercent}%)</span>
              <span>
                -{currencySymbol}
                {manualDiscountAmount.toFixed(2)}
              </span>
            </div>
          )}

          {totalDiscountAmount > 0 && (
            <div className="flex justify-between text-sm font-semibold text-green-600">
              <span>Total Discount</span>
              <span>
                -{currencySymbol}
                {totalDiscountAmount.toFixed(2)}
              </span>
            </div>
          )}

          <Separator className="my-3" />

          <div className="flex justify-between text-lg font-bold">
            <span>Total Due</span>
            <span>
              {currencySymbol}
              {total.toFixed(2)}
            </span>
          </div>
        </div>
      </Card>

      {/* Promotion Code Section */}
      <Card className="p-4 bg-background">
        <div className="space-y-3">
          <h3 className="font-semibold text-sm">Apply Promotion</h3>

          {!appliedPromotion ? (
            <div className="space-y-3">
              <Label htmlFor="promo-select" className="text-xs">
                Select or Enter Promotion Code
              </Label>
              <Select
                value={promotionCode}
                onValueChange={(value) => {
                  setPromotionCode(value);
                  if (value && value !== "manual") {
                    onApplyPromotion(value);
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a promotion code" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {activePromotions.length > 0 ? (
                    <>
                      {activePromotions.map((promo: any) => (
                        <SelectItem
                          key={promo.id}
                          value={promo.promotion_code || ""}
                        >
                          <div className="flex items-center justify-between w-full gap-3 pr-2">
                            <div className="flex flex-col min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-xs">
                                  {promo.promotion_code}
                                </span>
                                <span className="text-xs text-muted-foreground truncate">
                                  {promo.name}
                                </span>
                              </div>
                            </div>
                            <Badge
                              variant="secondary"
                              className="bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200 text-xs whitespace-nowrap"
                            >
                              {promo.discount_percentage
                                ? `${promo.discount_percentage}% off`
                                : `₹${promo.discount_amount} off`}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                      <Separator className="my-1" />
                      <SelectItem value="manual">
                        ✏️ Enter code manually...
                      </SelectItem>
                    </>
                  ) : (
                    <SelectItem value="manual">
                      Enter code manually...
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>

              {(promotionCode === "manual" ||
                activePromotions.length === 0) && (
                <div className="flex items-center gap-2">
                  <Input
                    value={promotionCode === "manual" ? "" : promotionCode}
                    onChange={(e) =>
                      setPromotionCode(e.target.value.toUpperCase())
                    }
                    placeholder="Enter promotion code"
                    className="flex-1"
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        onApplyPromotion();
                      }
                    }}
                  />
                  <Button onClick={() => onApplyPromotion()} size="sm">
                    Apply
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="default" className="bg-green-600">
                      {(appliedPromotion as any).code}
                    </Badge>
                    <span className="text-sm font-semibold text-green-700 dark:text-green-300">
                      {appliedPromotion.name}
                    </span>
                  </div>
                  <p className="text-xs text-green-600 dark:text-green-400">
                    Discount: {currencySymbol}
                    {promotionDiscountAmount.toFixed(2)}
                  </p>
                </div>
                <Button
                  onClick={onRemovePromotion}
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/20"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Manual Discount Section */}
      <Card className="p-4 bg-background">
        <div className="space-y-2">
          <label className="text-sm font-medium">Discount (%)</label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              placeholder="0"
              min="0"
              max="100"
              value={manualDiscountPercent || ""}
              onChange={(e) => {
                const value = parseFloat(e.target.value) || 0;
                if (value >= 0 && value <= 100) {
                  setManualDiscountPercent(value);
                }
              }}
              className="flex-1"
            />
            <span className="text-sm text-muted-foreground">%</span>
            {manualDiscountPercent > 0 && (
              <Button
                onClick={() => setManualDiscountPercent(0)}
                variant="outline"
                size="sm"
              >
                Clear
              </Button>
            )}
          </div>
          {manualDiscountPercent > 0 && (
            <div className="text-sm text-green-600 dark:text-green-400 font-medium">
              ✓ {manualDiscountPercent}% discount applied - Save{" "}
              {currencySymbol}
              {manualDiscountAmount.toFixed(2)}
            </div>
          )}
        </div>
      </Card>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <Button variant="outline" onClick={onEditOrder} className="w-full">
          <Receipt className="w-4 h-4 mr-2" />
          Edit Order
        </Button>
        <Button
          variant="outline"
          onClick={onPrintBill}
          className="w-full"
          disabled={isSaving}
        >
          <Printer className="w-4 h-4 mr-2" />
          {isSaving ? "Saving..." : "Print Bill"}
        </Button>
      </div>

      <Button
        variant="destructive"
        onClick={() => setShowDeleteConfirm(true)}
        className="w-full"
      >
        <Trash2 className="w-4 h-4 mr-2" />
        Delete Order
      </Button>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Order</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this order permanently? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowDeleteConfirm(false);
                onDeleteOrder();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Send Bill via Email Checkbox and Inputs */}
      <Card className="p-4 bg-muted/30 border-2 border-primary/20">
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="send-bill-checkbox"
              checked={sendBillToEmail}
              onChange={(e) => setSendBillToEmail(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <label
              htmlFor="send-bill-checkbox"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              📧 Send bill to customer
            </label>
          </div>

          {sendBillToEmail && (
            <div className="space-y-3 animate-in slide-in-from-top-2">
              <div>
                <label className="text-sm font-medium mb-1 block">
                  Customer Name <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="Enter customer name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">
                  Mobile Number{" "}
                  <span className="text-muted-foreground text-xs">
                    (for room detection)
                  </span>
                </label>
                <Input
                  type="tel"
                  placeholder="Enter mobile number"
                  value={customerMobile}
                  onChange={(e) => setCustomerMobile(e.target.value)}
                  className="w-full"
                />
                {detectedReservation && (
                  <div className="mt-2 p-2 bg-green-50 dark:bg-green-950/30 rounded-md border border-green-200 dark:border-green-800 flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                    <span className="text-sm text-green-700 dark:text-green-300">
                      Guest detected in {detectedReservation.roomName}
                    </span>
                  </div>
                )}
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">
                  Email Address{" "}
                  <span className="text-muted-foreground text-xs">
                    (for email receipt)
                  </span>
                </label>
                <Input
                  type="email"
                  placeholder="Enter email address"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="w-full"
                />
              </div>
            </div>
          )}
        </div>
      </Card>

      <Button
        onClick={onContinueToPayment}
        className="w-full bg-green-600 hover:bg-green-700 text-white"
        size="lg"
        disabled={isSaving}
      >
        {isSaving ? "Saving Details..." : "Proceed to Payment Methods"}
      </Button>
    </div>
  );
};

export default ConfirmStep;
