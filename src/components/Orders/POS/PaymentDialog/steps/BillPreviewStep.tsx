import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Printer,
  MessageSquare,
  ArrowRight,
  Loader2,
  User,
  Phone,
} from "lucide-react";
import type { OrderItem } from "@/types/orders";

export interface BillPreviewStepProps {
  // Bill data
  orderItems: OrderItem[];
  subtotal: number;
  totalDiscountAmount: number;
  promotionDiscountAmount: number;
  manualDiscountAmount: number;
  loyaltyDiscountAmount: number;
  total: number;
  currencySymbol: string;
  tableNumber?: string;
  restaurantName?: string;
  appliedPromotion?: { name?: string; promotion_code?: string } | null;
  manualDiscountPercent?: number;

  // Customer fields
  customerName: string;
  setCustomerName: (name: string) => void;
  customerMobile: string;
  setCustomerMobile: (mobile: string) => void;

  // Actions
  onPrint: () => void;
  onSendWhatsApp: () => Promise<void>;
  onContinue: () => void;

  // Loading states
  isSendingWhatsApp: boolean;
  isPrinting?: boolean;
}

export const BillPreviewStep: React.FC<BillPreviewStepProps> = ({
  orderItems,
  subtotal,
  totalDiscountAmount,
  promotionDiscountAmount,
  manualDiscountAmount,
  loyaltyDiscountAmount,
  total,
  currencySymbol,
  tableNumber,
  restaurantName,
  appliedPromotion,
  manualDiscountPercent,
  customerName,
  setCustomerName,
  customerMobile,
  setCustomerMobile,
  onPrint,
  onSendWhatsApp,
  onContinue,
  isSendingWhatsApp,
  isPrinting = false,
}) => {
  const hasPhone = customerMobile.replace(/\D/g, "").length >= 10;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 pt-5 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              🧾 Bill Preview
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              {restaurantName}{" "}
              {tableNumber ? `• Table ${tableNumber}` : "• Quick Order"}
            </p>
          </div>
          <Badge variant="outline" className="font-mono text-xs">
            {orderItems.length} item{orderItems.length !== 1 ? "s" : ""}
          </Badge>
        </div>
      </div>

      <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
        {/* Bill Items */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60 overflow-hidden">
          <div className="grid grid-cols-12 text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 px-3 py-2 border-b border-slate-200 dark:border-slate-800 tracking-wide bg-slate-100 dark:bg-slate-900/70">
            <span className="col-span-7">Item</span>
            <span className="col-span-2 text-center">Qty</span>
            <span className="col-span-3 text-right">Amount</span>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {orderItems.map((item, idx) => {
              const unitPrice = (item as any).customPrice ?? item.price;
              const lineTotal = unitPrice * item.quantity;
              return (
                <div
                  key={`${item.id || idx}-${idx}`}
                  className="grid grid-cols-12 items-center text-xs px-3 py-2.5"
                >
                  <span className="col-span-7 font-medium text-slate-800 dark:text-slate-200 truncate pr-2">
                    {item.name}
                  </span>
                  <span className="col-span-2 text-center text-slate-500 dark:text-slate-400 font-semibold">
                    ×{item.quantity}
                  </span>
                  <span className="col-span-3 text-right font-bold text-slate-800 dark:text-slate-100">
                    {currencySymbol}
                    {lineTotal.toFixed(2)}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Totals */}
          <div className="px-3 py-3 space-y-1.5 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
              <span>Subtotal</span>
              <span className="font-semibold">
                {currencySymbol}
                {subtotal.toFixed(2)}
              </span>
            </div>

            {promotionDiscountAmount > 0 && (
              <div className="flex justify-between text-xs text-emerald-700 dark:text-emerald-400">
                <span>
                  Promo (
                  {appliedPromotion?.name || appliedPromotion?.promotion_code})
                </span>
                <span className="font-semibold">
                  -{currencySymbol}
                  {promotionDiscountAmount.toFixed(2)}
                </span>
              </div>
            )}

            {manualDiscountAmount > 0 && (
              <div className="flex justify-between text-xs text-emerald-700 dark:text-emerald-400">
                <span>
                  Discount
                  {manualDiscountPercent ? ` (${manualDiscountPercent}%)` : ""}
                </span>
                <span className="font-semibold">
                  -{currencySymbol}
                  {manualDiscountAmount.toFixed(2)}
                </span>
              </div>
            )}

            {loyaltyDiscountAmount > 0 && (
              <div className="flex justify-between text-xs text-amber-700 dark:text-amber-400">
                <span>⭐ Loyalty Points</span>
                <span className="font-semibold">
                  -{currencySymbol}
                  {loyaltyDiscountAmount.toFixed(2)}
                </span>
              </div>
            )}

            <Separator className="my-1" />
            <div className="flex justify-between text-sm font-extrabold text-slate-900 dark:text-white">
              <span>Total Due</span>
              <span>
                {currencySymbol}
                {total.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Customer Details */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-emerald-500" />
                Mobile Number
              </Label>
              <div className="relative">
                <Input
                  type="tel"
                  value={customerMobile}
                  onChange={(e) => setCustomerMobile(e.target.value)}
                  placeholder="10-digit number"
                  className="h-9 text-sm pr-10"
                  maxLength={13}
                />
                {hasPhone && (
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                    ✓
                  </span>
                )}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-indigo-500" />
                Customer Name
              </Label>
              <Input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g. Rahul Sharma"
                className="h-9 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Bill Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            onClick={onPrint}
            disabled={isPrinting}
            className="h-11 gap-2 border-slate-300 dark:border-slate-700 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400 font-semibold"
          >
            {isPrinting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Printer className="w-4 h-4" />
            )}
            Print Bill
          </Button>

          <Button
            variant="outline"
            onClick={onSendWhatsApp}
            disabled={isSendingWhatsApp || !hasPhone}
            title={
              !hasPhone
                ? "Enter a 10-digit mobile number first"
                : "Send bill via WhatsApp"
            }
            className="h-11 gap-2 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:border-emerald-500 font-semibold disabled:opacity-50"
          >
            {isSendingWhatsApp ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <MessageSquare className="w-4 h-4" />
            )}
            {isSendingWhatsApp ? "Sending…" : "Send WhatsApp"}
          </Button>
        </div>

        {!hasPhone && (
          <p className="text-[11px] text-slate-400 dark:text-slate-500 text-center -mt-1">
            Enter mobile number to enable WhatsApp bill
          </p>
        )}
      </div>

      {/* CTA Footer */}
      <div className="px-5 pb-5 pt-3 border-t border-slate-200 dark:border-slate-800">
        <Button
          onClick={onContinue}
          className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm gap-2 rounded-xl shadow-md shadow-indigo-500/20"
        >
          Choose Payment Method
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export default BillPreviewStep;
