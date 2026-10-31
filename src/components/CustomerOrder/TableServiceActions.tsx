import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  BellRing,
  Receipt,
  Droplet,
  UtensilsCrossed,
  Sparkles,
  HelpCircle,
  CreditCard,
  Banknote,
  QrCode,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface TableServiceActionsProps {
  restaurantId: string;
  tableName: string;
  entityType?: "table" | "room";
  entityId?: string;
  isCallWaiterOpen: boolean;
  onCallWaiterClose: () => void;
  isRequestBillOpen: boolean;
  onRequestBillClose: () => void;
}

export const TableServiceActions: React.FC<TableServiceActionsProps> = ({
  restaurantId,
  tableName,
  entityType = "table",
  entityId,
  isCallWaiterOpen,
  onCallWaiterClose,
  isRequestBillOpen,
  onRequestBillClose,
}) => {
  const [selectedReason, setSelectedReason] = useState<string>("Water");
  const [customNote, setCustomNote] = useState<string>("");
  const [selectedPayment, setSelectedPayment] = useState<string>("UPI");
  const [submitting, setSubmitting] = useState(false);
  const [submittedType, setSubmittedType] = useState<"waiter" | "bill" | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const waiterOptions = [
    { label: "Need Drinking Water", icon: Droplet, key: "Water" },
    { label: "Extra Cutlery / Plates", icon: UtensilsCrossed, key: "Cutlery" },
    { label: "Clean / Clear Table", icon: Sparkles, key: "Clean Table" },
    { label: "Call Server / Help", icon: HelpCircle, key: "Assistance" },
  ];

  const paymentOptions = [
    { label: "Pay via UPI / Online", icon: QrCode, key: "UPI" },
    { label: "Pay by Cash", icon: Banknote, key: "Cash" },
    { label: "Card / POS Machine", icon: CreditCard, key: "Card" },
  ];

  const handleSendWaiterCall = async () => {
    setSubmitting(true);
    try {
      const message = customNote
        ? `${selectedReason}: ${customNote}`
        : selectedReason;

      const { error: insertError } = await supabase.from("owner_notifications").insert({
        restaurant_id: restaurantId,
        title: `🔔 Call Waiter • ${entityType === "table" ? "Table" : "Room"} ${tableName}`,
        message: `${entityType === "table" ? "Table" : "Room"} ${tableName} requested: ${message}`,
        type: "table_call_waiter",
        staff_name: `Customer (${entityType} ${tableName})`,
        reference_id: entityId || null,
      });

      if (insertError) throw insertError;

      setErrorMessage(null);
      setSubmittedType("waiter");
      setTimeout(() => {
        setSubmittedType(null);
        onCallWaiterClose();
        setCustomNote("");
      }, 2000);
    } catch (err: any) {
      console.error("Failed to notify staff:", err);
      setErrorMessage(err.message || "Failed to notify staff. Please alert your server directly.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendBillRequest = async () => {
    setSubmitting(true);
    try {
      const { error: insertError } = await supabase.from("owner_notifications").insert({
        restaurant_id: restaurantId,
        title: `🧾 Bill Requested • ${entityType === "table" ? "Table" : "Room"} ${tableName}`,
        message: `${entityType === "table" ? "Table" : "Room"} ${tableName} requested bill via ${selectedPayment}`,
        type: "table_request_bill",
        staff_name: `Customer (${entityType} ${tableName})`,
        reference_id: entityId || null,
      });

      if (insertError) throw insertError;

      setErrorMessage(null);
      setSubmittedType("bill");
      setTimeout(() => {
        setSubmittedType(null);
        onRequestBillClose();
      }, 2000);
    } catch (err: any) {
      console.error("Failed to notify bill request:", err);
      setErrorMessage(err.message || "Failed to request bill. Please alert your server directly.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* Call Waiter Dialog */}
      <Dialog open={isCallWaiterOpen} onOpenChange={onCallWaiterClose}>
        <DialogContent className="max-w-sm rounded-3xl p-6 bg-white dark:bg-stone-900 border-0 shadow-2xl">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                <BellRing className="w-4 h-4" />
              </div>
              <DialogTitle className="text-lg font-bold">Call Waiter</DialogTitle>
            </div>
            <DialogDescription className="text-xs text-stone-500">
              Select what you need at {entityType} {tableName}. Staff will be notified immediately.
            </DialogDescription>
          </DialogHeader>

          {submittedType === "waiter" ? (
            <div className="py-8 text-center space-y-2">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto animate-bounce" />
              <h4 className="font-bold text-stone-900 dark:text-white">
                Waiter Called!
              </h4>
              <p className="text-xs text-stone-500">
                Staff has been alerted and will arrive at your table shortly.
              </p>
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              {/* Quick Options */}
              <div className="grid grid-cols-2 gap-2">
                {waiterOptions.map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = selectedReason === opt.key;
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setSelectedReason(opt.key)}
                      className={`p-3 rounded-2xl border text-left text-xs font-semibold flex flex-col gap-2 transition-all ${
                        isSelected
                          ? "border-amber-500 bg-amber-500/10 text-amber-900 dark:text-amber-300 ring-2 ring-amber-500/20"
                          : "border-stone-200 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-800/50 text-stone-700 dark:text-stone-300"
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isSelected ? "text-amber-500" : "text-stone-400"}`} />
                      <span>{opt.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Custom Note */}
              <div>
                <label className="text-[11px] font-bold text-stone-500 mb-1 block">
                  Add Note (Optional)
                </label>
                <Textarea
                  placeholder="e.g. Extra ice, warm water, extra tissues..."
                  value={customNote}
                  onChange={(e) => setCustomNote(e.target.value)}
                  className="rounded-xl text-xs resize-none h-18 bg-stone-50 dark:bg-stone-800/50 border-stone-200 dark:border-stone-800"
                  maxLength={100}
                />
              </div>

              {errorMessage && (
                <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-semibold">
                  {errorMessage}
                </div>
              )}

              <Button
                onClick={handleSendWaiterCall}
                disabled={submitting}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold py-5 rounded-2xl shadow-lg shadow-orange-900/20 text-xs"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <BellRing className="w-3.5 h-3.5 mr-2" />
                    Call Waiter to Table {tableName}
                  </>
                )}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Request Bill Dialog */}
      <Dialog open={isRequestBillOpen} onOpenChange={onRequestBillClose}>
        <DialogContent className="max-w-sm rounded-3xl p-6 bg-white dark:bg-stone-900 border-0 shadow-2xl">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                <Receipt className="w-4 h-4" />
              </div>
              <DialogTitle className="text-lg font-bold">Request Bill</DialogTitle>
            </div>
            <DialogDescription className="text-xs text-stone-500">
              Ready to wrap up? Choose your preferred payment method.
            </DialogDescription>
          </DialogHeader>

          {submittedType === "bill" ? (
            <div className="py-8 text-center space-y-2">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto animate-bounce" />
              <h4 className="font-bold text-stone-900 dark:text-white">
                Bill Requested!
              </h4>
              <p className="text-xs text-stone-500">
                Staff has printed your invoice and is bringing it to your table.
              </p>
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                {paymentOptions.map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = selectedPayment === opt.key;
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setSelectedPayment(opt.key)}
                      className={`w-full p-3.5 rounded-2xl border text-left text-xs font-semibold flex items-center justify-between transition-all ${
                        isSelected
                          ? "border-emerald-500 bg-emerald-500/10 text-emerald-900 dark:text-emerald-300 ring-2 ring-emerald-500/20"
                          : "border-stone-200 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-800/50 text-stone-700 dark:text-stone-300"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`w-4 h-4 ${isSelected ? "text-emerald-500" : "text-stone-400"}`} />
                        <span>{opt.label}</span>
                      </div>
                      {isSelected && <Badge className="bg-emerald-600 text-[10px]">Selected</Badge>}
                    </button>
                  );
                })}
              </div>

              {errorMessage && (
                <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-semibold">
                  {errorMessage}
                </div>
              )}

              <Button
                onClick={handleSendBillRequest}
                disabled={submitting}
                className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold py-5 rounded-2xl shadow-lg shadow-emerald-900/20 text-xs"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Receipt className="w-3.5 h-3.5 mr-2" />
                    Request Bill for Table {tableName}
                  </>
                )}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
